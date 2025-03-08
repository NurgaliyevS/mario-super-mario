// Game configuration object for Phaser
var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: {
        create: create,
        update: update
    }
};

// Initialize the Phaser game instance
var game = new Phaser.Game(config);

// Game state variables
var score = 0;
var gameOver = false;
var nextSpawnX;
var scoreText;
var lives = 3;
var livesText;
var isInvulnerable = false;
var invulnerableTimer = 0;
var gameOverGroup; // Group to hold all game over elements

// Scene creation function
function create() {
    // Create graphics for generating textures
    var graphics = this.make.graphics({x: 0, y: 0, add: false});

    // Create sky background
    graphics.fillStyle(0x87CEEB); // Light blue
    graphics.fillRect(0, 0, 800, 600);
    graphics.generateTexture('sky', 800, 600);
    this.skyBackground = this.add.tileSprite(400, 300, 800, 600, 'sky');
    this.skyBackground.setScrollFactor(0); // Fix sky to camera

    // Player texture: Red square for Mario
    graphics.fillStyle(0xff0000); // Red color
    graphics.fillRect(0, 0, 32, 32); // 32x32 square
    graphics.generateTexture('player', 32, 32);

    // Platform texture: Green rectangle for ground
    graphics.fillStyle(0x00aa00); // Green color
    graphics.fillRect(0, 0, 32, 32); // 32x32 rectangle
    graphics.generateTexture('ground', 32, 32);

    // Brick texture: Brown rectangle
    graphics.fillStyle(0x8B4513); // Brown color
    graphics.fillRect(0, 0, 32, 32); 
    graphics.strokeRect(0, 0, 32, 32);
    graphics.generateTexture('brick', 32, 32);

    // Pipe texture: Green rectangle for pipe
    graphics.fillStyle(0x008800); // Darker green
    graphics.fillRect(0, 0, 32, 64); // Taller rectangle for pipe
    graphics.generateTexture('pipe', 32, 64);

    // Coin texture: Yellow circle
    graphics.fillStyle(0xffff00); // Yellow color
    graphics.fillCircle(16, 16, 12); // Circle with radius 12
    graphics.generateTexture('coin', 32, 32);

    // Mushroom texture: Red with white spots
    graphics.fillStyle(0xff0000); // Red color
    graphics.fillCircle(16, 16, 14); // Circle for mushroom top
    graphics.fillStyle(0xffffff); // White color
    graphics.fillCircle(10, 10, 4); // White spot
    graphics.fillCircle(22, 12, 4); // White spot
    graphics.fillStyle(0xffaa88); // Tan color for stem
    graphics.fillRect(12, 16, 8, 8); // Stem
    graphics.generateTexture('mushroom', 32, 32);

    // Goomba texture: Purple enemy with more distinct features
    graphics.clear();
    graphics.fillStyle(0x9370DB); // Medium purple color
    graphics.fillRect(0, 0, 32, 32); // Square base
    graphics.fillStyle(0x6A5ACD); // Darker purple for details
    graphics.fillRect(4, 20, 24, 12); // Body detail
    graphics.fillStyle(0x000000); // Black color for eyes
    graphics.fillRect(8, 8, 6, 6); // Left eye
    graphics.fillRect(18, 8, 6, 6); // Right eye
    graphics.generateTexture('goomba', 32, 32);

    // Goomba squished texture - improved to match new design
    graphics.clear();
    graphics.fillStyle(0x9370DB); // Medium purple color
    graphics.fillRect(0, 24, 32, 8); // Flattened rectangle
    graphics.fillStyle(0x6A5ACD); // Darker purple for details
    graphics.fillRect(4, 26, 24, 4); // Flattened body detail
    graphics.generateTexture('goomba-squished', 32, 32);

    // Create game over Mario texture
    graphics.clear();
    // Head/hat
    graphics.fillStyle(0xFFA500); // Orange hat
    graphics.fillRect(16, 4, 32, 8);
    graphics.fillStyle(0xA52A2A); // Brown hair
    graphics.fillRect(12, 8, 8, 8);
    graphics.fillRect(44, 8, 8, 8);
    graphics.fillStyle(0xFFD700); // Gold/yellow face
    graphics.fillRect(20, 12, 24, 16);
    // Face details
    graphics.fillStyle(0xA52A2A); // Brown mustache
    graphics.fillRect(16, 20, 8, 4);
    graphics.fillRect(40, 20, 8, 4);
    // Body
    graphics.fillStyle(0xFF0000); // Red shirt
    graphics.fillRect(24, 28, 16, 16);
    graphics.fillStyle(0xFFD700); // Gold/yellow arms
    graphics.fillRect(16, 28, 8, 12);
    graphics.fillRect(40, 28, 8, 12);
    // Generate the texture
    graphics.generateTexture('gameOverMario', 64, 48);

    // Add player sprite with physics
    this.player = this.physics.add.sprite(100, 450, 'player');
    this.player.setBounce(0.1);
    this.player.setCollideWorldBounds(false);
    this.player.isBig = false; // Track if Mario is big (powered up)

    // Create static groups for all game objects
    this.platforms = this.physics.add.staticGroup();
    this.bricks = this.physics.add.staticGroup();
    this.pipes = this.physics.add.staticGroup();
    
    // Create dynamic groups
    this.coins = this.physics.add.group({
        allowGravity: false
    });
    this.mushrooms = this.physics.add.group({
        allowGravity: true
    });
    this.enemies = this.physics.add.group({
        allowGravity: true
    });

    // Set initial world bounds
    this.physics.world.setBounds(0, 0, 8000, 600);
    this.cameras.main.setBounds(0, 0, 8000, 600);
    this.cameras.main.startFollow(this.player, true, 0.5, 0.5);

    // Track maximum camera scroll position
    this.maxScrollX = 0;

    // Initialize spawning position
    nextSpawnX = 0;

    // Spawn initial level segments
    spawnGroundSegment(this, 0);
    spawnGroundSegment(this, 800);
    spawnFloatingPlatforms(this, 0);
    spawnFloatingPlatforms(this, 800);

    // Set up collision and overlap detection
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.bricks, hitBrick, null, this);
    this.physics.add.collider(this.player, this.pipes);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.enemies, this.pipes);
    this.physics.add.collider(this.mushrooms, this.platforms);
    this.physics.add.collider(this.mushrooms, this.bricks);
    this.physics.add.collider(this.mushrooms, this.pipes);
    
    this.physics.add.overlap(this.player, this.coins, collectCoin, null, this);
    this.physics.add.overlap(this.player, this.mushrooms, collectMushroom, null, this);
    this.physics.add.overlap(this.player, this.enemies, hitEnemy, null, this);

    // Initialize keyboard input
    this.cursors = this.input.keyboard.createCursorKeys();

    // Add score text, fixed to camera
    this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#FFF' });
    this.scoreText.setScrollFactor(0);
    
    // Add lives text
    this.livesText = this.add.text(650, 16, 'Lives: ' + lives, { fontSize: '32px', fill: '#FFF' });
    this.livesText.setScrollFactor(0);

    // Initialize game over group (will be populated when needed)
    gameOverGroup = this.add.group();
    
    // Add space key for restart
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
}

