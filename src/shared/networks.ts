import type { NetworkId, SendAssetType } from './types';

export interface NetworkConfig {
  id: NetworkId;
  name: string;
  symbol: string;
  usdtContract: string;
  usdtDecimals: number;
  usdcContract?: string;
  usdcDecimals?: number;
  daiContract?: string;
  daiDecimals?: number;
  explorerUrl: string;
  rpcUrls: string[];
  apiUrl?: string;
  explorerApiUrl?: string;
  nativeSymbol: string;
  chainId?: number;
  isEvm: boolean;
  isSolana?: boolean;
  isTon?: boolean;
  minNativeForSend: number;
}

const MAINNET: Record<NetworkId, NetworkConfig> = {
  tron: {
    id: 'tron',
    name: 'TRON (TRC-20)',
    symbol: 'USDT',
    usdtContract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    usdtDecimals: 6,
    usdcContract: 'TEkxiTehnzSmSe2XqrBj4w32run966rdz8',
    usdcDecimals: 6,
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
    usdcContract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    usdcDecimals: 6,
    daiContract: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    daiDecimals: 18,
    explorerUrl: 'https://etherscan.io',
    explorerApiUrl: 'https://api.etherscan.io/api',
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
    usdcContract: '0x8AC76a51cc950d9822D32929f47Ab80fE16538C8',
    usdcDecimals: 18,
    daiContract: '0x1AF3F329e8BE154074D8766D1E4AA8861489089a',
    daiDecimals: 18,
    explorerUrl: 'https://bscscan.com',
    explorerApiUrl: 'https://api.bscscan.com/api',
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
    usdcContract: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    usdcDecimals: 6,
    daiContract: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    daiDecimals: 18,
    explorerUrl: 'https://polygonscan.com',
    explorerApiUrl: 'https://api.polygonscan.com/api',
    rpcUrls: ['https://polygon-rpc.com', 'https://rpc.ankr.com/polygon'],
    nativeSymbol: 'MATIC',
    chainId: 137,
    isEvm: true,
    minNativeForSend: 0.05,
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum One',
    symbol: 'USDT',
    usdtContract: '0xFd086bC7CD5C481DCC9CE8C4b9f96c9A8E2F2a',
    usdtDecimals: 6,
    usdcContract: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    usdcDecimals: 6,
    daiContract: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    daiDecimals: 18,
    explorerUrl: 'https://arbiscan.io',
    explorerApiUrl: 'https://api.arbiscan.io/api',
    rpcUrls: ['https://arb1.arbitrum.io/rpc', 'https://rpc.ankr.com/arbitrum'],
    nativeSymbol: 'ETH',
    chainId: 42161,
    isEvm: true,
    minNativeForSend: 0.0005,
  },
  base: {
    id: 'base',
    name: 'Base',
    symbol: 'USDT',
    usdtContract: '0xfde4C96c8598186CE148046591C6c6F0AE4a971B9',
    usdtDecimals: 6,
    usdcContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    usdcDecimals: 6,
    daiContract: '0x50c5725949A6f0c72E6C4a641F24049A917DB0Cb',
    daiDecimals: 18,
    explorerUrl: 'https://basescan.org',
    explorerApiUrl: 'https://api.basescan.org/api',
    rpcUrls: ['https://mainnet.base.org', 'https://rpc.ankr.com/base'],
    nativeSymbol: 'ETH',
    chainId: 8453,
    isEvm: true,
    minNativeForSend: 0.0005,
  },
  optimism: {
    id: 'optimism',
    name: 'Optimism',
    symbol: 'USDT',
    usdtContract: '0x94b008aA005d2781eBc747ebA7924B446396C88',
    usdtDecimals: 6,
    usdcContract: '0x0b2C639c533813f4Aa9D7837CAaAbEamirC641',
    usdcDecimals: 6,
    daiContract: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    daiDecimals: 18,
    explorerUrl: 'https://optimistic.etherscan.io',
    explorerApiUrl: 'https://api-optimistic.etherscan.io/api',
    rpcUrls: ['https://mainnet.optimism.io', 'https://rpc.ankr.com/optimism'],
    nativeSymbol: 'ETH',
    chainId: 10,
    isEvm: true,
    minNativeForSend: 0.0005,
  },
  avalanche: {
    id: 'avalanche',
    name: 'Avalanche C-Chain',
    symbol: 'USDT',
    usdtContract: '0x9702230A8Ea53601f5cD2bdcBE5Ff2016Fa496A6',
    usdtDecimals: 6,
    usdcContract: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    usdcDecimals: 6,
    daiContract: '0xd586E7F844cEa2F87f50152665BCbc2C279D7256',
    daiDecimals: 18,
    explorerUrl: 'https://snowtrace.io',
    explorerApiUrl: 'https://api.snowtrace.io/api',
    rpcUrls: ['https://api.avax.network/ext/bc/C/rpc', 'https://rpc.ankr.com/avalanche'],
    nativeSymbol: 'AVAX',
    chainId: 43114,
    isEvm: true,
    minNativeForSend: 0.01,
  },
  zksync: {
    id: 'zksync',
    name: 'zkSync Era',
    symbol: 'USDT',
    usdtContract: '0x493257fD37EDB34451f62EDf8D269a95217C23B0',
    usdtDecimals: 6,
    usdcContract: '0x1d17CBcF0D6D131135a7181c5D85957D76DDAE0',
    usdcDecimals: 6,
    daiContract: '0x4B8d4476824EA5D42887041d047eE82D4853c643',
    daiDecimals: 18,
    explorerUrl: 'https://era.zksync.network',
    explorerApiUrl: 'https://api-era.zksync.network/api',
    rpcUrls: ['https://mainnet.era.zksync.io', 'https://zksync.meowrpc.com'],
    nativeSymbol: 'ETH',
    chainId: 324,
    isEvm: true,
    minNativeForSend: 0.0005,
  },
  linea: {
    id: 'linea',
    name: 'Linea',
    symbol: 'USDT',
    usdtContract: '0xA219439258ca9da29E9Cc4cE5596924745e12C93',
    usdtDecimals: 6,
    usdcContract: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
    usdcDecimals: 6,
    daiContract: '0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00D5',
    daiDecimals: 18,
    explorerUrl: 'https://lineascan.build',
    explorerApiUrl: 'https://api.lineascan.build/api',
    rpcUrls: ['https://rpc.linea.build', 'https://1rpc.io/linea'],
    nativeSymbol: 'ETH',
    chainId: 59144,
    isEvm: true,
    minNativeForSend: 0.0005,
  },
  scroll: {
    id: 'scroll',
    name: 'Scroll',
    symbol: 'USDT',
    usdtContract: '0xf55BECda783897994e5A261F362Ec0f984A2B9A0',
    usdtDecimals: 6,
    usdcContract: '0x06eFdBFf2a14a7c8E159442D8D66b1c4c68A8D6',
    usdcDecimals: 6,
    daiContract: '0xcA77eEB3e87876036074a5F9542d5c7f7e804D8',
    daiDecimals: 18,
    explorerUrl: 'https://scrollscan.com',
    explorerApiUrl: 'https://api.scrollscan.com/api',
    rpcUrls: ['https://rpc.scroll.io', 'https://1rpc.io/scroll'],
    nativeSymbol: 'ETH',
    chainId: 534352,
    isEvm: true,
    minNativeForSend: 0.0005,
  },
  ton: {
    id: 'ton',
    name: 'TON (USDT Jetton)',
    symbol: 'USDT',
    usdtContract: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
    usdtDecimals: 6,
    explorerUrl: 'https://tonscan.org',
    rpcUrls: ['https://toncenter.com/api/v2/jsonRPC'],
    apiUrl: 'https://toncenter.com/api/v2',
    nativeSymbol: 'TON',
    isEvm: false,
    isTon: true,
    minNativeForSend: 0.05,
  },
  solana: {
    id: 'solana',
    name: 'Solana (HNT + USDC)',
    symbol: 'HNT',
    usdtContract: 'hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux',
    usdtDecimals: 8,
    usdcContract: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    usdcDecimals: 6,
    explorerUrl: 'https://solscan.io',
    rpcUrls: [
      'https://api.mainnet-beta.solana.com',
      'https://solana-rpc.publicnode.com',
    ],
    nativeSymbol: 'SOL',
    isEvm: false,
    isSolana: true,
    minNativeForSend: 0.001,
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
    usdcContract: undefined,
    usdcDecimals: undefined,
    minNativeForSend: 1,
  },
  ethereum: {
    ...MAINNET.ethereum,
    name: 'Ethereum Sepolia (Testnet)',
    explorerUrl: 'https://sepolia.etherscan.io',
    explorerApiUrl: 'https://api-sepolia.etherscan.io/api',
    rpcUrls: [
      'https://ethereum-sepolia-rpc.publicnode.com',
      'https://1rpc.io/sepolia',
      'https://rpc2.sepolia.org',
    ],
    usdtContract: '0x7169D20Af0D9558C8BfdD8Af2D9F4e3C8C9E5E5E',
    usdcContract: '0x1c7D4B196Cb0C97B1485eA8A79c1e8d4e3C5Dc8',
    usdcDecimals: 6,
    chainId: 11155111,
    minNativeForSend: 0.001,
  },
  bsc: {
    ...MAINNET.bsc,
    name: 'BSC Testnet (BEP-20)',
    explorerUrl: 'https://testnet.bscscan.com',
    explorerApiUrl: 'https://api-testnet.bscscan.com/api',
    rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
    usdtContract: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
    usdcContract: '0x64544969ed7EBf5f083679233325356EbE738900',
    usdcDecimals: 18,
    chainId: 97,
    minNativeForSend: 0.001,
  },
  polygon: {
    ...MAINNET.polygon,
    name: 'Polygon Amoy (Testnet)',
    explorerUrl: 'https://amoy.polygonscan.com',
    explorerApiUrl: 'https://api-amoy.polygonscan.com/api',
    rpcUrls: ['https://rpc-amoy.polygon.technology'],
    usdtContract: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
    usdcContract: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
    usdcDecimals: 6,
    chainId: 80002,
    minNativeForSend: 0.01,
  },
  arbitrum: {
    ...MAINNET.arbitrum,
    name: 'Arbitrum Sepolia (Testnet)',
    explorerUrl: 'https://sepolia.arbiscan.io',
    explorerApiUrl: 'https://api-sepolia.arbiscan.io/api',
    rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
    usdtContract: '0x7169D20Af0D9558C8BfdD8Af2D9F4e3C8C9E5E5E',
    usdcContract: '0x75faf114eaafb1BDb2C631b34E72fC6D86B7593',
    usdcDecimals: 6,
    chainId: 421614,
    minNativeForSend: 0.0005,
  },
  base: {
    ...MAINNET.base,
    name: 'Base Sepolia (Testnet)',
    explorerUrl: 'https://sepolia.basescan.org',
    explorerApiUrl: 'https://api-sepolia.basescan.org/api',
    rpcUrls: ['https://sepolia.base.org'],
    usdtContract: '0x7169D20Af0D9558C8BfdD8Af2D9F4e3C8C9E5E5E',
    usdcContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    usdcDecimals: 6,
    chainId: 84532,
    minNativeForSend: 0.0005,
  },
  optimism: {
    ...MAINNET.optimism,
    name: 'Optimism Sepolia (Testnet)',
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    explorerApiUrl: 'https://api-sepolia-optimistic.etherscan.io/api',
    rpcUrls: ['https://sepolia.optimism.io'],
    usdtContract: '0x7169D20Af0D9558C8BfdD8Af2D9F4e3C8C9E5E5E',
    usdcContract: '0x5fd84259d066Cb513c2644f8029f0e7B16842044',
    usdcDecimals: 6,
    chainId: 11155420,
    minNativeForSend: 0.0005,
  },
  avalanche: {
    ...MAINNET.avalanche,
    name: 'Avalanche Fuji (Testnet)',
    explorerUrl: 'https://testnet.snowtrace.io',
    explorerApiUrl: 'https://api-testnet.snowtrace.io/api',
    rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
    usdtContract: '0x7169D20Af0D9558C8BfdD8Af2D9F4e3C8C9E5E5E',
    usdcContract: '0x5425890298aed601A748F0a1148953Dfe99B9e7',
    usdcDecimals: 6,
    chainId: 43113,
    minNativeForSend: 0.01,
  },
  zksync: {
    ...MAINNET.zksync,
    name: 'zkSync Sepolia (Testnet)',
    explorerUrl: 'https://sepolia-era.zksync.network',
    explorerApiUrl: 'https://api-sepolia-era.zksync.network/api',
    rpcUrls: ['https://sepolia.era.zksync.dev'],
    usdtContract: '0x7169D20Af0D9558C8BfdD8Af2D9F4e3C8C9E5E5E',
    usdcContract: undefined,
    usdcDecimals: undefined,
    daiContract: undefined,
    daiDecimals: undefined,
    chainId: 300,
    minNativeForSend: 0.0005,
  },
  linea: {
    ...MAINNET.linea,
    name: 'Linea Sepolia (Testnet)',
    explorerUrl: 'https://sepolia.lineascan.build',
    explorerApiUrl: 'https://api-sepolia.lineascan.build/api',
    rpcUrls: ['https://rpc.sepolia.linea.build'],
    usdtContract: '0x7169D20Af0D9558C8BfdD8Af2D9F4e3C8C9E5E5E',
    usdcContract: '0xFEce4462D57bD51A6A552365A011b95f0E16d9B7',
    usdcDecimals: 6,
    daiContract: undefined,
    daiDecimals: undefined,
    chainId: 59141,
    minNativeForSend: 0.0005,
  },
  scroll: {
    ...MAINNET.scroll,
    name: 'Scroll Sepolia (Testnet)',
    explorerUrl: 'https://sepolia.scrollscan.com',
    explorerApiUrl: 'https://api-sepolia.scrollscan.com/api',
    rpcUrls: ['https://sepolia-rpc.scroll.io'],
    usdtContract: '0x7169D20Af0D9558C8BfdD8Af2D9F4e3C8C9E5E5E',
    usdcContract: undefined,
    usdcDecimals: undefined,
    daiContract: undefined,
    daiDecimals: undefined,
    chainId: 534351,
    minNativeForSend: 0.0005,
  },
  ton: {
    ...MAINNET.ton,
    name: 'TON Testnet',
    explorerUrl: 'https://testnet.tonscan.org',
    rpcUrls: ['https://testnet.toncenter.com/api/v2/jsonRPC'],
    apiUrl: 'https://testnet.toncenter.com/api/v2',
    usdtContract: '',
    usdtDecimals: 6,
    minNativeForSend: 0.01,
  },
  solana: {
    ...MAINNET.solana,
    name: 'Solana Devnet',
    explorerUrl: 'https://solscan.io',
    rpcUrls: ['https://api.devnet.solana.com'],
    usdtContract: 'hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux',
    usdcContract: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPFgZDonmtA',
    usdcDecimals: 6,
    minNativeForSend: 0.001,
  },
};

