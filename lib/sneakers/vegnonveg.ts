import { decodeEntities, getText, pool } from '@/lib/http';
import { memo } from '@/lib/memo';
import { filterMatches } from '@/lib/match';
import type { Offer } from '@/lib/types';

// VegNonVeg is not on Shopify. Its search page is server-rendered: each result
// is an <a> whose data-product holds {id, name, price} and whose URL slug
// carries the colourway ("…air-jordan-4-retro-off-whitefire-pink-anthracite").
// Sizes live on the product page as size boxes (data-size="9"). VegNonVeg sells
// at retail, one price for every size.

const BASE = 'https://www.vegnonveg.com';
const MAX_PRODUCTS = 4;

type Card = { title: string; brand: string; url: string; price: number; image?: string };

const titleFromSlug = (slug: string) =>
  slug
    .split('-')
    .map(w => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w.toUpperCase()))
    .join(' ');

function parseCards(html: string): Card[] {
  const cards: Card[] = [];
  const re = /<a href="(https:\/\/www\.vegnonveg\.com\/products\/([a-z0-9-]+))"[^>]*data-product="([^"]+)"([\s\S]{0,2500}?)<\/a>/g;
  for (const m of html.matchAll(re)) {
    let data: { name?: string; price?: number };
    try {
      data = JSON.parse(decodeEntities(m[3]));
    } catch {
      continue;
    }
    if (!data.price) continue;
    const slug = m[2];
    const img = m[4].match(/<img[^>]*class="img-normal[^"]*"[^>]*src="([^"]+)"/)?.[1];
    cards.push({
      // The slug starts with the brand then repeats the name with the colourway; use it as the readable title.
      title: titleFromSlug(slug.replace(/^[a-z]+-/, '')),
      brand: slug.split('-')[0],
      url: m[1],
      price: data.price,
      image: img?.replace(/\/resized\/\d+X\d+\//, '/resized/510X765/'),
    });
  }
  return cards;
}

/** Size boxes on the product page. Sold-out sizes carry a disabled/sold-out class. */
function sizeState(html: string, size: string): 'in' | 'out' | 'none' {
  for (const m of html.matchAll(/<div[^>]*data-size="([^"]+)"[^>]*class="([^"]*)"/g)) {
    if (m[1].trim() !== size) continue;
    return /disable|sold|out-of-stock|unavailable/i.test(m[2]) ? 'out' : 'in';
  }
  return 'none';
}

export async function searchVegNonVeg(q: string, size: string): Promise<Offer[]> {
  const html = await memo(`vnv-search|${q.toLowerCase()}`, () => getText(`${BASE}/search?q=${encodeURIComponent(q)}`));
  const { kept } = filterMatches(parseCards(html), q);
  const offers = await pool(kept.slice(0, MAX_PRODUCTS), MAX_PRODUCTS, async (card): Promise<Offer | null> => {
    const page = await memo(`vnv-product|${card.url}`, () => getText(card.url)).catch(() => null);
    if (!page) return null;
    const state = sizeState(page, size);
    if (state === 'none') return null;
    return {
      store: 'vegnonveg',
      storeName: 'VegNonVeg',
      title: card.title,
      brand: card.brand,
      image: card.image ?? page.match(/og:image" content="([^"]+)"/)?.[1],
      url: card.url,
      price: card.price,
      inStock: state === 'in',
    };
  });
  return offers.filter((o): o is Offer => o !== null);
}
