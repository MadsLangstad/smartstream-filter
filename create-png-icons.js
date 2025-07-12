import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';

function createIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(0, 0, size, size);
  
  // Draw slider
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = size / 8;
  ctx.lineCap = 'round';
  
  // Horizontal line
  ctx.beginPath();
  ctx.moveTo(size * 0.2, size * 0.5);
  ctx.lineTo(size * 0.8, size * 0.5);
  ctx.stroke();
  
  // Slider handle
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.5, size * 0.15, 0, Math.PI * 2);
  ctx.fill();
  
  return canvas.toBuffer('image/png');
}

// Create icons directory
const iconsDir = path.join('dist', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate PNG files
[16, 48, 128].forEach(size => {
  const buffer = createIcon(size);
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), buffer);
  console.log(`Created icon-${size}.png`);
});