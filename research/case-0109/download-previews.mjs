import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const out = path.resolve('artifacts');
const data = JSON.parse(fs.readFileSync(path.join(out,'audit.json'),'utf8'));
const imgDir = path.join(out,'archival-images');
fs.mkdirSync(imgDir,{recursive:true});

const browser = await chromium.launch({headless:true});
const context = await browser.newContext({userAgent:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/153 Safari/537.36'});
const page = await context.newPage();
const report=[];

for (const rec of data.results) {
  const info = (rec.image_candidates||[]).find(u=>u.includes('/iiif/2/') && u.includes('/info.json'));
  const row={frame:rec.frame,info_url:info||null,status:'NO_INFO'};
  if (!info) { report.push(row); continue; }
  const base=info.replace(/\/info\.json(?:\?.*)?$/,'');
  const preview=`${base}/full/1200,/0/default.jpg`;
  row.preview_url=preview;
  try {
    const response=await context.request.get(preview,{timeout:30000,headers:{Referer:rec.full_record_url||'https://maine.primo.exlibrisgroup.com/'}});
    row.http=response.status();
    const ct=response.headers()['content-type']||'';
    row.content_type=ct;
    const body=await response.body();
    if (response.ok() && ct.includes('image') && body.length>1000) {
      const file=path.join(imgDir,`${rec.frame}.jpg`);
      fs.writeFileSync(file,body);
      row.bytes=body.length;
      row.file=`archival-images/${rec.frame}.jpg`;
      row.status='DOWNLOADED';
      await page.goto(`file://${file}`).catch(()=>{});
    } else row.status='HTTP_ERROR';
  } catch(e){ row.status='ERROR'; row.error=String(e?.message||e); }
  report.push(row);
}
fs.writeFileSync(path.join(out,'image-download-report.json'),JSON.stringify(report,null,2));
fs.writeFileSync(path.join(out,'IMAGE-DOWNLOADS.md'),[
 '# Case 0109 Real Aerial Image Downloads','',
 '| Frame | Status | Bytes |','|---|---|---:|',
 ...report.map(r=>`| ${r.frame} | ${r.status} | ${r.bytes||''} |`),
 '',
 'All downloaded JPGs are derived from the archive IIIF services captured by Chromium/Playwright. No generated imagery.'
].join('\n'));
await context.close(); await browser.close();
