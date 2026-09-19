import { collect, type SearchPlan } from '@/lib/collect';
import { searchShopify, SHOPIFY_STORES } from '@/lib/sneakers/shopify';
import { searchVegNonVeg } from '@/lib/sneakers/vegnonveg';

export { UK_SIZES } from '@/lib/sneakers/sizes';

export function sneakerPlan(q: string, size: string): SearchPlan {
  return {
    query: q,
    searches: [
      ...SHOPIFY_STORES.map(cfg => ({ store: cfg.store, storeName: cfg.storeName, run: () => searchShopify(cfg, q, size) })),
      { store: 'vegnonveg' as const, storeName: 'VegNonVeg', run: () => searchVegNonVeg(q, size) },
    ],
    opts: { size },
  };
}

export const searchSneakers = (q: string, size: string) => collect(sneakerPlan(q, size));
