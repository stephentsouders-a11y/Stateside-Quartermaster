import { chromium } from 'playwright';import fs from 'fs';import path from 'path';
const BASE='https://www.statesideqm.com',THEME='158900125851',OUT='sep18-custom-shop-final-retry';fs.mkdirSync(path.join(OUT,'screenshots'),{recursive:true});const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function audit(route,key){
 let row=null;
 for(let attempt=1;attempt<=4;attempt++){
  const b=await chromium.launch({headless:true});const c=await b.newContext({viewport:{width:1440,height:1000}});const p=await c.newPage();p.setDefaultNavigationTimeout(70000);p.setDefaultTimeout(15000);
  const u=new URL(route,BASE);u.searchParams.set('preview_theme_id',THEME);let resp=null,error=null;
  try{resp=await p.goto(u.href,{waitUntil:'domcontentloaded',timeout:70000});if(resp?.status()===200){await p.waitForLoadState('load',{timeout:16000}).catch(()=>{});await sleep(1500)}}catch(e){error=String(e?.message||e)}
  const status=resp?.status()??0;const theme=await p.evaluate(()=>String(window.Shopify?.theme?.id||'')).catch(()=>'');
  if(status===200&&theme===THEME&&!error){
    const trigger=p.locator('[data-sq-context-categories] [data-sq-rail-trigger]').first();if(await trigger.isVisible().catch(()=>false)){await trigger.hover();await sleep(500)}
    const first=p.locator('[data-sq-context-categories-list] a[href]').first();if(await first.isVisible().catch(()=>false)){await first.hover();await sleep(2200)}
    row=await p.evaluate(({themeId,attempt,key})=>{const rail=document.querySelector('[data-sq-collection-rail]'),cats=[...document.querySelectorAll('[data-sq-context-categories-list] a[href]')].map(a=>(a.querySelector('.sq-collection-rail__link-label')?.textContent||a.textContent||'').replace(/\s+/g,' ').trim()),cascade=[...document.querySelectorAll('.sq-collection-rail__cascade-column')].map(x=>({title:(x.querySelector('h2')?.textContent||'').trim(),note:(x.querySelector('.sq-collection-rail__cascade-note')?.textContent||'').trim(),links:[...x.querySelectorAll('a[href]')].map(a=>(a.textContent||'').replace(/\s+/g,' ').trim())}));return{key,attempt,theme:String(window.Shopify?.theme?.id||''),previewOk:String(window.Shopify?.theme?.id||'')===themeId,departmentRoot:rail?.dataset.sqDepartmentRoot||'',persistentRoot:rail?.dataset.sqPersistentRoot||'',categories:cats,cascade,direct:document.querySelector('.sq-collection-rail__direct')?.href||'',brokenImages:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).length}}, {themeId:THEME,attempt,key});row.http=status;row.error=null;await p.screenshot({path:path.join(OUT,'screenshots',key+'.png'),fullPage:false}).catch(()=>{});await c.close();await b.close();break;
  }
  row={key,attempt,http:status,theme,error};await c.close();await b.close();if(attempt<4)await sleep(attempt*6500);
 }
 return row;
}
const root=await audit('/collections/custom-personalized-products?filter.v.availability=1&sq_root=custom-personalized-products','root');
const child=await audit('/collections/custom-patches?filter.v.availability=1&sq_root=custom-personalized-products','child');
const labels=['Custom Patches','Custom Apparel','Personalized Displays & Memorials','Nameplates, Tags & Uniform ID','Custom Flags & Guidons','Special-Order Gear'];
const ok=x=>x.http===200&&x.previewOk&&x.departmentRoot==='true'&&x.persistentRoot==='custom-personalized-products'&&labels.every(l=>x.categories.includes(l))&&x.direct.includes('/collections/custom-personalized-products')&&x.direct.includes('sq_root=custom-personalized-products')&&x.cascade.length>=2&&x.brokenImages===0;
const summary={root,child,pass:ok(root)&&ok(child)};fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(summary,null,2));console.log('CUSTOMSHOPFINAL',JSON.stringify(summary));if(!summary.pass)process.exitCode=2;