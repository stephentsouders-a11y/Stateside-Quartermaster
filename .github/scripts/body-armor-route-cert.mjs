import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const URL='https://www.statesideqm.com/collections/flags-patriotic-decor?preview_theme_id=158561894555';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const b=await chromium.launch({headless:true});
for(const [name,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
 const c=await b.newContext({viewport}),p=await c.newPage(),errs=[];p.on('pageerror',e=>errs.push(e.message));let r=await p.goto(URL,{waitUntil:'domcontentloaded',timeout:45000});try{await p.waitForFunction(()=>document.querySelector('#MainContent')?.dataset.sqRefineV3Ready==='true',{timeout:20000})}catch{}await sleep(3500);
 const d=await p.evaluate(()=>{const vis=e=>{if(!e)return false;const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};const describe=e=>({tag:e.tagName,cls:e.className||'',id:e.id||'',visible:vis(e),insideMain:!!e.closest('#MainContent'),insideResults:!!e.closest('.sq-refine-v3-results'),parentTag:e.parentElement?.tagName||'',parentCls:e.parentElement?.className||'',cards:e.querySelectorAll?.('.product-grid__item').length||0,productLinks:e.querySelectorAll?.('a[href*="/products/"]').length||0});return{ready:document.querySelector('#MainContent')?.dataset.sqRefineV3Ready||'',grids:[...document.querySelectorAll('.product-grid')].map(describe),components:[...document.querySelectorAll('collection-component')].map(describe),results:[...document.querySelectorAll('.sq-refine-v3-results')].map(describe),columns:[...document.querySelectorAll('.sq-collection-products-column')].map(describe),resultsList:[...document.querySelectorAll('#ResultsList')].map(describe)};});
 console.log(JSON.stringify({name,http:r?.status(),errors:errs,data:d},null,2));await fs.mkdir('cert-flags-patriotic-decor',{recursive:true});await p.screenshot({path:`cert-flags-patriotic-decor/${name}.png`,fullPage:true});await c.close();
}
await b.close();
