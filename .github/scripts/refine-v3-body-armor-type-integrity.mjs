// Full exhaustive Body Armor Refine Products certification: 2026-09-11
import { chromium } from 'playwright';
const BASE='https://www.statesideqm.com',THEME='158561894555',ROOT='body-armor-ballistic-protection',WORKERS=6;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
async function open(){
  const p=await context.newPage();
  await p.goto(`${BASE}/collections/${ROOT}?preview_theme_id=${THEME}`,{waitUntil:'domcontentloaded',timeout:60000});
  await p.waitForFunction(()=>document.querySelector('#MainContent')?.dataset.sqRefineV3Ready==='true',null,{timeout:45000});
  await p.waitForSelector('#MainContent .sq-refine-v3-sidebar',{state:'visible',timeout:15000});
  return p;
}
async function waitRebuilt(p){
  await p.waitForFunction(()=>document.querySelector('#MainContent')?.dataset.sqRefineV3Ready==='true',null,{timeout:30000});
  await p.waitForSelector('#MainContent .sq-refine-v3-sidebar',{state:'visible',timeout:12000});
  await sleep(350);
}
async function inspectChoice(groupTitle,label){
  const p=await open();
  try{
    const before=await p.evaluate(()=>[...document.querySelectorAll('#MainContent .sq-refine-v3-results .product-grid a[href*="/products/"]')].slice(0,10).map(a=>a.href));
    const oldUrl=p.url();
    const found=await p.evaluate(({groupTitle,label})=>{
      const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
      const groups=[...document.querySelectorAll('#MainContent .sq-refine-v3-sidebar details.sq-refine-v3-group')];
      const d=groups.find(x=>norm(x.querySelector(':scope>summary')?.textContent)===groupTitle);
      if(!d)return{missing:true,reason:'group'};d.open=true;
      const c=[...d.querySelectorAll('.sq-refine-v3-choice')].find(x=>norm(x.querySelector('span')?.textContent)===label);
      if(!c)return{missing:true,reason:'choice'};
      const i=c.querySelector('input');if(!i)return{missing:true,reason:'input'};
      const attrs={type:i.type,name:i.name,value:i.value,kind:i.dataset.kind||'',target:i.dataset.target||'',filterName:i.dataset.filterName||'',filterValue:i.dataset.filterValue||''};
      i.click();return{missing:false,attrs};
    },{groupTitle,label});
    if(found.missing)return{groupTitle,label,...found};
    await p.waitForFunction(old=>location.href!==old,oldUrl,{timeout:12000}).catch(()=>{});
    await waitRebuilt(p);
    const result=await p.evaluate(()=>{
      const main=document.querySelector('#MainContent');
      const cards=[...document.querySelectorAll('#MainContent .sq-refine-v3-results .product-grid .product-grid__item')].filter(x=>x.querySelector('a[href*="/products/"]'));
      return {ready:main?.dataset.sqRefineV3Ready==='true',error:main?.dataset.sqRefineV3Error||'',cards:cards.length,products:cards.slice(0,8).map(x=>(x.textContent||'').replace(/\s+/g,' ').trim().slice(0,240))};
    });
    const after=await p.evaluate(()=>[...document.querySelectorAll('#MainContent .sq-refine-v3-results .product-grid a[href*="/products/"]')].slice(0,10).map(a=>a.href));
    return {groupTitle,label,attrs:found.attrs,oldUrl,afterUrl:p.url(),changed:oldUrl!==p.url()||JSON.stringify(before)!==JSON.stringify(after),...result};
  } finally { await p.close(); }
}
const root=await open();
const inventory=await root.evaluate(()=>[...document.querySelectorAll('#MainContent .sq-refine-v3-sidebar details.sq-refine-v3-group')]
  .map(d=>({title:(d.querySelector('summary')?.textContent||'').trim(),labels:[...d.querySelectorAll('.sq-refine-v3-choice span')].map(s=>(s.textContent||'').trim()).filter(Boolean)}))
  .filter(g=>g.title&&g.labels.length));
const rootState=await root.evaluate(()=>({
  ready:document.querySelector('#MainContent')?.dataset.sqRefineV3Ready==='true',
  error:document.querySelector('#MainContent')?.dataset.sqRefineV3Error||'',
  stateGuardLeak:/State Guard Uniform Builder|Build Your Uniform/i.test(document.querySelector('#MainContent')?.innerText||''),
  sidebars:[...document.querySelectorAll('#MainContent .sq-refine-v3-sidebar')].filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>2&&r.height>2&&s.display!=='none'&&s.visibility!=='hidden'}).length,
  visibleGrids:[...document.querySelectorAll('#MainContent .product-grid')].filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>2&&r.height>2&&s.display!=='none'&&s.visibility!=='hidden'&&e.querySelector('a[href*="/products/"]')}).length
}));
await root.close();
console.log('BODY_ARMOR_ROOT_STATE '+JSON.stringify(rootState));
console.log('BODY_ARMOR_FILTER_INVENTORY '+JSON.stringify(inventory));
const tasks=inventory.flatMap(g=>g.labels.map(label=>({groupTitle:g.title,label})));
const checks=new Array(tasks.length);let next=0;
async function worker(id){
  while(true){
    const index=next++; if(index>=tasks.length)return;
    const t=tasks[index];
    try{checks[index]=await inspectChoice(t.groupTitle,t.label)}catch(e){checks[index]={...t,error:String(e)}}
    console.log('BODY_ARMOR_FILTER_CHECK '+JSON.stringify({index,total:tasks.length,worker:id,...checks[index]}));
  }
}
await Promise.all(Array.from({length:Math.min(WORKERS,tasks.length||1)},(_,i)=>worker(i+1)));
const failures=[];
if(!rootState.ready)failures.push('root: not ready');
if(rootState.error)failures.push('root error: '+rootState.error);
if(rootState.stateGuardLeak)failures.push('root: State Guard Uniform Builder contamination visible');
if(rootState.sidebars!==1)failures.push('root: visible sidebars='+rootState.sidebars);
if(rootState.visibleGrids!==1)failures.push('root: visible product grids='+rootState.visibleGrids);
for(const c of checks){
  if(c.error)failures.push(`${c.groupTitle}: ${c.label}: ${c.error}`);
  else if(c.missing)failures.push(`${c.groupTitle}: ${c.label}: missing ${c.reason}`);
  else if(!c.changed)failures.push(`${c.groupTitle}: ${c.label}: no URL/product change`);
  else if(!c.ready||c.error||c.cards<1)failures.push(`${c.groupTitle}: ${c.label}: ready=${c.ready} error=${c.error} cards=${c.cards}`);
}
console.log('BODY_ARMOR_FILTER_CHECKS '+JSON.stringify(checks));
console.log('BODY_ARMOR_FILTER_SUMMARY '+JSON.stringify({groups:inventory.length,checked:checks.length,failures}));
await browser.close();
if(failures.length)process.exit(1);
