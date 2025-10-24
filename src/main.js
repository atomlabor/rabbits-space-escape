/* rabbits space escape
   optimized for rabbit r1 (240x282), scrolling background and walls, gyro control */

// canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 240;
canvas.height = 282;

// asset loading
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

// wall graphics
const wallImage1 = new Image();
wallImage1.src = 'https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/wall.png';
const wallImage2 = new Image();
wallImage2.src = 'https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/wall2.png';
const wallImage3 = new Image();
wallImage3.src = 'https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/wall3.png';

// background scrolling
let bgPattern = null;
let bgOffsetX = 0;
const bgScrollSpeed = 0.5;
backgroundImage.onload = () => {
  bgPattern = ctx.createPattern(backgroundImage, 'repeat');
};

// sounds
const bgMusic = document.getElementById('game-music');
const swooshSound = new Audio('https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/swoosh.mp3');
const explosionSound = new Audio('https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/explosion.mp3');

// gyro control for rabbit r1
let gyroTilt = 0;
let keyboardTilt = 0;
const MAX_TILT_DEGREE = 20;
const GYRO_SENSITIVITY = 0.5;

// game state
const state = {
  splashScreen: true,
  started: false,
  gameOver: false,
  exploding: false,
  explosionFrame: 0,
  score: 0,
  highScore: Number(localStorage.getItem('rse:highScore') || 0),
};

// player (spaceship)
const player = {
  x: canvas.width / 2 - 15,
  y: canvas.height / 2,
  width: 20,
  height: 20,
  velocityX: 0,
  velocityY: 0,
  gravity: 0.15,
  thrust: -0.5,
  direction: 'right',
};

// arrays for game objects
const carrots = [];
const obstacles = [];

// input handling
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if (state.splashScreen && e.key === ' ') {
    state.splashScreen = false;
    state.started = true;
    bgMusic.play().catch(e => console.log('audio autoplay prevented'));
  }
  // keyboard tilt for desktop testing
  if (e.key === 'ArrowLeft' || e.key === 'a') {
    keyboardTilt = -1;
  }
  if (e.key === 'ArrowRight' || e.key === 'd') {
    keyboardTilt = 1;
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.key] = false;
  // reset keyboard tilt
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'ArrowRight' || e.key === 'd') {
    keyboardTilt = 0;
  }
});

// handle device orientation (gyroscope) for rabbit r1
function handleGyro(event) {
  if (state.splashScreen || state.gameOver) return;
  // gamma is left/right tilt (-90 to 90 degrees)
  let gamma = event.gamma || 0;
  // clamp to max tilt degree
  if (gamma < -MAX_TILT_DEGREE) {
    gamma = -MAX_TILT_DEGREE;
  } else if (gamma > MAX_TILT_DEGREE) {
    gamma = MAX_TILT_DEGREE;
  }
  // normalize to -1 to 1
  gyroTilt = gamma / MAX_TILT_DEGREE;
}

// mouse/touch click for splash and restart
canvas.addEventListener('click', () => {
  if (state.splashScreen) {
    state.splashScreen = false;
    state.started = true;
    bgMusic.play().catch(e => console.log('audio autoplay prevented'));
  } else if (state.gameOver) {
    // restart game on click
    resetGame();
    state.started = true;
  }
});

// spawn carrot
function spawnCarrot() {
  carrots.push({
    x: Math.random() * (canvas.width - 15),
    y: Math.random() * (canvas.height - 15),
    width: 15,
    height: 15,
  });
}

// spawn obstacle with wall graphic and horizontal scroll speed
function spawnObstacle() {
  const width = 20 + Math.random() * 30;
  const height = 20 + Math.random() * 30;
  const walls = [wallImage1, wallImage2, wallImage3];
  const wallImg = walls[Math.floor(Math.random() * 3)];
  obstacles.push({
    x: Math.random() * (canvas.width - width),
    y: Math.random() * (canvas.height - height),
    width,
    height,
    wallImg: wallImg,
    speedX: 0.3 + Math.random() * 0.7  // random speed 0.3-1.0 px/frame
  });
}

// initialize game
for (let i = 0; i < 5; i++) spawnCarrot();
for (let i = 0; i < 3; i++) spawnObstacle();

