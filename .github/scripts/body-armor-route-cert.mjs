import { chromium } from 'playwright';
const BASE='https://www.statesideqm.com',PREVIEW='158561894555';
const ROUTES=[
['army-national-guard-series','Army National Guard'],
['air-national-guard-series','Air National Guard'],
['products-built-for-the-line-u-s-army','U.S. Army'],
['products-built-for-the-line-u-s-navy','U.S. Navy'],
['products-built-for-the-line-u-s-air-force','U.S. Air Force'],
['products-built-for-the-line-u-s-marine-corps','U.S. Marine Corps']
];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function gotoHealthy(p,url){let r=null;for(let i=0;i<3;i++){r=await p.goto(url,{waitUntil:'domcontentloaded',timeout:45000});if((r?.status()||0)<500)break;await sleep(1500*(i+1));}return r;}
async function check(browser,root,mobile){
 const c=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000}}),p=await c.newPage(),errors=[];
 p.on('pageerror',e=>errors.push({message:e.message,stack:e.stack||''}));
 const expected='/collections/'+root;
 const r=await gotoHealthy(p,`${BASE}${expected}?preview_theme_id=${PREVIEW}`);
 try{await p.waitForFunction(()=>document.querySelector('#MainContent')?.dataset.sqRefineV3Ready==='true',{timeout:20000})}catch{}
 await sleep(6500);
 const d=await p.evaluate(({root,mobile,expected})=>{
   const main=document.querySelector('#MainContent'),sidebar=main?.querySelector('.sq-refine-v3-sidebar'),results=main?.querySelector('.sq-refine-v3-results'),grid=results?.querySelector('.product-grid');
   const cards=grid?[...grid.querySelectorAll(':scope > .product-grid__item')].filter(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0&&!!el.querySelector('a[href*="/products/"]')}):[];
   const template=grid?getComputedStyle(grid).gridTemplateColumns:'',gridCols=template&&template!=='none'?template.trim().split(/\s+/).length:0,posCols=cards.length?new Set(cards.slice(0,8).map(el=>Math.round(el.getBoundingClientRect().left))).size:0,desired=mobile?2:3,colOk=gridCols===desired||(cards.length>=desired&&posCols===desired);
   const size=[...document.querySelectorAll('.sq-refine-v3-page-size input')].map(x=>x.value),groups=[...(sidebar?.querySelectorAll('details.sq-refine-v3-group')||[])],inactiveClosed=groups.filter(g=>g.dataset.active!=='true').every(g=>!g.open),activeOpen=groups.filter(g=>g.dataset.active==='true').every(g=>g.open),sticky=sidebar?getComputedStyle(sidebar).position:'';
   const isolation=document.querySelector('script[data-sq-refine-v3-legacy-isolation]')?.dataset.sqRefineV3LegacyIsolation||'';
   const legacy=[...document.querySelectorAll('[data-sq-refine-v3-hidden-nav="true"]')].filter(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0}).length;
   const falseSet=new Set(['all','stateside-quartermaster-logo-merch','air-national-guard-series','state-guard-series','rotc-series','jrotc-series','military-schools-academies','public-safety-series','army-national-guard-series']);
   const falseTargets=[...(sidebar?.querySelectorAll('input[data-kind="structural"][data-target]')||[])].map(i=>{try{return new URL(i.dataset.target,location.origin).pathname.split('/')[2]||''}catch{return''}}).filter(h=>falseSet.has(h)&&h!==root);
   const checks={path:location.pathname===expected,ready:main?.dataset.sqRefineV3Ready==='true',cleanup:main?.dataset.sqRefineV3RootCleanup==='true',isolation:isolation===root,sidebar:!!sidebar&&getComputedStyle(sidebar).display!=='none',title:(sidebar?.textContent||'').includes('Refine Products'),pageSizes:['50','100','250'].every(v=>size.includes(v)),default50:!!document.querySelector('.sq-refine-v3-page-size input[value="50"]:checked'),groups:groups.length>0,inactiveClosed,activeOpen,legacy:legacy===0,oldSize:[...document.querySelectorAll('.vac-page-size')].every(el=>getComputedStyle(el).display==='none'),falseTargets:falseTargets.length===0,grid:!!grid,cards:cards.length>0&&cards.length<=50,columns:colOk,nativeColumn:!!results?.querySelector('.sq-collection-products-column'),sticky:mobile?sticky!=='sticky':sticky==='sticky'};
   return {checks,error:main?.dataset.sqRefineV3Error||'',href:location.href,cards:cards.length,gridCols,posCols,template,groups:groups.length,structural:sidebar?.querySelectorAll('input[data-kind="structural"]').length||0,legacy,falseTargets,sticky,isolation};
 },{root,mobile,expected});
 const pass=(r?.status()||0)<400&&errors.length===0&&Object.values(d.checks).every(Boolean);
 await c.close(); return{viewport:mobile?'mobile':'desktop',http:r?.status()||0,errors,data:d,pass};
}
const b=await chromium.launch({headless:true});let failed=false;
for(const[root,name]of ROUTES){const desktop=await check(b,root,false),mobile=await check(b,root,true),pass=desktop.pass&&mobile.pass;console.log('ROUTE_RESULT '+JSON.stringify({root,name,desktop,mobile,pass}));if(!pass){failed=true;break}}
await b.close();if(failed)process.exit(1);
