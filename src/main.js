// rabbit's space escape - optimized for rabbit r1
// canvas-only rendering, 240x282, gyro control, scrolling background

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 240;
canvas.height = 282;

// assets - all raw github urls
const assets = {
  shipLeft: new Image(),
  shipRight: new Image(),
  splash: new Image(),
  carrot: new Image(),
  background: new Image(),
  gameOver: new Image()
};

const baseUrl = 'https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/';
assets.shipLeft.src = baseUrl + 'spaceship-left.png';
assets.shipRight.src = baseUrl + 'spaceship-right.png';
assets.splash.src = baseUrl + 'rabbit.png';
assets.carrot.src = baseUrl + 'carrot-1.png';
assets.background.src = baseUrl + 'background.jpg';
assets.gameOver.src = baseUrl + 'spacecraft.gif';

// sounds
const bgMusic = document.getElementById('game-music');
const swooshSound = new Audio(baseUrl + 'swoosh.mp3');
const explosionSound = new Audio(baseUrl + 'explosion.mp3');

// game state
const state = {
  splash: true,
  started: false,
  gameOver: false,
  exploding: false,
  explosionFrame: 0,
  score: 0,
  highScore: Number(localStorage.getItem('rse:hs') || 0),
  bgOffset: 0
};

// player
const player = {
  x: canvas.width / 2 - 10,
  y: canvas.height / 2,
  w: 20,
  h: 20,
  vx: 0,
  vy: 0,
  gravity: 0.15,
  thrust: -0.5,
  dir: 'right'
};

// gyro data
let gyroX = 0;
let gyroY = 0;

// arrays
const carrots = [];
const obstacles = [];

// gyro permission and handling
if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
  // ios 13+ needs permission
  canvas.addEventListener('click', () => {
    if (state.splash) {
      DeviceOrientationEvent.requestPermission()
        .then(permissionState => {
          if (permissionState === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation, true);
          }
        });
      startGame();
    }
  });
} else if ('ondeviceorientation' in window) {
  // android and other devices
  window.addEventListener('deviceorientation', handleOrientation, true);
  canvas.addEventListener('click', () => { if (state.splash) startGame(); });
} else {
  // fallback keyboard
  window.addEventListener('keydown', (e) => {
    if (state.splash && e.key === ' ') startGame();
    if (e.key === 'ArrowLeft' || e.key === 'a') gyroX = -30;
    if (e.key === 'ArrowRight' || e.key === 'd') gyroX = 30;
    if (e.key === 'ArrowUp' || e.key === ' ') gyroY = 30;
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'a' || e.key === 'd') gyroX = 0;
    if (e.key === 'ArrowUp' || e.key === ' ') gyroY = 0;
  });
  canvas.addEventListener('click', () => { if (state.splash) startGame(); });
}

function handleOrientation(event) {
  // beta: front-back tilt (-180 to 180)
  // gamma: left-right tilt (-90 to 90)
  gyroX = event.gamma || 0; // -90 to 90 (left/right)
  gyroY = event.beta || 0;  // -180 to 180 (forward/back)
}

function startGame() {
  state.splash = false;
  state.started = true;
  bgMusic.play().catch(() => {});
}

// spawn functions
function spawnCarrot() {
  carrots.push({
    x: Math.random() * (canvas.width - 15),
    y: Math.random() * (canvas.height - 15),
    w: 15,
    h: 15
  });
}

function spawnObstacle() {
  const w = 20 + Math.random() * 30;
  const h = 20 + Math.random() * 30;
  obstacles.push({
    x: Math.random() * (canvas.width - w),
    y: Math.random() * (canvas.height - h),
    w, h
  });
}

// init
for (let i = 0; i < 4; i++) spawnCarrot();
for (let i = 0; i < 3; i++) spawnObstacle();

