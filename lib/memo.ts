// A small per-server-instance cache for store lookups. Identical lookups in
// the next five minutes reuse the answer, and lookups made at the same moment
// share one request. Failures are never kept.
const TTL_MS = 5 * 60 * 1000;
const MAX = 400;
const entries = new Map<string, { at: number; value: Promise<unknown> }>();

export function memo<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = entries.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as Promise<T>;
  const value = load().catch(e => {
    entries.delete(key);
    throw e;
  });
  entries.set(key, { at: Date.now(), value });
  if (entries.size > MAX) entries.delete(entries.keys().next().value!);
  return value;
}
