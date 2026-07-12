import type { NetworkId } from './types';

export interface NetworkConfig {
  id: NetworkId;
  name: string;
  symbol: string;
  usdtContract: string;
  usdtDecimals: number;
  explorerUrl: string;
  rpcUrls: string[];
  apiUrl?: string;
  nativeSymbol: string;
  chainId?: number;
  isEvm: boolean;
  minNativeForSend: number;
}

const MAINNET: Record<NetworkId, NetworkConfig> = {
  tron: {
    id: 'tron',
    name: 'TRON (TRC-20)',
    symbol: 'USDT',
    usdtContract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    usdtDecimals: 6,
    explorerUrl: 'https://tronscan.org',
    rpcUrls: ['https://api.trongrid.io', 'https://rpc.ankr.com/tron_jsonrpc'],
    apiUrl: 'https://api.trongrid.io',
    nativeSymbol: 'TRX',
    isEvm: false,
    minNativeForSend: 5,
  },
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum (ERC-20)',
    symbol: 'USDT',
    usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    usdtDecimals: 6,
    explorerUrl: 'https://etherscan.io',
    rpcUrls: [
      'https://ethereum.publicnode.com',
      'https://rpc.ankr.com/eth',
      'https://1rpc.io/eth',
    ],
    nativeSymbol: 'ETH',
    chainId: 1,
    isEvm: true,
    minNativeForSend: 0.002,
  },
  bsc: {
    id: 'bsc',
    name: 'BNB Chain (BEP-20)',
    symbol: 'USDT',
    usdtContract: '0x55d398326f99059fF775485246999027B3197955',
    usdtDecimals: 18,
    explorerUrl: 'https://bscscan.com',
    rpcUrls: ['https://bsc-dataseed.binance.org', 'https://rpc.ankr.com/bsc'],
    nativeSymbol: 'BNB',
    chainId: 56,
    isEvm: true,
    minNativeForSend: 0.002,
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon (ERC-20)',
    symbol: 'USDT',
    usdtContract: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    usdtDecimals: 6,
    explorerUrl: 'https://polygonscan.com',
    rpcUrls: ['https://polygon-rpc.com', 'https://rpc.ankr.com/polygon'],
    nativeSymbol: 'MATIC',
    chainId: 137,
    isEvm: true,
    minNativeForSend: 0.05,
  },
};

const TESTNET: Record<NetworkId, NetworkConfig> = {
  tron: {
    ...MAINNET.tron,
    name: 'TRON Shasta (TRC-20 Testnet)',
    explorerUrl: 'https://shasta.tronscan.org',
    rpcUrls: ['https://api.shasta.trongrid.io'],
    apiUrl: 'https://api.shasta.trongrid.io',
    usdtContract: 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf',
    minNativeForSend: 1,
  },
  ethereum: {
    ...MAINNET.ethereum,
    name: 'Ethereum Sepolia (Testnet)',
    explorerUrl: 'https://sepolia.etherscan.io',
    rpcUrls: ['https://rpc.sepolia.org', 'https://ethereum-sepolia.publicnode.com'],
    usdtContract: '0x7169D20af0d9558c8BFDd8aF2d9F4E3c8C9E5E5E',
    chainId: 11155111,
    minNativeForSend: 0.001,
  },
  bsc: {
    ...MAINNET.bsc,
    name: 'BSC Testnet (BEP-20)',
    explorerUrl: 'https://testnet.bscscan.com',
    rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
    usdtContract: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
    chainId: 97,
    minNativeForSend: 0.001,
  },
  polygon: {
    ...MAINNET.polygon,
    name: 'Polygon Amoy (Testnet)',
    explorerUrl: 'https://amoy.polygonscan.com',
    rpcUrls: ['https://rpc-amoy.polygon.technology'],
    usdtContract: '0x41E94Eb019C0762f9Bfcf9Fb1E58725bfb0e7582',
    chainId: 80002,
    minNativeForSend: 0.01,
  },
};

export const ALL_NETWORK_IDS: NetworkId[] = ['tron', 'ethereum', 'bsc', 'polygon'];

export function getNetworkConfig(id: NetworkId, testnet = false): NetworkConfig {
  const map = testnet ? TESTNET : MAINNET;
  return map[id];
}

export function getAllNetworks(testnet = false): NetworkConfig[] {
  return ALL_NETWORK_IDS.map((id) => getNetworkConfig(id, testnet));
}

export function isEvmNetwork(id: NetworkId): boolean {
  return getNetworkConfig(id, false).isEvm;
}
