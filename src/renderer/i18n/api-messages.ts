import type { translations } from './translations';

type T = (typeof translations)['bg'];

export function formatApiError(code: string | undefined, t: T): string {
  if (!code) return t.errors.unknown;

  if (code.startsWith('LOCKED:')) {
    const mins = code.split(':')[1];
    return `${t.lockedOut} ${mins} ${t.minutes}`;
  }

  if (code.startsWith('INSUFFICIENT_NATIVE:')) {
    const [, symbol, amount] = code.split(':');
    return t.errors.insufficientNative
      .replace('{symbol}', symbol || '')
      .replace('{amount}', amount || '');
  }

  if (code.startsWith('INSUFFICIENT_ASSET:')) {
    const [, symbol, amount] = code.split(':');
    return t.errors.insufficientAsset
      .replace('{symbol}', symbol || '')
      .replace('{amount}', amount || '');
  }

  if (code.startsWith('LOW_NATIVE_RESERVE:')) {
    const [, symbol, amount] = code.split(':');
    return t.errors.lowNativeReserve
      .replace('{symbol}', symbol || '')
      .replace('{amount}', amount || '');
  }

  const mapped = t.errors[code as keyof typeof t.errors];
  if (mapped) return mapped;

  return code;
}

export function useApiMessage() {
  return { formatApiError };
}
