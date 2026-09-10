import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE='https://www.statesideqm.com';
const THEME='158561894555';
const OUT=path.resolve('cert-v3');
const SHOTS=path.join(OUT,'screenshots');
const routes=[
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
const frozenStateGuard='/collections/state-guard-series';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function previewUrl(route,extra={}){const u=new URL(route,BASE);u.searchParams.set('preview_theme_id',THEME);for(const[k,v]of Object.entries(extra))u.searchParams.set(k,String(v));return u.toString()}
async function gotoRetry(page,url,attempts=5){let last;for(let i=0;i<attempts;i++){try{const r=await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});const status=r?.status()||0;if(status===200){await sleep(1500);return{status,attempt:i+1}}last=new Error(`HTTP ${status}`);if(![429,500,502,503,504].includes(status))break}catch(e){last=e}await sleep([5000,10000,15000,22000,30000][i]||30000)}throw last||new Error('navigation failed')}
async function waitV3(page){await page.waitForFunction(()=>document.querySelector('#MainContent')?.dataset.sqRefineV3Ready==='true',null,{timeout:45000});await page.waitForSelector('#MainContent .sq-refine-v3-sidebar',{state:'visible',timeout:15000});await sleep(700)}
async function inspectCollection(page){return await page.evaluate(()=>{const main=document.querySelector('#MainContent');const side=main?.querySelector('.sq-refine-v3-sidebar');const title=side?.querySelector('.sq-refine-v3-sidebar__title');const size=main?.querySelector('.sq-refine-v3-page-size');const grid=main?.querySelector('.sq-refine-v3-results .product-grid');const cards=grid?[...grid.querySelectorAll(':scope > .product-grid__item')].filter(x=>!!x.querySelector('a[href*="/products/"]')):[];const rects=cards.slice(0,12).map(x=>{const r=x.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width)}});const firstY=rects[0]?.y;const firstRow=rects.filter(r=>Math.abs(r.y-firstY)<=3);const groups=side?[...side.querySelectorAll(':scope > details.sq-refine-v3-group')].map(d=>({label:(d.querySelector(':scope > summary')?.textContent||'').trim().replace(/\s+/g,' '),inputs:d.querySelectorAll('input[type="checkbox"]').length,checked:d.querySelectorAll('input:checked').length,open:d.open,structural:[...d.querySelectorAll('input[data-kind="structural"]')].map(i=>i.dataset.target||''),native:[...d.querySelectorAll('input[data-kind="native"]')].map(i=>i.dataset.filterName||'')})):[];const sr=side?.getBoundingClientRect(),tr=title?.getBoundingClientRect();let cornerBg='';if(sr){let n=document.elementFromPoint(Math.max(0,sr.right-3),Math.max(0,sr.top+3));while(n&&n!==document.documentElement){const bg=getComputedStyle(n).backgroundColor;if(bg&&bg!=='rgba(0, 0, 0, 0)'&&bg!=='transparent'){cornerBg=bg;break}n=n.parentElement}}const visible=e=>{if(!e)return false;const c=getComputedStyle(e),r=e.getBoundingClientRect();return c.display!=='none'&&c.visibility!=='hidden'&&r.width>0&&r.height>0};const legacy=[...main.querySelectorAll('[class*="button-tree"],[class*="root-categories"],[class*="third-level"],[class*="branch-grid"],[class*="type-grid"],[class*="program-tree"],[class*="category-grid"],[class*="navigation-grid"],.sqbfl,.sqaca')].filter(e=>!e.closest('.sq-refine-v3-sidebar,.sq-refine-v3-results')&&visible(e)).length;return{ready:main?.dataset.sqRefineV3Ready==='true',error:main?.dataset.sqRefineV3Error||'',controller:!!window.__sqRefineV3,sidebar:visible(side),title:(title?.textContent||'').trim(),titleBg:title?getComputedStyle(title).backgroundColor:'',titleFg:title?getComputedStyle(title).color:'',cornerBg,titleRightGap:sr&&tr?Math.round(Math.max(0,sr.right-tr.right)*10)/10:null,sidebarPosition:side?getComputedStyle(side).position:'',sidebarHeight:side?Math.round(side.getBoundingClientRect().height):0,pageSizes:size?[...size.querySelectorAll('input')].map(i=>({value:i.value,checked:i.checked})):[],pageSizeVisible:visible(size),pageSizeInsideSidebar:!!size?.closest('.sq-refine-v3-sidebar'),cards:cards.length,firstRowCount:firstRow.length,cardWidth:firstRow.length?Math.round(firstRow.map(r=>r.w).sort((a,b)=>a-b)[Math.floor(firstRow.length/2)]):0,gridVisible:visible(grid),groups,legacy}})}
function hasGroup(d,label){return d.groups.some(g=>g.label.toLowerCase()===label.toLowerCase()&&g.inputs>0)}
function validateCollection(d,route){const e=[];if(!d.ready||d.error||!d.controller)e.push('V3 controller not ready');if(!d.sidebar)e.push('sidebar missing');if(d.title.toUpperCase()!=='REFINE PRODUCTS')e.push(`title ${d.title}`);if(d.titleBg!=='rgb(8, 40, 63)'||d.titleFg!=='rgb(255, 255, 255)')e.push(`header colors ${d.titleBg}/${d.titleFg}`);if(d.cornerBg!=='rgb(8, 40, 63)')e.push(`upper-right corner ${d.cornerBg}`);if(d.titleRightGap!==null&&d.titleRightGap>1.5)e.push(`title right gap ${d.titleRightGap}`);if(!d.pageSizeVisible)e.push('page-size control missing');if(d.pageSizeInsideSidebar)e.push('page-size control inside sidebar');if(d.pageSizes.map(x=>x.value).join(',')!=='50,100,250')e.push(`page sizes ${d.pageSizes.map(x=>x.value).join(',')}`);if(d.pageSizes.find(x=>x.value==='50')?.checked!==true)e.push('50 not default');if(d.gridVisible&&d.cards>0&&d.firstRowCount!==3)e.push(`desktop first row ${d.firstRowCount}`);if(d.cards>0&&d.cardWidth<250)e.push(`desktop card width ${d.cardWidth}`);if(d.sidebarPosition!=='sticky')e.push(`desktop sidebar ${d.sidebarPosition}`);if(d.sidebarHeight<600)e.push(`sidebar height ${d.sidebarHeight}`);if(d.legacy)e.push(`visible legacy nav ${d.legacy}`);if(!hasGroup(d,'Shop by Type'))e.push('missing Shop by Type');if(!hasGroup(d,'Shop by Manufacturers'))e.push('missing Shop by Manufacturers');if(route==='/collections/literature'&&(!hasGroup(d,'Shop by Author')||!hasGroup(d,'Shop by Publishers')))e.push('missing book author/publishers');if(route==='/collections/firearm-accessories'&&!hasGroup(d,'Shop by Firearm Make / Model'))e.push('missing firearm make/model');for(const g of d.groups){if(!g.inputs)e.push(`empty ${g.label}`);if(g.checked===0&&g.open)e.push(`inactive open ${g.label}`);if(g.checked>0&&!g.open)e.push(`active closed ${g.label}`);for(const t of g.structural){const root=route.split('/collections/')[1];if(root&&(!t.includes('/collections/')||!t.includes(`sq_root=${encodeURIComponent(root)}`)))e.push(`bad structural target ${g.label}`)}for(const n of g.native){if(n&&!n.startsWith('filter.'))e.push(`bad native filter ${n}`)}}return e}
async function toggleCheck(page){const d=page.locator('.sq-refine-v3-sidebar details.sq-refine-v3-group').filter({has:page.locator('input:not(:checked)')}).first();if(await d.count()===0)return{pass:true,skipped:true};if(await d.getAttribute('open')!==null)return{pass:false,error:'inactive group starts open'};const s=d.locator(':scope > summary');const before=await s.evaluate(el=>getComputedStyle(el,'::after').content);await s.click();await sleep(120);const open=await d.getAttribute('open')!==null;const mid=await s.evaluate(el=>getComputedStyle(el,'::after').content);await s.click();await sleep(120);const closed=await d.getAttribute('open')===null;const end=await s.evaluate(el=>getComputedStyle(el,'::after').content);return{pass:/\+/.test(before)&&open&&/[−\u2212-]/.test(mid)&&closed&&/\+/.test(end),before,mid,end}}
async function mobileCheck(browser,route){const c=await browser.newContext({viewport:{width:390,height:844}});const p=await c.newPage();try{const nav=await gotoRetry(p,previewUrl(route),5);await waitV3(p);const d=await p.evaluate(()=>{const side=document.querySelector('#MainContent .sq-refine-v3-sidebar');const grid=document.querySelector('#MainContent .sq-refine-v3-results .product-grid');const cards=grid?[...grid.querySelectorAll(':scope > .product-grid__item')].filter(x=>!!x.querySelector('a[href*="/products/"]')):[];const rs=cards.slice(0,8).map(x=>{const r=x.getBoundingClientRect();return{y:Math.round(r.y)}});const y=rs[0]?.y;return{position:side?getComputedStyle(side).position:'',cards:cards.length,row:rs.filter(r=>Math.abs(r.y-y)<=3).length}});return{pass:d.position!=='sticky'&&(!d.cards||d.row===2),http:nav.status,...d}}catch(e){return{pass:false,error:String(e)}}finally{await c.close()}}
async function pageSizeCheck(browser,target){const c=await browser.newContext({viewport:{width:1440,height:1000}});const p=await c.newPage();try{await gotoRetry(p,previewUrl('/collections/accessories-gifts-collectibles',{sq_per_page:target,sq_view_page:1}),5);await waitV3(p);await sleep(target===250?3500:2200);const d=await p.evaluate(target=>{const grid=document.querySelector('#MainContent .sq-refine-v3-results .product-grid');const cards=grid?[...grid.querySelectorAll(':scope > .product-grid__item')].filter(x=>!!x.querySelector('a[href*="/products/"]')):[];const input=document.querySelector(`.sq-refine-v3-page-size input[value="${target}"]`);return{count:cards.length,checked:!!input?.checked}},target);return{pass:d.count===target&&d.checked,target,...d}}catch(e){return{pass:false,target,error:String(e)}}finally{await c.close()}}

