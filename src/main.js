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

// Game state
const state = {
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
  maxVel: 4.5,
  rockSpawnMs: 850,
  carrotSpawnMs: 1600,
  rockSpeedMin: 1.2,
  rockSpeedMax: 2.8,
  carrotSpeed: 1.6,
};

let gX = 0, gY = 0;

function clamp(v, a, b){return Math.max(a, Math.min(b, v));}

// Device motion (Rabbit R1 tilt)
if (window.DeviceMotionEvent) {
  window.addEventListener('devicemotion', (e) => {
    if (e.accelerationIncludingGravity) {
      // natural tilt: left tilt -> move left
      gX = -e.accelerationIncludingGravity.x * CONFIG.gravityScale;
      gY = e.accelerationIncludingGravity.y * CONFIG.gravityScale;
    }
  });
} else {
  console.log('DeviceMotion not available');
}

// Keyboard fallback (arrow keys)
const keys = new Set();
window.addEventListener('keydown', (e)=>{ keys.add(e.key); });
window.addEventListener('keyup', (e)=>{ keys.delete(e.key); });

function applyInput() {
  let ax = gX, ay = gY;
  if (keys.has('ArrowLeft')) ax -= 0.8;
  if (keys.has('ArrowRight')) ax += 0.8;
  if (keys.has('ArrowUp')) ay -= 0.6;
  if (keys.has('ArrowDown')) ay += 0.6;

  player.vx = clamp((player.vx + ax), -CONFIG.maxVel, CONFIG.maxVel) * CONFIG.damping;
  player.vy = clamp((player.vy + ay), -CONFIG.maxVel, CONFIG.maxVel) * CONFIG.damping;

  player.x += player.vx;
  player.y += player.vy;

  // Bounds
  if (player.x < 0) { player.x = 0; player.vx = 0; }
  if (player.x + player.w > canvas.width) { player.x = canvas.width - player.w; player.vx = 0; }
  if (player.y < 0) { player.y = 0; player.vy = 0; }
  if (player.y + player.h > canvas.height) { player.y = canvas.height - player.h; player.vy = 0; }

  // Facing
  if (player.vx < -0.1) player.facing = 'left';
  else if (player.vx > 0.1) player.facing = 'right';
}

// Spawning
let lastRock = 0, lastCarrot = 0;
function spawnRock() {
  const size = 10 + Math.random()*12;
  const x = Math.random()*(canvas.width - size);
  const speed = CONFIG.rockSpeedMin + Math.random()*(CONFIG.rockSpeedMax-CONFIG.rockSpeedMin);
  rocks.push({x, y: -size, w: size, h: size, vy: speed});
}
function spawnCarrot() {
  const size = 8 + Math.random()*10;
  const x = Math.random()*(canvas.width - size);
  carrots.push({x, y: -size, w: size, h: size, vy: CONFIG.carrotSpeed});
}

// Update world
function update(dt, t){
  if (!state.started || state.gameOver) return;
  applyInput();

  // spawn timers
  if (t - lastRock > CONFIG.rockSpawnMs) { spawnRock(); lastRock = t; }
  if (t - lastCarrot > CONFIG.carrotSpawnMs) { spawnCarrot(); lastCarrot = t; }

  // move rocks
  for (let i=rocks.length-1;i>=0;i--){
    const r = rocks[i];
    r.y += r.vy;
    if (r.y > canvas.height + 20) rocks.splice(i,1);
  }
  // move carrots
  for (let i=carrots.length-1;i>=0;i--){
    const c = carrots[i];
    c.y += c.vy;
    if (c.y > canvas.height + 20) carrots.splice(i,1);
  }

  // collisions
  for (const r of rocks){
    if (rectsOverlap(player, r)) {
      endGame();
      break;
    }
  }
  for (let i=carrots.length-1;i>=0;i--){
    if (rectsOverlap(player, carrots[i])){
      carrots.splice(i,1);
      state.score += 5;
    }
  }

  // passive score by survival
  state.score = Math.max(state.score, Math.floor((t - state.timeStart)/1000));
}

function endGame(){
  state.gameOver = true;
  state.highScore = Math.max(state.highScore, state.score);
  localStorage.setItem('rse:highScore', String(state.highScore));
}

function rectsOverlap(a,b){
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Rendering
function drawBackground(){
  // simple starfield
  ctx.fillStyle = '#030712';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#0ea5e9';
  for (let i=0;i<20;i++){
    const x = (i*13 + (Date.now()/40|0)) % canvas.width;
    const y = (i*23) % canvas.height;
    ctx.fillRect(x, y, 1, 1);
  }
}

function drawPlayer(){
  const img = player.facing === 'left' ? shipLeft : shipRight;
  if (img.complete) {
    ctx.drawImage(img, player.x-2, player.y-2, player.w+4, player.h+4);
  } else {
    // fallback rect while loading
    ctx.fillStyle = '#fff';
    ctx.fillRect(player.x, player.y, player.w, player.h);
  }
}

function drawRocks(){
  ctx.fillStyle = '#9ca3af';
  for (const r of rocks){
    ctx.fillRect(r.x, r.y, r.w, r.h);
  }
}
function drawCarrots(){
  ctx.fillStyle = '#f59e0b';
  for (const c of carrots){
    ctx.fillRect(c.x, c.y, c.w, c.h);
  }
}
function drawHUD(){
  ctx.fillStyle = '#ffffff';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Score: ${state.score}`, 6, 12);
  ctx.fillText(`Best: ${state.highScore}`, 6, 24);

  if (!state.started && !state.aboutOpen){
    ctx.textAlign = 'center';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('Rabbits Space Escape', canvas.width/2, canvas.height/2 - 14);
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText('Tilt to steer. Avoid rocks. Collect carrots.', canvas.width/2, canvas.height/2);
    ctx.fillText('Press Enter to Start • A for About', canvas.width/2, canvas.height/2 + 14);
  }

  if (state.gameOver){
    ctx.textAlign = 'center';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('Game Over', canvas.width/2, canvas.height/2 - 10);
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText(`Score: ${state.score}  Best: ${state.highScore}`, canvas.width/2, canvas.height/2 + 4);
    ctx.fillText('Press Enter to Retry • A for About', canvas.width/2, canvas.height/2 + 18);
  }
}

// About component rendering
function drawAbout(){
  if (!state.aboutOpen) return;
  const pad = 8;
  const w = canvas.width - pad*2;
  const h = canvas.height - pad*2;
  ctx.fillStyle = 'rgba(2,6,23,0.94)';
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
  for (const ln of lines){
    ctx.fillText(ln, pad+10, y);
    y += 14;
  }
  ctx.textAlign = 'center';
  ctx.fillText('Press A to close', canvas.width/2, canvas.height - 12);
}

// Loop
let last = performance.now();
function loop(now){
  const dt = (now - last)/1000;
  last = now;

  drawBackground();
  if (state.started && !state.gameOver) update(dt, now);
  drawRocks();
  drawCarrots();
  drawPlayer();
  drawHUD();
  drawAbout();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Input for start/about
window.addEventListener('keydown', (e)=>{
  if (e.key === 'Enter') {
    if (!state.started || state.gameOver) resetGame();
  } else if (e.key.toLowerCase() === 'a') {
    state.aboutOpen = !state.aboutOpen;
  }
});

// Expose simple start for touch/click
canvas.addEventListener('click', ()=>{
  if (!state.started || state.gameOver) resetGame();
});
