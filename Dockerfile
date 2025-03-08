# Use Node.js LTS (Long Term Support) as the base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
# .dockerignore will prevent .env from being copied
COPY . .

# Expose the port your app runs on
EXPOSE 3000

# Set NODE_ENV
ENV NODE_ENV=production

# Command to run the application
CMD ["npm", "start"]
