// Rabbit's Space Escape - Main Game Script
// Optimiert für Rabbit r1 (240x282px)

// Canvas initialisieren
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Spieler-Objekt (Hase)
const rabbit = {
    x: 120,
    y: 141,
    width: 20,
    height: 20,
    velocityX: 0,
    velocityY: 0,
    color: '#FFF'
};

// Physik-Konstanten
const GRAVITY_SCALE = 0.5;
const DAMPING = 0.95;
const MAX_VELOCITY = 5;

// Beschleunigungssensor-Daten
let gravityX = 0;
let gravityY = 0;

// Gravity-Steuerung per Beschleunigungssensor
if (window.DeviceMotionEvent) {
    window.addEventListener('devicemotion', function(event) {
        if (event.accelerationIncludingGravity) {
            // X-Achse: Links/Rechts (invertiert für natürliche Steuerung)
            gravityX = -event.accelerationIncludingGravity.x * GRAVITY_SCALE;
            // Y-Achse: Oben/Unten
            gravityY = event.accelerationIncludingGravity.y * GRAVITY_SCALE;
        }
    });
} else {
    console.log('DeviceMotion API nicht verfügbar');
}

// Spieler bewegen basierend auf Beschleunigung
function updateRabbit() {
    // Geschwindigkeit durch Gravity anpassen
    rabbit.velocityX += gravityX;
    rabbit.velocityY += gravityY;
    
    // Geschwindigkeit begrenzen
    rabbit.velocityX = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, rabbit.velocityX));
    rabbit.velocityY = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, rabbit.velocityY));
    
    // Dämpfung anwenden
    rabbit.velocityX *= DAMPING;
    rabbit.velocityY *= DAMPING;
    
    // Position aktualisieren
    rabbit.x += rabbit.velocityX;
    rabbit.y += rabbit.velocityY;
    
    // Grenzen prüfen (Wände)
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

// Zeichne Spieler
function drawRabbit() {
    ctx.fillStyle = rabbit.color;
    ctx.fillRect(rabbit.x, rabbit.y, rabbit.width, rabbit.height);
}

// Hauptspiel-Loop
function gameLoop() {
    // Canvas leeren
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Spieler aktualisieren und zeichnen
    updateRabbit();
    drawRabbit();
    
    // Nächsten Frame anfordern
    requestAnimationFrame(gameLoop);
}

// Spiel starten
gameLoop();

console.log('Rabbit\'s Space Escape gestartet - Bewege dein Gerät!');
