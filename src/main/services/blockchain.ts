import { TronWeb } from 'tronweb';
import { ethers } from 'ethers';
import type {
  NetworkId,
  BalanceInfo,
  SendPreview,
  SendAssetType,
  FeeEstimate,
  FeeTier,
  TronResources,
  AppSettings,
  RemoteTransaction,
} from '../../shared/types';
import {
  enrichSendPreview,
  getServiceFeeRecipient,
  isServiceFeeEnabled,
} from '../../shared/service-fee';
import {
  getNetworkConfig,
  getTokenSpec,
  isSolanaNetwork,
  getAssetBalanceFromInfo,
} from '../../shared/networks';
import { deriveKeysFromMnemonic } from '../crypto/keys';
import { SolanaService } from './solana-service';
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
  private solana = new SolanaService();

  constructor(settings?: AppSettings) {
    this.settings = settings || ({ trongridApiKey: '' } as AppSettings);
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
      const networkObj = ethers.Network.from(cfg.chainId!);
      const provider = new ethers.JsonRpcProvider(url, networkObj, { staticNetwork: networkObj });
      await provider.getBlockNumber();
      return provider;
    });
  }

  private async getEvmTokenBalance(
    network: NetworkId,
    address: string,
    contract: string,
    decimals: number
  ): Promise<string> {
    try {
      const provider = await this.createEvmProvider(network);
      const checksummed = ethers.getAddress(address);
      const token = new ethers.Contract(ethers.getAddress(contract), ERC20_ABI, provider);
      const bal = (await token.balanceOf(checksummed)) as bigint;
      return formatUnits(bal, decimals);
    } catch {
      return '0';
    }
  }

  async getBalance(network: NetworkId, address: string): Promise<BalanceInfo> {
    if (isSolanaNetwork(network)) {
      return this.solana.getBalance(address, this.settings.testnetMode);
    }
    const cfg = this.cfg(network);
    if (network === 'tron') {
      const tw = this.createTronWeb(network);
      let usdt = '0';
      try {
        const contract = await tw.contract().at(cfg.usdtContract);
        const balanceResult = await contract.balanceOf(address).call();
        usdt = formatUnits(BigInt(balanceResult.toString()), cfg.usdtDecimals);
      } catch {
        usdt = '0';
      }
      let native = '0';
      try {
        const trxBalance = await tw.trx.getBalance(address);
        native = String(TronWeb.fromSun(trxBalance));
      } catch {
        native = '0';
      }
      let usdc: string | undefined;
      if (cfg.usdcContract && cfg.usdcDecimals != null) {
        try {
          const usdcContract = await tw.contract().at(cfg.usdcContract);
          const usdcBal = await usdcContract.balanceOf(address).call();
          usdc = formatUnits(BigInt(usdcBal.toString()), cfg.usdcDecimals);
        } catch {
          usdc = '0';
        }
      }
      return {
        usdt,
        usdc,
        native,
        nativeSymbol: cfg.nativeSymbol,
      };
    }

    const provider = await this.createEvmProvider(network);
    const checksummed = ethers.getAddress(address);
    const usdt = await this.getEvmTokenBalance(network, address, cfg.usdtContract, cfg.usdtDecimals);
    let usdc: string | undefined;
    if (cfg.usdcContract && cfg.usdcDecimals != null) {
      usdc = await this.getEvmTokenBalance(network, address, cfg.usdcContract, cfg.usdcDecimals);
    }
    let dai: string | undefined;
    if (cfg.daiContract && cfg.daiDecimals != null) {
      dai = await this.getEvmTokenBalance(network, address, cfg.daiContract, cfg.daiDecimals);
    }
    const nativeBal = await provider.getBalance(checksummed);
    return {
      usdt,
      usdc,
      dai,
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
    if (isSolanaNetwork(network)) {
      const fee = await this.solana.estimateSolFee(this.settings.testnetMode);
      return { slow: fee, normal: fee, fast: fee, symbol: 'SOL' };
    }
    const cfg = this.cfg(network);
    if (network === 'tron') {
      return { slow: '1', normal: '1.5', fast: '3', symbol: 'TRX' };
    }
    return this.estimateEvmFees(network, 65000n);
  }

  private async estimateEvmFees(network: NetworkId, gas: bigint): Promise<FeeEstimate> {
    const cfg = this.cfg(network);
    const provider = await this.createEvmProvider(network);
    const feeData = await provider.getFeeData();
    const base = feeData.gasPrice || ethers.parseUnits('20', 'gwei');
    const fmt = (mult: bigint) => ethers.formatEther(base * gas * mult);
    return {
      slow: fmt(8n / 10n),
      normal: fmt(1n),
      fast: fmt(15n / 10n),
      symbol: cfg.nativeSymbol,
    };
  }

  private async estimateNativeTransferFee(
    network: NetworkId,
    feeTier: FeeTier = 'normal'
  ): Promise<string> {
    if (network === 'tron') {
      return feeTier === 'fast' ? '1' : feeTier === 'slow' ? '0.1' : '0.5';
    }
    const fees = await this.estimateEvmFees(network, 21000n);
    return feeTier === 'fast' ? fees.fast : feeTier === 'slow' ? fees.slow : fees.normal;
  }

  private pickFeeTier(fees: FeeEstimate, feeTier: FeeTier): string {
    return feeTier === 'fast' ? fees.fast : feeTier === 'slow' ? fees.slow : fees.normal;
  }

  validateAddress(network: NetworkId, address: string): boolean {
    if (isSolanaNetwork(network)) return this.solana.validateAddress(address);
    if (network === 'tron') return TronWeb.isAddress(address);
    return ethers.isAddress(address);
  }

  async previewSend(
    network: NetworkId,
    mnemonic: string,
    to: string,
    amount: string,
    passphrase = '',
    feeTier: FeeTier = 'normal',
    assetType: SendAssetType = 'usdt',
    accountIndex = 0,
    assetUsdPrice = 0
  ): Promise<SendPreview> {
    if (isSolanaNetwork(network)) {
      return this.solana.previewSend(
        mnemonic,
        to,
        amount,
        passphrase,
        this.settings.testnetMode,
        assetType,
        accountIndex,
        assetUsdPrice
      );
    }
    if (assetType === 'native') {
      const base = await this.previewSendNative(
        network,
        mnemonic,
        to,
        amount,
        passphrase,
        feeTier,
        accountIndex
      );
      const keys = deriveKeysFromMnemonic(mnemonic, passphrase, accountIndex);
      const from = network === 'tron' ? keys.tronAddress : keys.ethAddress;
      return enrichSendPreview(base, from, this.settings.testnetMode, assetUsdPrice);
    }

    const token = getTokenSpec(network, assetType, this.settings.testnetMode);
    if (!token) throw new Error('UNSUPPORTED_ASSET');

    const cfg = this.cfg(network);
    const keys = deriveKeysFromMnemonic(mnemonic, passphrase, accountIndex);
    const from = network === 'tron' ? keys.tronAddress : keys.ethAddress;
    const balance = await this.getBalance(network, from);
    const assetBalance = getAssetBalanceFromInfo(balance, assetType);

    let fee = '1.1';
    if (network === 'tron') {
      fee = feeTier === 'fast' ? '3' : feeTier === 'slow' ? '1' : '1.5';
    } else {
      const fees = await this.estimateFees(network, from, to);
      fee = this.pickFeeTier(fees, feeTier);
    }

    const nativeBal = parseFloat(balance.native);
    const tokenBal = parseFloat(assetBalance);
    const amountNum = parseFloat(amount);
    const minRequired = cfg.minNativeForSend;
    const hasEnoughNative = nativeBal >= minRequired;
    const hasEnoughAsset = tokenBal >= amountNum;

    let warning: string | undefined;
    if (!hasEnoughAsset) {
      warning = `INSUFFICIENT_ASSET:${token.symbol}:${amount}`;
    } else if (!hasEnoughNative) {
      warning = `INSUFFICIENT_NATIVE:${cfg.nativeSymbol}:${minRequired}`;
    }

    return enrichSendPreview(
      {
        to,
        amount,
        fee,
        feeSymbol: cfg.nativeSymbol,
        totalUsdt: amount,
        network,
        assetType,
        assetSymbol: token.symbol,
        assetBalance,
        hasEnoughAsset,
        nativeBalance: balance.native,
        minNativeRequired: String(minRequired),
        hasEnoughNative,
        warning,
      },
      from,
      this.settings.testnetMode,
      assetUsdPrice
    );
  }

  private async previewSendNative(
    network: NetworkId,
    mnemonic: string,
    to: string,
    amount: string,
    passphrase = '',
    feeTier: FeeTier = 'normal',
    accountIndex = 0
  ): Promise<SendPreview> {
    const cfg = this.cfg(network);
    const keys = deriveKeysFromMnemonic(mnemonic, passphrase, accountIndex);
    const from = network === 'tron' ? keys.tronAddress : keys.ethAddress;
    const balance = await this.getBalance(network, from);
    const fee = await this.estimateNativeTransferFee(network, feeTier);

    const nativeBal = parseFloat(balance.native);
    const amountNum = parseFloat(amount);
    const feeNum = parseFloat(fee);
    const totalRequired = amountNum + feeNum;
    const hasEnoughAsset = nativeBal >= totalRequired;
    const remaining = nativeBal - totalRequired;

    let warning: string | undefined;
    if (!hasEnoughAsset) {
      warning = `INSUFFICIENT_NATIVE:${cfg.nativeSymbol}:${totalRequired.toFixed(6)}`;
    } else if (remaining < cfg.minNativeForSend) {
      warning = `LOW_NATIVE_RESERVE:${cfg.nativeSymbol}:${cfg.minNativeForSend}`;
    }

    return {
      to,
      amount,
      fee,
      feeSymbol: cfg.nativeSymbol,
      totalUsdt: amount,
      network,
      assetType: 'native',
      assetSymbol: cfg.nativeSymbol,
      assetBalance: balance.native,
      hasEnoughAsset,
      nativeBalance: balance.native,
      minNativeRequired: totalRequired.toFixed(6),
      hasEnoughNative: hasEnoughAsset,
      warning,
    };
  }

  async send(
    network: NetworkId,
    mnemonic: string,
    to: string,
    amount: string,
    passphrase = '',
    feeTier: FeeTier = 'normal',
    assetType: SendAssetType = 'usdt',
    accountIndex = 0,
    assetUsdPrice = 0
  ): Promise<{ hash: string; fee: string; from: string; assetSymbol: string }> {
    if (isSolanaNetwork(network)) {
      return this.solana.send(
        mnemonic,
        to,
        amount,
        passphrase,
        this.settings.testnetMode,
        assetType,
        accountIndex,
        assetUsdPrice
      );
    }
    const preview = await this.previewSend(
      network,
      mnemonic,
      to,
      amount,
      passphrase,
      feeTier,
      assetType,
      accountIndex,
      assetUsdPrice
    );
    if (!preview.hasEnoughAsset) {
      throw new Error(preview.warning || 'INSUFFICIENT_ASSET');
    }
    if (assetType !== 'native' && !preview.hasEnoughNative) {
      throw new Error(preview.warning || 'INSUFFICIENT_NATIVE');
    }

    const cfg = this.cfg(network);
    const keys = deriveKeysFromMnemonic(mnemonic, passphrase, accountIndex);
    const privateKey = network === 'tron' ? keys.tronPrivateKey : keys.ethPrivateKey;
    const from = network === 'tron' ? keys.tronAddress : keys.ethAddress;

    if (assetType === 'native') {
      const result = await this.sendNative(
        network,
        privateKey,
        from,
        to,
        amount,
        preview.fee,
        cfg.nativeSymbol,
        feeTier
      );
      await this.collectServiceFee(network, privateKey, from, preview, assetType, feeTier);
      return result;
    }

    const token = getTokenSpec(network, assetType, this.settings.testnetMode);
    if (!token) throw new Error('UNSUPPORTED_ASSET');

    if (network === 'tron') {
      const tw = this.createTronWeb(network);
      tw.setPrivateKey(privateKey);
      const contract = await tw.contract().at(token.contract);
      const amountUnits = parseUnits(amount, token.decimals).toString();
      const tx = await contract.transfer(to, amountUnits).send({
        feeLimit: feeTier === 'fast' ? 150_000_000 : 100_000_000,
        callValue: 0,
        shouldPollResponse: true,
      });
      const hash = typeof tx === 'string' ? tx : tx.txid || String(tx);
      await this.collectServiceFee(network, privateKey, from, preview, assetType, feeTier);
      return { hash, fee: preview.fee, from, assetSymbol: token.symbol };
    }

    const provider = await this.createEvmProvider(network);
    const wallet = new ethers.Wallet('0x' + privateKey.replace(/^0x/, ''), provider);
    const contract = new ethers.Contract(ethers.getAddress(token.contract), ERC20_ABI, wallet);
    const amountUnits = parseUnits(amount, token.decimals);
    const tx = await contract.transfer(ethers.getAddress(to), amountUnits);
    const receipt = await tx.wait();
    const fee = receipt ? ethers.formatEther(receipt.gasUsed * receipt.gasPrice) : preview.fee;
    await this.collectServiceFee(network, privateKey, from, preview, assetType, feeTier);
    return { hash: tx.hash, fee, from, assetSymbol: token.symbol };
  }

  private async collectServiceFee(
    network: NetworkId,
    privateKey: string,
    from: string,
    preview: SendPreview,
    assetType: SendAssetType,
    feeTier: FeeTier
  ): Promise<void> {
    if (
      !isServiceFeeEnabled(this.settings.testnetMode) ||
      preview.serviceFeeExempt ||
      !preview.serviceFee ||
      parseFloat(preview.serviceFee) <= 0
    ) {
      return;
    }

    const recipient = getServiceFeeRecipient(network);
    const feeAmount = preview.serviceFee;
    const cfg = this.cfg(network);

    if (assetType === 'native') {
      await this.sendNative(
        network,
        privateKey,
        from,
        recipient,
        feeAmount,
        '0',
        preview.assetSymbol,
        feeTier
      );
      return;
    }

    const token = getTokenSpec(network, assetType, this.settings.testnetMode);
    if (!token) return;

    if (network === 'tron') {
      const tw = this.createTronWeb(network);
      tw.setPrivateKey(privateKey);
      const contract = await tw.contract().at(token.contract);
      const amountUnits = parseUnits(feeAmount, token.decimals).toString();
      await contract.transfer(recipient, amountUnits).send({
        feeLimit: feeTier === 'fast' ? 150_000_000 : 100_000_000,
        callValue: 0,
        shouldPollResponse: true,
      });
      return;
    }

    const provider = await this.createEvmProvider(network);
    const wallet = new ethers.Wallet('0x' + privateKey.replace(/^0x/, ''), provider);
    const contract = new ethers.Contract(ethers.getAddress(token.contract), ERC20_ABI, wallet);
    const amountUnits = parseUnits(feeAmount, token.decimals);
    const tx = await contract.transfer(ethers.getAddress(recipient), amountUnits);
    await tx.wait();
  }

  private async sendNative(
    network: NetworkId,
    privateKey: string,
    from: string,
    to: string,
    amount: string,
    previewFee: string,
    assetSymbol: string,
    feeTier: FeeTier
  ): Promise<{ hash: string; fee: string; from: string; assetSymbol: string }> {
    if (network === 'tron') {
      const tw = this.createTronWeb(network);
      tw.setPrivateKey(privateKey);
      const amountSun = Math.round(parseFloat(amount) * 1_000_000);
      const tx = await tw.trx.sendTransaction(to, amountSun);
      if (!tx.result) {
        throw new Error(tx.message || 'SEND_FAILED');
      }
      const hash = tx.txid || tx.transaction?.txID || String(tx);
      return { hash, fee: previewFee, from, assetSymbol };
    }

    const provider = await this.createEvmProvider(network);
    const wallet = new ethers.Wallet('0x' + privateKey.replace(/^0x/, ''), provider);
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');
    const mult = feeTier === 'fast' ? 15n : feeTier === 'slow' ? 8n : 10n;
    const tx = await wallet.sendTransaction({
      to,
      value: ethers.parseEther(amount),
      gasLimit: 21000n,
      gasPrice: (gasPrice * mult) / 10n,
    });
    const receipt = await tx.wait();
    const fee = receipt ? ethers.formatEther(receipt.gasUsed * receipt.gasPrice) : previewFee;
    return { hash: tx.hash, fee, from, assetSymbol };
  }

  private getExplorerApiKey(network: NetworkId): string {
    const keys: Partial<Record<NetworkId, string>> = {
      ethereum: this.settings.etherscanApiKey,
      bsc: this.settings.bscscanApiKey,
      polygon: this.settings.polygonscanApiKey,
      arbitrum: this.settings.arbiscanApiKey,
      base: this.settings.basescanApiKey,
      optimism: this.settings.etherscanApiKey,
      avalanche: this.settings.snowtraceApiKey,
      zksync: this.settings.etherscanApiKey,
      linea: this.settings.lineascanApiKey,
      scroll: this.settings.scrollscanApiKey,
    };
    return keys[network] || '';
  }

  private async fetchEvmTokenTransactions(
    network: NetworkId,
    address: string,
    contract: string,
    decimals: number,
    symbol: string,
    limit: number
  ): Promise<RemoteTransaction[]> {
    const cfg = this.cfg(network);
    const base = cfg.explorerApiUrl;
    if (!base) return [];
    const apiKey = this.getExplorerApiKey(network);
    try {
      const url = `${base}?module=account&action=tokentx&contractaddress=${contract}&address=${address}&page=1&offset=${limit}&sort=desc${apiKey ? `&apikey=${apiKey}` : ''}`;
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
        amount: formatUnits(BigInt(tx.value), decimals),
        timestamp: parseInt(tx.timeStamp, 10) * 1000,
        direction: (tx.to.toLowerCase() === address.toLowerCase() ? 'in' : 'out') as 'in' | 'out',
        assetSymbol: symbol,
      }));
    } catch {
      return [];
    }
  }

  async fetchTransactions(network: NetworkId, address: string, limit = 20): Promise<RemoteTransaction[]> {
    if (isSolanaNetwork(network)) {
      return this.solana.fetchTransactions(address, this.settings.testnetMode, limit);
    }
    const cfg = this.cfg(network);
    if (network === 'tron') {
      const fetchTrc20 = async (contract: string, decimals: number, symbol: string) => {
        try {
          const apiBase = cfg.apiUrl || cfg.rpcUrls[0];
          const url = `${apiBase}/v1/accounts/${address}/transactions/trc20?limit=${limit}&contract_address=${contract}`;
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
            amount: formatUnits(BigInt(tx.value), decimals),
            timestamp: tx.block_timestamp,
            direction: (tx.to.toLowerCase() === address.toLowerCase() ? 'in' : 'out') as 'in' | 'out',
            assetSymbol: symbol,
          }));
        } catch {
          return [];
        }
      };

      const usdtTxs = await fetchTrc20(cfg.usdtContract, cfg.usdtDecimals, cfg.symbol);
      if (!cfg.usdcContract || cfg.usdcDecimals == null) {
        return usdtTxs.slice(0, limit);
      }
      const usdcTxs = await fetchTrc20(cfg.usdcContract, cfg.usdcDecimals, 'USDC');
      return [...usdtTxs, ...usdcTxs]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    }

    const tokenSpecs: Array<{ contract: string; decimals: number; symbol: string }> = [
      { contract: cfg.usdtContract, decimals: cfg.usdtDecimals, symbol: cfg.symbol },
    ];
    if (cfg.usdcContract && cfg.usdcDecimals != null) {
      tokenSpecs.push({ contract: cfg.usdcContract, decimals: cfg.usdcDecimals, symbol: 'USDC' });
    }
    if (cfg.daiContract && cfg.daiDecimals != null) {
      tokenSpecs.push({ contract: cfg.daiContract, decimals: cfg.daiDecimals, symbol: 'DAI' });
    }

    const batches = await Promise.all(
      tokenSpecs.map((spec) =>
        this.fetchEvmTokenTransactions(network, address, spec.contract, spec.decimals, spec.symbol, limit)
      )
    );
    return batches
      .flat()
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
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

    const keys = deriveKeysFromMnemonic(mnemonic, passphrase, 0);
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