function update(time, delta) {
    // Update background to follow camera
    this.skyBackground.tilePositionX = this.cameras.main.scrollX;
    
    if (gameOver) {
        // Check for space key to restart game
        if (this.spaceKey.isDown) {
            restartGame.call(this);
        }
        return;
    }

    // Handle invulnerability timer after being hit
    if (isInvulnerable) {
        invulnerableTimer += delta;
        // Flash the player when invulnerable
        this.player.alpha = Math.floor(invulnerableTimer / 100) % 2 === 0 ? 1 : 0.5;
        
        if (invulnerableTimer > 2000) {  // 2 seconds of invulnerability
            isInvulnerable = false;
            invulnerableTimer = 0;
            this.player.alpha = 1;
        }
    }

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

    // Remove objects that are far behind the camera
    this.platforms.children.iterate(function(platform) {
        if (platform && platform.active && platform.x < this.cameras.main.scrollX - 800) {
            platform.destroy();
        }
    }, this);
    
    this.bricks.children.iterate(function(brick) {
        if (brick && brick.active && brick.x < this.cameras.main.scrollX - 800) {
            brick.destroy();
        }
    }, this);
    
    this.pipes.children.iterate(function(pipe) {
        if (pipe && pipe.active && pipe.x < this.cameras.main.scrollX - 800) {
            pipe.destroy();
        }
    }, this);

    this.coins.children.iterate(function(coin) {
        if (coin && coin.active && coin.x < this.cameras.main.scrollX - 800) {
            coin.destroy();
        }
    }, this);
    
    this.mushrooms.children.iterate(function(mushroom) {
        if (mushroom && mushroom.active && mushroom.x < this.cameras.main.scrollX - 800) {
            mushroom.destroy();
        }
    }, this);
    
    this.enemies.children.iterate(function(enemy) {
        if (enemy && enemy.active && enemy.x < this.cameras.main.scrollX - 800) {
            enemy.destroy();
        }
        // Make goombas move
        else if (enemy && enemy.active) {
            // Initialize direction if not set
            if (enemy.direction === undefined) {
                enemy.direction = -1;
                enemy.setVelocityX(-50);
            }
            
            // Ensure velocity is maintained
            if (enemy.body.velocity.x === 0) {
                enemy.setVelocityX(enemy.direction * 50);
            }
            
            // If on the ground and hitting a wall or at an edge, turn around
            if (enemy.body.touching.down) {
                if (enemy.body.blocked.left) {
                    enemy.direction = 1;
                    enemy.setVelocityX(50);
                    enemy.flipX = true;
                } else if (enemy.body.blocked.right) {
                    enemy.direction = -1;
                    enemy.setVelocityX(-50);
                    enemy.flipX = false;
                }
                
                // Check for platform edges - simpler logic to prevent glitches
                var onEdge = true;
                this.platforms.getChildren().forEach(function(platform) {
                    // Check if there's a platform under the enemy's next step
                    if (enemy.direction < 0) { // Moving left
                        if (platform.x > enemy.x - 32 && platform.x < enemy.x && 
                            Math.abs(platform.y - enemy.y) < 40 && platform.y > enemy.y) {
                            onEdge = false;
                        }
                    } else { // Moving right
                        if (platform.x < enemy.x + 32 && platform.x > enemy.x && 
                            Math.abs(platform.y - enemy.y) < 40 && platform.y > enemy.y) {
                            onEdge = false;
                        }
                    }
                });
                
                if (onEdge) {
                    enemy.direction *= -1;
                    enemy.setVelocityX(enemy.direction * 50);
                    enemy.flipX = enemy.direction > 0;
                }
            }
        }
    }, this);

    // Handle mushroom movement
    this.mushrooms.children.iterate(function(mushroom) {
        if (mushroom && mushroom.active) {
            if (mushroom.direction === undefined) {
                mushroom.direction = 1;
                mushroom.setVelocityX(50);
            }
            
            // If hitting a wall, turn around
            if (mushroom.body.blocked.left) {
                mushroom.direction = 1;
                mushroom.setVelocityX(50);
            } else if (mushroom.body.blocked.right) {
                mushroom.direction = -1;
                mushroom.setVelocityX(-50);
            }
        }
    }, this);

    // Handle player falling off the world
    if (this.player.y > this.physics.world.bounds.height) {
        playerDie.call(this);
    }

    // Handle player movement left and right
    if (this.cursors.left.isDown) {
        this.player.setVelocityX(-160);
        this.player.flipX = true;
    } else if (this.cursors.right.isDown) {
        this.player.setVelocityX(160);
        this.player.flipX = false;
    } else {
        this.player.setVelocityX(0);
    }

    // Handle player jumping
    if (this.cursors.up.isDown && this.player.body.touching.down) {
        this.player.setVelocityY(-330);
    }

    // Update score display
    score = Math.max(score, Math.floor(this.player.x / 100));
    this.scoreText.setText('Score: ' + score);
}

