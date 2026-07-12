import type { PriceInfo, AppSettings } from '../../shared/types';

const COINGECKO_IDS: Record<string, string> = {
  usdt: 'tether',
  trx: 'tron',
  eth: 'ethereum',
  bnb: 'binancecoin',
  matic: 'matic-network',
};

export class PriceService {
  private cache: { data: PriceInfo; ts: number } | null = null;
  private readonly TTL = 60_000;

  async getPrices(settings: AppSettings): Promise<PriceInfo> {
    if (this.cache && Date.now() - this.cache.ts < this.TTL) {
      return { ...this.cache.data, currency: settings.currency };
    }

    try {
      const ids = Object.values(COINGECKO_IDS).join(',');
      const vs = settings.currency.toLowerCase();
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vs}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('PRICE_FETCH_FAILED');
      const data = (await response.json()) as Record<string, Record<string, number>>;

      const price: PriceInfo = {
        usdt: data[COINGECKO_IDS.usdt]?.[vs] ?? 1,
        trx: data[COINGECKO_IDS.trx]?.[vs] ?? 0,
        eth: data[COINGECKO_IDS.eth]?.[vs] ?? 0,
        bnb: data[COINGECKO_IDS.bnb]?.[vs] ?? 0,
        matic: data[COINGECKO_IDS.matic]?.[vs] ?? 0,
        currency: settings.currency,
      };
      this.cache = { data: price, ts: Date.now() };
      return price;
    } catch {
      return {
        usdt: 1,
        trx: 0,
        eth: 0,
        bnb: 0,
        matic: 0,
        currency: settings.currency,
      };
    }
  }

  formatUsdValue(amount: string, pricePerUnit: number, currency: string): string {
    const val = parseFloat(amount) * pricePerUnit;
    if (isNaN(val)) return '—';
    return `${val.toFixed(2)} ${currency}`;
  }
}
