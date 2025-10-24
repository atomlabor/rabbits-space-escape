/* rabbits space escape from atomlabor.de 
   optimized for rabbit r1 (240x282), scrolling background and walls, gyro control
   Parallax-Drift + Warp, random carrots, spawn flash, edge bounce
*/

// canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 240;
canvas.height = 282;

// === Animated Game Over GIF Overlay ===
const gameOverOverlay = new Image();
gameOverOverlay.src = 'https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/spacecraft.gif';
gameOverOverlay.alt = 'Game Over';
gameOverOverlay.style.cssText = `
  position:absolute;
  top:30%; left:50%;
  width:160px; height:140px;  
  transform:translate(-50%,-50%);
  display:none;
  pointer-events:none;
  z-index:10;
`;
// Parent des Canvas sicher positionieren
const wrapEl = canvas.parentElement || document.body;
if (getComputedStyle(wrapEl).position === 'static') wrapEl.style.position = 'relative';
wrapEl.appendChild(gameOverOverlay);


// === Endvideo Overlay ===
const endVideo = document.createElement('video');
endVideo.src = 'https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/end.mp4';
endVideo.style.cssText = `
  position:absolute;
  top:0; left:0;
  width:100%;
  height:100%;
  object-fit:cover;
  display:none;
  z-index:20;
`;
endVideo.muted = false;
endVideo.controls = false;
endVideo.playsInline = true;

// Canvas-Wrapper wiederverwenden
wrapEl.appendChild(endVideo);

// asset loading
const shipLeft = new Image();
shipLeft.src = 'https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/spaceship-left.png';
const shipRight = new Image();
shipRight.src = 'https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/spaceship-right.png';

const splashImage = new Image();
splashImage.src = 'https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/rabbit.png';

// carrot graphics (random)
const carrotImages = [new Image(), new Image()];
carrotImages[0].src = 'https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/carrot-1.png';
carrotImages[1].src = 'https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/carrot-2.png';

const backgroundImage = new Image();
backgroundImage.src = 'https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/background.jpg';

const gameOverImage = new Image();
gameOverImage.src = 'https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/spacecraft.gif';

// kleine Spawn-Blitze
const spawnFlashes = [];

// wall graphics
const wallImage1 = new Image();
wallImage1.src = 'https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/wall.png';
const wallImage2 = new Image();
wallImage2.src = 'https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/wall2.png';
const wallImage3 = new Image();
wallImage3.src = 'https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/wall3.png';

// background scrolling / parallax
let bgPattern = null;
let bgOffsetX = 0;
let bgOffsetY = 0;
const baseBgSpeed = 0.15;
let currentBgSpeed = baseBgSpeed;

backgroundImage.onload = () => {
  bgPattern = ctx.createPattern(backgroundImage, 'repeat');
};

// Warp-Effekt Overlay
const warpFX = { active: false, alpha: 0 };

// sounds
const bgMusic = document.getElementById('game-music');
const swooshSound = new Audio('https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/swoosh.mp3');
const explosionSound = new Audio('https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/explosion.mp3');
const warpSound = new Audio('https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/warp.mp3'); 

// Lautstärken 
bgMusic && (bgMusic.volume = 0.25);
swooshSound.volume = 0.35;
explosionSound.volume = 2.0;
warpSound.volume = 0.8; // Warp angenehm laut

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
  bgWarped: false,   // wurde der 2000er Warp schon ausgelöst?
  speedBoosted: false, // wurde der 3000er Speed-Boost schon ausgelöst?
  endTriggered: false, // wurde das Endvideo bereits gestartet?


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
  lastRaw.beta  = event.beta  ?? 0; // vor zurück
  lastRaw.gamma = event.gamma ?? 0; // links rechts
  lastRaw.alpha = event.alpha ?? 0;

  if (state.gameOver) return;

  let { beta, gamma } = adjustForScreenOrientation(lastRaw.beta, lastRaw.gamma);

  beta  -= neutral.beta;
  gamma -= neutral.gamma;

  const nx = clamp(gamma, MAX_TILT_DEGREE) / MAX_TILT_DEGREE;
  const ny = clamp(beta,  MAX_TILT_DEGREE) / MAX_TILT_DEGREE;

  target.x = nx;
  target.y = ny;

  gyro.x += (target.x - gyro.x) * SMOOTHING;
  gyro.y += (target.y - gyro.y) * SMOOTHING;

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
  bgMusic?.play().catch(() => {});
  if (!ok) console.warn('Gyro nicht aktiviert. Steuerung per Tastatur verfügbar.');
}

