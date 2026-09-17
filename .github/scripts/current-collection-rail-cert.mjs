import { chromium } from 'playwright';
import fs from 'fs';

const THEME='158770561179';
const BASE='https://www.statesideqm.com';
const routes=[
['Accessories, Gifts & Collectibles','/collections/accessories-gifts-collectibles','collection'],
['Airsoft & Milsim','/collections/airsoft-milsim','collection'],
['Apparel & Headwear','/collections/apparel','collection'],
['Armed Forces Gear','/collections/armed-forces-gear','collection'],
['Armored Vehicles','/pages/armored-vehicles-purchase-inquiry','page'],
['Art & Military Prints','/collections/art','collection'],
['Body Armor & Ballistic Protection','/collections/body-armor-ballistic-protection','collection'],
['Books, Literature, Manuals & Reference','/collections/literature','collection'],
['Child Safety Shop','/collections/child-safety-shop','collection'],
['DIVE / SCUBA','/collections/dive-scuba','collection'],
['Firearm Accessories, Holsters & Shooting Gear','/collections/firearm-accessories','collection'],
['First Aid, Medical & IFAK','/collections/first-aid-medical-ifak','collection'],
['Flags, Displays & Memorials','/collections/flags-patriotic-decor','collection'],
['Flashlights, Lighting & Power','/collections/flashlights-lighting','collection'],
['Footwear, Gloves & Eyewear','/collections/footwear-gloves-eyewear','collection'],
['K9 & Working Dog Gear','/collections/k9-dog-gear','collection'],
['Knives, Axes & Multi-Tools','/collections/knives-axes-cutlery','collection'],
['Morale Patches, Stickers & Tactical ID','/collections/morale-patches-tactical-id','collection'],
['Outdoor, Survival & Preparedness','/collections/outdoor-preparedness-gear','collection'],
['Patriotic & American Heritage','/collections/patriotic-american-heritage','collection'],
['Safety, Rescue & Climbing','/collections/safety-rescue-climbing','collection'],
['Sta-Brite Insignia','/collections/sta-brite-insignia','collection'],
['Tactical Gear, Packs & Load Carriage','/collections/tactical-gear','collection'],
['Thin Line Shop','/collections/thin-line','collection'],
['Uniforms, Insignia & Identification','/collections/uniforms','collection'],
['Watches & Timepieces','/collections/watches','collection'],
['Zippo, Lighters & Fire Starters','/collections/zippos-lighters-torches','collection'],
['Logo Merch','/collections/stateside-quartermaster-logo-merch','collection'],
['Army National Guard Series','/collections/army-national-guard-series','collection'],
['Air National Guard Series','/collections/air-national-guard-series','collection'],
['State Guard Series','/collections/state-guard-series','collection'],
['U.S. Army Series','/collections/products-built-for-the-line-u-s-army','collection'],
['U.S. Navy Series','/collections/products-built-for-the-line-u-s-navy','collection'],
['U.S. Air Force Series','/collections/products-built-for-the-line-u-s-air-force','collection'],
['U.S. Marine Corps Series','/collections/products-built-for-the-line-u-s-marine-corps','collection'],
['U.S. Coast Guard Series','/collections/products-built-for-the-line-u-s-coast-guard','collection'],
['U.S. Space Force Series','/collections/products-built-for-the-line-u-s-space-force','collection'],
['ROTC Series','/collections/rotc-series','collection'],
['JROTC Series','/collections/jrotc-series','collection'],
['Military Schools & Academies','/collections/military-schools-academies','collection'],
['Law Enforcement & Corrections','/collections/law-enforcement-corrections','collection'],
['Firefighting, EMS & Search & Rescue','/collections/firefighting-ems-search-rescue','collection']
];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
fs.mkdirSync('rail-cert',{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1100}});
const page=await context.newPage();
page.setDefaultTimeout(12000);page.setDefaultNavigationTimeout(60000);
await page.goto(`${BASE}/?preview_theme_id=${THEME}`,{waitUntil:'domcontentloaded'});await sleep(900);
const results=[];
for(let n=0;n<routes.length;n++){
  const [name,route,type]=routes[n]; const out={idx:n+1,name,route,type,status:null,outcome:'PASS',reasons:[],desktop:{},mobile:{}};
  try{
    const r=await page.goto(BASE+route,{waitUntil:'domcontentloaded'});out.status=r?.status()??null;await sleep(7600);
    if(out.status!==200)out.reasons.push(`HTTP ${out.status}`);
    if(type==='page'){
      out.desktop=await page.evaluate(()=>({h1:(document.querySelector('h1')?.textContent||'').trim(),railCount:document.querySelectorAll('[data-sq-collection-rail]').length,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+4}));
      if(out.desktop.railCount)out.reasons.push('collection rail unexpectedly present');if(out.desktop.overflow)out.reasons.push('horizontal overflow');
    } else {
      out.desktop=await page.evaluate(()=>{
        const rail=document.querySelector('[data-sq-collection-rail]'),main=document.getElementById('MainContent');
        const visible=e=>{if(!e)return false;const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&!e.hidden&&r.width>2&&r.height>2};
        const groupDefs=[['Categories','[data-sq-context-categories]','[data-sq-context-categories-list]'],['Subcategories','[data-sq-context-subcategories]','[data-sq-context-subcategories-list]'],['Types','[data-sq-context-types]','[data-sq-context-types-list]'],['Organizations','[data-sq-context-organizations]','[data-sq-context-organizations-list]']];
        const groups=groupDefs.map(([name,itemSel,listSel])=>{const item=rail?.querySelector(itemSel),list=rail?.querySelector(listSel);return{name,visible:visible(item),count:list?.querySelectorAll('a[href]').length||0,labels:[...(list?.querySelectorAll('.sq-collection-rail__link-label')||[])].map(x=>(x.textContent||'').trim()).filter(Boolean)}});
        const rr=rail?.getBoundingClientRect(),mr=main?.getBoundingClientRect();
        const productSelectors=['collection-component product-card','.product-grid product-card','a[href*="/products/"]'];
        let products=0;for(const sel of productSelectors){products=Math.max(products,[...main?.querySelectorAll(sel)||[]].filter(visible).length)}
        const mirrored=[...main?.querySelectorAll('[data-sq-mirrored-to-rail="true"],.sq-subcategory-section,.sq-third-level,.sq-ts-match-section,.sq-ptype-browser,[data-sq-afg-mode],.vac-guard-folders,.sqbfl')||[]].filter(visible).length;
        return {h1:(main?.querySelector('h1')?.textContent||'').trim(),railCount:[...document.querySelectorAll('[data-sq-collection-rail]')].filter(visible).length,railWidth:rr?.width||0,mainLeft:mr?.left||0,railRight:rr?.right||0,overlap:!!(rr&&mr&&mr.left<rr.right-2),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+4,groups,products,mirrored,sourceButtonCount:Number(rail?.dataset.sqSourceButtonCount||0),mirroredLinkCount:Number(rail?.dataset.sqMirroredLinkCount||0),shopAll:!!rail?.querySelector('.sq-collection-rail__direct')};
      });
      const d=out.desktop;
      if(d.railCount!==1)out.reasons.push(`visible rail ${d.railCount}`);if(!d.shopAll)out.reasons.push('Shop All missing');if(d.railWidth<220||d.railWidth>255)out.reasons.push(`rail width ${Math.round(d.railWidth)}`);if(d.overlap)out.reasons.push('rail overlaps MainContent');if(d.overflow)out.reasons.push('desktop horizontal overflow');if(!d.products)out.reasons.push('no visible products');if(d.mirrored)out.reasons.push(`duplicate mirrored hierarchy visible ${d.mirrored}`);
      const visibleGroups=d.groups.filter(g=>g.visible).map(g=>g.name);const tax=visibleGroups.filter(x=>['Categories','Subcategories','Types'].includes(x));const expectedOrder=['Categories','Subcategories','Types'].filter(x=>tax.includes(x));if(JSON.stringify(tax)!==JSON.stringify(expectedOrder))out.reasons.push(`taxonomy order ${tax.join(' > ')}`);if(!d.groups.find(g=>g.name==='Categories')?.visible)out.reasons.push('Categories missing');
      for(const g of d.groups.filter(x=>x.visible)){if(!g.count)out.reasons.push(`${g.name} visible with zero links`)}
      // Open each visible taxonomy group and verify flyout geometry and content.
      for(const gname of ['Categories','Subcategories','Types']){
        const sel=gname==='Categories'?'[data-sq-context-categories]':gname==='Subcategories'?'[data-sq-context-subcategories]':'[data-sq-context-types]';
        const item=page.locator(sel);if(await item.count() && await item.isVisible()){
          await item.locator('[data-sq-rail-trigger]').click();await sleep(200);
          const geo=await page.evaluate((sel)=>{const rail=document.querySelector('[data-sq-collection-rail]'),item=document.querySelector(sel),fly=item?.querySelector('[data-sq-rail-flyout]'),main=document.getElementById('MainContent');const r=rail?.getBoundingClientRect(),f=fly?.getBoundingClientRect(),m=main?.getBoundingClientRect();return{open:item?.classList.contains('is-open')||false,flyVisible:!!(fly&&getComputedStyle(fly).visibility!=='hidden'&&f.width>2),flyRight:f?.right||0,mainLeft:m?.left||0,overlap:!!(f&&m&&m.left<f.right-2),railOpen:rail?.classList.contains('sq-collection-rail--flyout-open')||false};},sel);
          d[gname.toLowerCase()+'Flyout']=geo;if(!geo.open||!geo.flyVisible)out.reasons.push(`${gname} flyout did not open`);if(geo.overlap)out.reasons.push(`${gname} flyout overlaps MainContent`);await item.locator('[data-sq-rail-trigger]').click();
        }
      }
      if(name==='Accessories, Gifts & Collectibles'||out.reasons.length){await page.screenshot({path:`rail-cert/${String(n+1).padStart(2,'0')}-${name.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.png`,fullPage:true});}
      await page.setViewportSize({width:390,height:844});await sleep(500);
      out.mobile=await page.evaluate(()=>{const rail=document.querySelector('[data-sq-collection-rail]'),r=rail?.getBoundingClientRect(),s=rail?getComputedStyle(rail):null;return{visible:!!rail&&s.display!=='none'&&r.width>2,width:r?.width||0,left:r?.left||0,position:s?.position||'',overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+3}});
      if(!out.mobile.visible)out.reasons.push('mobile rail hidden');if(Math.abs(out.mobile.width-390)>3)out.reasons.push(`mobile rail width ${Math.round(out.mobile.width)}`);if(out.mobile.left<-2)out.reasons.push(`mobile rail left ${Math.round(out.mobile.left)}`);if(out.mobile.position!=='sticky')out.reasons.push(`mobile rail position ${out.mobile.position}`);if(out.mobile.overflow)out.reasons.push('mobile horizontal overflow');
      await page.setViewportSize({width:1440,height:1100});
    }
  }catch(e){out.reasons.push(String(e?.message||e));}
  out.outcome=out.reasons.length?'FAIL':'PASS';results.push(out);fs.writeFileSync(`rail-cert/${String(n+1).padStart(2,'0')}.json`,JSON.stringify(out,null,2));console.log(`${String(n+1).padStart(2,'0')} ${out.outcome} ${name}${out.reasons.length?' :: '+out.reasons.join('; '):''}`);
}
fs.writeFileSync('rail-cert/summary.json',JSON.stringify(results,null,2));
console.log(`TOTAL=${results.length} PASS=${results.filter(x=>x.outcome==='PASS').length} FAIL=${results.filter(x=>x.outcome==='FAIL').length}`);
await browser.close();
process.exit(results.some(x=>x.outcome==='FAIL')?1:0);
