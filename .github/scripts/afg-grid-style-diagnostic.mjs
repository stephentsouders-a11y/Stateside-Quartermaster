import { chromium } from 'playwright';
const url='https://www.statesideqm.com/collections/armed-forces-gear?preview_theme_id=158561894555';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
await page.goto(url,{waitUntil:'domcontentloaded',timeout:40000});
await page.waitForFunction(()=>document.querySelector('#MainContent')?.dataset.sqRefineV3RouteFix==='armed-forces-gear',{timeout:45000});
const data=await page.evaluate(()=>{
 const info=el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return{tag:el.tagName.toLowerCase(),id:el.id||'',class:String(el.className||''),display:s.display,visibility:s.visibility,opacity:s.opacity,width:r.width,height:r.height,position:s.position,overflow:s.overflow,contentVisibility:s.contentVisibility,hidden:el.hidden,ariaHidden:el.getAttribute('aria-hidden'),style:el.getAttribute('style')||''}};
 const grid=document.querySelector('#MainContent .product-grid');
 const ancestors=[];let n=grid;while(n&&n!==document.documentElement){ancestors.push(info(n));n=n.parentElement}
 return{ancestors,styles:[...document.styleSheets].map((sheet)=>{try{return[...sheet.cssRules].filter(r=>r.cssText&&(/product-grid|collection-component|ResultsList|armed-forces|sq-afg/i.test(r.cssText))).map(r=>r.cssText)}catch{return[]}}).flat().slice(0,250)};
});
console.log(JSON.stringify(data,null,2));
await browser.close();
