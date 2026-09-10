import { chromium } from 'playwright';
const BASE='https://www.statesideqm.com/collections/products-built-for-the-line-u-s-navy?preview_theme_id=158561894555';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await chromium.launch({headless:true});
function snapshot(page,label){return page.evaluate((label)=>{
  const main=document.querySelector('#MainContent');
  const desc=Object.getOwnPropertyDescriptor(window,'__sqBflUnifiedTree');
  const replay=document.querySelector('script[data-sqbfl-late-replay-reset-v1]');
  const recovery=document.querySelector('script[data-sqbfl-empty-main-recovery-v4]');
  return {label,ts:Date.now(),flag:window.__sqBflUnifiedTree,descriptor:desc?{configurable:desc.configurable,enumerable:desc.enumerable,writable:desc.writable,hasGet:typeof desc.get==='function',hasSet:typeof desc.set==='function',value:desc.value}:null,layout:document.querySelectorAll('.sq-refine-v3-layout').length,sidebar:document.querySelectorAll('.sq-refine-v3-sidebar').length,results:document.querySelectorAll('.sq-refine-v3-results').length,legacy:document.querySelectorAll('.sqbfl').length,mainChildren:main?[...main.children].map(x=>({tag:x.tagName,cls:x.className,id:x.id})):[],replayText:replay?(replay.textContent||''):null,recoveryText:recovery?(recovery.textContent||''):null};
},label)}
for(const mobile of [false,true]){
  const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000}});
  const page=await ctx.newPage();
  const pageErrors=[],consoleErrors=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
  const response=await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:45000});
  const shots=[];
  for(const [label,ms] of [['t1',1000],['t3',2000],['t6',3000],['t10',4000],['t18',8000]]){await sleep(ms);shots.push(await snapshot(page,label));}
  console.log('NAVY_TIMELINE '+JSON.stringify({viewport:mobile?'mobile':'desktop',http:response?.status()||0,pageErrors,consoleErrors,shots}));
  await page.screenshot({path:`navy-${mobile?'mobile':'desktop'}.png`,fullPage:true});
  await ctx.close();
}
await browser.close();