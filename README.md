# Rabbit's Space Escape

A gravity-based space adventure game optimised for the Rabbit r1 device.

## Features

- **Canvas-only rendering** at 240x282px resolution
- **Gravity-based controls** using the device's acceleration sensor
- **Minimal HTML setup** for optimal performance on Rabbit r1
- **Physics simulation** with damping and velocity limits

## Structure

```
/public/index.html    - Minimal HTML canvas setup
/src/main.js          - Main game script with gravity controls
/assets/              - Directory for graphics and sounds
```

## How to Play

1. Open `public/index.html` in your Rabbit r1 browser
2. Allow access to motion sensors when prompted
3. Tilt your device to control the rabbit character
4. Navigate through space obstacles

## Technical Details

- **Viewport**: 240x282px (Rabbit r1 screen size)
- **Controls**: DeviceMotion API for acceleration sensing
- **Physics**: Custom gravity simulation with damping
- **Rendering**: HTML5 Canvas 2D context

## Development

This project is designed specifically for the Rabbit r1 device and uses its unique viewport dimensions. All controls are optimised for motion-based gameplay.

## Licence

MIT
