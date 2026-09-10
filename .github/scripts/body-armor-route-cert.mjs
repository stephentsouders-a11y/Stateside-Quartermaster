import { chromium } from 'playwright';
const URL='https://www.statesideqm.com/collections/army-national-guard-series?preview_theme_id=158561894555';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const b=await chromium.launch({headless:true});
for(const [name,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
 const c=await b.newContext({viewport}); const p=await c.newPage(); const errors=[],nav=[];
 p.on('pageerror',e=>errors.push({message:e.message,stack:e.stack||''}));
 p.on('framenavigated',f=>{if(f===p.mainFrame())nav.push(f.url())});
 let r=await p.goto(URL,{waitUntil:'domcontentloaded',timeout:45000}); await sleep(9000);
 const d=await p.evaluate(()=>{
   const main=document.querySelector('#MainContent');
   const scripts=[...document.scripts].map((s,i)=>({i,marker:[...s.attributes].filter(a=>a.name.startsWith('data-sq')).map(a=>a.name+'='+a.value).join(' '),src:s.src||'',text:s.textContent||''}));
   const hits=scripts.filter(s=>/army-national-guard-series|products-built-for-the-line-u-s-army|location\.(?:assign|replace)|history\.(?:pushState|replaceState)/i.test(s.text)).map(s=>{
      const m=s.text.match(/army-national-guard-series|products-built-for-the-line-u-s-army|location\.(?:assign|replace)|history\.(?:pushState|replaceState)/i); const k=m?m.index:0;
      return {i:s.i,marker:s.marker,src:s.src,around:s.text.slice(Math.max(0,k-1800),Math.min(s.text.length,k+3600))};
   });
   const iso=[...document.querySelectorAll('script[data-sq-refine-v3-legacy-isolation]')].map(s=>s.dataset.sqRefineV3LegacyIsolation);
   const v3=[...document.querySelectorAll('script[data-sq-refine-v3]')].map(s=>s.dataset.currentHandle);
   const components=[...document.querySelectorAll('#MainContent collection-component')].map((cc,i)=>({i,inResults:!!cc.closest('.sq-refine-v3-results'),products:cc.querySelectorAll('.product-grid__item a[href*="/products/"]').length,parent:cc.parentElement?.className||''}));
   return {href:location.href,path:location.pathname,title:document.title,h1:document.querySelector('h1')?.textContent?.trim()||'',ready:main?.dataset.sqRefineV3Ready||'',cleanup:main?.dataset.sqRefineV3RootCleanup||'',error:main?.dataset.sqRefineV3Error||'',iso,v3,resultsProducts:main?.querySelectorAll('.sq-refine-v3-results .product-grid__item a[href*="/products/"]').length||0,allProducts:main?.querySelectorAll('.product-grid__item a[href*="/products/"]').length||0,components,hits};
 });
 console.log('ARNG_DIAG '+JSON.stringify({name,http:r?.status()||0,responseUrl:r?.url()||'',nav,errors,data:d},null,2));
 await c.close();
}
await b.close();
