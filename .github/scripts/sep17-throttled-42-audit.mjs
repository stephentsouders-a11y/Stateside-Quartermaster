import { chromium } from 'playwright';
import fs from 'fs';
const THEME='158770561179';
const BASE='https://www.statesideqm.com';
const batch=Number(process.argv[2]||1);
const routes=[
['Accessories, Gifts & Collectibles','/collections/accessories-gifts-collectibles','collection'],['Airsoft & Milsim','/collections/airsoft-milsim','collection'],['Apparel & Headwear','/collections/apparel','collection'],['Armed Forces Gear','/collections/armed-forces-gear','collection'],['Armored Vehicles','/pages/armored-vehicles-purchase-inquiry','page'],['Art & Military Prints','/collections/art','collection'],['Body Armor & Ballistic Protection','/collections/body-armor-ballistic-protection','collection'],
['Books, Literature, Manuals & Reference','/collections/literature','collection'],['Child Safety Shop','/collections/child-safety-shop','collection'],['DIVE / SCUBA','/collections/dive-scuba','collection'],['Firearm Accessories, Holsters & Shooting Gear','/collections/firearm-accessories','collection'],['First Aid, Medical & IFAK','/collections/first-aid-medical-ifak','collection'],['Flags, Displays & Memorials','/collections/flags-patriotic-decor','collection'],['Flashlights, Lighting & Power','/collections/flashlights-lighting','collection'],
['Footwear, Gloves & Eyewear','/collections/footwear-gloves-eyewear','collection'],['K9 & Working Dog Gear','/collections/k9-dog-gear','collection'],['Knives, Axes & Multi-Tools','/collections/knives-axes-cutlery','collection'],['Morale Patches, Stickers & Tactical ID','/collections/morale-patches-tactical-id','collection'],['Outdoor, Survival & Preparedness','/collections/outdoor-preparedness-gear','collection'],['Patriotic & American Heritage','/collections/patriotic-american-heritage','collection'],['Safety, Rescue & Climbing','/collections/safety-rescue-climbing','collection'],
['Sta-Brite Insignia','/collections/sta-brite-insignia','collection'],['Tactical Gear, Packs & Load Carriage','/collections/tactical-gear','collection'],['Thin Line Shop','/collections/thin-line','collection'],['Uniforms, Insignia & Identification','/collections/uniforms','collection'],['Watches & Timepieces','/collections/watches','collection'],['Zippo, Lighters & Fire Starters','/collections/zippos-lighters-torches','collection'],['Logo Merch','/collections/stateside-quartermaster-logo-merch','collection'],
['Army National Guard Series','/collections/army-national-guard-series','collection'],['Air National Guard Series','/collections/air-national-guard-series','collection'],['State Guard Series','/collections/state-guard-series','collection'],['U.S. Army Series','/collections/products-built-for-the-line-u-s-army','collection'],['U.S. Navy Series','/collections/products-built-for-the-line-u-s-navy','collection'],['U.S. Air Force Series','/collections/products-built-for-the-line-u-s-air-force','collection'],['U.S. Marine Corps Series','/collections/products-built-for-the-line-u-s-marine-corps','collection'],
['U.S. Coast Guard Series','/collections/products-built-for-the-line-u-s-coast-guard','collection'],['U.S. Space Force Series','/collections/products-built-for-the-line-u-s-space-force','collection'],['ROTC Series','/collections/rotc-series','collection'],['JROTC Series','/collections/jrotc-series','collection'],['Military Schools & Academies','/collections/military-schools-academies','collection'],['Law Enforcement & Corrections','/collections/law-enforcement-corrections','collection'],['Firefighting, EMS & Search & Rescue','/collections/firefighting-ems-search-rescue','collection']
];
const start=(batch-1)*7,end=Math.min(start+7,routes.length),slice=routes.slice(start,end);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
fs.mkdirSync('sep17-42-audit',{recursive:true});
const browser=await chromium.launch({headless:true});
const ctx=await browser.newContext({viewport:{width:1440,height:1100}});
const page=await ctx.newPage();page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(70000);
await page.goto(`${BASE}/?preview_theme_id=${THEME}`,{waitUntil:'domcontentloaded'});await sleep(1400);
const results=[];
async function navigate(path){for(let a=0;a<3;a++){let r=await page.goto(BASE+path,{waitUntil:'domcontentloaded'}).catch(()=>null);if(r?.status()!==429)return r;if(a<2)await sleep(25000);}return null}
for(let j=0;j<slice.length;j++){
  const idx=start+j+1,[name,path,type]=slice[j];if(j)await sleep(6000);
  const r=await navigate(path),status=r?.status()??null,out={idx,name,path,status,type,outcome:'PASS',reasons:[],groups:{},desktop:{},mobile:{}};
  if(status===429||status===null){out.outcome='INFRA';out.reasons.push('persistent HTTP 429/no response');results.push(out);console.log(`AUDIT ${idx}/42 INFRA ${name}`);continue}
  if(status!==200){out.outcome='FAIL';out.reasons.push('HTTP '+status)}
  await sleep(5000);
  if(type==='page'){
    out.desktop=await page.evaluate(()=>({h1:(document.querySelector('h1')?.textContent||'').trim(),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+4,rails:document.querySelectorAll('[data-sq-collection-rail]').length}));
    if(out.desktop.rails)out.reasons.push('unexpected collection rail on page');if(out.desktop.overflow)out.reasons.push('desktop overflow');
  }else{
    out.desktop=await page.evaluate(()=>{
      const rail=document.querySelector('[data-sq-collection-rail]'),main=document.getElementById('MainContent')||document.body,visible=e=>{if(!e)return false;const s=getComputedStyle(e),q=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&!e.hidden&&q.width>2&&q.height>2},r=rail?.getBoundingClientRect(),m=main?.getBoundingClientRect();
      const g=(name,item,list)=>{const i=rail?.querySelector(item),l=rail?.querySelector(list);return{name,visible:visible(i),count:l?.querySelectorAll('a[href]').length||0,labels:[...(l?.querySelectorAll('.sq-collection-rail__link-label')||[])].map(x=>(x.textContent||'').trim()).filter(Boolean)}};
      const sourceSel='.sq-subcategory-section,.sq-third-level,.sq-ts-match-section,.sq-ptype-browser,[data-sq-afg-mode],.vac-guard-folders,.sqbfl,.sq-line-series-categories,.sq-line-program-tree,.sq-ps-root,.sq-books-tree,.vac-gift-categories';
      const dup=[...main.querySelectorAll(sourceSel)].filter(visible).filter(x=>x.querySelector('a[href*="/collections/"]')).length;
      const products=[...main.querySelectorAll('a[href*="/products/"]')].filter(visible).length;
      return{railCount:[...document.querySelectorAll('[data-sq-collection-rail]')].filter(visible).length,railWidth:r?.width||0,mainLeft:m?.left||0,groups:[g('Categories','[data-sq-context-categories]','[data-sq-context-categories-list]'),g('Subcategories','[data-sq-context-subcategories]','[data-sq-context-subcategories-list]'),g('Types','[data-sq-context-types]','[data-sq-context-types-list]'),g('Organizations','[data-sq-context-organizations]','[data-sq-context-organizations-list]')],products,dupSources:dup,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+4};
    });
    if(out.desktop.railCount!==1)out.reasons.push('visible rails '+out.desktop.railCount);if(out.desktop.railWidth<220||out.desktop.railWidth>250)out.reasons.push('rail width '+out.desktop.railWidth);if(out.desktop.mainLeft<260)out.reasons.push('content not reserved '+out.desktop.mainLeft);if(out.desktop.overflow)out.reasons.push('desktop overflow');if(!out.desktop.products)out.reasons.push('no visible product links');if(out.desktop.dupSources)out.reasons.push('legacy nav sources visible '+out.desktop.dupSources);
    for(const gr of out.desktop.groups.filter(x=>x.visible&&x.count)){
      const sel=gr.name==='Categories'?'[data-sq-context-categories]':gr.name==='Subcategories'?'[data-sq-context-subcategories]':gr.name==='Types'?'[data-sq-context-types]':'[data-sq-context-organizations]';
      const trigger=page.locator(`${sel} [data-sq-rail-trigger]`).first();if(!await trigger.count())continue;await trigger.click();await sleep(450);
      const geo=await page.evaluate(sel=>{const item=document.querySelector(sel),fly=item?.querySelector('[data-sq-rail-flyout]'),main=document.getElementById('MainContent')||document.body,fr=fly?.getBoundingClientRect(),mr=main?.getBoundingClientRect();return{aria:item?.querySelector('[data-sq-rail-trigger]')?.getAttribute('aria-expanded'),open:item?.classList.contains('is-open'),flyWidth:fr?.width||0,flyRight:fr?.right||0,mainLeft:mr?.left||0,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+4}},sel);
      if(geo.aria!=='true'||!geo.open||geo.flyWidth<300)out.reasons.push(gr.name+' did not open');if(geo.mainLeft<geo.flyRight+20)out.reasons.push(gr.name+' overlaps content');if(geo.overflow)out.reasons.push(gr.name+' causes overflow');await page.keyboard.press('Escape');await sleep(100);
    }
    await page.setViewportSize({width:390,height:844});await sleep(350);out.mobile=await page.evaluate(()=>{const rail=document.querySelector('[data-sq-collection-rail]'),main=document.getElementById('MainContent')||document.body,rr=rail?.getBoundingClientRect(),mr=main?.getBoundingClientRect();return{railWidth:rr?.width||0,mainWidth:mr?.width||0,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+3}});if(out.mobile.overflow||out.mobile.railWidth>392||out.mobile.mainWidth>392)out.reasons.push('mobile overflow/width');await page.setViewportSize({width:1440,height:1100});
  }
  if(out.outcome!=='INFRA')out.outcome=out.reasons.length?'FAIL':'PASS';results.push(out);console.log(`AUDIT ${idx}/42 ${out.outcome} ${name}${out.reasons.length?' :: '+out.reasons.join('; '):''}`);
  if(out.outcome==='FAIL')await page.screenshot({path:`sep17-42-audit/${String(idx).padStart(2,'0')}-FAIL.png`,fullPage:true}).catch(()=>{});
}
fs.writeFileSync(`sep17-42-audit/batch-${batch}.json`,JSON.stringify(results,null,2));await browser.close();
console.log('BATCH_SUMMARY',JSON.stringify(results.map(x=>({idx:x.idx,outcome:x.outcome,name:x.name,reasons:x.reasons}))));
