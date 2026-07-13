import { Transaction, Address, NETWORK, TEST_NETWORK } from '@scure/btc-signer';
import type { BalanceInfo, FeeTier, RemoteTransaction, SendPreview } from '../../shared/types';
import { getNetworkConfig } from '../../shared/networks';
import { enrichSendPreview, getServiceFeeRecipient, isServiceFeeEnabled } from '../../shared/service-fee';
import {
  deriveBitcoinKeyMaterial,
  bitcoinPaymentScript,
} from '../crypto/bitcoin-keys';

const SAT = 100_000_000n;

interface MempoolUtxo {
  txid: string;
  vout: number;
  value: number;
  status?: { confirmed?: boolean };
}

interface MempoolFees {
  fastestFee: number;
  halfHourFee: number;
  economyFee: number;
  minimumFee: number;
}

function btcNetwork(testnet: boolean) {
  return testnet ? TEST_NETWORK : NETWORK;
}

function parseBtc(value: string): bigint {
  const trimmed = value.trim();
  if (!trimmed) return 0n;
  const [whole, frac = ''] = trimmed.split('.');
  const padded = (frac + '00000000').slice(0, 8);
  return BigInt(whole || '0') * SAT + BigInt(padded);
}

function formatBtc(sats: bigint): string {
  const negative = sats < 0n;
  const abs = negative ? -sats : sats;
  const whole = abs / SAT;
  const frac = abs % SAT;
  const fracStr = frac.toString().padStart(8, '0').replace(/0+$/, '');
  const out = fracStr ? `${whole}.${fracStr}` : whole.toString();
  return negative ? `-${out}` : out;
}

function feeRateForTier(fees: MempoolFees, tier: FeeTier): number {
  if (tier === 'fast') return fees.fastestFee;
  if (tier === 'slow') return fees.economyFee;
  return fees.halfHourFee;
}

function estimateVsize(inputCount: number, outputCount: number): number {
  return 10 + inputCount * 68 + outputCount * 31;
}

export class BitcoinService {
  private apiBase(testnet: boolean): string {
    return getNetworkConfig('bitcoin', testnet).apiUrl || 'https://mempool.space/api';
  }

  validateAddress(address: string, testnet: boolean): boolean {
    try {
      Address(btcNetwork(testnet)).decode(address);
      return true;
    } catch {
      return false;
    }
  }

  async getBalance(address: string, testnet: boolean): Promise<BalanceInfo> {
    const cfg = getNetworkConfig('bitcoin', testnet);
    try {
      const res = await fetch(`${this.apiBase(testnet)}/address/${address}`);
      if (!res.ok) throw new Error('BTC_BALANCE_FAILED');
      const data = (await res.json()) as {
        chain_stats?: { funded_txo_sum?: number; spent_txo_sum?: number };
      };
      const funded = BigInt(data.chain_stats?.funded_txo_sum ?? 0);
      const spent = BigInt(data.chain_stats?.spent_txo_sum ?? 0);
      const sats = funded - spent;
      return {
        usdt: '0',
        native: formatBtc(sats),
        nativeSymbol: cfg.nativeSymbol,
      };
    } catch {
      return { usdt: '0', native: '0', nativeSymbol: cfg.nativeSymbol };
    }
  }

  async fetchUtxos(address: string, testnet: boolean): Promise<MempoolUtxo[]> {
    const res = await fetch(`${this.apiBase(testnet)}/address/${address}/utxo`);
    if (!res.ok) throw new Error('BTC_UTXO_FETCH_FAILED');
    const utxos = (await res.json()) as MempoolUtxo[];
    return utxos.filter((u) => u.value > 0);
  }

  async fetchRecommendedFees(testnet: boolean): Promise<MempoolFees> {
    try {
      const res = await fetch(`${this.apiBase(testnet)}/v1/fees/recommended`);
      if (!res.ok) throw new Error('BTC_FEES_FAILED');
      return (await res.json()) as MempoolFees;
    } catch {
      return { fastestFee: 20, halfHourFee: 12, economyFee: 6, minimumFee: 1 };
    }
  }

