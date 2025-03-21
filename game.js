// Game configuration object for Phaser
var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'phaser-game',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    pixelArt: true,
    roundPixels: true
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

// Leaderboard functionality
let leaderboard = [];
let isSubmittingScore = false;

// Fetch leaderboard data when the page loads
document.addEventListener('DOMContentLoaded', function() {
    fetchLeaderboard();
    setupEmailInputHandlers();
});

// Fetch leaderboard data from the server
function fetchLeaderboard() {
    const apiUrl = window.location.hostname === "localhost" || 
                  window.location.hostname === "127.0.0.1" 
                  ? "http://localhost:3000/api/leaderboard" 
                  : window.location.origin + "/api/leaderboard";
    
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            leaderboard = data;
            updateLeaderboardDisplay();
        })
        .catch(error => {
            console.error('Error fetching leaderboard:', error);
        });
}

// Update the leaderboard display in the HTML
function updateLeaderboardDisplay() {
    const leaderboardEntries = document.getElementById('leaderboard-entries');
    leaderboardEntries.innerHTML = '';
    
    leaderboard.slice(0, 10).forEach((entry, index) => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'leaderboard-entry';
        
        // Only show the part before @ symbol
        let displayEmail = entry.email.split('@')[0];
        if (displayEmail.length > 10) {
            displayEmail = displayEmail.substring(0, 7) + '...';
        }
        
        entryDiv.innerHTML = `
            <span>${index + 1}. ${displayEmail}</span>
            <span>${entry.score}</span>
        `;
        
        leaderboardEntries.appendChild(entryDiv);
    });
}

// Set up event handlers for the email input form
function setupEmailInputHandlers() {
    const emailInputContainer = document.getElementById('email-input-container');
    const submitButton = document.getElementById('submit-score');
    const cancelButton = document.getElementById('cancel-submit');
    const emailInput = document.getElementById('email-input');
    const submitMessage = document.getElementById('submit-message');
    
    // Submit button handler
    submitButton.addEventListener('click', function() {
        const email = emailInput.value.trim();
        
        if (!isValidEmail(email)) {
            submitMessage.textContent = 'Please enter a valid email address';
            submitMessage.style.color = '#FF0000';
            return;
        }
        
        submitScore(email, score);
    });
    
    // Cancel button handler
    cancelButton.addEventListener('click', function() {
        emailInputContainer.style.display = 'none';
    });
}

// Check if email is valid
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Submit score to the leaderboard
function submitScore(email, score) {
    if (isSubmittingScore) return;
    
    isSubmittingScore = true;
    const submitMessage = document.getElementById('submit-message');
    submitMessage.textContent = 'Submitting...';
    submitMessage.style.color = '#FFFFFF';
    
    const apiUrl = window.location.hostname === "localhost" || 
                  window.location.hostname === "127.0.0.1" 
                  ? "http://localhost:3000/api/submit-score" 
                  : window.location.origin + "/api/submit-score";
    
    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, score })
    })
    .then(response => response.json())
    .then(data => {
        submitMessage.textContent = data.message || 'Score submitted successfully!';
        submitMessage.style.color = '#00FF00';
        isSubmittingScore = false;
        
        // Refresh the leaderboard
        fetchLeaderboard();
        
        // Hide the form after 2 seconds
        setTimeout(() => {
            document.getElementById('email-input-container').style.display = 'none';
        }, 2000);
    })
    .catch(error => {
        console.error('Error submitting score:', error);
        submitMessage.textContent = 'Error submitting score. Please try again.';
        submitMessage.style.color = '#FF0000';
        isSubmittingScore = false;
    });
}

// Override the playerDie function to show the email input when game over
const originalPlayerDie = playerDie;
playerDie = function() {
    // Call the original function first
    originalPlayerDie.apply(this, arguments);
    
    // If game over, show the email input after a short delay
    if (lives <= 0) {
        setTimeout(() => {
            document.getElementById('final-score').textContent = score;
            document.getElementById('email-input-container').style.display = 'block';
        }, 1000);
    }
};

// Preload function to load assets
function preload() {
    // Create Mario sprites directly as textures
    createMarioTextures(this);
    
    // Create graphics for generating textures for other game elements
    var graphics = this.make.graphics({x: 0, y: 0, add: false});
    
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
}

