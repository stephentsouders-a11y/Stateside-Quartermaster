import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE='https://www.statesideqm.com';
const THEME='158561894555';
const ROUTE='/collections/accessories-gifts-collectibles';
const OUT=path.resolve('audit-evidence/button-01/current');
const EXPECTED_CATEGORIES=[
  ['Challenge Coins & Displays','challenge-coins-display-holders'],
  ['Collectibles & Cards','collectibles-cards'],
  ['Drinkware','drinkware-gifts'],
  ['Keychains & Lanyards','keychains-lanyards'],
  ['Memorial & Personalized Gifts','personalized-displays-memorials'],
  ['Military Surplus & Collectibles','military-surplus-field-gear-collectibles'],
  ['Pins, Buttons & Small Insignia','pins-buttons-small-insignia'],
  ['Sword & Knife Display Cases','sword-knife-display-cases'],
  ['Wallets & Pocket Gifts','wallets-pocket-gifts']
];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rootUrl=(extra={})=>{const u=new URL(ROUTE,BASE);u.searchParams.set('preview_theme_id',THEME);Object.entries(extra).forEach(([k,v])=>u.searchParams.set(k,String(v)));return u.toString()};

await fs.rm(OUT,{recursive:true,force:true});
await fs.mkdir(OUT,{recursive:true});
const report={route:ROUTE,theme:THEME,createdAt:new Date().toISOString(),desktop:{},mobile:{},categoryGate:{},interactions:[],pageSizes:[],errors:[],checks:{}};

