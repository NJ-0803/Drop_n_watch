import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {effectivePrice,recordSample,type Watch,type Listing} from '@/lib/watch';
import {productUrl,fetchPrice} from '@/lib/provider';
export const dynamic='force-dynamic';
const amount=z.number().finite().min(0).max(10000000);
const listingInput=z.object({store:z.enum(['amazon','flipkart']),url:z.string().max(2000),coupon:amount,bank:amount,shipping:amount,offersUntil:z.union([z.string().datetime(),z.literal('')]),initialPrice:amount.optional()});
const watchInput=z.object({name:z.string().trim().min(1).max(120),variant:z.string().trim().min(1).max(180),target:amount.positive(),rule:z.enum(['target','low','both']),listings:z.array(listingInput).min(1).max(2)});
class InputError extends Error{constructor(message:string,public status=400){super(message)}}
function db(){if(!env.DB)throw new InputError('Your watchlist storage is temporarily unavailable.',503);return env.DB;}
function configuredKey(){return (env as unknown as {SCRAPINGDOG_API_KEY?:string}).SCRAPINGDOG_API_KEY||'';}
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function all(user:string):Promise<Watch[]>{const r=await db().prepare('SELECT document,revision FROM watches WHERE user_id = ? ORDER BY created_at DESC').bind(user).all<{document:string;revision:number}>();return r.results.map(r=>({...JSON.parse(r.document),revision:r.revision}));}
async function one(user:string,id:unknown){const r=await db().prepare('SELECT document,revision FROM watches WHERE user_id = ? AND id = ?').bind(user,String(id)).first<{document:string;revision:number}>();if(!r)throw new InputError('Product not found.',404);return {...JSON.parse(r.document),revision:r.revision} as Watch;}
async function save(user:string,w:Watch){const r=await db().prepare('UPDATE watches SET document = ?, revision = revision + 1 WHERE user_id = ? AND id = ? AND revision = ?').bind(JSON.stringify(w),user,w.id,w.revision).run();if(!r.meta.changes)throw new InputError('This product changed in another tab. Reload before editing.',409);}
function fail(e:unknown){if(e instanceof z.ZodError)return json({error:e.issues[0]?.message||'Check your product details.'},400);if(e instanceof InputError)return json({error:e.message},e.status);console.error('Watchlist operation failed');return json({error:'Could not save or load your watchlist. Your previous data is safe. Please try again.'},503);}
export async function GET(){try{const user=await getChatGPTUser();return json({watches:user?await all(user.userId):[],configured:!!configuredKey(),authenticated:!!user});}catch(e){return fail(e);}}
export async function POST(request:Request){
  try{
    const user=await getChatGPTUser();if(!user)throw new InputError('Sign in to save your private watchlist.',401);
    const origin=request.headers.get('origin');if(request.headers.get('sec-fetch-site')==='cross-site'||(origin&&origin!==new URL(request.url).origin))throw new InputError('Please submit changes from your watchlist.',403);
    const raw=await request.text();if(raw.length>24000)throw new InputError('Request is too large.',413);
    let b:any;try{b=JSON.parse(raw);}catch{throw new InputError('Invalid request.');}
    if(b.action==='create'||b.action==='edit'){
      const input=watchInput.parse(b.data),existing=b.action==='edit'?await one(user.userId,b.id):null;
      if(existing&&existing.revision!==b.revision)throw new InputError('This product changed. Reload before saving.',409);
      if(new Set(input.listings.map(l=>l.store)).size!==input.listings.length)throw new InputError('Use only one link per store for each product.');
      if(!existing&&(await all(user.userId)).length>=25)throw new InputError('This watchlist supports 25 products. Remove one before adding another.');
      let w:Watch={id:existing?.id||crypto.randomUUID(),name:input.name,variant:input.variant,target:input.target,rule:input.rule,paused:existing?.paused||false,createdAt:existing?.createdAt||new Date().toISOString(),revision:existing?.revision||0,listings:[],alerts:existing?.alerts||[]};
      const newPrices:{id:string;price:number}[]=[];
      for(const l of input.listings){
        let url:string;try{url=productUrl(l.url,l.store);}catch(e){throw new InputError((e as Error).message);}
        if((l.coupon||l.bank)&&(!l.offersUntil||Date.parse(l.offersUntil)<=Date.now()))throw new InputError('Coupon and bank discounts need a future expiry.');
        const old=existing?.listings.find(o=>o.store===l.store&&o.url===url);
        const listing:Listing={id:old?.id||crypto.randomUUID(),store:l.store,url,coupon:l.coupon,bank:l.bank,shipping:l.shipping,offersUntil:l.offersUntil,samples:old?.samples||[],lows:old?.lows,checkedAt:old?.checkedAt,error:old?.error};
        w.listings.push(listing);if(!old&&l.initialPrice)newPrices.push({id:listing.id,price:l.initialPrice});
      }
      for(const p of newPrices){const l=w.listings.find(l=>l.id===p.id)!;w=recordSample(w,p.id,{id:crypto.randomUUID(),time:new Date().toISOString(),price:p.price,effective:effectivePrice(p.price,l),source:'manual'});}
      if(existing)await save(user.userId,w);else await db().prepare('INSERT INTO watches (id,user_id,document,revision,created_at) VALUES (?,?,?,0,?)').bind(w.id,user.userId,JSON.stringify(w),w.createdAt).run();
    }else if(b.action==='remove'){
      const w=await one(user.userId,b.id);if(w.revision!==b.revision)throw new InputError('Product changed. Reload before removing.',409);
      const r=await db().prepare('DELETE FROM watches WHERE user_id = ? AND id = ? AND revision = ?').bind(user.userId,w.id,w.revision).run();if(!r.meta.changes)throw new InputError('Product changed. Reload before removing.',409);
    }else if(b.action==='pause'){
      const w=await one(user.userId,b.id);if(w.revision!==b.revision)throw new InputError('Product changed. Reload to continue.',409);
      w.paused=z.boolean().parse(b.paused);await save(user.userId,w);
    }else if(b.action==='record'){
      let w=await one(user.userId,b.id);if(w.revision!==b.revision)throw new InputError('Product changed. Reload to continue.',409);
      const l=w.listings.find(l=>l.id===b.listingId);if(!l)throw new InputError('Store not found.');
      const price=amount.positive().parse(b.price);w=recordSample(w,l.id,{id:crypto.randomUUID(),time:new Date().toISOString(),price,effective:effectivePrice(price,l),source:'manual'});await save(user.userId,w);
    }else if(b.action==='refresh'){
      const key=z.string().trim().max(256).parse(b.apiKey||configuredKey());if(key.length<10)throw new InputError('Connect your price provider first.');
      const watches=await all(user.userId);if(!watches.length)return json({watches,message:'Add a product link before checking prices.'});
      const now=Date.now();
      const claim=await db().prepare('INSERT INTO price_checks (user_id,attempted_at) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET attempted_at = excluded.attempted_at WHERE price_checks.attempted_at < ?').bind(user.userId,now,now-300000).run();
      if(!claim.meta.changes)return json({watches,message:'A check already ran in the last 5 minutes. Your last prices are shown.'});
      let success=0,failed=0,index=0;
      const worker=async()=>{while(index<watches.length){let w=watches[index++];for(const l of w.listings){try{const result=await fetchPrice(l,key);w=recordSample(w,l.id,{id:crypto.randomUUID(),time:new Date().toISOString(),price:result.price,effective:effectivePrice(result.price,l),title:result.title,source:'live'});success++;}catch(e){const target=w.listings.find(i=>i.id===l.id)!;target.error=(e as Error).message;failed++;}}try{await save(user.userId,w);}catch{failed++;}}};
      await Promise.all(Array.from({length:Math.min(3,watches.length)},worker));
      return json({watches:await all(user.userId),message:`${success} ${success===1?'price':'prices'} received${failed?`; ${failed} checks need attention. See product details.`:'.'}`});
    }else throw new InputError('Unknown action.');
    return json({watches:await all(user.userId)});
  }catch(e){return fail(e);}
}
