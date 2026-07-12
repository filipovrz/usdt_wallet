import { execFile } from 'child_process';
import { promisify } from 'util';
import type { HardwareDevice, HardwareAddressResult } from '../../shared/types';

const execFileAsync = promisify(execFile);

export type { HardwareDevice, HardwareAddressResult };

const LEDGER_VID = 0x2c97;
const TREZOR_VID = 0x534c;

async function scanViaLedgerHid(): Promise<HardwareDevice[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Transport = require('@ledgerhq/hw-transport-node-hid').default as {
      list: () => Promise<Array<{ path?: string }>>;
    };
    const listed = await Transport.list();
    return listed.map((d, i) => ({
      id: d.path || `ledger-${i}`,
      type: 'ledger' as const,
      name: 'Ledger Nano',
      path: d.path,
    }));
  } catch {
    return [];
  }
}

async function scanViaWindowsPnP(): Promise<HardwareDevice[]> {
  if (process.platform !== 'win32') return [];
  try {
    const ps = [
      'Get-PnpDevice -PresentOnly | Where-Object { $_.InstanceId -match "VID_2C97|VID_534C" }',
      '| Select-Object FriendlyName, InstanceId | ConvertTo-Json -Compress',
    ].join(' ');
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', ps], {
      timeout: 8000,
    });
    const trimmed = stdout.trim();
    if (!trimmed) return [];
    const parsed = JSON.parse(trimmed) as
      | { FriendlyName?: string; InstanceId?: string }
      | Array<{ FriendlyName?: string; InstanceId?: string }>;
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    return rows.map((row, i) => {
      const instance = row.InstanceId || '';
      const isTrezor = instance.toUpperCase().includes('VID_534C');
      return {
        id: instance || `usb-${i}`,
        type: isTrezor ? ('trezor' as const) : ('ledger' as const),
        name: row.FriendlyName || (isTrezor ? 'Trezor Device' : 'Ledger Device'),
        path: instance,
      };
    });
  } catch {
    return [];
  }
}

export async function scanHardwareDevices(): Promise<HardwareDevice[]> {
  const ledger = await scanViaLedgerHid();
  if (ledger.length > 0) return ledger;

  const pnp = await scanViaWindowsPnP();
  if (pnp.length > 0) return pnp;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const hid = require('node-hid') as { devices: () => Array<{ vendorId: number; product?: string; path: string }> };
    const devices = hid.devices();
    const found: HardwareDevice[] = [];
    for (const d of devices) {
      if (d.vendorId === LEDGER_VID) {
        found.push({ id: d.path, type: 'ledger', name: d.product || 'Ledger', path: d.path });
      } else if (d.vendorId === TREZOR_VID) {
        found.push({ id: d.path, type: 'trezor', name: d.product || 'Trezor', path: d.path });
      }
    }
    return found;
  } catch {
    return [];
  }
}

export async function getLedgerAddress(
  devicePath: string | undefined,
  network: 'tron' | 'ethereum'
): Promise<HardwareAddressResult> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Transport = require('@ledgerhq/hw-transport-node-hid').default as {
    open: (path?: string) => Promise<{ close: () => Promise<void> }>;
    create: () => Promise<{ close: () => Promise<void> }>;
  };

  const transport = devicePath ? await Transport.open(devicePath) : await Transport.create();
  try {
    if (network === 'tron') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Trx = require('@ledgerhq/hw-app-trx').default as new (t: unknown) => {
        getAddress: (path: string, show: boolean) => Promise<{ address: string }>;
      };
      const app = new Trx(transport);
      const path = "44'/195'/0'/0/0";
      const { address } = await app.getAddress(path, false);
      return { address, path, network };
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Eth = require('@ledgerhq/hw-app-eth').default as new (t: unknown) => {
      getAddress: (path: string, show: boolean, chain?: boolean) => Promise<{ address: string }>;
    };
    const app = new Eth(transport);
    const path = "44'/60'/0'/0/0";
    const { address } = await app.getAddress(path, false, true);
    return { address, path, network: 'ethereum' };
  } finally {
    await transport.close();
  }
}

export async function getHardwareAddress(
  device: HardwareDevice,
  network: 'tron' | 'ethereum'
): Promise<HardwareAddressResult> {
  if (device.type === 'trezor') {
    throw new Error('TREZOR_USE_SUITE');
  }
  if (device.type !== 'ledger') {
    throw new Error('UNSUPPORTED_DEVICE');
  }
  return getLedgerAddress(device.path, network);
}
