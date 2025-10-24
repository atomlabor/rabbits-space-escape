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
const spawnFlashes = [];


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
const bgScrollSpeed = 0.15;
backgroundImage.onload = () => {
  bgPattern = ctx.createPattern(backgroundImage, 'repeat');
};

// sounds
const bgMusic = document.getElementById('game-music');
const swooshSound = new Audio('https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/swoosh.mp3');
const explosionSound = new Audio('https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/explosion.mp3');

// -------- Gyro-Konfiguration zweiachsig --------
const MAX_TILT_DEGREE = 6;          // Neigungsbereich pro Achse
let   DEADZONE = 0.06;              // kleine Wackler filtern
let   SMOOTHING = 0.15;             // 0..1, höher reagiert schneller
const GYRO_SENSITIVITY_X = 0.18;    // Einfluss auf horizontale Beschleunigung
const GYRO_SENSITIVITY_Y = 0.18;    // feiner Einfluss auf vertikale Beschleunigung

// Gyro-Zustände
let gyro = { x: 0, y: 0 };          // geglättete Werte -1..1
let target = { x: 0, y: 0 };        // unglättete Zielwerte -1..1
let neutral = { beta: 0, gamma: 0 };// Kalibrier-Offset
let lastRaw = { beta: 0, gamma: 0, alpha: 0 };

// Hilfsfunktionen
const clamp = (v, max) => Math.max(-max, Math.min(max, v));
const applyDeadzone = v => (Math.abs(v) < DEADZONE ? 0 : v);

function adjustForScreenOrientation(beta, gamma) {
  const angle = screen.orientation?.angle ?? window.orientation ?? 0;
  switch (angle) {
    case 0:   return { beta, gamma };                         // Portrait
    case 90:  return { beta: -gamma, gamma: beta };           // Landscape links
    case -90:
    case 270: return { beta: gamma, gamma: -beta };           // Landscape rechts
    case 180: return { beta: -beta, gamma: -gamma };          // Portrait invertiert
    default:  return { beta, gamma };
  }
}

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
  width: 40,
  height: 40,
  velocityX: 0,
  velocityY: 0,
  gravity: 0.025,
  thrust: -0.5,
  direction: 'right',
};

// arrays for game objects
const carrots = [];
const obstacles = [];

// input handling
const keys = {};
let keyboardTilt = 0; // horizontaler Test-Tilt
window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if (state.splashScreen && e.key === ' ') {
    startGameWithGyro();
  }
  // keyboard tilt für Desktop
  if (e.key === 'ArrowLeft' || e.key === 'a') keyboardTilt = -1;
  if (e.key === 'ArrowRight' || e.key === 'd') keyboardTilt =  1;
});

window.addEventListener('keyup', (e) => {
  keys[e.key] = false;
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'ArrowRight' || e.key === 'd') {
    keyboardTilt = 0;
  }
});

// handle device orientation
function handleGyro(event) {
  // Rohwerte immer aktualisieren, damit Kalibrierung auch am Splash sauber ist
  lastRaw.beta  = event.beta  ?? 0; // vor zurück
  lastRaw.gamma = event.gamma ?? 0; // links rechts
  lastRaw.alpha = event.alpha ?? 0;

  // Nur während laufendem Spiel auf Eingabe mappen
  if (state.gameOver) return;

  let { beta, gamma } = adjustForScreenOrientation(lastRaw.beta, lastRaw.gamma);

  // Neutralhaltung abziehen
  beta  -= neutral.beta;
  gamma -= neutral.gamma;

  // begrenzen und normalisieren
  const nx = clamp(gamma, MAX_TILT_DEGREE) / MAX_TILT_DEGREE; // X links rechts
  const ny = clamp(beta,  MAX_TILT_DEGREE) / MAX_TILT_DEGREE; // Y vor zurück

  // Ziel setzen
  target.x = nx;
  target.y = ny;

  // Glätten
  gyro.x += (target.x - gyro.x) * SMOOTHING;
  gyro.y += (target.y - gyro.y) * SMOOTHING;

  // Deadzone
  gyro.x = applyDeadzone(gyro.x);
  gyro.y = applyDeadzone(gyro.y);
}

