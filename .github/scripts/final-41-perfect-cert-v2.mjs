import { chromium } from 'playwright';
import fs from 'node:fs';

const base = 'https://www.statesideqm.com';
const theme = '158770561179';
const shard = Number(process.env.SHARD);
const shards = 8;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const all = [
  ['Tactical Gear','/collections/tactical-gear'],['Uniforms','/collections/uniforms'],['Firearm Accessories','/collections/firearm-accessories'],['Body Armor & Ballistic Protection','/collections/body-armor-ballistic-protection'],['Apparel','/collections/apparel'],['Flags & Patriotic Decor','/collections/flags-patriotic-decor'],['Literature','/collections/literature'],['Outdoor & Preparedness Gear','/collections/outdoor-preparedness-gear'],['First Aid, Medical & IFAK','/collections/first-aid-medical-ifak'],['Flashlights & Lighting','/collections/flashlights-lighting'],['Knives, Axes & Cutlery','/collections/knives-axes-cutlery'],['Dive & Scuba','/collections/dive-scuba'],['Armed Forces Gear','/collections/armed-forces-gear'],['Morale Patches & Tactical ID','/collections/morale-patches-tactical-id'],['Footwear, Gloves & Eyewear','/collections/footwear-gloves-eyewear'],['Accessories, Gifts & Collectibles','/collections/accessories-gifts-collectibles'],['Safety, Rescue & Climbing','/collections/safety-rescue-climbing'],['Airsoft & Milsim','/collections/airsoft-milsim'],['K9 & Dog Gear','/collections/k9-dog-gear'],['Patriotic & American Heritage','/collections/patriotic-american-heritage'],['Art','/collections/art'],['Zippos, Lighters & Torches','/collections/zippos-lighters-torches'],['Watches','/collections/watches'],['Armored Vehicles','/pages/armored-vehicles-purchase-inquiry'],['Child Safety Shop','/collections/child-safety-shop'],['Thin Line','/collections/thin-line'],['Sta-Brite Insignia','/collections/sta-brite-insignia'],['Stateside Quartermaster Logo Merch','/collections/stateside-quartermaster-logo-merch'],['Army National Guard Series','/collections/army-national-guard-series'],['Air National Guard Series','/collections/air-national-guard-series'],['U.S. Army','/collections/products-built-for-the-line-u-s-army'],['U.S. Navy','/collections/products-built-for-the-line-u-s-navy'],['U.S. Air Force','/collections/products-built-for-the-line-u-s-air-force'],['U.S. Marine Corps','/collections/products-built-for-the-line-u-s-marine-corps'],['U.S. Coast Guard','/collections/products-built-for-the-line-u-s-coast-guard'],['U.S. Space Force','/collections/products-built-for-the-line-u-s-space-force'],['ROTC','/collections/rotc-series'],['JROTC','/collections/jrotc-series'],['Military Schools & Academies','/collections/military-schools-academies'],['Law Enforcement & Corrections','/collections/law-enforcement-corrections'],['Firefighting, EMS & Search & Rescue','/collections/firefighting-ems-search-rescue']
];
if (all.length !== 41 || all.some(([,r]) => /state-guard-series/i.test(r))) throw new Error('Scope violation: State Guard is forbidden');
const routes = all.filter((_,i) => i % shards === shard);
const railDriven = new Set(['Literature']);

fs.mkdirSync('evidence/screens', {recursive:true});
fs.mkdirSync('evidence/videos', {recursive:true});
const browser = await chromium.launch({headless:true});
const results = [];

const surfaceSelector = [
  '[data-sqbfl-root]','.sqbfl','.sqaca','.sq-subcategory-section','.sq-third-level','.sq-books-tree','[data-sq-afg-mode]','.sq-afg-branch-section','.sq-line-series-categories','.sq-line-program-tree','.sq-ps-root','.sq-ts-match-section','.sq-child-safety-section','.sq-maker-browser','.vac-unified-maker-browser','.vac-merged-browser','.vac-firearm-browser','.vac-dive-browser','.vac-knives-browser','.vac-armor-browser','.vac-gift-categories','.vac-guard-folders','.sq-ptype-browser','.sqsg-orgs'
].join(',');
const loadingRx = /Loading available items|Building the customer-facing product tree|Tree unavailable/i;
const badPage = t => /Just a moment|Something went wrong|Too Many Requests|429 Too Many Requests/i.test(t || '');

