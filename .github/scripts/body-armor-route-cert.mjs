import { chromium } from 'playwright';
const URL='https://www.statesideqm.com/collections/knives-axes-cutlery?preview_theme_id=158561894555';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const b=await chromium.launch({headless:true});
for(const [name,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
 const c=await b.newContext({viewport}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push({message:e.message,stack:e.stack||''}));
 const r=await p.goto(URL,{waitUntil:'domcontentloaded',timeout:45000});try{await p.waitForFunction(()=>document.querySelector('#MainContent')?.dataset.sqRefineV3Ready==='true',{timeout:20000})}catch{}await sleep(5000);
 const hits=await p.evaluate(()=>[...document.scripts].map((s,i)=>{const text=s.textContent||'',at=text.indexOf('moveFacets');const attr=[...s.attributes].find(a=>a.name.startsWith('data-sq'));return at<0?null:{i,marker:attr?.name||'',value:attr?.value||'',src:s.src||'',around:text.slice(Math.max(0,at-900),Math.min(text.length,at+1800))}}).filter(Boolean));
 console.log('MOVEFACETS '+JSON.stringify({name,http:r?.status()||0,errors,hits},null,2));await c.close();
}
await b.close();
