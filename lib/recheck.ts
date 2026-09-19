'use client';

import { shouldAlert } from '@/lib/alerts';
import type { SavedItem } from '@/lib/saved';
import { fetchResult } from '@/lib/useSearch';

export type Recheck = { patch: Partial<SavedItem>; alert: boolean };

/**
 * Re-runs a saved item's search, finds the same product by any of its listing
 * links, and decides whether it deserves an alert (see shouldAlert: only
 * drops ever buzz).
 */
export async function recheck(item: SavedItem): Promise<Recheck> {
  const result = await fetchResult(item.kind, item.query, item.size);
  const urls = new Set(item.urls);
  const group = result.groups.find(g => g.offers.some(o => urls.has(o.url)));
  const best = group?.best;
  const price = best?.price ?? null;
  const previousLow = item.lowest ?? item.savedPrice;

  const alert = shouldAlert(item, price);

  return {
    alert,
    patch: {
      lastPrice: price,
      lastStore: best?.storeName,
      lastUrl: best?.url ?? item.lastUrl,
      urls: group ? [...new Set([...item.urls, ...group.offers.map(o => o.url)])] : item.urls,
      lowest: price != null && (previousLow == null || price < previousLow) ? price : previousLow,
      checkedAt: new Date().toISOString(),
      ...(alert ? { alertedPrice: price } : {}),
    },
  };
}
