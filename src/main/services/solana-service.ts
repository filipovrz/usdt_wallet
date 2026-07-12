import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  getAccount,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import type { BalanceInfo, SendPreview, FeeTier, SendAssetType, RemoteTransaction } from '../../shared/types';
import { getNetworkConfig } from '../../shared/networks';
import { deriveSolanaSeed } from '../crypto/solana-keys';

export function deriveSolanaKeypair(mnemonic: string, passphrase = ''): Keypair {
  return Keypair.fromSeed(deriveSolanaSeed(mnemonic, passphrase));
}

function formatTokenAmount(amount: bigint, decimals: number): string {
  const str = amount.toString().padStart(decimals + 1, '0');
  const intPart = str.slice(0, -decimals) || '0';
  const fracPart = str.slice(-decimals).replace(/0+$/, '');
  return fracPart ? `${intPart}.${fracPart}` : intPart;
}

function parseTokenAmount(value: string, decimals: number): bigint {
  const [intPart, fracPart = ''] = value.split('.');
  const padded = (fracPart + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(intPart + padded);
}

export class SolanaService {
  private getConnection(testnet: boolean): Connection {
    const cfg = getNetworkConfig('solana', testnet);
    return new Connection(cfg.rpcUrls[0], 'confirmed');
  }

  validateAddress(address: string): boolean {
    try {
      const pk = new PublicKey(address);
      return PublicKey.isOnCurve(pk.toBytes());
    } catch {
      return false;
    }
  }

  async getBalance(address: string, testnet: boolean): Promise<BalanceInfo> {
    const cfg = getNetworkConfig('solana', testnet);
    const connection = this.getConnection(testnet);
    const owner = new PublicKey(address);
    const mint = new PublicKey(cfg.usdtContract);

    const solBalance = await connection.getBalance(owner);
    let hntBalance = 0n;

    try {
      const ata = await getAssociatedTokenAddress(mint, owner, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const account = await getAccount(connection, ata);
      hntBalance = account.amount;
    } catch {
      hntBalance = 0n;
    }

    return {
      usdt: formatTokenAmount(hntBalance, cfg.usdtDecimals),
      native: (solBalance / LAMPORTS_PER_SOL).toString(),
      nativeSymbol: cfg.nativeSymbol,
    };
  }

  async estimateSolFee(_testnet: boolean): Promise<string> {
    return (5000 / LAMPORTS_PER_SOL).toFixed(6);
  }

  async previewSend(
    mnemonic: string,
    to: string,
    amount: string,
    passphrase: string,
    testnet: boolean,
    assetType: SendAssetType
  ): Promise<SendPreview> {
    const cfg = getNetworkConfig('solana', testnet);
    const keypair = deriveSolanaKeypair(mnemonic, passphrase);
    const from = keypair.publicKey.toBase58();
    const balance = await this.getBalance(from, testnet);
    const fee = await this.estimateSolFee(testnet);
    const feeNum = parseFloat(fee);
    const amountNum = parseFloat(amount);
    const nativeBal = parseFloat(balance.native);

    if (assetType === 'native') {
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
        network: 'solana',
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

    const tokenBal = parseFloat(balance.usdt);
    const hasEnoughAsset = tokenBal >= amountNum;
    const hasEnoughNative = nativeBal >= Math.max(feeNum * 2, cfg.minNativeForSend);
    let warning: string | undefined;
    if (!hasEnoughAsset) {
      warning = `INSUFFICIENT_ASSET:${cfg.symbol}:${amount}`;
    } else if (!hasEnoughNative) {
      warning = `INSUFFICIENT_NATIVE:${cfg.nativeSymbol}:${cfg.minNativeForSend}`;
    }

    return {
      to,
      amount,
      fee,
      feeSymbol: cfg.nativeSymbol,
      totalUsdt: amount,
      network: 'solana',
      assetType: 'usdt',
      assetSymbol: cfg.symbol,
      assetBalance: balance.usdt,
      hasEnoughAsset,
      nativeBalance: balance.native,
      minNativeRequired: String(cfg.minNativeForSend),
      hasEnoughNative,
      warning,
    };
  }

  async send(
    mnemonic: string,
    to: string,
    amount: string,
    passphrase: string,
    testnet: boolean,
    assetType: SendAssetType
  ): Promise<{ hash: string; fee: string; from: string; assetSymbol: string }> {
    const preview = await this.previewSend(mnemonic, to, amount, passphrase, testnet, assetType);
    if (!preview.hasEnoughAsset) throw new Error(preview.warning || 'INSUFFICIENT_ASSET');
    if (assetType === 'usdt' && !preview.hasEnoughNative) {
      throw new Error(preview.warning || 'INSUFFICIENT_NATIVE');
    }

    const cfg = getNetworkConfig('solana', testnet);
    const connection = this.getConnection(testnet);
    const keypair = deriveSolanaKeypair(mnemonic, passphrase);
    const from = keypair.publicKey.toBase58();

    if (assetType === 'native') {
      const lamports = Math.round(parseFloat(amount) * LAMPORTS_PER_SOL);
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: new PublicKey(to),
          lamports,
        })
      );
      const hash = await sendAndConfirmTransaction(connection, tx, [keypair], {
        commitment: 'confirmed',
      });
      return { hash, fee: preview.fee, from, assetSymbol: cfg.nativeSymbol };
    }

    const mint = new PublicKey(cfg.usdtContract);
    const destination = new PublicKey(to);
    const sourceAta = await getAssociatedTokenAddress(
      mint,
      keypair.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const destAta = await getAssociatedTokenAddress(
      mint,
      destination,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const tx = new Transaction();
    const destInfo = await connection.getAccountInfo(destAta);
    if (!destInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          keypair.publicKey,
          destAta,
          destination,
          mint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    const amountUnits = parseTokenAmount(amount, cfg.usdtDecimals);
    tx.add(
      createTransferInstruction(sourceAta, destAta, keypair.publicKey, amountUnits, [], TOKEN_PROGRAM_ID)
    );

    const hash = await sendAndConfirmTransaction(connection, tx, [keypair], {
      commitment: 'confirmed',
    });
    return { hash, fee: preview.fee, from, assetSymbol: cfg.symbol };
  }

  async fetchTransactions(address: string, testnet: boolean, limit = 20): Promise<RemoteTransaction[]> {
    const cfg = getNetworkConfig('solana', testnet);
    const connection = this.getConnection(testnet);
    const pubkey = new PublicKey(address);
    const mint = new PublicKey(cfg.usdtContract);

    try {
      const signatures = await connection.getSignaturesForAddress(pubkey, { limit });
      const results: Array<{
        hash: string;
        from: string;
        to: string;
        amount: string;
        timestamp: number;
        direction: 'in' | 'out';
        assetSymbol: string;
      }> = [];

      for (const sig of signatures.slice(0, limit)) {
        if (!sig.signature) continue;
        const tx = await connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });
        if (!tx?.meta || !tx.blockTime) continue;

        for (const inner of tx.meta.innerInstructions || []) {
          for (const ix of inner.instructions) {
            if (!('parsed' in ix)) continue;
            const parsed = ix.parsed as { type?: string; info?: Record<string, unknown> };
            if (parsed.type !== 'transfer' && parsed.type !== 'transferChecked') continue;
            const info = parsed.info || {};
            const mintAddr = info.mint as string | undefined;
            if (mintAddr && mintAddr !== mint.toBase58()) continue;
            const source = (info.source || info.authority) as string;
            const dest = info.destination as string;
            const tokenAmount = info.tokenAmount as { amount?: string | number } | undefined;
            const rawAmount = info.amount ?? tokenAmount?.amount;
            if (!rawAmount) continue;
            results.push({
              hash: sig.signature,
              from: source,
              to: dest,
              amount: formatTokenAmount(BigInt(String(rawAmount)), cfg.usdtDecimals),
              timestamp: tx.blockTime * 1000,
              direction: dest === address ? 'in' : 'out',
              assetSymbol: cfg.symbol,
            });
          }
        }

        const pre = tx.meta.preBalances;
        const post = tx.meta.postBalances;
        const accountKeys = tx.transaction.message.accountKeys.map((k) => k.pubkey.toBase58());
        const idx = accountKeys.indexOf(address);
        if (idx >= 0 && pre[idx] !== post[idx]) {
          const diff = Math.abs(post[idx] - pre[idx]) / LAMPORTS_PER_SOL;
          if (diff > 0.000001) {
            results.push({
              hash: sig.signature,
              from: post[idx] < pre[idx] ? address : 'unknown',
              to: post[idx] > pre[idx] ? address : 'unknown',
              amount: diff.toFixed(6),
              timestamp: tx.blockTime * 1000,
              direction: post[idx] > pre[idx] ? 'in' : 'out',
              assetSymbol: cfg.nativeSymbol,
            });
          }
        }
      }

      return results;
    } catch {
      return [];
    }
  }
}
