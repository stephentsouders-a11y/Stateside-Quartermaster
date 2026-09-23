import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const THEME='159040962715';
const ORIGIN='https://www.statesideqm.com';
const OUT='audit-out/sidebar-tree';
const VIDEO_DIR=path.join(OUT,'video');
const SHOT_DIR=path.join(OUT,'screenshots');
fs.mkdirSync(VIDEO_DIR,{recursive:true});
fs.mkdirSync(SHOT_DIR,{recursive:true});

const HOME=[
'tactical-gear','uniforms','firearm-accessories','body-armor-ballistic-protection','apparel','flags-patriotic-decor','literature','outdoor-preparedness-gear','first-aid-medical-ifak','flashlights-lighting','knives-axes-cutlery','dive-scuba','armed-forces-gear','morale-patches-tactical-id','footwear-gloves-eyewear','accessories-gifts-collectibles','safety-rescue-climbing','airsoft-milsim','k9-dog-gear','patriotic-american-heritage','art','zippos-lighters-torches','watches','armored-vehicles','child-safety-shop','thin-line','sta-brite-insignia','stateside-quartermaster-logo-merch','army-national-guard-series','air-national-guard-series','state-guard-series','products-built-for-the-line-u-s-army','products-built-for-the-line-u-s-navy','products-built-for-the-line-u-s-air-force','products-built-for-the-line-u-s-marine-corps','products-built-for-the-line-u-s-coast-guard','products-built-for-the-line-u-s-space-force','rotc-series','jrotc-series','military-schools-academies','law-enforcement-corrections-shop','firefighting-ems-search-rescue-shop'
];
const SG=[
'state-guard-series-alabama','state-guard-series-alaska','state-guard-series-california','state-guard-series-connecticut','state-guard-series-florida','state-guard-series-georgia','state-guard-series-indiana','state-guard-series-louisiana','state-guard-series-maryland','state-guard-series-massachusetts','state-guard-series-michigan','state-guard-series-mississippi','state-guard-series-new-mexico','new-jersey-state-guard-naval-militia','state-guard-series-new-york','state-guard-series-ohio','state-guard-series-oregon','state-guard-series-puerto-rico','state-guard-series-rhode-island','state-guard-series-south-carolina','state-guard-series-tennessee','state-guard-series-texas','state-guard-series-vermont','state-guard-series-virginia','state-guard-series-washington','state-guard-naval-militia-themed-merchandise'
];
const EXPECTED=['Shop All','Categories','Price','Color / Pattern','Manufacturer'];
const failures=[], coverage=[], scenarios=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function urlFor(handle){
  const u=new URL('/collections/'+handle,ORIGIN);
  u.searchParams.set('filter.v.availability','1');
  u.searchParams.set('preview_theme_id',THEME);
  return u.href;
}
async function gotoReady(page,url,label,attempts=5){
  let last=null;
  for(let i=1;i<=attempts;i++){
    try{last=await page.goto(url,{waitUntil:'domcontentloaded',timeout:70000});}catch{last=null}
    await sleep(1800);
    const status=last?.status()??null;
    const title=await page.title().catch(()=>'');
    const body=await page.locator('body').innerText({timeout:3000}).catch(()=>'');
    const blocked=status===429||/Just a moment|Too Many Requests/i.test(title+' '+body.slice(0,600));
    const errored=status>=500||/Something went wrong/i.test(title);
    if(status===200&&!blocked&&!errored)return last;
    console.log(`${label} attempt ${i}: HTTP=${status} title=${title}`);
    await sleep(Math.min(45000,7000*Math.pow(2,i-1)));
  }
  return last;
}
async function railExists(page){
  await page.waitForSelector('[data-sq-collection-rail][data-sq-department-root="true"]',{timeout:25000});
}
async function openMobile(page){
  const mt=page.locator('[data-sq-rail-mobile-toggle]').first();
  if(await mt.count()){
    const expanded=await mt.getAttribute('aria-expanded');
    if(expanded!=='true'){await mt.click();await sleep(350)}
  }
}
async function waitFive(page){
  await page.waitForFunction((expected)=>{
    const rail=document.querySelector('[data-sq-collection-rail][data-sq-department-root="true"]');
    if(!rail)return false;
    const vis=e=>{if(!e)return false;const s=getComputedStyle(e),r=e.getBoundingClientRect();return !e.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>2&&r.height>2};
    const labels=[...rail.querySelectorAll('.sq-collection-rail__primary > li')].filter(vis).map(li=>{
      const x=li.querySelector(':scope > .sq-collection-rail__direct,:scope > [data-sq-rail-trigger]');
      return (x?.querySelector('span')?.textContent||x?.textContent||'').replace(/\s+/g,' ').trim();
    });
    return expected.every(x=>labels.includes(x));
  },EXPECTED,{timeout:25000});
}
async function snapshot(page){
  return await page.evaluate(()=>{
    const rail=document.querySelector('[data-sq-collection-rail][data-sq-department-root="true"]');
    const vis=e=>{if(!e)return false;const s=getComputedStyle(e),r=e.getBoundingClientRect();return !e.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0&&r.width>2&&r.height>2};
    const top=rail?[...rail.querySelectorAll('.sq-collection-rail__primary > li')].filter(vis).map(li=>{
      const x=li.querySelector(':scope > .sq-collection-rail__direct,:scope > [data-sq-rail-trigger]');
      return {label:(x?.querySelector('span')?.textContent||x?.textContent||'').replace(/\s+/g,' ').trim(),open:li.classList.contains('is-open'),aria:x?.getAttribute('aria-expanded')??null};
    }):[];
    const white=rail?[...rail.querySelectorAll('.sq-collection-rail__flyout')].filter(e=>{if(!vis(e))return false;const bg=getComputedStyle(e).backgroundColor;return bg==='rgb(255, 255, 255)'||bg==='rgba(255, 255, 255, 1)'}).length:0;
    return {railCount:[...document.querySelectorAll('[data-sq-collection-rail]')].filter(vis).length,top,white,hOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+4,url:location.href};
  });
}
async function assertTop(page,label){
  const s=await snapshot(page);
  const labels=s.top.map(x=>x.label);
  if(s.railCount!==1)failures.push(`${label}: expected 1 rail, got ${s.railCount}`);
  if(JSON.stringify(labels)!==JSON.stringify(EXPECTED))failures.push(`${label}: top controls ${JSON.stringify(labels)}`);
  if(s.white)failures.push(`${label}: white flyout visible`);
  if(s.hOverflow)failures.push(`${label}: horizontal overflow`);
  return s;
}
async function toggleTwice(page,selector,label){
  const item=page.locator(selector).first(),trigger=item.locator(':scope > [data-sq-rail-trigger]');
  if(!(await trigger.count())){failures.push(`${label}: missing trigger`);return false}
  await trigger.click();await sleep(250);
  const opened=await item.evaluate(el=>el.classList.contains('is-open')&&el.querySelector(':scope > [data-sq-rail-trigger]')?.getAttribute('aria-expanded')==='true');
  if(!opened)failures.push(`${label}: first click did not open`);
  await trigger.click();await sleep(250);
  const closed=await item.evaluate(el=>!el.classList.contains('is-open')&&el.querySelector(':scope > [data-sq-rail-trigger]')?.getAttribute('aria-expanded')==='false');
  if(!closed)failures.push(`${label}: second click did not close`);
  return opened&&closed;
}
async function prep(page,handle,label,mobile=false){
  const r=await gotoReady(page,urlFor(handle),label);
  if(r?.status()!==200)throw new Error(`HTTP ${r?.status()}`);
  await railExists(page);
  if(mobile)await openMobile(page);
  await waitFive(page);
  return assertTop(page,label);
}
async function findExpandableCategory(page){
  const cat=page.locator('[data-sq-context-categories]').first();
  if(!(await cat.evaluate(el=>el.classList.contains('is-open')))){
    await cat.locator(':scope > [data-sq-rail-trigger]').click();
    await sleep(350);
  }
  const preferred=page.locator('[data-sq-context-categories-list] > li > a[href]').filter({hasText:/^Apparel & Headwear$/i}).first();
  if(!(await preferred.count()))return null;
  await preferred.scrollIntoViewIfNeeded().catch(()=>{});
  await preferred.click();
  await sleep(900);
  const category=page.locator('[data-sq-context-categories-list] > li > a[href]').filter({hasText:/^Apparel & Headwear$/i}).first();
  const li=category.locator('xpath=..');
  const sub=li.locator(':scope > .sq-collection-rail__cascade-column:not([hidden]) a[data-sq-cascade-kind="subcategory"]').first();
  if(!(await sub.count()))return null;
  await sub.scrollIntoViewIfNeeded().catch(()=>{});
  const visible=await sub.isVisible().catch(()=>false);
  if(!visible)return {category,sub,categoryLi:li,subVisible:false};
  return {category,sub,categoryLi:li,subVisible:true};
}
async function genericScenario(page,device){
  const label=`${device} generic`,mobile=device==='mobile';
  await prep(page,'products-built-for-the-line-u-s-army',label,mobile);
  await page.screenshot({path:path.join(SHOT_DIR,`${device}-generic-root.png`),fullPage:true});
  for(const [sel,name] of [
    ['[data-sq-context-categories]','Categories'],
    ['[data-sq-refinement-key="price"]','Price'],
    ['[data-sq-refinement-key="color-pattern"]','Color / Pattern'],
    ['[data-sq-refinement-key="manufacturer"]','Manufacturer']
  ])await toggleTwice(page,sel,`${label} ${name}`);

  const price=page.locator('[data-sq-refinement-key="price"]').first();
  await price.locator(':scope > [data-sq-rail-trigger]').hover();await sleep(400);
  if(await price.evaluate(el=>el.classList.contains('is-open')))failures.push(`${label}: hover opened Price`);

  const found=await findExpandableCategory(page);
  if(!found){failures.push(`${label}: no true Category->Subcategory branch found`);return}
  const {category,sub,categoryLi,subVisible}=found;
  if(!subVisible){failures.push(`${label}: nested Subcategory exists but is not visible`);return}
  const catActive=await category.evaluate(a=>a.classList.contains('is-cascade-active')&&a.getAttribute('aria-expanded')==='true');
  if(!catActive)failures.push(`${label}: category not active after click`);
  await page.screenshot({path:path.join(SHOT_DIR,`${device}-generic-subcategories.png`),fullPage:true});

  const before=new URL(page.url()).pathname;
  await sub.click();await sleep(1200);
  if(new URL(page.url()).pathname!==before)failures.push(`${label}: true Subcategory navigated instead of expanding`);
  const subLi=sub.locator('xpath=..');
  const typePanel=subLi.locator(':scope > .sq-collection-rail__cascade-column:not([hidden])').first();
  const typeLinks=typePanel.locator('a[data-sq-cascade-kind="type"],a[data-sq-cascade-kind="direct-type"]');
  if(!(await typePanel.count()))failures.push(`${label}: Type panel missing under Subcategory`);
  if((await typeLinks.count())<1)failures.push(`${label}: no terminal Types under Subcategory`);
  await page.screenshot({path:path.join(SHOT_DIR,`${device}-generic-types.png`),fullPage:true});

  await sub.click();await sleep(250);
  const subCollapsed=await subLi.locator(':scope > .sq-collection-rail__cascade-column').first().evaluate(el=>el.hidden).catch(()=>false);
  if(!subCollapsed)failures.push(`${label}: second Subcategory click did not collapse Types`);
  await category.click();await sleep(250);
  const catCollapsed=await categoryLi.locator(':scope > .sq-collection-rail__cascade-column').first().evaluate(el=>el.hidden).catch(()=>false);
  if(!catCollapsed)failures.push(`${label}: second Category click did not collapse subtree`);
  scenarios.push({scenario:'generic',device,passed:!failures.some(x=>x.startsWith(label))});
}
async function stateGuardScenario(page,device){
  const label=`${device} state-guard`,mobile=device==='mobile';
  await prep(page,'state-guard-series-ohio',label,mobile);
  await toggleTwice(page,'[data-sq-context-categories]',`${label} Categories`);
  const cat=page.locator('[data-sq-context-categories]').first();
  await cat.locator(':scope > [data-sq-rail-trigger]').click();await sleep(1400);
  await page.waitForFunction(()=>document.querySelector('[data-sq-collection-rail]')?.dataset.sqStateGuardTreeReady==='true',{timeout:20000});
  const uniforms=page.locator('[data-sq-context-categories-list] > li > a[href]').filter({hasText:/^Uniforms$/i}).first();
  if(!(await uniforms.count())){failures.push(`${label}: Uniforms missing`);return}
  const pathBefore=new URL(page.url()).pathname;
  await uniforms.click();await sleep(700);
  if(new URL(page.url()).pathname!==pathBefore)failures.push(`${label}: Uniforms navigated instead of expanding`);
  const uLi=uniforms.locator('xpath=..');
  const subs=uLi.locator(':scope > .sq-collection-rail__cascade-column:not([hidden]) a[data-kind="subcategory"]');
  const sc=await subs.count();
  if(sc<1)failures.push(`${label}: Uniforms produced zero subcategories`);
  await page.screenshot({path:path.join(SHOT_DIR,`${device}-state-guard-uniforms.png`),fullPage:true});
  if(sc){
    let chosen=null;
    for(let i=0;i<sc;i++){
      const a=subs.nth(i),txt=(await a.textContent()||'').trim();
      if(/OCP|Field|PT|Service|Dress/i.test(txt)){chosen=a;break}
    }
    chosen=chosen||subs.first();
    await chosen.click();await sleep(450);
    const sLi=chosen.locator('xpath=..');
    const tp=sLi.locator(':scope > .sq-collection-rail__cascade-column:not([hidden])').first();
    const tc=await tp.locator('a[data-kind="type"]').count();
    if(tc<1)failures.push(`${label}: State Guard Uniform subcategory produced zero component Types`);
    await chosen.click();await sleep(220);
    const h=await sLi.locator(':scope > .sq-collection-rail__cascade-column').first().evaluate(el=>el.hidden).catch(()=>false);
    if(!h)failures.push(`${label}: second Subcategory click did not collapse Types`);
  }
  await uniforms.click();await sleep(220);
  const h=await uLi.locator(':scope > .sq-collection-rail__cascade-column').first().evaluate(el=>el.hidden).catch(()=>false);
  if(!h)failures.push(`${label}: second Category click did not collapse subtree`);
  scenarios.push({scenario:'state-guard',device,passed:!failures.some(x=>x.startsWith(label))});
}
async function recorded(browser,state,name,viewport,fn){
  const ctx=await browser.newContext({viewport,storageState:state,recordVideo:{dir:VIDEO_DIR,size:viewport}});
  const p=await ctx.newPage(); const v=p.video();
  try{await fn(p)}catch(e){failures.push(`${name}: ${e.message}`)}
  await ctx.close();
  try{const src=await v.path();const dst=path.join(VIDEO_DIR,name+'.webm');if(src!==dst)fs.copyFileSync(src,dst)}catch(e){failures.push(`${name}: video finalize failed: ${e.message}`)}
}

