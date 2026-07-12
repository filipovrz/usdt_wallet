import { app, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import Store from 'electron-store';
import QRCode from 'qrcode';
import {
  DEFAULT_SETTINGS,
  MAX_LOGIN_ATTEMPTS,
  LOCKOUT_DURATION_MS,
  VAULT_VERSION,
  ALL_NETWORK_IDS,
  getAccountAddress,
  type VaultMeta,
  type WalletAccount,
  type AddressBookEntry,
  type TransactionRecord,
  type AppSettings,
  type SessionInfo,
  type SendPreview,
  type BalanceInfo,
  type ApiResponse,
  type NetworkId,
  type MultisigPolicy,
  type FeeTier,
  type SendAssetType,
  type TronResources,
  type FeeEstimate,
  type UpdateInfo,
  type PriceInfo,
  type HardwareDevice,
  type HardwareAddressResult,
} from '../shared/types';
import {
  encryptVaultWithPassphrase,
  decryptVaultFull,
  type EncryptedVault,
} from './crypto/vault';
import {
  generateMnemonic,
  validateMnemonic,
  normalizeMnemonic,
  createAccountFromMnemonic,
  deriveKeysFromMnemonic,
} from './crypto/keys';
import { getNetworkConfig } from '../shared/networks';
import { BlockchainService } from './services/blockchain';
import { PriceService } from './services/price-service';
import {
  scanHardwareDevices,
  getHardwareAddress,
} from './services/hardware-wallet';
import * as updateService from './services/update-service';

interface SecurityState {
  failedAttempts: number;
  lockedUntil?: number;
}

function migrateMeta(meta: VaultMeta): VaultMeta {
  return {
    ...meta,
    version: VAULT_VERSION,
    multisigPolicies: meta.multisigPolicies || [],
    settings: { ...DEFAULT_SETTINGS, ...meta.settings },
    transactions: (meta.transactions || []).map((t) => ({ ...t })),
  };
}

export class WalletManager {
  private meta: VaultMeta | null = null;
  private mnemonic: string | null = null;
  private passphrase = '';
  private sessionPassword: string | null = null;
  private unlocked = false;
  private lastActivity = Date.now();
  private autoLockTimer: NodeJS.Timeout | null = null;
  private blockchain = new BlockchainService(DEFAULT_SETTINGS);
  private prices = new PriceService();
  private store: Store<{ vault?: EncryptedVault; security: SecurityState }>;
  private vaultPath: string;
  private pendingSetup: {
    meta: VaultMeta;
    mnemonic: string;
    passphrase: string;
    password: string;
  } | null = null;

  constructor() {
    const userData = app.getPath('userData');
    this.vaultPath = path.join(userData, 'vault.enc.json');
    this.store = new Store<{ vault?: EncryptedVault; security: SecurityState }>({
      name: 'usdt-wallet-config',
      cwd: userData,
      encryptionKey: 'usdt-wallet-local-encryption-v1',
      defaults: { security: { failedAttempts: 0 } as SecurityState },
    });
  }

  private get hasVaultFile(): boolean {
    return fs.existsSync(this.vaultPath) || !!this.store.get('vault');
  }

  private loadEncryptedVault(): EncryptedVault | null {
    if (fs.existsSync(this.vaultPath)) {
      return JSON.parse(fs.readFileSync(this.vaultPath, 'utf8')) as EncryptedVault;
    }
    return this.store.get('vault') || null;
  }

  private saveEncryptedVault(vault: EncryptedVault): void {
    fs.writeFileSync(this.vaultPath, JSON.stringify(vault, null, 2), { mode: 0o600 });
    this.store.set('vault', vault);
  }

  private clearSessionSecrets(): void {
    this.mnemonic = null;
    this.passphrase = '';
    this.sessionPassword = null;
    this.unlocked = false;
    if (this.autoLockTimer) {
      clearInterval(this.autoLockTimer);
      this.autoLockTimer = null;
    }
  }

  private startAutoLockTimer(): void {
    if (this.autoLockTimer) clearInterval(this.autoLockTimer);
    this.autoLockTimer = setInterval(() => {
      if (!this.unlocked || !this.meta) return;
      if (Date.now() - this.lastActivity >= this.meta.settings.autoLockMinutes * 60 * 1000) {
        this.lock();
      }
    }, 10000);
  }

  private syncBlockchainSettings(): void {
    if (this.meta) this.blockchain.updateSettings(this.meta.settings);
  }

  private async persistMeta(): Promise<void> {
    if (!this.meta || !this.mnemonic || !this.sessionPassword) return;
    const encrypted = await encryptVaultWithPassphrase(
      this.meta,
      this.mnemonic,
      this.passphrase,
      this.sessionPassword
    );
    this.saveEncryptedVault(encrypted);
  }

  touchActivity(): void {
    this.lastActivity = Date.now();
  }

  getSession(): SessionInfo {
    const security = this.store.get('security') || { failedAttempts: 0 };
    return {
      unlocked: this.unlocked,
      hasVault: this.hasVaultFile,
      accounts: this.meta?.accounts || [],
      settings: this.meta?.settings || DEFAULT_SETTINGS,
      failedAttempts: security.failedAttempts,
      lockedUntil: security.lockedUntil,
    };
  }

  private checkLockout(): ApiResponse {
    const security = this.store.get('security') || { failedAttempts: 0 };
    if (security.lockedUntil && Date.now() < security.lockedUntil) {
      return { success: false, error: `LOCKED:${Math.ceil((security.lockedUntil - Date.now()) / 60000)}` };
    }
    return { success: true };
  }

  private recordFailedAttempt(): void {
    const security = this.store.get('security') || { failedAttempts: 0 };
    const failedAttempts = security.failedAttempts + 1;
    this.store.set('security', {
      failedAttempts,
      lockedUntil: failedAttempts >= MAX_LOGIN_ATTEMPTS ? Date.now() + LOCKOUT_DURATION_MS : undefined,
    });
  }

  private resetFailedAttempts(): void {
    this.store.set('security', { failedAttempts: 0 });
  }

  private makeAccount(name: string, mnemonic: string, passphrase = ''): WalletAccount {
    const base = createAccountFromMnemonic(name, mnemonic, passphrase);
    return { id: uuidv4(), ...base, createdAt: new Date().toISOString() };
  }

  private async initSession(mnemonic: string, passphrase: string, password: string): Promise<void> {
    this.mnemonic = mnemonic;
    this.passphrase = passphrase;
    this.sessionPassword = password;
    this.unlocked = true;
    this.lastActivity = Date.now();
    this.resetFailedAttempts();
    this.syncBlockchainSettings();
    await this.backfillDerivedAddresses(mnemonic, passphrase);
    this.startAutoLockTimer();
  }

  /** Re-derive chain addresses when vault metadata is stale or from an older wallet version. */
  private async backfillDerivedAddresses(mnemonic: string, passphrase: string): Promise<void> {
    if (!this.meta) return;
    const keys = deriveKeysFromMnemonic(mnemonic, passphrase);
    let changed = false;
    this.meta.accounts = this.meta.accounts.map((acc) => {
      let next = acc;
      if (!acc.solanaAddress || acc.solanaAddress !== keys.solanaAddress) {
        changed = true;
        next = { ...next, solanaAddress: keys.solanaAddress };
      }
      if (acc.tronAddress !== keys.tronAddress) {
        changed = true;
        next = { ...next, tronAddress: keys.tronAddress };
      }
      return next;
    });
    if (changed) await this.persistMeta();
  }

  async createWallet(
    name: string,
    password: string,
    passphrase = ''
  ): Promise<ApiResponse<{ mnemonic: string; account: WalletAccount }>> {
    try {
      if (this.hasVaultFile) return { success: false, error: 'VAULT_EXISTS' };
      const mnemonic = generateMnemonic();
      const account = this.makeAccount(name, mnemonic, passphrase);
      this.pendingSetup = {
        meta: {
          version: VAULT_VERSION,
          createdAt: new Date().toISOString(),
          accounts: [account],
          addressBook: [],
          transactions: [],
          multisigPolicies: [],
          settings: { ...DEFAULT_SETTINGS },
        },
        mnemonic,
        passphrase,
        password,
      };
      return { success: true, data: { mnemonic, account } };
    } catch (e) {
      console.error('createWallet failed:', e);
      return { success: false, error: e instanceof Error ? e.message : 'CREATE_WALLET_FAILED' };
    }
  }

  async finalizeWalletSetup(password: string): Promise<ApiResponse> {
    if (!this.pendingSetup) return { success: false, error: 'NO_PENDING_WALLET' };
    if (password !== this.pendingSetup.password) return { success: false, error: 'INVALID_PASSWORD' };
    if (this.hasVaultFile) return { success: false, error: 'VAULT_EXISTS' };
    const { meta, mnemonic, passphrase, password: setupPassword } = this.pendingSetup;
    try {
      const encrypted = await encryptVaultWithPassphrase(meta, mnemonic, passphrase, setupPassword);
      this.saveEncryptedVault(encrypted);
      this.meta = meta;
      this.pendingSetup = null;
      await this.initSession(mnemonic, passphrase, setupPassword);
      return { success: true };
    } catch (e) {
      console.error('finalizeWalletSetup failed:', e);
      return { success: false, error: 'CREATE_WALLET_FAILED' };
    }
  }

  async importWallet(
    name: string,
    mnemonicInput: string,
    password: string,
    passphrase = ''
  ): Promise<ApiResponse<{ account: WalletAccount }>> {
    if (this.hasVaultFile) return { success: false, error: 'VAULT_EXISTS' };
    const mnemonic = normalizeMnemonic(mnemonicInput);
    if (!validateMnemonic(mnemonic)) return { success: false, error: 'INVALID_MNEMONIC' };
    const account = this.makeAccount(name, mnemonic, passphrase);
    this.meta = {
      version: VAULT_VERSION,
      createdAt: new Date().toISOString(),
      accounts: [account],
      addressBook: [],
      transactions: [],
      multisigPolicies: [],
      settings: { ...DEFAULT_SETTINGS },
    };
    const encrypted = await encryptVaultWithPassphrase(this.meta, mnemonic, passphrase, password);
    this.saveEncryptedVault(encrypted);
    await this.initSession(mnemonic, passphrase, password);
    return { success: true, data: { account } };
  }

  async unlock(password: string): Promise<ApiResponse> {
    const lockout = this.checkLockout();
    if (!lockout.success) return lockout;
    const vault = this.loadEncryptedVault();
    if (!vault) return { success: false, error: 'NO_VAULT' };
    try {
      const { meta, mnemonic, passphrase } = await decryptVaultFull(vault, password);
      this.meta = migrateMeta(meta);
      await this.initSession(mnemonic, passphrase, password);
      return { success: true };
    } catch {
      this.recordFailedAttempt();
      return { success: false, error: 'INVALID_PASSWORD' };
    }
  }

  lock(): ApiResponse {
    this.clearSessionSecrets();
    return { success: true };
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse> {
    if (!this.unlocked || !this.meta || !this.mnemonic) return { success: false, error: 'LOCKED_WALLET' };
    try {
      await decryptVaultFull(this.loadEncryptedVault()!, currentPassword);
    } catch {
      return { success: false, error: 'INVALID_PASSWORD' };
    }
    if (newPassword.length < 8) return { success: false, error: 'PASSWORD_TOO_SHORT' };
    this.sessionPassword = newPassword;
    await this.persistMeta();
    return { success: true };
  }

  async addAccount(name: string): Promise<ApiResponse<WalletAccount>> {
    if (!this.unlocked || !this.meta || !this.mnemonic) return { success: false, error: 'LOCKED_WALLET' };
    const account = this.makeAccount(name, this.mnemonic, this.passphrase);
    this.meta.accounts.push(account);
    await this.persistMeta();
    return { success: true, data: account };
  }

  async getMnemonic(password: string): Promise<ApiResponse<{ mnemonic: string; passphrase?: string }>> {
    if (!this.unlocked) return { success: false, error: 'LOCKED_WALLET' };
    const vault = this.loadEncryptedVault();
    if (!vault) return { success: false, error: 'NO_VAULT' };
    try {
      const { mnemonic, passphrase } = await decryptVaultFull(vault, password);
      return { success: true, data: { mnemonic, passphrase: passphrase || undefined } };
    } catch {
      return { success: false, error: 'INVALID_PASSWORD' };
    }
  }

  async exportEncryptedBackup(): Promise<ApiResponse<{ path: string }>> {
    if (!this.unlocked) return { success: false, error: 'LOCKED_WALLET' };
    const result = await dialog.showSaveDialog({
      title: 'Export Encrypted Backup',
      defaultPath: `usdt-wallet-backup-${Date.now()}.enc.json`,
      filters: [{ name: 'Encrypted Backup', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return { success: false, error: 'CANCELLED' };
    fs.copyFileSync(this.vaultPath, result.filePath);
    return { success: true, data: { path: result.filePath } };
  }

  async getBalance(accountId: string, network: NetworkId): Promise<ApiResponse<BalanceInfo>> {
    if (!this.unlocked || !this.meta) return { success: false, error: 'LOCKED_WALLET' };
    if (this.meta.settings.offlineMode) return { success: false, error: 'OFFLINE_MODE' };
    this.touchActivity();
    const account = this.meta.accounts.find((a) => a.id === accountId);
    if (!account) return { success: false, error: 'ACCOUNT_NOT_FOUND' };
    try {
      const balance = await this.blockchain.getBalance(network, getAccountAddress(account, network));
      const prices = await this.prices.getPrices(this.meta.settings);
      const tokenPrice = network === 'solana' ? prices.hnt : prices.usdt;
      balance.usdValue = this.prices.formatUsdValue(balance.usdt, tokenPrice, this.meta.settings.currency);
      return { success: true, data: balance };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'BALANCE_ERROR' };
    }
  }

  async getTronResources(accountId: string): Promise<ApiResponse<TronResources>> {
    if (!this.unlocked || !this.meta) return { success: false, error: 'LOCKED_WALLET' };
    const account = this.meta.accounts.find((a) => a.id === accountId);
    if (!account) return { success: false, error: 'ACCOUNT_NOT_FOUND' };
    const resources = await this.blockchain.getTronResources(account.tronAddress);
    return { success: true, data: resources };
  }

  async getFeeEstimate(network: NetworkId, accountId: string): Promise<ApiResponse<FeeEstimate>> {
    if (!this.unlocked || !this.meta) return { success: false, error: 'LOCKED_WALLET' };
    const account = this.meta.accounts.find((a) => a.id === accountId);
    if (!account) return { success: false, error: 'ACCOUNT_NOT_FOUND' };
    const from = getAccountAddress(account, network);
    const fees = await this.blockchain.estimateFees(network, from, from);
    return { success: true, data: fees };
  }

  async getPrices(): Promise<ApiResponse<PriceInfo>> {
    const settings = this.meta?.settings || DEFAULT_SETTINGS;
    return { success: true, data: await this.prices.getPrices(settings) };
  }

  async sendPreview(
    accountId: string,
    network: NetworkId,
    to: string,
    amount: string,
    feeTier?: FeeTier,
    assetType: SendAssetType = 'usdt'
  ): Promise<ApiResponse<SendPreview>> {
    if (!this.unlocked || !this.meta || !this.mnemonic) return { success: false, error: 'LOCKED_WALLET' };
    if (this.meta.settings.offlineMode) return { success: false, error: 'OFFLINE_MODE' };
    if (!this.blockchain.validateAddress(network, to)) return { success: false, error: 'INVALID_ADDRESS' };
    try {
      const preview = await this.blockchain.previewSend(
        network,
        this.mnemonic,
        to,
        amount,
        this.passphrase,
        feeTier || this.meta.settings.defaultFeeTier,
        assetType
      );
      return { success: true, data: preview };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'PREVIEW_ERROR' };
    }
  }

  async send(
    accountId: string,
    network: NetworkId,
    to: string,
    amount: string,
    password: string,
    feeTier?: FeeTier,
    assetType: SendAssetType = 'usdt'
  ): Promise<ApiResponse<{ hash: string }>> {
    if (!this.unlocked || !this.meta) return { success: false, error: 'LOCKED_WALLET' };
    if (this.meta.settings.offlineMode) return { success: false, error: 'OFFLINE_MODE' };
    const vault = this.loadEncryptedVault();
    if (!vault) return { success: false, error: 'NO_VAULT' };
    try {
      await decryptVaultFull(vault, password);
    } catch {
      return { success: false, error: 'INVALID_PASSWORD' };
    }
    if (!this.mnemonic) return { success: false, error: 'LOCKED_WALLET' };
    this.touchActivity();
    const account = this.meta.accounts.find((a) => a.id === accountId);
    if (!account) return { success: false, error: 'ACCOUNT_NOT_FOUND' };
    if (!this.blockchain.validateAddress(network, to)) return { success: false, error: 'INVALID_ADDRESS' };
    try {
      const result = await this.blockchain.send(
        network,
        this.mnemonic,
        to,
        amount,
        this.passphrase,
        feeTier || this.meta.settings.defaultFeeTier,
        assetType
      );
      this.meta.transactions.unshift({
        id: uuidv4(),
        hash: result.hash,
        network,
        direction: 'out',
        amount,
        fee: result.fee,
        from: result.from,
        to,
        timestamp: Date.now(),
        status: 'confirmed',
        accountId,
        assetSymbol: result.assetSymbol,
      });
      await this.persistMeta();
      return { success: true, data: { hash: result.hash } };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'SEND_ERROR' };
    }
  }

  async updateTransactionNote(txId: string, note: string): Promise<ApiResponse> {
    if (!this.unlocked || !this.meta) return { success: false, error: 'LOCKED_WALLET' };
    const tx = this.meta.transactions.find((t) => t.id === txId);
    if (!tx) return { success: false, error: 'NOT_FOUND' };
    tx.note = note;
    await this.persistMeta();
    return { success: true };
  }

  getTransactions(accountId?: string): ApiResponse<TransactionRecord[]> {
    if (!this.unlocked || !this.meta) return { success: false, error: 'LOCKED_WALLET' };
    let txs = this.meta.transactions;
    if (accountId) txs = txs.filter((t) => t.accountId === accountId);
    return { success: true, data: txs };
  }

  async refreshTransactions(accountId: string): Promise<ApiResponse<TransactionRecord[]>> {
    if (!this.unlocked || !this.meta) return { success: false, error: 'LOCKED_WALLET' };
    if (this.meta.settings.offlineMode) return { success: true, data: this.meta.transactions };
    const account = this.meta.accounts.find((a) => a.id === accountId);
    if (!account) return { success: false, error: 'ACCOUNT_NOT_FOUND' };
    const allTxs = [...this.meta.transactions];
    for (const network of ALL_NETWORK_IDS) {
      const remote = await this.blockchain.fetchTransactions(network, getAccountAddress(account, network));
      for (const tx of remote) {
        if (!allTxs.find((t) => t.hash === tx.hash)) {
          allTxs.push({
            id: uuidv4(),
            hash: tx.hash,
            network,
            direction: tx.direction,
            amount: tx.amount,
            from: tx.from,
            to: tx.to,
            timestamp: tx.timestamp,
            status: 'confirmed',
            accountId,
            assetSymbol: tx.assetSymbol || getNetworkConfig(network, this.meta!.settings.testnetMode).symbol,
          });
        }
      }
    }
    allTxs.sort((a, b) => b.timestamp - a.timestamp);
    this.meta.transactions = allTxs.slice(0, 500);
    await this.persistMeta();
    return { success: true, data: this.meta.transactions };
  }

  getAddressBook(): ApiResponse<AddressBookEntry[]> {
    if (!this.unlocked || !this.meta) return { success: false, error: 'LOCKED_WALLET' };
    return { success: true, data: this.meta.addressBook };
  }

  async addAddressBook(entry: Omit<AddressBookEntry, 'id' | 'createdAt'>): Promise<ApiResponse<AddressBookEntry>> {
    if (!this.unlocked || !this.meta) return { success: false, error: 'LOCKED_WALLET' };
    if (!this.blockchain.validateAddress(entry.network, entry.address)) return { success: false, error: 'INVALID_ADDRESS' };
    const newEntry = { ...entry, id: uuidv4(), createdAt: new Date().toISOString() };
    this.meta.addressBook.push(newEntry);
    await this.persistMeta();
    return { success: true, data: newEntry };
  }

  async removeAddressBook(id: string): Promise<ApiResponse> {
    if (!this.unlocked || !this.meta) return { success: false, error: 'LOCKED_WALLET' };
    this.meta.addressBook = this.meta.addressBook.filter((e) => e.id !== id);
    await this.persistMeta();
    return { success: true };
  }

  getMultisigPolicies(): ApiResponse<MultisigPolicy[]> {
    if (!this.unlocked || !this.meta) return { success: false, error: 'LOCKED_WALLET' };
    return { success: true, data: this.meta.multisigPolicies };
  }

  async addMultisigPolicy(policy: Omit<MultisigPolicy, 'id' | 'createdAt'>): Promise<ApiResponse<MultisigPolicy>> {
    if (!this.unlocked || !this.meta) return { success: false, error: 'LOCKED_WALLET' };
    if (policy.threshold > policy.totalSigners || policy.threshold < 1) return { success: false, error: 'INVALID_THRESHOLD' };
    const entry: MultisigPolicy = { ...policy, id: uuidv4(), createdAt: new Date().toISOString() };
    this.meta.multisigPolicies.push(entry);
    await this.persistMeta();
    return { success: true, data: entry };
  }

  async removeMultisigPolicy(id: string): Promise<ApiResponse> {
    if (!this.unlocked || !this.meta) return { success: false, error: 'LOCKED_WALLET' };
    this.meta.multisigPolicies = this.meta.multisigPolicies.filter((p) => p.id !== id);
    await this.persistMeta();
    return { success: true };
  }

  getSettings(): ApiResponse<AppSettings> {
    return { success: true, data: this.meta?.settings || DEFAULT_SETTINGS };
  }

  async updateSettings(settings: AppSettings): Promise<ApiResponse<AppSettings>> {
    if (!this.meta) {
      this.meta = {
        version: VAULT_VERSION,
        createdAt: new Date().toISOString(),
        accounts: [],
        addressBook: [],
        transactions: [],
        multisigPolicies: [],
        settings,
      };
    } else {
      this.meta.settings = settings;
    }
    this.syncBlockchainSettings();
    if (this.unlocked) {
      this.startAutoLockTimer();
      await this.persistMeta();
    }
    return { success: true, data: settings };
  }

  validateAddress(network: NetworkId, address: string): ApiResponse<{ valid: boolean }> {
    return { success: true, data: { valid: this.blockchain.validateAddress(network, address) } };
  }

  async generateQR(text: string): Promise<ApiResponse<{ dataUrl: string }>> {
    try {
      const dataUrl = await QRCode.toDataURL(text, {
        width: 280,
        margin: 2,
        color: { dark: '#064e3b', light: '#ffffff' },
      });
      return { success: true, data: { dataUrl } };
    } catch {
      return { success: false, error: 'QR_ERROR' };
    }
  }

  deleteVault(): ApiResponse {
    this.clearSessionSecrets();
    this.meta = null;
    if (fs.existsSync(this.vaultPath)) fs.unlinkSync(this.vaultPath);
    this.store.delete('vault');
    return { success: true };
  }

  exportVaultPath(): string {
    return this.vaultPath;
  }

  async checkForUpdates(): Promise<ApiResponse<UpdateInfo>> {
    try {
      const data = await updateService.checkForUpdates();
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'UPDATE_CHECK_FAILED',
      };
    }
  }

  async downloadUpdate(): Promise<ApiResponse<UpdateInfo>> {
    try {
      const data = await updateService.downloadUpdate();
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'DOWNLOAD_FAILED',
      };
    }
  }

  installUpdate(): ApiResponse {
    updateService.installUpdate();
    return { success: true };
  }

  async scanHardwareDevices(): Promise<ApiResponse<HardwareDevice[]>> {
    try {
      const devices = await scanHardwareDevices();
      return { success: true, data: devices };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'HARDWARE_SCAN_FAILED',
        data: [],
      };
    }
  }

  async getHardwareAddress(
    device: HardwareDevice,
    network: 'tron' | 'ethereum'
  ): Promise<ApiResponse<HardwareAddressResult>> {
    try {
      const data = await getHardwareAddress(device, network);
      return { success: true, data };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'HARDWARE_ADDRESS_FAILED';
      return { success: false, error: msg };
    }
  }

  async deployMultisigPolicy(
    policyId: string,
    password: string
  ): Promise<ApiResponse<{ txHash: string }>> {
    if (!this.unlocked || !this.meta || !this.mnemonic) {
      return { success: false, error: 'LOCKED_WALLET' };
    }
    if (this.sessionPassword !== password) {
      return { success: false, error: 'INVALID_PASSWORD' };
    }

    const policy = this.meta.multisigPolicies.find((p) => p.id === policyId);
    if (!policy) return { success: false, error: 'POLICY_NOT_FOUND' };
    if (policy.network !== 'tron') {
      return { success: false, error: 'EVM_MULTISIG_USE_GNOSIS_SAFE' };
    }
    if (policy.deployStatus === 'deployed') {
      return { success: false, error: 'ALREADY_DEPLOYED' };
    }

    try {
      policy.deployStatus = 'pending';
      await this.persistMeta();

      const { txHash } = await this.blockchain.deployTronMultisig(
        this.mnemonic,
        policy.signers,
        policy.threshold,
        this.passphrase
      );

      policy.deployStatus = 'deployed';
      policy.deployTxHash = txHash;
      await this.persistMeta();
      return { success: true, data: { txHash } };
    } catch (err) {
      if (policy) {
        policy.deployStatus = 'failed';
        await this.persistMeta().catch(() => undefined);
      }
      return {
        success: false,
        error: err instanceof Error ? err.message : 'DEPLOY_FAILED',
      };
    }
  }
}
