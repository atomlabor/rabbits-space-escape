// rabbit's space escape - R1 optimized with accelerometer + touch control
// 240x282 canvas, wall graphics, asset caching, like grav1ty man

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 240;
canvas.height = 282;

// check if running on rabbit r1
const isR1 = typeof window.rabbit !== 'undefined';

// assets
const assets = {
  shipLeft: new Image(),
  shipRight: new Image(),
  splash: new Image(),
  carrot: new Image(),
  background: new Image(),
  gameOver: new Image(),
  wall1: new Image(),
  wall2: new Image(),
  wall3: new Image()
};

const baseUrl = 'https://raw.githubusercontent.com/atomlabor/rabbits-space-escape/main/assets/';
assets.shipLeft.src = baseUrl + 'spaceship-left.png';
assets.shipRight.src = baseUrl + 'spaceship-right.png';
assets.splash.src = baseUrl + 'rabbit.png';
assets.carrot.src = baseUrl + 'carrot-1.png';
assets.background.src = baseUrl + 'background.jpg';
assets.gameOver.src = baseUrl + 'spacecraft.gif';
assets.wall1.src = baseUrl + 'wall.png';
assets.wall2.src = baseUrl + 'wall2.png';
assets.wall3.src = baseUrl + 'wall3.png';

// sounds
const bgMusic = document.getElementById('game-music');
const swooshSound = new Audio(baseUrl + 'swoosh.mp3');
const explosionSound = new Audio(baseUrl + 'explosion.mp3');

// game state
const state = {
  splash: true,
  playing: false,
  gameOver: false,
  score: 0,
  highScore: parseInt(localStorage.getItem('highScore') || '0'),
  assetsLoaded: 0,
  totalAssets: 9
};

// player
const player = {
  x: 120,
  y: 141,
  vx: 0,
  vy: 0,
  size: 20,
  facingRight: true
};

// accelerometer data
let accelX = 0;
let accelY = 0;

// background scroll
let bgOffset = 0;

// obstacles array
const obstacles = [];

// carrots array
const carrots = [];

// asset loading
Object.values(assets).forEach(img => {
  img.onload = () => {
    state.assetsLoaded++;
  };
});

// init accelerometer for R1
if (isR1 && window.rabbit.accelerometer) {
  window.rabbit.accelerometer.start((data) => {
    accelX = data.x;
    accelY = data.y;
  }).catch(err => console.log('accelerometer error:', err));
} else {
  // fallback to DeviceOrientation for testing
  window.addEventListener('deviceorientation', (e) => {
    if (e.beta !== null && e.gamma !== null) {
      accelX = e.gamma / 90;
      accelY = (e.beta - 45) / 45;
    }
  });
}

// touch controls for R1
let touchStartY = 0;
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (state.splash) {
    state.splash = false;
    state.playing = true;
    bgMusic.play().catch(e => console.log('audio error'));
  } else if (state.gameOver) {
    resetGame();
  } else if (state.playing) {
    touchStartY = e.touches[0].clientY;
  }
});

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (state.playing && !state.gameOver) {
    const touchY = e.touches[0].clientY;
    const deltaY = touchStartY - touchY;
    if (Math.abs(deltaY) > 20) {
      player.vy -= deltaY * 0.01;
      touchStartY = touchY;
    }
  }
});

// keyboard fallback
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter') {
    if (state.splash) {
      state.splash = false;
      state.playing = true;
      bgMusic.play().catch(e => console.log('audio error'));
    } else if (state.gameOver) {
      resetGame();
    }
  }
  if (state.playing && !state.gameOver) {
    if (e.code === 'ArrowUp') player.vy -= 0.5;
    if (e.code === 'ArrowDown') player.vy += 0.5;
    if (e.code === 'ArrowLeft') player.vx -= 0.5;
    if (e.code === 'ArrowRight') player.vx += 0.5;
  }
});

function spawnObstacle() {
  const w = 30 + Math.random() * 40;
  const h = 30 + Math.random() * 60;
  const walls = [assets.wall1, assets.wall2, assets.wall3];
  const wallImg = walls[Math.floor(Math.random() * 3)];
  obstacles.push({
    x: Math.random() * (canvas.width - w),
    y: Math.random() * (canvas.height - h),
    w, h,
    wallImg
  });
}

function spawnCarrot() {
  carrots.push({
    x: Math.random() * (canvas.width - 20),
    y: Math.random() * (canvas.height - 20),
    size: 20
  });
}

// init game objects
for (let i = 0; i < 6; i++) spawnObstacle();
for (let i = 0; i < 3; i++) spawnCarrot();

