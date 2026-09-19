import { byBestDeal, groupOffers, type GroupOptions } from '@/lib/group';
import { filterMatches } from '@/lib/match';
import type { Offer, SearchResult, StoreId, StoreStatus } from '@/lib/types';

// Turning raw store answers into the result people see. Pure, so the server
// runs it for plain JSON answers and the browser re-runs it as each store's
// answer streams in.

export type StoreReport = { store: StoreId; storeName: string; ok: boolean; offers: Offer[]; error?: string };

export type SummaryOptions = GroupOptions & {
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

/** Keeps listings that match the query, groups the same product across stores, and reports each store. */
export function summarize(query: string, reports: StoreReport[], opts: SummaryOptions = {}, pending: string[] = []): SearchResult {
  const { kept, loose } = filterMatches(
    reports.flatMap(r => r.offers),
    query,
  );
  const offers = (opts.priceGuard ? dropPriceOutliers(kept) : kept).sort(byBestDeal);
  const stores: StoreStatus[] = reports.map(r => ({
    store: r.store,
    storeName: r.storeName,
    ok: r.ok,
    error: r.error,
    matched: offers.filter(o => o.store === r.store).length,
  }));
  return {
    query,
    size: opts.size,
    groups: groupOffers(offers, query, opts),
    stores,
    loose,
    checkedAt: new Date().toISOString(),
    ...(pending.length ? { pending } : {}),
  };
}