  async estimateNetworkFee(
    testnet: boolean,
    feeTier: FeeTier,
    inputCount = 1,
    outputCount = 2
  ): Promise<string> {
    const fees = await this.fetchRecommendedFees(testnet);
    const rate = feeRateForTier(fees, feeTier);
    const vsize = estimateVsize(inputCount, outputCount);
    const feeSats = BigInt(Math.ceil(vsize * rate));
    return formatBtc(feeSats);
  }

  async estimateFees(testnet: boolean): Promise<{ slow: string; normal: string; fast: string }> {
    const [slow, normal, fast] = await Promise.all([
      this.estimateNetworkFee(testnet, 'slow'),
      this.estimateNetworkFee(testnet, 'normal'),
      this.estimateNetworkFee(testnet, 'fast'),
    ]);
    return { slow, normal, fast };
  }

  private selectUtxos(utxos: MempoolUtxo[], targetSats: bigint): MempoolUtxo[] {
    const sorted = [...utxos].sort((a, b) => b.value - a.value);
    const picked: MempoolUtxo[] = [];
    let total = 0n;
    for (const u of sorted) {
      picked.push(u);
      total += BigInt(u.value);
      if (total >= targetSats) break;
    }
    if (total < targetSats) throw new Error('INSUFFICIENT_BTC');
    return picked;
  }

  async previewSend(
    mnemonic: string,
    to: string,
    amount: string,
    passphrase: string,
    testnet: boolean,
    feeTier: FeeTier,
    accountIndex = 0,
    assetUsdPrice = 0
  ): Promise<SendPreview> {
    const cfg = getNetworkConfig('bitcoin', testnet);
    const keys = deriveBitcoinKeyMaterial(mnemonic, passphrase, accountIndex, testnet);
    const from = keys.address;
    const balance = await this.getBalance(from, testnet);
    const amountSats = parseBtc(amount);
    const networkFee = await this.estimateNetworkFee(testnet, feeTier, 1, 2);
    const feeSats = parseBtc(networkFee);

    const base: SendPreview = {
      network: 'bitcoin',
      to,
      amount,
      fee: networkFee,
      feeSymbol: cfg.nativeSymbol,
      totalUsdt: amount,
      assetType: 'native',
      assetSymbol: cfg.nativeSymbol,
      assetBalance: balance.native,
      hasEnoughAsset: false,
      nativeBalance: balance.native,
      minNativeRequired: formatBtc(amountSats + feeSats),
      hasEnoughNative: false,
    };

    const enriched = enrichSendPreview(base, from, testnet, assetUsdPrice);
    const totalRequired = parseBtc(enriched.totalAssetDebit || amount) + feeSats;
    const nativeBal = parseBtc(balance.native);
    const hasEnough = nativeBal >= totalRequired;
    let warning = enriched.warning;
    if (!hasEnough) {
      warning = `INSUFFICIENT_NATIVE:BTC:${formatBtc(totalRequired)}`;
    }

    return {
      ...enriched,
      hasEnoughAsset: hasEnough,
      hasEnoughNative: hasEnough,
      minNativeRequired: formatBtc(totalRequired),
      warning,
    };
  }

