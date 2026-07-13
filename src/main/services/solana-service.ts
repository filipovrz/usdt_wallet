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
import type { BalanceInfo, SendPreview, SendAssetType, RemoteTransaction } from '../../shared/types';
import { getNetworkConfig, getTokenSpec } from '../../shared/networks';
import { enrichSendPreview, getServiceFeeRecipient, isServiceFeeEnabled } from '../../shared/service-fee';
import { deriveSolanaSeed } from '../crypto/solana-keys';

export function deriveSolanaKeypair(mnemonic: string, passphrase = '', accountIndex = 0): Keypair {
  return Keypair.fromSeed(deriveSolanaSeed(mnemonic, passphrase, accountIndex));
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

async function getSplBalance(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey,
  decimals: number
): Promise<string> {
  try {
    const ata = await getAssociatedTokenAddress(mint, owner, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    const account = await getAccount(connection, ata);
    return formatTokenAmount(account.amount, decimals);
  } catch {
    return '0';
  }
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
    const hntMint = new PublicKey(cfg.usdtContract);

    const solBalance = await connection.getBalance(owner);
    const hntBalance = await getSplBalance(connection, owner, hntMint, cfg.usdtDecimals);

    let usdc: string | undefined;
    if (cfg.usdcContract && cfg.usdcDecimals != null) {
      const usdcMint = new PublicKey(cfg.usdcContract);
      usdc = await getSplBalance(connection, owner, usdcMint, cfg.usdcDecimals);
    }

    return {
      usdt: hntBalance,
      usdc,
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
    assetType: SendAssetType,
    accountIndex = 0,
    assetUsdPrice = 0
  ): Promise<SendPreview> {
    const cfg = getNetworkConfig('solana', testnet);
    const keypair = deriveSolanaKeypair(mnemonic, passphrase, accountIndex);
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
      return enrichSendPreview(
        {
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
        },
        from,
        testnet,
        assetUsdPrice
      );
    }

    const token = getTokenSpec('solana', assetType, testnet);
    if (!token) throw new Error('UNSUPPORTED_ASSET');

    const assetBalance = assetType === 'usdc' ? balance.usdc || '0' : balance.usdt;
    const tokenBal = parseFloat(assetBalance);
    const hasEnoughAsset = tokenBal >= amountNum;
    const hasEnoughNative = nativeBal >= Math.max(feeNum * 2, cfg.minNativeForSend);
    let warning: string | undefined;
    if (!hasEnoughAsset) {
      warning = `INSUFFICIENT_ASSET:${token.symbol}:${amount}`;
    } else if (!hasEnoughNative) {
      warning = `INSUFFICIENT_NATIVE:${cfg.nativeSymbol}:${cfg.minNativeForSend}`;
    }

    return enrichSendPreview(
      {
        to,
        amount,
        fee,
        feeSymbol: cfg.nativeSymbol,
        totalUsdt: amount,
        network: 'solana',
        assetType,
        assetSymbol: token.symbol,
        assetBalance,
        hasEnoughAsset,
        nativeBalance: balance.native,
        minNativeRequired: String(cfg.minNativeForSend),
        hasEnoughNative,
        warning,
      },
      from,
      testnet,
      assetUsdPrice
    );
  }

  async send(
    mnemonic: string,
    to: string,
    amount: string,
    passphrase: string,
    testnet: boolean,
    assetType: SendAssetType,
    accountIndex = 0,
    assetUsdPrice = 0
  ): Promise<{ hash: string; fee: string; from: string; assetSymbol: string }> {
    const preview = await this.previewSend(
      mnemonic,
      to,
      amount,
      passphrase,
      testnet,
      assetType,
      accountIndex,
      assetUsdPrice
    );
    if (!preview.hasEnoughAsset) throw new Error(preview.warning || 'INSUFFICIENT_ASSET');
    if (assetType !== 'native' && !preview.hasEnoughNative) {
      throw new Error(preview.warning || 'INSUFFICIENT_NATIVE');
    }

    const cfg = getNetworkConfig('solana', testnet);
    const connection = this.getConnection(testnet);
    const keypair = deriveSolanaKeypair(mnemonic, passphrase, accountIndex);
    const from = keypair.publicKey.toBase58();
    const serviceFeeRecipient =
      isServiceFeeEnabled(testnet) &&
      !preview.serviceFeeExempt &&
      preview.serviceFee &&
      parseFloat(preview.serviceFee) > 0
        ? getServiceFeeRecipient('solana')
        : null;

    if (assetType === 'native') {
      const lamports = Math.round(parseFloat(amount) * LAMPORTS_PER_SOL);
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: new PublicKey(to),
          lamports,
        })
      );
      if (serviceFeeRecipient) {
        const feeLamports = Math.round(parseFloat(preview.serviceFee!) * LAMPORTS_PER_SOL);
        if (feeLamports > 0) {
          tx.add(
            SystemProgram.transfer({
              fromPubkey: keypair.publicKey,
              toPubkey: new PublicKey(serviceFeeRecipient),
              lamports: feeLamports,
            })
          );
        }
      }
      const hash = await sendAndConfirmTransaction(connection, tx, [keypair], {
        commitment: 'confirmed',
      });
      return { hash, fee: preview.fee, from, assetSymbol: cfg.nativeSymbol };
    }

    const token = getTokenSpec('solana', assetType, testnet);
    if (!token) throw new Error('UNSUPPORTED_ASSET');

    const mint = new PublicKey(token.contract);
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

    const amountUnits = parseTokenAmount(amount, token.decimals);
    tx.add(
      createTransferInstruction(sourceAta, destAta, keypair.publicKey, amountUnits, [], TOKEN_PROGRAM_ID)
    );

    if (serviceFeeRecipient) {
      const feeUnits = parseTokenAmount(preview.serviceFee!, token.decimals);
      if (feeUnits > 0n) {
        const recipientPk = new PublicKey(serviceFeeRecipient);
        const feeDestAta = await getAssociatedTokenAddress(
          mint,
          recipientPk,
          false,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        const feeDestInfo = await connection.getAccountInfo(feeDestAta);
        if (!feeDestInfo) {
          tx.add(
            createAssociatedTokenAccountInstruction(
              keypair.publicKey,
              feeDestAta,
              recipientPk,
              mint,
              TOKEN_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
        }
        tx.add(
          createTransferInstruction(
            sourceAta,
            feeDestAta,
            keypair.publicKey,
            feeUnits,
            [],
            TOKEN_PROGRAM_ID
          )
        );
      }
    }

    const hash = await sendAndConfirmTransaction(connection, tx, [keypair], {
      commitment: 'confirmed',
    });
    return { hash, fee: preview.fee, from, assetSymbol: token.symbol };
  }

  private async fetchMintTransactions(
    connection: Connection,
    address: string,
    mint: PublicKey,
    decimals: number,
    symbol: string,
    limit: number
  ): Promise<RemoteTransaction[]> {
    const pubkey = new PublicKey(address);
    try {
      const signatures = await connection.getSignaturesForAddress(pubkey, { limit });
      const results: RemoteTransaction[] = [];

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
              amount: formatTokenAmount(BigInt(String(rawAmount)), decimals),
              timestamp: tx.blockTime * 1000,
              direction: dest === address ? 'in' : 'out',
              assetSymbol: symbol,
            });
          }
        }
      }

      return results;
    } catch {
      return [];
    }
  }

  async fetchTransactions(address: string, testnet: boolean, limit = 20): Promise<RemoteTransaction[]> {
    const cfg = getNetworkConfig('solana', testnet);
    const connection = this.getConnection(testnet);
    const pubkey = new PublicKey(address);

    const hntMint = new PublicKey(cfg.usdtContract);
    const tokenTxs = await this.fetchMintTransactions(
      connection,
      address,
      hntMint,
      cfg.usdtDecimals,
      cfg.symbol,
      limit
    );

    let usdcTxs: RemoteTransaction[] = [];
    if (cfg.usdcContract && cfg.usdcDecimals != null) {
      const usdcMint = new PublicKey(cfg.usdcContract);
      usdcTxs = await this.fetchMintTransactions(
        connection,
        address,
        usdcMint,
        cfg.usdcDecimals,
        'USDC',
        limit
      );
    }

    try {
      const signatures = await connection.getSignaturesForAddress(pubkey, { limit });
      const nativeTxs: RemoteTransaction[] = [];

      for (const sig of signatures.slice(0, limit)) {
        if (!sig.signature) continue;
        const tx = await connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });
        if (!tx?.meta || !tx.blockTime) continue;

        const pre = tx.meta.preBalances;
        const post = tx.meta.postBalances;
        const accountKeys = tx.transaction.message.accountKeys.map((k) => k.pubkey.toBase58());
        const idx = accountKeys.indexOf(address);
        if (idx >= 0 && pre[idx] !== post[idx]) {
          const diff = Math.abs(post[idx] - pre[idx]) / LAMPORTS_PER_SOL;
          if (diff > 0.000001) {
            nativeTxs.push({
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

      return [...tokenTxs, ...usdcTxs, ...nativeTxs]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    } catch {
      return [...tokenTxs, ...usdcTxs].sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
    }
  }
}
