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

// Scene creation function
function create() {
    // Create graphics for generating textures
    var graphics = this.make.graphics({x: 0, y: 0, add: false});

    // Create sky background
    graphics.fillStyle(0x87CEEB); // Light blue
    graphics.fillRect(0, 0, 800, 600);
    graphics.generateTexture('sky', 800, 600);
    this.add.tileSprite(400, 300, 8000, 600, 'sky');

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

    // Goomba texture: Brown enemy
    graphics.fillStyle(0x8B4513); // Brown color
    graphics.fillCircle(16, 16, 14); // Circle for body
    graphics.fillStyle(0x000000); // Black color for eyes
    graphics.fillRect(10, 10, 4, 4); // Left eye
    graphics.fillRect(22, 10, 4, 4); // Right eye
    graphics.generateTexture('goomba', 32, 32);

    // Goomba squished texture
    graphics.fillStyle(0x8B4513); // Brown color
    graphics.fillEllipse(16, 24, 28, 8); // Flattened ellipse
    graphics.generateTexture('goomba-squished', 32, 32);

    // Cloud texture: White fluffy cloud
    graphics.fillStyle(0xffffff); // White color
    graphics.fillCircle(16, 16, 12);
    graphics.fillCircle(8, 16, 10);
    graphics.fillCircle(24, 16, 10);
    graphics.generateTexture('cloud', 48, 32);

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

    // Create clouds (decorative)
    for (let i = 0; i < 20; i++) {
        let cloudX = Phaser.Math.Between(400, 8000);
        let cloudY = Phaser.Math.Between(50, 200);
        this.add.image(cloudX, cloudY, 'cloud');
    }

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
}

function update(time, delta) {
    if (gameOver) {
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
        else if (enemy && enemy.active && enemy.body.touching.down) {
            if (enemy.direction === undefined) {
                enemy.direction = -1;
                enemy.setVelocityX(-50);
            }
            
            // If hitting a wall or at an edge, turn around
            if (enemy.body.blocked.left || 
                !this.platforms.getChildren().some(p => p.x > enemy.x - 20 && p.x < enemy.x && Math.abs(p.y - enemy.y) < 40)) {
                enemy.direction = 1;
                enemy.setVelocityX(50);
                enemy.flipX = true;
            } else if (enemy.body.blocked.right || 
                      !this.platforms.getChildren().some(p => p.x < enemy.x + 20 && p.x > enemy.x && Math.abs(p.y - enemy.y) < 40)) {
                enemy.direction = -1;
                enemy.setVelocityX(-50);
                enemy.flipX = false;
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
        enemy.body.setSize(28, 28); // Smaller hitbox
    }
}

// Function to spawn floating platforms with coins/bricks
function spawnFloatingPlatforms(scene, x) {
    // Create some brick platforms with coins
    var numBrickRows = Phaser.Math.Between(1, 2);
    
    for (var row = 0; row < numBrickRows; row++) {
        var rowY = Phaser.Math.Between(350, 450);
        var rowLength = Phaser.Math.Between(3, 6);
        var rowX = x + Phaser.Math.Between(100, 600);
        
        for (var i = 0; i < rowLength; i++) {
            var brick = scene.bricks.create(rowX + (i * 32), rowY, 'brick');
            
            // 30% chance to have a coin above a brick
            if (Phaser.Math.Between(1, 10) <= 3) {
                scene.coins.create(rowX + (i * 32), rowY - 40, 'coin');
            }
            
            // 10% chance to have a mushroom in a brick
            if (Phaser.Math.Between(1, 10) === 1) {
                brick.hasMushroom = true;
            }
        }
    }
    
    // Create some question blocks with coins
    var numQuestionBlocks = Phaser.Math.Between(1, 3);
    for (var i = 0; i < numQuestionBlocks; i++) {
        var blockX = x + Phaser.Math.Between(100, 700);
        var blockY = Phaser.Math.Between(380, 450);
        scene.bricks.create(blockX, blockY, 'brick').setTint(0xFFD700);
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
        this.add.text(this.cameras.main.scrollX + 400, 300, 'GAME OVER', { 
            fontSize: '64px', 
            fill: '#FFF' 
        }).setOrigin(0.5);
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