async function load(page, url) {
  const attempts = [], waits = [0, 15000, 30000, 60000, 90000, 120000];
  let resp = null;
  for (let i=0; i<waits.length; i++) {
    if (waits[i]) await sleep(waits[i]);
    resp = await page.goto(url, {waitUntil:'domcontentloaded'}).catch(() => null);
    await sleep(2500);
    const body = (await page.locator('body').innerText().catch(() => '')).slice(0,5000);
    attempts.push({attempt:i+1,status:resp?.status()||0,bad:badPage(body)});
    if (resp?.status() === 200 && !badPage(body)) break;
  }
  return {resp, attempts};
}

async function inspect(page) {
  for (let tries=0; tries<4; tries++) {
    try {
      return await page.evaluate((surfaceSelector) => {
        const vis = e => { if (!e) return false; const s=getComputedStyle(e), r=e.getBoundingClientRect(); return s.display!=='none' && s.visibility!=='hidden' && Number(s.opacity)!==0 && r.width>1 && r.height>1; };
        const visible = q => [...document.querySelectorAll(q)].filter(vis);
        const rails = visible('[data-sq-collection-rail]');
        const rail = rails[0] || null;
        const root = visible('[data-sqbfl-root],.sqbfl')[0] || null;
        const surfaces = visible(surfaceSelector);
        const buttons = surfaces.flatMap(s => [...s.querySelectorAll('a[href],button')]).filter(vis).filter(e => !e.closest('[data-sq-collection-rail],nav,[class*="breadcrumb"],[aria-label*="breadcrumb" i]'));
        const group = n => {
          const item = rail?.querySelector(`[data-sq-context-${n}]`);
          const list = rail?.querySelector(`[data-sq-context-${n}-list]`);
          const first = list?.querySelector('a[href]');
          return {hidden:item?item.hidden:null,visible:vis(item),count:list?list.querySelectorAll('a[href]').length:0,firstHref:first?.getAttribute('href')||null};
        };
        return {
          railCount: rails.length,
          categories: group('categories'), subcategories: group('subcategories'), types: group('types'), organizations: group('organizations'),
          surfaceCount: surfaces.length, buttonCount: buttons.length,
          hasBfl: !!root, bflState: root?.getAttribute('data-sqbfl-load-state')||'', bflText:(root?.innerText||'').slice(0,700),
          shopAll: new URLSearchParams(location.search).get('sq_bfl_all') === '1',
          white: visible('.sq-global-refine-sidebar,.sqsg-refine-sidebar').length,
          native: visible('.facets__filters-wrapper,.facets-horizontal-remove,.facets--filters-title,.facets-toggle__wrapper,theme-drawer#filters-drawer').length,
          productGrid: visible('collection-component,.product-grid,.product-grid-container').length,
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 4,
          mainText:(document.getElementById('MainContent')?.innerText||'').slice(0,1200),
          fetchStability: document.documentElement.getAttribute('data-sq-bfl-fetch-stability')||'',
          owner: document.documentElement.getAttribute('data-sq-bfl-product-surface-owner')||''
        };
      }, surfaceSelector);
    } catch (e) {
      if (!/Execution context was destroyed|navigation/i.test(String(e)) || tries===3) throw e;
      await page.waitForLoadState('domcontentloaded').catch(() => null);
      await sleep(500);
    }
  }
}

const hierarchyTotal = s => ['categories','subcategories','types','organizations'].reduce((n,k) => n + (s?.[k]?.count||0), 0);
const firstRailHref = s => s?.categories?.firstHref || s?.subcategories?.firstHref || s?.types?.firstHref || s?.organizations?.firstHref || null;
const shopAllReady = s => !!(s && s.shopAll && s.productGrid>0 && s.surfaceCount>0 && !loadingRx.test(s.bflText||''));

