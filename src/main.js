/* Rabbits Space Escape - Complete Game
   Optimized for Rabbit R1 (240x282), no placeholders. */
// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 240; // Rabbit R1 width
canvas.height = 282; // Rabbit R1 height

// Asset loading
const shipLeft = new Image();
shipLeft.src = '/assets/spaceship-left.png';
const shipRight = new Image();
shipRight.src = '/assets/spaceship-right.png';
const splashImage = new Image();
splashImage.src = '/assets/rabbit.png';

// Game state
const state = {
  splashScreen: true,
  started: false,
  gameOver: false,
  score: 0,
  highScore: Number(localStorage.getItem('rse:highScore') || 0),
  timeStart: 0,
  aboutOpen: false,
};

// Player (spaceship)
const player = {
  x: canvas.width / 2 - 10,
  y: canvas.height - 40,
  w: 20,
  h: 20,
  vx: 0,
  vy: 0,
  facing: 'right', // 'left' | 'right'
};

// Obstacles and collectibles
const rocks = [];
const carrots = [];

function resetGame() {
  state.splashScreen = false;
  state.started = true;
  state.gameOver = false;
  state.score = 0;
  state.timeStart = performance.now();
  player.x = canvas.width / 2 - player.w / 2;
  player.y = canvas.height - 40;
  player.vx = 0;
  player.vy = 0;
  player.facing = 'right';
  rocks.length = 0;
  carrots.length = 0;
}

// Physics
const CONFIG = {
  gravityScale: 0.45,
  damping: 0.96,
  rockSpeed: 50,
  carrotSpeed: 60,
  spawnInterval: 1.5,
  carrotChance: 0.25,
  tiltSensitivity: 8,
  maxSpeed: 120,
};

let spawnTimer = 0;

function update(dt, now) {
  const elapsed = (now - state.timeStart) / 1000;
  const difficultyScale = 1 + elapsed * 0.05;
  const gravity = CONFIG.gravityScale * difficultyScale;
  player.vy += gravity;
  // Tilt input
  if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function') {
    window.addEventListener('deviceorientation', (e) => {
      const gamma = e.gamma || 0;
      player.vx = (gamma / 90) * CONFIG.tiltSensitivity * CONFIG.maxSpeed;
    });
  }
  // Keyboard
  const keys = {};
  window.addEventListener('keydown', (e) => { keys[e.key] = true; });
  window.addEventListener('keyup', (e) => { keys[e.key] = false; });
  if (keys['ArrowLeft']) player.vx = -CONFIG.maxSpeed;
  if (keys['ArrowRight']) player.vx = CONFIG.maxSpeed;
  if (keys['ArrowUp']) player.vy = -CONFIG.maxSpeed;
  if (keys['ArrowDown']) player.vy = CONFIG.maxSpeed;
  // Damping
  player.vx *= CONFIG.damping;
  player.vy *= CONFIG.damping;
  // Update position
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  // Update facing
  if (player.vx < -1) player.facing = 'left';
  else if (player.vx > 1) player.facing = 'right';
  // Bounds
  if (player.x < 0) player.x = 0;
  if (player.x + player.w > canvas.width) player.x = canvas.width - player.w;
  if (player.y < 0) player.y = 0;
  if (player.y + player.h > canvas.height) player.y = canvas.height - player.h;
  // Spawn logic
  spawnTimer += dt;
  if (spawnTimer >= CONFIG.spawnInterval / difficultyScale) {
    spawnTimer = 0;
    if (Math.random() < CONFIG.carrotChance) {
      carrots.push({ x: Math.random() * (canvas.width - 15), y: -15, w: 15, h: 15 });
    } else {
      rocks.push({ x: Math.random() * (canvas.width - 20), y: -20, w: 20, h: 20 });
    }
  }
  // Update rocks
  for (let i = rocks.length - 1; i >= 0; i--) {
    rocks[i].y += CONFIG.rockSpeed * difficultyScale * dt;
    if (rocks[i].y > canvas.height) {
      rocks.splice(i, 1);
      continue;
    }
    if (
      player.x < rocks[i].x + rocks[i].w &&
      player.x + player.w > rocks[i].x &&
      player.y < rocks[i].y + rocks[i].h &&
      player.y + player.h > rocks[i].y
    ) {
      state.gameOver = true;
      if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('rse:highScore', state.highScore);
      }
    }
  }
  // Update carrots
  for (let i = carrots.length - 1; i >= 0; i--) {
    carrots[i].y += CONFIG.carrotSpeed * difficultyScale * dt;
    if (carrots[i].y > canvas.height) {
      carrots.splice(i, 1);
      continue;
    }
    if (
      player.x < carrots[i].x + carrots[i].w &&
      player.x + player.w > carrots[i].x &&
      player.y < carrots[i].y + carrots[i].h &&
      player.y + player.h > carrots[i].y
    ) {
      state.score += 10;
      carrots.splice(i, 1);
    }
  }
}

