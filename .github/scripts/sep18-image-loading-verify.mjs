import { chromium } from 'playwright'; import fs from 'fs'; import path from 'path';
const BASE='https://www.statesideqm.com', THEME='158900125851';
const key=process.env.KEY,label=process.env.LABEL,route=process.env.ROUTE,group=process.env.GROUP;
const OUT='sep18-image-loading-verify-'+key; fs.mkdirSync(path.join(OUT,'screenshots'),{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.addInitScript(()=>{window.__sqLcp=0;try{new PerformanceObserver(l=>{for(const e of l.getEntries())window.__sqLcp=Math.max(window.__sqLcp,e.startTime||0)}).observe({type:'largest-contentful-paint',buffered:true})}catch{}});
const page=await context.newPage(); page.setDefaultNavigationTimeout(70000);
const u=new URL(route,BASE); u.searchParams.set('preview_theme_id',THEME);
const requests=[]; page.on('request',r=>{requests.push({url:r.url(),type:r.resourceType()})});
let response=null,error=null;
try{
 response=await page.goto(u.href,{waitUntil:'domcontentloaded',timeout:70000});
 await page.waitForLoadState('load',{timeout:16000}).catch(()=>{});
 await page.waitForTimeout(1500);
}catch(e){error=String(e?.message||e)}
const row=await page.evaluate(({label,route,group,requests,themeId})=>{
 const n=performance.getEntriesByType('navigation')[0],rs=performance.getEntriesByType('resource'),f=performance.getEntriesByName('first-contentful-paint')[0],grid=document.querySelector('[data-testid="product-grid"]');
 const imgs=[...document.images];
 return {
  label,route,group,
  theme:{id:String(window.Shopify?.theme?.id||''),name:String(window.Shopify?.theme?.name||'')},
  ttfbMs:Math.round(n?.responseStart||0),dclMs:Math.round(n?.domContentLoadedEventEnd||0),loadMs:Math.round(n?.loadEventEnd||0),
  fcpMs:Math.round(f?.startTime||0),lcpMs:Math.round(window.__sqLcp||0),
  resources:rs.length,transferBytes:rs.reduce((s,r)=>s+(r.transferSize||0),0),
  imageResourceCount:rs.filter(r=>r.initiatorType==='img').length,
  imageTransferBytes:rs.filter(r=>r.initiatorType==='img').reduce((s,r)=>s+(r.transferSize||0),0),
  domNodes:document.getElementsByTagName('*').length,styles:document.querySelectorAll('style').length,scripts:document.scripts.length,
  images:imgs.length,loadedImages:imgs.filter(i=>i.complete&&i.naturalWidth>0).length,brokenImages:imgs.filter(i=>i.complete&&i.naturalWidth===0).length,
  eagerImages:imgs.filter(i=>i.loading==='eager').length,lazyImages:imgs.filter(i=>i.loading==='lazy').length,
  cards:grid?.querySelectorAll('.product-grid__item').length||0,lastPage:grid?.dataset.lastPage||'',
  h1:(document.querySelector('h1')?.textContent||'').replace(/\s+/g,' ').trim(),previewOk:String(window.Shopify?.theme?.id||'')===themeId,
  page2Section:requests.filter(x=>x.url.includes('section_id=')&&/[?&]page=2(?:&|$)/.test(x.url)).length
 }
},{label,route,group,requests,themeId:THEME});
row.httpStatus=response?.status()??null; row.error=error;
fs.writeFileSync(path.join(OUT,'result.json'),JSON.stringify(row,null,2));
await page.screenshot({path:path.join(OUT,'screenshots','result.png'),fullPage:false}).catch(()=>{});
console.log('IMAGEVERIFY',JSON.stringify({...row,transferKB:Math.round((row.transferBytes||0)/1024),imageKB:Math.round((row.imageTransferBytes||0)/1024)}));
if(row.httpStatus!==200||!row.previewOk||error)process.exitCode=2;
await context.close();await browser.close();