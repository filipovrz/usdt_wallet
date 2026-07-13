import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc';
import {
  createWalletSchema,
  importWalletSchema,
  unlockSchema,
  sendSchema,
  addressBookSchema,
  settingsSchema,
  changePasswordSchema,
  multisigSchema,
} from '../shared/schemas';
import type { WalletManager } from './wallet-manager';
import type { NetworkId, FeeTier, SendAssetType, HardwareDevice } from '../shared/types';

export function registerIpcHandlers(wallet: WalletManager): void {
  ipcMain.handle(IPC_CHANNELS.GET_SESSION, () => ({ success: true, data: wallet.getSession() }));
  ipcMain.handle(IPC_CHANNELS.TOUCH_ACTIVITY, () => { wallet.touchActivity(); return { success: true }; });

  ipcMain.handle(IPC_CHANNELS.CREATE_WALLET, async (_e, payload: unknown) => {
    const p = createWalletSchema.safeParse(payload);
    if (!p.success) return { success: false, error: 'VALIDATION_ERROR' };
    return wallet.createWallet(p.data.name, p.data.password, p.data.passphrase);
  });

  ipcMain.handle(IPC_CHANNELS.FINALIZE_WALLET_SETUP, async (_e, payload: unknown) => {
    const p = unlockSchema.safeParse(payload);
    if (!p.success) return { success: false, error: 'VALIDATION_ERROR' };
    return wallet.finalizeWalletSetup(p.data.password);
  });

  ipcMain.handle(IPC_CHANNELS.IMPORT_WALLET, async (_e, payload: unknown) => {
    const p = importWalletSchema.safeParse(payload);
    if (!p.success) return { success: false, error: 'VALIDATION_ERROR' };
    return wallet.importWallet(p.data.name, p.data.mnemonic, p.data.password, p.data.passphrase);
  });

  ipcMain.handle(IPC_CHANNELS.UNLOCK, async (_e, payload: unknown) => {
    const p = unlockSchema.safeParse(payload);
    if (!p.success) return { success: false, error: 'VALIDATION_ERROR' };
    return wallet.unlock(p.data.password);
  });

  ipcMain.handle(IPC_CHANNELS.LOCK, () => wallet.lock());

  ipcMain.handle(IPC_CHANNELS.CHANGE_PASSWORD, async (_e, payload: unknown) => {
    const p = changePasswordSchema.safeParse(payload);
    if (!p.success) return { success: false, error: 'VALIDATION_ERROR' };
    return wallet.changePassword(p.data.currentPassword, p.data.newPassword);
  });

  ipcMain.handle(IPC_CHANNELS.ADD_ACCOUNT, async (_e, name: string) => {
    if (!name) return { success: false, error: 'VALIDATION_ERROR' };
    return wallet.addAccount(name);
  });

  ipcMain.handle(IPC_CHANNELS.RENAME_ACCOUNT, async (_e, payload: { accountId: string; name: string }) => {
    return wallet.renameAccount(payload.accountId, payload.name);
  });

  ipcMain.handle(IPC_CHANNELS.REMOVE_ACCOUNT, async (_e, accountId: string) => {
    return wallet.removeAccount(accountId);
  });

  ipcMain.handle(IPC_CHANNELS.GET_MNEMONIC, async (_e, payload: { password: string }) => {
    if (!payload?.password) return { success: false, error: 'VALIDATION_ERROR' };
    return wallet.getMnemonic(payload.password);
  });

  ipcMain.handle(IPC_CHANNELS.GET_BALANCE, async (_e, payload: { accountId: string; network: NetworkId }) => {
    if (!payload?.accountId || !payload?.network) return { success: false, error: 'VALIDATION_ERROR' };
    return wallet.getBalance(payload.accountId, payload.network);
  });

  ipcMain.handle(IPC_CHANNELS.GET_TRON_RESOURCES, async (_e, accountId: string) => {
    if (!accountId) return { success: false, error: 'VALIDATION_ERROR' };
    return wallet.getTronResources(accountId);
  });

  ipcMain.handle(IPC_CHANNELS.GET_FEE_ESTIMATE, async (_e, payload: { network: NetworkId; accountId: string }) => {
    if (!payload?.network || !payload?.accountId) return { success: false, error: 'VALIDATION_ERROR' };
    return wallet.getFeeEstimate(payload.network, payload.accountId);
  });

  ipcMain.handle(IPC_CHANNELS.GET_PRICES, () => wallet.getPrices());

  ipcMain.handle(
    IPC_CHANNELS.SEND_PREVIEW,
    async (
      _e,
      payload: {
        accountId: string;
        network: NetworkId;
        to: string;
        amount: string;
        feeTier?: FeeTier;
        assetType?: SendAssetType;
      }
    ) => {
      if (!payload?.accountId || !payload?.network || !payload?.to || !payload?.amount) {
        return { success: false, error: 'VALIDATION_ERROR' };
      }
      return wallet.sendPreview(
        payload.accountId,
        payload.network,
        payload.to,
        payload.amount,
        payload.feeTier,
        payload.assetType || 'usdt'
      );
    }
  );

  ipcMain.handle(IPC_CHANNELS.SEND, async (_e, payload: unknown) => {
    const p = sendSchema.safeParse(payload);
    if (!p.success) return { success: false, error: 'VALIDATION_ERROR' };
    return wallet.send(
      p.data.accountId,
      p.data.network,
      p.data.to,
      p.data.amount,
      p.data.password,
      p.data.feeTier,
      p.data.assetType || 'usdt'
    );
  });

  ipcMain.handle(IPC_CHANNELS.GET_TRANSACTIONS, (_e, accountId?: string) => wallet.getTransactions(accountId));

  ipcMain.handle(IPC_CHANNELS.REFRESH_TRANSACTIONS, async (_e, accountId: string) => {
    if (!accountId) return { success: false, error: 'VALIDATION_ERROR' };
    return wallet.refreshTransactions(accountId);
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_TX_NOTE, async (_e, payload: { txId: string; note: string }) => {
    if (!payload?.txId) return { success: false, error: 'VALIDATION_ERROR' };
    return wallet.updateTransactionNote(payload.txId, payload.note || '');
  });

  ipcMain.handle(IPC_CHANNELS.GET_ADDRESS_BOOK, () => wallet.getAddressBook());

  ipcMain.handle(IPC_CHANNELS.ADD_ADDRESS_BOOK, async (_e, payload: unknown) => {
    const p = addressBookSchema.safeParse(payload);
    if (!p.success) return { success: false, error: 'VALIDATION_ERROR' };
    return wallet.addAddressBook(p.data);
  });

  ipcMain.handle(IPC_CHANNELS.REMOVE_ADDRESS_BOOK, async (_e, id: string) => {
    if (!id) return { success: false, error: 'VALIDATION_ERROR' };
    return wallet.removeAddressBook(id);
  });

  ipcMain.handle(IPC_CHANNELS.GET_MULTISIG, () => wallet.getMultisigPolicies());

  ipcMain.handle(IPC_CHANNELS.ADD_MULTISIG, async (_e, payload: unknown) => {
    const p = multisigSchema.safeParse(payload);
    if (!p.success) return { success: false, error: 'VALIDATION_ERROR' };
    return wallet.addMultisigPolicy(p.data);
  });

  ipcMain.handle(IPC_CHANNELS.REMOVE_MULTISIG, async (_e, id: string) => {
    if (!id) return { success: false, error: 'VALIDATION_ERROR' };
    return wallet.removeMultisigPolicy(id);
  });

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => wallet.getSettings());

  ipcMain.handle(IPC_CHANNELS.UPDATE_SETTINGS, async (_e, payload: unknown) => {
    const p = settingsSchema.safeParse(payload);
    if (!p.success) return { success: false, error: 'VALIDATION_ERROR' };
    return wallet.updateSettings(p.data);
  });

  ipcMain.handle(IPC_CHANNELS.VALIDATE_ADDRESS, (_e, payload: { network: NetworkId; address: string }) => {
    if (!payload?.network || !payload?.address) return { success: false, error: 'VALIDATION_ERROR' };
    return wallet.validateAddress(payload.network, payload.address);
  });

  ipcMain.handle(IPC_CHANNELS.GENERATE_QR, async (_e, text: string) => {
    if (!text) return { success: false, error: 'VALIDATION_ERROR' };
    return wallet.generateQR(text);
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_VAULT, () => wallet.deleteVault());

  ipcMain.handle(IPC_CHANNELS.EXPORT_VAULT, () => ({ success: true, data: { path: wallet.exportVaultPath() } }));

  ipcMain.handle(IPC_CHANNELS.EXPORT_BACKUP, () => wallet.exportEncryptedBackup());

  ipcMain.handle(IPC_CHANNELS.CHECK_UPDATES, () => wallet.checkForUpdates());

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_UPDATE, () => wallet.downloadUpdate());

  ipcMain.handle(IPC_CHANNELS.INSTALL_UPDATE, () => wallet.installUpdate());

  ipcMain.handle(IPC_CHANNELS.SCAN_HARDWARE, () => wallet.scanHardwareDevices());

  ipcMain.handle(
    IPC_CHANNELS.GET_HARDWARE_ADDRESS,
    async (_e, payload: { device: HardwareDevice; network: 'tron' | 'ethereum' }) => {
      if (!payload?.device || !payload?.network) return { success: false, error: 'VALIDATION_ERROR' };
      return wallet.getHardwareAddress(payload.device, payload.network);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DEPLOY_MULTISIG,
    async (_e, payload: { policyId: string; password: string }) => {
      if (!payload?.policyId || !payload?.password) return { success: false, error: 'VALIDATION_ERROR' };
      return wallet.deployMultisigPolicy(payload.policyId, payload.password);
    }
  );
}
