import {type Listing,type Store} from './watch';
export function productUrl(raw:string,store:Store):string {
  let u:URL;try{u=new URL(raw);}catch{throw new Error('Paste a valid, full product URL.');}
  const allowed=store==='amazon'?['amazon.in','www.amazon.in']:['flipkart.com','www.flipkart.com'];
  if(u.protocol!=='https:'||!allowed.includes(u.hostname)||u.username||u.password||u.port)throw new Error(`Use an https ${store==='amazon'?'Amazon India':'Flipkart'} product link.`);
  if(store==='amazon'){
    const asin=u.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i)?.[1];
    if(!asin)throw new Error('Use an Amazon link containing /dp/ and the selected variant’s ASIN.');
    return `https://www.amazon.in/dp/${asin.toUpperCase()}`;
  }
  if(!/\/p\/[a-zA-Z0-9]+/.test(u.pathname))throw new Error('Use a Flipkart product page link containing /p/.');
  const pid=u.searchParams.get('pid');
  if(!pid||!/^[A-Z0-9]{8,30}$/i.test(pid))throw new Error('Select the variant on Flipkart and copy the full link including ?pid=.');
  return `https://www.flipkart.com${u.pathname}?pid=${encodeURIComponent(pid)}`;
}
export function parseRupees(raw:unknown):number {
  if(typeof raw!=='string'||!/(₹|INR|Rs\.?)/i.test(raw))throw new Error('The provider did not return an INR price.');
  const found=raw.match(/(?:₹|INR|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i);
  const price=found?Number(found[1].replaceAll(',','')):NaN;
  if(!Number.isFinite(price)||price<=0||price>10000000)throw new Error('A valid product price was not returned.');
  return price;
}
// Documented schemas: scrapingdog.com/documentation/amazon-product-scraper/
// and scrapingdog.com/documentation/flipkart-product-api/ (checked September 2026).
export async function fetchPrice(l:Listing,key:string):Promise<{price:number;title:string}> {
  const url=productUrl(l.url,l.store),endpoint=new URL(`https://api.scrapingdog.com/${l.store}/product`);
  endpoint.searchParams.set('api_key',key);
  const asin=l.store==='amazon'?new URL(url).pathname.split('/').at(-1)!:'';
  if(l.store==='amazon'){endpoint.searchParams.set('asin',asin);endpoint.searchParams.set('domain','in');endpoint.searchParams.set('country','in');}
  else endpoint.searchParams.set('url',url);
  let r:Response;
  try{r=await fetch(endpoint,{signal:AbortSignal.timeout(45000),redirect:'error',headers:{Accept:'application/json'}});}catch{throw new Error('The price provider timed out or could not be reached. Try again later.');}
  if(!r.ok)throw new Error([401,403].includes(r.status)?'The provider rejected the key or account access.':r.status===429?'Provider limit reached. Check credits or try again later.':`Price provider unavailable (${r.status}). Previous prices are retained.`);
  let raw:any;try{raw=await r.json();}catch{throw new Error('The provider returned an unreadable response.');}
  const p=l.store==='flipkart'?raw.product_results:(Array.isArray(raw)?raw[0]:raw);
  if(!p||typeof p.title!=='string'||!p.title.trim())throw new Error('No product data was returned for this link.');
  if(l.store==='amazon'){
    const actual=p.asin||p.product_information?.ASIN;
    if(!actual||String(actual).toUpperCase()!==asin)throw new Error('Could not verify the selected Amazon variant. No price recorded.');
  }
  const available=String(p.availability_status||p.availability||'');
  if(/out of stock|unavailable|sold out/i.test(available))throw new Error('Product unavailable. No new price recorded.');
  return {price:parseRupees(p.price),title:p.title.slice(0,350)};
}