// Function to spawn ground segments with obstacles
function spawnGroundSegment(scene, x) {
    // Create ground segments
    for (let i = 0; i < 25; i++) {
        scene.platforms.create(x + (i * 32) + 16, 568, 'ground');
    }
    
    // Randomly spawn pipes
    var numPipes = Phaser.Math.Between(0, 2);
    for (var i = 0; i < numPipes; i++) {
        var pipeX = x + Phaser.Math.Between(200, 700);
        scene.pipes.create(pipeX, 520, 'pipe');
    }
    
    // Randomly spawn enemies
    var numEnemies = Phaser.Math.Between(1, 3);
    for (var i = 0; i < numEnemies; i++) {
        var enemyX = x + Phaser.Math.Between(200, 700);
        var enemy = scene.enemies.create(enemyX, 500, 'goomba');
        enemy.body.setSize(30, 30); // Hitbox matching square shape
        enemy.body.setOffset(1, 1); // Center the hitbox
        
        // Initialize movement properties
        enemy.direction = Phaser.Math.Between(0, 1) ? 1 : -1; // Randomly choose direction
        enemy.setVelocityX(enemy.direction * 50);
        enemy.flipX = enemy.direction > 0;
        enemy.setBounce(0); // Ensure no bouncing
        enemy.setCollideWorldBounds(false); // Allow going off-screen
    }
}

