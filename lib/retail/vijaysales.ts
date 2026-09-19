import { getJson, getText, StoreError } from '@/lib/http';
import type { Offer } from '@/lib/types';

// Vijay Sales' site search runs on Unbxd, a hosted search service built to be
// called from browsers with keys the page publishes. We read those keys from
// the page (they can rotate) and keep them for a day.
let keys: { api: string; site: string; at: number } | null = null;
const DAY = 24 * 60 * 60 * 1000;

async function unbxdKeys() {
  if (keys && Date.now() - keys.at < DAY) return keys;
  const html = await getText('https://www.vijaysales.com/search-listing?q=tv');
  const api = html.match(/value="([a-f0-9]{32})" id="unbxd-apiKey"/)?.[1];
  const site = html.match(/value="([^"]+)" id="unbxd-siteKey"/)?.[1];
  if (!api || !site) throw new StoreError('changed its search');
  keys = { api, site, at: Date.now() };
  return keys;
}

type Product = Record<string, unknown> & {
  title?: string;
  price?: string;
  mrp?: string;
  productUrl?: string;
  imageUrl?: string[] | string;
  brand?: string[] | string;
};

export async function searchVijaySales(q: string): Promise<Offer[]> {
  const k = await unbxdKeys();
  const data = await getJson<{ response?: { products?: Product[] } }>(
    `https://search.unbxd.io/${k.api}/${k.site}/search?q=${encodeURIComponent(q)}&rows=24`,
  );
  return (data.response?.products ?? []).flatMap(p => {
    const price = Number(p.price);
    if (!p.title || !p.productUrl || !price) return [];
    // Stock is listed per city; call it in stock if any city can sell it.
    const statuses = Object.entries(p).filter(([key]) => /^cityId_\d+_status_unx_ts$/.test(key)).map(([, v]) => v);
    const image = Array.isArray(p.imageUrl) ? p.imageUrl[0] : p.imageUrl;
    return [
      {
        store: 'vijaysales' as const,
        storeName: 'Vijay Sales',
        title: p.title,
        brand: Array.isArray(p.brand) ? p.brand[0] : p.brand,
        image,
        url: p.productUrl,
        price,
        mrp: Number(p.mrp) || undefined,
        inStock: statuses.length === 0 || statuses.includes('Available'),
      },
    ];
  });
}
