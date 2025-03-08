// Game configuration object for Phaser
var config = {
    type: Phaser.AUTO, // Automatically choose rendering type (WebGL or Canvas)
    width: 800,       // Canvas width in pixels
    height: 600,      // Canvas height in pixels
    physics: {
        default: 'arcade', // Use Arcade Physics engine
        arcade: {
            gravity: { y: 300 }, // Gravity pulls objects downward
            debug: false         // Disable physics debug visuals
        }
    },
    scene: {
        create: create, // Scene creation function
        update: update  // Scene update function
    }
};

// Initialize the Phaser game instance
var game = new Phaser.Game(config);

// Game state variables
var score = 0;         // Tracks player score
var nextSpawnX;        // Tracks the next x-position for spawning segments

// Function to spawn ground segments with obstacles
function spawnGroundSegment(scene, x) {
    // Create a ground segment: 800x32 pixels scaled appropriately
    var ground = scene.platforms.create(x + 400, 568, 'platform').setScale(25, 1).refreshBody();
    
    // Randomly spawn 0-3 obstacles per segment
    var numObstacles = Phaser.Math.Between(0, 3);
    for (var i = 0; i < numObstacles; i++) {
        var obstacleX = x + Phaser.Math.Between(50, 750); // Random x within segment
        scene.platforms.create(obstacleX, 568 - 32, 'platform'); // Obstacle above ground
    }
}

// Function to spawn floating platforms with coins
function spawnFloatingPlatforms(scene, x) {
    // 50% chance to spawn a floating platform
    if (Phaser.Math.Between(0, 1)) {
        var floatX = x + Phaser.Math.Between(100, 700); // Random x position
        var floatY = Phaser.Math.Between(400, 500);     // Random y position
        var platform = scene.platforms.create(floatX, floatY, 'platform').setScale(2, 1).refreshBody();
        scene.coins.create(floatX, floatY - 32, 'coin'); // Coin above platform
    }
}

// Scene creation function
function create() {
    // Create graphics for generating textures
    var graphics = this.make.graphics({x: 0, y: 0, add: false});

    // Player texture: Red square
    graphics.fillStyle(0xff0000); // Red color
    graphics.fillRect(0, 0, 32, 32); // 32x32 square
    graphics.generateTexture('player', 32, 32);

    // Platform texture: Green rectangle
    graphics.fillStyle(0x00ff00); // Green color
    graphics.fillRect(0, 0, 32, 32); // 32x32 rectangle
    graphics.generateTexture('platform', 32, 32);

    // Coin texture: Yellow circle
    graphics.fillStyle(0xffff00); // Yellow color
    graphics.fillCircle(16, 16, 16); // Circle with radius 16
    graphics.generateTexture('coin', 32, 32);

    // Add player sprite with physics
    this.player = this.physics.add.sprite(100, 450, 'player');
    this.player.setCollideWorldBounds(false); // Allow player to move beyond initial bounds

    // Create static group for platforms
    this.platforms = this.physics.add.staticGroup();

    // Create group for coins
    this.coins = this.physics.add.group();

    // Set initial world bounds (expanded dynamically later)
    this.physics.world.setBounds(0, 0, 8000, 600);
    this.cameras.main.setBounds(0, 0, 8000, 600);

    // Track maximum camera scroll position
    this.maxScrollX = 0;

    // Initialize spawning position
    nextSpawnX = 0;

    // Spawn initial ground and floating platforms
    spawnGroundSegment(this, 0);
    spawnGroundSegment(this, 800);
    spawnFloatingPlatforms(this, 0);
    spawnFloatingPlatforms(this, 800);

    // Set up collision and overlap detection
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.overlap(this.player, this.coins, collectCoin, null, this);

    // Initialize keyboard input
    this.cursors = this.input.keyboard.createCursorKeys();

    // Add score text, fixed to camera
    this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#000' });
    this.scoreText.setScrollFactor(0);
}

// Scene update function
function update() {
    // Update camera to follow player, only scrolling right
    this.maxScrollX = Math.max(this.maxScrollX, this.player.x - this.cameras.main.width / 2);
    this.cameras.main.scrollX = this.maxScrollX;

    // Dynamically extend world bounds as player moves right
    if (this.player.x > this.physics.world.bounds.width - 1600) {
        var newWidth = this.physics.world.bounds.width + 8000;
        this.physics.world.setBounds(0, 0, newWidth, 600);
        this.cameras.main.setBounds(0, 0, newWidth, 600);
    }

    // Spawn new segments when player approaches the edge
    if (this.player.x > nextSpawnX - 800) {
        spawnGroundSegment(this, nextSpawnX);
        spawnFloatingPlatforms(this, nextSpawnX);
        nextSpawnX += 800;
    }

    // Remove old platforms that are far behind the camera
    this.platforms.children.iterate(function(platform) {
        // Check if platform exists and is active before accessing properties
        if (platform && platform.active && platform.x < this.cameras.main.scrollX - 800) {
            platform.destroy(); // Safely remove the platform
        }
    }, this);

    // Remove old coins that are far behind the camera
    this.coins.children.iterate(function(coin) {
        // Check if coin exists and is active before accessing properties
        if (coin && coin.active && coin.x < this.cameras.main.scrollX - 800) {
            coin.destroy(); // Safely remove the coin
        }
    }, this);

    // Update score based on player’s distance traveled
    score = Math.floor(this.player.x / 100);
    this.scoreText.setText('Score: ' + score);

    // Handle player movement left and right
    if (this.cursors.left.isDown) {
        this.player.setVelocityX(-160); // Move left
    } else if (this.cursors.right.isDown) {
        this.player.setVelocityX(160);  // Move right
    } else {
        this.player.setVelocityX(0);    // Stop horizontal movement
    }

    // Handle player jumping
    if (this.cursors.up.isDown && this.player.body.touching.down) {
        this.player.setVelocityY(-330); // Jump upward
    }
}

// Function to handle coin collection
function collectCoin(player, coin) {
    // Check if coin is valid before disabling
    if (coin && coin.active) {
        coin.disableBody(true, true); // Remove coin from game
        score += 10;                  // Add bonus points
    }
}