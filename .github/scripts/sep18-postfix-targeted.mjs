import { chromium } from 'playwright'; import fs from 'fs'; import path from 'path';
const BASE='https://www.statesideqm.com', THEME='158900125851', OUT='sep18-postfix-targeted'; fs.mkdirSync(path.join(OUT,'screenshots'),{recursive:true});
const routes=[
  {label:'Accessories',route:'/collections/accessories-gifts-collectibles'},
  {label:'Airsoft',route:'/collections/airsoft-milsim'},
  {label:'Apparel',route:'/collections/apparel'},
  {label:'State Guard Root',route:'/collections/state-guard-series'},
  {label:'Ohio State Guard',route:'/collections/state-guard-series-ohio'}
];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await chromium.launch({headless:true}); const ctx=await browser.newContext({viewport:{width:1365,height:900}});
const page=await ctx.newPage(); page.setDefaultNavigationTimeout(70000);
let r=await page.goto(BASE+'/?preview_theme_id='+THEME,{waitUntil:'domcontentloaded',timeout:70000}); await page.waitForLoadState('load',{timeout:15000}).catch(()=>{}); await sleep(1500);
const established=await page.evaluate(()=>({id:String(window.Shopify?.theme?.id||''),name:String(window.Shopify?.theme?.name||'')})); if(established.id!==THEME) throw new Error('wrong preview '+JSON.stringify(established));
const rows=[];
for(let i=0;i<routes.length;i++){
  const item=routes[i]; let response=null;
  for(let a=1;a<=3;a++){
    response=await page.goto(BASE+item.route,{waitUntil:'domcontentloaded',timeout:70000}).catch(()=>null);
    if(response?.status()!==429) break;
    await sleep(a===1?18000:35000);
    await page.goto(BASE+'/?preview_theme_id='+THEME,{waitUntil:'domcontentloaded',timeout:70000}).catch(()=>{});
    await sleep(2000);
  }
  await page.waitForLoadState('load',{timeout:15000}).catch(()=>{}); await sleep(900);
  const theme=await page.evaluate(()=>({id:String(window.Shopify?.theme?.id||''),name:String(window.Shopify?.theme?.name||'')}));
  const m=await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0],rs=performance.getEntriesByType('resource'),f=performance.getEntriesByName('first-contentful-paint')[0];return{ttfbMs:Math.round(n?.responseStart||0),dclMs:Math.round(n?.domContentLoadedEventEnd||0),loadMs:Math.round(n?.loadEventEnd||0),fcpMs:Math.round(f?.startTime||0),resources:rs.length,transferBytes:rs.reduce((s,r)=>s+(r.transferSize||0),0),domNodes:document.getElementsByTagName('*').length,scripts:document.scripts.length,images:document.images.length,h1:(document.querySelector('h1')?.textContent||'').replace(/\s+/g,' ').trim(),stateGuardRoot:document.querySelectorAll('[data-sq-state-guard-root]').length,rail:document.querySelectorAll('[data-sq-collection-rail]').length}}).catch(()=>({}));
  const row={...item,status:response?.status()??null,theme,...m}; rows.push(row); console.log('POSTFIX',JSON.stringify(row));
  await page.screenshot({path:path.join(OUT,'screenshots',String(i+1).padStart(2,'0')+'-'+item.label.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.png'),fullPage:false}).catch(()=>{});
  await sleep(5000);
}
fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({generatedAt:new Date().toISOString(),theme:established,rows},null,2));
console.log('SUMMARY',JSON.stringify(rows.map(x=>({label:x.label,status:x.status,theme:x.theme.id,ttfb:x.ttfbMs,dcl:x.dclMs,load:x.loadMs,fcp:x.fcpMs,kb:Math.round((x.transferBytes||0)/1024),resources:x.resources,dom:x.domNodes,stateGuardRoot:x.stateGuardRoot,rail:x.rail}))));
await ctx.close();await browser.close();