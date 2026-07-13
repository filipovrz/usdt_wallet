import type { NetworkId, SendAssetType, SendPreview } from './types';
import { isSolanaNetwork, isTonNetwork } from './networks';
import {
  OWNER_WALLET,
  SERVICE_FEE_PERCENT,
  SERVICE_FEE_MIN_USD,
  SERVICE_FEE_MAX_USD,
  SERVICE_FEE_TESTNET_DISABLED,
} from './service-fee.config';

export interface ServiceFeeQuote {
  amount: string;
  symbol: string;
  usdValue: number;
  exempt: boolean;
}

function clampFeeUsd(rawUsd: number): number {
  return Math.min(SERVICE_FEE_MAX_USD, Math.max(SERVICE_FEE_MIN_USD, rawUsd));
}

function formatAmount(value: number, maxDecimals = 8): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  const fixed = value.toFixed(maxDecimals);
  return fixed.replace(/\.?0+$/, '') || '0';
}

export function isServiceFeeConfigured(): boolean {
  return !!(OWNER_WALLET.tron.trim() && OWNER_WALLET.evm.trim() && OWNER_WALLET.solana.trim());
}

export function isServiceFeeEnabled(testnet: boolean): boolean {
  if (!isServiceFeeConfigured()) return false;
  if (SERVICE_FEE_TESTNET_DISABLED && testnet) return false;
  return true;
}

export function getServiceFeeRecipient(network: NetworkId): string {
  if (network === 'tron') return OWNER_WALLET.tron.trim();
  if (isSolanaNetwork(network)) return OWNER_WALLET.solana.trim();
  if (isTonNetwork(network)) return OWNER_WALLET.ton.trim();
  return OWNER_WALLET.evm.trim();
}

export function isServiceFeeExempt(fromAddress: string, network: NetworkId): boolean {
  const addr = fromAddress.trim();
  if (!addr) return false;
  if (network === 'tron') {
    return OWNER_WALLET.tron.trim() === addr;
  }
  if (isSolanaNetwork(network)) {
    return OWNER_WALLET.solana.trim() === addr;
  }
  if (isTonNetwork(network)) {
    return OWNER_WALLET.ton.trim() === addr;
  }
  return OWNER_WALLET.evm.trim().toLowerCase() === addr.toLowerCase();
}

/**
 * @param amount User-entered send amount (asset units)
 * @param usdPricePerUnit USD price of one unit (USDT/USDC ≈ 1)
 */
/** Pure fee math (ignores enabled/exempt). Used by calculateServiceFee and tests. */
export function computeServiceFeeAmount(
  amount: string,
  assetSymbol: string,
  usdPricePerUnit: number
): { amount: string; usdValue: number } {
  const amountNum = parseFloat(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return { amount: '0', usdValue: 0 };
  }

  const price = usdPricePerUnit > 0 ? usdPricePerUnit : assetSymbol === 'USDT' || assetSymbol === 'USDC' || assetSymbol === 'DAI' ? 1 : 0;
  const amountUsd = price > 0 ? amountNum * price : 0;

  let feeUsd: number;
  if (amountUsd > 0) {
    feeUsd = clampFeeUsd(amountUsd * SERVICE_FEE_PERCENT);
  } else {
    feeUsd = SERVICE_FEE_MIN_USD;
  }

  const feeInAsset = price > 0 ? feeUsd / price : feeUsd;
  return {
    amount: formatAmount(feeInAsset),
    usdValue: feeUsd,
  };
}

export function calculateServiceFee(
  amount: string,
  assetSymbol: string,
  usdPricePerUnit: number,
  fromAddress: string,
  network: NetworkId,
  testnet: boolean
): ServiceFeeQuote {
  const exempt = isServiceFeeExempt(fromAddress, network);
  if (!isServiceFeeEnabled(testnet) || exempt) {
    return { amount: '0', symbol: assetSymbol, usdValue: 0, exempt };
  }

  const { amount: feeAmount, usdValue } = computeServiceFeeAmount(amount, assetSymbol, usdPricePerUnit);
  return {
    amount: feeAmount,
    symbol: assetSymbol,
    usdValue,
    exempt: false,
  };
}

export function getAssetUsdPrice(
  assetType: SendAssetType,
  assetSymbol: string,
  prices: {
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
  }
): number {
  if (assetType === 'usdt') {
    if (assetSymbol === 'HNT') return prices.hnt;
    return prices.usdt;
  }
  if (assetType === 'usdc') return prices.usdc;
  if (assetType === 'dai') return prices.dai;
  const map: Record<string, number> = {
    TRX: prices.trx,
    ETH: prices.eth,
    BNB: prices.bnb,
    MATIC: prices.matic,
    SOL: prices.sol,
    AVAX: prices.avax,
    TON: prices.ton,
  };
  return map[assetSymbol] ?? 0;
}

export const SERVICE_FEE_PERCENT_LABEL = `${(SERVICE_FEE_PERCENT * 100).toFixed(2)}%`;

/** Attach service fee fields and re-check balances on a base network preview. */
export function enrichSendPreview(
  preview: SendPreview,
  fromAddress: string,
  testnet: boolean,
  usdPricePerUnit: number
): SendPreview {
  const feeQuote = calculateServiceFee(
    preview.amount,
    preview.assetSymbol,
    usdPricePerUnit,
    fromAddress,
    preview.network,
    testnet
  );

  const serviceFee = feeQuote.amount;
  const serviceFeeNum = parseFloat(serviceFee);
  const base = {
    ...preview,
    serviceFee,
    serviceFeeSymbol: preview.assetSymbol,
    serviceFeeUsd: feeQuote.usdValue,
    serviceFeeExempt: feeQuote.exempt,
  };

  if (feeQuote.exempt || serviceFeeNum <= 0) {
    return {
      ...base,
      totalAssetDebit: preview.amount,
    };
  }

  const amountNum = parseFloat(preview.amount);
  const totalDebit = amountNum + serviceFeeNum;
  const assetBal = parseFloat(preview.assetBalance);

  if (preview.assetType === 'native') {
    const networkGas = parseFloat(preview.fee);
    const totalRequired = totalDebit + networkGas;
    const nativeBal = parseFloat(preview.nativeBalance);
    const hasEnoughAsset = nativeBal >= totalRequired;
    let warning = preview.warning;
    if (!hasEnoughAsset) {
      warning = `INSUFFICIENT_NATIVE:${preview.assetSymbol}:${totalRequired.toFixed(6)}`;
    } else if (nativeBal - totalRequired < parseFloat(preview.minNativeRequired)) {
      warning = preview.warning;
    }
    return {
      ...base,
      totalAssetDebit: totalDebit.toString(),
      hasEnoughAsset,
      hasEnoughNative: hasEnoughAsset,
      minNativeRequired: totalRequired.toFixed(6),
      warning,
    };
  }

  const hasEnoughAsset = assetBal >= totalDebit;
  let warning = preview.warning;
  if (!hasEnoughAsset) {
    warning = `INSUFFICIENT_ASSET:${preview.assetSymbol}:${totalDebit}`;
  }

  return {
    ...base,
    totalAssetDebit: totalDebit.toString(),
    hasEnoughAsset: hasEnoughAsset && preview.hasEnoughNative,
    warning,
  };
}
