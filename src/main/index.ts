import { app, BrowserWindow, shell, session } from 'electron';
import path from 'path';
import { readFileSync, existsSync } from 'fs';
import { WalletManager } from './wallet-manager';
import { registerIpcHandlers } from './ipc-handlers';
import { initAutoUpdater, checkUpdatesOnStartup } from './services/update-service';

const isDev = process.env.NODE_ENV === 'development';
let mainWindow: BrowserWindow | null = null;
let walletManager: WalletManager | null = null;

// In dev, prefer the real wallet data if it exists, so you can unlock with your password.
// Fallback to a separate dev profile only when there's no existing vault.
if (isDev && !process.env.ELECTRON_USER_DATA) {
  const prodUserData = path.join(app.getPath('appData'), 'usdt-wallet');
  const prodVault = path.join(prodUserData, 'vault.enc.json');
  const devUserData = path.join(app.getPath('appData'), 'usdt-wallet-dev');
  app.setPath('userData', existsSync(prodVault) ? prodUserData : devUserData);
}

// Some Windows setups show a black window when GPU init/caching fails in dev.
// Disabling hardware acceleration is a pragmatic workaround.
if (isDev) {
  app.disableHardwareAcceleration();
}

if (process.env.ELECTRON_USER_DATA) {
  app.setPath('userData', process.env.ELECTRON_USER_DATA);
}

// Ensure consistent userData path (not generic "Electron" folder).
try {
  const pkg = JSON.parse(readFileSync(path.join(__dirname, '../../package.json'), 'utf8')) as { name?: string };
  if (pkg.name) app.setName(pkg.name);
} catch {
  app.setName('usdt-wallet');
}

function getWalletManager(): WalletManager {
  if (!walletManager) walletManager = new WalletManager();
  return walletManager;
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: 'EvtinkoWallet',
    backgroundColor: '#0a0f1a',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // NOTE: `sandbox: true` breaks `electron` imports in preload on Windows
      // for this app's IPC bridge (`contextBridge` + `ipcRenderer`).
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  if (isDev) {
    // Dev-only diagnostics for "blank window" issues.
    mainWindow.webContents.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL) => {
      console.error('[renderer] did-fail-load', { errorCode, errorDescription, validatedURL });
    });
    mainWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
      const lvl = level === 3 ? 'error' : level === 2 ? 'warn' : 'log';
      console[lvl](`[renderer console] ${message} (${sourceId}:${line})`);
    });
    mainWindow.webContents.on('render-process-gone', (_e, details) => {
      console.error('[renderer] render-process-gone', details);
    });
    mainWindow.webContents.on('unresponsive', () => {
      console.error('[renderer] unresponsive');
    });
  }
  // NOTE: Do not auto-open DevTools. On some Windows setups it can crash the
  // renderer / cause black window behavior when DevTools frontend fails to load.

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (isDev) {
      callback({ responseHeaders: details.responseHeaders });
      return;
    }

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self' https:;",
        ],
      },
    });
  });

  registerIpcHandlers(getWalletManager());
  initAutoUpdater();
  createWindow();

  const settingsRes = getWalletManager().getSettings();
  if (settingsRes.success && settingsRes.data?.checkUpdatesOnStart) {
    checkUpdatesOnStartup(true);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  walletManager?.lock();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  walletManager?.lock();
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});
