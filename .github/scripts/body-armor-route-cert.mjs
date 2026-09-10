import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const URL='https://www.statesideqm.com/collections/knives-axes-cutlery?preview_theme_id=158561894555';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const b=await chromium.launch({headless:true});
for(const [name,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
 const c=await b.newContext({viewport}),p=await c.newPage(),errors=[],consoleErrors=[];
 p.on('pageerror',e=>errors.push({message:e.message,stack:e.stack||''}));p.on('console',m=>{if(m.type()==='error')consoleErrors.push({text:m.text(),location:m.location()})});
 const r=await p.goto(URL,{waitUntil:'domcontentloaded',timeout:45000});try{await p.waitForFunction(()=>document.querySelector('#MainContent')?.dataset.sqRefineV3Ready==='true',{timeout:20000})}catch{}await sleep(9000);
 const data=await p.evaluate(()=>({scripts:[...document.scripts].map((s,i)=>({i,src:s.src||'',marker:[...s.attributes].find(a=>a.name.startsWith('data-sq'))?.name||'',markerValue:[...s.attributes].find(a=>a.name.startsWith('data-sq'))?.value||'',head:(s.textContent||'').trim().slice(0,120)})).filter(x=>x.marker||x.src.includes('assets')),gridInside:!!document.querySelector('.sq-refine-v3-results .product-grid .product-grid__item'),cards:document.querySelectorAll('.sq-refine-v3-results .product-grid>.product-grid__item').length,allInlineAppend:[...document.scripts].map((s,i)=>({i,marker:[...s.attributes].find(a=>a.name.startsWith('data-sq'))?.name||'',value:[...s.attributes].find(a=>a.name.startsWith('data-sq'))?.value||'',text:s.textContent||''})).filter(x=>x.text.includes('appendChild')).map(x=>({i:x.i,marker:x.marker,value:x.value,snips:[...x.text.matchAll(/.{0,100}appendChild.{0,140}/g)].slice(0,6).map(m=>m[0])}))}));
 console.log(JSON.stringify({name,http:r?.status()||0,errors,consoleErrors,data},null,2));await fs.mkdir('cert-knives-axes-cutlery',{recursive:true});await p.screenshot({path:`cert-knives-axes-cutlery/${name}.png`,fullPage:true});await c.close();
}
await b.close();
