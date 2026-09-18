import { chromium } from 'playwright';import fs from 'fs';import path from 'path';
const BASE='https://www.statesideqm.com',THEME='158900125851',OUT='sep18-custom-shop-behavior-v2';fs.mkdirSync(path.join(OUT,'screenshots'),{recursive:true});
const expected=[
['All Custom Products','custom-personalized-products'],
['Custom Patches','custom-patches'],
['Custom Apparel','custom-apparel'],
['Personalized Displays & Memorials','personalized-displays-memorials'],
['Nameplates, Tags & Uniform ID','custom-nameplates-tags-uniform-id'],
['Custom Flags & Guidons','custom-flags-guidons'],
['Special-Order Gear','special-order-personalized-gear']
];
const expectedLabels=expected.slice(1).map(x=>x[0]);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function make(viewport={width:1440,height:1000}){const b=await chromium.launch({headless:true});const c=await b.newContext({viewport});const p=await c.newPage();p.setDefaultNavigationTimeout(70000);p.setDefaultTimeout(15000);return{b,c,p}}
async function nav(p,route){const u=new URL(route,BASE);u.searchParams.set('preview_theme_id',THEME);const r=await p.goto(u.href,{waitUntil:'domcontentloaded',timeout:70000});await p.waitForLoadState('load',{timeout:16000}).catch(()=>{});await sleep(1500);return r}

const pr=await make({width:680,height:1000});let resp=await nav(pr.p,'/pages/custom-unit-gear');
const page=await pr.p.evaluate(({expected,themeId})=>{
 const cards=[...document.querySelectorAll('.custom-unit-gear-page a.custom-unit-card')].map(a=>{const r=a.getBoundingClientRect(),cs=getComputedStyle(a),u=new URL(a.href,location.origin);return{
  title:(a.querySelector('strong')?.textContent||'').trim(),handle:u.pathname.split('/').filter(Boolean).pop()||'',root:u.searchParams.get('sq_root')||'',
  transformed:a.classList.contains('sq-custom-home-card'),background:cs.backgroundColor,color:cs.color,padding:cs.padding,width:Math.round(r.width),height:Math.round(r.height)
 }});
 return{
  theme:String(window.Shopify?.theme?.id||''),previewOk:String(window.Shopify?.theme?.id||'')===themeId,cards,
  originalLook:cards.length===expected.length&&cards.every(x=>!x.transformed&&x.background==='rgb(255, 255, 255)'&&x.height<180),
  linksOk:expected.every(([t,h])=>cards.some(x=>x.title===t&&x.handle===h&&x.root==='custom-personalized-products')),
  form:!!document.querySelector('#custom_unit_contact_form'),brokenImages:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).length
 }
},{expected,themeId:THEME});page.http=resp.status();await pr.p.screenshot({path:path.join(OUT,'screenshots','custom-page.png'),fullPage:true});await pr.c.close();await pr.b.close();

async function audit(route,key){
 const run=await make();const response=await nav(run.p,route);
 const trigger=run.p.locator('[data-sq-context-categories] [data-sq-rail-trigger]').first();
 const triggerVisible=await trigger.isVisible().catch(()=>false);
 if(triggerVisible){await trigger.hover();await sleep(500)}
 const first=run.p.locator('[data-sq-context-categories-list] a[href]').first();
 const firstVisible=await first.isVisible().catch(()=>false);
 if(firstVisible){await first.hover();await sleep(1400)}
 const result=await run.p.evaluate(({themeId,expectedLabels})=>{
  const rail=document.querySelector('[data-sq-collection-rail]');
  const catItem=document.querySelector('[data-sq-context-categories]');
  const cats=[...document.querySelectorAll('[data-sq-context-categories-list] a[href]')].map(a=>({
   label:(a.querySelector('.sq-collection-rail__link-label')?.textContent||a.textContent||'').replace(/\s+/g,' ').trim(),
   href:a.href,current:a.getAttribute('aria-current')||''
  }));
  const direct=document.querySelector('.sq-collection-rail__direct');
  const cascade=[...document.querySelectorAll('.sq-collection-rail__cascade-column')].map(col=>({
   title:(col.querySelector('h2')?.textContent||'').trim(),
   note:(col.querySelector('.sq-collection-rail__cascade-note')?.textContent||'').trim(),
   links:[...col.querySelectorAll('a[href]')].map(a=>(a.textContent||'').replace(/\s+/g,' ').trim())
  }));
  return{
   theme:String(window.Shopify?.theme?.id||''),previewOk:String(window.Shopify?.theme?.id||'')===themeId,
   hasRail:!!rail,departmentRoot:rail?.dataset.sqDepartmentRoot||'',persistentRoot:rail?.dataset.sqPersistentRoot||'',
   directHref:direct?.href||'',categoryItemHidden:catItem?.hidden??true,categories:cats,
   labelsOk:expectedLabels.every(l=>cats.some(c=>c.label===l)),
   cascade,brokenImages:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).length
  }
 },{themeId:THEME,expectedLabels});
 result.http=response.status();result.triggerVisible=triggerVisible;result.firstVisible=firstVisible;
 await run.p.screenshot({path:path.join(OUT,'screenshots',key+'.png'),fullPage:false});await run.c.close();await run.b.close();return result;
}
const root=await audit('/collections/custom-personalized-products?filter.v.availability=1&sq_root=custom-personalized-products','root');
const child=await audit('/collections/custom-patches?filter.v.availability=1&sq_root=custom-personalized-products','child');
function navOk(x){return x.http===200&&x.previewOk&&x.hasRail&&x.departmentRoot==='true'&&x.persistentRoot==='custom-personalized-products'&&!x.categoryItemHidden&&x.labelsOk&&x.directHref.includes('/collections/custom-personalized-products')&&x.directHref.includes('sq_root=custom-personalized-products')&&x.triggerVisible&&x.firstVisible&&x.cascade.length>=2&&x.brokenImages===0}
const summary={page,root,child,pass:page.http===200&&page.previewOk&&page.originalLook&&page.linksOk&&page.form&&page.brokenImages===0&&navOk(root)&&navOk(child)};
fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(summary,null,2));console.log('CUSTOMSHOPV2',JSON.stringify(summary));if(!summary.pass)process.exitCode=2;