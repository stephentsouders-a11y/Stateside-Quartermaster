import { chromium } from 'playwright';import fs from 'fs';import path from 'path';
const BASE='https://www.statesideqm.com',THEME='158900125851',OUT='sep18-custom-unit-home-card-verify';fs.mkdirSync(path.join(OUT,'screenshots'),{recursive:true});
const expected=[
['All Custom Products','/collections/custom-personalized-products'],
['Custom Patches','/collections/custom-patches'],
['Custom Apparel','/collections/custom-apparel'],
['Personalized Displays & Memorials','/collections/personalized-displays-memorials'],
['Nameplates, Tags & Uniform ID','/collections/custom-nameplates-tags-uniform-id'],
['Custom Flags & Guidons','/collections/custom-flags-guidons'],
['Special-Order Gear','/collections/special-order-personalized-gear']
];
async function run(viewport,name){
 const b=await chromium.launch({headless:true});const c=await b.newContext({viewport});const p=await c.newPage();p.setDefaultNavigationTimeout(70000);
 const u=new URL('/pages/custom-unit-gear',BASE);u.searchParams.set('preview_theme_id',THEME);
 let resp=null,error=null;try{resp=await p.goto(u.href,{waitUntil:'domcontentloaded',timeout:70000});await p.waitForLoadState('load',{timeout:16000}).catch(()=>{});await p.waitForTimeout(1400)}catch(e){error=String(e?.message||e)}
 const row=await p.evaluate(({expected,themeId})=>{
   const cards=[...document.querySelectorAll('.custom-unit-gear-page a.custom-unit-card')];
   const info=cards.map(a=>{const r=a.getBoundingClientRect(),img=a.querySelector('img'),count=a.querySelector('.sq-custom-home-card__count');return{
     title:(a.querySelector('.sq-custom-home-card__title')?.textContent||a.querySelector('strong')?.textContent||'').trim(),
     path:new URL(a.href,location.origin).pathname,
     enhanced:a.classList.contains('sq-custom-home-card'),
     count:(count?.textContent||'').trim(),
     hasImage:!!img,
     width:Math.round(r.width),height:Math.round(r.height),
     background:getComputedStyle(a.querySelector('.sq-custom-home-card__copy')||a).backgroundColor
   }});
   const form=!!document.querySelector('#custom_unit_contact_form');
   const programs=[...document.querySelectorAll('.custom-unit-gear-page h2')].some(x=>/Custom unit and organization programs/i.test(x.textContent||''));
   return{
     theme:{id:String(window.Shopify?.theme?.id||''),name:String(window.Shopify?.theme?.name||'')},
     previewOk:String(window.Shopify?.theme?.id||'')===themeId,
     cards:info,
     count:info.length,
     allEnhanced:info.length===expected.length&&info.every(x=>x.enhanced),
     linksOk:expected.every(([t,p])=>info.some(x=>x.title===t&&x.path===p)),
     countsOk:info.every(x=>/\d+ items?$/.test(x.count)),
     imagesOk:info.every(x=>x.hasImage),
     form,programs,
     brokenImages:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).length,
     h1:(document.querySelector('h1')?.textContent||'').trim()
   }
 },{expected,themeId:THEME});
 row.http=resp?.status()??null;row.error=error;row.viewport=viewport;
 await p.screenshot({path:path.join(OUT,'screenshots',name+'.png'),fullPage:true});
 console.log('CUSTOMVERIFY',JSON.stringify(row));await c.close();await b.close();return row;
}
const desktop=await run({width:1440,height:1100},'desktop');
const mobile=await run({width:390,height:844},'mobile');
fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({desktop,mobile},null,2));
if([desktop,mobile].some(r=>r.http!==200||!r.previewOk||!r.allEnhanced||!r.linksOk||!r.countsOk||!r.imagesOk||!r.form||!r.programs||r.brokenImages||r.error))process.exitCode=2;