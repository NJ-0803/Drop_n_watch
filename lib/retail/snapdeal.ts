import { decodeEntities, getText, rupees } from '@/lib/http';
import type { Offer } from '@/lib/types';

// Snapdeal's search page is server-rendered; each result is a
// "product-tuple-listing" block with the price in a display-price attribute.
export async function searchSnapdeal(q: string): Promise<Offer[]> {
  const html = await getText(`https://www.snapdeal.com/search?keyword=${encodeURIComponent(q)}`);
  return html
    .split('product-tuple-listing')
    .slice(1)
    .flatMap(raw => {
      const b = raw.slice(0, 6000);
      const url = b.match(/href="(https:\/\/www\.snapdeal\.com\/product\/[^"]+)"/)?.[1];
      const title = b.match(/class="product-title[^"]*"[^>]*title="([^"]+)"/)?.[1];
      const price = b.match(/display-price="(\d+)"/)?.[1];
      if (!url || !title || !price) return [];
      const mrp = b.match(/product-desc-price[^>]*>([^<]+)/)?.[1];
      return [
        {
          store: 'snapdeal' as const,
          storeName: 'Snapdeal',
          title: decodeEntities(title),
          image: b.match(/<img[^>]*class="product-image[^"]*"[^>]*(?:src|data-src)="([^"]+)"/)?.[1],
          url,
          price: Number(price),
          mrp: mrp ? rupees(mrp) || undefined : undefined,
          inStock: !/sold-out|out of stock/i.test(b),
        },
      ];
    });
}