export const ALL_NETWORK_IDS: NetworkId[] = [
  'tron',
  'ethereum',
  'bsc',
  'polygon',
  'arbitrum',
  'base',
  'optimism',
  'avalanche',
  'zksync',
  'linea',
  'scroll',
  'ton',
  'solana',
];

export function getNetworkConfig(id: NetworkId, testnet = false): NetworkConfig {
  const map = testnet ? TESTNET : MAINNET;
  return map[id];
}

export function getAllNetworks(testnet = false): NetworkConfig[] {
  return ALL_NETWORK_IDS.map((id) => getNetworkConfig(id, testnet));
}

export function isSolanaNetwork(id: NetworkId): boolean {
  return getNetworkConfig(id, false).isSolana === true;
}

export function isTonNetwork(id: NetworkId): boolean {
  return getNetworkConfig(id, false).isTon === true;
}

export function isEvmNetwork(id: NetworkId): boolean {
  return getNetworkConfig(id, false).isEvm;
}

export function networkHasUsdc(id: NetworkId, testnet = false): boolean {
  return !!getNetworkConfig(id, testnet).usdcContract;
}

export function networkHasDai(id: NetworkId, testnet = false): boolean {
  if (testnet) return false;
  return !!getNetworkConfig(id, testnet).daiContract;
}

export function getAssetBalanceFromInfo(balance: { usdt: string; usdc?: string; dai?: string }, assetType: SendAssetType): string {
  if (assetType === 'usdc') return balance.usdc || '0';
  if (assetType === 'dai') return balance.dai || '0';
  return balance.usdt;
}

export interface TokenSpec {
  contract: string;
  decimals: number;
  symbol: string;
}

export function getTokenSpec(
  network: NetworkId,
  assetType: SendAssetType,
  testnet = false
): TokenSpec | null {
  if (assetType === 'native') return null;
  const cfg = getNetworkConfig(network, testnet);
  if (assetType === 'usdt') {
    if (!cfg.usdtContract) return null;
    return { contract: cfg.usdtContract, decimals: cfg.usdtDecimals, symbol: cfg.symbol };
  }
  if (assetType === 'usdc' && cfg.usdcContract && cfg.usdcDecimals != null) {
    return { contract: cfg.usdcContract, decimals: cfg.usdcDecimals, symbol: 'USDC' };
  }
  if (assetType === 'dai' && cfg.daiContract && cfg.daiDecimals != null) {
    return { contract: cfg.daiContract, decimals: cfg.daiDecimals, symbol: 'DAI' };
  }
  return null;
}
