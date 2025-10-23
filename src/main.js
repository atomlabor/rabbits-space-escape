/* Rabbits Space Escape - Complete Game
   Optimized for Rabbit R1 (240x282), no placeholders */

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 240;
canvas.height = 282;

// Asset loading
const shipLeft = new Image();
shipLeft.src = 'https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/spaceship-left.png
const shipRight = new Image();
shipRight.src = ./assets/spaceship-right.png
const splashImage = new Image();
splashImage.src = ./assets/rabbit.png
const carrotImage = new Image();
carrotImage.src = ./assets/carrot-1.png
const backgroundImage = new Image();
backgroundImage.src = ./assets/background.jpg
const gameOverImage = new Image();
gameOverImage.src = 'https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/spacecraft.gif';

// Background music
const bgMusic = new Audio();
bgMusic.src = ./assets/rabbit_pixel_dust.mp3
bgMusic.loop = true;
bgMusic.volume = 0.5;

// Game state
const state = {
  splashScreen: true,
  started: false,
  gameOver: false,
  score: 0,
  highScore: Number(localStorage.getItem('rse:highScore') || 0),
};

// Player (spaceship)
const player = {
  x: canvas.width / 2 - 15,
  y: canvas.height / 2,
  width: 30,
  height: 30,
  velocityX: 0,
  velocityY: 0,
  gravity: 0.15,
  thrust: -0.5,
  direction: 'right',
};

// Arrays for game objects
const carrots = [];
const obstacles = [];

// Input handling
const keys = {};

window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  
  // Start game on any key during splash
  if (state.splashScreen) {
    state.splashScreen = false;
    state.started = true;
         bgMusic.play().catch(e => console.log('Audio autoplay prevented'));
  }
  
  // Restart on Enter after game over
  if (state.gameOver && e.key === 'Enter') {
    resetGame();
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

// Mouse/Touch for splash screen
canvas.addEventListener('click', () => {
  if (state.splashScreen) {
    state.splashScreen = false;
    state.started = true;
  
          bgMusic.play().catch(e => console.log('Audio autoplay prevented'));}
});

// Generate carrots
function spawnCarrot() {
  if (Math.random() < 0.02) {
    carrots.push({
      x: canvas.width,
      y: Math.random() * (canvas.height - 20),
      width: 20,
      height: 20,
      speed: 2,
    });
  }
}

// Generate obstacles
function spawnObstacle() {
  if (Math.random() < 0.015) {
    const height = 30 + Math.random() * 40;
    obstacles.push({
      x: canvas.width,
      y: Math.random() * (canvas.height - height),
      width: 25,
      height: height,
      speed: 2.5,
    });
  }
}

// Collision detection
function checkCollision(obj1, obj2) {
  return (
    obj1.x < obj2.x + obj2.width &&
    obj1.x + obj1.width > obj2.x &&
    obj1.y < obj2.y + obj2.height &&
    obj1.y + obj1.height > obj2.y
  );
}

// Update game state
function update() {
  if (state.splashScreen || state.gameOver) return;

  // Player movement
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
    player.velocityX = -3;
    player.direction = 'left';
  } else if (keys['ArrowRight'] || keys['d'] || keys['D']) {
    player.velocityX = 3;
    player.direction = 'right';
  } else {
    player.velocityX *= 0.9;
  }

  // Thrust (up movement)
  if (keys['ArrowUp'] || keys['w'] || keys['W'] || keys[' ']) {
    player.velocityY += player.thrust;
  }

  // Apply gravity
  player.velocityY += player.gravity;

  // Update position
  player.x += player.velocityX;
  player.y += player.velocityY;

  // Boundary checks
  if (player.x < 0) player.x = 0;
  if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
  if (player.y < 0) player.y = 0;
  if (player.y + player.height > canvas.height) {
    player.y = canvas.height - player.height;
    player.velocityY = 0;
  }

  // Spawn and update carrots
  spawnCarrot();
  for (let i = carrots.length - 1; i >= 0; i--) {
    carrots[i].x -= carrots[i].speed;

    // Check collision with player
    if (checkCollision(player, carrots[i])) {
      state.score += 100;
      carrots.splice(i, 1);
      continue;
    }

    // Remove off-screen carrots
    if (carrots[i].x + carrots[i].width < 0) {
      carrots.splice(i, 1);
    }
  }

  // Spawn and update obstacles
  spawnObstacle();
  for (let i = obstacles.length - 1; i >= 0; i--) {
    obstacles[i].x -= obstacles[i].speed;

    // Check collision with player
    if (checkCollision(player, obstacles[i])) {
      gameOver();
      return;
    }

    // Remove off-screen obstacles
    if (obstacles[i].x + obstacles[i].width < 0) {
      obstacles.splice(i, 1);
    }
  }

  // Increment score over time
  state.score += 0.1;
}

