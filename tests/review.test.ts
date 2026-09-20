import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { shouldAlert } from '@/lib/alerts';
import { byBestDeal, groupOffers } from '@/lib/group';
import { judgeLink, type LinkSource } from '@/lib/link';
import { matchScore } from '@/lib/match';
import { summarize, type StoreReport } from '@/lib/summarize';
import type { Offer, StoreId } from '@/lib/types';

// Cases raised in review, kept as regression tests.

let n = 0;
const offer = (store: StoreId, title: string, price: number, brand?: string, url = `https://example.com/${store}/${n++}`): Offer => ({
  store,
  storeName: store,
  title,
  brand,
  price,
  inStock: true,
  url,
});
const retail = (offers: Offer[], q: string) => groupOffers([...offers].sort(byBestDeal), q, { ignoreColours: true });

describe('brands whose names look plural', () => {
  for (const [title, brand, q] of [
    ['Adidas Samba OG Cloud White', 'Adidas', 'adidas samba'],
    ['Samba OG Shoes', 'adidas', 'samba og'],
    ['Vans Old Skool Black White', 'Vans', 'vans old skool'],
    ['Crocs Classic Clog', 'Crocs', 'crocs classic clog'],
    ['ASICS Gel-Kayano 14', 'ASICS', 'asics gel kayano 14'],
    ['Skechers Go Walk 7', 'Skechers', 'skechers go walk 7'],
  ]) {
    it(`keeps genuine ${brand}: "${title}"`, () => assert.equal(matchScore({ title, brand }, q), 1));
  }
  it('finds the brand when the store keeps it out of the title', () =>
    assert.equal(matchScore({ title: 'Samba OG Sneakers For Men', brand: 'ADIDAS' }, 'adidas samba'), 1));
  it('finds an Amazon phone whose title omits the brand', () =>
    assert.equal(matchScore({ title: 'iPhone 16 128 GB: 5G Mobile Phone', brand: 'Apple' }, 'apple iphone 16'), 1));
  it('still rejects a fake Adidas', () => assert.equal(matchScore({ title: 'Samba OG Style Sneakers', brand: 'Generic' }, 'adidas samba'), -1));
});

describe('different models stay apart', () => {
  it('iPad vs iPad Air', () => assert.equal(retail([offer('reliance', 'Apple iPad Air 128GB Wi-Fi', 59900), offer('flipkart', 'Apple iPad 128GB Wi-Fi', 34900)], 'ipad').length, 2));
  it('Watch vs Watch SE', () =>
    assert.equal(retail([offer('reliance', 'Apple Watch SE 44mm GPS', 29900), offer('flipkart', 'Apple Watch Series 10 44mm GPS', 46900)], 'apple watch').length, 2));
  it('iPhone 17 128GB, 256GB, Pro and base are each their own group', () => {
    const g = retail(
      [
        offer('reliance', 'Apple iPhone 17 128 GB Black', 72900),
        offer('flipkart', 'Apple iPhone 17 (Black, 256 GB)', 82900),
        offer('vijaysales', 'Apple iPhone 17 Pro 256GB Deep Blue', 134900),
        offer('reliance', 'Apple iPhone 17 Pro 512 GB Deep Blue', 154900),
        offer('flipkart', 'Apple iPhone 17 Pro Max 256 GB', 149900),
      ],
      'iphone 17',
    );
    assert.equal(g.length, 5);
  });
});

describe('AirPods Pro 2 among cases and replicas', () => {
  const reports: StoreReport[] = [
    {
      store: 'flipkart',
      storeName: 'Flipkart',
      ok: true,
      offers: [
        offer('flipkart', 'SAIBABA Airpods Pro 2 (2nd generation) with MagSafe Case', 648, 'SAIBABA'),
        offer('flipkart', 'BeatFlow Airmaxi Pro Pro 2 (2nd generation) premium quality', 799, 'BeatFlow'),
        offer('flipkart', 'Apple AirPods Pro (2nd generation) with MagSafe Case (USB-C) Bluetooth', 19990, 'Apple'),
      ],
    },
    {
      store: 'amazon',
      storeName: 'Amazon',
      ok: true,
      offers: [
        offer('amazon', 'Case for Airpods Pro 2 Case Cover with Lanyard', 298),
        offer('amazon', 'Wireless Earbuds Compatible with AirPods Pro 2, Bluetooth 5.3', 210),
        offer('amazon', 'Apple AirPods Pro 2 Wireless Earbuds, Active Noise Cancellation', 21900, 'Apple'),
      ],
    },
    { store: 'snapdeal', storeName: 'Snapdeal', ok: true, offers: [offer('snapdeal', 'AIR PODS PRO 2 Bluetooth True Wireless (TWS) In Ear', 299)] },
  ];
  const result = summarize('airpods pro 2', reports, { priceGuard: true, ignoreColours: true });
  it('the winner is the genuine Apple listing', () => assert.equal(result.groups[0].best?.price, 19990));
  it('no case, replica or brandless clone survives anywhere', () => {
    const prices = result.groups.flatMap(g => g.offers.map(o => o.price));
    assert.deepEqual(prices.sort((a, b) => a - b), [19990, 21900]);
  });
});

