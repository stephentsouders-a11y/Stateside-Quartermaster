import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE='https://www.statesideqm.com';
const THEME='158561894555';
const ROUTE='/collections/accessories-gifts-collectibles';
const OUT=path.resolve('audit-evidence/button-01/current');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const preview=(extra={})=>{const u=new URL(ROUTE,BASE);u.searchParams.set('preview_theme_id',THEME);for(const[k,v]of Object.entries(extra))u.searchParams.set(k,String(v));return u.toString()};

await fs.rm(OUT,{recursive:true,force:true});
await fs.mkdir(OUT,{recursive:true});
const report={route:ROUTE,theme:THEME,createdAt:new Date().toISOString(),desktop:{},mobile:{},interactions:[],pageSizes:[],errors:[],warnings:[],checks:{}};

function attachDiagnostics(page,bucket){
  page.on('console',m=>{if(['error','warning'].includes(m.type())) bucket.console.push({type:m.type(),text:m.text()})});
  page.on('pageerror',e=>bucket.pageErrors.push(String(e)));
  page.on('requestfailed',r=>bucket.requestFailed.push({url:r.url(),failure:r.failure()?.errorText||''}));
  page.on('response',r=>{if(r.status()>=400)bucket.httpErrors.push({status:r.status(),url:r.url()})});
}
async function ready(page){
  await page.waitForLoadState('domcontentloaded',{timeout:90000});
  await page.waitForFunction(()=>document.querySelector('#MainContent')?.dataset.sqRefineV3Ready==='true',{timeout:60000});
  await page.waitForSelector('#MainContent .sq-refine-v3-sidebar',{state:'visible',timeout:20000});
  await sleep(1200);
}
async function inspect(page){return page.evaluate(()=>{
  const main=document.querySelector('#MainContent'),side=main?.querySelector('.sq-refine-v3-sidebar'),head=side?.querySelector('.sq-refine-v3-sidebar__title'),grid=main?.querySelector('.sq-refine-v3-results .product-grid');
  const cards=grid?[...grid.querySelectorAll(':scope > .product-grid__item')].filter(x=>x.querySelector('a[href*="/products/"]')):[];
  const rects=cards.slice(0,18).map(x=>{const r=x.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}}),y=rects[0]?.y;
  const groups=side?[...side.querySelectorAll(':scope > details.sq-refine-v3-group')].map(d=>({label:(d.querySelector(':scope > summary')?.textContent||'').trim().replace(/\s+/g,' '),open:d.open,inputs:d.querySelectorAll('input[type="checkbox"]').length,checked:d.querySelectorAll('input:checked').length,choices:[...d.querySelectorAll('.sq-refine-v3-choice')].map(c=>{const i=c.querySelector('input');return{label:(c.querySelector('span')?.textContent||'').trim().replace(/\s+/g,' '),kind:i?.dataset.kind||'',target:i?.dataset.target||'',filterName:i?.dataset.filterName||'',value:i?.value||'',checked:!!i?.checked}})})):[];
  const pageSizes=[...main.querySelectorAll('.sq-refine-v3-page-size input')].map(i=>({value:i.value,checked:i.checked}));
  const titles=cards.slice(0,50).map(c=>(c.querySelector('.card__heading,.card-information__text,a[href*="/products/"]')?.textContent||'').trim().replace(/\s+/g,' ')).filter(Boolean);
  const images=cards.slice(0,50).map(c=>{const i=c.querySelector('img');return i?{src:i.currentSrc||i.src,alt:i.alt||'',naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,w:Math.round(i.getBoundingClientRect().width),h:Math.round(i.getBoundingClientRect().height)}:null});
  const visible=e=>{if(!e)return false;const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
  const legacy=[...main.querySelectorAll('[class*="button-tree"],[class*="root-categories"],[class*="third-level"],[class*="branch-grid"],[class*="type-grid"],[class*="program-tree"],[class*="category-grid"],[class*="navigation-grid"],.sqbfl,.sqaca')].filter(e=>!e.closest('.sq-refine-v3-sidebar,.sq-refine-v3-results')&&visible(e)).length;
  const sr=side?.getBoundingClientRect(),hr=head?.getBoundingClientRect(),ss=side?getComputedStyle(side):null,hs=head?getComputedStyle(head):null;
  return{href:location.href,title:document.title,ready:main?.dataset.sqRefineV3Ready||'',error:main?.dataset.sqRefineV3Error||'',viewport:{w:innerWidth,h:innerHeight},scroll:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2,cards:cards.length,firstRowCount:rects.filter(r=>Math.abs(r.y-y)<=3).length,cardRects:rects,sidebar:side?{x:Math.round(sr.x),y:Math.round(sr.y),w:Math.round(sr.width),h:Math.round(sr.height),position:ss.position,top:ss.top}:null,header:head?{text:head.textContent.trim(),w:Math.round(hr.width),bg:hs.backgroundColor,fg:hs.color,rightGap:Math.round((sr.right-hr.right)*10)/10}:null,pageSizes,groups,titles,images,legacy};
})}
async function shot(page,name){await page.screenshot({path:path.join(OUT,name),fullPage:false});}
async function visualSweep(page,prefix){
  const h=await page.evaluate(()=>document.documentElement.scrollHeight); const max=Math.max(0,h-innerHeight);
  for(const [label,y] of [['top',0],['middle',Math.round(max/2)],['bottom',max]]){await page.evaluate(v=>scrollTo(0,v),y);await sleep(650);await shot(page,`${prefix}-${label}.png`)}
  await page.evaluate(()=>scrollTo(0,0));await sleep(400);
}
function baseChecks(d,mobile=false){
  const out=[];
  if(d.ready!=='true'||d.error)out.push(`V3 not ready: ${d.error||d.ready}`);
  if(!d.sidebar)out.push('sidebar missing');
  if(d.header?.text!=='REFINE PRODUCTS')out.push(`bad header text: ${d.header?.text}`);
  if(d.header?.bg!=='rgb(8, 40, 63)'||d.header?.fg!=='rgb(255, 255, 255)')out.push(`bad header colors ${d.header?.bg}/${d.header?.fg}`);
  if((d.header?.rightGap??99)>1.5)out.push(`header right gap ${d.header?.rightGap}`);
  if(d.horizontalOverflow)out.push(`horizontal overflow ${d.scroll.width}>${d.viewport.w}`);
  if(d.legacy)out.push(`visible legacy nav ${d.legacy}`);
  if(d.cards<1)out.push('no products');
  if(mobile){if(d.sidebar?.position==='sticky')out.push('mobile sidebar is sticky');if(d.cards&&d.firstRowCount!==2)out.push(`mobile first row ${d.firstRowCount}`)}
  else{if(d.sidebar?.position!=='sticky')out.push(`desktop sidebar ${d.sidebar?.position}`);if((d.sidebar?.h||0)<600)out.push(`sidebar too short ${d.sidebar?.h}`);if(d.cards&&d.firstRowCount!==3)out.push(`desktop first row ${d.firstRowCount}`);if(d.cardRects[0]?.w<250)out.push(`cards too narrow ${d.cardRects[0]?.w}`)}
  if(d.pageSizes.map(x=>x.value).join(',')!=='50,100,250')out.push(`bad page sizes ${d.pageSizes.map(x=>x.value).join(',')}`);
  if(!d.pageSizes.find(x=>x.value==='50')?.checked)out.push('50 not default');
  for(const g of d.groups){if(!g.inputs)out.push(`empty refine group ${g.label}`)}
  const broken=d.images.filter(i=>!i||!i.naturalWidth||!i.naturalHeight||!i.w||!i.h);if(broken.length)out.push(`${broken.length} broken/missing product images`);
  return out;
}
async function testGroups(page,baseline){
  for(const g of baseline.groups){
    if(!g.choices.length)continue;
    await page.goto(preview(),{waitUntil:'domcontentloaded',timeout:90000});await ready(page);
    const details=page.locator('#MainContent .sq-refine-v3-sidebar details.sq-refine-v3-group').filter({has:page.locator(':scope > summary',{hasText:g.label})}).first();
    await details.locator(':scope > summary').click();await sleep(250);
    const input=details.locator('input:not(:checked)').first();if(!await input.count()){report.interactions.push({group:g.label,skipped:'no unchecked choice'});continue}
    const meta=await input.evaluate(i=>({kind:i.dataset.kind||'',target:i.dataset.target||'',filterName:i.dataset.filterName||'',value:i.value||'',label:(i.closest('label')?.querySelector('span')?.textContent||'').trim()}));
    const before=page.url();let result={group:g.label,choice:meta,before,pass:true};
    try{
      await input.click({force:true});await sleep(1800);
      if(meta.kind==='structural')await ready(page); else await page.waitForLoadState('domcontentloaded',{timeout:30000}).catch(()=>{});
      await sleep(900);
      result.after=page.url();result.afterInspect=await inspect(page);
      if(result.after===before)throw new Error('URL did not change');
      if(result.afterInspect.cards<1)throw new Error('selection produced zero products');
      await page.reload({waitUntil:'domcontentloaded',timeout:90000});await ready(page);await sleep(700);
      const persisted=await page.evaluate(m=>[...document.querySelectorAll('#MainContent .sq-refine-v3-sidebar input')].some(i=>i.checked&&((m.target&&i.dataset.target===m.target)||(m.filterName&&i.dataset.filterName===m.filterName&&i.value===m.value))),meta);
      result.refreshPersisted=persisted;if(!persisted)throw new Error('selection not persisted after refresh');
      await page.goBack({waitUntil:'domcontentloaded',timeout:90000});await ready(page);await sleep(650);result.backUrl=page.url();
      if(result.backUrl!==before)throw new Error(`Back did not restore baseline: ${result.backUrl}`);
    }catch(e){result.pass=false;result.error=String(e)}
    report.interactions.push(result);
  }
}
async function testPageSizes(page){
  for(const size of [50,100,250]){
    await page.goto(preview({sq_per_page:size,sq_view_page:1}),{waitUntil:'domcontentloaded',timeout:90000});await ready(page);await sleep(size===250?2600:1300);
    const d=await inspect(page),checked=d.pageSizes.find(x=>x.value===String(size))?.checked===true;
    report.pageSizes.push({size,cards:d.cards,checked,pass:checked&&d.cards>0&&d.cards<=size});
  }
}

