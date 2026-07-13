/**
 * Copy Windows installers from release/ → installers/ (local archive, all versions).
 * Run automatically after electron:build:win, or manually: node scripts/archive-installers.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const releaseDir = path.join(root, 'release');
const installersDir = path.join(root, 'installers');

if (!fs.existsSync(releaseDir)) {
  console.error('No release/ folder — build first: npm run electron:build:win');
  process.exit(1);
}

fs.mkdirSync(installersDir, { recursive: true });

const pattern = /^(EvtinkoWallet Setup|USDT Wallet Setup) .+\.exe$/i;
const copied = [];

for (const name of fs.readdirSync(releaseDir)) {
  if (!pattern.test(name)) continue;
  const src = path.join(releaseDir, name);
  const dest = path.join(installersDir, name);
  fs.copyFileSync(src, dest);
  copied.push(name);
}

copied.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

const manifest = {
  updatedAt: new Date().toISOString(),
  count: copied.length,
  files: copied.map((name) => ({
    name,
    bytes: fs.statSync(path.join(installersDir, name)).size,
  })),
};

fs.writeFileSync(path.join(installersDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

console.log(`Archived ${copied.length} installer(s) → installers/`);
for (const name of copied) console.log(`  • ${name}`);
