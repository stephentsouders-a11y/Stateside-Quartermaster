import { chromium } from 'playwright';
const BASE='https://www.statesideqm.com/collections/products-built-for-the-line-u-s-navy?preview_theme_id=158561894555';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await chromium.launch({headless:true});
for(const mobile of [false,true]){
  const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000}});
  const page=await ctx.newPage();
  const pageErrors=[],consoleErrors=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
  const response=await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:45000});
  await sleep(18000);
  const data=await page.evaluate(()=>{
    const main=document.querySelector('#MainContent');
    const visible=el=>{if(!el)return false;const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
    const scripts=[...document.querySelectorAll('script')].map(s=>({attrs:[...s.attributes].reduce((o,a)=>(o[a.name]=a.value,o),{}),text:(s.textContent||'').slice(0,180)})).filter(x=>Object.keys(x.attrs).some(k=>k.startsWith('data-sq'))||x.text.includes('sqRefineV3')||x.text.includes('sqV3DedicatedGrid'));
    const children=main?[...main.children].map((el,i)=>({i,tag:el.tagName,id:el.id,cls:el.className,hidden:el.hidden,visible:visible(el),text:(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,120)})):[];
    const allMarkers=main?[...main.attributes].filter(a=>a.name.startsWith('data-sq')).reduce((o,a)=>(o[a.name]=a.value,o),{}):{};
    const grids=[...document.querySelectorAll('.product-grid')].map((g,i)=>({i,insideMain:!!main?.contains(g),visible:visible(g),cards:[...g.querySelectorAll(':scope>.product-grid__item')].filter(x=>x.querySelector('a[href*="/products/"]')).length,parent:g.parentElement?.className||''}));
    return {href:location.href,readyState:document.readyState,markers:allMarkers,children,scripts,grids,sidebarCount:document.querySelectorAll('.sq-refine-v3-sidebar').length,layoutCount:document.querySelectorAll('.sq-refine-v3-layout').length,resultsCount:document.querySelectorAll('.sq-refine-v3-results').length,legacyLayouts:document.querySelectorAll('.sqbfl').length};
  });
  console.log('NAVY_DIAG '+JSON.stringify({viewport:mobile?'mobile':'desktop',http:response?.status()||0,pageErrors,consoleErrors,data}));
  await page.screenshot({path:`navy-${mobile?'mobile':'desktop'}.png`,fullPage:true});
  await ctx.close();
}
await browser.close();
// rerun after unified-tree isolation repair