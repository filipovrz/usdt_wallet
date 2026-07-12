import path from 'path';
import { test, expect, _electron as electron } from '@playwright/test';

const root = process.cwd();

function getElectronExecutable(): string {
  const binary = process.platform === 'win32' ? 'electron.exe' : 'electron';
  return path.join(root, 'node_modules', 'electron', 'dist', binary);
}

test.describe('USDT Wallet E2E', () => {
  test('app launches without crash', async () => {
    const app = await electron.launch({
      cwd: root,
      args: ['.'],
      env: { ...process.env, NODE_ENV: 'production' },
      executablePath: getElectronExecutable(),
      timeout: 120_000,
    });

    try {
      const window = await app.firstWindow({ timeout: 60_000 });
      await window.waitForLoadState('domcontentloaded');
      await expect(window).toHaveTitle(/USDT Wallet/i, { timeout: 30_000 });

      await window.waitForSelector('#root', { timeout: 30_000 });
      const html = await window.locator('#root').innerHTML();
      expect(html.length).toBeGreaterThan(0);

      const isReady = await app.evaluate(async ({ app: electronApp }) => electronApp.isReady());
      expect(isReady).toBe(true);
    } finally {
      await app.close();
    }
  });
});
