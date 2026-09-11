import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE='https://www.statesideqm.com/collections/art?preview_theme_id=158561894555';
const OUT='cert-art-every-choice';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();

await fs.mkdir(OUT,{recursive:true});
const browser=await chromium.launch({headless:true});
const ctx=await browser.newContext({viewport:{width:1440,height:1100}});
const page=await ctx.newPage();
const report={base:BASE,startedAt:new Date().toISOString(),choices:[],errors:[]};

async function loadBase(){
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#MainContent')?.dataset.sqRefineV3Ready==='true'||document.querySelector('#MainContent')?.dataset.sqRefineV3Error,{timeout:60000});
  await sleep(700);
}

async function snapshotState(){
  return page.evaluate(()=>{
    const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
    const main=document.querySelector('#MainContent');
    const groups=[...document.querySelectorAll('.sq-refine-v3-sidebar .sq-refine-v3-group')].map((g,gi)=>({
      index:gi,
      label:clean(g.querySelector(':scope>summary')?.textContent),
      choices:[...g.querySelectorAll('.sq-refine-v3-choice')].map((c,ci)=>{
        const i=c.querySelector('input');
        return {index:ci,label:clean(c.querySelector('span')?.textContent||c.textContent),type:i?.type||'',name:i?.name||'',value:i?.value||'',checked:!!i?.checked,disabled:!!i?.disabled};
      })
    }));
    const cards=[...document.querySelectorAll('.product-grid .product-grid__item, .product-grid > li')].map(c=>{
      const a=c.querySelector('a[href*="/products/"]');
      if(!a)return null;
      const m=(a.getAttribute('href')||'').match(/\/products\/([^/?#]+)/);
      return {handle:m?m[1]:'',title:clean(c.querySelector('h3,.card__heading,[class*="title"]')?.textContent||a.textContent)};
    }).filter(Boolean);
    return {ready:main?.dataset.sqRefineV3Ready||'',error:main?.dataset.sqRefineV3Error||'',groups,cards,url:location.href};
  });
}

try{
  await loadBase();
  const base=await snapshotState();
  report.baseState=base;
  await page.screenshot({path:`${OUT}/00-base.png`,fullPage:true});
  const work=[];
  for(const g of base.groups) for(const c of g.choices) if(c.type==='checkbox'&&!c.disabled) work.push({groupIndex:g.index,group:g.label,choiceIndex:c.index,label:c.label});
  report.choiceCount=work.length;

  for(let n=0;n<work.length;n++){
    const item=work[n];
    const row={ordinal:n+1,...item,pass:false};
    try{
      await loadBase();
      const groups=page.locator('.sq-refine-v3-sidebar .sq-refine-v3-group');
      const g=groups.nth(item.groupIndex);
      if(!(await g.getAttribute('open'))) await g.locator(':scope>summary').click();
      const choice=g.locator('.sq-refine-v3-choice').nth(item.choiceIndex);
      const input=choice.locator('input[type="checkbox"]');
      await choice.scrollIntoViewIfNeeded();
      await input.check({force:true});
      await page.waitForTimeout(350);
      await page.waitForLoadState('domcontentloaded').catch(()=>{});
      await page.waitForFunction(()=>document.querySelector('#MainContent')?.dataset.sqRefineV3Ready==='true'||document.querySelector('#MainContent')?.dataset.sqRefineV3Error,{timeout:45000}).catch(()=>{});
      await sleep(900);
      const state=await snapshotState();
      row.url=state.url;
      row.ready=state.ready;
      row.runtimeError=state.error;
      row.productCount=state.cards.length;
      row.products=state.cards;
      row.checked=state.groups.flatMap(x=>x.choices.map(y=>({group:x.label,...y}))).filter(x=>x.checked).map(x=>`${x.group} :: ${x.label}`);
      row.pass=!row.runtimeError&&row.ready==='true'&&row.checked.length>0&&row.productCount>0;
      if(!row.pass) row.reason=`ready=${row.ready} error=${row.runtimeError||'none'} checked=${row.checked.length} products=${row.productCount}`;
      const slug=String(n+1).padStart(2,'0')+'-'+clean(item.group+'-'+item.label).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90);
      await page.screenshot({path:`${OUT}/${slug}.png`,fullPage:true});
    }catch(e){row.reason=String(e);}
    report.choices.push(row);
    console.log(JSON.stringify({ordinal:row.ordinal,group:row.group,label:row.label,pass:row.pass,count:row.productCount,url:row.url,reason:row.reason||''}));
  }
}catch(e){report.errors.push(String(e));}

report.finishedAt=new Date().toISOString();
report.pass=!report.errors.length&&report.choices.length===report.choiceCount&&report.choices.every(x=>x.pass);
await fs.writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2));
await browser.close();
console.log(JSON.stringify({pass:report.pass,choiceCount:report.choiceCount,failed:report.choices.filter(x=>!x.pass).map(x=>({group:x.group,label:x.label,reason:x.reason}))},null,2));
if(!report.pass) process.exitCode=1;
