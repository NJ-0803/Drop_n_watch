// Deciding whether a store listing is the thing the user asked for.
//
// Store search is noisy: "airpods pro 2" on Flipkart returns ~40 knock-offs
// (₹648, "SAIBABA Airpods Pro 2") around one genuine Apple listing, and Amazon
// returns cases and ear tips. A "lowest price" that lands on a clone is worse
// than no answer, so matching is strict: every query word must appear, the
// brand must be right when we can infer it, and accessories and knock-off
// wording are dropped unless the user asked for them.

const STOPWORDS = new Set(['the', 'a', 'an', 'for', 'with', 'and', 'of', 'in', 'new', 'buy', 'price', 'online', 'india']);

const BRANDS = [
  'apple', 'samsung', 'sony', 'oneplus', 'xiaomi', 'redmi', 'realme', 'oppo', 'vivo', 'iqoo', 'google', 'nothing', 'motorola',
  'boat', 'jbl', 'bose', 'sennheiser', 'marshall', 'lg', 'hp', 'dell', 'lenovo', 'asus', 'acer', 'msi', 'microsoft', 'dyson',
  'philips', 'nike', 'jordan', 'adidas', 'puma', 'reebok', 'asics', 'converse', 'vans', 'crocs', 'yeezy', 'garmin', 'fossil',
  'casio', 'canon', 'nikon', 'fujifilm', 'gopro', 'logitech', 'razer', 'amazon', 'mi', 'tissot', 'skechers', 'bata',
  'new balance', 'onitsuka tiger', 'hoka', 'salomon',
];

/** Product lines that imply a brand, so "airpods" means only Apple listings count. */
const LINE_BRAND: Record<string, string> = {
  af1: 'nike', ...Object.fromEntries(Array.from({ length: 13 }, (_, i) => [`aj${i + 1}`, 'jordan'])),
  airpods: 'apple', iphone: 'apple', ipad: 'apple', macbook: 'apple', imac: 'apple', airtag: 'apple',
  galaxy: 'samsung', pixel: 'google', playstation: 'sony', ps5: 'sony', xbox: 'microsoft', kindle: 'amazon',
  dunk: 'nike', 'air max': 'nike', 'air force': 'nike', yeezy: 'adidas', samba: 'adidas', gazelle: 'adidas',
};

const ACCESSORY = /\b(case|cases|cover|covers|skin|protector|tempered|glass|strap|band|cable|charger|adapter|replacement|tips?|earpads?|earpad|stand|holder|pouch|sleeve|keychain|lanyard|sticker|decal|laces|insoles?|cleaner)\b/;
/** Accessory phrases that can sit late in a title: "Samsung Galaxy S25 Plus SG Mobile Case, Grey". */
const ACCESSORY_PHRASE = /\b(mobile|phone|back|flip|silicone|protective|grip|standing|rugged|armou?r|wallet|leather)\s+(case|cover)\b|\b(screen|camera|lens)\s+(protector|guard)\b/;
const KNOCKOFF = /\b(compatible|compitable|copy|replica|first copy|master copy|premium quality|best quality|original certified|7a|clone|dupe|inspired)\b/;

/** Nicknames and shorthand that stores spell out instead: "panda" is a white/black colourway, "aj4" an Air Jordan 4. */
const ALIASES: Record<string, string[][]> = {
  panda: [['white', 'black']],
  bred: [['black', 'red']],
  af1: [['air', 'force', '1']],
  ...Object.fromEntries(Array.from({ length: 13 }, (_, i) => [`aj${i + 1}`, [['jordan', String(i + 1)]]])),
};

export function normalize(s: string): string {
  return ` ${s
    .toLowerCase()
    .replace(/(\d+)(st|nd|rd|th)\b/g, '$1')
    .replace(/[^a-z0-9.]+/g, ' ')
    .replace(/\b(\w{3,}[a-rt-z0-9])s\b/g, '$1') // plural → singular, but keep "glass"
    .replace(/\s+/g, ' ')
    .trim()} `;
}

export function queryTokens(q: string): string[] {
  return normalize(q).trim().split(' ').filter(t => t && !STOPWORDS.has(t));
}

export function inferBrand(q: string): string | undefined {
  const n = normalize(q);
  // Compare normalised spellings on both sides: normalising turns "adidas" into "adida" and "vans" into "van".
  const explicit = BRANDS.find(b => n.includes(normalize(b)));
  if (explicit) return explicit;
  for (const [line, brand] of Object.entries(LINE_BRAND)) if (n.includes(` ${normalize(line).trim()} `)) return brand;
  return undefined;
}

function hasToken(title: string, token: string): boolean {
  if (title.includes(` ${token} `)) return true;
  return (ALIASES[token] ?? []).some(words => words.every(w => title.includes(` ${w} `)));
}

export type MatchInput = { title: string; brand?: string };

/** 1 = every word matched; lower means some words missing; -1 = wrong brand, accessory or knock-off. */
export function matchScore(item: MatchInput, q: string): number {
  const title = normalize(item.title);
  const nq = normalize(q);
  // An accessory word only disqualifies when it names the product: early in the
  // title ("Case for AirPods…") or followed by "for". "Apple Watch … Case with
  // Sport Band" is a watch.
  const lead6 = ` ${title.trim().split(' ').slice(0, 6).join(' ')} `;
  const accessoryListing = ACCESSORY.test(lead6) || ACCESSORY_PHRASE.test(title) || new RegExp(`${ACCESSORY.source}.{0,24}\\bfor\\b`).test(title);
  if (accessoryListing && !ACCESSORY.test(nq)) return -1;
  if (KNOCKOFF.test(title) && !KNOCKOFF.test(nq)) return -1;

  // When the shopper asks for an accessory, the brand they typed is the device it fits, not its maker.
  const brand = ACCESSORY.test(nq) ? undefined : inferBrand(q);
  if (brand) {
    // A listing's brand is its brand field plus the first two words of its title.
    const lead = normalize(`${item.brand ?? ''} ${title.trim().split(' ').slice(0, 2).join(' ')}`);
    const has = (b: string) => lead.includes(normalize(b));
    const brandOk = has(brand) || (brand === 'nike' && has('jordan')) || (brand === 'jordan' && has('nike'));
    if (!brandOk) return -1;
  }

  const tokens = queryTokens(q);
  if (!tokens.length) return 0;
  const hits = tokens.filter(t => hasToken(title, t)).length;
  return hits / tokens.length;
}

/** Keeps strict matches; if there are none, keeps close ones (≥75% of words) and says so. */
export function filterMatches<T extends MatchInput>(items: T[], q: string): { kept: T[]; loose: boolean } {
  const scored = items.map(item => ({ item, score: matchScore(item, q) }));
  const strict = scored.filter(s => s.score === 1).map(s => s.item);
  if (strict.length) return { kept: strict, loose: false };
  const close = scored.filter(s => s.score >= 0.75).map(s => s.item);
  return { kept: close, loose: close.length > 0 };
}
