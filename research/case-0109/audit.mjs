import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const out = path.resolve('artifacts');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const frames = Array.from({length: 43}, (_, i) => `01-${String(i + 33).padStart(2,'0')}_AK`);
const target = { lat: 14.0854, lon: 108.5616, grid: 'BR372582' };
const apiUrl = 'https://maine.primo.exlibrisgroup.com/primaws/rest/pub/pnxs?vid=01MAINE_INST%3ADigCol&lang=en&limit=100&offset=0&q=any,contains,An%20Khe%20February%2016%201966';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1600, height: 1200 },
  recordVideo: { dir: path.join(out, 'video'), size: { width: 1600, height: 1200 } },
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36'
});
const page = await context.newPage();

const response = await page.goto(apiUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(1000);
const rawText = await page.locator('body').innerText();
fs.writeFileSync(path.join(out, 'primo-api-raw.txt'), rawText);
await page.screenshot({ path: path.join(out, 'primo-api.png'), fullPage: true });

let api;
try { api = JSON.parse(rawText); }
catch (e) {
  fs.writeFileSync(path.join(out, 'API_PARSE_ERROR.txt'), String(e.stack || e));
  throw e;
}
fs.writeFileSync(path.join(out, 'primo-api.json'), JSON.stringify(api, null, 2));

function allStrings(node, acc=[]) {
  if (typeof node === 'string') acc.push(node);
  else if (Array.isArray(node)) node.forEach(x => allStrings(x, acc));
  else if (node && typeof node === 'object') Object.values(node).forEach(x => allStrings(x, acc));
  return acc;
}
function extractUrls(node) {
  const urls = [];
  for (const s of allStrings(node)) {
    const m = s.match(/https?:\/\/[^\s"'<>\\]+/g);
    if (m) urls.push(...m);
  }
  return [...new Set(urls.map(u => u.replace(/[),.;]+$/, '')))];
}
function findSmallestMatchingObjects(node, needle, found=[]) {
  if (!node || typeof node !== 'object') return found;
  const children = Array.isArray(node) ? node : Object.values(node);
  let childMatched = false;
  for (const child of children) {
    if (child && typeof child === 'object') {
      const before = found.length;
      findSmallestMatchingObjects(child, needle, found);
      if (found.length > before) childMatched = true;
    }
  }
  if (!childMatched) {
    let text = '';
    try { text = JSON.stringify(node); } catch {}
    if (text.includes(needle)) found.push(node);
  }
  return found;
}
function scoreRecord(obj, frame) {
  const s = JSON.stringify(obj);
  let score = 0;
  if (s.includes(frame)) score += 20;
  if (/An Khe February 16 1966/i.test(s)) score += 10;
  if (/pnx|delivery|recordid|control|display/i.test(s)) score += 5;
  if (/iiif|jpeg|jpg|tif|image/i.test(s)) score += 5;
  return score;
}
function findStrings(node, pattern) {
  return allStrings(node).filter(s => pattern.test(s));
}

const results = [];
for (const frame of frames) {
  const matches = findSmallestMatchingObjects(api, frame, []);
  const ranked = matches.map(o => ({ o, score: scoreRecord(o, frame), len: JSON.stringify(o).length }))
    .sort((a,b) => b.score - a.score || a.len - b.len);
  const rec = { frame, target, status: 'NOT_IN_API', matches: matches.length };
  if (ranked.length) {
    const record = ranked[0].o;
    rec.status = 'VERIFIED_API_RECORD';
    rec.api_score = ranked[0].score;
    rec.api_record = record;
    rec.urls = extractUrls(record);
    rec.image_candidates = rec.urls.filter(u => /iiif|\.jpe?g(?:\?|$)|\.tiff?(?:\?|$)|image|download/i.test(u));
    rec.catalog_candidates = rec.urls.filter(u => /primo|exlibris|digitalcommons|maine\.edu/i.test(u));
    rec.titles = findStrings(record, new RegExp(frame.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))).slice(0,20);
    fs.writeFileSync(path.join(out, `${frame}-record.json`), JSON.stringify(record, null, 2));

    // Open one archival image candidate if the API exposes one, otherwise open a catalog candidate.
    const candidate = rec.image_candidates[0] || rec.catalog_candidates[0];
    if (candidate) {
      try {
        rec.review_url = candidate;
        const r = await page.goto(candidate, { waitUntil: 'domcontentloaded', timeout: 45000 });
        rec.review_http = r?.status() ?? null;
        await page.waitForTimeout(1200);
        rec.review_final_url = page.url();
        rec.review_title = await page.title();
        rec.review_body_excerpt = (await page.locator('body').innerText()).slice(0,10000);
        rec.review_images = await page.locator('img').evaluateAll(imgs => imgs.map(i => ({src:i.currentSrc||i.src,width:i.naturalWidth,height:i.naturalHeight,alt:i.alt})).filter(x=>x.src)).catch(()=>[]);
        rec.review_resources = await page.evaluate(() => performance.getEntriesByType('resource').map(r=>r.name).filter(u=>/iiif|jpg|jpeg|png|tif|tiff|image/i.test(u)).slice(-100)).catch(()=>[]);
        await page.screenshot({ path: path.join(out, `${frame}-review.png`), fullPage: true }).catch(()=>{});
      } catch (e) {
        rec.review_error = String(e?.message || e);
      }
    }
  }
  results.push(rec);
  fs.writeFileSync(path.join(out, 'audit-progress.json'), JSON.stringify({target, apiUrl, api_http: response?.status() ?? null, results}, null, 2));
}

const payload = { target, apiUrl, api_http: response?.status() ?? null, generated_at: new Date().toISOString(), results };
fs.writeFileSync(path.join(out, 'audit.json'), JSON.stringify(payload, null, 2));
const md = [
  '# Case 0109 Aerial Audit — Primo API Verification',
  '',
  `Target: ${target.grid} / ${target.lat}, ${target.lon}`,
  `Primo API HTTP: ${response?.status() ?? ''}`,
  '',
  '| Frame | Status | Matches | Image URLs | Review URL |',
  '|---|---|---:|---:|---|',
  ...results.map(r => `| ${r.frame} | ${r.status} | ${r.matches} | ${r.image_candidates?.length ?? 0} | ${r.review_url ? `[open](${r.review_url})` : ''} |`),
  '',
  'PASS RULE: a frame passes only when its identifier exists inside an actual Primo PNX record returned by the archive API.',
  'No generated imagery is used. Chromium video and screenshots are retained in the workflow artifact.'
].join('\n');
fs.writeFileSync(path.join(out, 'AUDIT.md'), md);

await context.close();
await browser.close();