window.addEventListener('orientationchange', () => {
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

// spawn carrot (mit Flash + random Image + Sound)
const spawnSound = new Audio('https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/spawn.mp3');

function spawnCarrot() {
  const size = 25;
  const x = Math.random() * (canvas.width - size);
  const y = Math.random() * (canvas.height - size);
  const img = carrotImages[Math.floor(Math.random() * carrotImages.length)];

  carrots.push({ x, y, width: size, height: size, img });

  // Mini-Lichtblitz
  spawnFlashes.push({ x: x + size / 2, y: y + size / 2, radius: 2, alpha: 1 });

  // Spawn-Sound abspielen
  spawnSound.currentTime = 0; // zurücksetzen, falls mehrere schnell spawnen
  spawnSound.play().catch(() => {}); // Catch vermeidet Browser-Warnungen
}


// spawn obstacle only off-screen right, then scroll left into view
function spawnObstacle() {
  const width  = 20 + Math.random() * 30;
  const height = 20 + Math.random() * 30;
  const y = Math.random() * (canvas.height - height);

  const offscreenPadding = 40 + Math.random() * 80; // rechts offscreen
  const x = canvas.width + offscreenPadding;

  const walls = [wallImage1, wallImage2, wallImage3];
  const wallImg = walls[Math.floor(Math.random() * walls.length)];

  obstacles.push({
    x, y, width, height, wallImg,
    speedX: 0.3 + Math.random() * 0.7
  });
}

// initialize game objects
for (let i = 0; i < 5; i++) spawnCarrot();
for (let i = 0; i < 3; i++) spawnObstacle();

// update
function update() {
  if (state.splashScreen || state.gameOver) return;

  // Spawn-Blitze animieren
  for (let i = spawnFlashes.length - 1; i >= 0; i--) {
    const f = spawnFlashes[i];
    f.radius += 0.8;
    f.alpha  -= 0.05;
    if (f.alpha <= 0) spawnFlashes.splice(i, 1);
  }

  // Hintergrund scrollen | leichter Parallax-Drift
  const bgWidth  = backgroundImage.width  || 1024;
  const bgHeight = backgroundImage.height || 1024;

  const t = performance.now();
  const scrollDirX = Math.sin(t / 800);   // horizontaler Drift
  const scrollDirY = Math.cos(t / 1000);  // vertikaler Drift

  bgOffsetX = ((bgOffsetX + currentBgSpeed * scrollDirX) % bgWidth  + bgWidth)  % bgWidth;
  bgOffsetY = ((bgOffsetY + currentBgSpeed * scrollDirY) % bgHeight + bgHeight) % bgHeight;

  // Warp bei 2000 Punkten einmalig auslösen
if (!state.bgWarped && state.score >= 2000) {
  state.bgWarped = true;

  // Sound sofort abspielen (vorgeladen, daher ohne Latenz)
  warpSound.currentTime = 0;
  warpSound.play().catch(() => {});

  // hart zu einem anderen Bereich des Tiles springen
  bgOffsetX = Math.floor(Math.random() * bgWidth);
  bgOffsetY = Math.floor(Math.random() * bgHeight);

  // kurzer visueller Flash + Speed-Boost
  warpFX.active = true;
  warpFX.alpha = 1;
  currentBgSpeed = baseBgSpeed * 2.0;

  setTimeout(() => {
    currentBgSpeed = baseBgSpeed;
  }, 700);
}

// Gegner-Geschwindigkeit ab 3000 Punkten einmalig erhöhen
if (!state.speedBoosted && state.score >= 3000) {
  state.speedBoosted = true;

  obstacles.forEach(obs => {
    obs.speedX *= 1.8; // einmaliger Geschwindigkeitsboost
  });

  console.log('Speed boost aktiviert!'); // optionales Debug-Log
}

   
  // Warp-Flash ausfaden lassen
  if (warpFX.active) {
    warpFX.alpha -= 0.05;
    if (warpFX.alpha <= 0) {
      warpFX.alpha = 0;
      warpFX.active = false;
    }
  }

  // Kombinierter horizontaler Tilt
  const combinedTiltX = clamp(gyro.x + keyboardTilt, 1);

  // Horizontal/Vertikal
  player.velocityX += combinedTiltX * GYRO_SENSITIVITY_X;
  player.velocityY += gyro.y * GYRO_SENSITIVITY_Y;

  // Keyboard thrust
  if (keys['ArrowUp'] || keys['w'] || keys[' ']) {
    player.velocityY += player.thrust;
  }

  // Richtung fürs Sprite
  let directionChanged = false;
  if (player.velocityX < -0.1 && player.direction !== 'left') {
    player.direction = 'left'; directionChanged = true;
  } else if (player.velocityX > 0.1 && player.direction !== 'right') {
    player.direction = 'right'; directionChanged = true;
  }
  if (directionChanged) {
    swooshSound.currentTime = 0;
    swooshSound.play().catch(()=>{});
  }

  // Schwerkraft & Bewegung
  player.velocityY += player.gravity;
  player.x += player.velocityX;
  player.y += player.velocityY;

  // Reibung
  player.velocityX *= 0.98;
  player.velocityY *= 0.98;

  // Ränder: sanft zurückdrücken
  if (player.x <= 0) {
    player.x = 0;
    player.velocityX = Math.abs(player.velocityX) * 0.6;
  }
  if (player.x + player.width >= canvas.width) {
    player.x = canvas.width - player.width;
    player.velocityX = -Math.abs(player.velocityX) * 0.6;
  }
  if (player.y <= 0) {
    player.y = 0;
    player.velocityY = Math.abs(player.velocityY) * 0.6;
  }
  if (player.y + player.height >= canvas.height) {
    player.y = canvas.height - player.height;
    player.velocityY = -Math.abs(player.velocityY) * 0.6;
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
  if (
    player.x < obs.x + obs.width &&
    player.x + player.width > obs.x &&
    player.y < obs.y + obs.height &&
    player.y + player.height > obs.y
  ) {
    if (!state.exploding) {
      state.exploding = true;
      state.explosionFrame = 0;

      // Explosion Sound lauter & reset
      explosionSound.currentTime = 0;
      explosionSound.volume = 1.0; // maximale Lautstärke
      explosionSound.play().catch(() => {});

      // Musik leicht absenken (Ducking)
      if (bgMusic) {
        const baseVol = 0.25;
        bgMusic.volume = Math.max(0, baseVol * 0.4);
        setTimeout(() => { bgMusic.volume = baseVol; }, 700);
      }

      setTimeout(gameOver, 500);
    }
  }
});

// === Endvideo bei 10.000 Punkten ===
if (!state.endTriggered && state.score >= 10000) {
  state.endTriggered = true;
  state.started = false; // Spiel pausieren

  // Musik ausblenden
  if (bgMusic) bgMusic.volume = 0.05;

  // Canvas abdunkeln
  ctx.fillStyle = 'rgba(0,0,0,0.9)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('YOU MADE IT!', canvas.width / 2, canvas.height / 2 - 30);
  ctx.fillText('The End...', canvas.width / 2, canvas.height / 2);

  // Video anzeigen und abspielen
  endVideo.style.display = 'block';
  endVideo.currentTime = 0;
  endVideo.play().catch(() => {});

  // optional: nach Ende des Videos zurück zum Startscreen
  endVideo.onended = () => {
    endVideo.style.display = 'none';
    resetGame();
    state.splashScreen = true;
  };
}
   

  // Hindernisse bewegen & recyceln
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
    const bgWidth  = backgroundImage.width  || 1024;
    const bgHeight = backgroundImage.height || 1024;

    ctx.save();
    ctx.translate(-bgOffsetX, -bgOffsetY);
    ctx.fillStyle = bgPattern;
    ctx.fillRect(0, 0, canvas.width + bgWidth, canvas.height + bgHeight);
    ctx.restore();
  } else if (backgroundImage.complete) {
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Warp-Flash Overlay
  if (warpFX.active && warpFX.alpha > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.6, warpFX.alpha * 0.6);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  // Splash
  if (state.splashScreen) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (splashImage.complete) {
      const baseSize = 165;
      const size = baseSize * 1.05; // +5 %
      ctx.drawImage(splashImage, canvas.width / 2 - size / 2, canvas.height / 2 - size / 2 - 10, size, size);
    }
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('click to start', canvas.width / 2, canvas.height / 2 + 110);
    ctx.font = '8px monospace';
    ctx.fillText('made by atomlabor.de', canvas.width / 2, canvas.height / 2 + 126);
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
    if (carrot.img && carrot.img.complete) {
      ctx.drawImage(carrot.img, carrot.x, carrot.y, carrot.width, carrot.height);
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

  // KEIN drawImage(gameOverImage, ...) mehr hier – das GIF kommt als Overlay

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

function gameOver() {
  state.gameOver = true;

  // animiertes GIF einblenden
  gameOverOverlay.style.display = 'block';

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

  state.bgWarped = false;
  warpFX.active = false;
  warpFX.alpha = 0;
  currentBgSpeed = baseBgSpeed;
   // animiertes GIF wieder verstecken
gameOverOverlay.style.display = 'none';

}

// game loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}
gameLoop();