// update
function update() {
  if (state.splash || state.gameOver) return;
  
  // gyro-based movement
  let oldDir = player.dir;
  
  if (gyroX < -15) {
    player.vx -= 0.25;
    player.dir = 'left';
  } else if (gyroX > 15) {
    player.vx += 0.25;
    player.dir = 'right';
  }
  
  if (gyroY > 30) {
    player.vy += player.thrust;
  }
  
  // swoosh on direction change
  if (oldDir !== player.dir) {
    swooshSound.currentTime = 0;
    swooshSound.play().catch(() => {});
  }
  
  // physics
  player.vy += player.gravity;
  player.x += player.vx;
  player.y += player.vy;
  player.vx *= 0.98;
  player.vy *= 0.98;
  
  // wall collision = explosion
  if (player.x <= 0 || player.x + player.w >= canvas.width ||
      player.y <= 0 || player.y + player.h >= canvas.height) {
    if (!state.exploding) explode();
  }
  
  // carrot collision
  carrots.forEach((c, i) => {
    if (player.x < c.x + c.w && player.x + player.w > c.x &&
        player.y < c.y + c.h && player.y + player.h > c.y) {
      carrots.splice(i, 1);
      state.score += 100;
      spawnCarrot();
    }
  });
  
  // obstacle collision
  obstacles.forEach(o => {
    if (player.x < o.x + o.w && player.x + player.w > o.x &&
        player.y < o.y + o.h && player.y + player.h > o.y) {
      if (!state.exploding) explode();
    }
  });
  
  // background scroll
  state.bgOffset = (state.bgOffset + 0.5) % canvas.width;
}

function explode() {
  state.exploding = true;
  state.explosionFrame = 0;
  explosionSound.play().catch(() => {});
  setTimeout(() => {
    state.gameOver = true;
    if (state.score > state.highScore) {
      state.highScore = state.score;
      localStorage.setItem('rse:hs', state.highScore);
    }
  }, 500);
}

// draw
function draw() {
  // scrolling background (only in viewport)
  if (assets.background.complete) {
    const bgW = canvas.width;
    const bgH = canvas.height;
    ctx.drawImage(assets.background, -state.bgOffset, 0, bgW, bgH);
    ctx.drawImage(assets.background, bgW - state.bgOffset, 0, bgW, bgH);
  } else {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  
  // splash screen
  if (state.splash) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (assets.splash.complete) {
      const s = 120;
      ctx.drawImage(assets.splash, canvas.width / 2 - s / 2, 40, s, s);
    }
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText("rabbit's space escape", canvas.width / 2, 180);
    ctx.font = '12px Arial';
    ctx.fillText('tap or tilt to play', canvas.width / 2, 210);
    return;
  }
  
  if (!state.started) return;
  
  // carrots
  carrots.forEach(c => {
    if (assets.carrot.complete) {
      ctx.drawImage(assets.carrot, c.x, c.y, c.w, c.h);
    } else {
      ctx.fillStyle = '#f80';
      ctx.fillRect(c.x, c.y, c.w, c.h);
    }
  });
  
  // obstacles
  ctx.fillStyle = '#666';
  obstacles.forEach(o => ctx.fillRect(o.x, o.y, o.w, o.h));
  
  // player or explosion
  if (state.exploding) {
    ctx.fillStyle = `rgba(255, ${100 + state.explosionFrame * 30}, 0, ${1 - state.explosionFrame * 0.2})`;
    ctx.beginPath();
    ctx.arc(player.x + player.w / 2, player.y + player.h / 2, 15 + state.explosionFrame * 8, 0, Math.PI * 2);
    ctx.fill();
    state.explosionFrame++;
  } else {
    const ship = player.dir === 'left' ? assets.shipLeft : assets.shipRight;
    if (ship.complete) {
      ctx.drawImage(ship, player.x, player.y, player.w, player.h);
    } else {
      ctx.fillStyle = '#0ff';
      ctx.fillRect(player.x, player.y, player.w, player.h);
    }
  }
  
  // score
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`score: ${state.score}`, 8, 20);
  ctx.fillText(`high: ${state.highScore}`, 8, 35);
  
  // game over
  if (state.gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (assets.gameOver.complete) {
      const s = 80;
      ctx.drawImage(assets.gameOver, canvas.width / 2 - s / 2, 60, s, s);
    }
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('game over', canvas.width / 2, 170);
    ctx.font = '16px Arial';
    ctx.fillText(`score: ${state.score}`, canvas.width / 2, 200);
    ctx.font = '12px Arial';
    ctx.fillText('refresh to restart', canvas.width / 2, 230);
  }
}

// game loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
