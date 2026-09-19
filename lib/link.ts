import { COLOURS } from '@/lib/group';
import { decodeEntities, getText, StoreError } from '@/lib/http';
import { searchRetail } from '@/lib/retail';
import { SHOPIFY_STORES } from '@/lib/sneakers/shopify';
import { STORE_NAMES } from '@/lib/stores';
import type { Offer, SearchResult, StoreId } from '@/lib/types';

// "Paste a link": work out which product a store link points to, search every
// other store for it, and say whether the pasted store is already cheapest.

const HOSTS: Record<string, StoreId> = {
  'amazon.in': 'amazon',
  'flipkart.com': 'flipkart',
  'reliancedigital.in': 'reliance',
  'vijaysales.com': 'vijaysales',
  'snapdeal.com': 'snapdeal',
  'croma.com': 'croma',
  'tatacliq.com': 'tatacliq',
  'myntra.com': 'myntra',
  'nykaa.com': 'nykaa',
  'ajio.com': 'ajio',
  'vegnonveg.com': 'vegnonveg',
  ...Object.fromEntries(SHOPIFY_STORES.map(s => [s.host.replace(/^www\./, ''), s.store])),
};
/** Share links that redirect to a full product address. */
const SHORT_HOSTS = new Set(['amzn.in', 'amzn.to', 'amzn.eu', 'a.co', 'fkrt.it', 'fkrt.co', 'dl.flipkart.com']);
/** Stores whose pages refuse servers; we don't try to fetch them. */
const UNREADABLE = new Set<StoreId>(['amazon', 'croma', 'tatacliq', 'myntra', 'nykaa', 'ajio']);
const SNEAKER_STORES = new Set<StoreId>(['crepdogcrew', 'mainstreet', 'superkicks', 'dawntown', 'limitededt', 'vegnonveg']);

const bareHost = (u: URL) => u.hostname.toLowerCase().replace(/^(www|m)\./, '');

export class LinkError extends Error {}

export function parseStoreUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw.trim().startsWith('http') ? raw.trim() : `https://${raw.trim()}`);
  } catch {
    throw new LinkError('That doesn’t look like a link. Paste the full product address.');
  }
  const host = bareHost(u);
  if (!HOSTS[host] && !SHORT_HOSTS.has(host)) {
    throw new LinkError('We can read links from Amazon, Flipkart, Reliance Digital, Vijay Sales, Snapdeal, Croma, Tata CLiQ, Myntra, Nykaa, Ajio and the sneaker stores.');
  }
  return u;
}

/** Follows share-link redirects (amzn.in, fkrt.it) to the real product page, staying on known store hosts. */
async function resolveShort(u: URL): Promise<URL> {
  let current = u;
  for (let hop = 0; hop < 4 && SHORT_HOSTS.has(bareHost(current)); hop++) {
    const res = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(8000) }).catch(() => null);
    const next = res?.headers.get('location');
    if (!next) throw new LinkError('That short link didn’t lead anywhere. Open it and copy the full product address instead.');
    current = new URL(next, current);
  }
  if (!HOSTS[bareHost(current)]) throw new LinkError('That link leads outside the stores we compare.');
  return current;
}

/** The product-name part of a store address, e.g. /Apple-iPhone-17-256-GB/dp/B0… → "Apple iPhone 17 256 GB". */
function nameFromPath(store: StoreId, u: URL): string | undefined {
  const parts = u.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const before = (marker: string) => {
    const i = parts.indexOf(marker);
    return i > 0 ? parts[i - 1] : undefined;
  };
  let slug: string | undefined;
  if (store === 'amazon') slug = before('dp') ?? before('gp');
  else if (store === 'flipkart' || store === 'croma' || store === 'nykaa' || store === 'ajio') slug = before('p');
  else if (store === 'reliance') slug = parts[1]?.replace(/-[a-z0-9]{6}-\d+$/i, '');
  else if (store === 'vijaysales') slug = parts[2];
  else if (store === 'snapdeal') slug = parts[1];
  else if (store === 'myntra') slug = parts[2];
  else if (parts[0] === 'products') slug = parts[1];
  slug ??= [...parts].sort((a, b) => b.length - a.length).find(p => /[a-z]-[a-z]/i.test(p));
  return slug && /[a-z]/i.test(slug) ? slug.replace(/[-_+]+/g, ' ').trim() : undefined;
}

type PageDetails = { title?: string; price?: number; image?: string; inStock?: boolean };