await fs.mkdir(SHOTS,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();
const report={theme:THEME,createdAt:new Date().toISOString(),routes:[],special:{},summary:{}};
try{
for(let i=0;i<routes.length;i++){const[name,route,type='collection']=routes[i];const row={index:i+1,name,route,type,pass:false,errors:[]};try{const nav=await gotoRetry(page,previewUrl(route),5);row.http=nav.status;row.navigationAttempt=nav.attempt;if(type==='page'){const d=await page.evaluate(()=>({v3:!!document.querySelector('[data-sq-refine-v3]'),sidebar:!!document.querySelector('.sq-refine-v3-sidebar')}));row.data=d;if(d.v3||d.sidebar)row.errors.push('Armored Vehicles received V3 UI')}else{await waitV3(page);row.data=await inspectCollection(page);row.errors.push(...validateCollection(row.data,route));row.toggle=await toggleCheck(page);if(!row.toggle.pass)row.errors.push('plus/minus toggle failed')}}catch(e){row.errors.push(String(e))}row.pass=row.errors.length===0;report.routes.push(row);console.log(`${row.pass?'PASS':'FAIL'} ${i+1}/41 ${name}${row.errors.length?' :: '+row.errors.join(' | '):''}`);if(!row.pass||['/collections/apparel','/collections/literature','/collections/firearm-accessories','/collections/thin-line','/collections/products-built-for-the-line-u-s-navy','/collections/firefighting-ems-search-rescue'].includes(route))await page.screenshot({path:path.join(SHOTS,`${String(i+1).padStart(2,'0')}-${slug(name)}.png`),fullPage:true}).catch(()=>{});await sleep(3000)}
try{await gotoRetry(page,previewUrl(frozenStateGuard),5);const d=await page.evaluate(()=>({v3:!!document.querySelector('[data-sq-refine-v3]'),sidebar:!!document.querySelector('.sq-refine-v3-sidebar')}));report.special.stateGuard={pass:!d.v3&&!d.sidebar,...d}}catch(e){report.special.stateGuard={pass:false,error:String(e)}}
report.special.mobile={};for(const r of ['/collections/apparel','/collections/accessories-gifts-collectibles','/collections/literature','/collections/firearm-accessories','/collections/products-built-for-the-line-u-s-navy','/collections/thin-line','/collections/law-enforcement-corrections','/collections/firefighting-ems-search-rescue']){report.special.mobile[r]=await mobileCheck(browser,r);await sleep(2500)}
report.special.pageSizes={100:await pageSizeCheck(browser,100),250:await pageSizeCheck(browser,250)};
report.summary={requested:41,passed:report.routes.filter(r=>r.pass).length,failed:report.routes.filter(r=>!r.pass).length,stateGuardFrozenPass:!!report.special.stateGuard?.pass,mobilePass:Object.values(report.special.mobile).every(x=>x.pass),pageSizePass:Object.values(report.special.pageSizes).every(x=>x.pass)};report.summary.overallPass=report.summary.passed===41&&report.summary.stateGuardFrozenPass&&report.summary.mobilePass&&report.summary.pageSizePass;await fs.writeFile(path.join(OUT,'report.json'),JSON.stringify(report,null,2));await fs.writeFile(path.join(OUT,'summary.txt'),JSON.stringify(report.summary,null,2)+'\n');console.log('SUMMARY',JSON.stringify(report.summary));if(!report.summary.overallPass)process.exitCode=1
}finally{await context.close();await browser.close()}
