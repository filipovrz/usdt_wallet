import { test, expect, _electron as electron } from '@playwright/test';

const root = process.cwd();

test.describe('USDT Wallet E2E', () => {
  test('app launches without crash', async () => {
    const app = await electron.launch({
      cwd: root,
      args: ['.'],
      env: { ...process.env, NODE_ENV: 'production' },
      timeout: 60_000,
    });

    try {
      const window = await app.firstWindow({ timeout: 30_000 });
      await window.waitForLoadState('domcontentloaded');
      await expect(window).toHaveTitle(/USDT Wallet/i, { timeout: 15_000 });

      await window.waitForSelector('#root', { timeout: 20_000 });
      const html = await window.locator('#root').innerHTML();
      expect(html.length).toBeGreaterThan(0);

      const isReady = await app.evaluate(async ({ app: electronApp }) => electronApp.isReady());
      expect(isReady).toBe(true);
    } finally {
      await app.close();
    }
  });
});
