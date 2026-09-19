import { collect } from '@/lib/collect';
import { searchShopify, SHOPIFY_STORES } from '@/lib/sneakers/shopify';
import { searchVegNonVeg } from '@/lib/sneakers/vegnonveg';

export { UK_SIZES } from '@/lib/sneakers/sizes';

export function searchSneakers(q: string, size: string) {
  return collect(
    q,
    [
      ...SHOPIFY_STORES.map(cfg => ({ store: cfg.store, storeName: cfg.storeName, run: () => searchShopify(cfg, q, size) })),
      { store: 'vegnonveg' as const, storeName: 'VegNonVeg', run: () => searchVegNonVeg(q, size) },
    ],
    { size },
  );
}
