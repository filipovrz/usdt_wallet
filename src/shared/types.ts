export type NetworkId = 'tron' | 'ethereum' | 'bsc' | 'polygon';

export type FeeTier = 'slow' | 'normal' | 'fast';

export type ThemeMode = 'dark' | 'light';

export interface WalletAccount {
  id: string;
  name: string;
  tronAddress: string;
  ethAddress: string;
  createdAt: string;
}

export interface AddressBookEntry {
  id: string;
  name: string;
  address: string;
  network: NetworkId;
  note?: string;
  createdAt: string;
}

export interface TransactionRecord {
  id: string;
  hash: string;
  network: NetworkId;
  direction: 'in' | 'out';
  amount: string;
  fee?: string;
  from: string;
  to: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  accountId: string;
  note?: string;
}

export type MultisigDeployStatus = 'local' | 'pending' | 'deployed' | 'failed';

export interface MultisigPolicy {
  id: string;
  name: string;
  threshold: number;
  totalSigners: number;
  signers: string[];
  network: NetworkId;
  createdAt: string;
  deployStatus?: MultisigDeployStatus;
  deployTxHash?: string;
}

export type HardwareDeviceType = 'ledger' | 'trezor' | 'unknown';

export interface HardwareDevice {
  id: string;
  type: HardwareDeviceType;
  name: string;
  path?: string;
}

export interface HardwareAddressResult {
  address: string;
  path: string;
  network: 'tron' | 'ethereum';
}

export interface AppSettings {
  language: 'bg' | 'en';
  defaultNetwork: NetworkId;
  autoLockMinutes: number;
  currency: 'USD' | 'EUR' | 'BGN';
  hideBalances: boolean;
  confirmBeforeSend: boolean;
  testnetMode: boolean;
  offlineMode: boolean;
  theme: ThemeMode;
  trongridApiKey: string;
  etherscanApiKey: string;
  bscscanApiKey: string;
  polygonscanApiKey: string;
  defaultFeeTier: FeeTier;
  checkUpdatesOnStart: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'bg',
  defaultNetwork: 'tron',
  autoLockMinutes: 5,
  currency: 'USD',
  hideBalances: false,
  confirmBeforeSend: true,
  testnetMode: false,
  offlineMode: false,
  theme: 'dark',
  trongridApiKey: '',
  etherscanApiKey: '',
  bscscanApiKey: '',
  polygonscanApiKey: '',
  defaultFeeTier: 'normal',
  checkUpdatesOnStart: true,
};

export interface BalanceInfo {
  usdt: string;
  native: string;
  nativeSymbol: string;
  usdValue?: string;
}

export interface TronResources {
  bandwidth: number;
  energy: number;
  freeBandwidth: number;
  freeEnergy: number;
}

export interface SendRequest {
  accountId: string;
  network: NetworkId;
  to: string;
  amount: string;
  password: string;
  feeTier?: FeeTier;
}

export interface SendPreview {
  to: string;
  amount: string;
  fee: string;
  feeSymbol: string;
  totalUsdt: string;
  network: NetworkId;
  nativeBalance: string;
  minNativeRequired: string;
  hasEnoughNative: boolean;
  warning?: string;
}

export interface FeeEstimate {
  slow: string;
  normal: string;
  fast: string;
  symbol: string;
}

export interface PriceInfo {
  usdt: number;
  trx: number;
  eth: number;
  bnb: number;
  matic: number;
  currency: string;
}

export interface VaultMeta {
  version: number;
  createdAt: string;
  accounts: WalletAccount[];
  addressBook: AddressBookEntry[];
  transactions: TransactionRecord[];
  multisigPolicies: MultisigPolicy[];
  settings: AppSettings;
}

export interface CreateWalletRequest {
  name: string;
  password: string;
  passphrase?: string;
}

export interface ImportWalletRequest {
  name: string;
  mnemonic: string;
  password: string;
  passphrase?: string;
}

export interface UnlockRequest {
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SessionInfo {
  unlocked: boolean;
  hasVault: boolean;
  accounts: WalletAccount[];
  settings: AppSettings;
  failedAttempts: number;
  lockedUntil?: number;
}

export interface UpdateInfo {
  available: boolean;
  version?: string;
  message?: string;
  downloadUrl?: string;
  downloaded?: boolean;
}

export function getAccountAddress(account: WalletAccount, network: NetworkId): string {
  if (network === 'tron') return account.tronAddress;
  return account.ethAddress;
}

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
export const VAULT_VERSION = 2;

// Re-export network helpers
export { getNetworkConfig, getAllNetworks, ALL_NETWORK_IDS } from './networks';
export type { NetworkConfig } from './networks';
