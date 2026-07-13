import {
  Address,
  beginCell,
  internal,
  SendMode,
  toNano,
  fromNano,
} from '@ton/core';
import { TonClient, WalletContractV4, JettonMaster, JettonWallet } from '@ton/ton';
import type { AppSettings, BalanceInfo, RemoteTransaction, SendAssetType, SendPreview } from '../../shared/types';
import { getNetworkConfig, getTokenSpec, getAssetBalanceFromInfo } from '../../shared/networks';
import { enrichSendPreview, getServiceFeeRecipient, isServiceFeeEnabled } from '../../shared/service-fee';
import { deriveTonKeyMaterial } from '../crypto/ton-keys';

function formatJettonAmount(amount: bigint, decimals: number): string {
  const str = amount.toString().padStart(decimals + 1, '0');
  const intPart = str.slice(0, -decimals) || '0';
  const fracPart = str.slice(-decimals).replace(/0+$/, '');
  return fracPart ? `${intPart}.${fracPart}` : intPart;
}

function parseJettonAmount(value: string, decimals: number): bigint {
  const [intPart, fracPart = ''] = value.split('.');
  const padded = (fracPart + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(intPart + padded);
}

function jettonTransferBody(
  jettonAmount: bigint,
  destination: Address,
  responseAddress: Address,
  forwardTonAmount: bigint
) {
  return beginCell()
    .storeUint(0xf8a7ea5, 32)
    .storeUint(0, 64)
    .storeCoins(jettonAmount)
    .storeAddress(destination)
    .storeAddress(responseAddress)
    .storeBit(0)
    .storeCoins(forwardTonAmount)
    .storeBit(0)
    .endCell();
}

export class TonService {
  private client(settings: AppSettings, testnet: boolean): TonClient {
    const cfg = getNetworkConfig('ton', testnet);
    return new TonClient({
      endpoint: cfg.rpcUrls[0],
      apiKey: settings.toncenterApiKey || undefined,
    });
  }

  validateAddress(address: string): boolean {
    try {
      Address.parse(address);
      return true;
    } catch {
      return false;
    }
  }

  async getBalance(address: string, testnet: boolean, settings: AppSettings): Promise<BalanceInfo> {
    const cfg = getNetworkConfig('ton', testnet);
    const client = this.client(settings, testnet);
    const owner = Address.parse(address);
    const nativeBal = await client.getBalance(owner);

    let usdt = '0';
    if (cfg.usdtContract) {
      try {
        const jettonMaster = client.open(JettonMaster.create(Address.parse(cfg.usdtContract)));
        const jettonWalletAddress = await jettonMaster.getWalletAddress(owner);
        const jettonWallet = client.open(JettonWallet.create(jettonWalletAddress));
        const balance = await jettonWallet.getBalance();
        usdt = formatJettonAmount(balance, cfg.usdtDecimals);
      } catch {
        usdt = '0';
      }
    }

    return {
      usdt,
      native: fromNano(nativeBal),
      nativeSymbol: cfg.nativeSymbol,
    };
  }

  async estimateTonFee(_testnet: boolean): Promise<string> {
    return '0.05';
  }

  async previewSend(
    mnemonic: string,
    to: string,
    amount: string,
    passphrase: string,
    testnet: boolean,
    settings: AppSettings,
    assetType: SendAssetType,
    accountIndex = 0,
    assetUsdPrice = 0
  ): Promise<SendPreview> {
    const cfg = getNetworkConfig('ton', testnet);
    const keys = deriveTonKeyMaterial(mnemonic, passphrase, accountIndex, testnet);
    const from = keys.address;
    const balance = await this.getBalance(from, testnet, settings);
    const fee = await this.estimateTonFee(testnet);
    const feeNum = parseFloat(fee);
    const amountNum = parseFloat(amount);
    const nativeBal = parseFloat(balance.native);
    const minRequired = cfg.minNativeForSend;

    if (assetType === 'native') {
      const totalRequired = amountNum + feeNum;
      const hasEnoughAsset = nativeBal >= totalRequired;
      let warning: string | undefined;
      if (!hasEnoughAsset) {
        warning = `INSUFFICIENT_NATIVE:${cfg.nativeSymbol}:${totalRequired.toFixed(6)}`;
      }
      const base: SendPreview = {
        to,
        amount,
        fee,
        feeSymbol: cfg.nativeSymbol,
        totalUsdt: amount,
        network: 'ton',
        assetType: 'native',
        assetSymbol: cfg.nativeSymbol,
        assetBalance: balance.native,
        hasEnoughAsset,
        nativeBalance: balance.native,
        minNativeRequired: totalRequired.toFixed(6),
        hasEnoughNative: hasEnoughAsset,
        warning,
      };
      return enrichSendPreview(base, from, testnet, assetUsdPrice);
    }

    const token = getTokenSpec('ton', assetType, testnet);
    if (!token) throw new Error('UNSUPPORTED_ASSET');

    const assetBalance = getAssetBalanceFromInfo(balance, assetType);
    const tokenBal = parseFloat(assetBalance);
    const hasEnoughAsset = tokenBal >= amountNum;
    const hasEnoughNative = nativeBal >= minRequired + feeNum;

    let warning: string | undefined;
    if (!hasEnoughAsset) {
      warning = `INSUFFICIENT_ASSET:${token.symbol}:${amount}`;
    } else if (!hasEnoughNative) {
      warning = `INSUFFICIENT_NATIVE:${cfg.nativeSymbol}:${minRequired + feeNum}`;
    }

    return enrichSendPreview(
      {
        to,
        amount,
        fee,
        feeSymbol: cfg.nativeSymbol,
        totalUsdt: amount,
        network: 'ton',
        assetType,
        assetSymbol: token.symbol,
        assetBalance,
        hasEnoughAsset,
        nativeBalance: balance.native,
        minNativeRequired: String(minRequired + feeNum),
        hasEnoughNative,
        warning,
      },
      from,
      testnet,
      assetUsdPrice
    );
  }

  private async latestTxHash(client: TonClient, walletAddress: Address): Promise<string> {
    await new Promise((r) => setTimeout(r, 2500));
    const txs = await client.getTransactions(walletAddress, { limit: 3 });
    if (txs[0]) return txs[0].hash().toString('hex');
    return `${walletAddress.toString().slice(0, 16)}-${Date.now()}`;
  }

  async send(
    mnemonic: string,
    to: string,
    amount: string,
    passphrase: string,
    testnet: boolean,
    settings: AppSettings,
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
      settings,
      assetType,
      accountIndex,
      assetUsdPrice
    );
    if (!preview.hasEnoughAsset) throw new Error(preview.warning || 'INSUFFICIENT_ASSET');
    if (assetType !== 'native' && !preview.hasEnoughNative) {
      throw new Error(preview.warning || 'INSUFFICIENT_NATIVE');
    }

    const cfg = getNetworkConfig('ton', testnet);
    const keys = deriveTonKeyMaterial(mnemonic, passphrase, accountIndex, testnet);
    const client = this.client(settings, testnet);
    const wallet = client.open(
      WalletContractV4.create({ workchain: 0, publicKey: keys.publicKey })
    );
    const seqno = await wallet.getSeqno();
    const destination = Address.parse(to);
    const serviceFeeRecipient =
      isServiceFeeEnabled(testnet) &&
      !preview.serviceFeeExempt &&
      preview.serviceFee &&
      parseFloat(preview.serviceFee) > 0 &&
      getServiceFeeRecipient('ton').trim()
        ? getServiceFeeRecipient('ton').trim()
        : null;

    if (assetType === 'native') {
      const messages = [
        internal({ to: destination, value: toNano(amount), bounce: false }),
      ];
      if (serviceFeeRecipient && preview.serviceFee) {
        messages.push(
          internal({
            to: Address.parse(serviceFeeRecipient),
            value: toNano(preview.serviceFee),
            bounce: false,
          })
        );
      }
      await wallet.sendTransfer({
        seqno,
        secretKey: keys.secretKey,
        messages,
        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      });
      const hash = await this.latestTxHash(client, wallet.address);
      return { hash, fee: preview.fee, from: keys.address, assetSymbol: cfg.nativeSymbol };
    }

    const token = getTokenSpec('ton', assetType, testnet);
    if (!token) throw new Error('UNSUPPORTED_ASSET');

    const jettonMaster = client.open(JettonMaster.create(Address.parse(token.contract)));
    const senderJettonWallet = await jettonMaster.getWalletAddress(wallet.address);
    const jettonAmount = parseJettonAmount(amount, token.decimals);
    const forwardAmount = toNano('0.05');

    const messages = [
      internal({
        to: senderJettonWallet,
        value: toNano('0.1'),
        bounce: true,
        body: jettonTransferBody(jettonAmount, destination, wallet.address, toNano('0.01')),
      }),
    ];

    if (serviceFeeRecipient && preview.serviceFee) {
      const feeAmount = parseJettonAmount(preview.serviceFee, token.decimals);
      const feeDestJettonWallet = await jettonMaster.getWalletAddress(Address.parse(serviceFeeRecipient));
      messages.push(
        internal({
          to: senderJettonWallet,
          value: toNano('0.1'),
          bounce: true,
          body: jettonTransferBody(feeAmount, Address.parse(serviceFeeRecipient), wallet.address, toNano('0.01')),
        })
      );
      void feeDestJettonWallet;
    }

    await wallet.sendTransfer({
      seqno,
      secretKey: keys.secretKey,
      messages,
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
    });

    const hash = await this.latestTxHash(client, wallet.address);
    return { hash, fee: preview.fee, from: keys.address, assetSymbol: token.symbol };
  }

  async fetchTransactions(
    address: string,
    testnet: boolean,
    limit = 20
  ): Promise<RemoteTransaction[]> {
    const cfg = getNetworkConfig('ton', testnet);
    const base = testnet ? 'https://testnet.tonapi.io' : 'https://tonapi.io';
    try {
      const res = await fetch(`${base}/v2/accounts/${encodeURIComponent(address)}/events?limit=${limit}`);
      if (!res.ok) return [];
      const data = (await res.json()) as {
        events?: Array<{
          event_id: string;
          timestamp: number;
          actions?: Array<{
            type: string;
            status: string;
            TonTransfer?: { amount: number; sender: { address: string }; recipient: { address: string } };
            JettonTransfer?: {
              amount: string;
              jetton: { address: string; symbol?: string; decimals?: number };
              sender: { address: string };
              recipients: Array<{ address: string }>;
            };
          }>;
        }>;
      };

      const out: RemoteTransaction[] = [];
      for (const event of data.events || []) {
        for (const action of event.actions || []) {
          if (action.status !== 'ok') continue;
          if (action.TonTransfer) {
            const t = action.TonTransfer;
            const amount = fromNano(BigInt(t.amount));
            const fromAddr = normalizeTonApiAddress(t.sender.address);
            const toAddr = normalizeTonApiAddress(t.recipient.address);
            out.push({
              hash: event.event_id,
              from: fromAddr,
              to: toAddr,
              amount,
              timestamp: event.timestamp * 1000,
              direction: toAddr === address ? 'in' : 'out',
              assetSymbol: cfg.nativeSymbol,
            });
          }
          if (action.JettonTransfer) {
            const j = action.JettonTransfer;
            const decimals = j.jetton.decimals ?? cfg.usdtDecimals;
            const amount = formatJettonAmount(BigInt(j.amount), decimals);
            const fromAddr = normalizeTonApiAddress(j.sender.address);
            const toAddr = normalizeTonApiAddress(j.recipients[0]?.address || '');
            const isUsdt = j.jetton.address.includes(cfg.usdtContract.slice(2, 10));
            out.push({
              hash: event.event_id,
              from: fromAddr,
              to: toAddr,
              amount,
              timestamp: event.timestamp * 1000,
              direction: toAddr === address ? 'in' : 'out',
              assetSymbol: isUsdt ? cfg.symbol : j.jetton.symbol || 'JETTON',
            });
          }
        }
      }
      return out.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
    } catch {
      return [];
    }
  }
}

function normalizeTonApiAddress(raw: string): string {
  try {
    return Address.parse(raw).toString({ bounceable: false });
  } catch {
    return raw;
  }
}
