import { chromium } from 'playwright';
const BASE='https://www.statesideqm.com';
const PREVIEW='158561894555';
const ROUTES=[
 ['uniforms','Uniforms'],
 ['watches','Watches'],
 ['zippos-lighters-torches','Zippo'],
 ['stateside-quartermaster-logo-merch','Logo Merch'],
 ['army-national-guard-series','Army National Guard'],
 ['air-national-guard-series','Air National Guard']
];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function gotoHealthy(p,url){let r=null;for(let i=0;i<3;i++){r=await p.goto(url,{waitUntil:'domcontentloaded',timeout:45000});if((r?.status()||0)<500)break;await sleep(1500*(i+1));}return r;}
async function check(browser,root,name,mobile){
 const viewport=mobile?{width:390,height:844}:{width:1440,height:1000};
 const c=await browser.newContext({viewport}); const p=await c.newPage(); const errors=[];
 p.on('pageerror',e=>errors.push({message:e.message,stack:e.stack||''}));
 const url=`${BASE}/collections/${root}?preview_theme_id=${PREVIEW}`; const r=await gotoHealthy(p,url);
 try{await p.waitForFunction(()=>document.querySelector('#MainContent')?.dataset.sqRefineV3Ready==='true',{timeout:20000})}catch{}
 await sleep(6500);
 const d=await p.evaluate(({root,mobile})=>{
  const main=document.querySelector('#MainContent'),sidebar=main?.querySelector('.sq-refine-v3-sidebar'),results=main?.querySelector('.sq-refine-v3-results');
  const grid=results?.querySelector('.product-grid,product-grid,ul[id*="product-grid"],.grid--view-items,[data-product-grid],collection-component ul');
  const raw=results?[...results.querySelectorAll('.product-grid__item,li.grid__item,.product-card-wrapper,.card-wrapper,[data-product-card]')]:[];
  const cards=raw.filter(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0});
  const cols=cards.length?new Set(cards.slice(0,8).map(el=>Math.round(el.getBoundingClientRect().left))).size:0;
  const size=[...document.querySelectorAll('input[type="radio"],select')].flatMap(el=>el.tagName==='SELECT'?[...el.options].map(o=>o.value):[el.value]).filter(v=>['50','100','250'].includes(String(v)));
  const isolation=document.querySelector('script[data-sq-refine-v3-legacy-isolation]')?.dataset.sqRefineV3LegacyIsolation||'';
  const legacy=[...document.querySelectorAll('[data-sq-refine-v3-hidden-nav="true"]')].filter(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0}).length;
  const oldSize=[...document.querySelectorAll('.vac-page-size')].filter(el=>getComputedStyle(el).display!=='none').length;
  const groups=[...(sidebar?.querySelectorAll('details.sq-refine-v3-group')||[])];
  const inactiveClosed=groups.filter(g=>g.dataset.active!=='true').every(g=>!g.open),activeOpen=groups.filter(g=>g.dataset.active==='true').every(g=>g.open);
  const structural=[...(sidebar?.querySelectorAll('input[data-kind="structural"]')||[])];
  const falseHandles=new Set(['all','state-guard-series','rotc-series','jrotc-series','military-schools-academies','public-safety-series']);
  const falseTargets=structural.filter(i=>{try{const h=new URL(i.dataset.target,location.origin).pathname.split('/')[2]||'';return falseHandles.has(h)&&h!==root}catch{return false}}).length;
  const sticky=sidebar?getComputedStyle(sidebar).position:'';
  const checks={ready:main?.dataset.sqRefineV3Ready==='true',cleanup:main?.dataset.sqRefineV3RootCleanup==='true',isolation:isolation===root,sidebar:!!sidebar&&getComputedStyle(sidebar).display!=='none',title:(sidebar?.textContent||'').includes('Refine Products'),pageSizes:['50','100','250'].every(v=>size.includes(v)),default50:!!document.querySelector('input[value="50"]:checked')||!!document.querySelector('select option[value="50"]:checked'),groups:groups.length>0,inactiveClosed,activeOpen,legacy:legacy===0,oldSize:oldSize===0,falseTargets:falseTargets===0,grid:!!grid||cards.length>0,cards:cards.length>0&&cards.length<=50,columns:mobile?cols===2:cols===3,nativeColumn:!!results?.querySelector('.sq-collection-products-column'),sticky:mobile?sticky!=='sticky':sticky==='sticky'};
  return {checks,error:main?.dataset.sqRefineV3Error||'',cards:cards.length,cols,groups:groups.length,structural:structural.length,falseTargets,legacy,oldSize,sticky,isolation};
 },{root,mobile});
 const pass=(r?.status()||0)<400&&errors.length===0&&Object.values(d.checks).every(Boolean);
 await c.close(); return {viewport:mobile?'mobile':'desktop',http:r?.status()||0,errors,data:d,pass};
}
const b=await chromium.launch({headless:true}); let failed=false;
for(const [root,name] of ROUTES){const desktop=await check(b,root,name,false),mobile=await check(b,root,name,true);const pass=desktop.pass&&mobile.pass;console.log('ROUTE_RESULT '+JSON.stringify({root,name,desktop,mobile,pass}));if(!pass){failed=true;break;}}
await b.close(); if(failed)process.exit(1);
