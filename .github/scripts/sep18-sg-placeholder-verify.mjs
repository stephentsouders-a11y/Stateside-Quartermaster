import { chromium } from 'playwright';import fs from 'fs';
const BASE='https://www.statesideqm.com',THEME='158900125851',OUT='sep18-sg-placeholder-verify';fs.mkdirSync(OUT,{recursive:true});
const cases=[['ohio','/collections/state-guard-series-ohio'],['sc','/collections/state-guard-series-south-carolina']];
const browser=await chromium.launch({headless:true});const rows=[];
for(const [key,route] of cases){
 const ctx=await browser.newContext({viewport:{width:1440,height:1000}});const p=await ctx.newPage();const req=[];p.on('request',r=>{if(r.resourceType()==='fetch'||r.resourceType()==='xhr')req.push(r.url())});
 const u=new URL(route,BASE);u.searchParams.set('preview_theme_id',THEME);let resp=null,err=null;const t0=Date.now();
 try{resp=await p.goto(u.href,{waitUntil:'domcontentloaded',timeout:70000});await p.waitForLoadState('load',{timeout:16000}).catch(()=>{});await p.waitForTimeout(1200)}catch(e){err=String(e?.message||e)}
 const snap=async phase=>p.evaluate(({phase,themeId})=>{const cards=[...document.querySelectorAll('.sqsg-card')].map(a=>({label:(a.querySelector('strong')?.textContent||'').trim(),meta:(a.querySelector('small')?.textContent||'').trim(),href:a.getAttribute('href')||'',placeholder:a.getAttribute('data-sq-root-placeholder')||'',img:a.querySelector('img')?.src||''}));return{phase,theme:{id:String(window.Shopify?.theme?.id||''),name:String(window.Shopify?.theme?.name||'')},cards,labels:cards.map(x=>x.label),loading:cards.filter(x=>/Loading items/i.test(x.meta)).length,viewData:{...document.querySelector('[data-sqsg-view]')?.dataset},previewOk:String(window.Shopify?.theme?.id||'')===themeId}}, {phase,themeId:THEME});
 const early=await snap('early'); const reqEarly=req.filter(x=>x.includes('/products.json')).length;
 await p.waitForTimeout(9000); const settled=await snap('settled');const reqSettled=req.filter(x=>x.includes('/products.json')).length;
 const n=await p.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0],f=performance.getEntriesByName('first-contentful-paint')[0];return{ttfb:Math.round(n?.responseStart||0),dcl:Math.round(n?.domContentLoadedEventEnd||0),load:Math.round(n?.loadEventEnd||0),fcp:Math.round(f?.startTime||0)}});
 const row={key,route,http:resp?.status()??null,error:err,elapsed:Date.now()-t0,nav:n,reqEarly,reqSettled,early,settled};rows.push(row);console.log('SGPLACEHOLDER',JSON.stringify(row));await ctx.close();
}
fs.writeFileSync(OUT+'/results.json',JSON.stringify(rows,null,2));
const need=['Insignia & Identification','Tactical Gear & Body Armor','Uniforms','Patches & Flags','Awards & Decorations'];
for(const r of rows){if(r.http!==200||r.error||!r.early.previewOk)process.exitCode=2;for(const x of need)if(!r.early.labels.includes(x))process.exitCode=3;if(r.settled.loading>0)process.exitCode=4;}
await browser.close();