// Function to spawn floating platforms with coins/bricks
function spawnFloatingPlatforms(scene, x) {
    // Track all occupied positions to avoid overlaps
    var occupiedPositions = [];
    
    // Create some brick platforms with coins
    var numBrickRows = Phaser.Math.Between(1, 2);
    
    for (var row = 0; row < numBrickRows; row++) {
        var rowY = Phaser.Math.Between(350, 450);
        var rowLength = Phaser.Math.Between(3, 6);
        var rowX = x + Phaser.Math.Between(100, 600);
        
        // First, create all bricks in a row with exact spacing
        for (var i = 0; i < rowLength; i++) {
            var brickX = rowX + (i * 32);
            var brickY = rowY;
            
            // Store this position
            occupiedPositions.push({x: brickX, y: brickY});
            
            var brick = scene.bricks.create(brickX, brickY, 'brick');
            
            // 10% chance to have a mushroom in a brick
            if (Phaser.Math.Between(1, 10) === 1) {
                brick.hasMushroom = true;
            }
        }
        
        // Then, add coins above some bricks, ensuring no overlaps
        for (var i = 0; i < rowLength; i++) {
            // 30% chance to have a coin above a brick
            if (Phaser.Math.Between(1, 10) <= 3) {
                var coinX = rowX + (i * 32);
                var coinY = rowY - 40; // Position coin above brick with enough space
                
                // Check if this position is already occupied
                var canPlaceCoin = true;
                for (var j = 0; j < occupiedPositions.length; j++) {
                    var pos = occupiedPositions[j];
                    if (Math.abs(pos.x - coinX) < 32 && Math.abs(pos.y - coinY) < 32) {
                        canPlaceCoin = false;
                        break;
                    }
                }
                
                if (canPlaceCoin) {
                    scene.coins.create(coinX, coinY, 'coin');
                    occupiedPositions.push({x: coinX, y: coinY});
                }
            }
        }
    }
    
    // Create some question blocks with coins, ensuring no overlaps
    var numQuestionBlocks = Phaser.Math.Between(1, 3);
    var attempts = 0;
    var blocksPlaced = 0;
    
    // Try to place blocks, but limit attempts to avoid infinite loops
    while (blocksPlaced < numQuestionBlocks && attempts < 30) {
        var blockX = x + Phaser.Math.Between(100, 700);
        var blockY = Phaser.Math.Between(380, 450);
        
        // Check if this position overlaps with any existing object
        var overlaps = false;
        for (var i = 0; i < occupiedPositions.length; i++) {
            var pos = occupiedPositions[i];
            // Use full brick width (32 pixels) to check for overlaps
            if (Math.abs(pos.x - blockX) < 32 && Math.abs(pos.y - blockY) < 32) {
                overlaps = true;
                break;
            }
        }
        
        // Only place the block if there's no overlap
        if (!overlaps) {
            scene.bricks.create(blockX, blockY, 'brick').setTint(0xFFD700);
            occupiedPositions.push({x: blockX, y: blockY});
            blocksPlaced++;
        }
        
        attempts++;
    }
}

// Handle coin collection
function collectCoin(player, coin) {
    coin.disableBody(true, true);
    score += 100;
    this.scoreText.setText('Score: ' + score);
}

// Handle mushroom collection (power up)
function collectMushroom(player, mushroom) {
    mushroom.disableBody(true, true);
    score += 1000;
    this.scoreText.setText('Score: ' + score);
    
    if (!player.isBig) {
        player.isBig = true;
        player.setScale(1.2);
    }
}

