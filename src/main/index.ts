import { app, BrowserWindow, shell, session } from 'electron';
import path from 'path';
import { WalletManager } from './wallet-manager';
import { registerIpcHandlers } from './ipc-handlers';
import { initAutoUpdater, checkUpdatesOnStartup } from './services/update-service';

const isDev = process.env.NODE_ENV === 'development';
let mainWindow: BrowserWindow | null = null;
const walletManager = new WalletManager();

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: 'USDT Wallet',
    backgroundColor: '#0a0f1a',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
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
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self' https:;",
        ],
      },
    });
  });

  registerIpcHandlers(walletManager);
  initAutoUpdater();
  createWindow();

  const settingsRes = walletManager.getSettings();
  if (settingsRes.success && settingsRes.data?.checkUpdatesOnStart) {
    checkUpdatesOnStartup(true);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  walletManager.lock();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  walletManager.lock();
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});
