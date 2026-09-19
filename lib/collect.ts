import { StoreError } from '@/lib/http';
import { byBestDeal, groupOffers, type GroupOptions } from '@/lib/group';
import { filterMatches } from '@/lib/match';
import type { Offer, SearchResult, StoreId, StoreStatus } from '@/lib/types';

export type StoreSearch = { store: StoreId; storeName: string; run: () => Promise<Offer[]> };


/**
 * Asks every store at once, keeps listings that match the query, and groups
 * the same product across stores. A store that fails becomes a status row; the others
 * still answer.
 */
export type CollectOptions = GroupOptions & {
  /**
   * Drop listings under a fifth of the typical price of the other matches.
   * Knock-offs and accessories that slip past the words ("Galaxy S25 case"
   * at ₹2,029 beside the ₹74,999 phone) are always far cheaper than the real thing.
   */
  priceGuard?: boolean;
  size?: string;
};

function dropPriceOutliers(offers: Offer[]): Offer[] {
  if (offers.length < 3) return offers;
  const prices = offers.map(o => o.price).sort((a, b) => a - b);
  const upperQuartile = prices[Math.floor(prices.length * 0.75)];
  return offers.filter(o => o.price >= upperQuartile * 0.2);
}

export async function collect(query: string, searches: StoreSearch[], opts: CollectOptions = {}): Promise<SearchResult> {
  const { size } = opts;
  const settled = await Promise.allSettled(searches.map(s => s.run()));
  const stores: StoreStatus[] = [];
  const all: Offer[] = [];
  settled.forEach((r, i) => {
    const { store, storeName } = searches[i];
    if (r.status === 'fulfilled') {
      all.push(...r.value);
      stores.push({ store, storeName, ok: true, matched: 0 });
    } else {
      const reason = r.reason instanceof StoreError ? r.reason.message : 'could not be reached';
      if (!(r.reason instanceof StoreError)) console.error(`[${store}]`, r.reason);
      stores.push({ store, storeName, ok: false, matched: 0, error: reason });
    }
  });

  const { kept, loose } = filterMatches(all, query);
  const offers = (opts.priceGuard ? dropPriceOutliers(kept) : kept).sort(byBestDeal);
  for (const s of stores) s.matched = offers.filter(o => o.store === s.store).length;
  return { query, size, groups: groupOffers(offers, query, opts), stores, loose, checkedAt: new Date().toISOString() };
}