async function waitRootReady(page, isCollection, railOnly) {
  if (!isCollection) return {ok:true,state:await inspect(page),timeline:[]};
  const timeline=[], deadline=Date.now()+120000;
  while (Date.now()<deadline) {
    const s=await inspect(page); timeline.push({ms:Date.now(),...s});
    if (railOnly && s.railCount===1 && hierarchyTotal(s)>0 && s.productGrid>0) return {ok:true,state:s,timeline};
    if (s.hasBfl) {
      if (s.bflState==='ready' && !loadingRx.test(s.bflText) && s.surfaceCount>0 && s.buttonCount>0) return {ok:true,state:s,timeline};
      if (/Tree unavailable/i.test(s.bflText)) return {ok:false,state:s,timeline,reason:'Tree unavailable'};
    } else if (s.surfaceCount>0 && s.buttonCount>0) return {ok:true,state:s,timeline};
    await sleep(1000);
  }
  return {ok:false,state:timeline.at(-1)||{},timeline,reason:'navigation/product tree readiness timeout'};
}

async function waitClickSettled(page) {
  const timeline=[], deadline=Date.now()+120000;
  while (Date.now()<deadline) {
    const s=await inspect(page); timeline.push({ms:Date.now(),...s});
    if (s.hasBfl) {
      if ((s.bflState==='ready' && !loadingRx.test(s.bflText)) || shopAllReady(s)) return {ok:true,state:s,timeline};
      if (/Tree unavailable/i.test(s.bflText)) return {ok:false,state:s,timeline,reason:'Tree unavailable'};
    } else if (s.productGrid>0 || s.surfaceCount>0 || hierarchyTotal(s)>0) {
      await sleep(1500); return {ok:true,state:await inspect(page),timeline};
    }
    await sleep(1000);
  }
  return {ok:false,state:timeline.at(-1)||{},timeline,reason:'clicked destination readiness timeout'};
}

async function transient(page) {
  const arr=[];
  for (let i=0;i<10;i++) { try { arr.push(await inspect(page)); } catch(e) { arr.push({inspectionError:String(e)}); } await sleep(250); }
  return arr;
}

async function firstBodyHref(page) {
  return page.evaluate((surfaceSelector) => {
    const vis=e=>{if(!e)return false;const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0&&r.width>1&&r.height>1};
    const surfaces=[...document.querySelectorAll(surfaceSelector)].filter(vis);
    const anchors=surfaces.flatMap(s=>[...s.querySelectorAll('a[href]')]).filter(vis);
    for (const a of anchors) {
      if (a.closest('[data-sq-collection-rail],nav,[class*="breadcrumb"],[aria-label*="breadcrumb" i]')) continue;
      try {
        const u=new URL(a.getAttribute('href'),location.href), here=new URL(location.href);
        if (u.origin!==here.origin || u.pathname==='/' || /state-guard-series/i.test(u.pathname)) continue;
        if (u.pathname===here.pathname && u.search===here.search) continue;
        return a.getAttribute('href');
      } catch(e) {}
    }
    return null;
  }, surfaceSelector);
}

for (const [vp,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]) {
  for (const [label,route] of routes) {
    if (/state-guard-series/i.test(route)) throw new Error('State Guard reached');
    const ctx=await browser.newContext({viewport,recordVideo:{dir:'evidence/videos',size:viewport}});
    const page=await ctx.newPage(); page.setDefaultNavigationTimeout(60000);
    const consoleErrors=[]; page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
    await page.goto(`${base}/?preview_theme_id=${theme}`,{waitUntil:'domcontentloaded'}).catch(()=>null); await sleep(1200);
    const url=new URL(route,base); url.searchParams.set('preview_theme_id',theme); if(route.startsWith('/collections/')) url.searchParams.set('filter.v.availability','1');
    const loaded=await load(page,url.toString());
    const ready=await waitRootReady(page,route.startsWith('/collections/'),railDriven.has(label));
    const root=await inspect(page), samples=await transient(page);
    const safe=label.toLowerCase().replace(/[^a-z0-9]+/g,'-'); await page.screenshot({path:`evidence/screens/${vp}-${safe}-root.png`,fullPage:true});
    let click=null;
    if(route.startsWith('/collections/')) {
      const href=railDriven.has(label) ? firstRailHref(root) : await firstBodyHref(page);
      if(href) {
        const target=new URL(href,page.url()); target.searchParams.set('preview_theme_id',theme); target.searchParams.set('filter.v.availability','1');
        if(target.origin===base && target.pathname!=='/' && !/state-guard-series/i.test(target.pathname)) {
          const rootWasThrottled=loaded.attempts.some(a=>a.status===429||a.bad); await sleep(rootWasThrottled?30000:10000);
          const cLoad=await load(page,target.toString()), cReady=await waitClickSettled(page), cSnap=await inspect(page), cSamples=await transient(page);
          click={href,target:target.toString(),status:cLoad.resp?.status()||0,attempts:cLoad.attempts,ready:cReady.ok,reason:cReady.reason||'',snap:cSnap,samples:cSamples,source:railDriven.has(label)?'rail':'body'};
          await page.screenshot({path:`evidence/screens/${vp}-${safe}-after-navigation.png`,fullPage:true});
        }
      }
    }
    results.push({vp,label,route,status:loaded.resp?.status()||0,attempts:loaded.attempts,ready,root,samples,click,consoleErrors:consoleErrors.slice(-30)});
    await ctx.close(); await sleep(10000);
  }
}

