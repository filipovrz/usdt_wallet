/**
 * Prepares Linux icon set from build/icon.png for electron-builder.
 * macOS builds use build/icon.png directly (converted to .icns on macOS).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const iconPng = path.join(root, 'build', 'icon.png');
const iconsDir = path.join(root, 'build', 'icons');

if (!fs.existsSync(iconPng)) {
  console.error('Missing build/icon.png — required for macOS/Linux builds.');
  process.exit(1);
}

fs.mkdirSync(iconsDir, { recursive: true });
for (const size of [16, 32, 48, 64, 128, 256, 512]) {
  fs.copyFileSync(iconPng, path.join(iconsDir, `${size}x${size}.png`));
}

console.log('Icons prepared: build/icon.png + build/icons/*.png');