// update
function update() {
  if (state.splashScreen || state.gameOver) return;
  
  // scroll background
  bgOffsetX = (bgOffsetX + bgScrollSpeed) % (backgroundImage.width || 1024);
  
  // combined tilt from gyro and keyboard
  const totalTilt = gyroTilt + keyboardTilt;
  
  // apply horizontal acceleration based on tilt
  player.velocityX += totalTilt * GYRO_SENSITIVITY;
  
  // update direction based on velocity
  let directionChanged = false;
  if (player.velocityX < -0.1 && player.direction !== 'left') {
    player.direction = 'left';
    directionChanged = true;
  } else if (player.velocityX > 0.1 && player.direction !== 'right') {
    player.direction = 'right';
    directionChanged = true;
  }
  
  // keyboard thrust (up/space)
  if (keys['ArrowUp'] || keys['w'] || keys[' ']) {
    player.velocityY += player.thrust;
  }
  
  // play swoosh on direction change
  if (directionChanged) {
    swooshSound.currentTime = 0;
    swooshSound.play().catch(e => console.log('swoosh blocked'));
  }
  
  // gravity
  player.velocityY += player.gravity;
  
  // apply velocity
  player.x += player.velocityX;
  player.y += player.velocityY;
  
  // friction
  player.velocityX *= 0.98;
  player.velocityY *= 0.98;
  
  // wall collision - explosion
  if (player.x <= 0 || player.x + player.width >= canvas.width ||
      player.y <= 0 || player.y + player.height >= canvas.height) {
    if (!state.exploding) {
      state.exploding = true;
      state.explosionFrame = 0;
      explosionSound.play().catch(e => console.log('explosion blocked'));
      setTimeout(gameOver, 500);
    }
  }
  
  // carrot collection
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
  
  // obstacle collision
  obstacles.forEach(obs => {
    if (player.x < obs.x + obs.width &&
        player.x + player.width > obs.x &&
        player.y < obs.y + obs.height &&
        player.y + player.height > obs.y) {
      if (!state.exploding) {
        state.exploding = true;
        state.explosionFrame = 0;
        explosionSound.play().catch(e => console.log('explosion blocked'));
        setTimeout(gameOver, 500);
      }
    }
  });
  
  // move obstacles left (scrolling walls)
  for (let i = obstacles.length - 1; i >= 0; i--) {
    obstacles[i].x -= obstacles[i].speedX;
    // respawn if obstacle scrolled off screen
    if (obstacles[i].x + obstacles[i].width < 0) {
      obstacles.splice(i, 1);
      spawnObstacle();
    }
  }
}

// draw
function draw() {
  // scrolling background
  if (bgPattern) {
    ctx.save();
    ctx.translate(-bgOffsetX, 0);
    ctx.fillStyle = bgPattern;
    ctx.fillRect(0, 0, canvas.width + backgroundImage.width, canvas.height);
    ctx.restore();
  } else if (backgroundImage.complete) {
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  
  // splash screen
  if (state.splashScreen) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (splashImage.complete) {
      const size = 150;
      ctx.drawImage(splashImage, canvas.width / 2 - size / 2, canvas.height / 2 - size / 2 - 10, size, size);
    }
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('click to start', canvas.width / 2, canvas.height / 2 + 110);
    return;
  }
  
  if (!state.started) return;
  
  // carrots
  carrots.forEach(carrot => {
    if (carrotImage.complete) {
      ctx.drawImage(carrotImage, carrot.x, carrot.y, carrot.width, carrot.height);
    } else {
      ctx.fillStyle = '#ff8800';
      ctx.fillRect(carrot.x, carrot.y, carrot.width, carrot.height);
    }
  });
  
  // obstacles with wall graphics
  obstacles.forEach(obs => {
    if (obs.wallImg && obs.wallImg.complete) {
      ctx.drawImage(obs.wallImg, obs.x, obs.y, obs.width, obs.height);
    } else {
      ctx.fillStyle = '#666';
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    }
  });
  
  // player or explosion
  if (state.exploding) {
    ctx.fillStyle = `rgba(255, ${100 + state.explosionFrame * 30}, 0, ${1 - state.explosionFrame * 0.2})`;
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 10 + state.explosionFrame * 5, 0, Math.PI * 2);
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
  
  // score
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`score: ${state.score}`, 5, 15);
  ctx.fillText(`high: ${state.highScore}`, 5, 30);
  
  // game over
  if (state.gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (gameOverImage.complete) {
      const size = 80;
      ctx.drawImage(gameOverImage, canvas.width / 2 - size / 2, canvas.height / 2 - size / 2 - 40, size, size);
    }
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('game over', canvas.width / 2, canvas.height / 2 + 50);
    ctx.font = '16px Arial';
    ctx.fillText(`score: ${state.score}`, canvas.width / 2, canvas.height / 2 + 75);
    ctx.font = '14px Arial';
    ctx.fillText('click to restart', canvas.width / 2, canvas.height / 2 + 100);
  }
}

// game over
function gameOver() {
  state.gameOver = true;
  if (state.score > state.highScore) {
    state.highScore = state.score;
    localStorage.setItem('rse:highScore', Math.floor(state.highScore));
  }
}

// reset game
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

// game loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// gyroscope event listener for rabbit r1 hardware
window.addEventListener('deviceorientation', handleGyro, true);

gameLoop();
