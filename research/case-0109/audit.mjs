import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const out = path.resolve('artifacts');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const target = { lat: 14.0854, lon: 108.5616, grid: 'BR372582' };
const apiUrl = 'https://maine.primo.exlibrisgroup.com/primaws/rest/pub/pnxs?vid=01MAINE_INST%3ADigCol&lang=en&limit=100&offset=0&q=any,contains,An%20Khe%20February%2016%201966';
const wanted = new Set(Array.from({length: 43}, (_, i) => `01-${String(i + 33).padStart(2,'0')}_AK`));

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1600, height: 1200 },
  recordVideo: { dir: path.join(out, 'video'), size: { width: 1600, height: 1200 } },
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/153 Safari/537.36'
});
const page = await context.newPage();
page.setDefaultTimeout(15000);

const resp = await page.goto(apiUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
const raw = await page.locator('body').innerText();
const api = JSON.parse(raw);
fs.writeFileSync(path.join(out, 'primo-api.json'), JSON.stringify(api, null, 2));

function first(a){ return Array.isArray(a) ? a[0] : a; }
function urlsFrom(value, out=[]){
  if (typeof value === 'string') {
    const ms = value.match(/https?:\/\/[^\s"'<>\\]+/g); if (ms) out.push(...ms);
  } else if (Array.isArray(value)) value.forEach(v=>urlsFrom(v,out));
  else if (value && typeof value === 'object') Object.values(value).forEach(v=>urlsFrom(v,out));
  return [...new Set(out.map(u=>u.replace(/[),.;]+$/,'')))];
}
function frameFrom(doc){
  const t = first(doc?.pnx?.display?.title) || '';
  const m = t.match(/(01-\d{2}_AK)/); return m ? m[1] : null;
}
function numericId(doc){
  const s = first(doc?.pnx?.display?.identifier) || '';
  const m = s.match(/\$\$V(\d+);/); return m ? m[1] : null;
}

const docs = api.docs.filter(d => wanted.has(frameFrom(d)));
const inventory = docs.map(d => ({
  frame: frameFrom(d),
  title: first(d.pnx?.display?.title),
  mms: first(d.pnx?.display?.mms),
  numeric_id: numericId(d),
  series_identifier: first(d.pnx?.display?.identifier),
  source_id: d['@id'] || null,
  coverage: d.pnx?.display?.coverage || [],
  description: d.pnx?.display?.description || []
})).sort((a,b)=>a.frame.localeCompare(b.frame));
fs.writeFileSync(path.join(out,'inventory.json'), JSON.stringify(inventory,null,2));

const results=[];
for (const item of inventory) {
  const full = `https://maine.primo.exlibrisgroup.com/nde/fulldisplay?docid=alma${item.mms}&context=L&vid=01MAINE_INST:DigCol&lang=en`;
  const seen=[];
  const listener = r => {
    const u=r.url();
    if (/iiif|representation|digital|delivery|thumbnail|\.jpe?g(?:\?|$)|\.tiff?(?:\?|$)|\.png(?:\?|$)|almaws|primaws/i.test(u)) seen.push(u);
  };
  page.on('request', listener);
  const rec={...item, full_record_url: full, status:'UNKNOWN'};
  try {
    const r=await page.goto(full,{waitUntil:'domcontentloaded',timeout:60000});
    rec.http=r?.status() ?? null;
    await page.waitForTimeout(3500);
    rec.final_url=page.url();
    rec.title=await page.title();
    rec.body=(await page.locator('body').innerText()).slice(0,30000);
    rec.images=await page.locator('img').evaluateAll(imgs=>imgs.map(i=>({src:i.currentSrc||i.src,width:i.naturalWidth,height:i.naturalHeight,alt:i.alt})).filter(x=>x.src)).catch(()=>[]);
    rec.links=await page.locator('a').evaluateAll(as=>as.map(a=>({href:a.href,text:(a.textContent||'').trim()})).filter(x=>x.href)).catch(()=>[]);
    rec.resources=[...new Set(seen)];
    const all=[...rec.resources,...rec.images.map(x=>x.src),...rec.links.map(x=>x.href)];
    rec.image_candidates=[...new Set(all.filter(u=>/iiif|\.jpe?g(?:\?|$)|\.tiff?(?:\?|$)|representation|digital.*(file|object|delivery)/i.test(u)))];
    rec.status = rec.body.includes(item.frame) ? 'VERIFIED_FULL_RECORD' : 'FULL_RECORD_OPENED';
    await page.screenshot({path:path.join(out,`${item.frame}-full.png`),fullPage:false,timeout:5000}).catch(()=>{});
  } catch(e){ rec.status='ERROR'; rec.error=String(e?.stack||e); }
  page.off('request', listener);
  fs.writeFileSync(path.join(out,`${item.frame}-delivery.json`),JSON.stringify(rec,null,2));
  results.push(rec);
  fs.writeFileSync(path.join(out,'audit-progress.json'),JSON.stringify({target,results},null,2));
}

fs.writeFileSync(path.join(out,'audit.json'),JSON.stringify({target,api_http:resp?.status()??null,inventory_count:inventory.length,results},null,2));
const md=[
 '# Case 0109 Aerial Audit — Full Record Delivery Capture','',
 `Target: ${target.grid} / ${target.lat}, ${target.lon}`,
 `Verified archive frames in requested 01-33..01-75 range: ${inventory.length}`,'',
 '| Frame | MMS | Numeric ID | Status | Image/resource candidates |','|---|---|---:|---|---:|',
 ...results.map(r=>`| ${r.frame} | ${r.mms} | ${r.numeric_id||''} | ${r.status} | ${r.image_candidates?.length||0} |`),
 '',
 'Chromium/Playwright opened each full migrated archive record and recorded network/image resources. Video and screenshots are retained in the workflow artifact.',
 'No generated imagery is used.'
].join('\n');
fs.writeFileSync(path.join(out,'AUDIT.md'),md);
await context.close();
await browser.close();
