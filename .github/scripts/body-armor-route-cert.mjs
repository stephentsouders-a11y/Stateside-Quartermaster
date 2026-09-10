import { chromium } from 'playwright';
const URL='https://www.statesideqm.com/collections/air-national-guard-series?preview_theme_id=158561894555';
const b=await chromium.launch({headless:true});const c=await b.newContext({viewport:{width:1440,height:1000}}),p=await c.newPage();
const r=await p.goto(URL,{waitUntil:'domcontentloaded',timeout:45000});await p.waitForTimeout(4500);
const d=await p.evaluate(()=>[...document.scripts].map((s,i)=>({i,marker:[...s.attributes].filter(a=>a.name.startsWith('data-sq')).map(a=>a.name+'='+a.value).join(' '),src:s.src||'',text:s.textContent||''})).filter(s=>/replaceChildren\s*\(|function\s+finish\s*\(|finish\s*=\s*function/i.test(s.text)).map(s=>{const m=s.text.match(/replaceChildren\s*\(|function\s+finish\s*\(|finish\s*=\s*function/i),k=m?m.index:0;return{i:s.i,marker:s.marker,src:s.src,around:s.text.slice(Math.max(0,k-1200),Math.min(s.text.length,k+3000))}}));
console.log('ANG_FINISH_SCRIPTS '+JSON.stringify({http:r?.status()||0,hits:d},null,2));await b.close();
