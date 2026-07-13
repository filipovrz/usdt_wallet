import bolt11 from 'bolt11';
import type {
  AppSettings,
  LightningBalance,
  LightningDecodedInvoice,
  LightningInvoiceInfo,
} from '../../shared/types';
import { isLightningConfigured, lndRequest } from './lnd-fetch';

const SAT = 100_000_000n;

function parseBtc(value: string): bigint {
  const trimmed = value.trim();
  if (!trimmed) return 0n;
  const [whole, frac = ''] = trimmed.split('.');
  const padded = (frac + '00000000').slice(0, 8);
  return BigInt(whole || '0') * SAT + BigInt(padded);
}

function formatBtc(sats: bigint): string {
  const whole = sats / SAT;
  const frac = sats % SAT;
  const fracStr = frac.toString().padStart(8, '0').replace(/0+$/, '');
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}

function satsToBtc(sats: bigint | number | string): string {
  return formatBtc(BigInt(sats));
}

export class LightningService {
  constructor(private settings: AppSettings) {}

  updateSettings(settings: AppSettings): void {
    this.settings = settings;
  }

  isConfigured(): boolean {
    return isLightningConfigured(this.settings);
  }

  validateInvoice(paymentRequest: string): boolean {
    try {
      bolt11.decode(paymentRequest.trim().toLowerCase());
      return true;
    } catch {
      return false;
    }
  }

  async getBalance(): Promise<LightningBalance> {
    const data = await lndRequest(this.settings, '/v1/balance/channels');
    const localSats = BigInt(String(data.balance ?? '0'));
    const pendingSats = BigInt(String(data.pending_open_balance ?? '0'));
    return {
      local: satsToBtc(localSats),
      pending: satsToBtc(pendingSats),
      total: satsToBtc(localSats + pendingSats),
    };
  }

  async getInfo(): Promise<{ alias: string; synced: boolean; blockHeight: number }> {
    const data = await lndRequest(this.settings, '/v1/getinfo');
    return {
      alias: String(data.alias ?? 'LND'),
      synced: data.synced_to_chain === true,
      blockHeight: Number(data.block_height ?? 0),
    };
  }

  async createInvoice(amountBtc: string, memo = 'EvtinkoWallet'): Promise<LightningInvoiceInfo> {
    const sats = parseBtc(amountBtc);
    if (sats <= 0n) throw new Error('INVALID_AMOUNT');
    const data = await lndRequest(this.settings, '/v1/invoices', 'POST', {
      value: sats.toString(),
      memo,
      expiry: '3600',
    });
    const paymentRequest = String(data.payment_request ?? '');
    if (!paymentRequest) throw new Error('INVOICE_CREATE_FAILED');
    const expiry = Number(data.expiry ?? 3600);
    const createdAt = Number(data.creation_date ?? Math.floor(Date.now() / 1000));
    return {
      paymentRequest,
      amount: amountBtc,
      description: memo,
      expiry,
      expiresAt: (createdAt + expiry) * 1000,
    };
  }

  async decodeInvoice(paymentRequest: string): Promise<LightningDecodedInvoice> {
    const pr = paymentRequest.trim();
    try {
      const data = await lndRequest(
        this.settings,
        `/v1/payreq/${encodeURIComponent(pr)}`
      );
      const sats = BigInt(String(data.num_satoshis ?? data.num_msat ? Number(data.num_msat) / 1000 : 0));
      const timestamp = Number(data.timestamp ?? 0);
      const expiry = Number(data.expiry ?? 0);
      const expiresAt = (timestamp + expiry) * 1000;
      return {
        paymentRequest: pr,
        amount: satsToBtc(sats),
        description: String(data.description ?? ''),
        destination: String(data.destination ?? ''),
        expiry,
        expiresAt,
        expired: Date.now() > expiresAt,
      };
    } catch {
      const decoded = bolt11.decode(pr);
      const sats = BigInt(decoded.satoshis ?? 0);
      const expiresAt = (decoded.timeExpireDate ?? 0) * 1000;
      return {
        paymentRequest: pr,
        amount: satsToBtc(sats),
        description: decoded.tags?.find((t) => t.tagName === 'description')?.data as string | undefined,
        destination: decoded.payeeNodeKey ?? '',
        expiry:
          decoded.timeExpireDate && decoded.timestamp
            ? decoded.timeExpireDate - decoded.timestamp
            : 0,
        expiresAt,
        expired: Date.now() > expiresAt,
      };
    }
  }

  async payInvoice(paymentRequest: string): Promise<{ hash: string; fee: string }> {
    const pr = paymentRequest.trim();
    const decoded = await this.decodeInvoice(pr);
    if (decoded.expired) throw new Error('INVOICE_EXPIRED');

    const data = await lndRequest(this.settings, '/v1/channels/transactions', 'POST', {
      payment_request: pr,
      fee_limit_sat: '100000',
    });
    const paymentError = String(data.payment_error ?? '');
    if (paymentError) throw new Error(paymentError);

    const route = data.payment_route as { total_fees?: string; total_fees_msat?: string } | undefined;
    const feeSats = route?.total_fees
      ? BigInt(route.total_fees)
      : route?.total_fees_msat
        ? BigInt(route.total_fees_msat) / 1000n
        : 0n;

    return {
      hash: String(data.payment_hash ?? decoded.paymentRequest.slice(0, 16)),
      fee: satsToBtc(feeSats),
    };
  }
}
