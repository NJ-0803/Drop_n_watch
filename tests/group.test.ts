import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { byBestDeal, groupOffers } from '@/lib/group';
import type { Offer, StoreId } from '@/lib/types';

let n = 0;
const offer = (store: StoreId, title: string, price: number, inStock = true): Offer => ({
  store,
  storeName: store,
  title,
  price,
  inStock,
  url: `https://example.com/${store}/${n++}`,
});
const group = (offers: Offer[], q: string, retail = true) => groupOffers([...offers].sort(byBestDeal), q, { ignoreColours: retail });

describe('which product comes first', () => {
  it('"airpods" leads with plain AirPods, not Pro or Max', () => {
    const g = group(
      [
        offer('flipkart', 'Apple AirPods Pro 3 Bluetooth · White, True Wireless', 25499),
        offer('vijaysales', 'Apple AirPods Pro 3', 25900),
        offer('reliance', 'Apple AirPods 4 with Active Noise Cancellation', 17900),
        offer('reliance', 'Apple AirPods 4, Voice Isolation', 12900),
        offer('flipkart', 'Apple AirPods Max USB-C Midnight', 59900),
      ],
      'airpods',
    );
    assert.match(g[0].title, /AirPods 4/);
  });

  it('"iphone 17" leads with the base iPhone 17, not Pro or Pro Max', () => {
    const g = group(
      [
        offer('reliance', 'Apple iPhone 17 Pro 256 GB, Deep Blue', 134900),
        offer('vijaysales', 'Apple iPhone 17 Pro Max (256GB, Cosmic Orange)', 149900),
        offer('flipkart', 'Apple iPhone 17 (White, 256 GB)', 98900),
        offer('reliance', 'Apple iPhone 17 256 GB, Black', 82900),
        offer('vijaysales', 'Apple iPhone 17 Pro (256GB Storage, Cosmic Orange)', 129490),
      ],
      'iphone 17',
    );
    assert.equal(g[0].title.includes('Pro'), false, g[0].title);
    assert.equal(g[0].best?.price, 82900);
  });

  it('"iphone 17 pro" does not lead with Pro Max', () => {
    const g = group(
      [offer('vijaysales', 'Apple iPhone 17 Pro Max 256GB', 149900), offer('reliance', 'Apple iPhone 17 Pro 256 GB, Deep Blue', 134900)],
      'iphone 17 pro',
    );
    assert.doesNotMatch(g[0].title, /Max/);
  });

  it('puts in-stock products before sold-out ones', () => {
    const g = group([offer('reliance', 'Apple iPhone 16 128 GB Black', 60000, false), offer('flipkart', 'Apple iPhone 16 Plus 128 GB', 79900)], 'iphone 16');
    assert.ok(g[0].best);
  });
});

describe('same product across stores', () => {
  it('different storage sizes stay apart', () => {
    const g = group([offer('reliance', 'Apple iPhone 17 256 GB, Black', 82900), offer('flipkart', 'Apple iPhone 17 (Black, 512 GB)', 124900)], 'iphone 17');
    assert.equal(g.length, 2);
  });

  it('colours of the same phone merge on everyday search', () => {
    const g = group([offer('reliance', 'Apple iPhone 17 256 GB, Black', 82900), offer('flipkart', 'Apple iPhone 17 (White, 256 GB)', 98900)], 'iphone 17');
    assert.equal(g.length, 1);
    assert.equal(g[0].best?.store, 'reliance');
  });

  it('AirPods Pro 3 merges across three stores whatever order they arrive in', () => {
    const a = offer('flipkart', 'Apple AirPods Pro 3 Bluetooth · White, True Wireless', 25499);
    const b = offer('reliance', 'Apple Airpods Pro (3rd Gen) with MagSafe Charging Case, Active Noise Cancellation, USB Type-C Charging, White', 25900);
    const c = offer('vijaysales', 'Apple AirPods Pro 3', 25900);
    for (const order of [[a, b, c], [a, c, b], [b, a, c], [c, b, a]]) {
      const g = groupOffers(order, 'airpods pro 3', { ignoreColours: true });
      assert.equal(g.length, 1, order.map(o => o.store).join(','));
      assert.equal(g[0].offers.length, 3);
      assert.equal(g[0].best?.store, 'flipkart');
    }
  });

  it('the Panda Dunk groups across resellers; the Vintage Panda stays separate', () => {
    const g = group(
      [
        offer('crepdogcrew', 'Nike Dunk Low White Black (Panda)', 7999),
        offer('limitededt', "Dunk Low Retro 'WHITE/BLACK/WHITE'", 8295),
        offer('mainstreet', 'Nike Dunk Low Retro White Black Panda 2021', 9799),
        offer('crepdogcrew', 'Nike Dunk Low Vintage Panda (W)', 9999),
      ],
      'dunk low panda',
      false,
    );
    assert.equal(g[0].offers.length, 3);
    assert.equal(g[0].best?.price, 7999);
    assert.equal(g.length, 2);
  });

  it('a Jordan 1 and a Jordan 4 never merge', () => {
    const g = group([offer('crepdogcrew', 'Jordan 4 Retro Bred Reimagined', 23999), offer('dawntown', 'Jordan 1 Retro High Bred', 23999)], 'jordan bred', false);
    assert.equal(g.length, 2);
  });

  it('one row per store: a store listing a model twice shows only its cheaper one', () => {
    const g = group([offer('mainstreet', 'Nike Dunk Low Retro White Black Panda 2021', 9799), offer('mainstreet', 'Nike Dunk Low White Black Panda (2025)', 13299)], 'dunk low panda', false);
    assert.equal(g[0].offers.length, 1);
    assert.equal(g[0].offers[0].price, 9799);
  });
});
