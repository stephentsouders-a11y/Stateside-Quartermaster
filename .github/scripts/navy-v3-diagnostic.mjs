import { chromium, request } from 'playwright';

const THEME='158561894555';
const cases=[
  {name:'MSA',handle:'military-schools-academies'},
  {name:'ROTC',handle:'rotc-series'}
];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await chromium.launch({headless:true});
const api=await request.newContext();

function serverSummary(html){
  const count=(re)=>(html.match(re)||[]).length;
  const idx=html.indexOf('data-sq-refine-v3-fallback-host');
  return {
    bytes:html.length,
    fallbackHosts:count(/data-sq-refine-v3-fallback-host/g),
    productGridItems:count(/product-grid__item/g),
    productLinks:count(/href=["'][^"']*\/products\//g),
    v3Scripts:count(/data-sq-refine-v3/g),
    hasDedicatedSection:html.includes('data-sq-refine-v3-fallback-host'),
    aroundFallback:idx>=0?html.slice(Math.max(0,idx-700),idx+1700):''
  };
}

for(const c of cases){
  const root=`https://www.statesideqm.com/collections/${c.handle}`;
  const alt=`${root}?preview_theme_id=${THEME}&view=sq-refine-v3-products`;
  const raw=await api.get(alt,{timeout:45000});
  const html=await raw.text();
  const rawData=serverSummary(html);

  const ctx=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await ctx.newPage();
  const pageErrors=[],consoleErrors=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
  const res=await page.goto(alt,{waitUntil:'domcontentloaded',timeout:45000});
  const snap=async(label)=>page.evaluate(label=>{
    const main=document.querySelector('#MainContent');
    const host=main?.querySelector('[data-sq-refine-v3-fallback-host]');
    const grid=main?.querySelector('.product-grid');
    const v3grid=main?.querySelector('.sq-refine-v3-results .product-grid');
    const children=main?[...main.children].map(n=>({tag:n.tagName,id:n.id,cls:String(n.className||'').slice(0,120),fallback:n.hasAttribute?.('data-sq-refine-v3-fallback-host')})):[];
    return {
      label,
      href:location.href,
      title:document.title,
      ready:main?.dataset.sqRefineV3Ready||'',
      error:main?.dataset.sqRefineV3Error||'',
      fallbackHosts:main?.querySelectorAll('[data-sq-refine-v3-fallback-host]').length||0,
      collectionComponents:main?.querySelectorAll('collection-component').length||0,
      grids:main?.querySelectorAll('.product-grid').length||0,
      cards:grid?grid.querySelectorAll(':scope>.product-grid__item').length:0,
      productLinks:grid?grid.querySelectorAll('a[href*="/products/"]').length:0,
      v3Layout:main?.querySelectorAll('.sq-refine-v3-layout').length||0,
      v3Sidebar:main?.querySelectorAll('.sq-refine-v3-sidebar').length||0,
      v3Results:main?.querySelectorAll('.sq-refine-v3-results').length||0,
      v3Cards:v3grid?v3grid.querySelectorAll(':scope>.product-grid__item').length:0,
      hostOuter:host?host.outerHTML.slice(0,2200):'',
      children
    };
  },label);
  const t0=await snap('t0');
  await sleep(3000);
  const t3=await snap('t3');
  await sleep(7000);
  const t10=await snap('t10');
  console.log('ALT_VIEW_DIAG '+JSON.stringify({case:c.name,serverHttp:raw.status(),server:rawData,browserHttp:res?.status()||0,pageErrors,consoleErrors,t0,t3,t10}));
  await ctx.close();
}

await api.dispose();
await browser.close();
