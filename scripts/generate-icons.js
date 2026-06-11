// Script to generate PWA icons from SVG
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const svgPath = path.join(rootDir, 'public', 'icon.svg');
const svg = fs.readFileSync(svgPath);

const sizes = [
  { name: 'icon-72x72.png', size: 72 },
  { name: 'icon-96x96.png', size: 96 },
  { name: 'icon-128x128.png', size: 128 },
  { name: 'icon-144x144.png', size: 144 },
  { name: 'icon-152x152.png', size: 152 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-384x384.png', size: 384 },
  { name: 'icon-512x512.png', size: 512 },
];

// Try sharp first
try {
  const sharp = require(path.join(rootDir, 'node_modules', 'sharp'));
  sizes.forEach(({ name, size }) => {
    sharp(svg)
      .resize(size, size)
      .png()
      .toFile(path.join(rootDir, 'public', name))
      .then(() => console.log(`Created ${name}`))
      .catch(err => console.error(`Failed ${name}:`, err.message));
  });
} catch (err) {
  console.log('Sharp not available, using SVG copy fallback...');
  sizes.forEach(({ name }) => {
    fs.copyFileSync(svgPath, path.join(rootDir, 'public', name));
    console.log(`Copied ${name} (SVG fallback)`);
  });
}