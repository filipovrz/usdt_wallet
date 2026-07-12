import type { WalletApi } from '../preload/index';

declare global {
  interface Window {
    walletApi: WalletApi;
  }
}

export {};
