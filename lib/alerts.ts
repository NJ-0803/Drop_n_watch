import type { SavedItem } from '@/lib/saved';

/**
 * Whether a freshly checked price deserves a sound alert. Only a *drop*
 * ever buzzes: the price must be lower than at the last check and lower
 * than the last alert, and then either at/under the shopper's target, or,
 * with no target, a new lowest since saving. A rise never buzzes, even
 * if it stays under the target.
 */
export function shouldAlert(item: Pick<SavedItem, 'alert' | 'target' | 'lastPrice' | 'lowest' | 'savedPrice' | 'alertedPrice'>, price: number | null): boolean {
  if (!item.alert || price == null || item.lastPrice == null) return false;
  if (price >= item.lastPrice) return false;
  if (item.alertedPrice != null && price >= item.alertedPrice) return false;
  if (item.target) return price <= item.target;
  const low = item.lowest ?? item.savedPrice;
  return low == null || price < low;
}