// Drawing
function drawBackground() {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawPlayer() {
  const img = player.facing === 'left' ? shipLeft : shipRight;
  if (img.complete) {
    ctx.drawImage(img, player.x, player.y, player.w, player.h);
  } else {
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(player.x, player.y, player.w, player.h);
  }
}

function drawRocks() {
  ctx.fillStyle = '#64748b';
  for (const r of rocks) {
    ctx.fillRect(r.x, r.y, r.w, r.h);
  }
}

function drawCarrots() {
  ctx.fillStyle = '#fb923c';
  for (const c of carrots) {
    ctx.fillRect(c.x, c.y, c.w, c.h);
  }
}

function drawHUD() {
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Score: ${state.score}`, 8, 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Best: ${state.highScore}`, canvas.width - 8, 20);
  if (!state.started && !state.splashScreen) {
    ctx.textAlign = 'center';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('Rabbits Space Escape', canvas.width / 2, canvas.height / 2 - 30);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('Press Enter or tap to start', canvas.width / 2, canvas.height / 2);
    ctx.fillText('Press A for about', canvas.width / 2, canvas.height / 2 + 20);
  }
  if (state.gameOver) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, canvas.height / 2 - 50, canvas.width, 100);
    ctx.fillStyle = '#ef4444';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`Score: ${state.score}`, canvas.width / 2, canvas.height / 2 + 5);
    ctx.fillText('Press Enter or tap to retry', canvas.width / 2, canvas.height / 2 + 25);
  }
}

function drawSplashScreen() {
  if (!state.splashScreen) return;
  // Fill background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Draw splash image centered and scaled to fit
  if (splashImage.complete) {
    const imgAspect = splashImage.width / splashImage.height;
    const canvasAspect = canvas.width / canvas.height;
    let drawWidth, drawHeight, drawX, drawY;
    if (imgAspect > canvasAspect) {
      drawWidth = canvas.width;
      drawHeight = canvas.width / imgAspect;
      drawX = 0;
      drawY = (canvas.height - drawHeight) / 2;
    } else {
      drawHeight = canvas.height;
      drawWidth = canvas.height * imgAspect;
      drawX = (canvas.width - drawWidth) / 2;
      drawY = 0;
    }
    ctx.drawImage(splashImage, drawX, drawY, drawWidth, drawHeight);
  }
  // Instruction text
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Click or press Enter to start', canvas.width / 2, canvas.height - 20);
}

function drawAbout() {
  if (!state.aboutOpen) return;
  const pad = 10;
  const w = canvas.width - 2 * pad;
  const h = canvas.height - 2 * pad;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.fillRect(pad, pad, w, h);
  ctx.strokeStyle = '#38bdf8';
  ctx.strokeRect(pad+0.5, pad+0.5, w-1, h-1);
  ctx.fillStyle = '#e2e8f0';
  ctx.textAlign = 'left';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('About Rabbits Space Escape', pad+10, pad+20);
  ctx.font = '10px system-ui, sans-serif';
  const lines = [
    'Steer the spaceship rabbit through space.',
    'Tilt your Rabbit R1 or use arrow keys.',
    'Avoid gray asteroids, collect orange carrots',
    'to increase your score. Survive to climb the best.',
    '',
    'Controls:',
    ' - Tilt device or Arrow Keys to move',
    ' - Enter: Start/Retry',
    ' - A: Toggle About',
    ' - M: Mute (not used yet)',
  ];
  let y = pad+38;
  for (const ln of lines) {
    ctx.fillText(ln, pad+10, y);
    y += 14;
  }
  ctx.textAlign = 'center';
  ctx.fillText('Press A to close', canvas.width/2, canvas.height - 12);
}

// Loop
let last = performance.now();
function loop(now) {
  const dt = (now - last)/1000;
  last = now;
  if (state.splashScreen) {
    drawSplashScreen();
  } else {
    drawBackground();
    if (state.started && !state.gameOver) update(dt, now);
    drawRocks();
    drawCarrots();
    drawPlayer();
    drawHUD();
    drawAbout();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Input for start/about
window.addEventListener('keydown', (e)=>{
  if (e.key === 'Enter') {
    if (state.splashScreen || !state.started || state.gameOver) resetGame();
  } else if (e.key.toLowerCase() === 'a') {
    state.aboutOpen = !state.aboutOpen;
  }
});

// Expose simple start for touch/click
canvas.addEventListener('click', ()=>{
  if (state.splashScreen || !state.started || state.gameOver) resetGame();
});
