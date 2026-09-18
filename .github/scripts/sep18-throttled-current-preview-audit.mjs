import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE='https://www.statesideqm.com';
const THEME='158900125851';
const OUT='sep18-throttled-current-preview-audit';
const ROOT='/collections/state-guard-series';
const DELAY=4000;
fs.mkdirSync(path.join(OUT,'screenshots'),{recursive:true});

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const shot=s=>String(s||'page').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70);
const routeOf=h=>{try{const u=new URL(h,BASE);if(u.origin!==new URL(BASE).origin)return null;u.searchParams.delete('preview_theme_id');u.hash='';return u.pathname+u.search}catch{return null}};

const browser=await chromium.launch({headless:true});
const ctx=await browser.newContext({viewport:{width:1365,height:900}});
const page=await ctx.newPage();
page.setDefaultNavigationTimeout(70000);
page.setDefaultTimeout(25000);
const cdp=await ctx.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});

async function establishPreview(){
  let r=await page.goto(BASE+'/?preview_theme_id='+THEME,{waitUntil:'domcontentloaded',timeout:70000});
  await page.waitForLoadState('load',{timeout:15000}).catch(()=>{});
  await sleep(1800);
  const theme=await page.evaluate(()=>({id:String(window.Shopify?.theme?.id||''),name:String(window.Shopify?.theme?.name||'')}));
  if(String(theme.id)!==THEME) throw new Error('Wrong preview theme after establishment: '+JSON.stringify(theme));
  console.log('PREVIEW_ESTABLISHED',JSON.stringify(theme));
  return r?.status()??null;
}

async function gotoRoute(route){
  let last=null;
  for(let attempt=1;attempt<=3;attempt++){
    const started=Date.now();
    let response=null,error=null;
    try{response=await page.goto(BASE+route,{waitUntil:'domcontentloaded',timeout:70000})}catch(e){error=String(e?.message||e)}
    const status=response?.status()??null;
    if(status!==429 && status!==null){
      await page.waitForLoadState('load',{timeout:16000}).catch(()=>{});
      await sleep(900);
      return {response,status,error,attempt,elapsed:Date.now()-started};
    }
    last={response,status,error,attempt,elapsed:Date.now()-started};
    console.log('BACKOFF',route,'attempt',attempt,'status',status);
    await sleep(attempt===1?20000:40000);
    await establishPreview();
    await sleep(3000);
  }
  return last;
}

async function discover(route){
  const nav=await gotoRoute(route);
  if(nav.status!==200) throw new Error('Discovery HTTP '+nav.status+' '+route);
  const theme=await page.evaluate(()=>({id:String(window.Shopify?.theme?.id||''),name:String(window.Shopify?.theme?.name||'')}));
  if(theme.id!==THEME) throw new Error('Preview lost during discovery '+route+' '+JSON.stringify(theme));
  const buttons=await page.evaluate(({base})=>{
    const main=document.getElementById('MainContent')||document.querySelector('main')||document.body;
    const vis=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&!e.hidden&&r.width>8&&r.height>20};
    const out=[];
    for(const a of main.querySelectorAll('a[href]')){
      if(!vis(a)) continue;
      let u;try{u=new URL(a.href,base)}catch{continue}
      if(u.origin!==new URL(base).origin||!/^\/(collections|pages)\//.test(u.pathname)||/\/products\//.test(u.pathname))continue;
      u.searchParams.delete('preview_theme_id');u.hash='';
      const label=(a.getAttribute('aria-label')||a.textContent||a.querySelector('img')?.alt||'').replace(/\s+/g,' ').trim();
      if(!label)continue;
      const r=a.getBoundingClientRect();
      const card=!!(a.querySelector('img,svg')||a.closest('[class*="card"],[class*="grid"],[data-sq-state-guard-root]')||r.width>140||r.height>50);
      if(!card)continue;
      out.push({label:label.slice(0,220),route:u.pathname+u.search});
    }
    const seen=new Set();return out.filter(x=>!seen.has(x.route)&&(seen.add(x.route),true));
  },{base:BASE});
  return buttons;
}

