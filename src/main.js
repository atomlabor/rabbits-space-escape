/* Rabbits Space Escape - Complete Game
   Optimized for Rabbit R1 (1024x768), no placeholders */

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 1024;
canvas.height = 768;

// Asset loading
const shipLeft = new Image();
shipLeft.src = 'https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/spaceship-left.png';
const shipRight = new Image();
shipRight.src = 'https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/spaceship-right.png';
const splashImage = new Image();
splashImage.src = 'https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/rabbit.png';
const carrotImage = new Image();
carrotImage.src = 'https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/carrot-1.png';
const backgroundImage = new Image();
backgroundImage.src = 'https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/background.jpg';
const gameOverImage = new Image();
gameOverImage.src = 'https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/spacecraft.gif';

// Sounds
const bgMusic = document.getElementById('game-music');
const swooshSound = new Audio('https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/swoosh.mp3');
const explosionSound = new Audio('https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/explosion.mp3');

// Game state
const state = {
  splashScreen: true,
  started: false,
  gameOver: false,
  exploding: false,
  explosionFrame: 0,
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
  
  if (state.splashScreen && e.key === ' ') {
    state.splashScreen = false;
    state.started = true;
    bgMusic.play().catch(e => console.log('Audio autoplay prevented'));
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

// Mouse click for splash
canvas.addEventListener('click', () => {
  if (state.splashScreen) {
    state.splashScreen = false;
    state.started = true;
    bgMusic.play().catch(e => console.log('Audio autoplay prevented'));
  }
});

// Spawn carrot
function spawnCarrot() {
  carrots.push({
    x: Math.random() * (canvas.width - 20),
    y: Math.random() * (canvas.height - 20),
    width: 20,
    height: 20,
  });
}

// Spawn obstacle
function spawnObstacle() {
  const width = 30 + Math.random() * 50;
  const height = 30 + Math.random() * 50;
  obstacles.push({
    x: Math.random() * (canvas.width - width),
    y: Math.random() * (canvas.height - height),
    width,
    height,
  });
}

// Initialize game
for (let i = 0; i < 5; i++) spawnCarrot();
for (let i = 0; i < 3; i++) spawnObstacle();

// Update
function update() {
  if (state.splashScreen || state.gameOver) return;
  
  // Movement and direction change
  let directionChanged = false;
  if (keys['ArrowLeft'] || keys['a']) {
    player.velocityX -= 0.3;
    if (player.direction !== 'left') {
      player.direction = 'left';
      directionChanged = true;
    }
  }
  if (keys['ArrowRight'] || keys['d']) {
    player.velocityX += 0.3;
    if (player.direction !== 'right') {
      player.direction = 'right';
      directionChanged = true;
    }
  }
  if (keys['ArrowUp'] || keys['w'] || keys[' ']) {
    player.velocityY += player.thrust;
  }
  
  // Play swoosh on direction change
  if (directionChanged) {
    swooshSound.currentTime = 0;
    swooshSound.play().catch(e => console.log('Swoosh blocked'));
  }
  
  // Gravity
  player.velocityY += player.gravity;
  
  // Apply velocity
  player.x += player.velocityX;
  player.y += player.velocityY;
  
  // Friction
  player.velocityX *= 0.98;
  player.velocityY *= 0.98;
  
  // Wall collision - EXPLOSION
  if (player.x <= 0 || player.x + player.width >= canvas.width ||
      player.y <= 0 || player.y + player.height >= canvas.height) {
    if (!state.exploding) {
      state.exploding = true;
      state.explosionFrame = 0;
      explosionSound.play().catch(e => console.log('Explosion blocked'));
      setTimeout(gameOver, 500);
    }
  }
  
  // Carrot collection
  carrots.forEach((carrot, i) => {
    if (player.x < carrot.x + carrot.width &&
        player.x + player.width > carrot.x &&
        player.y < carrot.y + carrot.height &&
        player.y + player.height > carrot.y) {
      carrots.splice(i, 1);
      state.score += 100;
      spawnCarrot();
    }
  });
  
  // Obstacle collision
  obstacles.forEach(obs => {
    if (player.x < obs.x + obs.width &&
        player.x + player.width > obs.x &&
        player.y < obs.y + obs.height &&
        player.y + player.height > obs.y) {
      if (!state.exploding) {
        state.exploding = true;
        state.explosionFrame = 0;
        explosionSound.play().catch(e => console.log('Explosion blocked'));
        setTimeout(gameOver, 500);
      }
    }
  });
}

// Draw
function draw() {
  // Background
  if (backgroundImage.complete) {
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  
  // Splash screen
  if (state.splashScreen) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (splashImage.complete) {
      const size = 300;
      ctx.drawImage(splashImage, 
        canvas.width / 2 - size / 2, 
        canvas.height / 2 - size / 2 - 50, 
        size, size);
    }
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText("Rabbit's Space Escape", canvas.width / 2, canvas.height / 2 + 200);
    ctx.font = '24px Arial';
    ctx.fillText('Klick oder Leertaste zum Starten', canvas.width / 2, canvas.height / 2 + 250);
    return;
  }
  
  if (!state.started) return;
  
  // Carrots
  carrots.forEach(carrot => {
    if (carrotImage.complete) {
      ctx.drawImage(carrotImage, carrot.x, carrot.y, carrot.width, carrot.height);
    } else {
      ctx.fillStyle = '#ff8800';
      ctx.fillRect(carrot.x, carrot.y, carrot.width, carrot.height);
    }
  });
  
  // Obstacles
  ctx.fillStyle = '#666';
  obstacles.forEach(obs => {
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
  });
  
  // Player or explosion
  if (state.exploding) {
    // Simple explosion effect
    ctx.fillStyle = `rgba(255, ${100 + state.explosionFrame * 30}, 0, ${1 - state.explosionFrame * 0.2})`;
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 20 + state.explosionFrame * 10, 0, Math.PI * 2);
    ctx.fill();
    state.explosionFrame++;
  } else {
    const shipImg = player.direction === 'left' ? shipLeft : shipRight;
    if (shipImg.complete) {
      ctx.drawImage(shipImg, player.x, player.y, player.width, player.height);
    } else {
      ctx.fillStyle = '#0ff';
      ctx.fillRect(player.x, player.y, player.width, player.height);
    }
  }
  
  // Score
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`Score: ${state.score}`, 20, 40);
  ctx.fillText(`High: ${state.highScore}`, 20, 70);
  
  // Game over
  if (state.gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (gameOverImage.complete) {
      const size = 200;
      ctx.drawImage(gameOverImage,
        canvas.width / 2 - size / 2,
        canvas.height / 2 - size / 2 - 80,
        size, size);
    }
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 + 100);
    ctx.font = '32px Arial';
    ctx.fillText(`Score: ${state.score}`, canvas.width / 2, canvas.height / 2 + 150);
    ctx.font = '24px Arial';
    ctx.fillText('F5 zum Neustarten', canvas.width / 2, canvas.height / 2 + 200);
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
  state.exploding = false;
  state.explosionFrame = 0;
  state.score = 0;
  player.x = canvas.width / 2 - 15;
  player.y = canvas.height / 2;
  player.velocityX = 0;
  player.velocityY = 0;
  player.direction = 'right';
  carrots.length = 0;
  obstacles.length = 0;
  for (let i = 0; i < 5; i++) spawnCarrot();
  for (let i = 0; i < 3; i++) spawnObstacle();
}

// Game loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
