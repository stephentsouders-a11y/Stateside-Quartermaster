import { chromium } from 'playwright';
const URL='https://www.statesideqm.com/collections/air-national-guard-series?preview_theme_id=158561894555';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const b=await chromium.launch({headless:true});
for(const [name,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
 const c=await b.newContext({viewport}); const p=await c.newPage(); const errors=[];
 p.on('pageerror',e=>errors.push({message:e.message,stack:e.stack||''}));
 await p.addInitScript(()=>{
   window.__sqRemovalLog=[];
   function hasV3(n){try{return !!(n&&n.nodeType===1&&(n.matches?.('.sq-refine-v3-layout,.sq-refine-v3-sidebar,.sq-refine-v3-results')||n.querySelector?.('.sq-refine-v3-layout,.sq-refine-v3-sidebar,.sq-refine-v3-results')))}catch{return false}}
   function log(op,n){if(hasV3(n))window.__sqRemovalLog.push({op,tag:n?.tagName||'',cls:String(n?.className||''),stack:(new Error()).stack?.split('\n').slice(1,8).join('\n')||''})}
   const oldRemove=Element.prototype.remove;Element.prototype.remove=function(){log('remove',this);return oldRemove.apply(this,arguments)};
   const oldRC=Node.prototype.removeChild;Node.prototype.removeChild=function(n){log('removeChild',n);return oldRC.apply(this,arguments)};
   const oldRep=Element.prototype.replaceChildren;Element.prototype.replaceChildren=function(){log('replaceChildren-host',this);for(const n of arguments)log('replaceChildren-arg',n);return oldRep.apply(this,arguments)};
 });
 const r=await p.goto(URL,{waitUntil:'domcontentloaded',timeout:45000});
 const life=[];for(const ms of [300,700,1500,3000,6000,9000]){await sleep(ms-(life.length?[300,700,1500,3000,6000][life.length-1]:0));life.push(await p.evaluate(()=>{const m=document.querySelector('#MainContent');return{t:performance.now().toFixed(0),ready:m?.dataset.sqRefineV3Ready||'',layout:!!m?.querySelector('.sq-refine-v3-layout'),sidebar:!!m?.querySelector('.sq-refine-v3-sidebar'),results:!!m?.querySelector('.sq-refine-v3-results'),products:m?.querySelectorAll('.product-grid__item a[href*="/products/"]').length||0}}))}
 const d=await p.evaluate(()=>{const m=document.querySelector('#MainContent');return{href:location.href,ready:m?.dataset.sqRefineV3Ready||'',cleanup:m?.dataset.sqRefineV3RootCleanup||'',error:m?.dataset.sqRefineV3Error||'',isolation:document.querySelector('script[data-sq-refine-v3-legacy-isolation]')?.dataset.sqRefineV3LegacyIsolation||'',removals:(window.__sqRemovalLog||[]).slice(0,12)}});
 console.log('ANG_TRACE '+JSON.stringify({name,http:r?.status()||0,errors,life,data:d}));await c.close();
}
await b.close();
