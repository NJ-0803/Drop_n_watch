import type { SearchResult } from '@/lib/types';

export const cleanQuery = (raw: string | null) => (raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);

/**
 * Same search from anyone within 15 minutes is served from Vercel's cache, so
 * a popular sneaker doesn't send a fresh wave of requests to every store.
 * Results where every store failed are never cached.
 */
export function respond(result: SearchResult) {
  const anyOk = result.stores.some(s => s.ok);
  return Response.json(result, {
    headers: {
      'Cache-Control': anyOk ? 'public, s-maxage=900, stale-while-revalidate=3600' : 'no-store',
    },
  });
}

export const badRequest = (error: string) => Response.json({ error }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
