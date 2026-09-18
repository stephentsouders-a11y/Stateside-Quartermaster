import { chromium } from 'playwright';import fs from 'fs';import path from 'path';
const BASE='https://www.statesideqm.com',THEME='158900125851',key=process.env.KEY,label=process.env.LABEL,route=process.env.ROUTE,OUT='sep18-sg-sidebar-audit-'+key;fs.mkdirSync(path.join(OUT,'screenshots'),{recursive:true});
const b=await chromium.launch({headless:true});const c=await b.newContext({viewport:{width:1440,height:1000}});const p=await c.newPage();p.setDefaultNavigationTimeout(70000);p.setDefaultTimeout(18000);const errors=[];p.on('pageerror',e=>errors.push('pageerror: '+String(e)));p.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text().slice(0,500))});
let resp=null,error=null,attempt=0;const started=Date.now();for(attempt=1;attempt<=4;attempt++){const u=new URL(route,BASE);u.searchParams.set('preview_theme_id',THEME);try{resp=await p.goto(u.href,{waitUntil:'domcontentloaded',timeout:70000});const s=resp?.status()||0;if(s===429||s===503){await p.waitForTimeout(attempt*12000);continue}await p.waitForLoadState('load',{timeout:16000}).catch(()=>{});await p.waitForTimeout(1300);break}catch(e){error=String(e?.message||e);if(attempt<4)await p.waitForTimeout(attempt*10000)}}
const theme=await p.evaluate(()=>({id:String(window.Shopify?.theme?.id||''),name:String(window.Shopify?.theme?.name||'')})).catch(()=>({id:'',name:''}));
const trigger=p.locator('[data-sq-context-categories] [data-sq-rail-trigger]').first();
let triggerVisible=false,categories=[],categoryAudits=[];
try{
 triggerVisible=await trigger.isVisible();
 if(triggerVisible){await trigger.hover();await trigger.focus();await p.waitForTimeout(1200)}
 categories=await p.locator('[data-sq-context-categories-list] a[href]').evaluateAll(as=>as.filter(a=>{const r=a.getBoundingClientRect(),s=getComputedStyle(a);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'}).map(a=>({label:(a.textContent||'').replace(/\s+/g,' ').trim(),href:a.href})));
 for(let i=0;i<categories.length;i++){
   const links=p.locator('[data-sq-context-categories-list] a[href]');
   const a=links.nth(i);
   try{await a.hover();await a.focus();await p.waitForTimeout(180)}catch{}
   const sub=await p.locator('.sq-collection-rail__cascade-column').nth(0).locator('a[href]').evaluateAll(as=>as.filter(a=>{const r=a.getBoundingClientRect(),s=getComputedStyle(a);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'}).map(a=>({label:(a.textContent||'').replace(/\s+/g,' ').trim(),href:a.href}))).catch(()=>[]);
   const typeSamples=[];
   for(let j=0;j<Math.min(sub.length,12);j++){
     const sas=p.locator('.sq-collection-rail__cascade-column').nth(0).locator('a[href]');
     try{await sas.nth(j).hover();await sas.nth(j).focus();await p.waitForTimeout(100)}catch{}
     const types=await p.locator('.sq-collection-rail__cascade-column').nth(1).locator('a[href]').evaluateAll(as=>as.filter(a=>{const r=a.getBoundingClientRect(),s=getComputedStyle(a);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'}).map(a=>({label:(a.textContent||'').replace(/\s+/g,' ').trim(),href:a.href}))).catch(()=>[]);
     typeSamples.push({subcategory:sub[j],types});
   }
   categoryAudits.push({category:categories[i],subcategories:sub,typeSamples});
 }
}catch(e){error=(error?error+' | ':'')+'sidebar:'+String(e?.message||e)}
const metrics=await p.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0],rs=performance.getEntriesByType('resource');return{ttfbMs:Math.round(n?.responseStart||0),dclMs:Math.round(n?.domContentLoadedEventEnd||0),loadMs:Math.round(n?.loadEventEnd||0),resources:rs.length,transferBytes:rs.reduce((s,r)=>s+(r.transferSize||0),0),domNodes:document.getElementsByTagName('*').length,productCards:document.querySelectorAll('[data-testid="product-grid"] .product-grid__item').length,brokenImages:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).length}});
await p.screenshot({path:path.join(OUT,'screenshots','sidebar.png'),fullPage:false}).catch(()=>{});
const invalidHrefs=[];for(const ca of categoryAudits){for(const x of [ca.category,...ca.subcategories,...ca.typeSamples.flatMap(t=>t.types)]){if(!x?.href)continue;try{const h=new URL(x.href);if(h.origin!==new URL(BASE).origin||!/^\/collections\//.test(h.pathname))invalidHrefs.push(x)}catch{invalidHrefs.push(x)}}}
const sidebarApplicable=true;const row={key,label,route,sidebarApplicable,httpStatus:resp?.status()??null,error,theme,triggerVisible,categories,categoryAudits,categoryCount:categories.length,subcategoryCount:categoryAudits.reduce((s,x)=>s+x.subcategories.length,0),typeCount:categoryAudits.reduce((s,x)=>s+x.typeSamples.reduce((q,t)=>q+t.types.length,0),0),invalidHrefs,errors:errors.slice(0,30),elapsedMs:Date.now()-started,...metrics,previewOk:theme.id===THEME};
fs.writeFileSync(path.join(OUT,'result.json'),JSON.stringify(row,null,2));console.log('SGSIDEBARAUDIT',JSON.stringify({key,label,route,httpStatus:row.httpStatus,previewOk:row.previewOk,triggerVisible,categoryCount:row.categoryCount,subcategoryCount:row.subcategoryCount,typeCount:row.typeCount,invalidHrefs:invalidHrefs.length,errors:row.errors.length,brokenImages:row.brokenImages,loadMs:row.loadMs,ttfbMs:row.ttfbMs,transferKB:Math.round(row.transferBytes/1024),categories:categories.map(x=>x.label)}));
if(row.httpStatus!==200||!row.previewOk||error||(row.sidebarApplicable&&!triggerVisible)||invalidHrefs.length||row.brokenImages)process.exitCode=2;await c.close();await b.close();