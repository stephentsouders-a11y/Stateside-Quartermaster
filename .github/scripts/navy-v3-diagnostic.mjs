import { chromium } from 'playwright';
const BASE='https://www.statesideqm.com/collections/products-built-for-the-line-u-s-navy?preview_theme_id=158561894555';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await chromium.launch({headless:true});
const ctx=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await ctx.newPage();
await page.addInitScript(()=>{
  window.__sqMainWrites=[];
  const desc=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
  if(desc&&desc.set&&desc.get){
    Object.defineProperty(Element.prototype,'innerHTML',{configurable:desc.configurable,enumerable:desc.enumerable,get:desc.get,set:function(v){
      if(this&&this.id==='MainContent')window.__sqMainWrites.push({kind:'innerHTML',at:Date.now(),len:String(v||'').length,head:String(v||'').slice(0,100),stack:(new Error()).stack});
      return desc.set.call(this,v);
    }});
  }
  const nativeReplace=Element.prototype.replaceChildren;
  Element.prototype.replaceChildren=function(){
    if(this&&this.id==='MainContent')window.__sqMainWrites.push({kind:'replaceChildren',at:Date.now(),args:[...arguments].map(x=>x&&x.nodeType===1?x.tagName+'.'+String(x.className||''):String(x&&x.nodeType)),stack:(new Error()).stack});
    return nativeReplace.apply(this,arguments);
  };
  const nativeReplaceWith=Element.prototype.replaceWith;
  Element.prototype.replaceWith=function(){
    if(this&&this.id==='MainContent')window.__sqMainWrites.push({kind:'replaceWith',at:Date.now(),stack:(new Error()).stack});
    return nativeReplaceWith.apply(this,arguments);
  };
});
const pageErrors=[],consoleErrors=[];
page.on('pageerror',e=>pageErrors.push(e.message));
page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
const response=await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:45000});
await sleep(8000);
const data=await page.evaluate(()=>{
  const main=document.querySelector('#MainContent');
  const full=name=>document.querySelector('script['+name+']')?.textContent||null;
  const root=main?.querySelector('[data-sqbfl-root]');
  return {
    href:location.href,
    layout:document.querySelectorAll('.sq-refine-v3-layout').length,
    sidebar:document.querySelectorAll('.sq-refine-v3-sidebar').length,
    results:document.querySelectorAll('.sq-refine-v3-results').length,
    legacy:document.querySelectorAll('.sqbfl').length,
    rootMarker:root?{tag:root.tagName,cls:root.className,attrs:[...root.attributes].reduce((o,a)=>(o[a.name]=a.value,o),{})}:null,
    recoveryRoute:window.__sqBflRecoveryRouteV4,
    recoveryTimer:!!window.__sqBflRecoveryTimerV4,
    mainWrites:window.__sqMainWrites,
    lateReplay:full('data-sqbfl-late-replay-reset-v1'),
    emptyRecovery:full('data-sqbfl-empty-main-recovery-v4'),
    serverRecovery:full('data-sqbfl-server-source-recovery-v3'),
    unifiedTree:(full('data-sqbfl-unified-tree-v2')||'').slice(0,12000)
  };
});
console.log('NAVY_WRITE_TRACE '+JSON.stringify({http:response?.status()||0,pageErrors,consoleErrors,data}));
await page.screenshot({path:'navy-desktop.png',fullPage:true});
await ctx.close();
await browser.close();