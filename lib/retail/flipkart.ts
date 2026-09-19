import { getText, StoreError } from '@/lib/http';
import type { Offer } from '@/lib/types';

type FkProduct = {
  id?: string;
  baseUrl?: string;
  titles?: { title?: string; superTitle?: string; subtitle?: string };
  pricing?: { prices?: { strikeOff?: boolean; value?: number }[] };
  media?: { images?: { url?: string }[] };
  availability?: { displayState?: string };
};

// Flipkart's search page embeds its results as JSON in window.__INITIAL_STATE__.
// Each product sits under a `productInfo.value` node wherever the page layout
// puts it, so we walk the whole tree instead of trusting one path.
export async function searchFlipkart(q: string): Promise<Offer[]> {
  // Flipkart is slow to answer servers (often 8–10s), so it gets a longer wait.
  const html = await getText(`https://www.flipkart.com/search?q=${encodeURIComponent(q)}`, 14000);
  const json = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/)?.[1];
  if (!json) throw new StoreError('returned no readable results');
  let state: unknown;
  try {
    state = JSON.parse(json);
  } catch {
    throw new StoreError('sent an unreadable reply');
  }

  const found: FkProduct[] = [];
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    const info = (node as { productInfo?: { value?: FkProduct } }).productInfo;
    if (info?.value?.pricing) {
      found.push(info.value);
      return;
    }
    Object.values(node).forEach(walk);
  };
  walk(state);

  const seen = new Set<string>();
  const offers: Offer[] = [];
  for (const p of found) {
    const price = p.pricing?.prices?.find(x => !x.strikeOff)?.value;
    const title = p.titles?.title;
    if (!p.id || seen.has(p.id) || !price || !title || !p.baseUrl) continue;
    seen.add(p.id);
    const image = p.media?.images?.[0]?.url
      ?.replace('{@width}', '416')
      .replace('{@height}', '416')
      .replace('{@quality}', '70')
      .replace(/^http:/, 'https:');
    offers.push({
      store: 'flipkart',
      storeName: 'Flipkart',
      title: [title, p.titles?.subtitle].filter(Boolean).join(' · '),
      brand: p.titles?.superTitle,
      image,
      url: `https://www.flipkart.com${p.baseUrl}`,
      price,
      mrp: p.pricing?.prices?.find(x => x.strikeOff)?.value,
      inStock: !p.availability?.displayState || p.availability.displayState === 'IN_STOCK',
    });
  }
  return offers;
}
