import { app } from 'electron';
import { autoUpdater } from 'electron-updater';
import { APP_VERSION, UPDATE_MANIFEST_URL } from '../../shared/version';
import type { UpdateInfo } from '../../shared/types';

let pendingVersion: string | undefined;
let downloadProgress = 0;

function compareSemver(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

async function checkRemoteManifest(): Promise<{ version: string; notes?: string } | null> {
  if (!UPDATE_MANIFEST_URL) return null;
  try {
    const res = await fetch(UPDATE_MANIFEST_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: string; notes?: string };
    if (!data.version) return null;
    return { version: data.version, notes: data.notes };
  } catch {
    return null;
  }
}

export function initAutoUpdater(onStatus?: (msg: string) => void): void {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => onStatus?.('Checking for updates…'));
  autoUpdater.on('update-available', (info) => {
    pendingVersion = info.version;
    onStatus?.(`Update available: ${info.version}`);
  });
  autoUpdater.on('update-not-available', () => onStatus?.('Latest version installed'));
  autoUpdater.on('error', (err) => onStatus?.(err.message));
  autoUpdater.on('download-progress', (p) => {
    downloadProgress = p.percent;
  });
  autoUpdater.on('update-downloaded', (info) => {
    pendingVersion = info.version;
    onStatus?.(`Update ${info.version} downloaded — restart to install`);
  });
}

export async function checkForUpdates(): Promise<UpdateInfo> {
  if (process.env.NODE_ENV === 'development') {
    return {
      available: false,
      version: APP_VERSION,
      message: 'Development build — updates disabled',
    };
  }

  const remote = await checkRemoteManifest();
  if (remote && compareSemver(remote.version, APP_VERSION) > 0) {
    return {
      available: true,
      version: remote.version,
      message: remote.notes || `Version ${remote.version} is available`,
      downloadUrl: UPDATE_MANIFEST_URL,
    };
  }

  try {
    const result = await autoUpdater.checkForUpdates();
    const latest = result?.updateInfo?.version;
    if (latest && compareSemver(latest, APP_VERSION) > 0) {
      return {
        available: true,
        version: latest,
        message: `Version ${latest} is available via auto-updater`,
      };
    }
  } catch {
    // No publish feed configured — fall through
  }

  return {
    available: false,
    version: APP_VERSION,
    message: 'Latest version installed',
  };
}

export async function downloadUpdate(): Promise<UpdateInfo> {
  if (process.env.NODE_ENV === 'development') {
    return { available: false, message: 'Development build' };
  }
  try {
    await autoUpdater.downloadUpdate();
    return {
      available: true,
      version: pendingVersion,
      message: `Downloading… ${Math.round(downloadProgress)}%`,
      downloaded: downloadProgress >= 100,
    };
  } catch (err) {
    return {
      available: false,
      message: err instanceof Error ? err.message : 'Download failed',
    };
  }
}

export function installUpdate(): void {
  if (process.env.NODE_ENV === 'development') return;
  autoUpdater.quitAndInstall(false, true);
}

export function checkUpdatesOnStartup(enabled: boolean): void {
  if (!enabled || process.env.NODE_ENV === 'development') return;
  setTimeout(() => {
    checkForUpdates().catch(() => undefined);
  }, 5000);
}

export function getAppVersion(): string {
  return app.getVersion() || APP_VERSION;
}
