import { decodeEntities, getText, rupees, StoreError } from '@/lib/http';
import { inferBrand } from '@/lib/match';
import type { Offer } from '@/lib/types';

// Reads amazon.in's public search page. Each result sits in a block marked
// data-component-type="s-search-result"; sponsored blocks are skipped because
// they are frequently unrelated to the query.
export async function searchAmazon(q: string): Promise<Offer[]> {
  const html = await getText(`https://www.amazon.in/s?k=${encodeURIComponent(q)}`);
  // Amazon answers automated traffic with a bot check (Akamai "bm-verify"
  // interstitial or a captcha). We report that honestly and never try to get past it.
  if (!html.includes('s-search-result') && /bm-verify|captcha|api-services-support@amazon/i.test(html)) {
    throw new StoreError('is blocking automatic checks right now');
  }
  const blocks = html.split('data-component-type="s-search-result"').slice(1);
  const offers: Offer[] = [];
  for (const raw of blocks) {
    const b = raw.slice(0, 15000);
    if (/>Sponsored<|Sponsored Ad -/.test(b)) continue;
    const asin = b.match(/\/dp\/([A-Z0-9]{10})/)?.[1];
    // Phones and fashion show the brand as its own heading above the title
    // ("Apple" / "iPhone 16 128 GB: …"); otherwise there is a single heading.
    const headings = [...b.matchAll(/<h2([^>]*)>([\s\S]*?)<\/h2>/g)].map(m => ({
      label: m[1].match(/aria-label="([^"]+)"/)?.[1],
      text: m[2].replace(/<[^>]+>/g, '').trim(),
    }));
    const last = headings.at(-1);
    const title = last?.label ?? last?.text;
    // Without a brand heading, a title that opens with a product line ("iPhone 16 128 GB…") names its brand.
    const brand =
      headings.length > 1 && headings[0].text.length < 40
        ? decodeEntities(headings[0].text)
        : inferBrand((title ?? '').trim().split(/\s+/)[0] ?? '');
    const whole = b.match(/class="a-price-whole">([\d,]+)/)?.[1];
    if (!asin || !title || !whole) continue;
    const mrp = b.match(/a-text-price[^>]*>\s*<span class="a-offscreen">₹([\d,]+)/)?.[1];
    offers.push({
      store: 'amazon',
      storeName: 'Amazon',
      title: decodeEntities(title).trim(),
      brand,
      image: b.match(/class="s-image"[^>]*src="([^"]+)"/)?.[1],
      url: `https://www.amazon.in/dp/${asin}`,
      price: rupees(whole),
      mrp: mrp ? rupees(mrp) : undefined,
      inStock: !/Currently unavailable/i.test(b),
    });
  }
  if (!offers.length && !blocks.length) throw new StoreError('returned no readable results');
  return offers;
}
