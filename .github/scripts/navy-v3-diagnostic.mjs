import { chromium } from 'playwright';
const BASE='https://www.statesideqm.com/collections/products-built-for-the-line-u-s-navy?preview_theme_id=158561894555';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await chromium.launch({headless:true});
const ctx=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await ctx.newPage();
await page.addInitScript(()=>{
  window.__sqMainWrites=[];
  const nativeReplace=Element.prototype.replaceChildren;
  Element.prototype.replaceChildren=function(){
    if(this&&this.id==='MainContent')window.__sqMainWrites.push({kind:'replaceChildren',at:Date.now(),args:[...arguments].map(x=>x&&x.nodeType===1?x.tagName+'.'+String(x.className||''):String(x&&x.nodeType)),stack:(new Error()).stack});
    return nativeReplace.apply(this,arguments);
  };
});
const pageErrors=[],consoleErrors=[];
page.on('pageerror',e=>pageErrors.push(e.message));
page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
const response=await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:45000});
await sleep(1200);
const early=await page.evaluate(()=>{
  const iso=[...document.querySelectorAll('script[data-sq-refine-v3-legacy-isolation]')].map((s,i)=>({i,text:s.textContent||''}));
  const fake=document.createElement('div');fake.id='MainContent';const legacy=document.createElement('section');legacy.className='sqbfl';legacy.setAttribute('data-sqbfl-root','');
  fake.replaceChildren(legacy);
  return {replaceFn:String(Element.prototype.replaceChildren),guardFlag:window.__sqRefineV3MainReplaceGuard,isoCount:iso.length,iso,detachedLegacyAccepted:!!fake.querySelector('.sqbfl'),recoveryRoute:window.__sqBflRecoveryRouteV4,serverRecoveryRoute:window.__sqBflServerRecoveryRouteV3};
});
await sleep(7000);
const late=await page.evaluate(()=>({layout:document.querySelectorAll('.sq-refine-v3-layout').length,sidebar:document.querySelectorAll('.sq-refine-v3-sidebar').length,results:document.querySelectorAll('.sq-refine-v3-results').length,legacy:document.querySelectorAll('#MainContent>.sqbfl').length,mainWrites:window.__sqMainWrites,recoveryRoute:window.__sqBflRecoveryRouteV4,serverRecoveryRoute:window.__sqBflServerRecoveryRouteV3,recoveryTimer:!!window.__sqBflRecoveryTimerV4,serverRecoveryTimer:!!window.__sqBflServerRecoveryTimerV3}));
console.log('NAVY_GUARD_PROBE '+JSON.stringify({http:response?.status()||0,pageErrors,consoleErrors,early,late}));
await ctx.close();await browser.close();