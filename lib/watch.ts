export function newId(): string {
  if(typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export type Store = 'amazon' | 'flipkart';
export type Sample = { id: string; time: string; price: number; effective: number; source: 'manual' | 'live' | 'demo'; title?: string };
export type Listing = { id: string; store: Store; url: string; coupon: number; bank: number; shipping: number; offersUntil: string; samples: Sample[]; lows?: Partial<Record<Sample['source'],number>>; error?: string; checkedAt?: string };
export type PriceAlert = { id: string; watchId: string; name: string; store: Store; price: number; kind: 'target' | 'low'; time: string; source: Sample['source'] };
export type Watch = { id: string; name: string; variant: string; target: number; rule: 'target' | 'low' | 'both'; paused: boolean; createdAt: string; listings: Listing[]; alerts: PriceAlert[]; revision: number };
export const money = (n: number | undefined | null) => n == null ? '—' : new Intl.NumberFormat('en-IN', {style: 'currency', currency: 'INR', maximumFractionDigits: 0}).format(n);
export const storeName = (s: Store) => s === 'amazon' ? 'Amazon' : 'Flipkart';
export const latest = (l: Listing) => l.samples.at(-1);
export function effectivePrice(price: number, l: Pick<Listing, 'coupon'|'bank'|'shipping'|'offersUntil'>, now = Date.now()) {
  const active = !!l.offersUntil && Date.parse(l.offersUntil) > now;
  return Math.round((Math.max(0, price - (active ? l.coupon + l.bank : 0)) + l.shipping) * 100) / 100;
}
export function bestListing(w: Watch) {
  return w.listings.filter(l => latest(l)).sort((a,b) => effectivePrice(latest(a)!.price,a) - effectivePrice(latest(b)!.price,b))[0];
}
export function recordSample(w: Watch, listingId: string, sample: Sample): Watch {
  const next = structuredClone(w), listing = next.listings.find(l => l.id === listingId)!;
  const previousPrices = w.listings.map(l => l.samples.filter(s => s.source === sample.source).at(-1)?.effective).filter((n): n is number => n !== undefined);
  const previousBest = Math.min(...previousPrices);
  const priorLow = Math.min(...w.listings.map(l => l.lows?.[sample.source] ?? Math.min(...l.samples.filter(s => s.source === sample.source).map(s => s.effective))));
  const isLow = Number.isFinite(priorLow) && sample.effective < priorLow;
  const crossed = sample.effective <= w.target && previousBest > w.target;
  const listingLow=listing.lows?.[sample.source] ?? Math.min(...listing.samples.filter(s=>s.source===sample.source).map(s=>s.effective));
  listing.lows={...listing.lows,[sample.source]:Math.min(listingLow,sample.effective)};
  listing.samples = [...listing.samples, sample].slice(-500);
  listing.checkedAt = sample.time; delete listing.error;
  if (!w.paused && ((crossed && w.rule !== 'low') || (isLow && w.rule !== 'target'))) {
    next.alerts.unshift({id: newId(),watchId:w.id,name:w.name,store:listing.store,price:sample.effective,kind:crossed && w.rule !== 'low'?'target':'low',time:sample.time,source:sample.source});
    next.alerts = next.alerts.slice(0,50);
  }
  return next;
}
export function makeDemo(): Watch[] {
  const now = Date.now();
  return [
    {name:'Nike Pegasus 41',variant:'Men · UK 9 · Black / White',target:7000,prices:[[11895,10995,10995,9995,10495,8995,8495],[11495,10995,9995,9495,8995,8295,7995]]},
    {name:'AirPods Pro 2',variant:'USB-C · White · 2nd generation',target:17000,prices:[[24900,22900,21900,20900,19900,18900,17900],[23900,22900,22499,20999,19499,18999,18499]]},
  ].map((d,i) => ({id:`demo-${i}`,name:d.name,variant:d.variant,target:d.target,rule:'both',paused:false,createdAt:new Date(now-6*86400000).toISOString(),revision:0,alerts:[],listings:d.prices.map((p,j)=>({id:`demo-${i}-${j}`,store:j?'flipkart':'amazon',url:'',coupon:0,bank:j===0&&i===1?1000:0,shipping:0,offersUntil:new Date(now+86400000).toISOString(),samples:p.map((price,k)=>({id:`s-${i}-${j}-${k}`,time:new Date(now-(6-k)*86400000).toISOString(),price,effective:price-(j===0&&i===1?1000:0),source:'demo'}))}))}));
}