async function measure(item,index){
  const nav=await gotoRoute(item.route);
  const theme=await page.evaluate(()=>({id:String(window.Shopify?.theme?.id||''),name:String(window.Shopify?.theme?.name||'')})).catch(()=>({id:'',name:''}));
  const perf=await page.evaluate(()=>{
    const n=performance.getEntriesByType('navigation')[0],rs=performance.getEntriesByType('resource'),f=performance.getEntriesByName('first-contentful-paint')[0];
    return {
      ttfbMs:Math.round(n?.responseStart||0),
      domInteractiveMs:Math.round(n?.domInteractive||0),
      dclMs:Math.round(n?.domContentLoadedEventEnd||0),
      loadMs:Math.round(n?.loadEventEnd||0),
      fcpMs:Math.round(f?.startTime||0),
      resources:rs.length,
      transferBytes:rs.reduce((s,r)=>s+(r.transferSize||0),0),
      decodedBytes:rs.reduce((s,r)=>s+(r.decodedBodySize||0),0),
      domNodes:document.getElementsByTagName('*').length,
      scripts:document.scripts.length,
      stylesheets:document.styleSheets.length,
      images:document.images.length,
      brokenImages:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).length,
      title:document.title,
      h1:(document.querySelector('h1')?.textContent||'').replace(/\s+/g,' ').trim()
    };
  }).catch(e=>({evaluateError:String(e)}));
  const result={index,...item,status:nav.status,attempts:nav.attempt,theme,...perf};
  console.log('RESULT',JSON.stringify({index,group:item.group,label:item.label,route:item.route,status:nav.status,attempts:nav.attempt,themeId:theme.id,ttfbMs:perf.ttfbMs,dclMs:perf.dclMs,loadMs:perf.loadMs,fcpMs:perf.fcpMs,kb:Math.round((perf.transferBytes||0)/1024),resources:perf.resources,domNodes:perf.domNodes}));
  if(nav.status===200){
    await page.screenshot({path:path.join(OUT,'screenshots',String(index).padStart(2,'0')+'-'+shot(item.group+'-'+item.label)+'.png'),fullPage:false}).catch(()=>{});
  }
  await sleep(DELAY);
  return result;
}

await establishPreview();
const home=await discover('/');
await sleep(DELAY);
const sg=await discover(ROOT);
console.log('CURRENT_COVERAGE',JSON.stringify({home:home.length,stateGuardRoot:sg.length}));
fs.writeFileSync(path.join(OUT,'coverage.json'),JSON.stringify({themeId:THEME,home,sg},null,2));

const all=[];
home.forEach(x=>all.push({...x,group:'homepage',source:'/'}));
sg.forEach(x=>all.push({...x,group:'state-guard-root',source:ROOT}));
const dedup=new Map();
for(const x of all){
  const key=x.group+'|'+x.route;
  if(!dedup.has(key))dedup.set(key,x);
}
const rows=[];
let idx=0;
for(const item of dedup.values()) rows.push(await measure(item,++idx));

const ok=rows.filter(r=>r.status===200&&r.theme?.id===THEME);
const bad=rows.filter(r=>r.status!==200||r.theme?.id!==THEME);
const avg=(g,k)=>{const a=ok.filter(x=>x.group===g);return a.length?Math.round(a.reduce((s,x)=>s+(x[k]||0),0)/a.length):0};
const ranked=[...ok].sort((a,b)=>(b.loadMs||0)-(a.loadMs||0));
const summary={
  generatedAt:new Date().toISOString(),themeId:THEME,
  coverage:{homepage:home.length,stateGuardRoot:sg.length,totalMeasured:rows.length,valid200Preview:ok.length,invalid:bad.length},
  averages:{
    homepage:{ttfbMs:avg('homepage','ttfbMs'),loadMs:avg('homepage','loadMs'),fcpMs:avg('homepage','fcpMs')},
    stateGuardRoot:{ttfbMs:avg('state-guard-root','ttfbMs'),loadMs:avg('state-guard-root','loadMs'),fcpMs:avg('state-guard-root','fcpMs')}
  },
  slowest:ranked.slice(0,20).map(r=>({group:r.group,label:r.label,route:r.route,ttfbMs:r.ttfbMs,dclMs:r.dclMs,loadMs:r.loadMs,fcpMs:r.fcpMs,kb:Math.round((r.transferBytes||0)/1024),resources:r.resources,domNodes:r.domNodes})),
  invalid:bad.map(r=>({group:r.group,label:r.label,route:r.route,status:r.status,attempts:r.attempts,theme:r.theme})),
  rows
};
fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(summary,null,2));
console.log('FINAL_SUMMARY',JSON.stringify({coverage:summary.coverage,averages:summary.averages,slowest:summary.slowest.slice(0,12),invalid:summary.invalid}));
if(bad.length) process.exitCode=2;
await ctx.close();await browser.close();
