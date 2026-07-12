import path from 'path';
import { test, expect, _electron as electron } from '@playwright/test';

const root = process.cwd();

function getElectronExecutable(): string {
  const binary = process.platform === 'win32' ? 'electron.exe' : 'electron';
  return path.join(root, 'node_modules', 'electron', 'dist', binary);
}

test.describe('Create wallet flow', () => {
  test('create wallet succeeds', async () => {
    const userData = path.join(root, '.test-user-data-' + Date.now());
    const app = await electron.launch({
      cwd: root,
      args: ['.', `--user-data-dir=${userData}`],
      env: { ...process.env, NODE_ENV: 'production', ELECTRON_USER_DATA: userData },
      executablePath: getElectronExecutable(),
      timeout: 120_000,
    });

    try {
      const window = await app.firstWindow({ timeout: 60_000 });
      await window.waitForLoadState('domcontentloaded');

      await window.getByRole('link', { name: /Създай|Create/i }).click();
      await window.getByLabel(/Парола|Password/i).first().fill('TestPassword123!');
      await window.getByLabel(/Потвърди|Confirm/i).fill('TestPassword123!');
      await window.getByRole('button', { name: /Създай|Create/i }).click();

      await expect(window.getByText(/Записах seed|seed phrase/i)).toBeVisible({ timeout: 30_000 });
      await window.getByRole('checkbox').check();
      await window.getByRole('button', { name: /Продължи|Continue/i }).click();
      await expect(window.getByRole('link', { name: /Табло|Dashboard/i })).toBeVisible({ timeout: 30_000 });
    } finally {
      await app.close();
    }
  });
});
