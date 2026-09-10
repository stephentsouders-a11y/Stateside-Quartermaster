import { chromium } from 'playwright';
const BASE='https://www.statesideqm.com',PREVIEW='158561894555';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const b=await chromium.launch({headless:true});
const c=await b.newContext({viewport:{width:1440,height:1000}});const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push({message:e.message,stack:e.stack||''}));
const ang=`${BASE}/collections/air-national-guard-series?preview_theme_id=${PREVIEW}`;let r=await p.goto(ang,{waitUntil:'domcontentloaded',timeout:45000});await sleep(10000);
const data=await p.evaluate(async PREVIEW=>{
 const main=document.querySelector('#MainContent');
 async function probe(url){try{const r=await fetch(url,{credentials:'same-origin'}),html=await r.text(),doc=new DOMParser().parseFromString(html,'text/html'),grid=doc.querySelector('.product-grid');return{url,status:r.status,final:r.url,len:html.length,grid:!!grid,cards:grid?[...grid.querySelectorAll(':scope > .product-grid__item')].filter(x=>x.querySelector('a[href*="/products/"]')).length:0,title:doc.title,h1:doc.querySelector('h1')?.textContent?.trim()||''}}catch(e){return{url,error:String(e)}}}
 const af=`/collections/products-built-for-the-line-u-s-air-force?preview_theme_id=${PREVIEW}`;
 const afview=`/collections/products-built-for-the-line-u-s-air-force?preview_theme_id=${PREVIEW}&view=sq-refine-v3-products&page=1`;
 const angview=`/collections/air-national-guard-series?preview_theme_id=${PREVIEW}&view=sq-refine-v3-products&page=1`;
 return{href:location.href,httpDocument:document.title,ready:main?.dataset.sqRefineV3Ready||'',cleanup:main?.dataset.sqRefineV3RootCleanup||'',angParity:main?.dataset.sqAngV3Parity||'',angParityCount:main?.dataset.sqAngV3ParityCount||'',preloadMarker:!!document.querySelector('script[data-sq-air-force-semantic-preload]'),repairMarker:!!document.querySelector('script[data-sq-ang-v3-parity-repair]'),preloadFlag:!!window.__sqAirForceSemanticPreload,repairFlag:!!window.__sqAngV3ParityRepair,fetchParityFlag:!!window.__sqAngV3ParitySource,liveCards:main?.querySelectorAll('.sq-refine-v3-results .product-grid__item a[href*="/products/"]').length||0,probes:[await probe(af),await probe(afview),await probe(angview)]};
},PREVIEW);
console.log('ANG_SOURCE_DIAG '+JSON.stringify({http:r?.status()||0,errors,data},null,2));await c.close();await b.close();
