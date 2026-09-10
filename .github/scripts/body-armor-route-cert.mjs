import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const ROUTES=[
['flags-patriotic-decor','Flags'],
['flashlights-lighting','Flashlights / Lighting'],
['footwear-gloves-eyewear','Footwear / Gloves / Eyewear'],
['k9-dog-gear','K9 / Dog Gear'],
['knives-axes-cutlery','Knives / Axes / Cutlery'],
['morale-patches-tactical-id','Morale Patches / Tactical ID'],
['outdoor-preparedness-gear','Outdoor / Preparedness Gear'],
['patriotic-american-heritage','Patriotic / American Heritage'],
['safety-rescue-climbing','Safety / Rescue / Climbing'],
['sta-brite-insignia','Sta-Brite Insignia'],
['tactical-gear','Tactical Gear'],
['thin-line','Thin Line'],
['uniforms','Uniforms'],
['watches','Watches'],
['zippos-lighters-torches','Zippo / Lighters / Torches'],
['stateside-quartermaster-logo-merch','Stateside Quartermaster Logo Merch'],
['army-national-guard-series','Army National Guard'],
['air-national-guard-series','Air National Guard'],
['products-built-for-the-line-u-s-army','U.S. Army'],
['products-built-for-the-line-u-s-navy','U.S. Navy'],
['products-built-for-the-line-u-s-air-force','U.S. Air Force'],
['products-built-for-the-line-u-s-marine-corps','U.S. Marine Corps'],
['products-built-for-the-line-u-s-coast-guard','U.S. Coast Guard'],
['products-built-for-the-line-u-s-space-force','U.S. Space Force'],
['rotc-series','ROTC'],
['jrotc-series','JROTC'],
['military-schools-academies','Military Schools & Academies'],
['law-enforcement-corrections','Law Enforcement & Corrections'],
['firefighting-ems-search-rescue','Firefighting / EMS / Search & Rescue']
];
const BAD=new Set(['all','stateside-quartermaster-logo-merch','air-national-guard-series','state-guard-series','rotc-series','jrotc-series','military-schools-academies','public-safety-series','army-national-guard-series']);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const th=raw=>{try{return new URL(raw,'https://www.statesideqm.com').pathname.match(/^\/collections\/([^/?#]+)/)?.[1]||''}catch{return''}};
async function go(page,url){let r;for(let i=0;i<3;i++){r=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});if(r?.status()!==503)return r;await sleep(1200*(i+1))}return r}
async function check(browser,root,name,mobile){
 const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000}}),page=await ctx.newPage(),pageerrors=[];page.on('pageerror',e=>pageerrors.push(e.message));
 const url=`https://www.statesideqm.com/collections/${root}?preview_theme_id=158561894555`;const r=await go(page,url);try{await page.waitForFunction(()=>document.querySelector('#MainContent')?.dataset.sqRefineV3Ready==='true',{timeout:18000})}catch{}await sleep(1800);
 const d=await page.evaluate(()=>{const vis=e=>{if(!e)return false;const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};const m=document.querySelector('#MainContent'),side=m?.querySelector('.sq-refine-v3-sidebar'),size=m?.querySelector('.sq-refine-v3-page-size'),grid=m?.querySelector('.sq-refine-v3-results .product-grid'),groups=[...(side?.querySelectorAll('.sq-refine-v3-group')||[])];return{ready:m?.dataset.sqRefineV3Ready||'',active:m?.classList.contains('sq-refine-v3-active')||false,cleanup:m?.dataset.sqRefineV3RootCleanup||'',isolation:document.querySelector('[data-sq-refine-v3-legacy-isolation]')?.dataset.sqRefineV3LegacyIsolation||'',side:vis(side),sideTitle:side?.querySelector('.sq-refine-v3-sidebar__title')?.textContent.trim()||'',sidePos:side?getComputedStyle(side).position:'',sideHeight:side?.getBoundingClientRect().height||0,size:vis(size),sizeInSide:!!size?.closest('.sq-refine-v3-sidebar'),sizes:[...(size?.querySelectorAll('input')||[])].map(i=>[i.value,i.checked]),groups:groups.map(g=>({label:g.querySelector(':scope>summary')?.textContent.trim()||'',open:g.open,checked:g.querySelectorAll('input:checked').length,inputs:g.querySelectorAll('input[type="checkbox"]').length,targets:[...g.querySelectorAll('input[data-target]')].map(i=>i.dataset.target)})),grid:vis(grid),cols:grid?getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length:0,cards:grid?.querySelectorAll(':scope>.product-grid__item').length||0,legacy:[...document.querySelectorAll('[data-sq-refine-v3-hidden-nav="true"]')].filter(vis).length,globalLegacy:!!document.querySelector('.sq-global-refine-layout'),vac:[...document.querySelectorAll('.vac-page-size,[data-vac-page-size],[data-vac-page-view]')].filter(vis).length};});
 d.http=r?.status()||0;d.pageerrors=pageerrors;const e=[];if(d.http>=400)e.push('HTTP '+d.http);pageerrors.forEach(x=>e.push('pageerror '+x));if(d.ready!=='true'||!d.active)e.push('V3 not ready');if(d.cleanup!=='true'||d.isolation!==root)e.push('V3 guards missing');if(!d.side||d.sideTitle!=='Refine Products')e.push('sidebar');if(!d.size||d.sizeInSide)e.push('page size placement');if(d.sizes.map(x=>x[0]).join(',')!=='50,100,250'||!d.sizes.find(x=>x[0]==='50')?.[1])e.push('page size values');const cat=d.groups.find(g=>/shop by category/i.test(g.label));if(!cat)e.push('category missing');else{const bad=cat.targets.map(th).filter(h=>BAD.has(h)&&h!==root);if(bad.length)e.push('bad categories '+bad.join(','));}for(const g of d.groups){if(!g.inputs)e.push('empty '+g.label);if(!g.checked&&g.open)e.push('inactive open '+g.label);if(g.checked&&!g.open)e.push('active closed '+g.label)}if(d.globalLegacy)e.push('legacy global layout');if(d.legacy)e.push('legacy visible '+d.legacy);if(d.vac)e.push('old page size visible');if(!d.grid||d.cards<1||d.cards>50)e.push('grid/cards '+d.cards);if(d.grid&&d.cols!==(mobile?2:3))e.push('columns '+d.cols);if(mobile&&d.sidePos==='sticky')e.push('mobile sticky');if(!mobile&&(d.sidePos!=='sticky'||d.sideHeight<600))e.push('desktop sidebar');
 const dir=`cert-${root}`;await fs.mkdir(dir,{recursive:true});await page.screenshot({path:`${dir}/${mobile?'mobile':'desktop'}.png`,fullPage:true});await ctx.close();return{data:d,errors:e};
}
const browser=await chromium.launch({headless:true}),report={mode:'sequential-stop-on-failure',routes:[]};let failed=false;
for(const [root,name] of ROUTES){const route={root,name};route.desktop=await check(browser,root,name,false);route.mobile=await check(browser,root,name,true);route.pass=!route.desktop.errors.length&&!route.mobile.errors.length;report.routes.push(route);console.log(JSON.stringify(route,null,2));await fs.writeFile('sequential-route-report.json',JSON.stringify(report,null,2));if(!route.pass){failed=true;break;}}
await browser.close();report.pass=!failed&&report.routes.length===ROUTES.length;await fs.writeFile('sequential-route-report.json',JSON.stringify(report,null,2));console.log('SEQUENTIAL_SUMMARY '+JSON.stringify(report.routes.map(r=>({root:r.root,pass:r.pass,desktop:r.desktop.errors,mobile:r.mobile.errors}))));if(!report.pass)process.exitCode=1;
