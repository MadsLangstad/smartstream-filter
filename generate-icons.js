import fs from 'fs';
import path from 'path';

// Simple SVG icon
const svgIcon = `<svg width="SIZE" height="SIZE" xmlns="http://www.w3.org/2000/svg">
  <rect width="SIZE" height="SIZE" fill="#1f2937"/>
  <line x1="20%" y1="50%" x2="80%" y2="50%" stroke="#dc2626" stroke-width="12.5%" stroke-linecap="round"/>
  <circle cx="50%" cy="50%" r="15%" fill="#dc2626"/>
</svg>`;

// Create icons directory
const iconsDir = path.join('dist', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG files for each size
[16, 48, 128].forEach(size => {
  const svg = svgIcon.replace(/SIZE/g, size);
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.svg`), svg);
  console.log(`Created icon-${size}.svg`);
});

console.log('Icons created! You can use these SVG files or convert them to PNG.');