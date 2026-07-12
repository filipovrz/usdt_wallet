/**
 * Reproduces WalletManager init BEFORE app.whenReady (same as index.ts).
 */
import { app } from 'electron';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { WalletManager } = require(path.join(root, 'dist-electron/main/wallet-manager.js'));

// Same order as src/main/index.ts — constructor before whenReady
const walletManager = new WalletManager();
console.log('vaultPath at construct (before ready):', walletManager.exportVaultPath?.() || 'n/a');

app.whenReady().then(async () => {
  try {
    console.log('userData after ready:', app.getPath('userData'));
    const res = await walletManager.createWallet('Test2', 'TestPassword123!', '');
    console.log('result:', res.success ? 'OK' : res.error);
    if (!res.success) console.log(JSON.stringify(res));
  } catch (e) {
    console.error('CRASH:', e);
  } finally {
    app.quit();
  }
});
