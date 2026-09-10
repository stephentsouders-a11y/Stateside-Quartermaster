import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const URL='https://www.statesideqm.com/collections/dive-scuba?preview_theme_id=158561894555';
const OUT='cert-dive-scuba';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function inspect(page,mobile){
 const errs=[];page.on('pageerror',e=>errs.push({type:'pageerror',message:e.message,stack:e.stack||''}));
 let r=await page.goto(URL,{waitUntil:'domcontentloaded',timeout:45000});await page.waitForTimeout(2200);
 const data=await page.evaluate(()=>{
  const vis=el=>{if(!el)return false;const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0&&r.width>0&&r.height>0};
  const desc=el=>{if(!el)return null;const s=getComputedStyle(el),r=el.getBoundingClientRect();return{tag:el.tagName,id:el.id,cls:String(el.className||'').slice(0,250),hidden:el.hidden,aria:el.getAttribute('aria-hidden'),display:s.display,visibility:s.visibility,opacity:s.opacity,width:r.width,height:r.height,parent:el.parentElement?{tag:el.parentElement.tagName,id:el.parentElement.id,cls:String(el.parentElement.className||'').slice(0,250),hidden:el.parentElement.hidden,display:getComputedStyle(el.parentElement).display}:null}};
  const m=document.querySelector('#MainContent'),res=m?.querySelector('.sq-refine-v3-results');
  const allGrids=[...document.querySelectorAll('.product-grid')];
  const comps=[...document.querySelectorAll('collection-component')];
  const marked=[...document.querySelectorAll('[data-sq-refine-v3-hidden-nav="true"]')];
  const ancestors=[];let p=res;while(p&&ancestors.length<8){ancestors.push(desc(p));p=p.parentElement}
  return{
    ready:m?.dataset.sqRefineV3Ready||'',active:m?.classList.contains('sq-refine-v3-active')||false,cleanup:m?.dataset.sqRefineV3RootCleanup||'',isolation:document.querySelector('[data-sq-refine-v3-legacy-isolation]')?.getAttribute('data-sq-refine-v3-legacy-isolation')||'',
    results:desc(res),resultsHTML:res?.innerHTML.slice(0,5000)||'',ancestors,
    allGrids:allGrids.map((x,i)=>({i,visible:vis(x),desc:desc(x),insideResults:!!x.closest('.sq-refine-v3-results'),cards:x.querySelectorAll(':scope>.product-grid__item').length})),
    comps:comps.map((x,i)=>({i,visible:vis(x),desc:desc(x),insideResults:!!x.closest('.sq-refine-v3-results'),gridCount:x.querySelectorAll('.product-grid').length})),
    marked:marked.map((x,i)=>({i,visible:vis(x),desc:desc(x),insideResults:!!x.closest('.sq-refine-v3-results'),text:(x.textContent||'').trim().slice(0,160)})),
    selectors:{resultsList:desc(document.querySelector('#ResultsList')),mainCollectionProductGrid:desc(document.querySelector('#product-grid')),productGridContainer:desc(document.querySelector('[data-product-grid-container]'))}
  };
 });
 data.http=r?.status()||0;data.pageerrors=errs;return data;
}
await fs.mkdir(OUT,{recursive:true});const browser=await chromium.launch({headless:true});const report={};for(const [n,v,m] of [['desktop',{width:1440,height:1000},false],['mobile',{width:390,height:844},true]]){const c=await browser.newContext({viewport:v});const p=await c.newPage();report[n]=await inspect(p,m);await p.screenshot({path:`${OUT}/${n}.png`,fullPage:true});await c.close()}await browser.close();await fs.writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));process.exitCode=1;
