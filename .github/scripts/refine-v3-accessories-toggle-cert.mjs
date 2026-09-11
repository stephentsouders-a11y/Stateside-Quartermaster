import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const url='https://www.statesideqm.com/collections/accessories-gifts-collectibles?preview_theme_id=158561894555';
const out='cert-v3-accessories-toggle';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function run(viewport,label){
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport});
  const page=await context.newPage();
  const result={label,pass:false};
  try{
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:40000});
    result.http=response?.status()||0;
    await page.waitForFunction(()=>{const m=document.querySelector('#MainContent');return m?.dataset.sqRefineV3Error||m?.dataset.sqRefineV3RouteFix==='accessories-gifts-collectibles'},{timeout:45000});
    const err=await page.locator('#MainContent').getAttribute('data-sq-refine-v3-error');
    if(err)throw new Error('V3 '+err);
    const picked=await page.evaluate(()=>{const d=[...document.querySelectorAll('.sq-refine-v3-sidebar .sq-refine-v3-group')].find(x=>!x.open);if(!d)return false;d.setAttribute('data-sq-cert-toggle-target','true');return true});
    if(!picked){result.pass=true;result.reason='no inactive group';return result}
    const d=page.locator('[data-sq-cert-toggle-target="true"]');
    const s=d.locator(':scope>summary');
    await s.scrollIntoViewIfNeeded();
    result.before=await s.evaluate(el=>getComputedStyle(el,'::after').content);
    await s.click({timeout:7000});
    await delay(150);
    result.opened=await d.evaluate(el=>el.open);
    result.afterOpen=await s.evaluate(el=>getComputedStyle(el,'::after').content);
    await page.screenshot({path:`${out}/${label}-open.png`,fullPage:true});
    await s.click({timeout:7000});
    await delay(150);
    result.closed=await d.evaluate(el=>!el.open);
    result.afterClose=await s.evaluate(el=>getComputedStyle(el,'::after').content);
    result.pass=/\+/.test(result.before)&&result.opened&&/[−\u2212-]/.test(result.afterOpen)&&result.closed&&/\+/.test(result.afterClose);
    await page.screenshot({path:`${out}/${label}-closed.png`,fullPage:true});
  }catch(e){result.error=String(e);try{await page.screenshot({path:`${out}/${label}-error.png`,fullPage:true})}catch{}}
  await context.close();await browser.close();return result;
}
await fs.mkdir(out,{recursive:true});
const desktop=await run({width:1440,height:1000},'desktop');
const mobile=await run({width:390,height:844},'mobile');
const report={desktop,mobile,pass:desktop.pass&&mobile.pass};
await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(!report.pass)process.exitCode=1;
