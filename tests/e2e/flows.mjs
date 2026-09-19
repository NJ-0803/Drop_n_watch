// Browser checks for the main journeys. Run: npm run test:e2e [base-url]. Needs Google Chrome installed.
import puppeteer from 'puppeteer-core';
const BASE = process.argv[2] ?? 'http://localhost:3000';
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1300, height: 1000 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => m.type() === 'error' && errors.push(m.text()));
const wait = ms => new Promise(r => setTimeout(r, ms));
const text = () => page.evaluate(() => document.body.innerText);
let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) pass++; else fail++; console.log(cond ? 'PASS' : 'FAIL', name); };

// fresh browser: no saved size
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.type('input[placeholder*="paste"]', 'https://www.myntra.com/casual-shoes/nike/nike-men-dunk-low-retro-sneakers/30223845/buy');
await page.keyboard.press('Enter');
await page.waitForFunction(() => location.pathname === '/sneakers', { timeout: 15000 }).catch(() => {});
await wait(2000);
check('home: Myntra shoe link goes to the sneaker page', page.url().includes('/sneakers') && page.url().includes('q=nike+dunk+low'));
check('sneakers: asks for a size and names the shoe', /Pick your size to see prices for “nike dunk low”/i.test(await text()));
const box = await page.$eval('input[placeholder*="sneaker"]', el => el.value).catch(() => '');
check('sneakers: waiting search shown in the box', box.toLowerCase() === 'nike dunk low');
// pick UK 9
const nine = await page.$$('button[role="radio"]').then(async bs => { for (const b of bs) if ((await b.evaluate(e => e.innerText.trim())) === '9') return b; });
await nine.click();
await page.waitForFunction(() => /lowest price in uk 9/i.test(document.body.innerText) || /nothing matched/i.test(document.body.innerText), { timeout: 40000 }).catch(() => {});
check('sneakers: picking a size runs the waiting search', /lowest price in uk 9/i.test(await text()));

// a reseller link pasted on the sneaker page (size remembered now)
await page.goto(BASE + '/sneakers', { waitUntil: 'networkidle0' });
await page.type('input[placeholder*="sneaker"]', 'crepdogcrew.com/products/nike-dunk-low-white-black-2021?variant=4455');
await page.keyboard.press('Enter');
await page.waitForFunction(() => /lowest price in uk 9/i.test(document.body.innerText), { timeout: 40000 }).catch(() => {});
check('sneakers: reseller link without https works', /lowest price in uk 9/i.test(await text()));
check('sneakers: address bar is shareable', page.url().includes('size=9'));

// share text with a link on the home page
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
await page.type('input[placeholder*="paste"]', 'Check this out! https://www.reliancedigital.in/product/apple-iphone-17-256-gb-black-mff8ru-9391619');
await page.keyboard.press('Enter');
await page.waitForFunction(() => /your reliance digital link/i.test(document.body.innerText), { timeout: 40000 }).catch(() => {});
check('home: share text with a Reliance link gives a verdict card', /your reliance digital link/i.test(await text()));

// plain searches
for (const [q, expect, reject] of [['airpods', /airpods/i, /pro|max/i], ['iphone 17', /iphone 17/i, /iphone 17 pro/i]]) {
  await page.goto(BASE + '/?q=' + encodeURIComponent(q), { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => /lowest price found/i.test(document.body.innerText) || /nothing matched/i.test(document.body.innerText), { timeout: 40000 }).catch(() => {});
  const heroTitle = await page.$eval('article h3', el => el.innerText).catch(() => '');
  check(`home: "${q}" leads with "${heroTitle}"`, expect.test(heroTitle) && !(reject && reject.test(heroTitle)));
}

// junk and short input
await page.goto(BASE + '/?q=' + encodeURIComponent('qwxzkjh zzqq'), { waitUntil: 'networkidle0' });
await page.waitForFunction(() => /nothing matched/i.test(document.body.innerText), { timeout: 40000 }).catch(() => {});
check('home: nonsense search shows the empty state', /nothing matched/i.test(await text()));

// theme persists
await page.click('[aria-label="Daylight"]');
await page.reload({ waitUntil: 'networkidle0' });
check('theme: Daylight survives a reload', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'daylight');

console.log(`\n${pass} passed, ${fail} failed`, errors.length ? errors : '');
process.exitCode = fail ? 1 : 0;
await browser.close();
