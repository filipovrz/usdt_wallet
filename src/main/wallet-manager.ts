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
  type LightningBalance,
  type LightningInvoiceInfo,
  type LightningDecodedInvoice,
} from '../shared/types';
import { getNetworkConfig } from '../shared/networks';
import { getAssetUsdPrice } from '../shared/service-fee';
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
import { deriveTonAddress } from './crypto/ton-keys';
import { BlockchainService } from './services/blockchain';
import { PriceService } from './services/price-service';
import { LightningService } from './services/lightning-service';
import { isLightningConfigured } from './services/lnd-fetch';
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
    accounts: (meta.accounts || []).map((acc, index) => {
      let name = acc.name;
      if (name === 'Моят USDT портфейл') name = 'Моят портфейл';
      if (name === 'My USDT wallet') name = 'My wallet';
      return {
        ...acc,
        name,
        derivationIndex: acc.derivationIndex ?? index,
      };
    }),
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
  private lightning = new LightningService(DEFAULT_SETTINGS);
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
    if (this.meta) {
      this.blockchain.updateSettings(this.meta.settings);
      this.lightning.updateSettings(this.meta.settings);
    }
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
      accounts: this.getAccountsWithLiveAddresses(),
      settings: this.meta?.settings || DEFAULT_SETTINGS,
      failedAttempts: security.failedAttempts,
      lockedUntil: security.lockedUntil,
    };
  }

  /** Always derive chain addresses from seed when unlocked — vault metadata may be stale. */
  private getAccountsWithLiveAddresses(): WalletAccount[] {
    const accounts = this.meta?.accounts || [];
    if (!this.unlocked || !this.mnemonic) return accounts;
    const testnet = this.meta?.settings.testnetMode ?? false;
    return accounts.map((acc, index) => {
      const derivationIndex = acc.derivationIndex ?? index;
      try {
        const keys = deriveKeysFromMnemonic(this.mnemonic!, this.passphrase, derivationIndex, testnet);
        return this.applyDerivedKeys({ ...acc, derivationIndex }, keys);
      } catch (err) {
        console.error('Live address derivation failed for account', acc.id, err);
        try {
          const tonAddress = deriveTonAddress(this.mnemonic!, this.passphrase, derivationIndex, testnet);
          return { ...acc, derivationIndex, tonAddress };
        } catch {
          return { ...acc, derivationIndex };
        }
      }
    });
  }

  private applyDerivedKeys(account: WalletAccount, keys: ReturnType<typeof deriveKeysFromMnemonic>): WalletAccount {
    return {
      ...account,
      tronAddress: keys.tronAddress,
      ethAddress: keys.ethAddress,
      solanaAddress: keys.solanaAddress,
      tonAddress: keys.tonAddress,
      bitcoinAddress: keys.bitcoinAddress,
    };
  }

  private resolveNetworkAddress(account: WalletAccount, network: NetworkId): string {
    if ((network === 'ton' || network === 'bitcoin') && this.mnemonic) {
      const index = account.derivationIndex ?? 0;
      const keys = deriveKeysFromMnemonic(
        this.mnemonic,
        this.passphrase,
        index,
        this.meta?.settings.testnetMode ?? false
      );
      if (network === 'ton') return keys.tonAddress;
      return keys.bitcoinAddress;
    }
    return getAccountAddress(account, network);
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
    const nextIndex = this.meta?.accounts.length ?? 0;
    const base = createAccountFromMnemonic(name, mnemonic, passphrase, nextIndex);
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
    let changed = false;
    this.meta.accounts = this.meta.accounts.map((acc, index) => {
      const derivationIndex = acc.derivationIndex ?? index;
      const keys = deriveKeysFromMnemonic(
        mnemonic,
        passphrase,
        derivationIndex,
        this.meta?.settings.testnetMode ?? false
      );
      const next = this.applyDerivedKeys({ ...acc, derivationIndex }, keys);
      if (
        next.derivationIndex !== acc.derivationIndex ||
        next.tronAddress !== acc.tronAddress ||
        next.ethAddress !== acc.ethAddress ||
        next.solanaAddress !== acc.solanaAddress ||
        next.tonAddress !== acc.tonAddress ||
        next.bitcoinAddress !== acc.bitcoinAddress
      ) {
        changed = true;
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
    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: 'ACCOUNT_NAME_REQUIRED' };
    const account = this.makeAccount(trimmed, this.mnemonic, this.passphrase);
    this.meta.accounts.push(account);
    await this.persistMeta();
    return { success: true, data: account };
  }

  async renameAccount(accountId: string, name: string): Promise<ApiResponse<WalletAccount>> {
    if (!this.unlocked || !this.meta) return { success: false, error: 'LOCKED_WALLET' };
    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: 'ACCOUNT_NAME_REQUIRED' };
    if (trimmed.length > 64) return { success: false, error: 'ACCOUNT_NAME_TOO_LONG' };
    const account = this.meta.accounts.find((a) => a.id === accountId);
    if (!account) return { success: false, error: 'ACCOUNT_NOT_FOUND' };
    account.name = trimmed;
    await this.persistMeta();
    return { success: true, data: account };
  }

  async removeAccount(accountId: string): Promise<ApiResponse> {
    if (!this.unlocked || !this.meta) return { success: false, error: 'LOCKED_WALLET' };
    if (this.meta.accounts.length <= 1) return { success: false, error: 'CANNOT_REMOVE_LAST_ACCOUNT' };
    const index = this.meta.accounts.findIndex((a) => a.id === accountId);
    if (index < 0) return { success: false, error: 'ACCOUNT_NOT_FOUND' };
    this.meta.accounts.splice(index, 1);
    this.meta.transactions = this.meta.transactions.filter((t) => t.accountId !== accountId);
    await this.persistMeta();
    return { success: true };
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

  getAccountNetworkAddress(accountId: string, network: NetworkId): ApiResponse<{ address: string }> {
    if (!this.unlocked || !this.meta) return { success: false, error: 'LOCKED_WALLET' };
    const account = this.meta.accounts.find((a) => a.id === accountId);
    if (!account) return { success: false, error: 'ACCOUNT_NOT_FOUND' };
    try {
      const address = this.resolveNetworkAddress(account, network);
      return { success: true, data: { address } };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'ADDRESS_ERROR' };
    }
  }

  async getBalance(accountId: string, network: NetworkId): Promise<ApiResponse<BalanceInfo>> {
    if (!this.unlocked || !this.meta) return { success: false, error: 'LOCKED_WALLET' };
    if (this.meta.settings.offlineMode) return { success: false, error: 'OFFLINE_MODE' };
    this.touchActivity();
    const account = this.meta.accounts.find((a) => a.id === accountId);
    if (!account) return { success: false, error: 'ACCOUNT_NOT_FOUND' };
    try {
      const balance = await this.blockchain.getBalance(network, this.resolveNetworkAddress(account, network));
      const prices = await this.prices.getPrices(this.meta.settings);
      if (network === 'bitcoin') {
        balance.usdValue = this.prices.formatUsdValue(balance.native, prices.btc, this.meta.settings.currency);
      } else {
        const tokenPrice = network === 'solana' ? prices.hnt : prices.usdt;
        balance.usdValue = this.prices.formatUsdValue(balance.usdt, tokenPrice, this.meta.settings.currency);
      }
      if (balance.usdc != null) {
        balance.usdcUsdValue = this.prices.formatUsdValue(balance.usdc, prices.usdc, this.meta.settings.currency);
      }
      if (balance.dai != null) {
        balance.daiUsdValue = this.prices.formatUsdValue(balance.dai, prices.dai, this.meta.settings.currency);
      }
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
    const from = this.resolveNetworkAddress(account, network);
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
    const account = this.meta.accounts.find((a) => a.id === accountId);
    if (!account) return { success: false, error: 'ACCOUNT_NOT_FOUND' };
    try {
      const prices = await this.prices.getPrices(this.meta.settings);
      const cfg = getNetworkConfig(network, this.meta.settings.testnetMode);
      const symbol =
        assetType === 'native'
          ? cfg.nativeSymbol
          : assetType === 'usdc'
            ? 'USDC'
            : assetType === 'dai'
              ? 'DAI'
              : cfg.symbol;
      const usdPrice = getAssetUsdPrice(assetType, symbol, prices);
      const preview = await this.blockchain.previewSend(
        network,
        this.mnemonic,
        to,
        amount,
        this.passphrase,
        feeTier || this.meta.settings.defaultFeeTier,
        assetType,
        account.derivationIndex ?? 0,
        usdPrice
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
      const prices = await this.prices.getPrices(this.meta.settings);
      const cfg = getNetworkConfig(network, this.meta.settings.testnetMode);
      const symbol =
        assetType === 'native'
          ? cfg.nativeSymbol
          : assetType === 'usdc'
            ? 'USDC'
            : assetType === 'dai'
              ? 'DAI'
              : cfg.symbol;
      const usdPrice = getAssetUsdPrice(assetType, symbol, prices);
      const result = await this.blockchain.send(
        network,
        this.mnemonic,
        to,
        amount,
        this.passphrase,
        feeTier || this.meta.settings.defaultFeeTier,
        assetType,
        account.derivationIndex ?? 0,
        usdPrice
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
    if (this.meta.settings.offlineMode) {
      return { success: true, data: this.meta.transactions.filter((t) => t.accountId === accountId) };
    }
    const account = this.meta.accounts.find((a) => a.id === accountId);
    if (!account) return { success: false, error: 'ACCOUNT_NOT_FOUND' };
    const allTxs = [...this.meta.transactions];
    for (const network of ALL_NETWORK_IDS) {
      const remote = await this.blockchain.fetchTransactions(network, this.resolveNetworkAddress(account, network));
      for (const tx of remote) {
        if (!allTxs.find((t) => t.hash === tx.hash)) {
          allTxs.push({
            id: uuidv4(),
            hash: tx.hash,
            network,
            direction: tx.direction,
            amount: tx.amount,
            fee: tx.fee,
            from: tx.from,
            to: tx.to,
            timestamp: tx.timestamp,
            status: 'confirmed',
            accountId,
            assetSymbol: tx.assetSymbol || getNetworkConfig(network, this.meta!.settings.testnetMode).symbol,
            lightning: tx.lightning,
          });
        }
      }
    }
    if (isLightningConfigured(this.meta.settings)) {
      try {
        const lnTxs = await this.lightning.fetchTransactions(40);
        for (const tx of lnTxs) {
          if (!allTxs.find((t) => t.hash === tx.hash)) {
            allTxs.push({
              id: uuidv4(),
              hash: tx.hash,
              network: 'bitcoin',
              direction: tx.direction,
              amount: tx.amount,
              fee: tx.fee,
              from: tx.from,
              to: tx.to,
              timestamp: tx.timestamp,
              status: 'confirmed',
              accountId,
              assetSymbol: 'BTC',
              lightning: true,
            });
          }
        }
      } catch {
        // LND history optional
      }
    }
    allTxs.sort((a, b) => b.timestamp - a.timestamp);
    this.meta.transactions = allTxs.slice(0, 500);
    await this.persistMeta();
    const forAccount = this.meta.transactions.filter((t) => t.accountId === accountId);
    return { success: true, data: forAccount };
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

  async getLightningInfo(): Promise<ApiResponse<{ alias: string; synced: boolean; blockHeight: number; configured: boolean }>> {
    if (!this.meta) return { success: false, error: 'LOCKED_WALLET' };
    const configured = isLightningConfigured(this.meta.settings);
    if (!configured) {
      return { success: true, data: { alias: '', synced: false, blockHeight: 0, configured: false } };
    }
    this.touchActivity();
    try {
      const info = await this.lightning.getInfo();
      return { success: true, data: { ...info, configured: true } };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'LIGHTNING_INFO_FAILED' };
    }
  }

  async getLightningBalance(): Promise<ApiResponse<LightningBalance>> {
    if (!this.unlocked || !this.meta) return { success: false, error: 'LOCKED_WALLET' };
    if (this.meta.settings.offlineMode) return { success: false, error: 'OFFLINE_MODE' };
    if (!isLightningConfigured(this.meta.settings)) return { success: false, error: 'LIGHTNING_NOT_CONFIGURED' };
    this.touchActivity();
    try {
      const balance = await this.lightning.getBalance();
      return { success: true, data: balance };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'LIGHTNING_BALANCE_FAILED' };
    }
  }

  async createLightningInvoice(amount: string, memo?: string): Promise<ApiResponse<LightningInvoiceInfo>> {
    if (!this.unlocked || !this.meta) return { success: false, error: 'LOCKED_WALLET' };
    if (!isLightningConfigured(this.meta.settings)) return { success: false, error: 'LIGHTNING_NOT_CONFIGURED' };
    this.touchActivity();
    try {
      const invoice = await this.lightning.createInvoice(amount, memo);
      return { success: true, data: invoice };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'INVOICE_CREATE_FAILED' };
    }
  }

  async decodeLightningInvoice(paymentRequest: string): Promise<ApiResponse<LightningDecodedInvoice>> {
    if (!this.unlocked || !this.meta) return { success: false, error: 'LOCKED_WALLET' };
    this.touchActivity();
    try {
      if (!this.lightning.validateInvoice(paymentRequest)) {
        return { success: false, error: 'INVALID_LIGHTNING_INVOICE' };
      }
      const decoded = await this.lightning.decodeInvoice(paymentRequest);
      return { success: true, data: decoded };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'INVOICE_DECODE_FAILED' };
    }
  }

  async payLightningInvoice(paymentRequest: string, accountId: string): Promise<ApiResponse<{ hash: string; fee: string }>> {
    if (!this.unlocked || !this.meta) return { success: false, error: 'LOCKED_WALLET' };
    if (this.meta.settings.offlineMode) return { success: false, error: 'OFFLINE_MODE' };
    if (!isLightningConfigured(this.meta.settings)) return { success: false, error: 'LIGHTNING_NOT_CONFIGURED' };
    const account = this.meta.accounts.find((a) => a.id === accountId);
    if (!account) return { success: false, error: 'ACCOUNT_NOT_FOUND' };
    this.touchActivity();
    try {
      const decoded = await this.lightning.decodeInvoice(paymentRequest);
      const result = await this.lightning.payInvoice(paymentRequest);
      const hash = result.hash;
      if (!this.meta.transactions.find((t) => t.hash === hash)) {
        this.meta.transactions.unshift({
          id: uuidv4(),
          hash,
          network: 'bitcoin',
          direction: 'out',
          amount: decoded.amount,
          fee: result.fee,
          from: 'lightning',
          to: 'invoice',
          timestamp: Date.now(),
          status: 'confirmed',
          accountId,
          assetSymbol: 'BTC',
          lightning: true,
        });
        this.meta.transactions = this.meta.transactions.slice(0, 500);
        await this.persistMeta();
      }
      return { success: true, data: { ...result, hash } };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'LIGHTNING_PAY_FAILED' };
    }
  }
}