await browser.close();
fs.writeFileSync(`evidence/shard-${shard}.json`,JSON.stringify({shard,results},null,2));
const fail=[];
for (const r of results) {
  if(r.status!==200) fail.push(`${r.vp} ${r.label}: HTTP ${r.status}`);
  if(r.route.startsWith('/collections/')) {
    const railOnly=railDriven.has(r.label);
    if(r.root.railCount!==1) fail.push(`${r.vp} ${r.label}: expected exactly one navy rail, got ${r.root.railCount}`);
    if(!r.ready.ok) fail.push(`${r.vp} ${r.label}: ${r.ready.reason||'not ready'}`);
    if(railOnly) {
      if(hierarchyTotal(r.root)<1) fail.push(`${r.vp} ${r.label}: navy-rail hierarchy is empty`);
      if(r.root.productGrid<1) fail.push(`${r.vp} ${r.label}: product grid is not visible`);
    } else if(r.root.surfaceCount<1||r.root.buttonCount<1) fail.push(`${r.vp} ${r.label}: missing visible body navigation/buttons`);
    if(r.root.hasBfl && (r.root.bflState!=='ready'||loadingRx.test(r.root.bflText))) fail.push(`${r.vp} ${r.label}: BFL not ready`);
    if(r.root.white||r.root.native||r.samples.some(x=>x.white||x.native||x.overflow)) fail.push(`${r.vp} ${r.label}: duplicate filter UI or transient overflow`);
    if(!r.click) fail.push(`${r.vp} ${r.label}: no valid clickable ${railOnly?'rail':'body'} navigation link`);
    else if(r.click.status!==200||!r.click.ready||r.click.snap.white||r.click.snap.native||r.click.snap.overflow||r.click.samples.some(x=>x.white||x.native||x.overflow)||(r.click.snap.hasBfl&&!shopAllReady(r.click.snap)&&(r.click.snap.bflState!=='ready'||loadingRx.test(r.click.snap.bflText)))) fail.push(`${r.vp} ${r.label}: ${r.click.source} navigation click failed strict validation`);
  } else if(r.label==='Armored Vehicles'&&r.root.railCount!==0) fail.push(`${r.vp} Armored Vehicles: collection rail visible on page route`);
  if(r.root.overflow) fail.push(`${r.vp} ${r.label}: horizontal overflow`);
}
if(fail.length){console.error([...new Set(fail)].join('\n'));process.exit(2)}
console.log(JSON.stringify(results.map(r=>({vp:r.vp,label:r.label,status:r.status,rail:r.root.railCount,surfaces:r.root.surfaceCount,buttons:r.root.buttonCount,hierarchy:hierarchyTotal(r.root),grid:r.root.productGrid,bfl:r.root.hasBfl?`${r.root.bflState}/${r.root.fetchStability}/${r.root.owner}`:'none',click:r.click&&{source:r.click.source,status:r.click.status,target:r.click.target,shopAll:r.click.snap?.shopAll||false}})),null,2));
