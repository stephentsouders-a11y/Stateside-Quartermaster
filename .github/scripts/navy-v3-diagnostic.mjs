import { chromium } from 'playwright';
const BASE='https://www.statesideqm.com/collections/products-built-for-the-line-u-s-navy?preview_theme_id=158561894555';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await chromium.launch({headless:true});
for(const mobile of [false,true]){
  const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000}});
  const page=await ctx.newPage();
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
  const response=await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:45000});
  await sleep(18000);
  const data=await page.evaluate(()=>{
    const main=document.querySelector('#MainContent');
    const grid=main?.querySelector('.sq-refine-v3-results .product-grid');
    const cards=grid?[...grid.querySelectorAll(':scope>.product-grid__item')].filter(x=>x.querySelector('a[href*="/products/"]')).length:0;
    const cols=grid?getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length:0;
    return {href:location.href,ready:main?.dataset.sqRefineV3Ready||'',error:main?.dataset.sqRefineV3Error||'',layout:main?.querySelectorAll('.sq-refine-v3-layout').length||0,sidebar:main?.querySelectorAll('.sq-refine-v3-sidebar').length||0,results:main?.querySelectorAll('.sq-refine-v3-results').length||0,cards,cols,legacy:main?.querySelectorAll(':scope>.sqbfl').length||0,legacyRoot:main?.querySelectorAll('[data-sqbfl-root]').length||0,isolation:[...document.querySelectorAll('script[data-sq-refine-v3-legacy-isolation]')].length,recoveryRoute:window.__sqBflRecoveryRouteV4,serverRecoveryRoute:window.__sqBflServerRecoveryRouteV3};
  });
  console.log('NAVY_SURVIVAL '+JSON.stringify({viewport:mobile?'mobile':'desktop',http:response?.status()||0,pageErrors,data}));
  if(response?.status()!==200||pageErrors.length||data.ready!=='true'||data.layout!==1||data.sidebar!==1||data.results!==1||data.cards<1||data.legacy!==0||data.cols!==(mobile?2:3))process.exitCode=1;
  await ctx.close();
}
await browser.close();