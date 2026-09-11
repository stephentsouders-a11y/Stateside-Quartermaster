import { chromium } from 'playwright';
const BASE='https://www.statesideqm.com';
const THEME='158561894555';
const routes=[
['Airsoft','/collections/airsoft-milsim'],
['Body Armor','/collections/body-armor-ballistic-protection'],
['Sta-Brite','/collections/sta-brite-insignia'],
['Thin Line','/collections/thin-line'],
['Art','/collections/art']
];
const selectors=[
'.sq-maker-browser',
'.facets-block-wrapper--horizontal .facets__filters-wrapper',
'.facets-toggle__wrapper',
'theme-drawer#filters-drawer',
'.sq-global-refine-sidebar',
'[class*="button-tree"]','[class*="category-grid"]','[class*="type-grid"]','[class*="branch-grid"]','[class*="root-categories"]','.sq-subcategory-section','.sq-subcategory-card'
];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function u(path){const x=new URL(path,BASE);x.searchParams.set('preview_theme_id',THEME);return x.toString()}
for(const [name,route] of routes){
  const b=await chromium.launch({headless:true});
  const c=await b.newContext({viewport:{width:1440,height:1000}});
  const p=await c.newPage();
  await p.addInitScript((selectors)=>{
    window.__trace=[];
    const vis=e=>{if(!e)return false;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>2&&r.height>2&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)>0};
    const clean=s=>String(s||'').replace(/\s+/g,' ').trim().slice(0,160);
    const tick=()=>{const m=document.querySelector('#MainContent');if(m){const hits=[];for(const sel of selectors){for(const e of m.querySelectorAll(sel)){if(vis(e)&&!e.closest('.sq-refine-v3-sidebar,.sq-refine-v3-results'))hits.push({sel,tag:e.tagName,id:e.id||'',cls:typeof e.className==='string'?e.className:'',text:clean(e.textContent)})}}if(hits.length)window.__trace.push({t:Math.round(performance.now()),ready:m.dataset.sqRefineV3Ready||null,hits})}if(performance.now()<3500)requestAnimationFrame(tick)};requestAnimationFrame(tick)
  },selectors);
  let status=0;try{const r=await p.goto(u(route),{waitUntil:'domcontentloaded',timeout:90000});status=r?.status()||0;await sleep(3800)}catch(e){console.log(name,'NAV',String(e))}
  const trace=await p.evaluate(()=>window.__trace||[]).catch(()=>[]);
  const unique=[];const seen=new Set();for(const f of trace){for(const h of f.hits){const k=[h.sel,h.tag,h.id,h.cls,h.text].join('|');if(!seen.has(k)){seen.add(k);unique.push({...h,firstT:f.t,ready:f.ready})}}}
  console.log('\nTRACE '+name+' HTTP '+status+' frames='+trace.length);
  console.log(JSON.stringify(unique,null,2));
  await c.close();await b.close();
}