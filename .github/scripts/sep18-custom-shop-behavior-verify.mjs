import { chromium } from 'playwright';import fs from 'fs';import path from 'path';
const BASE='https://www.statesideqm.com',THEME='158900125851',OUT='sep18-custom-shop-behavior-verify';fs.mkdirSync(path.join(OUT,'screenshots'),{recursive:true});
const expected=[
['All Custom Products','custom-personalized-products'],
['Custom Patches','custom-patches'],
['Custom Apparel','custom-apparel'],
['Personalized Displays & Memorials','personalized-displays-memorials'],
['Nameplates, Tags & Uniform ID','custom-nameplates-tags-uniform-id'],
['Custom Flags & Guidons','custom-flags-guidons'],
['Special-Order Gear','special-order-personalized-gear']
];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function newPage(viewport={width:1440,height:1000}){const b=await chromium.launch({headless:true});const c=await b.newContext({viewport});const p=await c.newPage();p.setDefaultNavigationTimeout(70000);return{b,c,p}}
async function gotoPreview(p,route){const u=new URL(route,BASE);u.searchParams.set('preview_theme_id',THEME);const r=await p.goto(u.href,{waitUntil:'domcontentloaded',timeout:70000});await p.waitForLoadState('load',{timeout:16000}).catch(()=>{});await sleep(1300);return r}
const pageRun=await newPage({width:680,height:1000});let response=await gotoPreview(pageRun.p,'/pages/custom-unit-gear');
const pageResult=await pageRun.p.evaluate(({expected,themeId})=>{
 const cards=[...document.querySelectorAll('.custom-unit-gear-page a.custom-unit-card')];
 const rows=cards.map(a=>{const r=a.getBoundingClientRect(),cs=getComputedStyle(a),u=new URL(a.href,location.origin);return{
  title:(a.querySelector('strong')?.textContent||'').trim(),
  handle:u.pathname.split('/').filter(Boolean).pop()||'',
  sqRoot:u.searchParams.get('sq_root')||'',
  transformed:a.classList.contains('sq-custom-home-card'),
  background:cs.backgroundColor,
  color:cs.color,
  width:Math.round(r.width),height:Math.round(r.height),
  padding:cs.padding
 }});
 return{
  themeId:String(window.Shopify?.theme?.id||''),previewOk:String(window.Shopify?.theme?.id||'')===themeId,
  cardCount:rows.length,rows,
  originalLook:rows.length===expected.length&&rows.every(x=>!x.transformed&&x.background==='rgb(255, 255, 255)'&&x.height<180),
  rootsOk:expected.every(([title,handle])=>rows.some(x=>x.title===title&&x.handle===handle&&x.sqRoot==='custom-personalized-products')),
  form:!!document.querySelector('#custom_unit_contact_form')
 }
},{expected,themeId:THEME});
pageResult.http=response.status();await pageRun.p.screenshot({path:path.join(OUT,'screenshots','custom-page.png'),fullPage:true});await pageRun.c.close();await pageRun.b.close();

async function auditCollection(route,key){
 const run=await newPage();const r=await gotoPreview(run.p,route);
 const result=await run.p.evaluate(({themeId})=>{
  const rail=document.querySelector('[data-sq-collection-rail]');
  const cats=[...document.querySelectorAll('[data-sq-context-categories-list] a[href]')].map(a=>({label:(a.querySelector('.sq-collection-rail__link-label')?.textContent||a.textContent||'').replace(/\s+/g,' ').trim(),href:a.href}));
  const direct=document.querySelector('.sq-collection-rail__direct');
  return{
   themeId:String(window.Shopify?.theme?.id||''),previewOk:String(window.Shopify?.theme?.id||'')===themeId,
   hasRail:!!rail,departmentRoot:rail?.dataset.sqDepartmentRoot||'',persistentRoot:rail?.dataset.sqPersistentRoot||'',
   directHref:direct?.href||'',categoryCount:cats.length,categories:cats,
   categoryVisible:!!document.querySelector('[data-sq-context-categories]:not([hidden])'),
   cascadeColumns:document.querySelectorAll('.sq-collection-rail__cascade-column').length,
   brokenImages:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).length
  }
 },{themeId:THEME});
 result.http=r.status();
 const first=run.p.locator('[data-sq-context-categories-list] a[href]').first();
 if(await first.count()){await first.hover();await sleep(1200)}
 result.afterHover=await run.p.evaluate(()=>({
   cascadeColumns:document.querySelectorAll('.sq-collection-rail__cascade-column').length,
   cascadeLinks:document.querySelectorAll('.sq-collection-rail__cascade-column a[href]').length,
   activeCategory:(document.querySelector('[data-sq-context-categories-list] a.is-cascade-active .sq-collection-rail__link-label')?.textContent||'').trim()
 }));
 await run.p.screenshot({path:path.join(OUT,'screenshots',key+'.png'),fullPage:false});await run.c.close();await run.b.close();return result;
}
const root=await auditCollection('/collections/custom-personalized-products?sq_root=custom-personalized-products&filter.v.availability=1','root');
const child=await auditCollection('/collections/custom-patches?sq_root=custom-personalized-products&filter.v.availability=1','child');
const expectedLabels=['Custom Patches','Custom Apparel','Personalized Displays & Memorials','Nameplates, Tags & Uniform ID','Custom Flags & Guidons','Special-Order Gear'];
const navOk=x=>x.http===200&&x.previewOk&&x.hasRail&&x.departmentRoot==='true'&&x.persistentRoot==='custom-personalized-products'&&x.categoryVisible&&expectedLabels.every(l=>x.categories.some(c=>c.label===l))&&x.directHref.includes('/collections/custom-personalized-products')&&x.directHref.includes('sq_root=custom-personalized-products')&&x.afterHover.cascadeColumns>=2&&x.brokenImages===0;
const summary={page:pageResult,root,child,pass:pageResult.http===200&&pageResult.previewOk&&pageResult.originalLook&&pageResult.rootsOk&&pageResult.form&&navOk(root)&&navOk(child)};
fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(summary,null,2));console.log('CUSTOMSHOPVERIFY',JSON.stringify(summary));if(!summary.pass)process.exitCode=2;