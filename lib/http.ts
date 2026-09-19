// Every store is read with the same browser-like request so pages render the
// way a shopper sees them. Failures throw; callers turn them into a per-store
// "couldn't check" row instead of failing the whole search.

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
  'Accept-Language': 'en-IN,en;q=0.9',
};

export class StoreError extends Error {}

async function get(url: string, accept: string, timeoutMs: number): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { ...HEADERS, Accept: accept },
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
  } catch {
    throw new StoreError('timed out');
  }
  if (!res.ok) throw new StoreError(res.status === 403 || res.status === 503 ? 'blocked us' : `error ${res.status}`);
  return res;
}

export async function getText(url: string, timeoutMs = 9000): Promise<string> {
  const res = await get(url, 'text/html,application/xhtml+xml', timeoutMs);
  return res.text();
}

export async function getJson<T>(url: string, timeoutMs = 9000): Promise<T> {
  const res = await get(url, 'application/json', timeoutMs);
  try {
    return (await res.json()) as T;
  } catch {
    throw new StoreError('sent an unreadable reply');
  }
}

/** Runs tasks with at most `limit` in flight, so one search never floods a store. */
export async function pool<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await task(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export const decodeEntities = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');

export const rupees = (s: string) => Number(s.replace(/[^\d.]/g, ''));
