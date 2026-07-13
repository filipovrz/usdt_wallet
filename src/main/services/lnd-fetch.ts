import http from 'http';
import https from 'https';
import type { AppSettings } from '../../shared/types';

function baseUrl(settings: AppSettings): string {
  const url = settings.lndRestUrl.trim().replace(/\/+$/, '');
  if (!url) throw new Error('LIGHTNING_NOT_CONFIGURED');
  return url;
}

export function isLightningConfigured(settings: AppSettings): boolean {
  return !!(settings.lndRestUrl.trim() && settings.lndMacaroon.trim());
}

export async function lndRequest(
  settings: AppSettings,
  path: string,
  method: 'GET' | 'POST' = 'GET',
  body?: unknown
): Promise<Record<string, unknown>> {
  if (!isLightningConfigured(settings)) throw new Error('LIGHTNING_NOT_CONFIGURED');
  const macaroon = settings.lndMacaroon.trim();
  const url = new URL(path.replace(/^\//, ''), `${baseUrl(settings)}/`);

  const payload = body ? JSON.stringify(body) : undefined;
  const headers: Record<string, string> = {
    'Grpc-Metadata-macaroon': macaroon,
    Accept: 'application/json',
  };
  if (payload) headers['Content-Type'] = 'application/json';

  return new Promise((resolve, reject) => {
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(
      url,
      { method, headers, rejectUnauthorized: false },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(data.trim() || `LND_HTTP_${res.statusCode}`));
            return;
          }
          try {
            resolve(data ? (JSON.parse(data) as Record<string, unknown>) : {});
          } catch {
            reject(new Error('LND_INVALID_JSON'));
          }
        });
      }
    );
    req.on('error', (err) => reject(err));
    if (payload) req.write(payload);
    req.end();
  });
}