const browser=await chromium.launch({headless:true});
let fatal=null;
try{
  const desktopDiag={console:[],pageErrors:[],requestFailed:[],httpErrors:[]};
  const dc=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:path.join(OUT,'video-temp'),size:{width:960,height:666}}});
  const dp=await dc.newPage();attachDiagnostics(dp,desktopDiag);const dvideo=dp.video();
  await dp.goto(preview(),{waitUntil:'domcontentloaded',timeout:90000});await ready(dp);await sleep(1200);
  report.desktop.initial=await inspect(dp);report.desktop.diagnostics=desktopDiag;report.desktop.issues=baseChecks(report.desktop.initial,false);
  await visualSweep(dp,'desktop');
  await dp.evaluate(()=>[...document.querySelectorAll('#MainContent .sq-refine-v3-sidebar details.sq-refine-v3-group')].forEach(d=>d.open=true));await sleep(650);await shot(dp,'desktop-refine-expanded.png');
  await testGroups(dp,report.desktop.initial);
  await testPageSizes(dp);
  await dc.close();
  const dpath=await dvideo.path();await fs.copyFile(dpath,path.join(OUT,'desktop-audit.webm'));

  const mobileDiag={console:[],pageErrors:[],requestFailed:[],httpErrors:[]};
  const mc=await browser.newContext({viewport:{width:390,height:844},recordVideo:{dir:path.join(OUT,'video-temp-mobile'),size:{width:390,height:844}}});
  const mp=await mc.newPage();attachDiagnostics(mp,mobileDiag);const mvideo=mp.video();
  await mp.goto(preview(),{waitUntil:'domcontentloaded',timeout:90000});await ready(mp);await sleep(1200);
  report.mobile.initial=await inspect(mp);report.mobile.diagnostics=mobileDiag;report.mobile.issues=baseChecks(report.mobile.initial,true);
  await visualSweep(mp,'mobile');
  await mp.evaluate(()=>[...document.querySelectorAll('#MainContent .sq-refine-v3-sidebar details.sq-refine-v3-group')].forEach(d=>d.open=true));await sleep(650);await shot(mp,'mobile-refine-expanded.png');
  await mc.close();const mpath=await mvideo.path();await fs.copyFile(mpath,path.join(OUT,'mobile-audit.webm'));
}catch(e){fatal=String(e);report.errors.push(fatal)}finally{await browser.close()}

report.checks={desktopVisual:report.desktop.issues?.length===0,mobileVisual:report.mobile.issues?.length===0,groupInteractions:report.interactions.length>0&&report.interactions.every(x=>x.pass!==false),pageSizes:report.pageSizes.length===3&&report.pageSizes.every(x=>x.pass),desktopRuntime:(report.desktop.diagnostics?.pageErrors.length||0)===0,mobileRuntime:(report.mobile.diagnostics?.pageErrors.length||0)===0};
report.pass=!fatal&&Object.values(report.checks).every(Boolean);
await fs.writeFile(path.join(OUT,'report.json'),JSON.stringify(report,null,2));
await fs.rm(path.join(OUT,'video-temp'),{recursive:true,force:true});await fs.rm(path.join(OUT,'video-temp-mobile'),{recursive:true,force:true});
console.log(JSON.stringify({pass:report.pass,checks:report.checks,desktopIssues:report.desktop.issues,mobileIssues:report.mobile.issues,interactions:report.interactions.map(x=>({group:x.group,choice:x.choice?.label,pass:x.pass,error:x.error})),pageSizes:report.pageSizes,fatal},null,2));
if(!report.pass)process.exitCode=1;