function diagnostics(page){
  const d={console:[],pageErrors:[],requestFailed:[],httpErrors:[]};
  page.on('console',m=>{if(['error','warning'].includes(m.type()))d.console.push({type:m.type(),text:m.text()})});
  page.on('pageerror',e=>d.pageErrors.push(String(e)));
  page.on('requestfailed',r=>d.requestFailed.push({url:r.url(),failure:r.failure()?.errorText||''}));
  page.on('response',r=>{if(r.status()>=400)d.httpErrors.push({status:r.status(),url:r.url()})});
  return d;
}
async function ready(page){
  await page.waitForLoadState('domcontentloaded',{timeout:90000});
  await page.waitForFunction(()=>document.querySelector('#MainContent')?.dataset.sqRefineV3Ready==='true',{timeout:60000});
  await page.waitForSelector('#MainContent .sq-refine-v3-sidebar',{state:'visible',timeout:20000});
  await page.waitForFunction(()=>document.querySelector('#MainContent .sq-refine-v3-sidebar')?.dataset.sqButton01Fixed==='true',{timeout:15000}).catch(()=>{});
  await sleep(900);
}
async function inspect(page){return page.evaluate(()=>{
  const main=document.querySelector('#MainContent'),side=main?.querySelector('.sq-refine-v3-sidebar'),head=side?.querySelector('.sq-refine-v3-sidebar__title'),grid=main?.querySelector('.sq-refine-v3-results .product-grid'),scroller=document.querySelector('.page-wrapper');
  const cards=grid?[...grid.querySelectorAll(':scope > .product-grid__item')].filter(x=>x.querySelector('a[href*="/products/"]')):[];
  const rects=cards.slice(0,18).map(x=>{const r=x.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}}),firstY=rects[0]?.y;
  const visible=e=>{if(!e)return false;const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)>0&&r.width>0&&r.height>0};
  const groups=side?[...side.querySelectorAll(':scope > details.sq-refine-v3-group')].map(d=>({label:(d.querySelector(':scope > summary')?.textContent||'').trim().replace(/\s+/g,' '),inputs:d.querySelectorAll('input[type="checkbox"]').length,checked:d.querySelectorAll('input:checked').length,open:d.open,choices:[...d.querySelectorAll('.sq-refine-v3-choice')].map(c=>{const i=c.querySelector('input');return{label:(c.querySelector('span')?.textContent||'').trim().replace(/\s+/g,' '),kind:i?.dataset.kind||'',target:i?.dataset.target||'',filterName:i?.dataset.filterName||i?.dataset.sqPolishParam||'',filterValue:i?.dataset.filterValue||i?.dataset.sqPolishValue||i?.value||'',value:i?.value||'',checked:!!i?.checked}})})):[];
  const pageSizes=[...main.querySelectorAll('.sq-refine-v3-page-size label')].map(l=>{const i=l.querySelector('input'),s=l.querySelector('span'),r=s?.getBoundingClientRect(),cs=s?getComputedStyle(s):null;return{value:i?.value||'',checked:!!i?.checked,label:(s?.textContent||'').trim(),labelVisible:!!s&&cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity||1)>0&&(r?.width||0)>0&&(r?.height||0)>0}});
  const titles=cards.slice(0,50).map(c=>(c.querySelector('.card__heading,.card-information__text,a[href*="/products/"]')?.textContent||'').trim().replace(/\s+/g,' ')).filter(Boolean);
  const images=cards.slice(0,50).map(c=>{const i=c.querySelector('img');return i?{src:i.currentSrc||i.src,alt:i.alt||'',naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,w:Math.round(i.getBoundingClientRect().width),h:Math.round(i.getBoundingClientRect().height),complete:i.complete}:null});
  const legacy=[...main.querySelectorAll('[class*="button-tree"],[class*="root-categories"],[class*="third-level"],[class*="branch-grid"],[class*="type-grid"],[class*="program-tree"],[class*="category-grid"],[class*="navigation-grid"],.sqbfl,.sqaca')].filter(e=>!e.closest('.sq-refine-v3-sidebar,.sq-refine-v3-results')&&visible(e)).length;
  const sr=side?.getBoundingClientRect(),hr=head?.getBoundingClientRect(),ss=side?getComputedStyle(side):null,hs=head?getComputedStyle(head):null;
  return{href:location.href,title:document.title,ready:main?.dataset.sqRefineV3Ready||'',fixed:side?.dataset.sqButton01Fixed||'',error:main?.dataset.sqRefineV3Error||'',viewport:{w:innerWidth,h:innerHeight},scroll:{container:scroller?'.page-wrapper':'window',top:scroller?.scrollTop||scrollY,height:scroller?.scrollHeight||document.documentElement.scrollHeight,clientHeight:scroller?.clientHeight||innerHeight,width:scroller?.scrollWidth||document.documentElement.scrollWidth,clientWidth:scroller?.clientWidth||innerWidth},horizontalOverflow:(scroller?.scrollWidth||document.documentElement.scrollWidth)>(scroller?.clientWidth||innerWidth)+2,cards:cards.length,firstRowCount:rects.filter(r=>Math.abs(r.y-firstY)<=3).length,cardRects:rects,sidebar:side?{x:Math.round(sr.x),y:Math.round(sr.y),w:Math.round(sr.width),h:Math.round(sr.height),position:ss.position,top:ss.top}:null,header:head?{text:head.textContent.trim(),w:Math.round(hr.width),bg:hs.backgroundColor,fg:hs.color,rightGap:Math.round((sr.right-hr.right)*10)/10}:null,pageSizes,groups,titles,images,legacy};
})}
async function shot(page,name){await page.screenshot({path:path.join(OUT,name),fullPage:false})}
async function setScroll(page,y){await page.evaluate(v=>{const s=document.querySelector('.page-wrapper');if(s)s.scrollTo(0,v);else scrollTo(0,v)},y)}
async function sweep(page,prefix){
  const dims=await page.evaluate(()=>{const s=document.querySelector('.page-wrapper');return{h:s?.scrollHeight||document.documentElement.scrollHeight,vh:s?.clientHeight||innerHeight}}),max=Math.max(0,dims.h-dims.vh);
  for(const [n,y] of [['top',0],['quarter',Math.round(max*.25)],['middle',Math.round(max*.5)],['three-quarter',Math.round(max*.75)],['bottom',max]]){await setScroll(page,y);await sleep(850);await shot(page,`${prefix}-${n}.png`)}
  await setScroll(page,0);await sleep(500);
}
async function loadProductImages(page){
  const count=await page.locator('#MainContent .sq-refine-v3-results .product-grid > .product-grid__item').count();
  for(let i=0;i<Math.min(count,50);i+=4){const card=page.locator('#MainContent .sq-refine-v3-results .product-grid > .product-grid__item').nth(i);await card.scrollIntoViewIfNeeded().catch(()=>{});await sleep(250)}
  await sleep(1200);await setScroll(page,0);await sleep(400);
}
function categoryProblems(d){
  const cat=d.groups.find(g=>g.label==='Shop by Category'),x=[];
  if(!cat)return['Shop by Category missing'];
  if(cat.choices.length!==EXPECTED_CATEGORIES.length)x.push(`category count ${cat.choices.length}, expected ${EXPECTED_CATEGORIES.length}`);
  EXPECTED_CATEGORIES.forEach(([label,handle],idx)=>{const c=cat.choices[idx];if(!c)x.push(`missing category ${label}`);else{if(c.label!==label)x.push(`category ${idx+1} label ${c.label}, expected ${label}`);if(!c.target.startsWith(`/collections/${handle}?`))x.push(`${label} target ${c.target}`);try{const u=new URL(c.target,BASE);if(u.searchParams.get('sq_root')!=='accessories-gifts-collectibles')x.push(`${label} missing sq_root`);if(u.searchParams.get('preview_theme_id')!==THEME)x.push(`${label} missing preview theme`)}catch{x.push(`${label} invalid target`)}}});
  cat.choices.filter(c=>/\/collections\/all(?:\?|$)/.test(c.target)).forEach(c=>x.push(`generic /collections/all target: ${c.label}`));
  return x;
}
function issues(d,mobile){
  const x=[];if(d.ready!=='true'||d.error)x.push(`V3 not ready: ${d.error||d.ready}`);if(!d.sidebar)x.push('sidebar missing');if(d.header?.text!=='REFINE PRODUCTS')x.push(`header text ${d.header?.text}`);if(d.header?.bg!=='rgb(8, 40, 63)'||d.header?.fg!=='rgb(255, 255, 255)')x.push(`header colors ${d.header?.bg}/${d.header?.fg}`);if((d.header?.rightGap??99)>1.5)x.push(`header right gap ${d.header?.rightGap}`);if(d.horizontalOverflow)x.push(`horizontal overflow ${d.scroll.width}>${d.scroll.clientWidth}`);if(d.legacy)x.push(`visible legacy nav ${d.legacy}`);if(d.cards<1)x.push('no products');if(mobile){if(d.sidebar?.position==='sticky')x.push('mobile sidebar sticky');if(d.cards&&d.firstRowCount!==2)x.push(`mobile first row ${d.firstRowCount}`)}else{if(d.sidebar?.position!=='sticky')x.push(`desktop sidebar ${d.sidebar?.position}`);if((d.sidebar?.h||0)<600)x.push(`sidebar height ${d.sidebar?.h}`);if(d.cards&&d.firstRowCount!==3)x.push(`desktop first row ${d.firstRowCount}`);if(d.cardRects[0]?.w<250)x.push(`card width ${d.cardRects[0]?.w}`)}
  if(d.pageSizes.map(p=>p.value).join(',')!=='50,100,250')x.push(`page sizes ${d.pageSizes.map(p=>p.value).join(',')}`);if(!d.pageSizes.find(p=>p.value==='50')?.checked)x.push('50 not default');d.pageSizes.filter(p=>!p.labelVisible||p.label!==p.value).forEach(p=>x.push(`page-size label ${p.value} not visibly rendered`));for(const g of d.groups)if(!g.inputs)x.push(`empty group ${g.label}`);return x;
}
async function verifyImages(page){await loadProductImages(page);const d=await inspect(page),broken=d.images.filter(i=>!i||!i.complete||!i.naturalWidth||!i.naturalHeight||!i.w||!i.h);return{broken,count:broken.length,images:d.images}}
async function verifyChildCategory(page){
  await page.goto(rootUrl(),{waitUntil:'domcontentloaded',timeout:90000});await ready(page);const cat=page.locator('#MainContent .sq-refine-v3-sidebar details.sq-refine-v3-group').filter({has:page.locator(':scope > summary',{hasText:'Shop by Category'})}).first();if(await cat.getAttribute('open')===null)await cat.locator(':scope > summary').click();const input=cat.locator('.sq-refine-v3-choice input').first();await input.click({force:true});await ready(page);await sleep(900);const d=await inspect(page),problems=categoryProblems(d);return{href:page.url(),problems,category:d.groups.find(g=>g.label==='Shop by Category'),pass:problems.length===0&&page.url().includes('/collections/challenge-coins-display-holders')};
}
async function interactionAudit(page){
  const targets=[['Shop by Type',null],['Shop by Manufacturers',null],['Availability','In stock']];
  for(const [label,wanted] of targets){await page.goto(rootUrl(),{waitUntil:'domcontentloaded',timeout:90000});await ready(page);const details=page.locator('#MainContent .sq-refine-v3-sidebar details.sq-refine-v3-group').filter({has:page.locator(':scope > summary',{hasText:label})}).first(),r={group:label,pass:true};try{if(!await details.count())throw new Error('group missing');if(await details.getAttribute('open')===null)await details.locator(':scope > summary').click();let input=wanted?details.locator('.sq-refine-v3-choice',{hasText:wanted}).locator('input').first():details.locator('input:not(:checked)').first();if(!await input.count())throw new Error('no selectable choice');const meta=await input.evaluate(i=>({kind:i.dataset.kind||'',target:i.dataset.target||'',filterName:i.dataset.filterName||i.dataset.sqPolishParam||'',filterValue:i.dataset.filterValue||i.dataset.sqPolishValue||i.value||'',label:(i.closest('label')?.querySelector('span')?.textContent||'').trim()}));r.choice=meta;r.before=page.url();await input.click({force:true});await sleep(1000);await ready(page);r.after=page.url();r.afterInspect=await inspect(page);if(r.after===r.before)throw new Error('URL did not change');if(label==='Availability'&&!new URL(r.after).searchParams.getAll('filter.v.availability').includes('1'))throw new Error(`availability URL wrong: ${r.after}`);if(r.afterInspect.cards<1)throw new Error('selection produced zero products');await shot(page,`desktop-${label.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-selected.png`);await page.reload({waitUntil:'domcontentloaded',timeout:90000});await ready(page);r.refreshPersisted=await page.evaluate(m=>[...document.querySelectorAll('#MainContent .sq-refine-v3-sidebar input:checked')].some(i=>(m.target&&i.dataset.target===m.target)||(m.filterName&&(i.dataset.filterName||i.dataset.sqPolishParam)===m.filterName&&(i.dataset.filterValue||i.dataset.sqPolishValue||i.value)===m.filterValue)),meta);if(!r.refreshPersisted)throw new Error('selection not persisted after refresh');await page.goBack({waitUntil:'domcontentloaded',timeout:90000});await ready(page);r.backUrl=page.url();if(r.backUrl!==r.before)throw new Error(`Back failed: ${r.backUrl}`)}catch(e){r.pass=false;r.error=String(e)}report.interactions.push(r)}
}
async function pageSizeAudit(page){for(const n of [50,100,250]){await page.goto(rootUrl({sq_per_page:n,sq_view_page:1}),{waitUntil:'domcontentloaded',timeout:90000});await ready(page);const d=await inspect(page),checked=d.pageSizes.find(x=>x.value===String(n))?.checked===true,labels=d.pageSizes.every(x=>x.labelVisible&&x.label===x.value);report.pageSizes.push({size:n,cards:d.cards,checked,labels,pass:checked&&labels&&d.cards>0&&d.cards<=n})}}

