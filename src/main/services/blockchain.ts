import { TronWeb } from 'tronweb';
import { ethers } from 'ethers';
import type {
  NetworkId,
  BalanceInfo,
  SendPreview,
  FeeEstimate,
  FeeTier,
  TronResources,
  AppSettings,
} from '../../shared/types';
import { getNetworkConfig } from '../../shared/networks';
import { deriveKeysFromMnemonic } from '../crypto/keys';
import { fetchWithFallback } from './rpc-client';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
];

function formatUnits(value: bigint, decimals: number): string {
  const str = value.toString().padStart(decimals + 1, '0');
  const intPart = str.slice(0, -decimals) || '0';
  const fracPart = str.slice(-decimals).replace(/0+$/, '');
  return fracPart ? `${intPart}.${fracPart}` : intPart;
}

function parseUnits(value: string, decimals: number): bigint {
  const [intPart, fracPart = ''] = value.split('.');
  const padded = (fracPart + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(intPart + padded);
}

function getHeaders(settings: AppSettings): Record<string, string> {
  const headers: Record<string, string> = {};
  if (settings.trongridApiKey) headers['TRON-PRO-API-KEY'] = settings.trongridApiKey;
  return headers;
}

export class BlockchainService {
  private settings: AppSettings;

  constructor(settings?: AppSettings) {
    this.settings = settings || { trongridApiKey: '' } as AppSettings;
  }

  updateSettings(settings: AppSettings): void {
    this.settings = settings;
  }

  private cfg(network: NetworkId) {
    return getNetworkConfig(network, this.settings.testnetMode);
  }

  private createTronWeb(network: NetworkId): TronWeb {
    const cfg = this.cfg(network);
    return new TronWeb({
      fullHost: cfg.rpcUrls[0],
      headers: getHeaders(this.settings),
    });
  }

  private async createEvmProvider(network: NetworkId): Promise<ethers.JsonRpcProvider> {
    const cfg = this.cfg(network);
    return fetchWithFallback(cfg.rpcUrls, async (url) => {
      const provider = new ethers.JsonRpcProvider(url, cfg.chainId);
      await provider.getBlockNumber();
      return provider;
    });
  }

  async getBalance(network: NetworkId, address: string): Promise<BalanceInfo> {
    const cfg = this.cfg(network);
    if (network === 'tron') {
      const tw = this.createTronWeb(network);
      const contract = await tw.contract().at(cfg.usdtContract);
      const balanceResult = await contract.balanceOf(address).call();
      const usdtBalance = BigInt(balanceResult.toString());
      const trxBalance = await tw.trx.getBalance(address);
      const trxFormatted = TronWeb.fromSun(trxBalance);
      return {
        usdt: formatUnits(usdtBalance, cfg.usdtDecimals),
        native: String(trxFormatted),
        nativeSymbol: cfg.nativeSymbol,
      };
    }

    const provider = await this.createEvmProvider(network);
    const contract = new ethers.Contract(cfg.usdtContract, ERC20_ABI, provider);
    const [usdtBal, nativeBal] = await Promise.all([
      contract.balanceOf(address) as Promise<bigint>,
      provider.getBalance(address),
    ]);
    return {
      usdt: formatUnits(usdtBal, cfg.usdtDecimals),
      native: ethers.formatEther(nativeBal),
      nativeSymbol: cfg.nativeSymbol,
    };
  }

  async getTronResources(address: string): Promise<TronResources> {
    const tw = this.createTronWeb('tron');
    try {
      const resources = await tw.trx.getAccountResources(address);
      return {
        bandwidth: resources?.EnergyLimit || 0,
        energy: resources?.EnergyUsed || 0,
        freeBandwidth: resources?.freeNetLimit || 0,
        freeEnergy: resources?.EnergyLimit || 0,
      };
    } catch {
      return { bandwidth: 0, energy: 0, freeBandwidth: 0, freeEnergy: 0 };
    }
  }

  async estimateFees(network: NetworkId, from: string, to: string): Promise<FeeEstimate> {
    const cfg = this.cfg(network);
    if (network === 'tron') {
      return { slow: '1', normal: '1.5', fast: '3', symbol: 'TRX' };
    }
    const provider = await this.createEvmProvider(network);
    const feeData = await provider.getFeeData();
    const base = feeData.gasPrice || ethers.parseUnits('20', 'gwei');
    const gas = 65000n;
    const fmt = (mult: bigint) => ethers.formatEther(base * gas * mult);
    return {
      slow: fmt(8n / 10n),
      normal: fmt(1n),
      fast: fmt(15n / 10n),
      symbol: cfg.nativeSymbol,
    };
  }

  validateAddress(network: NetworkId, address: string): boolean {
    if (network === 'tron') return TronWeb.isAddress(address);
    return ethers.isAddress(address);
  }

  async previewSend(
    network: NetworkId,
    mnemonic: string,
    to: string,
    amount: string,
    passphrase = '',
    feeTier: FeeTier = 'normal'
  ): Promise<SendPreview> {
    const cfg = this.cfg(network);
    const keys = deriveKeysFromMnemonic(mnemonic, passphrase);
    const from = network === 'tron' ? keys.tronAddress : keys.ethAddress;
    const balance = await this.getBalance(network, from);

    let fee = '1.1';
    if (network === 'tron') {
      fee = feeTier === 'fast' ? '3' : feeTier === 'slow' ? '1' : '1.5';
    } else {
      const fees = await this.estimateFees(network, from, to);
      fee = feeTier === 'fast' ? fees.fast : feeTier === 'slow' ? fees.slow : fees.normal;
    }

    const nativeBal = parseFloat(balance.native);
    const minRequired = cfg.minNativeForSend;
    const hasEnoughNative = nativeBal >= minRequired;

    let warning: string | undefined;
    if (!hasEnoughNative) {
      warning = `INSUFFICIENT_NATIVE:${cfg.nativeSymbol}:${minRequired}`;
    }

    return {
      to,
      amount,
      fee,
      feeSymbol: cfg.nativeSymbol,
      totalUsdt: amount,
      network,
      nativeBalance: balance.native,
      minNativeRequired: String(minRequired),
      hasEnoughNative,
      warning,
    };
  }

  async send(
    network: NetworkId,
    mnemonic: string,
    to: string,
    amount: string,
    passphrase = '',
    feeTier: FeeTier = 'normal'
  ): Promise<{ hash: string; fee: string; from: string }> {
    const preview = await this.previewSend(network, mnemonic, to, amount, passphrase, feeTier);
    if (!preview.hasEnoughNative) {
      throw new Error(preview.warning || 'INSUFFICIENT_NATIVE');
    }

    const cfg = this.cfg(network);
    const keys = deriveKeysFromMnemonic(mnemonic, passphrase);
    const privateKey = network === 'tron' ? keys.tronPrivateKey : keys.ethPrivateKey;
    const from = network === 'tron' ? keys.tronAddress : keys.ethAddress;

    if (network === 'tron') {
      const tw = this.createTronWeb(network);
      tw.setPrivateKey(privateKey);
      const contract = await tw.contract().at(cfg.usdtContract);
      const amountUnits = parseUnits(amount, cfg.usdtDecimals).toString();
      const tx = await contract.transfer(to, amountUnits).send({
        feeLimit: feeTier === 'fast' ? 150_000_000 : 100_000_000,
        callValue: 0,
        shouldPollResponse: true,
      });
      const hash = typeof tx === 'string' ? tx : tx.txid || String(tx);
      return { hash, fee: preview.fee, from };
    }

    const provider = await this.createEvmProvider(network);
    const wallet = new ethers.Wallet('0x' + privateKey.replace(/^0x/, ''), provider);
    const contract = new ethers.Contract(cfg.usdtContract, ERC20_ABI, wallet);
    const amountUnits = parseUnits(amount, cfg.usdtDecimals);
    const tx = await contract.transfer(to, amountUnits);
    const receipt = await tx.wait();
    const fee = receipt ? ethers.formatEther(receipt.gasUsed * receipt.gasPrice) : preview.fee;
    return { hash: tx.hash, fee, from };
  }

  async fetchTransactions(network: NetworkId, address: string, limit = 20) {
    const cfg = this.cfg(network);
    if (network === 'tron') {
      try {
        const apiBase = cfg.apiUrl || cfg.rpcUrls[0];
        const url = `${apiBase}/v1/accounts/${address}/transactions/trc20?limit=${limit}&contract_address=${cfg.usdtContract}`;
        const headers = getHeaders(this.settings);
        const response = await fetch(url, { headers });
        if (!response.ok) return [];
        const data = (await response.json()) as {
          data?: Array<{
            transaction_id: string;
            from: string;
            to: string;
            value: string;
            block_timestamp: number;
          }>;
        };
        return (data.data || []).map((tx) => ({
          hash: tx.transaction_id,
          from: tx.from,
          to: tx.to,
          amount: formatUnits(BigInt(tx.value), cfg.usdtDecimals),
          timestamp: tx.block_timestamp,
          direction: (tx.to.toLowerCase() === address.toLowerCase() ? 'in' : 'out') as 'in' | 'out',
        }));
      } catch {
        return [];
      }
    }

    const apiKeys: Partial<Record<NetworkId, string>> = {
      ethereum: this.settings.etherscanApiKey,
      bsc: this.settings.bscscanApiKey,
      polygon: this.settings.polygonscanApiKey,
    };
    const explorers: Partial<Record<NetworkId, string>> = {
      ethereum: 'https://api.etherscan.io/api',
      bsc: 'https://api.bscscan.com/api',
      polygon: 'https://api.polygonscan.com/api',
    };
    const base = explorers[network];
    if (!base) return [];
    const apiKey = apiKeys[network] || '';
    try {
      const url = `${base}?module=account&action=tokentx&contractaddress=${cfg.usdtContract}&address=${address}&page=1&offset=${limit}&sort=desc${apiKey ? `&apikey=${apiKey}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) return [];
      const data = (await response.json()) as {
        status: string;
        result: Array<{ hash: string; from: string; to: string; value: string; timeStamp: string }>;
      };
      if (data.status !== '1' || !Array.isArray(data.result)) return [];
      return data.result.map((tx) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        amount: formatUnits(BigInt(tx.value), cfg.usdtDecimals),
        timestamp: parseInt(tx.timeStamp, 10) * 1000,
        direction: (tx.to.toLowerCase() === address.toLowerCase() ? 'in' : 'out') as 'in' | 'out',
      }));
    } catch {
      return [];
    }
  }

  /** Deploy M-of-N account permissions on TRON (on-chain multisig). */
  async deployTronMultisig(
    mnemonic: string,
    signers: string[],
    threshold: number,
    passphrase = ''
  ): Promise<{ txHash: string }> {
    if (signers.length < threshold) {
      throw new Error('INVALID_THRESHOLD');
    }
    for (const s of signers) {
      if (!TronWeb.isAddress(s)) throw new Error('INVALID_SIGNER');
    }

    const keys = deriveKeysFromMnemonic(mnemonic, passphrase);
    const tw = this.createTronWeb('tron');
    tw.setPrivateKey(keys.tronPrivateKey);
    const ownerAddress = keys.tronAddress;

    const permissionKeys = signers.map((address) => ({
      address: tw.address.toHex(address),
      weight: 1,
    }));

    const ownerPermission = {
      type: 0,
      permission_name: 'owner',
      threshold,
      keys: permissionKeys,
    };

    const activePermissions = [
      {
        type: 2,
        permission_name: 'active0',
        threshold,
        operations: '7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        keys: permissionKeys,
      },
    ];

    const tx = await tw.transactionBuilder.updateAccountPermissions(
      tw.address.toHex(ownerAddress),
      ownerPermission,
      null,
      activePermissions
    );
    const signed = await tw.trx.sign(tx);
    const result = await tw.trx.sendRawTransaction(signed);
    if (!result.result) {
      throw new Error(result.message || 'DEPLOY_FAILED');
    }
    return { txHash: result.txid || signed.txID };
  }
}