// Handle hitting bricks
function hitBrick(player, brick) {
    // Only trigger when hitting from below
    if (player.body.touching.up && brick.body.touching.down) {
        // Animate the brick being hit
        this.tweens.add({
            targets: brick,
            y: brick.y - 8,
            duration: 100,
            yoyo: true
        });
        
        // If brick has mushroom, spawn it
        if (brick.hasMushroom) {
            var mushroom = this.mushrooms.create(brick.x, brick.y - 32, 'mushroom');
            mushroom.setBounce(0);
            mushroom.setVelocityX(50);
            brick.hasMushroom = false; // Remove mushroom from brick
        }
    }
}

// Handle collisions with enemies
function hitEnemy(player, enemy) {
    // If player is bouncing on top of enemy
    if (player.body.velocity.y > 0 && player.body.touching.down && enemy.body.touching.up) {
        // Kill the enemy
        enemy.setTexture('goomba-squished');
        enemy.setVelocityX(0);
        score += 100;
        this.scoreText.setText('Score: ' + score);
        
        // Add a small bounce
        player.setVelocityY(-150);
        
        // Disable enemy after a short delay
        this.time.delayedCall(500, function() {
            enemy.disableBody(true, true);
        });
    } 
    // Player touched enemy from the side while not invulnerable
    else if (!isInvulnerable) {
        if (player.isBig) {
            // Lose power up but don't die
            player.isBig = false;
            player.setScale(1);
            isInvulnerable = true;
        } else {
            playerDie.call(this);
        }
    }
}

// Handle player death
function playerDie() {
    lives--;
    this.livesText.setText('Lives: ' + lives);
    
    if (lives <= 0) {
        gameOver = true;
        
        // Clear any existing game over elements
        if (gameOverGroup) {
            gameOverGroup.clear(true, true);
        }
        
        // Create fixed game over screen (attached to camera, not world)
        
        // Black background covering the entire screen
        var blackOverlay = this.add.rectangle(
            400, 300, 800, 600, 0x000000
        ).setScrollFactor(0);
        gameOverGroup.add(blackOverlay);
        
        // Game over text
        var gameOverText = this.add.text(
            400, 200, 'GAME OVER', 
            { fontSize: '48px', fill: '#FFF', fontFamily: 'monospace' }
        ).setOrigin(0.5).setScrollFactor(0);
        gameOverGroup.add(gameOverText);
        
        // Mario image
        var marioImage = this.add.image(400, 300, 'gameOverMario')
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setScale(2); // Make it larger
        gameOverGroup.add(marioImage);
        
        // Restart instructions
        var restartText = this.add.text(
            400, 400, 'Press SPACE to restart', 
            { fontSize: '24px', fill: '#FFF', fontFamily: 'monospace' }
        ).setOrigin(0.5).setScrollFactor(0);
        gameOverGroup.add(restartText);
        
        // Make restart text blink for visibility
        this.tweens.add({
            targets: restartText,
            alpha: 0.2,
            duration: 500,
            ease: 'Power2',
            yoyo: true,
            repeat: -1
        });
        
        // Tint player red
        this.player.setTint(0xff0000);
    } else {
        // Reset player position
        this.player.setVelocity(0, 0);
        this.player.x = Math.max(100, this.cameras.main.scrollX + 200);
        this.player.y = 450;
        isInvulnerable = true;
        invulnerableTimer = 0;
    }
}

// Add new function to restart the game
function restartGame() {
    // Reset game state variables
    score = 0;
    gameOver = false;
    lives = 3;
    isInvulnerable = false;
    invulnerableTimer = 0;
    
    // Remove game over screen elements
    if (gameOverGroup) {
        gameOverGroup.clear(true, true);
    }
    
    // Reset player
    this.player.clearTint();
    this.player.setVelocity(0, 0);
    this.player.x = 100;
    this.player.y = 450;
    this.player.isBig = false;
    this.player.setScale(1);
    
    // Reset camera
    this.cameras.main.scrollX = 0;
    
    // Clear existing game objects
    this.platforms.clear(true, true);
    this.bricks.clear(true, true);
    this.pipes.clear(true, true);
    this.coins.clear(true, true);
    this.mushrooms.clear(true, true);
    this.enemies.clear(true, true);
    
    // Reset spawn position
    nextSpawnX = 0;
    
    // Respawn initial level segments
    spawnGroundSegment(this, 0);
    spawnGroundSegment(this, 800);
    spawnFloatingPlatforms(this, 0);
    spawnFloatingPlatforms(this, 800);
    
    // Reset score and lives display
    this.scoreText.setText('Score: 0');
    this.livesText.setText('Lives: 3');
}