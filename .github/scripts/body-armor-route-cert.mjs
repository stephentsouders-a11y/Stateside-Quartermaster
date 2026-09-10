import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const URL='https://www.statesideqm.com/collections/child-safety-shop?preview_theme_id=158561894555';
const OUT='cert-child-safety';
const ROUTE='Child Safety';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function inspect(page,mobile){
  const browserErrors=[];
  page.on('pageerror',e=>browserErrors.push({type:'pageerror',message:e.message,stack:e.stack||''}));
  page.on('console',m=>{if(m.type()==='error')browserErrors.push({type:'console',message:m.text(),location:m.location()})});
  const response=await page.goto(URL,{waitUntil:'domcontentloaded',timeout:45000});
  let readySeen=false;
  try{await page.waitForFunction(()=>document.querySelector('#MainContent')?.dataset.sqRefineV3Ready==='true'||document.querySelector('#MainContent')?.dataset.sqRefineV3Error,{timeout:20000});readySeen=true}catch{}
  await sleep(500);
  const data=await page.evaluate(()=>{
    const vis=el=>{if(!el)return false;const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
    const m=document.querySelector('#MainContent');
    const side=m?.querySelector('.sq-refine-v3-sidebar');
    const size=m?.querySelector('.sq-refine-v3-page-size');
    const grid=m?.querySelector('.product-grid');
    const groups=[...(side?.querySelectorAll('.sq-refine-v3-group')||[])];
    const cards=[...(grid?.querySelectorAll(':scope>.product-grid__item')||[])].filter(x=>x.querySelector('a[href*="/products/"]'));
    const inlineSyntax=[];
    [...document.scripts].forEach((script,index)=>{if(script.src||!script.textContent?.trim())return;const type=(script.type||'').toLowerCase();if(type==='module')return;if(type&&type!=='text/javascript'&&type!=='application/javascript')return;try{new Function(script.textContent)}catch(e){inlineSyntax.push({index,type,message:e.message,attrs:[...script.attributes].map(a=>[a.name,a.value]),preview:script.textContent.slice(0,300)})}});
    return {
      title:document.title,error:m?.dataset.sqRefineV3Error||'',ready:m?.dataset.sqRefineV3Ready||'',active:m?.classList.contains('sq-refine-v3-active')||false,
      side:vis(side),titleText:side?.querySelector('.sq-refine-v3-sidebar__title')?.textContent.trim()||'',size:vis(size),sizeInSide:!!size?.closest('.sq-refine-v3-sidebar'),sizes:[...(size?.querySelectorAll('input')||[])].map(x=>[x.value,x.checked]),
      groups:groups.map(g=>({open:g.open,checked:g.querySelectorAll('input:checked').length,inputs:g.querySelectorAll('input[type="checkbox"]').length,label:g.querySelector(':scope>summary')?.textContent.trim()||''})),
      grid:vis(grid),cols:grid?getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length:0,cards:cards.length,sidePos:side?getComputedStyle(side).position:'',sideHeight:side?.getBoundingClientRect().height||0,
      legacy:[...document.querySelectorAll('[data-sq-refine-v3-hidden-nav="true"]')].filter(vis).length,
      vacVisible:[...document.querySelectorAll('.vac-page-size,[data-vac-page-size],[data-vac-page-view]')].filter(vis).length,
      inlineSyntax
    };
  });
  data.httpStatus=response?.status()||0;data.readySeen=readySeen;data.browserErrors=browserErrors.slice(0,30);
  const fatal=data.browserErrors.filter(e=>e.type==='pageerror');
  const errors=[];
  if(data.httpStatus>=400)errors.push('HTTP '+data.httpStatus);
  if(fatal.length)errors.push(...fatal.map(e=>'browser '+JSON.stringify(e)));
  if(data.inlineSyntax.length)errors.push(...data.inlineSyntax.map(e=>'inline syntax '+JSON.stringify(e)));
  if(data.error)errors.push('V3 '+data.error);
  if(data.ready!=='true')errors.push('V3 not ready');
  if(!data.side||data.titleText!=='Refine Products')errors.push('sidebar');
  if(!data.size||data.sizeInSide)errors.push('page-size placement');
  if(data.sizes.map(x=>x[0]).join(',')!=='50,100,250'||!data.sizes.find(x=>x[0]==='50')?.[1])errors.push('page-size values/default');
  if(!data.groups.length)errors.push('no groups');
  for(const g of data.groups){if(!g.inputs)errors.push('empty '+g.label);if(!g.checked&&g.open)errors.push('inactive open '+g.label);if(g.checked&&!g.open)errors.push('active closed '+g.label)}
  if(data.legacy)errors.push('legacy navigation visible='+data.legacy);
  if(data.vacVisible)errors.push('legacy page-size visible='+data.vacVisible);
  if(!data.grid||!data.cards)errors.push('product grid/cards');
  if(data.grid&&data.cols!==(mobile?2:3))errors.push('columns='+data.cols);
  if(mobile&&data.sidePos==='sticky')errors.push('mobile sticky');
  if(!mobile&&data.side&&(data.sidePos!=='sticky'||data.sideHeight<600))errors.push('desktop sidebar');
  if(data.ready==='true'&&data.groups.length){
    const groups=page.locator('.sq-refine-v3-sidebar .sq-refine-v3-group');const idx=await groups.evaluateAll(gs=>gs.findIndex(g=>!g.open));
    if(idx>=0){const d=groups.nth(idx),s=d.locator(':scope>summary');try{await s.scrollIntoViewIfNeeded({timeout:5000});const before=await s.evaluate(el=>getComputedStyle(el,'::after').content);await s.click({timeout:5000});await sleep(100);const opened=await d.getAttribute('open')!==null;const after=await s.evaluate(el=>getComputedStyle(el,'::after').content);await s.click({timeout:5000});await sleep(100);const closed=await d.getAttribute('open')===null;const final=await s.evaluate(el=>getComputedStyle(el,'::after').content);if(!(/\+/.test(before)&&opened&&/[−\u2212-]/.test(after)&&closed&&/\+/.test(final)))errors.push('toggle '+JSON.stringify({before,opened,after,closed,final}))}catch(e){errors.push('toggle action '+String(e))}}
  }
  return {data,errors};
}

await fs.mkdir(OUT,{recursive:true});
const browser=await chromium.launch({headless:true});const report={desktop:null,mobile:null,pass:false};
for(const [name,viewport,mobile] of [['desktop',{width:1440,height:1000},false],['mobile',{width:390,height:844},true]]){const ctx=await browser.newContext({viewport});const p=await ctx.newPage();try{report[name]=await inspect(p,mobile);await p.screenshot({path:`${OUT}/${name}.png`,fullPage:true})}catch(e){report[name]={errors:[String(e)]};try{await p.screenshot({path:`${OUT}/${name}-error.png`,fullPage:true})}catch{}}await ctx.close()}
await browser.close();report.pass=!report.desktop.errors.length&&!report.mobile.errors.length;await fs.writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({route:ROUTE,pass:report.pass,desktop:report.desktop,mobile:report.mobile},null,2));if(!report.pass)process.exitCode=1;
