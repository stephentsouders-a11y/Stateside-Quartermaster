import { chromium } from 'playwright';
import fs from 'fs';
const [idx,name,route,type='collection']=process.argv.slice(2);
const BASE='https://www.statesideqm.com', THEME='158561894555';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const out={idx:Number(idx),name,route,type,status:null,outcome:'FAIL',reasons:[],desktop:{},mobile:{},bad429:[],bad5xx:[]};
const browser=await chromium.launch({headless:true});
const ctx=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await ctx.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(60000);
const bad429=[],bad5xx=[];page.on('response',r=>{if(r.status()===429)bad429.push(r.url());if(r.status()>=500)bad5xx.push(`${r.status()} ${r.url()}`)});
const visible=el=>el&&el.isVisible().catch(()=>false);
async function cardCount(){return page.locator('#MainContent .sq-refine-taxonomy-products__grid .sq-refine-taxonomy-product').count()}
async function waitCards(n){await page.waitForFunction(expected=>document.querySelectorAll('#MainContent .sq-refine-taxonomy-products__grid .sq-refine-taxonomy-product').length===expected,n,{timeout:12000}).catch(()=>{})}
async function prime(){await sleep(1200);const u=new URL('/',BASE);u.searchParams.set('preview_theme_id',THEME);return page.goto(u.toString(),{waitUntil:'domcontentloaded'})}
try{
 const pr=await prime();await sleep(500);bad429.length=0;bad5xx.length=0;
 if(!pr||pr.status()===429||pr.status()>=500)throw new Error('preview infrastructure '+(pr?.status()||'no response'));
 const r=await page.goto(new URL(route,BASE).toString(),{waitUntil:'domcontentloaded'});out.status=r?.status()??null;
 if(out.status===429||out.status>=500)throw new Error('navigation infrastructure '+out.status);
 if(type==='page'){
   await sleep(600);out.desktop=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+4,taxonomyMarker:document.querySelectorAll('script[data-sq-refine-taxonomy-panel-v1]').length,title:(document.querySelector('h1')?.textContent||'').trim()}));
   if(out.status!==200)out.reasons.push('HTTP '+out.status);if(out.desktop.overflow)out.reasons.push('horizontal overflow');if(out.desktop.taxonomyMarker!==0)out.reasons.push('unexpected taxonomy on inquiry page');
 }else{
   await page.locator('#MainContent .sq-global-refine-sidebar').first().waitFor({state:'visible',timeout:15000}).catch(()=>{});
   await page.locator('#MainContent .sq-refine-taxonomy-products').first().waitFor({state:'attached',timeout:20000}).catch(()=>{});
   await page.locator('#MainContent .sq-refine-page-size input[value="50"]').first().waitFor({state:'attached',timeout:5000}).catch(()=>{});
   out.desktop=await page.evaluate(()=>{const m=document.getElementById('MainContent'),s=m?.querySelector('.sq-global-refine-sidebar'),st=s?getComputedStyle(s):null,r=s?.getBoundingClientRect(),top=m?.querySelector('.sq-refine-taxonomy-products__top strong')?.textContent||'',groups=[...m?.querySelectorAll('.sq-refine-taxonomy__group>summary')||[]].map(x=>(x.textContent||'').trim());return{taxonomyMarker:document.querySelectorAll('script[data-sq-refine-taxonomy-panel-v1]').length,tallMarker:document.querySelectorAll('style[data-sq-refine-tall-sidebar]').length,sidebarCount:m?[...m.querySelectorAll('.sq-global-refine-sidebar')].filter(x=>{const z=getComputedStyle(x),q=x.getBoundingClientRect();return z.display!=='none'&&z.visibility!=='hidden'&&q.width>2&&q.height>2}).length:0,sidebarHeight:r?.height||0,sidebarPosition:st?.position||'',sidebarOverflowY:st?.overflowY||'',overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+4,broken:m?[...m.querySelectorAll('img')].filter(i=>i.complete&&i.naturalWidth===0).length:0,pageSizes:[...m?.querySelectorAll('.sq-refine-page-size input')||[]].map(i=>Number(i.value)),defaultSize:Number(m?.querySelector('.sq-refine-page-size input:checked')?.value||0),total:Number((top.match(/\d+/)||['0'])[0]),groups:groups.filter(g=>g!=='Products Per Page'),taxonomyChoices:m?.querySelectorAll('.sq-refine-taxonomy input[type="checkbox"]').length||0,legacyVisible:[...m?.querySelectorAll('a[href*="/collections/"]')||[]].filter(a=>{if(a.closest('.sq-global-refine-sidebar'))return false;if(a.closest('.sq-refine-taxonomy-products'))return false;const cls=String(a.className||'')+' '+String(a.parentElement?.className||'');if(!/(sq-|vac-|subcategory|third-level|button-tree|branch|category|program|folder|type-grid|match-grid|navigation)/i.test(cls))return false;const z=getComputedStyle(a),q=a.getBoundingClientRect();return z.display!=='none'&&z.visibility!=='hidden'&&q.width>2&&q.height>2}).length};});
   const d=out.desktop;
   d.count50=await cardCount();
   const expect50=Math.min(d.total,50);if(d.count50!==expect50)out.reasons.push(`50 page count ${d.count50}/${expect50}`);
   await page.locator('.sq-refine-page-size input[value="100"]').check();await waitCards(Math.min(d.total,100));d.count100=await cardCount();if(d.count100!==Math.min(d.total,100))out.reasons.push(`100 page count ${d.count100}/${Math.min(d.total,100)}`);
   await page.locator('.sq-refine-page-size input[value="250"]').check();await waitCards(Math.min(d.total,250));d.count250=await cardCount();if(d.count250!==Math.min(d.total,250))out.reasons.push(`250 page count ${d.count250}/${Math.min(d.total,250)}`);
   const first=page.locator('.sq-refine-taxonomy input[type="checkbox"]').first();
   if(await first.count()){
     d.testChoice=await first.evaluate(i=>({value:i.value,group:i.dataset.group,label:(i.closest('label')?.textContent||'').trim()}));
     const child=d.testChoice.value;let authoritative=[];
     if(!/^shop by (author|publisher|war|topic|branch)/i.test(d.testChoice.group)&&child){const rr=await ctx.request.get(`${BASE}/collections/${encodeURIComponent(child)}/products.json?limit=250&page=1`).catch(()=>null);if(rr?.ok()){const jj=await rr.json().catch(()=>null);authoritative=(jj?.products||[]).map(p=>p.handle)}}
     await first.check();await sleep(700);d.filteredCount=await cardCount();d.filteredHandles=await page.locator('.sq-refine-taxonomy-product').evaluateAll(xs=>xs.slice(0,12).map(a=>new URL(a.href).pathname.split('/products/')[1]?.split(/[?#]/)[0]).filter(Boolean));
     if(authoritative.length&&d.filteredHandles.some(h=>!authoritative.includes(h)))out.reasons.push('taxonomy checkbox returned product outside selected child collection');
     if(d.total>0&&d.filteredCount===0)out.reasons.push('taxonomy checkbox returned zero products');
     await first.uncheck().catch(()=>{});
   }
   if(out.status!==200)out.reasons.push('HTTP '+out.status);if(d.taxonomyMarker!==1)out.reasons.push('taxonomy marker '+d.taxonomyMarker);if(d.tallMarker!==1)out.reasons.push('tall sidebar marker '+d.tallMarker);if(d.sidebarCount!==1)out.reasons.push('sidebar '+d.sidebarCount);if(d.sidebarHeight<700)out.reasons.push('sidebar not tall '+Math.round(d.sidebarHeight));if(d.sidebarPosition!=='sticky')out.reasons.push('sidebar not sticky');if(!/(auto|scroll)/.test(d.sidebarOverflowY))out.reasons.push('sidebar not independently scrollable');if(d.overflow)out.reasons.push('horizontal overflow');if(d.broken)out.reasons.push(d.broken+' broken images');if(JSON.stringify(d.pageSizes)!=='[50,100,250]')out.reasons.push('page size options '+JSON.stringify(d.pageSizes));if(d.defaultSize!==50)out.reasons.push('default page size '+d.defaultSize);if(!d.total)out.reasons.push('zero root products');if(!d.groups.length)out.reasons.push('no taxonomy groups');if(!d.taxonomyChoices)out.reasons.push('no taxonomy checkboxes');if(d.legacyVisible)out.reasons.push('legacy navigation still visible '+d.legacyVisible);
   await page.setViewportSize({width:390,height:844});await sleep(300);out.mobile=await page.evaluate(()=>{const s=document.querySelector('#MainContent .sq-global-refine-sidebar'),st=s?getComputedStyle(s):null;return{position:st?.position||'',height:st?.height||'',maxHeight:st?.maxHeight||'',overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+3}});if(out.mobile.position!=='static')out.reasons.push('mobile sidebar position '+out.mobile.position);if(out.mobile.overflow)out.reasons.push('mobile horizontal overflow');
 }
 out.bad429=[...new Set(bad429)];out.bad5xx=[...new Set(bad5xx)];if(out.bad429.length||out.bad5xx.length){out.outcome='INFRA';out.reasons.push(`${out.bad429.length} HTTP 429; ${out.bad5xx.length} HTTP 5xx`)}else out.outcome=out.reasons.length?'FAIL':'PASS';
}catch(err){out.reasons.push(String(err?.message||err));out.bad429=[...new Set(bad429)];out.bad5xx=[...new Set(bad5xx)];out.outcome=(out.bad429.length||out.bad5xx.length||/infrastructure/.test(out.reasons.join(' ')))?'INFRA':'FAIL'}
fs.mkdirSync('taxonomy-cert',{recursive:true});fs.writeFileSync(`taxonomy-cert/${String(idx).padStart(2,'0')}.json`,JSON.stringify(out,null,2));console.log(`PROGRESS ${idx}/42 ${name}: ${out.outcome}`);console.log(JSON.stringify(out,null,2));await browser.close();process.exit(out.outcome==='PASS'?0:(out.outcome==='INFRA'?2:1));