import { normalize, queryTokens } from '@/lib/match';
import type { Offer, OfferGroup } from '@/lib/types';

/** In stock first, then cheapest. */
export const byBestDeal = (a: Offer, b: Offer) => Number(b.inStock) - Number(a.inStock) || a.price - b.price;

// Stores name the same shoe differently: "Nike Dunk Low White Black (Panda)"
// at Crep Dog Crew is "Dunk Low Retro 'WHITE/BLACK/WHITE'" at Limited Edt. We
// compare the words that actually identify a model (colourway, storage size,
// version) and put listings that share most of them into one group, so each
// group can answer "cheapest store for this exact thing".

const FILLER = new Set([
  'nike', 'jordan', 'air', 'retro', 'og', 'men', 'mens', 'man', 'women', 'womens', 'wmn', 'wmns', 'w', 'the', 'and', 'shoe',
  'sneaker', 'uk', 'unisex', 'apple', 'samsung', 'with', 'bluetooth', 'se', 'edition', 'x',
]);
const SAME_MODEL = 0.6;

/** For everyday products a colour is the same deal; for sneakers the colourway *is* the shoe. */
export const COLOURS = new Set([
  'black', 'white', 'blue', 'mist', 'sage', 'lavender', 'green', 'pink', 'purple', 'red', 'silver', 'gold', 'grey', 'gray',
  'titanium', 'natural', 'desert', 'teal', 'ultramarine', 'starlight', 'midnight', 'icyblue', 'icy', 'navy', 'orange',
  'yellow', 'cream', 'graphite', 'phantom', 'cosmic', 'jet', 'deep', 'light', 'dark', 'true', 'wireles',
]);

/** Words that make a different model, so "iPhone 17" never swallows "iPhone 17 Pro". */
const MODEL_WORDS = /^(pro|max|plus|plu|ultra|mini|lite|air|fe|neo|prime|edge|fold\d*|flip\d*|\d+(gb|tb)?|gb|tb)$/;

export type GroupOptions = { ignoreColours?: boolean };

function signature(title: string, opts: GroupOptions): Set<string> {
  return new Set(
    normalize(title)
      .trim()
      .split(' ')
      .filter(t => t && !FILLER.has(t) && !/^(19|20)\d\d$/.test(t) && !(opts.ignoreColours && COLOURS.has(t))),
  );
}

const modelWords = (sig: Set<string>) => [...sig].filter(t => MODEL_WORDS.test(t)).sort().join(' ');

function sameModel(a: Set<string>, b: Set<string>): boolean {
  // Storage sizes, model numbers and Pro/Max/Edge must agree exactly: "iPhone 17 256 GB" and
  // "iPhone 17 512 GB" share most words but are different buys.
  if (modelWords(a) !== modelWords(b)) return false;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  if (shared / (a.size + b.size - shared || 1) >= SAME_MODEL) return true;
  // "Apple AirPods Pro 3" inside "Apple AirPods Pro 3 Bluetooth" is the same product.
  const small = a.size <= b.size ? a : b;
  return small.size >= 2 && shared === small.size;
}

export function groupOffers(offers: Offer[], query: string, opts: GroupOptions = {}): OfferGroup[] {
  const q = new Set(queryTokens(query));
  const groups: (OfferGroup & { sigs: Set<string>[] })[] = [];
  // offers arrive cheapest-first, so each group's first member is its cheapest.
  for (const offer of offers) {
    const sig = signature(offer.title, opts);
    // A listing joins a group if it names the same model as any listing already in it.
    const home = groups.find(g => g.sigs.some(s => sameModel(s, sig)));
    if (home) {
      home.offers.push(offer);
      home.sigs.push(sig);
    } else {
      groups.push({ key: `${offer.store}:${offer.url}`, title: offer.title, image: offer.image, offers: [offer], best: null, extra: 0, sigs: [sig] });
    }
  }
  // Joining depends on arrival order (a listing can match a later member but not the first), so
  // merge any two groups that name the same model until nothing changes.
  for (let merged = true; merged; ) {
    merged = false;
    outer: for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        if (groups[i].sigs.some(a => groups[j].sigs.some(b => sameModel(a, b)))) {
          groups[i].offers.push(...groups[j].offers);
          groups[i].sigs.push(...groups[j].sigs);
          groups.splice(j, 1);
          merged = true;
          break outer;
        }
      }
    }
  }
  for (const g of groups) {
    g.offers.sort(byBestDeal);
    g.best = g.offers.find(o => o.inStock) ?? null;
    g.image ??= g.offers.find(o => o.image)?.image;
    // Words beyond what the user typed: fewer means closer to what they asked for.
    g.extra = Math.min(...g.sigs.map(sig => [...sig].filter(t => !q.has(t)).length));
    // One row per store: a store listing the same model twice only shows its cheaper one.
    const seen = new Set<string>();
    g.offers = g.offers.filter(o => (seen.has(o.store) ? false : (seen.add(o.store), true)));
  }
  const stores = (g: OfferGroup) => g.offers.length;
  return groups
    .map(({ key, title, image, best, offers, extra }): OfferGroup => ({ key, title, image, best, offers, extra }))
    .sort(
      (a, b) =>
        Number(!!b.best) - Number(!!a.best) ||
        // Closeness to the query, with each extra store carrying it counting as one word closer:
        // the plain "Dunk Low Panda" at three stores beats a one-store "Vintage Panda".
        a.extra - stores(a) - (b.extra - stores(b)) ||
        (a.best?.price ?? Infinity) - (b.best?.price ?? Infinity),
    );
}
