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
   const oldRemove=Element.prototype.remove;Element.prototype.remove=function(){if(hasV3(this))window.__sqRemovalLog.push({op:'remove',tag:this.tagName,cls:this.className,stack:(new Error()).stack});return oldRemove.apply(this,arguments)};
   const oldRC=Node.prototype.removeChild;Node.prototype.removeChild=function(n){if(hasV3(n))window.__sqRemovalLog.push({op:'removeChild',tag:n.tagName,cls:n.className,stack:(new Error()).stack});return oldRC.apply(this,arguments)};
   const oldRep=Element.prototype.replaceChildren;Element.prototype.replaceChildren=function(){if(hasV3(this)||[...arguments].some(hasV3))window.__sqRemovalLog.push({op:'replaceChildren',tag:this.tagName,cls:this.className,stack:(new Error()).stack});return oldRep.apply(this,arguments)};
 });
 const r=await p.goto(URL,{waitUntil:'domcontentloaded',timeout:45000});await sleep(9000);
 const d=await p.evaluate(()=>{
   const main=document.querySelector('#MainContent');
   const scripts=[...document.scripts].map((s,i)=>({i,marker:[...s.attributes].filter(a=>a.name.startsWith('data-sq')).map(a=>a.name+'='+a.value).join(' '),src:s.src||'',text:s.textContent||''}));
   const hits=scripts.filter(s=>/air-national-guard-series|products-built-for-the-line-u-s-air-force|\.replaceChildren\(|\.remove\(|removeChild\(|innerHTML\s*=|MainContent/i.test(s.text)).map(s=>{const m=s.text.match(/air-national-guard-series|products-built-for-the-line-u-s-air-force|\.replaceChildren\(|\.remove\(|removeChild\(|innerHTML\s*=|MainContent/i),k=m?m.index:0;return{i:s.i,marker:s.marker,src:s.src,around:s.text.slice(Math.max(0,k-1300),Math.min(s.text.length,k+2600))}});
   return {href:location.href,ready:main?.dataset.sqRefineV3Ready||'',cleanup:main?.dataset.sqRefineV3RootCleanup||'',error:main?.dataset.sqRefineV3Error||'',isolation:document.querySelector('script[data-sq-refine-v3-legacy-isolation]')?.dataset.sqRefineV3LegacyIsolation||'',layout:!!main?.querySelector('.sq-refine-v3-layout'),sidebar:!!main?.querySelector('.sq-refine-v3-sidebar'),results:!!main?.querySelector('.sq-refine-v3-results'),allProducts:main?.querySelectorAll('.product-grid__item a[href*="/products/"]').length||0,removalLog:window.__sqRemovalLog||[],hits};
 });
 console.log('ANG_DIAG '+JSON.stringify({name,http:r?.status()||0,errors,data:d},null,2));await c.close();
}
await b.close();
