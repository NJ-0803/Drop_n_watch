import { getJson } from '@/lib/http';
import type { Offer } from '@/lib/types';

type Item = {
  name?: string;
  slug?: string;
  sellable?: boolean;
  brand?: { name?: string };
  medias?: { url?: string }[];
  price?: { effective?: { min?: number }; marked?: { min?: number } };
};

// Reliance Digital's storefront calls this public catalogue search from the browser.
export async function searchReliance(q: string): Promise<Offer[]> {
  const data = await getJson<{ items?: Item[] }>(
    `https://www.reliancedigital.in/ext/raven-api/catalog/v1.0/products?q=${encodeURIComponent(q)}&page_size=24`,
  );
  return (data.items ?? []).flatMap(i => {
    const price = i.price?.effective?.min;
    if (!i.name || !i.slug || !price) return [];
    return [
      {
        store: 'reliance' as const,
        storeName: 'Reliance Digital',
        title: i.name,
        brand: i.brand?.name,
        image: i.medias?.[0]?.url,
        url: `https://www.reliancedigital.in/product/${i.slug}`,
        price,
        mrp: i.price?.marked?.min,
        inStock: i.sellable !== false,
      },
    ];
  });
}