const browser=await chromium.launch({headless:true});
const boot=await browser.newContext({viewport:{width:1440,height:1000}});
const bp=await boot.newPage();
const br=await gotoReady(bp,`${ORIGIN}/?preview_theme_id=${THEME}`,'preview bootstrap');
if(br?.status()!==200)failures.push(`preview bootstrap: HTTP ${br?.status()}`);
const state=path.join(OUT,'preview-state.json');
await boot.storageState({path:state});await boot.close();

// Stage A smoke test first. Stop full-route Chromium coverage if tree behavior itself is broken.
await recorded(browser,state,'desktop-generic-tree',{width:1440,height:1000},p=>genericScenario(p,'desktop'));
await sleep(5000);
await recorded(browser,state,'desktop-state-guard-tree',{width:1440,height:1000},p=>stateGuardScenario(p,'desktop'));
await sleep(5000);
await recorded(browser,state,'mobile-generic-tree',{width:390,height:844},p=>genericScenario(p,'mobile'));
await sleep(5000);
await recorded(browser,state,'mobile-state-guard-tree',{width:390,height:844},p=>stateGuardScenario(p,'mobile'));

const smokeFailures=failures.filter(x=>/generic|state-guard/.test(x));
if(smokeFailures.length===0){
  const ctx=await browser.newContext({viewport:{width:1440,height:1000},storageState:state});
  const page=await ctx.newPage();
  for(const handle of [...HOME,...SG]){
    const label=`coverage ${handle}`;
    const before=failures.length;
    const r=await gotoReady(page,urlFor(handle),label,4);
    if(r?.status()!==200){
      failures.push(`${label}: unresolved HTTP ${r?.status()}`);
      coverage.push({handle,passed:false,status:r?.status()??null});
    }else{
      try{
        await railExists(page);await waitFive(page);await assertTop(page,label);
        const ok=await toggleTwice(page,'[data-sq-context-categories]',`${label} Categories`);
        coverage.push({handle,passed:ok&&failures.length===before});
      }catch(e){
        failures.push(`${label}: ${e.message}`);
        coverage.push({handle,passed:false,error:e.message});
      }
    }
    await sleep(9000);
  }
  await ctx.close();
}else{
  console.log('Skipping full-route browser coverage because smoke-stage functional failures remain.');
}

await browser.close();
const report={
 generatedAt:new Date().toISOString(),theme:THEME,
 smoke:{passed:smokeFailures.length===0,failures:smokeFailures},
 homepageCoverage:{passed:coverage.filter(x=>HOME.includes(x.handle)&&x.passed).length,total:HOME.length},
 stateGuardCoverage:{passed:coverage.filter(x=>SG.includes(x.handle)&&x.passed).length,total:SG.length},
 coverage,scenarios,failures,passed:failures.length===0&&coverage.length===HOME.length+SG.length
};
fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(!report.passed)process.exitCode=2;
