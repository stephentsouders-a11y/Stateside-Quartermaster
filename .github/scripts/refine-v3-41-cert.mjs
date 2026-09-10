import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = 'https://www.statesideqm.com';
const THEME = '158561894555';
const OUT = path.resolve('cert-v3');
const SHOTS = path.join(OUT, 'screenshots');

const routes = [
  ['Accessories, Gifts & Collectibles','/collections/accessories-gifts-collectibles'],
  ['Airsoft & Milsim','/collections/airsoft-milsim'],
  ['Apparel & Headwear','/collections/apparel'],
  ['Armed Forces Gear','/collections/armed-forces-gear'],
  ['Armored Vehicles','/pages/armored-vehicles-purchase-inquiry','page'],
  ['Art & Military Prints','/collections/art'],
  ['Body Armor & Ballistic Protection','/collections/body-armor-ballistic-protection'],
  ['Books, Literature, Manuals & Reference','/collections/literature'],
  ['Child Safety Shop','/collections/child-safety-shop'],
  ['DIVE / SCUBA','/collections/dive-scuba'],
  ['Firearm Accessories, Holsters & Shooting Gear','/collections/firearm-accessories'],
  ['First Aid, Medical & IFAK','/collections/first-aid-medical-ifak'],
  ['Flags, Displays & Memorials','/collections/flags-patriotic-decor'],
  ['Flashlights, Lighting & Power','/collections/flashlights-lighting'],
  ['Footwear, Gloves & Eyewear','/collections/footwear-gloves-eyewear'],
  ['K9 & Working Dog Gear','/collections/k9-dog-gear'],
  ['Knives, Axes & Multi-Tools','/collections/knives-axes-cutlery'],
  ['Morale Patches, Stickers & Tactical ID','/collections/morale-patches-tactical-id'],
  ['Outdoor, Survival & Preparedness','/collections/outdoor-preparedness-gear'],
  ['Patriotic & American Heritage','/collections/patriotic-american-heritage'],
  ['Safety, Rescue & Climbing','/collections/safety-rescue-climbing'],
  ['Sta-Brite Insignia','/collections/sta-brite-insignia'],
  ['Tactical Gear, Packs & Load Carriage','/collections/tactical-gear'],
  ['Thin Line Shop','/collections/thin-line'],
  ['Uniforms, Insignia & Identification','/collections/uniforms'],
  ['Watches & Timepieces','/collections/watches'],
  ['Zippo, Lighters & Fire Starters','/collections/zippos-lighters-torches'],
  ['Logo Merch','/collections/stateside-quartermaster-logo-merch'],
  ['Army National Guard Series','/collections/army-national-guard-series'],
  ['Air National Guard Series','/collections/air-national-guard-series'],
  ['U.S. Army Series','/collections/products-built-for-the-line-u-s-army'],
  ['U.S. Navy Series','/collections/products-built-for-the-line-u-s-navy'],
  ['U.S. Air Force Series','/collections/products-built-for-the-line-u-s-air-force'],
  ['U.S. Marine Corps Series','/collections/products-built-for-the-line-u-s-marine-corps'],
  ['U.S. Coast Guard Series','/collections/products-built-for-the-line-u-s-coast-guard'],
  ['U.S. Space Force Series','/collections/products-built-for-the-line-u-s-space-force'],
  ['ROTC Series','/collections/rotc-series'],
  ['JROTC Series','/collections/jrotc-series'],
  ['Military Schools & Academies','/collections/military-schools-academies'],
  ['Law Enforcement & Corrections','/collections/law-enforcement-corrections'],
  ['Firefighting, EMS & Search & Rescue','/collections/firefighting-ems-search-rescue']
];

