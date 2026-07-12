import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc';
import type {
  ApiResponse,
  SessionInfo,
  WalletAccount,
  BalanceInfo,
  SendPreview,
  TransactionRecord,
  AddressBookEntry,
  AppSettings,
  CreateWalletRequest,
  ImportWalletRequest,
  UnlockRequest,
  SendRequest,
  ChangePasswordRequest,
  NetworkId,
  FeeTier,
  TronResources,
  FeeEstimate,
  PriceInfo,
  MultisigPolicy,
  UpdateInfo,
  HardwareDevice,
  HardwareAddressResult,
} from '../shared/types';

const api = {
  getSession: (): Promise<ApiResponse<SessionInfo>> => ipcRenderer.invoke(IPC_CHANNELS.GET_SESSION),
  touchActivity: (): Promise<ApiResponse> => ipcRenderer.invoke(IPC_CHANNELS.TOUCH_ACTIVITY),
  createWallet: (req: CreateWalletRequest): Promise<ApiResponse<{ mnemonic: string; account: WalletAccount }>> =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_WALLET, req),
  importWallet: (req: ImportWalletRequest): Promise<ApiResponse<{ account: WalletAccount }>> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPORT_WALLET, req),
  unlock: (req: UnlockRequest): Promise<ApiResponse> => ipcRenderer.invoke(IPC_CHANNELS.UNLOCK, req),
  lock: (): Promise<ApiResponse> => ipcRenderer.invoke(IPC_CHANNELS.LOCK),
  changePassword: (req: ChangePasswordRequest): Promise<ApiResponse> =>
    ipcRenderer.invoke(IPC_CHANNELS.CHANGE_PASSWORD, req),
  addAccount: (name: string): Promise<ApiResponse<WalletAccount>> =>
    ipcRenderer.invoke(IPC_CHANNELS.ADD_ACCOUNT, name),
  getMnemonic: (password: string): Promise<ApiResponse<{ mnemonic: string; passphrase?: string }>> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_MNEMONIC, { password }),
  getBalance: (accountId: string, network: NetworkId): Promise<ApiResponse<BalanceInfo>> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_BALANCE, { accountId, network }),
  getTronResources: (accountId: string): Promise<ApiResponse<TronResources>> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_TRON_RESOURCES, accountId),
  getFeeEstimate: (network: NetworkId, accountId: string): Promise<ApiResponse<FeeEstimate>> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_FEE_ESTIMATE, { network, accountId }),
  getPrices: (): Promise<ApiResponse<PriceInfo>> => ipcRenderer.invoke(IPC_CHANNELS.GET_PRICES),
  sendPreview: (
    accountId: string,
    network: NetworkId,
    to: string,
    amount: string,
    feeTier?: FeeTier
  ): Promise<ApiResponse<SendPreview>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SEND_PREVIEW, { accountId, network, to, amount, feeTier }),
  send: (req: SendRequest): Promise<ApiResponse<{ hash: string }>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SEND, req),
  getTransactions: (accountId?: string): Promise<ApiResponse<TransactionRecord[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_TRANSACTIONS, accountId),
  refreshTransactions: (accountId: string): Promise<ApiResponse<TransactionRecord[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.REFRESH_TRANSACTIONS, accountId),
  updateTransactionNote: (txId: string, note: string): Promise<ApiResponse> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_TX_NOTE, { txId, note }),
  getAddressBook: (): Promise<ApiResponse<AddressBookEntry[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_ADDRESS_BOOK),
  addAddressBook: (entry: Omit<AddressBookEntry, 'id' | 'createdAt'>): Promise<ApiResponse<AddressBookEntry>> =>
    ipcRenderer.invoke(IPC_CHANNELS.ADD_ADDRESS_BOOK, entry),
  removeAddressBook: (id: string): Promise<ApiResponse> =>
    ipcRenderer.invoke(IPC_CHANNELS.REMOVE_ADDRESS_BOOK, id),
  getMultisigPolicies: (): Promise<ApiResponse<MultisigPolicy[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_MULTISIG),
  addMultisigPolicy: (policy: Omit<MultisigPolicy, 'id' | 'createdAt'>): Promise<ApiResponse<MultisigPolicy>> =>
    ipcRenderer.invoke(IPC_CHANNELS.ADD_MULTISIG, policy),
  removeMultisigPolicy: (id: string): Promise<ApiResponse> =>
    ipcRenderer.invoke(IPC_CHANNELS.REMOVE_MULTISIG, id),
  getSettings: (): Promise<ApiResponse<AppSettings>> => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  updateSettings: (settings: AppSettings): Promise<ApiResponse<AppSettings>> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SETTINGS, settings),
  validateAddress: (network: NetworkId, address: string): Promise<ApiResponse<{ valid: boolean }>> =>
    ipcRenderer.invoke(IPC_CHANNELS.VALIDATE_ADDRESS, { network, address }),
  generateQR: (text: string): Promise<ApiResponse<{ dataUrl: string }>> =>
    ipcRenderer.invoke(IPC_CHANNELS.GENERATE_QR, text),
  deleteVault: (): Promise<ApiResponse> => ipcRenderer.invoke(IPC_CHANNELS.DELETE_VAULT),
  exportVault: (): Promise<ApiResponse<{ path: string }>> => ipcRenderer.invoke(IPC_CHANNELS.EXPORT_VAULT),
  exportEncryptedBackup: (): Promise<ApiResponse<{ path: string }>> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_BACKUP),
  checkForUpdates: (): Promise<ApiResponse<UpdateInfo>> => ipcRenderer.invoke(IPC_CHANNELS.CHECK_UPDATES),
  downloadUpdate: (): Promise<ApiResponse<UpdateInfo>> => ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_UPDATE),
  installUpdate: (): Promise<ApiResponse> => ipcRenderer.invoke(IPC_CHANNELS.INSTALL_UPDATE),
  scanHardwareDevices: (): Promise<ApiResponse<HardwareDevice[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SCAN_HARDWARE),
  getHardwareAddress: (
    device: HardwareDevice,
    network: 'tron' | 'ethereum'
  ): Promise<ApiResponse<HardwareAddressResult>> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_HARDWARE_ADDRESS, { device, network }),
  deployMultisigPolicy: (policyId: string, password: string): Promise<ApiResponse<{ txHash: string }>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DEPLOY_MULTISIG, { policyId, password }),
};

contextBridge.exposeInMainWorld('walletApi', api);
export type WalletApi = typeof api;
