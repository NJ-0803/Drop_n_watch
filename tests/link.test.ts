import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { describeLink, extractUrl, looksLikeLink } from '@/lib/linkParse';

describe('spotting a link in what was typed', () => {
  it('a product name is not a link', () => assert.equal(looksLikeLink('airpods pro 3'), false));
  it('a model with a decimal is not a link', () => assert.equal(looksLikeLink('iphone 17.5 pro'), false));
  it('a full address is a link', () => assert.equal(looksLikeLink('https://www.amazon.in/dp/B0FQFYXCC4'), true));
  it('an address without https is a link', () => assert.equal(looksLikeLink('crepdogcrew.com/products/nike-dunk-low'), true));
  it('share text with a link inside is a link', () => {
    const text = 'Check out Nike Dunk Low Retro on Amazon! https://amzn.in/d/0bmSvNzK';
    assert.equal(looksLikeLink(text), true);
    assert.equal(extractUrl(text), 'https://amzn.in/d/0bmSvNzK');
  });
  it('trailing punctuation is not part of the link', () => assert.equal(extractUrl('see https://www.flipkart.com/x/p/itm1?pid=AB12). '), 'https://www.flipkart.com/x/p/itm1?pid=AB12'));
});

describe('what a link points to', () => {
  const d = (u: string) => describeLink(u);

  it('Amazon phone link → everyday search for the model', () => {
    const r = d('https://www.amazon.in/Apple-iPhone-17-256-GB/dp/B0FQFYXCC4/ref=sr_1_1?crid=x');
    assert.equal(r.store, 'amazon');
    assert.equal(r.mode, 'retail');
    assert.equal(r.query, 'Apple iPhone 17 256 GB');
  });

  it('Amazon shoe link → sneaker search', () => {
    const r = d('https://www.amazon.in/Nike-Mens-Dunk-Retro-Sneaker/dp/B0ABCDEFGH');
    assert.equal(r.mode, 'sneakers');
    assert.equal(r.query.toLowerCase(), 'nike dunk');
  });

  it('Flipkart link drops the colour from the search', () => {
    const r = d('https://www.flipkart.com/apple-iphone-17-white-256-gb/p/itm68ad8410784c7?pid=MOBHQV9YAZYYW');
    assert.equal(r.query.toLowerCase(), 'apple iphone 17 256 gb');
  });

  it('Flipkart shoe link → sneaker search without "for men"', () => {
    const r = d('https://www.flipkart.com/nike-dunk-low-retro-sneakers-for-men/p/itm1234?pid=SHOABC');
    assert.equal(r.mode, 'sneakers');
    assert.equal(r.query.toLowerCase(), 'nike dunk low');
  });

  it('Myntra shoe link (a store that blocks servers) is still understood from its address', () => {
    const r = d('https://www.myntra.com/casual-shoes/nike/nike-men-dunk-low-retro-sneakers/30223845/buy');
    assert.equal(r.store, 'myntra');
    assert.equal(r.mode, 'sneakers');
    assert.equal(r.query.toLowerCase(), 'nike dunk low');
  });

  it('a Nike.com link (not a store we compare) is still understood from its address', () => {
    const r = d('https://www.nike.com/in/t/dunk-low-retro-shoes-7Q8bDl/DD1391-100');
    assert.equal(r.mode, 'sneakers');
    assert.equal(r.query.toLowerCase(), 'dunk low');
  });

  it('a reseller link without https keeps the colourway', () => {
    const r = d('crepdogcrew.com/products/nike-dunk-low-white-black-2021?variant=4455');
    assert.equal(r.store, 'crepdogcrew');
    assert.equal(r.mode, 'sneakers');
    assert.equal(r.query.toLowerCase(), 'nike dunk low white black');
  });

  it('Reliance link drops its item code', () => {
    const r = d('https://www.reliancedigital.in/product/apple-iphone-17-256-gb-black-mff8ru-9391619');
    assert.equal(r.query.toLowerCase(), 'apple iphone 17 256 gb');
  });

  it('Vijay Sales link', () => assert.equal(d('https://www.vijaysales.com/p/245237/apple-airpods-pro-3').query.toLowerCase(), 'apple airpods pro 3'));
  it('mobile subdomain', () => assert.equal(d('https://m.snapdeal.com/product/boat-airdopes-141/6620').store, 'snapdeal'));

  it('an address with no product name is refused with a helpful message', () => {
    assert.throws(() => d('https://www.google.com/'), /couldn’t tell which product/);
  });
  it('nonsense is refused', () => assert.throws(() => d('https://'), /doesn’t look like a link/));
  it('only web links are accepted', () => assert.throws(() => d('javascript:alert(1)'), /doesn’t look like a link/));
});