const browser=await chromium.launch({headless:true});let fatal=null;
try{
  const dc=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:path.join(OUT,'video-desktop'),size:{width:960,height:666}}}),dp=await dc.newPage(),dd=diagnostics(dp),dv=dp.video();
  await dp.goto(rootUrl(),{waitUntil:'domcontentloaded',timeout:90000});await ready(dp);report.desktop.initial=await inspect(dp);report.categoryGate.rootProblems=categoryProblems(report.desktop.initial);await sweep(dp,'desktop');report.desktop.imageGate=await verifyImages(dp);report.desktop.afterSweep=await inspect(dp);report.desktop.diagnostics=dd;report.desktop.issues=[...issues(report.desktop.afterSweep,false),...report.categoryGate.rootProblems];if(report.desktop.imageGate.count)report.desktop.issues.push(`${report.desktop.imageGate.count} broken/missing product images after real .page-wrapper traversal`);await dp.evaluate(()=>[...document.querySelectorAll('#MainContent .sq-refine-v3-sidebar details.sq-refine-v3-group')].forEach(d=>d.open=true));await sleep(500);await shot(dp,'desktop-refine-expanded.png');report.categoryGate.child=await verifyChildCategory(dp);if(!report.categoryGate.child.pass)report.desktop.issues.push(...report.categoryGate.child.problems.map(x=>'child category: '+x));await interactionAudit(dp);await pageSizeAudit(dp);await dc.close();await fs.copyFile(await dv.path(),path.join(OUT,'desktop-audit.webm'));

  const mc=await browser.newContext({viewport:{width:390,height:844},recordVideo:{dir:path.join(OUT,'video-mobile'),size:{width:390,height:844}}}),mp=await mc.newPage(),md=diagnostics(mp),mv=mp.video();
  await mp.goto(rootUrl(),{waitUntil:'domcontentloaded',timeout:90000});await ready(mp);report.mobile.initial=await inspect(mp);await sweep(mp,'mobile');report.mobile.imageGate=await verifyImages(mp);report.mobile.afterSweep=await inspect(mp);report.mobile.diagnostics=md;report.mobile.issues=[...issues(report.mobile.afterSweep,true),...categoryProblems(report.mobile.afterSweep)];if(report.mobile.imageGate.count)report.mobile.issues.push(`${report.mobile.imageGate.count} broken/missing product images after real .page-wrapper traversal`);await mp.evaluate(()=>[...document.querySelectorAll('#MainContent .sq-refine-v3-sidebar details.sq-refine-v3-group')].forEach(d=>d.open=true));await sleep(500);await shot(mp,'mobile-refine-expanded.png');await mc.close();await fs.copyFile(await mv.path(),path.join(OUT,'mobile-audit.webm'));
}catch(e){fatal=String(e);report.errors.push(fatal)}finally{await browser.close()}

report.checks={desktopVisual:report.desktop.issues?.length===0,mobileVisual:report.mobile.issues?.length===0,rootCategory:report.categoryGate.rootProblems?.length===0,childCategory:report.categoryGate.child?.pass===true,groupInteractions:report.interactions.length===3&&report.interactions.every(x=>x.pass),pageSizes:report.pageSizes.length===3&&report.pageSizes.every(x=>x.pass),desktopRuntime:(report.desktop.diagnostics?.pageErrors.length||0)===0,mobileRuntime:(report.mobile.diagnostics?.pageErrors.length||0)===0};
report.pass=!fatal&&Object.values(report.checks).every(Boolean);await fs.writeFile(path.join(OUT,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,checks:report.checks,desktopIssues:report.desktop.issues,mobileIssues:report.mobile.issues,childCategory:report.categoryGate.child,interactions:report.interactions.map(x=>({group:x.group,choice:x.choice?.label,pass:x.pass,error:x.error,after:x.after})),pageSizes:report.pageSizes,fatal},null,2));if(!report.pass)process.exitCode=1;