// Function to create Mario textures directly in the scene
function createMarioTextures(scene) {
    // Create Mario idle texture
    var graphics = scene.make.graphics({x: 0, y: 0, add: false});
    
    // Red hat
    graphics.fillStyle(0xFF0000);
    graphics.fillRect(8, 0, 16, 8);
    
    // Brown hair
    graphics.fillStyle(0x8B4513);
    graphics.fillRect(4, 8, 8, 4);
    
    // Face
    graphics.fillStyle(0xFFA07A);
    graphics.fillRect(12, 8, 12, 8);
    
    // Eyes
    graphics.fillStyle(0x000000);
    graphics.fillRect(14, 10, 2, 2);
    graphics.fillRect(22, 10, 2, 2);
    
    // Mustache
    graphics.fillStyle(0x8B4513);
    graphics.fillRect(12, 14, 12, 2);
    
    // Blue overalls
    graphics.fillStyle(0x0000FF);
    graphics.fillRect(8, 16, 16, 16);
    
    // Overall buttons
    graphics.fillStyle(0xFFFF00);
    graphics.fillRect(12, 18, 2, 2);
    graphics.fillRect(18, 18, 2, 2);
    
    // Red shirt
    graphics.fillStyle(0xFF0000);
    graphics.fillRect(4, 16, 4, 12);
    graphics.fillRect(24, 16, 4, 12);
    
    // Brown shoes
    graphics.fillStyle(0x8B4513);
    graphics.fillRect(4, 28, 8, 4);
    graphics.fillRect(20, 28, 8, 4);
    
    graphics.generateTexture('mario-idle', 32, 32);
    
    // Create Mario run texture 1
    graphics.clear();
    
    // Red hat
    graphics.fillStyle(0xFF0000);
    graphics.fillRect(8, 0, 16, 8);
    
    // Brown hair
    graphics.fillStyle(0x8B4513);
    graphics.fillRect(4, 8, 8, 4);
    
    // Face
    graphics.fillStyle(0xFFA07A);
    graphics.fillRect(12, 8, 12, 8);
    
    // Eyes
    graphics.fillStyle(0x000000);
    graphics.fillRect(14, 10, 2, 2);
    graphics.fillRect(22, 10, 2, 2);
    
    // Mustache
    graphics.fillStyle(0x8B4513);
    graphics.fillRect(12, 14, 12, 2);
    
    // Blue overalls
    graphics.fillStyle(0x0000FF);
    graphics.fillRect(8, 16, 16, 16);
    
    // Overall buttons
    graphics.fillStyle(0xFFFF00);
    graphics.fillRect(12, 18, 2, 2);
    graphics.fillRect(18, 18, 2, 2);
    
    // Red shirt
    graphics.fillStyle(0xFF0000);
    graphics.fillRect(4, 16, 4, 12);
    graphics.fillRect(24, 16, 4, 12);
    
    // Brown shoes (running position 1)
    graphics.fillStyle(0x8B4513);
    graphics.fillRect(0, 28, 8, 4);
    graphics.fillRect(24, 28, 8, 4);
    
    graphics.generateTexture('mario-run1', 32, 32);
    
    // Create Mario run texture 2
    graphics.clear();
    
    // Red hat
    graphics.fillStyle(0xFF0000);
    graphics.fillRect(8, 0, 16, 8);
    
    // Brown hair
    graphics.fillStyle(0x8B4513);
    graphics.fillRect(4, 8, 8, 4);
    
    // Face
    graphics.fillStyle(0xFFA07A);
    graphics.fillRect(12, 8, 12, 8);
    
    // Eyes
    graphics.fillStyle(0x000000);
    graphics.fillRect(14, 10, 2, 2);
    graphics.fillRect(22, 10, 2, 2);
    
    // Mustache
    graphics.fillStyle(0x8B4513);
    graphics.fillRect(12, 14, 12, 2);
    
    // Blue overalls
    graphics.fillStyle(0x0000FF);
    graphics.fillRect(8, 16, 16, 16);
    
    // Overall buttons
    graphics.fillStyle(0xFFFF00);
    graphics.fillRect(12, 18, 2, 2);
    graphics.fillRect(18, 18, 2, 2);
    
    // Red shirt
    graphics.fillStyle(0xFF0000);
    graphics.fillRect(4, 16, 4, 12);
    graphics.fillRect(24, 16, 4, 12);
    
    // Brown shoes (running position 2)
    graphics.fillStyle(0x8B4513);
    graphics.fillRect(4, 28, 8, 4);
    graphics.fillRect(20, 28, 8, 4);
    
    graphics.generateTexture('mario-run2', 32, 32);
    
    // Create Mario jump texture
    graphics.clear();
    
    // Red hat
    graphics.fillStyle(0xFF0000);
    graphics.fillRect(8, 0, 16, 8);
    
    // Brown hair
    graphics.fillStyle(0x8B4513);
    graphics.fillRect(4, 8, 8, 4);
    
    // Face
    graphics.fillStyle(0xFFA07A);
    graphics.fillRect(12, 8, 12, 8);
    
    // Eyes
    graphics.fillStyle(0x000000);
    graphics.fillRect(14, 10, 2, 2);
    graphics.fillRect(22, 10, 2, 2);
    
    // Mustache
    graphics.fillStyle(0x8B4513);
    graphics.fillRect(12, 14, 12, 2);
    
    // Blue overalls
    graphics.fillStyle(0x0000FF);
    graphics.fillRect(8, 16, 16, 16);
    
    // Overall buttons
    graphics.fillStyle(0xFFFF00);
    graphics.fillRect(12, 18, 2, 2);
    graphics.fillRect(18, 18, 2, 2);
    
    // Red shirt with arms up
    graphics.fillStyle(0xFF0000);
    graphics.fillRect(4, 12, 4, 8);
    graphics.fillRect(24, 12, 4, 8);
    
    // Brown shoes (jumping position)
    graphics.fillStyle(0x8B4513);
    graphics.fillRect(8, 28, 6, 4);
    graphics.fillRect(18, 28, 6, 4);
    
    graphics.generateTexture('mario-jump', 32, 32);
    
    // Create Mario death texture
    graphics.clear();
    
    // Red hat
    graphics.fillStyle(0xFF0000);
    graphics.fillRect(8, 0, 16, 8);
    
    // Brown hair
    graphics.fillStyle(0x8B4513);
    graphics.fillRect(4, 8, 8, 4);
    
    // Face
    graphics.fillStyle(0xFFA07A);
    graphics.fillRect(12, 8, 12, 8);
    
    // X eyes
    graphics.fillStyle(0x000000);
    // Left X
    graphics.fillRect(13, 10, 2, 2);
    graphics.fillRect(15, 12, 2, 2);
    graphics.fillRect(15, 10, 2, 2);
    graphics.fillRect(13, 12, 2, 2);
    // Right X
    graphics.fillRect(21, 10, 2, 2);
    graphics.fillRect(23, 12, 2, 2);
    graphics.fillRect(23, 10, 2, 2);
    graphics.fillRect(21, 12, 2, 2);
    
    // Mustache
    graphics.fillStyle(0x8B4513);
    graphics.fillRect(12, 14, 12, 2);
    
    // Blue overalls
    graphics.fillStyle(0x0000FF);
    graphics.fillRect(8, 16, 16, 16);
    
    // Overall buttons
    graphics.fillStyle(0xFFFF00);
    graphics.fillRect(12, 18, 2, 2);
    graphics.fillRect(18, 18, 2, 2);
    
    // Red shirt
    graphics.fillStyle(0xFF0000);
    graphics.fillRect(4, 16, 4, 12);
    graphics.fillRect(24, 16, 4, 12);
    
    graphics.generateTexture('mario-death', 32, 32);
}

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

    // Add player sprite with physics - using our custom Mario texture
    this.player = this.physics.add.sprite(100, 450, 'mario-idle');
    this.player.setBounce(0.1);
    this.player.setCollideWorldBounds(false);
    this.player.isBig = false; // Track if Mario is big (powered up)
    
    // Create animations for Mario
    this.anims.create({
        key: 'mario-idle',
        frames: [ { key: 'mario-idle' } ],
        frameRate: 10
    });
    
    this.anims.create({
        key: 'mario-run',
        frames: [
            { key: 'mario-run1' },
            { key: 'mario-run2' }
        ],
        frameRate: 10,
        repeat: -1
    });
    
    this.anims.create({
        key: 'mario-jump',
        frames: [ { key: 'mario-jump' } ],
        frameRate: 10
    });
    
    // Set default animation
    this.player.anims.play('mario-idle');

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
    this.livesText = this.add.text(630, 16, 'Lives: ' + lives, { fontSize: '32px', fill: '#FFF' });
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
        if (this.player.body.touching.down) {
            this.player.anims.play('mario-run', true);
        }
    } else if (this.cursors.right.isDown) {
        this.player.setVelocityX(160);
        this.player.flipX = false;
        if (this.player.body.touching.down) {
            this.player.anims.play('mario-run', true);
        }
    } else {
        this.player.setVelocityX(0);
        if (this.player.body.touching.down) {
            this.player.anims.play('mario-idle', true);
        }
    }

    // Handle player jumping
    if (this.cursors.up.isDown && this.player.body.touching.down) {
        this.player.setVelocityY(-330);
        this.player.anims.play('mario-jump');
    } else if (!this.player.body.touching.down) {
        // Keep jump animation while in the air
        this.player.anims.play('mario-jump');
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
        } else {
            // Initialize game over group if it doesn't exist yet
            gameOverGroup = this.add.group();
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
        var marioImage = this.add.image(400, 300, 'mario-death')
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setScale(4); // Make it larger
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
    this.player.anims.play('mario-idle');
    
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