  async send(
    mnemonic: string,
    to: string,
    amount: string,
    passphrase: string,
    testnet: boolean,
    feeTier: FeeTier,
    accountIndex = 0,
    assetUsdPrice = 0
  ): Promise<{ hash: string; fee: string; from: string; assetSymbol: string }> {
    const preview = await this.previewSend(
      mnemonic,
      to,
      amount,
      passphrase,
      testnet,
      feeTier,
      accountIndex,
      assetUsdPrice
    );
    if (!preview.hasEnoughAsset) throw new Error(preview.warning || 'INSUFFICIENT_BTC');

    const cfg = getNetworkConfig('bitcoin', testnet);
    const net = btcNetwork(testnet);
    const keys = deriveBitcoinKeyMaterial(mnemonic, passphrase, accountIndex, testnet);
    const from = keys.address;
    const amountSats = parseBtc(amount);
    const serviceFeeSats =
      preview.serviceFee && !preview.serviceFeeExempt && parseFloat(preview.serviceFee) > 0
        ? parseBtc(preview.serviceFee)
        : 0n;
    const serviceRecipient =
      serviceFeeSats > 0n && isServiceFeeEnabled(testnet)
        ? getServiceFeeRecipient('bitcoin').trim()
        : '';

    const fees = await this.fetchRecommendedFees(testnet);
    const feeRate = BigInt(feeRateForTier(fees, feeTier));

    let outputCount = 1 + (serviceRecipient && serviceFeeSats > 0n ? 1 : 0) + 1;
    let feeSats = BigInt(estimateVsize(1, outputCount)) * feeRate;
    let target = amountSats + serviceFeeSats + feeSats;

    const utxos = await this.fetchUtxos(from, testnet);
    let selected = this.selectUtxos(utxos, target);
    let inputCount = selected.length;
    feeSats = BigInt(estimateVsize(inputCount, outputCount)) * feeRate;
    target = amountSats + serviceFeeSats + feeSats;
    selected = this.selectUtxos(utxos, target);

    const inputTotal = selected.reduce((sum, u) => sum + BigInt(u.value), 0n);
    feeSats = BigInt(estimateVsize(selected.length, outputCount)) * feeRate;
    const changeSats = inputTotal - amountSats - serviceFeeSats - feeSats;
    const dust = 546n;
    const hasChange = changeSats > dust;
    if (!hasChange && changeSats < 0n) throw new Error('INSUFFICIENT_BTC');

    if (!hasChange) outputCount -= 1;
    feeSats = BigInt(estimateVsize(selected.length, outputCount)) * feeRate;
    const finalChange = inputTotal - amountSats - serviceFeeSats - feeSats;
    if (finalChange < 0n) throw new Error('INSUFFICIENT_BTC');

    const script = bitcoinPaymentScript(keys.publicKey, testnet);
    const tx = new Transaction({ allowUnknownOutputs: true });

    for (const u of selected) {
      tx.addInput({
        txid: u.txid,
        index: u.vout,
        witnessUtxo: { script, amount: BigInt(u.value) },
      });
    }

    tx.addOutputAddress(to, amountSats, net);
    if (serviceRecipient && serviceFeeSats > 0n) {
      tx.addOutputAddress(serviceRecipient, serviceFeeSats, net);
    }
    if (hasChange && finalChange > dust) {
      tx.addOutputAddress(from, finalChange, net);
    }

    tx.sign(keys.privateKey);
    tx.finalize();
    const hex = tx.hex;

    const broadcast = await fetch(`${this.apiBase(testnet)}/tx`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: hex,
    });
    if (!broadcast.ok) {
      const errText = await broadcast.text();
      throw new Error(errText || 'BTC_BROADCAST_FAILED');
    }
    const hash = (await broadcast.text()).trim();

    return {
      hash,
      fee: formatBtc(feeSats),
      from,
      assetSymbol: cfg.nativeSymbol,
    };
  }

  async fetchTransactions(address: string, testnet: boolean, limit = 20): Promise<RemoteTransaction[]> {
    try {
      const res = await fetch(`${this.apiBase(testnet)}/address/${address}/txs`);
      if (!res.ok) return [];
      const txs = (await res.json()) as Array<{
        txid: string;
        status?: { block_time?: number };
        vin?: Array<{ prevout?: { scriptpubkey_address?: string; value?: number } }>;
        vout?: Array<{ scriptpubkey_address?: string; value?: number }>;
      }>;
      return txs.slice(0, limit).flatMap((tx) => {
        const ts = (tx.status?.block_time ?? 0) * 1000;
        const results: RemoteTransaction[] = [];
        for (const out of tx.vout || []) {
          if (out.scriptpubkey_address === address && out.value) {
            results.push({
              hash: tx.txid,
              from: tx.vin?.[0]?.prevout?.scriptpubkey_address || '',
              to: address,
              amount: formatBtc(BigInt(out.value)),
              timestamp: ts,
              direction: 'in',
              assetSymbol: 'BTC',
            });
          }
        }
        for (const vin of tx.vin || []) {
          const prev = vin.prevout;
          if (prev?.scriptpubkey_address === address && prev.value) {
            results.push({
              hash: tx.txid,
              from: address,
              to: tx.vout?.find((o) => o.scriptpubkey_address !== address)?.scriptpubkey_address || '',
              amount: formatBtc(BigInt(prev.value)),
              timestamp: ts,
              direction: 'out',
              assetSymbol: 'BTC',
            });
          }
        }
        return results;
      });
    } catch {
      return [];
    }
  }
}
