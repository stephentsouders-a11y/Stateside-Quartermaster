import { chromium } from 'playwright'; import fs from 'fs';
const BASE='https://www.statesideqm.com', THEME='158900125851', OUT='sep18-section-cost-diagnostic'; fs.mkdirSync(OUT,{recursive:true});
const browser=await chromium.launch({headless:true}); const ctx=await browser.newContext({viewport:{width:1440,height:1000}}); const page=await ctx.newPage();
await page.goto(BASE+'/?preview_theme_id='+THEME,{waitUntil:'domcontentloaded',timeout:70000}); await page.waitForLoadState('load',{timeout:15000}).catch(()=>{}); await page.waitForTimeout(1500);
const theme=await page.evaluate(()=>({id:String(window.Shopify?.theme?.id||''),name:String(window.Shopify?.theme?.name||'')})); if(theme.id!==THEME) throw new Error('wrong theme '+JSON.stringify(theme));
await page.goto(BASE+'/collections/accessories-gifts-collectibles',{waitUntil:'domcontentloaded',timeout:70000}); await page.waitForLoadState('load',{timeout:16000}).catch(()=>{}); await page.waitForTimeout(1500);
const diag=await page.evaluate(()=>{
 const vis=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>1&&r.height>1};
 const sections=[...document.querySelectorAll('.shopify-section')].map((e,i)=>({
  i, id:e.id, cls:e.className, visible:vis(e), nodes:e.getElementsByTagName('*').length, scripts:e.querySelectorAll('script').length,
  styles:e.querySelectorAll('style,link[rel="stylesheet"]').length, images:e.querySelectorAll('img').length,
  anchors:e.querySelectorAll('a[href]').length, htmlBytes:new Blob([e.innerHTML]).size,
  text:(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,180)
 })).sort((a,b)=>b.nodes-a.nodes);
 const scripts=[...document.scripts].map((s,i)=>({i,src:s.src||'',type:s.type||'',defer:s.defer,async:s.async,inlineBytes:s.src?0:new Blob([s.textContent||'']).size,data:[...s.attributes].filter(a=>a.name.startsWith('data-')).map(a=>a.name+'='+a.value).join(';')})).sort((a,b)=>(b.inlineBytes||0)-(a.inlineBytes||0));
 const resources=performance.getEntriesByType('resource').map(r=>({name:r.name,initiator:r.initiatorType,duration:Math.round(r.duration),transfer:r.transferSize||0,decoded:r.decodedBodySize||0})).sort((a,b)=>b.duration-a.duration);
 const n=performance.getEntriesByType('navigation')[0];
 return {title:document.title,theme:{id:String(window.Shopify?.theme?.id||''),name:String(window.Shopify?.theme?.name||'')},nav:{ttfb:Math.round(n?.responseStart||0),dcl:Math.round(n?.domContentLoadedEventEnd||0),load:Math.round(n?.loadEventEnd||0)},total:{nodes:document.getElementsByTagName('*').length,scripts:document.scripts.length,styles:document.styleSheets.length,images:document.images.length,sections:sections.length},sections,scripts:scripts.slice(0,220),resources:resources.slice(0,220)};
});
fs.writeFileSync(OUT+'/diagnostic.json',JSON.stringify(diag,null,2)); await page.screenshot({path:OUT+'/accessories.png',fullPage:true});
console.log('DIAG_SUMMARY',JSON.stringify({nav:diag.nav,total:diag.total,topSections:diag.sections.slice(0,15),topInlineScripts:diag.scripts.filter(x=>!x.src).slice(0,15),topResources:diag.resources.slice(0,20)}));
await ctx.close(); await browser.close();