import { chromium } from 'playwright';
const BASE='https://www.statesideqm.com',THEME='158561894555',ROOT='body-armor-ballistic-protection';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
async function open(){const p=await context.newPage();await p.goto(`${BASE}/collections/${ROOT}?preview_theme_id=${THEME}`,{waitUntil:'domcontentloaded',timeout:90000});await p.waitForFunction(()=>document.querySelector('#MainContent')?.dataset.sqRefineV3Ready==='true',null,{timeout:60000});await p.waitForSelector('#MainContent .sq-refine-v3-sidebar',{state:'visible'});await sleep(800);return p}
async function waitRebuilt(p){
  for(let a=0;a<3;a++){
    try{await p.waitForLoadState('domcontentloaded',{timeout:30000}).catch(()=>{});await p.waitForFunction(()=>document.querySelector('#MainContent')?.dataset.sqRefineV3Ready==='true',null,{timeout:45000});await p.waitForSelector('#MainContent .sq-refine-v3-sidebar',{state:'visible',timeout:15000});await sleep(900);return true}catch(e){if(a===2)throw e;await sleep(1200)}
  }
}
async function inspectChoice(groupTitle,label){
  const p=await open();
  const before=await p.evaluate(()=>[...document.querySelectorAll('#MainContent .sq-refine-v3-results .product-grid a[href*="/products/"]')].slice(0,10).map(a=>a.href));
  const oldUrl=p.url();
  const found=await p.evaluate(({groupTitle,label})=>{const norm=s=>String(s||'').replace(/\s+/g,' ').trim();const groups=[...document.querySelectorAll('#MainContent .sq-refine-v3-sidebar details.sq-refine-v3-group')];const d=groups.find(x=>norm(x.querySelector(':scope>summary')?.textContent)===groupTitle);if(!d)return{missing:true,reason:'group'};d.open=true;const c=[...d.querySelectorAll('.sq-refine-v3-choice')].find(x=>norm(x.querySelector('span')?.textContent)===label);if(!c)return{missing:true,reason:'choice'};const i=c.querySelector('input');if(!i)return{missing:true,reason:'input'};const attrs={type:i.type,name:i.name,value:i.value,kind:i.dataset.kind||'',target:i.dataset.target||'',filterName:i.dataset.filterName||'',filterValue:i.dataset.filterValue||''};i.click();return{missing:false,attrs};},{groupTitle,label});
  if(found.missing){await p.close();return{groupTitle,label,...found}}
  await p.waitForFunction(old=>location.href!==old,oldUrl,{timeout:15000}).catch(()=>{});
  await waitRebuilt(p);
  const result=await p.evaluate(()=>{const main=document.querySelector('#MainContent');const grid=main?.querySelector('.sq-refine-v3-results .product-grid');const cards=grid?[...grid.querySelectorAll(':scope>.product-grid__item')].filter(x=>x.querySelector('a[href*="/products/"]')):[];return{ready:main?.dataset.sqRefineV3Ready==='true',error:main?.dataset.sqRefineV3Error||'',cards:cards.length,products:cards.slice(0,6).map(x=>(x.textContent||'').replace(/\s+/g,' ').trim().slice(0,220))}});
  const after=await p.evaluate(()=>[...document.querySelectorAll('#MainContent .sq-refine-v3-results .product-grid a[href*="/products/"]')].slice(0,10).map(a=>a.href));
  const out={groupTitle,label,attrs:found.attrs,oldUrl,afterUrl:p.url(),changed:oldUrl!==p.url()||JSON.stringify(before)!==JSON.stringify(after),...result};await p.close();return out;
}
const root=await open();const inventory=await root.evaluate(()=>[...document.querySelectorAll('#MainContent .sq-refine-v3-sidebar details.sq-refine-v3-group')].filter(d=>/Shop by (Subcategory|Type)/i.test((d.querySelector('summary')?.textContent||'').trim())).map(d=>({title:(d.querySelector('summary')?.textContent||'').trim(),labels:[...d.querySelectorAll('.sq-refine-v3-choice span')].map(s=>(s.textContent||'').trim())})));await root.close();
console.log('BODY_ARMOR_FILTER_INVENTORY '+JSON.stringify(inventory));
const checks=[];for(const g of inventory){for(const label of g.labels){try{checks.push(await inspectChoice(g.title,label))}catch(e){checks.push({groupTitle:g.title,label,error:String(e)})}console.log('BODY_ARMOR_FILTER_CHECK '+JSON.stringify(checks.at(-1)));}}
console.log('BODY_ARMOR_FILTER_CHECKS '+JSON.stringify(checks));
const failures=[];for(const c of checks){if(c.error)failures.push(`${c.groupTitle}: ${c.label}: ${c.error}`);else if(c.missing)failures.push(`${c.groupTitle}: ${c.label}: missing ${c.reason}`);else if(!c.changed)failures.push(`${c.groupTitle}: ${c.label}: no URL/product change`);else if(!c.ready||c.error||c.cards<1)failures.push(`${c.groupTitle}: ${c.label}: ready=${c.ready} error=${c.error} cards=${c.cards}`)}
console.log('BODY_ARMOR_FILTER_SUMMARY '+JSON.stringify({checked:checks.length,failures}));
await browser.close();if(failures.length)process.exit(1);
