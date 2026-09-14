import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const out = path.resolve('artifacts');
fs.mkdirSync(out, { recursive: true });

const frames = [
  '01-33_AK','01-34_AK','01-35_AK','01-36_AK','01-37_AK','01-38_AK','01-39_AK','01-40_AK',
  '01-41_AK','01-42_AK','01-43_AK','01-44_AK','01-45_AK','01-46_AK','01-47_AK','01-48_AK',
  '01-49_AK','01-50_AK','01-51_AK','01-52_AK','01-53_AK','01-54_AK','01-55_AK','01-56_AK',
  '01-57_AK','01-58_AK','01-59_AK','01-60_AK','01-61_AK','01-62_AK','01-63_AK','01-64_AK',
  '01-65_AK','01-66_AK','01-67_AK','01-68_AK','01-69_AK','01-70_AK','01-71_AK','01-72_AK',
  '01-73_AK','01-74_AK','01-75_AK'
];

const target = { lat: 14.0854, lon: 108.5616, grid: 'BR372582' };
const results = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1600, height: 1200 },
  recordVideo: { dir: path.join(out, 'video'), size: { width: 1600, height: 1200 } }
});

async function searchFrame(page, frame) {
  const q = encodeURIComponent(frame);
  const url = `https://maine.primo.exlibrisgroup.com/nde/search?query=any,contains,${q}&vid=01MAINE_INST:DigCol&lang=en`;
  const rec = { frame, search_url: url, target, status: 'UNKNOWN', notes: [] };
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    rec.http_status = resp?.status() ?? null;
    await page.waitForTimeout(2500);
    const body = (await page.locator('body').innerText()).slice(0, 30000);
    rec.body_excerpt = body;
    const links = await page.locator('a').evaluateAll(as => as.map(a => ({ text: (a.textContent||'').trim(), href: a.href })).filter(x => x.href));
    rec.links = links.filter(x => x.text.includes(frame) || x.href.includes(frame)).slice(0, 20);
    await page.screenshot({ path: path.join(out, `${frame}-search.png`), fullPage: true });
    if (!body.includes(frame)) {
      rec.status = 'NOT_FOUND';
      rec.notes.push('Frame identifier not visible in returned search page.');
      return rec;
    }
    rec.status = 'FOUND';
    const candidate = links.find(x => x.text.includes(frame)) || links.find(x => x.href.includes(frame));
    if (candidate) {
      rec.record_url = candidate.href;
      const r2 = await page.goto(candidate.href, { waitUntil: 'domcontentloaded', timeout: 45000 });
      rec.record_http_status = r2?.status() ?? null;
      await page.waitForTimeout(2500);
      rec.record_text = (await page.locator('body').innerText()).slice(0, 40000);
      rec.images = await page.locator('img').evaluateAll(imgs => imgs.map(i => ({ src: i.src, alt: i.alt, width: i.naturalWidth, height: i.naturalHeight })).filter(x => x.src));
      rec.record_links = await page.locator('a').evaluateAll(as => as.map(a => ({ text: (a.textContent||'').trim(), href: a.href })).filter(x => x.href)).then(xs => xs.filter(x => /iiif|download|image|jpg|jpeg|tif|tiff/i.test(`${x.text} ${x.href}`)).slice(0,40));
      await page.screenshot({ path: path.join(out, `${frame}-record.png`), fullPage: true });
    }
  } catch (e) {
    rec.status = 'ERROR';
    rec.error = String(e?.stack || e);
  }
  return rec;
}

const page = await context.newPage();
for (const frame of frames) {
  const rec = await searchFrame(page, frame);
  results.push(rec);
  fs.writeFileSync(path.join(out, 'audit-progress.json'), JSON.stringify({ target, results }, null, 2));
}

fs.writeFileSync(path.join(out, 'audit.json'), JSON.stringify({ target, generated_at: new Date().toISOString(), results }, null, 2));
const md = [
  '# Case 0109 Aerial Audit',
  '',
  `Target: ${target.grid} / ${target.lat}, ${target.lon}`,
  '',
  '| Frame | Status | HTTP | Record |',
  '|---|---|---:|---|',
  ...results.map(r => `| ${r.frame} | ${r.status} | ${r.http_status ?? ''} | ${r.record_url ? `[record](${r.record_url})` : ''} |`),
  '',
  'This audit records only real archival pages and images retrieved by Chromium. No generated imagery is used.'
].join('\n');
fs.writeFileSync(path.join(out, 'AUDIT.md'), md);

await context.close();
await browser.close();