/** Reads schema.org Product data (name, price, stock) that many store pages publish for search engines. */
function detailsFromHtml(html: string): PageDetails {
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    let data: unknown;
    try {
      data = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    const nodes = Array.isArray(data) ? data : ((data as { '@graph'?: unknown[] })['@graph'] ?? [data]);
    for (const node of nodes as Record<string, unknown>[]) {
      const type = node?.['@type'];
      if (type !== 'Product' && !(Array.isArray(type) && type.includes('Product'))) continue;
      const offersRaw = node.offers as Record<string, unknown> | Record<string, unknown>[] | undefined;
      const offer = Array.isArray(offersRaw) ? offersRaw[0] : offersRaw;
      const image = Array.isArray(node.image) ? node.image[0] : node.image;
      return {
        title: typeof node.name === 'string' ? decodeEntities(node.name) : undefined,
        price: Number(offer?.price ?? offer?.lowPrice) || undefined,
        image: typeof image === 'string' ? image : undefined,
        inStock: typeof offer?.availability === 'string' ? /InStock/i.test(offer.availability) : undefined,
      };
    }
  }
  // No product data means a generic or stripped page (its title can be "Online Electronic Shopping
  // Store in India"), so we fall back to the name in the link itself.
  return {};
}

/** Turns a long listing name into a search: stop at specs and punctuation, drop colours. */
export function searchQueryFrom(name: string, keepColours: boolean): string {
  const head = name.split(/\s(?:with|featuring|for)\s|[|:,(（\[]/i)[0];
  const words = head
    .split(/\s+/)
    .filter(w => w && !/^buy$/i.test(w) && (keepColours || !COLOURS.has(w.toLowerCase())));
  return words.slice(0, 7).join(' ');
}

/** Same listing across two addresses: Amazon ASIN, Flipkart pid, or the same path on the same store. */
export function sameListing(a: string, b: string): boolean {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    if (bareHost(ua) !== bareHost(ub)) return false;
    const asin = (u: URL) => u.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i)?.[1]?.toUpperCase();
    if (asin(ua)) return asin(ua) === asin(ub);
    const pid = ua.searchParams.get('pid');
    if (pid) return pid === ub.searchParams.get('pid');
    return ua.pathname.replace(/\/$/, '') === ub.pathname.replace(/\/$/, '');
  } catch {
    return false;
  }
}

export type LinkSource = { store: StoreId; storeName: string; url: string; title: string; price: number | null; image?: string };

export type LinkVerdict =
  | { kind: 'cheapest'; best: Offer } // the pasted store is already the lowest
  | { kind: 'cheaper'; best: Offer; saving: number } // another store beats it
  | { kind: 'unknown'; best: Offer } // we couldn't read the pasted store's price
  | { kind: 'none' }; // nothing comparable found

export type LinkResult =
  | { mode: 'retail'; source: LinkSource; query: string; result: SearchResult; verdict: LinkVerdict }
  | { mode: 'sneakers'; source: LinkSource; query: string };

export async function checkLink(raw: string): Promise<LinkResult> {
  const url = await resolveShort(parseStoreUrl(raw));
  const store = HOSTS[bareHost(url)];
  const storeName = STORE_NAMES[store];

  let details: PageDetails = {};
  if (!UNREADABLE.has(store)) {
    details = await getText(url.toString(), 9000)
      .then(detailsFromHtml)
      .catch(e => {
        if (!(e instanceof StoreError)) console.error('[link]', e);
        return {};
      });
  }
  const name = details.title ?? nameFromPath(store, url);
  if (!name) throw new LinkError(`We couldn’t tell which product this ${storeName} link is. Type its name instead.`);

  const source: LinkSource = { store, storeName, url: url.toString(), title: name, price: details.price ?? null, image: details.image };
  const sneakers = SNEAKER_STORES.has(store);
  const query = searchQueryFrom(name, sneakers);
  if (sneakers) return { mode: 'sneakers', source, query };

  const result = await searchRetail(query);
  // The pasted listing often turns up in its own store's results, which gives us its price.
  const own = result.groups.flatMap(g => g.offers).find(o => sameListing(o.url, source.url));
  if (source.price == null && own) source.price = own.price;
  source.image ??= own?.image;

  const group = result.groups.find(g => g.offers.some(o => sameListing(o.url, source.url))) ?? result.groups[0];
  // Still no price: the same model from the same store (often just another colour) stands in for it.
  if (source.price == null) {
    const sibling = group?.offers.find(o => o.store === source.store && o.inStock);
    if (sibling) source.price = sibling.price;
  }
  const best = group?.best;
  let verdict: LinkVerdict;
  if (!best) verdict = { kind: 'none' };
  else if (source.price == null) verdict = { kind: 'unknown', best };
  else if (best.price < source.price && !sameListing(best.url, source.url)) verdict = { kind: 'cheaper', best, saving: source.price - best.price };
  else verdict = { kind: 'cheapest', best };

  return { mode: 'retail', source, query, result, verdict };
}