describe('sound alerts only on a drop', () => {
  const base = { alert: true, target: 8500, lastPrice: 7999, lowest: 7999, savedPrice: 9000, alertedPrice: 7999 };
  it('a rise that stays under the target does not buzz', () => assert.equal(shouldAlert(base, 8200), false));
  it('the same price again does not buzz', () => assert.equal(shouldAlert(base, 7999), false));
  it('coming back down to an already-alerted price does not buzz', () => assert.equal(shouldAlert({ ...base, lastPrice: 8200 }, 7999), false));
  it('a new lower price under the target buzzes', () => assert.equal(shouldAlert(base, 7499), true));
  it('a drop that is still above the target does not buzz', () => assert.equal(shouldAlert({ ...base, target: 7000, alertedPrice: null }, 7499), false));
  it('with no target, a new lowest buzzes', () => assert.equal(shouldAlert({ ...base, target: null, alertedPrice: null }, 7899), true));
  it('with no target, a drop that is not a new low does not buzz', () =>
    assert.equal(shouldAlert({ ...base, target: null, lastPrice: 9500, lowest: 7999, alertedPrice: null }, 8500), false));
  it('an alert that is off never buzzes', () => assert.equal(shouldAlert({ ...base, alert: false }, 5000), false));
  it('turning an alert on while already under target does not buzz without a drop', () =>
    assert.equal(shouldAlert({ ...base, target: 9000, alertedPrice: null }, 7999), false));
});

describe('pasted-link verdicts never overclaim', () => {
  const src = (over: Partial<LinkSource> = {}): LinkSource => ({
    store: 'flipkart',
    storeName: 'Flipkart',
    url: 'https://www.flipkart.com/apple-iphone-17-white-256-gb/p/itm1?pid=PASTED',
    title: 'apple iphone 17 256 gb',
    price: null,
    ...over,
  });

  it('exact listing found: its own price decides', () => {
    const g = retail(
      [offer('flipkart', 'Apple iPhone 17 (White, 256 GB)', 98900, 'Apple', 'https://www.flipkart.com/x/p/itm1?pid=PASTED'), offer('reliance', 'Apple iPhone 17 256 GB, Black', 82900)],
      'iphone 17 256 gb',
    );
    const v = judgeLink(src(), g);
    assert.equal(v.kind, 'cheaper');
    assert.equal(v.kind === 'cheaper' && v.saving, 16000);
  });

  it('exact listing missing: another colour from the same store does NOT stand in for its price', () => {
    const g = retail([offer('flipkart', 'Apple iPhone 17 (Black, 256 GB)', 98900, 'Apple'), offer('reliance', 'Apple iPhone 17 256 GB, Black', 82900)], 'iphone 17 256 gb');
    assert.equal(judgeLink(src(), g).kind, 'unknown');
  });

  it('exact listing missing and only a different model found: no verdict at all', () => {
    const g = retail([offer('reliance', 'Apple iPhone 17 Pro 256 GB', 134900)], 'iphone 17 256 gb');
    assert.equal(judgeLink(src({ price: 98900 }), g).kind, 'none');
  });

  it('a 512GB listing is never compared with a pasted 256GB link', () => {
    const g = retail([offer('reliance', 'Apple iPhone 17 512 GB, Black', 124900)], 'iphone 17');
    assert.equal(judgeLink(src({ price: 98900 }), g).kind, 'none');
  });

  it('already the cheapest', () => {
    const g = retail([offer('reliance', 'Apple iPhone 17 256 GB, Black', 99900)], 'iphone 17 256 gb');
    assert.equal(judgeLink(src({ price: 82900 }), g).kind, 'cheapest');
  });
});