// iOS Permission und Listener
async function enableGyro() {
  if (typeof DeviceOrientationEvent === 'undefined') {
    console.warn('DeviceOrientation nicht verfügbar');
    return false;
  }
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const perm = await DeviceOrientationEvent.requestPermission();
      if (perm !== 'granted') return false;
    } catch {
      return false;
    }
  }
  window.addEventListener('deviceorientation', handleGyro, { passive: true });
  return true;
}

function calibrateNeutral() {
  neutral.beta  = lastRaw.beta  ?? 0;
  neutral.gamma = lastRaw.gamma ?? 0;
}

async function startGameWithGyro() {
  state.splashScreen = false;
  state.started = true;
  try { await screen.orientation?.lock?.('landscape'); } catch {}
  const ok = await enableGyro();
  calibrateNeutral();
  bgMusic?.play().catch(e => console.log('audio autoplay prevented'));
  if (!ok) {
    // Spiel läuft trotzdem weiter, nur ohne Gyro
    console.warn('Gyro nicht aktiviert. Steuerung per Tastatur verfügbar.');
  }
}

window.addEventListener('orientationchange', () => {
  // kleine Neu-Kalibrierung nach Rotationswechsel
  setTimeout(calibrateNeutral, 100);
});

// mouse/touch click für splash und restart
canvas.addEventListener('click', () => {
  if (state.splashScreen) {
    startGameWithGyro();
  } else if (state.gameOver) {
    resetGame();
    state.started = true;
  }
});

// spawn carrot
function spawnCarrot() {
  const x = Math.random() * (canvas.width - 25);
  const y = Math.random() * (canvas.height - 25);

  // Karotte hinzufügen
  carrots.push({ x, y, width: 25, height: 25 });

  // Mini-Lichtblitz hinzufügen
  spawnFlashes.push({
    x: x + 12.5,    // Mittelpunkt
    y: y + 12.5,
    radius: 2,
    alpha: 1
  });
}


// spawn obstacle only off-screen right, then scroll left into view
function spawnObstacle() {
  const width  = 20 + Math.random() * 30;
  const height = 20 + Math.random() * 30;

  // y immer innerhalb des Spielfelds halten
  const y = Math.random() * (canvas.height - height);

  // nur rechts außerhalb spawnen
  const offscreenPadding = 40 + Math.random() * 80; // Abstand außerhalb des Screens
  const x = canvas.width + offscreenPadding;

  const walls = [wallImage1, wallImage2, wallImage3];
  const wallImg = walls[Math.floor(Math.random() * walls.length)];

  obstacles.push({
    x,
    y,
    width,
    height,
    wallImg,
    // nach links bewegen
    speedX: 0.3 + Math.random() * 0.7
  });
}


// initialize game objects
for (let i = 0; i < 5; i++) spawnCarrot();
for (let i = 0; i < 3; i++) spawnObstacle();

