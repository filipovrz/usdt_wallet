export async function fetchWithFallback<T>(
  urls: string[],
  fetcher: (url: string) => Promise<T>,
  validator: (result: T) => boolean = () => true
): Promise<T> {
  let lastError: Error | undefined;
  for (const url of urls) {
    try {
      const result = await fetcher(url);
      if (validator(result)) return result;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastError || new Error('ALL_RPC_FAILED');
}

export async function rpcCall(rpcUrl: string, method: string, params: unknown[] = []): Promise<unknown> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const data = (await response.json()) as { result?: unknown; error?: { message: string } };
  if (data.error) throw new Error(data.error.message);
  return data.result;
}
