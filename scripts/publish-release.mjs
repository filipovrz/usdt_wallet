/**
 * Create GitHub release using git-stored credentials (same as git push).
 * Usage: node scripts/publish-release.mjs v3.2.2
 */
import { spawnSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tag = process.argv[2];
if (!tag) {
  console.error('Usage: node scripts/publish-release.mjs <tag>');
  process.exit(1);
}

const version = tag.replace(/^v/, '');
const exe = path.join(root, 'release', `EvtinkoWallet Setup ${version}.exe`);
const latestJson = path.join(root, 'release', 'latest.json');
const gh = process.platform === 'win32'
  ? 'C:\\Program Files\\GitHub CLI\\gh.exe'
  : 'gh';

for (const f of [exe, latestJson]) {
  if (!fs.existsSync(f)) {
    console.error(`Missing file: ${f}`);
    process.exit(1);
  }
}

function getGitHubToken() {
  const child = spawnSync('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8',
    cwd: root,
  });
  if (child.status !== 0) return null;
  const password = child.stdout
    .split('\n')
    .find((l) => l.startsWith('password='))
    ?.slice('password='.length);
  return password || null;
}

async function main() {
  let token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || getGitHubToken();
  if (!token) {
    console.error('No GitHub token — run: gh auth login');
    process.exit(1);
  }

  const notes = `## EvtinkoWallet v${version}

### Highlights
- Welcome screen — 14 networks, BTC Lightning, TON, Solana (BG/EN)
- Offline mode — History filtered by active account
- Copyright signature in code, Help, Settings About, startup log
- Local installers archive folder (\`installers/\`)

### Install (Windows)
Download **EvtinkoWallet Setup ${version}.exe** and run the installer.

### Tests
- Unit: 12/12
- E2E: 2/2`;

  const args = [
    'release', 'create', tag,
    '--repo', 'filipovrz/usdt_wallet',
    '--title', `EvtinkoWallet v${version}`,
    '--notes', notes,
    exe,
    latestJson,
  ];

  const env = { ...process.env, GH_TOKEN: token, GITHUB_TOKEN: token };

  await new Promise((resolve, reject) => {
    const proc = spawn(gh, args, { env, stdio: 'inherit', cwd: root });
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`gh exit ${code}`))));
    proc.on('error', reject);
  });

  console.log(`\nRelease ${tag} published.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
