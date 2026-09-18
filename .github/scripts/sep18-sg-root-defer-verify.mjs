import { chromium } from 'playwright';import fs from 'fs';import path from 'path';
const BASE='https://www.statesideqm.com',THEME='158900125851',OUT='sep18-sg-root-defer-verify';fs.mkdirSync(path.join(OUT,'shots'),{recursive:true});
const cases=[
 {key:'ohio-root',label:'Ohio Root',url:'/collections/state-guard-series-ohio'},
 {key:'sc-root',label:'South Carolina Root',url:'/collections/state-guard-series-south-carolina'},
 {key:'ohio-tactical',label:'Ohio Tactical',url:'/collections/state-guard-series-ohio?sg_category=tactical'},
 {key:'ohio-uniforms',label:'Ohio Uniforms',url:'/collections/state-guard-series-ohio?sg_category=uniforms'}
];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await chromium.launch({headless:true});
const rows=[];
for(const tc of cases){
 const ctx=await browser.newContext({viewport:{width:1440,height:1000}});
 await ctx.addInitScript(()=>{window.__sqLcp=0;try{new PerformanceObserver(l=>{for(const e of l.getEntries())window.__sqLcp=Math.max(window.__sqLcp,e.startTime||0)}).observe({type:'largest-contentful-paint',buffered:true})}catch{}});
 const p=await ctx.newPage();p.setDefaultNavigationTimeout(70000);
 const req=[];p.on('request',r=>{if(r.resourceType()==='fetch'||r.resourceType()==='xhr')req.push(r.url())});
 const u=new URL(tc.url,BASE);u.searchParams.set('preview_theme_id',THEME);
 let resp=null,err=null;try{resp=await p.goto(u.href,{waitUntil:'domcontentloaded',timeout:70000});await p.waitForLoadState('load',{timeout:16000}).catch(()=>{});await sleep(1600)}catch(e){err=String(e?.message||e)}
 const row=await p.evaluate(({tc,req,themeId})=>{const n=performance.getEntriesByType('navigation')[0],rs=performance.getEntriesByType('resource'),f=performance.getEntriesByName('first-contentful-paint')[0];const cards=[...document.querySelectorAll('.sqsg-card')].map(a=>({label:(a.querySelector('strong')?.textContent||'').trim(),href:a.getAttribute('href')||'',meta:(a.querySelector('small')?.textContent||'').trim()}));return{key:tc.key,label:tc.label,theme:{id:String(window.Shopify?.theme?.id||''),name:String(window.Shopify?.theme?.name||'')},ttfbMs:Math.round(n?.responseStart||0),dclMs:Math.round(n?.domContentLoadedEventEnd||0),loadMs:Math.round(n?.loadEventEnd||0),fcpMs:Math.round(f?.startTime||0),lcpMs:Math.round(window.__sqLcp||0),resources:rs.length,transferBytes:rs.reduce((s,r)=>s+(r.transferSize||0),0),fetchCount:req.length,productJsonFetches:req.filter(u=>u.includes('/products.json')).length,armyInsigniaFetches:req.filter(u=>u.includes('army-insignia-ranks-awards')).length,tacticalSourceFetches:req.filter(u=>/tactical-packs-bags|pouches-load-carriage|armor-plates-plate-carriers|plate-carriers-tactical-vests|helmets-accessories|ballistic-helmets-head-protection|water-hydration|first-aid-medical-ifak/.test(u)).length,cards,stateGuardView:!!document.querySelector('[data-sqsg-view]'),authority:document.querySelector('[data-sqsg-view]')?.dataset||{},h1:(document.querySelector('h1')?.textContent||'').replace(/\s+/g,' ').trim(),previewOk:String(window.Shopify?.theme?.id||'')===themeId}}, {tc,req,themeId:THEME});
 row.http=resp?.status()??null;row.error=err;rows.push(row);console.log('SGDEFER',JSON.stringify({...row,transferKB:Math.round((row.transferBytes||0)/1024)}));
 await p.screenshot({path:path.join(OUT,'shots',tc.key+'.png'),fullPage:false}).catch(()=>{});
 await ctx.close();
}
fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(rows,null,2));
if(rows.some(r=>r.http!==200||!r.previewOk||r.error))process.exitCode=2;
await browser.close();