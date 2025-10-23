// Rabbit's Space Escape - Main Game Script
// Optimised for Rabbit r1 (240x282px)

// Initialise canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Player object (rabbit)
const rabbit = {
    x: 120,
    y: 141,
    width: 20,
    height: 20,
    velocityX: 0,
    velocityY: 0,
    color: '#FFF'
};

// Physics constants
const GRAVITY_SCALE = 0.5;
const DAMPING = 0.95;
const MAX_VELOCITY = 5;

// Acceleration sensor data
let gravityX = 0;
let gravityY = 0;

// Gravity control via acceleration sensor
if (window.DeviceMotionEvent) {
    window.addEventListener('devicemotion', function(event) {
        if (event.accelerationIncludingGravity) {
            // X-axis: Left/Right (inverted for natural control)
            gravityX = -event.accelerationIncludingGravity.x * GRAVITY_SCALE;
            // Y-axis: Up/Down
            gravityY = event.accelerationIncludingGravity.y * GRAVITY_SCALE;
        }
    });
} else {
    console.log('DeviceMotion API not available');
}

// Update player based on acceleration
function updateRabbit() {
    // Adjust velocity by gravity
    rabbit.velocityX += gravityX;
    rabbit.velocityY += gravityY;
    
    // Limit velocity
    rabbit.velocityX = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, rabbit.velocityX));
    rabbit.velocityY = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, rabbit.velocityY));
    
    // Apply damping
    rabbit.velocityX *= DAMPING;
    rabbit.velocityY *= DAMPING;
    
    // Update position
    rabbit.x += rabbit.velocityX;
    rabbit.y += rabbit.velocityY;
    
    // Check boundaries (walls)
    if (rabbit.x < 0) {
        rabbit.x = 0;
        rabbit.velocityX = 0;
    }
    if (rabbit.x + rabbit.width > canvas.width) {
        rabbit.x = canvas.width - rabbit.width;
        rabbit.velocityX = 0;
    }
    if (rabbit.y < 0) {
        rabbit.y = 0;
        rabbit.velocityY = 0;
    }
    if (rabbit.y + rabbit.height > canvas.height) {
        rabbit.y = canvas.height - rabbit.height;
        rabbit.velocityY = 0;
    }
}

// Draw player
function drawRabbit() {
    ctx.fillStyle = rabbit.color;
    ctx.fillRect(rabbit.x, rabbit.y, rabbit.width, rabbit.height);
}

// Main game loop
function gameLoop() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Update and draw player
    updateRabbit();
    drawRabbit();
    
    // Request next frame
    requestAnimationFrame(gameLoop);
}

// Start game
gameLoop();

console.log('Rabbit\'s Space Escape started - Move your device!');