const frozenStateGuard = '/collections/state-guard-series';
const representativeShots = new Set([
  '/collections/accessories-gifts-collectibles',
  '/collections/armed-forces-gear',
  '/collections/literature',
  '/collections/child-safety-shop',
  '/collections/sta-brite-insignia',
  '/collections/stateside-quartermaster-logo-merch',
  '/collections/army-national-guard-series',
  '/collections/rotc-series',
  '/collections/law-enforcement-corrections',
  '/collections/firefighting-ems-search-rescue',
  '/pages/armored-vehicles-purchase-inquiry'
]);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function previewUrl(route, extra = {}) {
  const u = new URL(route, BASE);
  u.searchParams.set('preview_theme_id', THEME);
  for (const [k,v] of Object.entries(extra)) u.searchParams.set(k, String(v));
  return u.toString();
}
async function gotoRetry(page, url, attempts = 5) {
  let last;
  for (let i=0;i<attempts;i++) {
    try {
      const response = await page.goto(url, {waitUntil:'domcontentloaded', timeout:90000});
      const status = response?.status() || 0;
      if (status === 200) {
        await page.waitForLoadState('networkidle', {timeout:15000}).catch(()=>{});
        await sleep(900);
        return {response,status,attempt:i+1};
      }
      last = new Error(`HTTP ${status}`);
      if (![429,500,502,503,504].includes(status)) break;
    } catch (e) { last = e; }
    await sleep([2000,4000,8000,12000,15000][i] || 15000);
  }
  throw last || new Error('navigation failed');
}
async function visibleCount(page, selector) {
  return page.locator(selector).evaluateAll(els => els.filter(el => {
    const s = getComputedStyle(el); const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  }).length).catch(()=>0);
}
async function inspectCollection(page) {
  await page.waitForSelector('[data-sq-refine-v3]', {timeout:15000}).catch(()=>{});
  await page.waitForSelector('.sq-refine-v3-sidebar', {state:'visible',timeout:15000}).catch(()=>{});
  const data = await page.evaluate(() => {
    const $ = s => document.querySelector(s);
    const $$ = s => Array.from(document.querySelectorAll(s));
    const visible = el => { if(!el) return false; const cs=getComputedStyle(el),r=el.getBoundingClientRect(); return cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0; };
    const side=$('.sq-refine-v3-sidebar');
    const groups=$$('.sq-refine-v3-sidebar .sq-refine-v3-group');
    const grid=$('#ResultsList')||$('.product-grid');
    const cards=grid ? Array.from(grid.querySelectorAll(':scope > .product-grid__item,:scope > li,product-card')).filter(el=>el.matches('product-card')||!!el.querySelector('a[href*="/products/"]')) : [];
    const size=$('.sq-refine-v3-page-size');
    const sizes=size ? Array.from(size.querySelectorAll('input')).map(i=>({value:i.value,checked:i.checked})) : [];
    const groupInfo=groups.map(g=>({
      label:(g.querySelector(':scope>summary')?.textContent||'').trim().replace(/\s+/g,' '),
      open:g.open,
      checked:g.querySelectorAll('input:checked').length,
      inputs:g.querySelectorAll('input[type="checkbox"]').length,
      structural:g.querySelectorAll('input[data-kind="structural"]').length,
      native:g.querySelectorAll('input[data-kind="native"]').length
    }));
    const columns=grid?getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length:0;
    return {
      v3Script:!!$('[data-sq-refine-v3]'),
      sidebar:visible(side),
      title:(side?.querySelector('.sq-refine-v3-sidebar__title')?.textContent||'').trim(),
      pageSizeVisible:visible(size),
      pageSizeInsideSidebar:!!size?.closest('.sq-refine-v3-sidebar'),
      sizes,
      groups:groupInfo,
      productCards:cards.length,
      gridVisible:visible(grid),
      gridColumns:columns,
      sidebarPosition:side?getComputedStyle(side).position:'',
      sidebarHeight:side?side.getBoundingClientRect().height:0,
      combinedAppearance:groupInfo.some(g=>/color\s*[\/&+]\s*pattern|color and pattern/i.test(g.label)),
      colorGroup:groupInfo.some(g=>/^shop by color$/i.test(g.label)),
      patternGroup:groupInfo.some(g=>/^shop by pattern$/i.test(g.label)),
      structuralTargets:side?Array.from(side.querySelectorAll('input[data-kind="structural"]')).map(i=>i.dataset.target||'').slice(0,5):[],
      nativeNames:side?Array.from(side.querySelectorAll('input[data-kind="native"]')).map(i=>i.dataset.filterName||'').slice(0,5):[],
      hiddenOldNavVisible:$$('[data-sq-refine-v3-hidden-nav="true"]').filter(visible).length,
      hiddenNativeFilterVisible:$$('[data-sq-refine-v3-native-filter-source="true"]').filter(visible).length,
      consoleV3:!!window.__sqRefineV3
    };
  });
  const duplicateSurfaceSelector = '[data-sq-global-refine-products],.sq-refine-taxonomy-products,[data-sq-filtered-product-surface-guard-products],[data-sq-military-filtered-products],[data-sq-category-universe-products],[data-sq-custom-color-products]';
  data.visibleOldProductSurfaces = await visibleCount(page, duplicateSurfaceSelector);
  return data;
}
function validateCollection(data, name, route) {
  const errors=[];
  if(!data.v3Script||!data.consoleV3) errors.push('V3 controller missing');
  if(!data.sidebar) errors.push('Refine Products sidebar not visible');
  if(data.title!=='Refine Products') errors.push(`sidebar title is "${data.title}"`);
  if(!data.pageSizeVisible) errors.push('products-per-page control not visible');
  if(data.pageSizeInsideSidebar) errors.push('products-per-page control is inside sidebar');
  if(data.sizes.map(x=>x.value).join(',')!=='50,100,250') errors.push(`page-size options are ${data.sizes.map(x=>x.value).join(',')}`);
  if(data.sizes.find(x=>x.value==='50')?.checked!==true) errors.push('50 is not the default page size');
  for(const g of data.groups){
    if(g.inputs===0) errors.push(`group ${g.label} has no checkbox inputs`);
    if(g.checked===0&&g.open) errors.push(`inactive group ${g.label} starts open`);
    if(g.checked>0&&!g.open) errors.push(`active group ${g.label} is closed`);
  }
  if(data.combinedAppearance) errors.push('Color / Pattern remains combined');
  if(data.visibleOldProductSurfaces>0) errors.push(`${data.visibleOldProductSurfaces} old product surface(s) still visible`);
  if(data.hiddenOldNavVisible>0) errors.push(`${data.hiddenOldNavVisible} old navigation source(s) still visible`);
  if(data.hiddenNativeFilterVisible>0) errors.push(`${data.hiddenNativeFilterVisible} native source filter block(s) still visible`);
  if(data.gridVisible&&data.gridColumns!==3) errors.push(`desktop product grid has ${data.gridColumns} columns, expected 3`);
  if(data.sidebar&&data.sidebarPosition!=='sticky') errors.push(`desktop sidebar position is ${data.sidebarPosition}, expected sticky`);
  if(data.sidebar&&data.sidebarHeight<600) errors.push(`desktop sidebar is only ${Math.round(data.sidebarHeight)}px tall`);
  if(data.structuralTargets.some(t=>!t.includes('/collections/')||!t.includes(`sq_root=${encodeURIComponent(route.split('/collections/')[1])}`))) errors.push('structural target missing collection URL or sq_root');
  if(data.nativeNames.some(n=>!n.startsWith('filter.'))) errors.push('native filter name does not start filter.');
  return errors;
}
async function toggleTest(page) {
  const first = page.locator('.sq-refine-v3-group').filter({has:page.locator('input:not(:checked)')}).first();
  if(await first.count()===0) return {skipped:true};
  const details = first;
  if(await details.getAttribute('open')!==null) return {error:'first inactive details unexpectedly open'};
  const summary=details.locator(':scope > summary');
  const before=await summary.evaluate(el=>getComputedStyle(el,'::after').content);
  await summary.click(); await sleep(150);
  const afterOpen=await details.getAttribute('open');
  const plusToMinus=await summary.evaluate(el=>getComputedStyle(el,'::after').content);
  await summary.click(); await sleep(150);
  const afterClose=await details.getAttribute('open');
  const backPlus=await summary.evaluate(el=>getComputedStyle(el,'::after').content);
  const ok=/\+/.test(before)&&afterOpen!==null&&/[−\u2212-]/.test(plusToMinus)&&afterClose===null&&/\+/.test(backPlus);
  return {ok,before,plusToMinus,backPlus,afterOpen:afterOpen!==null,afterClose:afterClose!==null};
}
async function mobileCheck(browser, route) {
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  try{
    await gotoRetry(page, previewUrl(route),3);
    await page.waitForSelector('.sq-refine-v3-sidebar',{state:'visible',timeout:12000});
    const out=await page.evaluate(()=>{
      const side=document.querySelector('.sq-refine-v3-sidebar');
      const grid=document.querySelector('#ResultsList')||document.querySelector('.product-grid');
      return {position:getComputedStyle(side).position,columns:grid?getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length:0};
    });
    return {pass:out.position!=='sticky'&&(!out.columns||out.columns===2),...out};
  }catch(e){return{pass:false,error:String(e)}} finally {await context.close()}
}
async function pageSizeCheck(browser, target) {
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  try{
    await gotoRetry(page,previewUrl('/collections/accessories-gifts-collectibles',{sq_per_page:target,sq_view_page:1}),4);
    await page.waitForSelector('.sq-refine-v3-page-size',{state:'visible',timeout:15000});
    await sleep(target===250?5000:2500);
    const count=await page.evaluate(()=>{const grid=document.querySelector('#ResultsList')||document.querySelector('.product-grid');if(!grid)return 0;return Array.from(grid.querySelectorAll(':scope > .product-grid__item,:scope > li,product-card')).filter(el=>el.matches('product-card')||!!el.querySelector('a[href*="/products/"]')).length});
    return {pass:count===target,count,target};
  }catch(e){return{pass:false,error:String(e),target}} finally {await context.close()}
}

