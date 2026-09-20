import { getJson, pool } from '@/lib/http';
import { memo } from '@/lib/memo';
import { filterMatches } from '@/lib/match';
import type { Offer, SneakerStore } from '@/lib/types';

// Crep Dog Crew, Mainstreet, Superkicks, Dawntown and Limited Edt all run on
// Shopify, which serves two public JSON endpoints: predictive search, and a
// per-product file listing every size with its own price and stock. Reseller
// prices differ by size (a Panda Dunk at CDC runs ₹6,999–₹9,499), so the
// search-level "from" price is never used.

export const SHOPIFY_STORES: { store: SneakerStore; storeName: string; host: string }[] = [
  { store: 'crepdogcrew', storeName: 'Crep Dog Crew', host: 'crepdogcrew.com' },
  { store: 'mainstreet', storeName: 'Mainstreet', host: 'marketplace.mainstreet.co.in' },
  { store: 'superkicks', storeName: 'Superkicks', host: 'www.superkicks.in' },
  { store: 'dawntown', storeName: 'Dawntown', host: 'dawntown.co.in' },
  { store: 'limitededt', storeName: 'Limited Edt', host: 'www.limitededt.in' },
];

type Suggest = { resources: { results: { products: { title: string; handle: string; vendor?: string; image?: string }[] } } };
type Product = {
  title: string;
  handle: string;
  vendor?: string;
  featured_image?: string;
  options: (string | { name: string })[];
  variants: { title: string; price: number; compare_at_price?: number | null; available: boolean; options?: string[] }[];
};

const MAX_PRODUCTS_PER_STORE = 4;

/** "UK 8", "BLACK / UK 8", "UK 6 (EU 39)", or a bare "8" under a "Shoe Size (UK)" option → "8". */
export function ukSize(variantTitle: string, optionNames: string[]): string | undefined {
  const uk = variantTitle.match(/\bUK\s*(\d{1,2}(?:\.5)?)\b/i)?.[1];
  if (uk) return uk;
  if (!optionNames.some(n => /\buk\b/i.test(n))) return undefined;
  return variantTitle.split('/').map(s => s.trim()).find(s => /^\d{1,2}(\.5)?$/.test(s));
}

export async function searchShopify(cfg: (typeof SHOPIFY_STORES)[number], q: string, size: string): Promise<Offer[]> {
  const base = `https://${cfg.host}`;
  // Search results and product files don't depend on size, so they're cached without it: changing size re-prices instantly.
  const suggest = await memo(`sfy-search|${cfg.host}|${q.toLowerCase()}`, () =>
    getJson<Suggest>(`${base}/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=10`),
  );
  const candidates = suggest.resources.results.products.map(p => ({ ...p, brand: p.vendor }));
  const { kept } = filterMatches(candidates, q);

  const offers = await pool(kept.slice(0, MAX_PRODUCTS_PER_STORE), MAX_PRODUCTS_PER_STORE, async (hit): Promise<Offer | null> => {
    const p = await memo(`sfy-product|${cfg.host}|${hit.handle}`, () => getJson<Product>(`${base}/products/${hit.handle}.js`)).catch(() => null);
    if (!p) return null;
    const optionNames = p.options.map(o => (typeof o === 'string' ? o : o.name));
    const shipIndex = optionNames.findIndex(n => /deliver|ship|timeline|dispatch/i.test(n));

    const sized = p.variants.filter(v => ukSize(v.title, optionNames) === size);
    if (!sized.length) return null;
    // Several variants can share a size (Mainstreet lists one per delivery time): take the cheapest buyable one.
    const pick = [...sized].sort((a, b) => Number(b.available) - Number(a.available) || a.price - b.price)[0];
    const note = shipIndex >= 0 ? pick.title.split('/').map(s => s.trim())[shipIndex] : undefined;
    const image = p.featured_image ? (p.featured_image.startsWith('//') ? `https:${p.featured_image}` : p.featured_image) : hit.image;

    return {
      store: cfg.store,
      storeName: cfg.storeName,
      title: p.title.replace(/\s*[{}]\s*/g, ' ').replace(/\s+\|\s+/, ' ').trim(),
      brand: p.vendor,
      image,
      url: `${base}/products/${p.handle}`,
      price: pick.price / 100,
      mrp: pick.compare_at_price ? pick.compare_at_price / 100 : undefined,
      inStock: pick.available,
      note,
    };
  });
  return offers.filter((o): o is Offer => o !== null);
}
