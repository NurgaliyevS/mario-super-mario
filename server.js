require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// MongoDB connection
let db;

async function connectToMongoDB() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Connected to MongoDB Atlas');
    db = client.db('space-shooter-db');
    
    // Create index on score field for faster sorting
    await db.collection('leaderboard').createIndex({ score: -1 });
    
    return client;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Get leaderboard data
app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await db.collection('leaderboard')
      .find({})
      .sort({ score: -1 })
      .limit(10)
      .toArray();
    
    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Submit score to leaderboard
app.post('/api/submit-score', async (req, res) => {
  try {
    const { email, score } = req.body;
    
    // Validate input
    if (!email || score === undefined || score === null) {
      return res.status(400).json({ error: 'Email and score are required' });
    }
    
    // Check if email is valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Check if user already exists
    const existingUser = await db.collection('leaderboard').findOne({ email });
    
    if (existingUser) {
      // Update score if new score is higher
      if (score > existingUser.score) {
        await db.collection('leaderboard').updateOne(
          { _id: existingUser._id },
          { $set: { score, updatedAt: new Date() } }
        );
        return res.json({ message: 'Score updated successfully' });
      } else {
        return res.json({ message: 'Existing score is higher' });
      }
    } else {
      // Insert new user
      const result = await db.collection('leaderboard').insertOne({
        email,
        score,
        createdAt: new Date()
      });
      
      return res.status(201).json({ message: 'Score submitted successfully' });
    }
  } catch (error) {
    console.error('Error submitting score:', error);
    res.status(500).json({ error: 'Failed to submit score' });
  }
});

// Start server
async function startServer() {
  const client = await connectToMongoDB();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await client.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  });
}

startServer(); 