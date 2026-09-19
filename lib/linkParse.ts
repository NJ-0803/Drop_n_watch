import { COLOURS } from '@/lib/group';
import { STORE_NAMES } from '@/lib/stores';
import type { StoreId } from '@/lib/types';

// Understanding a pasted link without fetching anything: which store, which
// product (from the address itself), and whether it's a sneaker. Pure, so the
// browser can use it to spot links and the server to plan the comparison.

export class LinkError extends Error {}

export const STORE_HOSTS: Record<string, StoreId> = {
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
  'crepdogcrew.com': 'crepdogcrew',
  'marketplace.mainstreet.co.in': 'mainstreet',
  'superkicks.in': 'superkicks',
  'dawntown.co.in': 'dawntown',
  'limitededt.in': 'limitededt',
};

/** Share links that redirect to a full product address; only the server can follow them. */
export const SHORT_HOSTS = new Set(['amzn.in', 'amzn.to', 'amzn.eu', 'a.co', 'fkrt.it', 'fkrt.co', 'dl.flipkart.com']);

const SNEAKER_STORES = new Set<StoreId>(['crepdogcrew', 'mainstreet', 'superkicks', 'dawntown', 'limitededt', 'vegnonveg']);
const SNEAKER_WORDS =
  /\b(sneakers?|shoes?|footwear|dunks?|jordans?|aj\d{1,2}|air force|af1|air max|yeezy|samba|gazelle|spezial|campus 00s|new balance|nb\s?\d{3,4}|asics|gel|onitsuka|converse|chuck taylor|vans|slides?|clogs?|crocs)\b/i;

/** Words that describe a listing rather than name the shoe; stores disagree on them, so they sink a search. */
const SNEAKER_FILLER = new Set([
  'men', 'mens', 'man', 'women', 'womens', 'wmns', 'unisex', 'boys', 'girls', 'kids', 'shoe', 'shoes', 'sneaker', 'sneakers',
  'casual', 'running', 'retro', 'og', 'lifestyle', 'basketball', 'trainers', 'footwear', 'buy', 'online', 'new',
]);

export const bareHost = (u: URL) => u.hostname.toLowerCase().replace(/^(www|m)\./, '');

const URL_IN_TEXT = /https?:\/\/[^\s<>"'`]+|(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\/[^\s<>"'`]*/i;

/** The first web address in some text (share sheets add a sentence around the link). */
export function extractUrl(text: string): string | undefined {
  return text.match(URL_IN_TEXT)?.[0].replace(/[).,!?'"\]]+$/, '');
}

export const looksLikeLink = (text: string) => extractUrl(text.trim()) !== undefined;

/** The product-name part of an address: /Apple-iPhone-17-256-GB/dp/… → "Apple iPhone 17 256 GB". */
function nameFromPath(store: StoreId | undefined, u: URL): string | undefined {
  const parts = u.pathname
    .split('/')
    .filter(Boolean)
    .map(p => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    });
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
  // Anything else: the longest path segment that reads like words.
  slug ??= [...parts].sort((a, b) => b.length - a.length).find(p => /[a-z]{2,}[-_+][a-z]{2,}/i.test(p));
  const name = slug?.replace(/[-_+]+/g, ' ').trim();
  return name && /[a-z]{2,}/i.test(name) ? name : undefined;
}

/** Turns a listing name into a search other stores will match: stop at specs, drop colours or filler. */
export function searchQueryFrom(name: string, mode: 'retail' | 'sneakers'): string {
  const head = name.split(/\s(?:with|featuring|for)\s|[|:,(（[]/i)[0];
  const words = head.split(/\s+/).filter(w => {
    const lw = w.toLowerCase();
    if (!w || lw === 'buy') return false;
    if (/^(?=.*\d)(?=.*[a-z])[a-z0-9]{6,}$/i.test(w)) return false; // item codes like 7Q8bDl
    if (mode === 'retail') return !COLOURS.has(lw);
    return !SNEAKER_FILLER.has(lw) && !/^(19|20)\d\d$/.test(w);
  });
  return words.slice(0, 7).join(' ');
}

export type LinkPlan = {
  url: URL;
  store?: StoreId;
  storeName: string;
  /** Needs the server to follow a redirect before anything else is known. */
  short: boolean;
  name: string;
  mode: 'retail' | 'sneakers';
  query: string;
};

export function isSneaker(store: StoreId | undefined, u: URL, name: string): boolean {
  if (store && SNEAKER_STORES.has(store)) return true;
  if (store === 'myntra' && /shoes|sneakers|footwear/i.test(u.pathname.split('/')[1] ?? '')) return true;
  return SNEAKER_WORDS.test(name);
}

export function parseUrl(raw: string): URL {
  const found = extractUrl(raw.trim()) ?? raw.trim();
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(found) ? found : `https://${found}`);
  } catch {
    throw new LinkError('That doesn’t look like a link. Paste the full product address.');
  }
  if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) throw new LinkError('That doesn’t look like a link. Paste the full product address.');
  return u;
}

/**
 * Plans a comparison from a link alone. Links from any site are accepted
 * (a Nike.com page names its shoe in its address) but only known stores are
 * ever fetched, by the server.
 */
export function describeLink(raw: string, nameOverride?: string): LinkPlan {
  const url = parseUrl(raw);
  const host = bareHost(url);
  if (SHORT_HOSTS.has(host)) return { url, storeName: host, short: true, name: '', mode: 'retail', query: '' };
  const store = STORE_HOSTS[host];
  const storeName = store ? STORE_NAMES[store] : host;
  const name = nameOverride ?? nameFromPath(store, url);
  if (!name) throw new LinkError(`We couldn’t tell which product this ${storeName} link is. Type its name instead.`);
  const mode = isSneaker(store, url, name) ? 'sneakers' : 'retail';
  const query = searchQueryFrom(name, mode);
  if (!query) throw new LinkError(`We couldn’t tell which product this ${storeName} link is. Type its name instead.`);
  return { url, store, storeName, short: false, name, mode, query };
}
