import { StoreError } from '@/lib/http';
import { summarize, type StoreReport, type SummaryOptions } from '@/lib/summarize';
import type { Offer, SearchResult, StoreId } from '@/lib/types';

export type StoreSearch = { store: StoreId; storeName: string; run: () => Promise<Offer[]> };
export type SearchPlan = { query: string; searches: StoreSearch[]; opts: SummaryOptions };

/** Runs one store; a failure becomes a report instead of failing the whole search. */
async function report(s: StoreSearch): Promise<StoreReport> {
  try {
    return { store: s.store, storeName: s.storeName, ok: true, offers: await s.run() };
  } catch (e) {
    if (!(e instanceof StoreError)) console.error(`[${s.store}]`, e);
    return { store: s.store, storeName: s.storeName, ok: false, offers: [], error: e instanceof StoreError ? e.message : 'could not be reached' };
  }
}

/** Asks every store at once and answers when all have replied. */
export async function collect(plan: SearchPlan): Promise<SearchResult> {
  return summarize(plan.query, await Promise.all(plan.searches.map(report)), plan.opts);
}

/** Yields each store's report the moment it arrives, fastest first. */
export async function* reportsAsTheyArrive(plan: SearchPlan): AsyncGenerator<StoreReport> {
  const pending = new Map(plan.searches.map((s, i) => [i, report(s).then(r => ({ i, r }))]));
  while (pending.size) {
    const { i, r } = await Promise.race(pending.values());
    pending.delete(i);
    yield r;
  }
}