// Draw everything
function draw() {
  // Clear canvas
  // Draw background
  if (backgroundImage.complete) {
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
  }

  // Splash screen
  if (state.splashScreen) {
    if (splashImage.complete) {
      const scale = Math.min(canvas.width / splashImage.width, canvas.height / splashImage.height) * 0.8;
      const w = splashImage.width * scale;
      const h = splashImage.height * scale;
      ctx.drawImage(splashImage, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    }
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Click or press any key to start', canvas.width / 2, canvas.height - 30);
    return;
  }

  // Draw player (spaceship)
  const shipImage = player.direction === 'left' ? shipLeft : shipRight;
  if (shipImage.complete) {
    ctx.drawImage(shipImage, player.x, player.y, player.width, player.height);
  } else {
    ctx.fillStyle = '#0f0';
    ctx.fillRect(player.x, player.y, player.width, player.height);
  }

  // Draw carrots
  carrots.forEach((carrot) => {
    if (carrotImage.complete) {
      ctx.drawImage(carrotImage, carrot.x, carrot.y, carrot.width, carrot.height);
    } else {
      ctx.fillStyle = '#ff8800';
      ctx.fillRect(carrot.x, carrot.y, carrot.width, carrot.height);
    }
  });

  // Draw obstacles
  ctx.fillStyle = '#f00';
  obstacles.forEach((obstacle) => {
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  });

  // Draw score
  ctx.fillStyle = '#fff';
  ctx.font = '16px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`Score: ${Math.floor(state.score)}`, 10, 25);
  ctx.fillText(`High: ${Math.floor(state.highScore)}`, 10, 45);

  // Game over screen
  if (state.gameOver) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
         // Draw game over image
    if (gameOverImage.complete) {
      const scale = Math.min(canvas.width / gameOverImage.width, canvas.height / gameOverImage.height) * 0.5;
      const w = gameOverImage.width * scale;
      const h = gameOverImage.height * scale;
      ctx.drawImage(gameOverImage, (canvas.width - w) / 2, (canvas.height - h) / 2 - 30, w, h);
    }
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 30);
    ctx.font = '16px Arial';
    ctx.fillText(`Final Score: ${Math.floor(state.score)}`, canvas.width / 2, canvas.height / 2);
    ctx.fillText(`High Score: ${Math.floor(state.highScore)}`, canvas.width / 2, canvas.height / 2 + 25);
    ctx.fillText('Press ENTER to restart', canvas.width / 2, canvas.height / 2 + 55);
  }
}

// Game over
function gameOver() {
  state.gameOver = true;
  if (state.score > state.highScore) {
    state.highScore = state.score;
    localStorage.setItem('rse:highScore', Math.floor(state.highScore));
  }
}

// Reset game
function resetGame() {
  state.gameOver = false;
  state.score = 0;
  player.x = canvas.width / 2 - 15;
  player.y = canvas.height / 2;
  player.velocityX = 0;
  player.velocityY = 0;
  player.direction = 'right';
  carrots.length = 0;
  obstacles.length = 0;
}

// Game loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Start game
gameLoop();
