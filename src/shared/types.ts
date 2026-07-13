import { getNetworkConfig } from './networks';

export type NetworkId =
  | 'tron'
  | 'ethereum'
  | 'bsc'
  | 'polygon'
  | 'arbitrum'
  | 'base'
  | 'optimism'
  | 'avalanche'
  | 'zksync'
  | 'linea'
  | 'scroll'
  | 'ton'
  | 'bitcoin'
  | 'solana';

export type FeeTier = 'slow' | 'normal' | 'fast';

export type SendAssetType = 'usdt' | 'usdc' | 'dai' | 'native';

export type ThemeMode = 'dark' | 'light';

export interface WalletAccount {
  id: string;
  name: string;
  /** BIP44 account index — each account gets unique chain addresses from the same seed. */
  derivationIndex?: number;
  tronAddress: string;
  ethAddress: string;
  solanaAddress?: string;
  tonAddress?: string;
  bitcoinAddress?: string;
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
  assetSymbol?: string;
  /** Lightning payment (off-chain); no blockchain explorer link */
  lightning?: boolean;
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
  arbiscanApiKey: string;
  basescanApiKey: string;
  snowtraceApiKey: string;
  toncenterApiKey: string;
  lineascanApiKey: string;
  scrollscanApiKey: string;
  defaultFeeTier: FeeTier;
  checkUpdatesOnStart: boolean;
  /** LND REST URL (e.g. https://127.0.0.1:8080) for Lightning */
  lndRestUrl: string;
  /** Hex-encoded LND admin macaroon */
  lndMacaroon: string;
}

export type BtcLayer = 'onchain' | 'lightning';

export interface LightningBalance {
  local: string;
  pending: string;
  total: string;
}

export interface LightningInvoiceInfo {
  paymentRequest: string;
  amount: string;
  description?: string;
  expiry: number;
  expiresAt: number;
}

export interface LightningDecodedInvoice {
  paymentRequest: string;
  amount: string;
  description?: string;
  destination: string;
  expiry: number;
  expiresAt: number;
  expired: boolean;
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
  arbiscanApiKey: '',
  basescanApiKey: '',
  snowtraceApiKey: '',
  toncenterApiKey: '',
  lineascanApiKey: '',
  scrollscanApiKey: '',
  defaultFeeTier: 'normal',
  checkUpdatesOnStart: true,
  lndRestUrl: '',
  lndMacaroon: '',
};

export interface RemoteTransaction {
  hash: string;
  from: string;
  to: string;
  amount: string;
  timestamp: number;
  direction: 'in' | 'out';
  assetSymbol?: string;
  lightning?: boolean;
  fee?: string;
}

export interface BalanceInfo {
  usdt: string;
  usdc?: string;
  dai?: string;
  native: string;
  nativeSymbol: string;
  usdValue?: string;
  usdcUsdValue?: string;
  daiUsdValue?: string;
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
  assetType?: SendAssetType;
}

export interface SendPreview {
  to: string;
  amount: string;
  fee: string;
  feeSymbol: string;
  totalUsdt: string;
  network: NetworkId;
  assetType: SendAssetType;
  assetSymbol: string;
  assetBalance: string;
  hasEnoughAsset: boolean;
  nativeBalance: string;
  minNativeRequired: string;
  hasEnoughNative: boolean;
  warning?: string;
  /** Platform service fee (mainnet, non-exempt senders) */
  serviceFee?: string;
  serviceFeeSymbol?: string;
  serviceFeeUsd?: number;
  serviceFeeExempt?: boolean;
  totalAssetDebit?: string;
}

export interface FeeEstimate {
  slow: string;
  normal: string;
  fast: string;
  symbol: string;
}

export interface PriceInfo {
  usdt: number;
  usdc: number;
  dai: number;
  trx: number;
  eth: number;
  bnb: number;
  matic: number;
  sol: number;
  hnt: number;
  avax: number;
  ton: number;
  btc: number;
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

export function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function getAccountAddress(account: WalletAccount, network: NetworkId): string {
  if (network === 'tron') return account.tronAddress;
  if (network === 'solana') return account.solanaAddress || '';
  if (network === 'ton') return account.tonAddress || '';
  if (network === 'bitcoin') return account.bitcoinAddress || '';
  return account.ethAddress;
}

export function getNetworkTokenLabel(network: NetworkId, testnet = false): string {
  return getNetworkConfig(network, testnet).symbol;
}

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
export const VAULT_VERSION = 6;

// Re-export network helpers
export {
  getNetworkConfig,
  getAllNetworks,
  ALL_NETWORK_IDS,
  networkHasUsdc,
  networkHasDai,
  getAssetBalanceFromInfo,
  getTokenSpec,
  isEvmNetwork,
  isTonNetwork,
  isBitcoinNetwork,
} from './networks';
export type { NetworkConfig, TokenSpec } from './networks';