// update
function update() {
  if (state.splashScreen || state.gameOver) return;

   // Blitze leicht wachsen und verblassen lassen
for (let i = spawnFlashes.length - 1; i >= 0; i--) {
  const f = spawnFlashes[i];
  f.radius += 0.8;      // wächst
  f.alpha -= 0.05;      // verblasst
  if (f.alpha <= 0) spawnFlashes.splice(i, 1);
}
   
  // Hintergrund scrollen
  const scrollDirection = state.score >= 1000 ? -1 : 1;
  const bgWidth = backgroundImage.width || 1024;
  bgOffsetX = ((bgOffsetX + bgScrollSpeed * scrollDirection) % bgWidth + bgWidth) % bgWidth;

  // Kombinierter horizontaler Tilt
  const combinedTiltX = clamp(gyro.x + keyboardTilt, 1);

  // Horizontalbeschleunigung durch Tilt
  player.velocityX += combinedTiltX * GYRO_SENSITIVITY_X;

  // Leichter vertikaler Einfluss durch Gyro
  // nach vorn kippen bewegt leicht nach oben, nach hinten nach unten
  player.velocityY += gyro.y * GYRO_SENSITIVITY_Y;

  // Keyboard thrust bleibt aktiv
  if (keys['ArrowUp'] || keys['w'] || keys[' ']) {
    player.velocityY += player.thrust;
  }

  // Richtung für Sprite
  let directionChanged = false;
  if (player.velocityX < -0.1 && player.direction !== 'left') {
    player.direction = 'left';
    directionChanged = true;
  } else if (player.velocityX > 0.1 && player.direction !== 'right') {
    player.direction = 'right';
    directionChanged = true;
  }
  if (directionChanged) {
    swooshSound.currentTime = 0;
    swooshSound.play().catch(e => console.log('swoosh blocked'));
  }

  // Schwerkraft
  player.velocityY += player.gravity;

  // Bewegung anwenden
  player.x += player.velocityX;
  player.y += player.velocityY;

  // Reibung
  player.velocityX *= 0.98;
  player.velocityY *= 0.98;

// Kollision Ränder: leicht zurückdrücken statt explodieren
if (player.x <= 0) {
  player.x = 0;
  player.velocityX = Math.abs(player.velocityX) * 0.6; // nach rechts stoßen, leicht dämpfen
}

if (player.x + player.width >= canvas.width) {
  player.x = canvas.width - player.width;
  player.velocityX = -Math.abs(player.velocityX) * 0.6; // nach links stoßen
}

if (player.y <= 0) {
  player.y = 0;
  player.velocityY = Math.abs(player.velocityY) * 0.6; // nach unten stoßen
}

if (player.y + player.height >= canvas.height) {
  player.y = canvas.height - player.height;
  player.velocityY = -Math.abs(player.velocityY) * 0.6; // nach oben stoßen
}


  // Karotten einsammeln
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

  // Hindernisse Kollision
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

  // Hindernisse nach links bewegen und recyceln
  for (let i = obstacles.length - 1; i >= 0; i--) {
    obstacles[i].x -= obstacles[i].speedX;
    if (obstacles[i].x + obstacles[i].width < 0) {
      obstacles.splice(i, 1);
      spawnObstacle();
    }
  }
}

// draw
function draw() {
  // Hintergrund
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

  // Splash
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
    // kleine Debug-Info am Splash
    ctx.font = '10px monospace';
    ctx.fillText('atomlabor.de', canvas.width / 2, canvas.height / 2 + 126);
    return;
  }

  if (!state.started) return;

// Spawning-Lichtblitze zeichnen
spawnFlashes.forEach(f => {
  const gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius * 3);
  gradient.addColorStop(0, `rgba(255,255,180,${f.alpha})`);
  gradient.addColorStop(1, 'rgba(255,255,180,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(f.x, f.y, f.radius * 3, 0, Math.PI * 2);
  ctx.fill();
});

   
  // Karotten
  carrots.forEach(carrot => {
    if (carrotImage.complete) {
      ctx.drawImage(carrotImage, carrot.x, carrot.y, carrot.width, carrot.height);
    } else {
      ctx.fillStyle = '#ff8800';
      ctx.fillRect(carrot.x, carrot.y, carrot.width, carrot.height);
    }
  });

  // Hindernisse
  obstacles.forEach(obs => {
    if (obs.wallImg && obs.wallImg.complete) {
      ctx.drawImage(obs.wallImg, obs.x, obs.y, obs.width, obs.height);
    } else {
      ctx.fillStyle = '#666';
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    }
  });

  // Spieler oder Explosion
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

  // Score
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`score: ${state.score}`, 5, 15);
  ctx.fillText(`high: ${state.highScore}`, 5, 30);

  // kleine Gyro-Debugbox
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(canvas.width - 86, 4, 82, 24);
  ctx.fillStyle = '#fff';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`GX:${gyro.x.toFixed(2)}`, canvas.width - 80, 14);
  ctx.fillText(`GY:${gyro.y.toFixed(2)}`, canvas.width - 80, 24);

  // Game Over
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
  calibrateNeutral();
}

// game loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}
gameLoop();
