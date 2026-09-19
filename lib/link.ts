import { decodeEntities, getText, StoreError } from '@/lib/http';
import { bareHost, describeLink, LinkError, SHORT_HOSTS } from '@/lib/linkParse';
import { searchRetail } from '@/lib/retail';
import type { Offer, SearchResult, StoreId } from '@/lib/types';

export { LinkError };

// "Paste a link": work out which product a store link points to, search every
// other store for it, and say whether the pasted store is already cheapest.

/** Stores whose pages refuse servers; we never try to fetch them (nor any site we don't compare). */
const UNREADABLE = new Set<StoreId>(['amazon', 'croma', 'tatacliq', 'myntra', 'nykaa', 'ajio']);

/** Follows share-link redirects (amzn.in, fkrt.it) to the product page. Only share-link hosts are ever requested here. */
async function resolveShort(u: URL): Promise<URL> {
  let current = u;
  for (let hop = 0; hop < 4 && SHORT_HOSTS.has(bareHost(current)); hop++) {
    const res = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(8000) }).catch(() => null);
    const next = res?.headers.get('location');
    if (!next) throw new LinkError('That short link didn’t lead anywhere. Open it and copy the full product address instead.');
    current = new URL(next, current);
  }
  if (SHORT_HOSTS.has(bareHost(current))) throw new LinkError('That short link didn’t lead anywhere. Open it and copy the full product address instead.');
  return current;
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

export type LinkSource = { store?: StoreId; storeName: string; url: string; title: string; price: number | null; image?: string };

export type LinkVerdict =
  | { kind: 'cheapest'; best: Offer } // the pasted store is already the lowest
  | { kind: 'cheaper'; best: Offer; saving: number } // another store beats it
  | { kind: 'unknown'; best: Offer } // we couldn't read the pasted store's price
  | { kind: 'none' }; // nothing comparable found

export type LinkResult =
  | { mode: 'retail'; source: LinkSource; query: string; result: SearchResult; verdict: LinkVerdict }
  | { mode: 'sneakers'; source: LinkSource; query: string };

export async function checkLink(raw: string): Promise<LinkResult> {
  let plan = describeLink(raw);
  if (plan.short) plan = describeLink((await resolveShort(plan.url)).toString());
  const { url, store, storeName } = plan;

  // A store page we can read may carry the exact name and price; otherwise the address is enough.
  let details: PageDetails = {};
  if (store && !UNREADABLE.has(store)) {
    details = await getText(url.toString(), 9000)
      .then(detailsFromHtml)
      .catch(e => {
        if (!(e instanceof StoreError)) console.error('[link]', e);
        return {};
      });
    if (details.title) plan = describeLink(url.toString(), details.title);
  }
  const { query, mode } = plan;
  const source: LinkSource = { store, storeName, url: url.toString(), title: details.title ?? plan.name, price: details.price ?? null, image: details.image };
  if (mode === 'sneakers') return { mode: 'sneakers', source, query };

  const result = await searchRetail(query);
  // The pasted listing often turns up in its own store's results, which gives us its price.
  const own = result.groups.flatMap(g => g.offers).find(o => sameListing(o.url, source.url));
  if (source.price == null && own) source.price = own.price;
  source.image ??= own?.image;

  const group = result.groups.find(g => g.offers.some(o => sameListing(o.url, source.url))) ?? result.groups[0];
  // Still no price: the same model from the same store (often just another colour) stands in for it.
  if (source.price == null) {
    const sibling = source.store && group?.offers.find(o => o.store === source.store && o.inStock);
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
