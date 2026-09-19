import { reportsAsTheyArrive, type SearchPlan } from '@/lib/collect';
import type { StoreReport, SummaryOptions } from '@/lib/summarize';
import type { SearchResult, StoreId } from '@/lib/types';

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

export type StreamLine =
  | { type: 'start'; query: string; opts: SummaryOptions; stores: { store: StoreId; storeName: string }[] }
  | { type: 'store'; report: StoreReport }
  | { type: 'end' };

/**
 * Streams each store's answer as a line of JSON the moment it arrives, so the
 * page can show Reliance in a second instead of waiting for a slow Flipkart.
 * Cached for 5 minutes (shorter than plain answers, since a store that timed
 * out is baked into the stream).
 */
export function streamRespond(plan: SearchPlan) {
  const encoder = new TextEncoder();
  const line = (l: StreamLine) => encoder.encode(`${JSON.stringify(l)}\n`);
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(line({ type: 'start', query: plan.query, opts: plan.opts, stores: plan.searches.map(({ store, storeName }) => ({ store, storeName })) }));
      for await (const report of reportsAsTheyArrive(plan)) controller.enqueue(line({ type: 'store', report }));
      controller.enqueue(line({ type: 'end' }));
      controller.close();
    },
  });
  return new Response(body, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
