import { chromium } from 'playwright';
const URL='https://www.statesideqm.com/collections/military-schools-academies?preview_theme_id=158561894555&view=sq-refine-v3-products';
const browser=await chromium.launch({headless:true});
const ctx=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await ctx.newPage();
const pageErrors=[]; page.on('pageerror',e=>pageErrors.push(e.message));
const response=await page.goto(URL,{waitUntil:'domcontentloaded',timeout:45000});
await page.waitForTimeout(1500);
const data=await page.evaluate(()=>{
  const all=[...document.scripts];
  const hits=all.map((s,i)=>({i,attrs:[...s.attributes].reduce((o,a)=>(o[a.name]=a.value,o),{}),src:s.src||'',text:s.textContent||''}))
    .filter(x=>/sqaca|academy|military.schools/i.test(x.text)||/academy|military.schools/i.test(x.src)||Object.entries(x.attrs).some(([k,v])=>/sqaca|academy|military.schools/i.test(k+' '+v)))
    .map(x=>{const idx=x.text.search(/sqaca|replaceChildren|MainContent|academy|military.schools/i);return {...x,text:x.text.slice(Math.max(0,idx-2500),Math.min(x.text.length,idx+9000))}});
  const main=document.querySelector('#MainContent');
  return {href:location.href,pageErrors,hits,mainChildren:main?[...main.children].map(n=>({tag:n.tagName,id:n.id,cls:String(n.className||''),attrs:[...n.attributes].reduce((o,a)=>(o[a.name]=a.value,o),{})})):[]};
});
console.log('SQACA_TRACE '+JSON.stringify({http:response?.status()||0,data}));
await ctx.close(); await browser.close();
