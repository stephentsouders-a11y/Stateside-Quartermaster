// Knives re-cert after null-safe legacy facet race repair.
import { chromium } from 'playwright';
const URL='https://www.statesideqm.com/collections/knives-axes-cutlery?preview_theme_id=158561894555';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const b=await chromium.launch({headless:true});
let failed=false;
for(const [name,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
  const c=await b.newContext({viewport});
  const p=await c.newPage();
  const errors=[];
  p.on('pageerror',e=>errors.push({message:e.message,stack:e.stack||''}));
  const r=await p.goto(URL,{waitUntil:'domcontentloaded',timeout:45000});
  try{await p.waitForFunction(()=>document.querySelector('#MainContent')?.dataset.sqRefineV3Ready==='true',{timeout:20000})}catch{}
  await sleep(10000);
  const d=await p.evaluate((name)=>{
    const main=document.querySelector('#MainContent');
    const sidebar=main?.querySelector('.sq-refine-v3-sidebar');
    const results=main?.querySelector('.sq-refine-v3-results');
    const grid=results?.querySelector('product-grid,ul[id*="product-grid"],.product-grid,.grid--view-items,[data-product-grid],collection-component ul');
    const cards=results?[...results.querySelectorAll('li.grid__item,.product-card-wrapper,.card-wrapper,[data-product-card]')]:[];
    const visibleCards=cards.filter(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0});
    const cols=visibleCards.length?new Set(visibleCards.slice(0,8).map(el=>Math.round(el.getBoundingClientRect().left))).size:0;
    const size=[...document.querySelectorAll('input[type="radio"],select')].flatMap(el=>el.tagName==='SELECT'?[...el.options].map(o=>o.value):[el.value]).filter(v=>['50','100','250'].includes(String(v)));
    const default50=!!document.querySelector('input[value="50"]:checked')||!!document.querySelector('select option[value="50"]:checked');
    const catChoices=[...(sidebar?.querySelectorAll('a[href*="sq_root=knives-axes-cutlery"],input[type="checkbox"]')||[])].length;
    const isolation=document.querySelector('script[data-sq-refine-v3-legacy-isolation]')?.getAttribute('data-sq-refine-v3-legacy-isolation')||'';
    const legacy=[...document.querySelectorAll('[data-sq-refine-v3-hidden-nav="true"]')].filter(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0}).length;
    const oldSize=[...document.querySelectorAll('.vac-page-size')].filter(el=>getComputedStyle(el).display!=='none').length;
    const nativeColumn=!!results?.querySelector('.sq-collection-products-column');
    const sticky=sidebar?getComputedStyle(sidebar).position:'';
    const marker=!!document.querySelector('script[data-sq-collection-facet-sidebar-v1]');
    const checks={http:true,ready:main?.dataset.sqRefineV3Ready==='true',cleanup:main?.dataset.sqRefineV3RootCleanup==='true',isolation:isolation==='knives-axes-cutlery',sidebar:!!sidebar&&getComputedStyle(sidebar).display!=='none',title:(sidebar?.textContent||'').includes('Refine Products'),pageSizes:['50','100','250'].every(v=>size.includes(v)),default50,categoryChoices:catChoices>=8,legacy:legacy===0,oldSize:oldSize===0,grid:!!grid||visibleCards.length>0,cards:visibleCards.length===50,columns:name==='desktop'?cols===3:cols===2,nativeColumn,sticky:name==='desktop'?sticky==='sticky':sticky!=='sticky'};
    return {checks,visibleCards:visibleCards.length,cols,catChoices,size:[...new Set(size)],sticky,isolation,legacy,oldSize,nativeColumn,legacyControllerMarker:marker};
  },name);
  const pass=(r?.status()||0)<400 && errors.length===0 && Object.values(d.checks).every(Boolean);
  console.log('KNIVES_RESULT '+JSON.stringify({name,http:r?.status()||0,errors,data:d,pass},null,2));
  if(!pass)failed=true;
  await c.close();
}
await b.close();
if(failed)process.exit(1);