await fs.mkdir(SHOTS,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();
const consoleErrors=[];
page.on('console',m=>{if(m.type()==='error') consoleErrors.push(m.text())});
const report={theme:THEME,createdAt:new Date().toISOString(),routes:[],special:{},summary:{}};

try {
  await gotoRetry(page, previewUrl('/'),4).catch(()=>{});
  for (let index=0;index<routes.length;index++) {
    const [name,route,type='collection']=routes[index];
    const row={index:index+1,name,route,type,pass:false,errors:[]};
    try {
      const nav=await gotoRetry(page, previewUrl(route),5); row.http=nav.status; row.navigationAttempt=nav.attempt;
      if(type==='page') {
        const pageState=await page.evaluate(()=>({v3:!!document.querySelector('[data-sq-refine-v3]'),sidebar:!!document.querySelector('.sq-refine-v3-sidebar'),h1:(document.querySelector('h1')?.textContent||'').trim()}));
        row.data=pageState;
        if(pageState.v3||pageState.sidebar) row.errors.push('Armored Vehicles page incorrectly received collection V3 UI');
      } else {
        row.data=await inspectCollection(page);
        row.errors.push(...validateCollection(row.data,name,route));
        row.toggle=await toggleTest(page);
        if(row.toggle.error||row.toggle.ok===false) row.errors.push('plus/minus collapse toggle failed');
      }
    } catch(e) { row.errors.push(String(e)); }
    row.pass=row.errors.length===0;
    if(representativeShots.has(route)||!row.pass){
      await page.screenshot({path:path.join(SHOTS,`${String(index+1).padStart(2,'0')}-${slug(name)}.png`),fullPage:true}).catch(()=>{});
    }
    report.routes.push(row);
    console.log(`${row.pass?'PASS':'FAIL'} ${index+1}/41 ${name}${row.errors.length?' :: '+row.errors.join(' | '):''}`);
    await sleep(1400);
  }
  // Frozen State Guard guardrail: observe only; no V3 should be attached.
  try {
    await gotoRetry(page,previewUrl(frozenStateGuard),4);
    const frozen=await page.evaluate(()=>({v3:!!document.querySelector('[data-sq-refine-v3]'),v3Sidebar:!!document.querySelector('.sq-refine-v3-sidebar'),legacy:!!document.querySelector('[data-sq-refine-taxonomy-panel-v2],[data-sq-refine-tall-sidebar]')}));
    report.special.stateGuard={pass:!frozen.v3&&!frozen.v3Sidebar,...frozen};
  } catch(e){report.special.stateGuard={pass:false,error:String(e)}}
  report.special.mobile={};
  for(const r of ['/collections/accessories-gifts-collectibles','/collections/armed-forces-gear','/collections/literature','/collections/law-enforcement-corrections']){
    report.special.mobile[r]=await mobileCheck(browser,r);
  }
  report.special.pageSizes={
    100:await pageSizeCheck(browser,100),
    250:await pageSizeCheck(browser,250)
  };
  report.consoleErrors=Array.from(new Set(consoleErrors)).slice(0,100);
  report.summary={
    requested:41,
    passed:report.routes.filter(r=>r.pass).length,
    failed:report.routes.filter(r=>!r.pass).length,
    stateGuardFrozenPass:!!report.special.stateGuard?.pass,
    mobilePass:Object.values(report.special.mobile).every(x=>x.pass),
    pageSizePass:Object.values(report.special.pageSizes).every(x=>x.pass)
  };
  report.summary.overallPass=report.summary.passed===41&&report.summary.stateGuardFrozenPass&&report.summary.mobilePass&&report.summary.pageSizePass;
  await fs.writeFile(path.join(OUT,'report.json'),JSON.stringify(report,null,2));
  await fs.writeFile(path.join(OUT,'summary.txt'),JSON.stringify(report.summary,null,2)+'\n');
  console.log('SUMMARY',report.summary);
  if(!report.summary.overallPass) process.exitCode=1;
} finally {
  await context.close(); await browser.close();
}
