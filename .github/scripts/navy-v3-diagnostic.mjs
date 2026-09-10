import { chromium } from 'playwright';
const BASE='https://www.statesideqm.com/collections/products-built-for-the-line-u-s-navy?preview_theme_id=158561894555';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await chromium.launch({headless:true});
const ctx=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await ctx.newPage();
const response=await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:45000});
await sleep(1000);
const data=await page.evaluate(()=>{
  const src=document.querySelector('script[data-sqbfl-unified-tree-v2]')?.textContent||'';
  function around(term,span=3500){const i=src.indexOf(term);return i<0?null:src.slice(Math.max(0,i-span),Math.min(src.length,i+span));}
  const terms=['function finish','finish=function','replaceChildren(','MutationObserver','progress-pages','data-sqbfl-load-state'];
  return {http:document.readyState,sourceLength:src.length,windows:terms.map(term=>({term,index:src.indexOf(term),text:around(term)}))};
});
console.log('NAVY_FINISH_SOURCE '+JSON.stringify({status:response?.status()||0,data}));
await ctx.close();await browser.close();