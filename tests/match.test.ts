import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { filterMatches, matchScore } from '@/lib/match';

// Real listing titles seen on the stores, and what a shopper expects.
const ok = (title: string, q: string, brand?: string) => assert.equal(matchScore({ title, brand }, q), 1, `"${title}" should match "${q}"`);
const no = (title: string, q: string, brand?: string) => assert.ok(matchScore({ title, brand }, q) < 1, `"${title}" should NOT match "${q}"`);

describe('knock-offs and accessories', () => {
  it('drops a clone sold under another brand', () => no('SAIBABA Airpods Pro 2 (2nd generation) with MagSafe Case', 'airpods pro 2', 'SAIBABA'));
  it('keeps the genuine Apple listing', () => ok('Apple AirPods Pro (2nd generation) with MagSafe Case (USB-C) Bluetooth', 'airpods pro 2', 'Apple'));
  it('drops a case', () => no('Case for Airpods Pro 2 Case Cover with Lanyard', 'airpods pro 2'));
  it('keeps a case when the shopper asks for one', () => ok('Case for Airpods Pro 2 Case Cover with Lanyard', 'airpods pro 2 case'));
  it('drops "compatible with" listings', () => no('Wireless Earbuds Compatible with AirPods Pro 2, Bluetooth 5.3', 'airpods pro 2'));
  it('drops a phone case named late in the title', () => no('Samsung Galaxy S25 Plus SG Mobile Case, Grey', 'samsung galaxy s25', 'Samsung'));
  it('drops a brandless clone that starts with the product line', () => no('airpods Bluetooth, Earbuds Pro + 3 in 1 data fast cable', 'airpods pro 3'));
  it('keeps a watch whose title mentions its case and band', () =>
    ok('Apple Watch Series 10 GPS 46mm Jet Black Aluminium Case with Black Sport Band', 'apple watch series 10', 'Apple'));
  it('keeps an Amazon phone whose brand came from the product line', () => ok('iPhone 16 128 GB: 5G Mobile Phone with Camera Control', 'iphone 16', 'apple'));
  it('drops a custom-painted shoe from another maker', () => no('DARK MOCHA DUNK LOW', 'nike dunk low', 'MDCUSTOMS'));
});

describe('model numbers', () => {
  it('"jordan 1" is not a Jordan 11', () => no('Air Jordan 11 Retro Legend Blue', 'jordan 1', 'Nike'));
  it('"new balance 550" is not a 530', () => no('New Balance 530 White Silver', 'new balance 550', 'New Balance'));
  it('"new balance 550" matches the 550', () => ok('New Balance 550 White Green', 'new balance 550', 'New Balance'));
});

describe('sneaker nicknames and shorthand', () => {
  it('panda means white/black', () => ok('Nike Dunk Low Retro White Black', 'panda dunk', 'Nike'));
  it('af1 means Air Force 1', () => ok("Nike Air Force 1 '07 White", 'af1', 'Nike'));
  it('aj4 means Air Jordan 4', () => ok('Air Jordan 4 Retro Bred Reimagined', 'aj4 bred reimagined', 'Jordan'));
  it('aj1 does not match a Jordan 4', () => no('Air Jordan 4 Retro Bred Reimagined', 'aj1', 'Jordan'));
});

describe('query hygiene', () => {
  it('ignores case and extra spaces', () => ok('Apple AirPods Pro 3', '  AIRPODS   pro 3 ', 'Apple'));
  it('ignores punctuation', () => ok('Apple iPhone 17 256 GB, Black', 'iphone-17!!', 'Apple'));
  it('falls back to close matches and says so', () => {
    const r = filterMatches([{ title: 'Apple AirPods Pro 3', brand: 'Apple' }], 'apple airpods pro 3 magsafe');
    assert.equal(r.kept.length, 1);
    assert.equal(r.loose, true);
  });
});
