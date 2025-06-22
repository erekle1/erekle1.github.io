
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const scoreDisplay = document.getElementById('scoreDisplay');
        const highScoreDisplay = document.getElementById('highScoreDisplay');
        const healthBar = document.getElementById('healthBar');
        const startScreen = document.getElementById('startScreen');
        const startButton = document.getElementById('startButton');
        const characterSelectionContainer = document.getElementById('characterSelection');
        const gameOverScreen = document.getElementById('gameOverScreen');
        const finalScoreDisplay = document.getElementById('finalScore');
        const restartButton = document.getElementById('restartButton');
        const dogThoughtBubble = document.getElementById('dogThoughtBubble');

        // Game settings
        const GAME_WIDTH = 800;
        const GAME_HEIGHT = 400;
        const GROUND_Y = GAME_HEIGHT - 50;
        const INITIAL_SPEED = 3;
        const SPEED_INCREASE_RATE = 0.00005;
        const OBJECT_SPAWN_INTERVAL = 1500;
        const COLLECTIBLE_SPAWN_CHANCE = 0.2;
        // Bullet properties
        const BULLET_WIDTH = 30;
        const BULLET_HEIGHT = 15;
        const BULLET_SPEED = 10;
        const BULLET_COLOR = '#FFD700';
        canvas.width = GAME_WIDTH;
        canvas.height = GAME_HEIGHT;
        // Dog properties
        const dog = {
            x: 50,
            y: GROUND_Y - 60,
            width: 60,
            height: 60,
            originalHeight: 60,
            velocityY: 0,
            gravity: 0.8,
            jumpStrength: -15,
            isJumping: false,
            isDucking: false,
            duckDuration: 600,
            duckStartTime: 0,
            isBarking: false,
            barkDuration: 300,
            barkStartTime: 0,
            emoji: '🐕',
            barkEmoji: '🐶',
            rotation: 0,
            rotationSpeed: 0.2,
            health: 100,
            maxHealth: 100
        };

        // Character options
        const characters = [
            { id: 'default', name: 'Shepherd', emoji: '🐕', barkEmoji: '🐶' },
            { id: 'poodle', name: 'Poodle', emoji: '🐩', barkEmoji: '🐩' },
            { id: 'pug', name: 'Pug', emoji: ' Pug', barkEmoji: '🐕‍🦺' },
            { id: 'husky', name: 'Husky', emoji: '🐺', barkEmoji: '🐶' },
            { id: 'fox', name: 'Fox', emoji: '🦊', barkEmoji: '🐺' }
        ];
        let selectedCharacterId = 'default';

        // Game objects arrays
        let gameObstacles = [];
        let collectibles = [];
        let bullets = [];
        let gameSpeed = INITIAL_SPEED;

        let lastSpawnTime = 0;

        // Ground properties for scrolling effect
        let groundSegments = [];
        const GROUND_SEGMENT_WIDTH = 50;
        let GROUND_COLOR = '#7CFC00';
        let GROUND_BORDER_COLOR = '#006400';

        // Background elements for parallax effect
        let backgroundElements = [];
        let currentTheme = 'forest';

        // Game state
        let score = 0;
        let highScore = localStorage.getItem('dogRunRPGHighScore') || 0;
        let isGameOver = false;
        let animationFrameId;
        let gameRunning = false;

        // LLM Integration variables
        let dogThoughtBubbleVisibleTime = 0;
        const DOG_THOUGHT_DURATION = 3000;
        const DOG_THOUGHT_TRIGGER_SCORE_INTERVAL = 25;
        let lastDogThoughtTriggerScore = 0;

        // --- Game Initialization and Reset ---

        function initializeGame() {
            const char = characters.find(c => c.id === selectedCharacterId);
            dog.emoji = char.emoji;
            dog.barkEmoji = char.barkEmoji;

            dog.y = GROUND_Y - dog.originalHeight;
            dog.height = dog.originalHeight;
            dog.velocityY = 0;
            dog.isJumping = false;
            dog.isDucking = false;
            dog.isBarking = false;
            dog.rotation = 0;
            dog.health = dog.maxHealth;
            
            gameObstacles = [];
            collectibles = [];
            bullets = [];
            score = 0;
            gameSpeed = INITIAL_SPEED; // Reset speed to initial
            isGameOver = false;
            lastSpawnTime = 0;
            lastDogThoughtTriggerScore = 0;

            scoreDisplay.textContent = score;
            highScoreDisplay.textContent = highScore;
            updateHealthBar();
            gameOverScreen.style.display = 'none';
            startScreen.style.display = 'none';

            groundSegments = [];
            for (let i = 0; i < GAME_WIDTH / GROUND_SEGMENT_WIDTH + 2; i++) {
                groundSegments.push({ x: i * GROUND_SEGMENT_WIDTH });
            }

            currentTheme = 'forest';
            canvas.style.backgroundColor = '#87ceeb';
            GROUND_COLOR = '#7CFC00';
            GROUND_BORDER_COLOR = '#006400';
            setupBackgroundElements(currentTheme);

            dogThoughtBubble.style.opacity = '0';
            dogThoughtBubbleVisibleTime = 0;
            dogThoughtBubble.textContent = '';
        }

        /**
         * Populates the character selection screen.
         */
        function populateCharacterSelection() {
            characterSelectionContainer.innerHTML = '';
            characters.forEach(char => {
                const card = document.createElement('div');
                card.classList.add('character-card');
                if (char.id === selectedCharacterId) {
                    card.classList.add('selected');
                }
                card.dataset.charId = char.id;
                card.innerHTML = `<span>${char.emoji}</span>${char.name}`;
                card.addEventListener('click', () => {
                    document.querySelectorAll('.character-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    selectedCharacterId = char.id;
                });
                characterSelectionContainer.appendChild(card);
            });
        }

        /**
         * Sets up the background elements based on the current stage/theme.
         * @param {string} theme - The theme to apply ('forest', 'desert', 'night').
         */
        function setupBackgroundElements(theme) {
            backgroundElements = [];

            if (theme === 'forest') {
                for (let i = 0; i < 5; i++) backgroundElements.push({ type: 'cloud', x: Math.random() * GAME_WIDTH, y: 50 + Math.random() * 100, width: 80 + Math.random() * 70, height: 30 + Math.random() * 20, color: 'rgba(255, 255, 255, 0.8)', speedMultiplier: 0.1 });
                for (let i = 0; i < 7; i++) backgroundElements.push({ type: 'tree', x: Math.random() * GAME_WIDTH, y: GROUND_Y - (70 + Math.random() * 60), size: 30 + Math.random() * 30, color: '#1a5d1a', trunkColor: '#8B4513', speedMultiplier: 0.4 }); // Darker green foliage
                for (let i = 0; i < 10; i++) backgroundElements.push({ type: 'bush', x: Math.random() * GAME_WIDTH, y: GROUND_Y - (20 + Math.random() * 15), width: 20 + Math.random() * 20, height: 20 + Math.random() * 15, color: '#2E8B57', speedMultiplier: 0.8 });
            } else if (theme === 'desert') {
                for (let i = 0; i < 8; i++) backgroundElements.push({ type: 'cactus', x: Math.random() * GAME_WIDTH, y: GROUND_Y - (50 + Math.random() * 40), size: 25 + Math.random() * 25, color: '#556B2F', speedMultiplier: 0.4 });
                for (let i = 0; i < 15; i++) backgroundElements.push({ type: 'tumbleweed', x: Math.random() * GAME_WIDTH, y: GROUND_Y - (10 + Math.random() * 10), size: 10 + Math.random() * 10, color: '#BDB76B', speedMultiplier: 0.9 });
            } else if (theme === 'night') {
                for (let i = 0; i < 50; i++) backgroundElements.push({ type: 'star', x: Math.random() * GAME_WIDTH, y: Math.random() * (GAME_HEIGHT / 2), size: 1 + Math.random() * 1.5, color: 'rgba(255, 255, 255, 0.9)', speedMultiplier: 0.05 });
                backgroundElements.push({ type: 'moon', x: GAME_WIDTH - 100, y: 70, size: 40, color: '#F0E68C', speedMultiplier: 0.01 });
                for (let i = 0; i < 5; i++) backgroundElements.push({ type: 'hill', x: Math.random() * GAME_WIDTH, y: GROUND_Y - (90 + Math.random() * 60), width: 180 + Math.random() * 120, height: 90 + Math.random() * 60, color: '#2F4F4F', speedMultiplier: 0.35 });
            }
        }

        // --- Drawing Functions ---

        /**
         * Draws the dog emoji, applying rotation if jumping and changing emoji if barking.
         */
        function drawDog() {
            ctx.save();
            ctx.translate(dog.x + dog.width / 2, dog.y + dog.height / 2);
            ctx.rotate(dog.rotation);
            ctx.font = `${dog.height}px Inter`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(dog.isBarking ? dog.barkEmoji : dog.emoji, 0, 0);
            ctx.restore();
        }

        /**
         * Draws obstacles on the canvas with added visual details based on type.
         */
        function drawObstacles() {
            gameObstacles.forEach(obstacle => {
                if (obstacle.type === 'tree') {
                    // Trunk
                    ctx.fillStyle = obstacle.trunkColor || '#8B4513';
                    ctx.fillRect(obstacle.x + obstacle.width * 0.4, obstacle.y + obstacle.height * 0.7, obstacle.width * 0.2, obstacle.height * 0.3);
                    // Foliage (simple circles)
                    ctx.fillStyle = obstacle.foliageColor || '#1a5d1a'; // Use the new darker green
                    ctx.beginPath();
                    ctx.arc(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height * 0.4, obstacle.width * 0.4, 0, Math.PI * 2);
                    ctx.arc(obstacle.x + obstacle.width * 0.3, obstacle.y + obstacle.height * 0.2, obstacle.width * 0.35, 0, Math.PI * 2);
                    ctx.arc(obstacle.x + obstacle.width * 0.7, obstacle.y + obstacle.height * 0.2, obstacle.width * 0.35, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#2F4F4F';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                } else if (obstacle.type === 'spider') {
                    ctx.font = `${obstacle.height}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('🕷️', obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2);
                }
            });
        }

        /**
         * Draws collectible items.
         */
        function drawCollectibles() {
            collectibles.forEach(item => {
                ctx.font = `${item.size}px Inter`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(item.emoji, item.x + item.size / 2, item.y + item.size / 2);
            });
        }

        /**
         * Draws bullets fired by the dog.
         */
        function drawBullets() {
            bullets.forEach(bullet => {
                ctx.fillStyle = BULLET_COLOR;
                ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
                ctx.font = `${bullet.height - 5}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🦴', bullet.x + bullet.width / 2, bullet.y + bullet.height / 2);
            });
        }

        /**
         * Draws the scrolling ground segments.
         */
        function drawGround() {
            ctx.fillStyle = GROUND_COLOR;
            ctx.strokeStyle = GROUND_BORDER_COLOR;
            ctx.lineWidth = 3;
            groundSegments.forEach(segment => {
                ctx.fillRect(segment.x, GROUND_Y, GROUND_SEGMENT_WIDTH, GAME_HEIGHT - GROUND_Y);
                ctx.strokeRect(segment.x, GROUND_Y, GROUND_SEGMENT_WIDTH, GAME_HEIGHT - GROUND_Y);
            });
        }

        /**
         * Draws parallax background elements.
         */
        function drawBackgroundElements() {
            backgroundElements.forEach(element => {
                ctx.fillStyle = element.color;
                if (element.type === 'cloud') {
                    ctx.beginPath();
                    ctx.arc(element.x, element.y, element.width * 0.4, 0, Math.PI * 2);
                    ctx.arc(element.x + element.width * 0.3, element.y - element.height * 0.2, element.width * 0.3, 0, Math.PI * 2);
                    ctx.arc(element.x - element.width * 0.3, element.y - element.height * 0.1, element.width * 0.35, 0, Math.PI * 2);
                    ctx.arc(element.x + element.width * 0.6, element.y, element.width * 0.2, 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.fill();
                } else if (element.type === 'tree') {
                    ctx.fillStyle = element.trunkColor;
                    ctx.fillRect(element.x + element.size * 0.4, element.y + element.size * 0.8, element.size * 0.2, GAME_HEIGHT - (element.y + element.size * 0.8) - 50);
                    ctx.fillStyle = element.color;
                    ctx.beginPath();
                    ctx.moveTo(element.x, element.y + element.size * 0.8);
                    ctx.lineTo(element.x + element.size / 2, element.y);
                    ctx.lineTo(element.x + element.size, element.y + element.size * 0.8);
                    ctx.closePath();
                    ctx.fill();
                } else if (element.type === 'bush') {
                    ctx.beginPath();
                    ctx.arc(element.x, element.y, element.width / 2, 0, Math.PI * 2);
                    ctx.arc(element.x + element.width * 0.4, element.y - element.height * 0.3, element.width * 0.3, 0, Math.PI * 2);
                    ctx.arc(element.x - element.width * 0.3, element.y - element.height * 0.1, element.width * 0.25, 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.fill();
                } else if (element.type === 'cactus') {
                    ctx.fillRect(element.x + element.size * 0.4, element.y, element.size * 0.2, element.size);
                    ctx.fillRect(element.x + element.size * 0.6, element.y + element.size * 0.2, element.size * 0.2, element.size * 0.4);
                    ctx.fillRect(element.x + element.size * 0.2, element.y + element.size * 0.3, element.size * 0.2, element.size * 0.3);
                } else if (element.type === 'tumbleweed') {
                    ctx.beginPath(); ctx.arc(element.x, element.y, element.size / 2, 0, Math.PI * 2); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(element.x - element.size / 3, element.y - element.size / 3); ctx.lineTo(element.x + element.size / 3, element.y + element.size / 3); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(element.x + element.size / 3, element.y - element.size / 3); ctx.lineTo(element.x - element.size / 3, element.y + element.size / 3); ctx.stroke();
                } else if (element.type === 'star') {
                    ctx.beginPath(); ctx.arc(element.x, element.y, element.size, 0, Math.PI * 2); ctx.fill();
                } else if (element.type === 'moon') {
                    ctx.beginPath(); ctx.arc(element.x, element.y, element.size, 0, Math.PI * 2); ctx.fill();
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.beginPath(); ctx.arc(element.x - element.size * 0.5, element.y, element.size * 0.8, 0, Math.PI * 2); ctx.fill();
                    ctx.globalCompositeOperation = 'source-over';
                } else if (element.type === 'hill') {
                    ctx.beginPath();
                    ctx.moveTo(element.x, GROUND_Y);
                    ctx.lineTo(element.x + element.width / 2, element.y);
                    ctx.lineTo(element.x + element.width, GROUND_Y);
                    ctx.closePath();
                    ctx.fill();
                }
            });
        }

        // --- Update Functions ---

        /**
         * Updates the dog's position and state (jumping, ducking, barking, rotation).
         * @param {number} currentTime - The current time in milliseconds.
         */
        function updateDog(currentTime) {
            if (dog.isJumping) {
                dog.velocityY += dog.gravity;
                dog.y += dog.velocityY;
                dog.rotation += dog.rotationSpeed;
                if (dog.y >= GROUND_Y - dog.originalHeight) {
                    dog.y = GROUND_Y - dog.originalHeight;
                    dog.isJumping = false;
                    dog.velocityY = 0;
                    dog.rotation = 0;
                }
            } else if (dog.isDucking) {
                if (currentTime - dog.duckStartTime > dog.duckDuration) {
                    dog.isDucking = false;
                    dog.height = dog.originalHeight;
                    dog.y = GROUND_Y - dog.originalHeight;
                }
            }
            if (dog.isBarking) {
                if (currentTime - dog.barkStartTime > dog.barkDuration) {
                    dog.isBarking = false;
                }
            }

            // Update dog thought bubble visibility and position
            if (dogThoughtBubbleVisibleTime > 0 && currentTime < dogThoughtBubbleVisibleTime) {
                dogThoughtBubble.style.opacity = '1';
                // Position the thought bubble slightly above and to the right of the dog
                const canvasRect = canvas.getBoundingClientRect();
                const containerRect = canvas.parentElement.getBoundingClientRect();

                // Calculate dog's position relative to the canvas's visual size
                const dogXRatio = (dog.x + dog.width / 2) / GAME_WIDTH;
                const dogYRatio = dog.y / GAME_HEIGHT;

                const dogScreenX = canvasRect.left + dogXRatio * canvasRect.width;
                const dogScreenY = canvasRect.top + dogYRatio * canvasRect.height;

                // Position thought bubble relative to container, ensuring it scales with the game
                const bubbleOffsetX = 20; // Offset from dog's top-right corner
                const bubbleOffsetY = - (dog.height / 2) * (canvasRect.height / GAME_HEIGHT) - dogThoughtBubble.offsetHeight - 10;

                dogThoughtBubble.style.left = `${dogScreenX + bubbleOffsetX}px`;
                dogThoughtBubble.style.top = `${dogScreenY + bubbleOffsetY}px`;
                dogThoughtBubble.style.transform = `translateX(-50%)`; // Center bubble horizontally on its own width
            } else {
                dogThoughtBubble.style.opacity = '0';
                dogThoughtBubble.textContent = ''; // Clear text when hidden
                dogThoughtBubbleVisibleTime = 0;
            }
        }

        /**
         * Updates obstacle and collectible positions, spawns new ones, and removes old ones.
         * @param {number} currentTime - The current time in milliseconds.
         */
        function updateGameObjects(currentTime) {
            // Spawn new object (obstacle or collectible)
            if (currentTime - lastSpawnTime > OBJECT_SPAWN_INTERVAL / (gameSpeed / INITIAL_SPEED)) {
                if (Math.random() < COLLECTIBLE_SPAWN_CHANCE) {
                    spawnCollectible();
                } else {
                    spawnObstacle();
                }
                lastSpawnTime = currentTime;
            }

            // Move and remove obstacles
            for (let i = gameObstacles.length - 1; i >= 0; i--) {
                const obstacle = gameObstacles[i];
                obstacle.x -= gameSpeed;
                if (obstacle.x + obstacle.width < 0) {
                    gameObstacles.splice(i, 1);
                    score++;
                    scoreDisplay.textContent = score;
                }
            }

            // Move and remove collectibles
            for (let i = collectibles.length - 1; i >= 0; i--) {
                const item = collectibles[i];
                item.x -= gameSpeed;
                if (item.x + item.size < 0) {
                    collectibles.splice(i, 1);
                }
            }
        }

        /**
         * Spawns a new obstacle at the right edge of the canvas.
         */
        function spawnObstacle() {
            const obstacleCategory = Math.random();
            let obstacleType;
            let obstacleHeight, obstacleWidth, obstacleY;
            let isLowObstacle = false;

            if (obstacleCategory < 0.6) {
                obstacleType = 'tree';
                isLowObstacle = Math.random() < 0.4;
                obstacleHeight = isLowObstacle ? (40 + Math.random() * (50 - 40)) : (60 + Math.random() * (100 - 60));
                obstacleWidth = 30 + Math.random() * 30;
                obstacleY = GROUND_Y - obstacleHeight;
            } else {
                obstacleType = 'spider';
                obstacleHeight = 50;
                obstacleWidth = 50;
                obstacleY = 100 + Math.random() * (GROUND_Y - 100 - obstacleHeight);
            }

            gameObstacles.push({
                x: GAME_WIDTH,
                y: obstacleY,
                width: obstacleWidth,
                height: obstacleHeight,
                type: obstacleType,
                isLow: isLowObstacle,
                damage: obstacleType === 'spider' ? 20 : 10,
                trunkColor: '#8B4513',
                foliageColor: '#1a5d1a' // Changed default foliage color to a darker green
            });
        }

        /**
         * Spawns a new collectible item.
         */
        function spawnCollectible() {
            const itemType = 'bone';
            const itemSize = 40;
            collectibles.push({
                x: GAME_WIDTH,
                y: GROUND_Y - itemSize - Math.random() * 80,
                size: itemSize,
                emoji: '🦴',
                type: itemType,
                value: 10,
                healthRestore: 10
            });
        }

        /**
         * Updates the positions of ground segments for the scrolling effect.
         */
        function updateGround() {
            groundSegments.forEach(segment => {
                segment.x -= gameSpeed;
                if (segment.x + GROUND_SEGMENT_WIDTH < 0) {
                    segment.x = GAME_WIDTH - (GAME_WIDTH % GROUND_SEGMENT_WIDTH) + GROUND_SEGMENT_WIDTH - gameSpeed;
                }
            });
        }

        /**
         * Updates the positions of background elements for the parallax effect.
         */
        function updateBackgroundElements() {
            backgroundElements.forEach(element => {
                element.x -= gameSpeed * element.speedMultiplier;
                if (element.x + element.width < 0 || (element.type === 'star' || element.type === 'moon') && element.x < -element.size) {
                    element.x = GAME_WIDTH + Math.random() * GAME_WIDTH;
                    if (element.type === 'cloud') {
                        element.y = 50 + Math.random() * 100; element.width = 80 + Math.random() * 70; element.height = 30 + Math.random() * 20;
                    } else if (element.type === 'tree') {
                        element.y = GROUND_Y - (70 + Math.random() * 60); element.size = 30 + Math.random() * 30;
                    } else if (element.type === 'bush') {
                        element.y = GROUND_Y - (20 + Math.random() * 15); element.width = 20 + Math.random() * 20; element.height = 20 + Math.random() * 15;
                    } else if (element.type === 'cactus') {
                        element.y = GROUND_Y - (50 + Math.random() * 40); element.size = 25 + Math.random() * 25;
                    } else if (element.type === 'tumbleweed') {
                        element.y = GROUND_Y - (10 + Math.random() * 10); element.size = 10 + Math.random() * 10;
                    } else if (element.type === 'star') {
                        element.y = Math.random() * (GAME_HEIGHT / 2); element.size = 1 + Math.random() * 1.5;
                    } else if (element.type === 'hill') {
                        element.y = GROUND_Y - (90 + Math.random() * 60); element.width = 180 + Math.random() * 120; element.height = 90 + Math.random() * 60;
                    }
                }
            });
        }

        /**
         * Updates bullet positions and removes them if off-screen.
         */
        function updateBullets() {
            for (let i = bullets.length - 1; i >= 0; i--) {
                const bullet = bullets[i];
                bullet.x += bullet.speed;
                if (bullet.x > GAME_WIDTH) {
                    bullets.splice(i, 1);
                }
            }
        }

        // --- Collision Detection and Interaction ---

        /**
         * Checks for collision between the dog and any game objects (obstacles or collectibles).
         * Also handles bullet-obstacle collisions.
         */
        function checkCollisions() {
            // Bullet-obstacle collisions
            for (let i = bullets.length - 1; i >= 0; i--) {
                const bullet = bullets[i];
                for (let j = gameObstacles.length - 1; j >= 0; j--) {
                    const obstacle = gameObstacles[j];
                    if (
                        bullet.x < obstacle.x + obstacle.width &&
                        bullet.x + bullet.width > obstacle.x &&
                        bullet.y < obstacle.y + obstacle.height &&
                        bullet.y + bullet.height > obstacle.y
                    ) {
                        bullets.splice(i, 1);
                        gameObstacles.splice(j, 1);
                        score += 30;
                        scoreDisplay.textContent = score;
                        break;
                    }
                }
            }

            // Dog-obstacle collisions
            for (let i = gameObstacles.length - 1; i >= 0; i--) {
                const obstacle = gameObstacles[i];
                if (
                    dog.x < obstacle.x + obstacle.width &&
                    dog.x + dog.width > obstacle.x &&
                    dog.y < obstacle.y + obstacle.height &&
                    dog.y + dog.height > obstacle.y
                ) {
                    if (dog.isBarking && obstacle.type === 'spider') {
                        gameObstacles.splice(i, 1);
                        score += 20;
                        scoreDisplay.textContent = score;
                    } else {
                        dog.health -= obstacle.damage;
                        updateHealthBar();
                        gameObstacles.splice(i, 1);
                        if (dog.health <= 0) {
                            gameOver();
                        }
                    }
                }
            }

            // Collectible collisions
            for (let i = collectibles.length - 1; i >= 0; i--) {
                const item = collectibles[i];
                if (
                    dog.x < item.x + item.size &&
                    dog.x + dog.width > item.x &&
                    dog.y < item.y + item.size &&
                    dog.y + dog.height > item.y
                ) {
                    score += item.value;
                    scoreDisplay.textContent = score;
                    dog.health = Math.min(dog.maxHealth, dog.health + item.healthRestore);
                    updateHealthBar();
                    collectibles.splice(i, 1);
                }
            }
        }

        /**
         * Updates the visual health bar based on current health.
         */
        function updateHealthBar() {
            const healthPercentage = (dog.health / dog.maxHealth) * 100;
            healthBar.style.width = `${healthPercentage}%`;

            if (healthPercentage > 60) {
                healthBar.style.background = 'linear-gradient(to right, #7FFF00, #32CD32)';
            } else if (healthPercentage > 30) {
                healthBar.style.background = 'linear-gradient(to right, #FFD700, #DAA520)';
            } else {
                healthBar.style.background = 'linear-gradient(to right, #FF6347, #DC143C)';
            }
        }


        // --- LLM Integration: Dog Thoughts ---

        /**
         * Calls the Gemini API to generate a dog thought and displays it.
         */
        async function generateDogThought() {
            dogThoughtBubble.textContent = "Thinking..."; // Show a loading state
            dogThoughtBubbleVisibleTime = performance.now() + DOG_THOUGHT_DURATION; // Keep visible for duration

            let chatHistory = [];
            const prompt = "Generate a short, positive, and slightly humorous thought from the perspective of a running dog. Keep it under 15 words.";
            chatHistory.push({ role: "user", parts: [{ text: prompt }] });
            const payload = { contents: chatHistory };
            const apiKey = ""; // Leave this as-is for Gemini-2.0-flash
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();

                if (result.candidates && result.candidates.length > 0 &&
                    result.candidates[0].content && result.candidates[0].content.parts &&
                    result.candidates[0].content.parts.length > 0) {
                    const text = result.candidates[0].content.parts[0].text;
                    dogThoughtBubble.textContent = text; // Update bubble with generated thought
                } else {
                    console.error("Gemini API returned an unexpected structure or no content.");
                    dogThoughtBubble.textContent = "Woof! (Lost my train of thought.)"; // Fallback message
                }
            } catch (error) {
                console.error("Error calling Gemini API:", error);
                dogThoughtBubble.textContent = "Woof! (Can't think right now.)"; // Fallback message on error
            }
        }

        // --- Game Loop ---

        let lastTime = 0;

        /**
         * The main game loop, called repeatedly via requestAnimationFrame.
         * @param {number} currentTime - The DOMHighResTimeStamp for the current frame.
         */
        function gameLoop(currentTime) {
            if (isGameOver || !gameRunning) {
                return;
            }

            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;

            gameSpeed += SPEED_INCREASE_RATE * deltaTime;

            ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

            let newTheme = 'forest';
            if (score >= 50 && score < 100) {
                newTheme = 'desert';
                canvas.style.backgroundColor = '#f4a460';
                GROUND_COLOR = '#D2B48C';
                GROUND_BORDER_COLOR = '#A0522D';
            } else if (score >= 100) {
                newTheme = 'night';
                canvas.style.backgroundColor = '#191970';
                GROUND_COLOR = '#4682B4';
                GROUND_BORDER_COLOR = '#2F4F4F';
            } else {
                canvas.style.backgroundColor = '#87ceeb';
                GROUND_COLOR = '#7CFC00';
                GROUND_BORDER_COLOR = '#006400';
            }

            if (newTheme !== currentTheme) {
                currentTheme = newTheme;
                setupBackgroundElements(currentTheme);
            }

            // Trigger dog thought based on score progression
            if (score > 0 && score % DOG_THOUGHT_TRIGGER_SCORE_INTERVAL === 0 && score > lastDogThoughtTriggerScore) {
                generateDogThought();
                lastDogThoughtTriggerScore = score; // Update last triggered score
            }

            updateBackgroundElements();
            drawBackgroundElements();

            updateDog(currentTime); // This now also handles thought bubble positioning/visibility
            updateGameObjects(currentTime);
            updateGround();
            updateBullets();
            checkCollisions();

            drawGround();
            drawObstacles();
            drawCollectibles();
            drawBullets();
            drawDog();

            animationFrameId = requestAnimationFrame(gameLoop);
        }

        // --- Game Over ---

        function gameOver() {
            isGameOver = true;
            gameRunning = false;
            cancelAnimationFrame(animationFrameId);

            if (score > highScore) {
                highScore = score;
                localStorage.setItem('dogRunRPGHighScore', highScore);
                highScoreDisplay.textContent = highScore;
            }

            finalScoreDisplay.textContent = score;
            gameOverScreen.style.display = 'flex';
            dogThoughtBubble.style.opacity = '0'; // Hide thought bubble on game over
        }

        // --- Event Listeners ---

        function dogJump() {
            if (!dog.isJumping && !dog.isDucking && gameRunning) {
                dog.velocityY = dog.jumpStrength;
                dog.isJumping = true;
            }
        }

        function dogDuck(currentTime) {
            if (!dog.isJumping && !dog.isDucking && gameRunning) {
                dog.isDucking = true;
                dog.duckStartTime = currentTime;
                dog.height = dog.originalHeight / 2;
                dog.y = GROUND_Y - dog.height;
            }
        }

        /**
         * Initiates the dog's bark action, which also fires a bullet.
         * @param {number} currentTime - The current time in milliseconds.
         */
        function dogBark(currentTime) {
            if (!dog.isBarking && gameRunning) {
                dog.isBarking = true;
                dog.barkStartTime = currentTime;

                bullets.push({
                    x: dog.x + dog.width,
                    y: dog.y + dog.height / 2 - BULLET_HEIGHT / 2,
                    width: BULLET_WIDTH,
                    height: BULLET_HEIGHT,
                    speed: BULLET_SPEED
                });
            }
        }


        // Keyboard input for actions
        document.addEventListener('keydown', (e) => {
            if (!gameRunning && e.code !== 'Space' && e.code !== 'Enter') return;

            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                dogJump();
            } else if (e.code === 'ArrowDown' || e.code === 'ShiftLeft') {
                e.preventDefault();
                dogDuck(performance.now());
            } else if (e.code === 'Enter' || e.code === 'KeyZ') {
                e.preventDefault();
                dogBark(performance.now());
            }
        });

        // Touch input for actions
        canvas.addEventListener('touchstart', (e) => {
            if (!gameRunning) return;
            e.preventDefault();
            const touchX = e.touches[0].clientX;
            const canvasRect = canvas.getBoundingClientRect();
            const relativeX = touchX - canvasRect.left;

            const sectionWidth = canvasRect.width / 3;

            if (relativeX < sectionWidth) {
                dogDuck(performance.now());
            } else if (relativeX < sectionWidth * 2) {
                dogJump();
            } else {
                dogBark(performance.now());
            }
        });

        // Start button handler
        startButton.addEventListener('click', () => {
            initializeGame();
            gameRunning = true;
            gameLoop(0);
        });

        // Restart button handler
        restartButton.addEventListener('click', () => {
            initializeGame();
            gameRunning = true;
            gameLoop(0);
        });

        window.onload = function () {
            resizeCanvas();
            populateCharacterSelection();
            startScreen.style.display = 'flex';
        };

        function resizeCanvas() {
            const container = document.querySelector('.game-container');
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;

            const aspectRatio = GAME_WIDTH / GAME_HEIGHT;
            let newCanvasWidth = containerWidth;
            let newCanvasHeight = containerWidth / aspectRatio;

            if (newCanvasHeight > containerHeight * 0.8) {
                newCanvasHeight = containerHeight * 0.8;
                newCanvasWidth = newCanvasHeight * aspectRatio;
            }
            if (newCanvasWidth > containerWidth * 0.95) {
                newCanvasWidth = containerWidth * 0.95;
                newCanvasHeight = newCanvasWidth / aspectRatio;
            }

            canvas.style.width = `${newCanvasWidth}px`;
            canvas.style.height = `${newCanvasHeight}px`;
        }

        window.addEventListener('resize', resizeCanvas);
    