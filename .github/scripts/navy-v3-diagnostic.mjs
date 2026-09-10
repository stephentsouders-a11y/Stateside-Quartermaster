import { chromium } from 'playwright';

const THEME='158561894555';
const ROUTE='military-schools-academies';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await chromium.launch({headless:true});
let failed=false;

for(const vp of [
  {name:'desktop',width:1440,height:1000,cols:3},
  {name:'mobile',width:390,height:844,cols:2}
]){
  const ctx=await browser.newContext({viewport:{width:vp.width,height:vp.height}});
  const page=await ctx.newPage();
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  const url=`https://www.statesideqm.com/collections/${ROUTE}?preview_theme_id=${THEME}`;
  const res=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>document.querySelector('#MainContent')?.dataset.sqRefineV3Ready==='true',{timeout:30000}).catch(()=>{});
  await wait(12000);
  const data=await page.evaluate(()=>{
    const main=document.querySelector('#MainContent');
    const grid=main?.querySelector('.sq-refine-v3-results .product-grid');
    const first=grid?.querySelector('.product-grid__item');
    const cols=first&&grid?Math.round(grid.getBoundingClientRect().width/first.getBoundingClientRect().width):0;
    return {
      href:location.href,
      ready:main?.dataset.sqRefineV3Ready||'',
      error:main?.dataset.sqRefineV3Error||'',
      layout:main?.querySelectorAll('.sq-refine-v3-layout').length||0,
      sidebar:main?.querySelectorAll('.sq-refine-v3-sidebar').length||0,
      results:main?.querySelectorAll('.sq-refine-v3-results').length||0,
      cards:grid?grid.querySelectorAll(':scope > .product-grid__item').length:0,
      cols,
      sqaca:main?.querySelectorAll('.sqaca').length||0,
      disclosureGroups:main?.querySelectorAll('.sq-refine-v3-filter-group').length||0,
      pageSize:main?.querySelectorAll('[data-sq-refine-v3-page-size]').length||0,
      academyGuard:window.__sqAcademyExclusiveTreeV6===true,
      isolation:document.querySelectorAll('script[data-sq-refine-v3-legacy-isolation="military-schools-academies"]').length
    };
  });
  const ok=(res?.status()===200 && pageErrors.length===0 && data.href.includes(`/collections/${ROUTE}`) && data.ready==='true' && !data.error && data.layout===1 && data.sidebar===1 && data.results===1 && data.cards===50 && data.cols===vp.cols && data.sqaca===0 && data.disclosureGroups>0 && data.pageSize>0 && data.academyGuard && data.isolation>0);
  console.log('MSA_SURVIVAL '+JSON.stringify({viewport:vp.name,http:res?.status()||0,pageErrors,data,ok}));
  if(!ok) failed=true;
  await ctx.close();
}
await browser.close();
if(failed) process.exit(1);