function resetGame() {
  state.gameOver = false;
  state.playing = true;
  state.score = 0;
  player.x = 120;
  player.y = 141;
  player.vx = 0;
  player.vy = 0;
  obstacles.length = 0;
  carrots.length = 0;
  for (let i = 0; i < 6; i++) spawnObstacle();
  for (let i = 0; i < 3; i++) spawnCarrot();
  bgMusic.currentTime = 0;
  bgMusic.play().catch(e => console.log('audio error'));
}

function update() {
  if (!state.playing || state.gameOver) return;

  // apply accelerometer input
  if (Math.abs(accelX) > 0.1) {
    player.vx += accelX * 0.3;
  }
  if (Math.abs(accelY) > 0.1) {
    player.vy += accelY * 0.2;
  }

  // apply friction
  player.vx *= 0.95;
  player.vy *= 0.95;

  // update position
  player.x += player.vx;
  player.y += player.vy;

  // facing direction
  if (Math.abs(player.vx) > 0.5) {
    const newFacing = player.vx > 0;
    if (newFacing !== player.facingRight) {
      player.facingRight = newFacing;
      swooshSound.currentTime = 0;
      swooshSound.play().catch(e => {});
    }
  }

  // bounds
  if (player.x < 0) player.x = 0;
  if (player.x > canvas.width - player.size) player.x = canvas.width - player.size;
  if (player.y < 0) player.y = 0;
  if (player.y > canvas.height - player.size) player.y = canvas.height - player.size;

  // collision with obstacles
  obstacles.forEach(o => {
    if (player.x < o.x + o.w &&
        player.x + player.size > o.x &&
        player.y < o.y + o.h &&
        player.y + player.size > o.y) {
      explosionSound.play().catch(e => {});
      state.gameOver = true;
      state.playing = false;
      bgMusic.pause();
      if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('highScore', state.highScore);
      }
    }
  });

  // collect carrots
  for (let i = carrots.length - 1; i >= 0; i--) {
    const c = carrots[i];
    if (player.x < c.x + c.size &&
        player.x + player.size > c.x &&
        player.y < c.y + c.size &&
        player.y + player.size > c.y) {
      carrots.splice(i, 1);
      state.score += 100;
      spawnCarrot();
    }
  }

  // scroll background
  bgOffset += 0.3;
  if (bgOffset > canvas.width) bgOffset = 0;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // splash screen
  if (state.splash) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (assets.splash.complete) {
      const sw = 120;
      const sh = 120;
      ctx.drawImage(assets.splash, (canvas.width - sw) / 2, 60, sw, sh);
    }
    ctx.fillStyle = '#fff';
    ctx.font = '20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText("rabbit's space escape", canvas.width / 2, 200);
    ctx.font = '12px monospace';
    ctx.fillText('tap or press space', canvas.width / 2, 240);
    return;
  }

  // game over screen
  if (state.gameOver) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (assets.gameOver.complete) {
      ctx.drawImage(assets.gameOver, (canvas.width - 100) / 2, 60, 100, 100);
    }
    ctx.fillStyle = '#fff';
    ctx.font = '20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('game over', canvas.width / 2, 180);
    ctx.font = '14px monospace';
    ctx.fillText('score: ' + state.score, canvas.width / 2, 210);
    ctx.fillText('high: ' + state.highScore, canvas.width / 2, 230);
    ctx.font = '12px monospace';
    ctx.fillText('tap to restart', canvas.width / 2, 260);
    return;
  }

  // draw background
  if (assets.background.complete) {
    ctx.drawImage(assets.background, -bgOffset, 0, canvas.width, canvas.height);
    ctx.drawImage(assets.background, canvas.width - bgOffset, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // draw obstacles (walls)
  obstacles.forEach(o => {
    if (o.wallImg && o.wallImg.complete) {
      ctx.drawImage(o.wallImg, o.x, o.y, o.w, o.h);
    } else {
      ctx.fillStyle = '#666';
      ctx.fillRect(o.x, o.y, o.w, o.h);
    }
  });

  // draw carrots
  carrots.forEach(c => {
    if (assets.carrot.complete) {
      ctx.drawImage(assets.carrot, c.x, c.y, c.size, c.size);
    } else {
      ctx.fillStyle = '#ff8800';
      ctx.fillRect(c.x, c.y, c.size, c.size);
    }
  });

  // draw player
  const shipImg = player.facingRight ? assets.shipRight : assets.shipLeft;
  if (shipImg.complete) {
    ctx.drawImage(shipImg, player.x, player.y, player.size, player.size);
  } else {
    ctx.fillStyle = '#0ff';
    ctx.fillRect(player.x, player.y, player.size, player.size);
  }

  // draw score
  ctx.fillStyle = '#fff';
  ctx.font = '14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('score: ' + state.score, 10, 20);
  ctx.fillText('high: ' + state.highScore, 10, 40);
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
