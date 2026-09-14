import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const out = path.resolve('artifacts');
fs.rmSync(out, { recursive: true, force: true });
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
  recordVideo: { dir: path.join(out, 'video'), size: { width: 1600, height: 1200 } },
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36'
});

const clean = s => (s || '').replace(/\s+/g, ' ').trim();

async function captureRecord(page, rec, candidateUrl) {
  rec.record_url = candidateUrl;
  const response = await page.goto(candidateUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  rec.record_http_status = response?.status() ?? null;
  await page.waitForTimeout(2500);
  rec.final_url = page.url();
  rec.record_text = (await page.locator('body').innerText()).slice(0, 50000);
  rec.images = await page.locator('img').evaluateAll(imgs => imgs.map(i => ({ src: i.currentSrc || i.src, alt: i.alt, width: i.naturalWidth, height: i.naturalHeight })).filter(x => x.src));
  rec.record_links = await page.locator('a').evaluateAll(as => as.map(a => ({ text: (a.textContent||'').trim(), href: a.href })).filter(x => x.href));
  rec.resources = await page.evaluate(() => performance.getEntriesByType('resource').map(r => r.name).filter(u => /iiif|jpg|jpeg|png|tif|tiff|image/i.test(u)).slice(-100));
  await page.screenshot({ path: path.join(out, `${rec.frame}-record.png`), fullPage: true });
  const allUrls = [
    ...rec.images.map(x => x.src),
    ...rec.record_links.map(x => x.href),
    ...rec.resources
  ];
  rec.image_candidates = [...new Set(allUrls.filter(u => /iiif|\.jpe?g(?:\?|$)|\.tiff?(?:\?|$)|download/i.test(u)))].slice(0, 100);
  rec.status = rec.record_text.includes(rec.frame) || rec.final_url.includes(rec.frame) ? 'VERIFIED_RECORD' : 'RECORD_REVIEW';
}

async function searchFrame(page, frame) {
  const rec = { frame, target, status: 'UNKNOWN', notes: [] };
  try {
    // 1) Check the migrated Maine catalog directly, but do not accept the query echo as evidence.
    const primo = `https://maine.primo.exlibrisgroup.com/nde/search?query=any,contains,${encodeURIComponent(frame)}&vid=01MAINE_INST:DigCol&lang=en`;
    rec.primo_search_url = primo;
    let response = await page.goto(primo, { waitUntil: 'domcontentloaded', timeout: 45000 });
    rec.primo_http_status = response?.status() ?? null;
    await page.waitForTimeout(1800);
    let body = await page.locator('body').innerText();
    await page.screenshot({ path: path.join(out, `${frame}-primo.png`), fullPage: true });
    const noRecords = /No records found|no results matching/i.test(body);
    const primoLinks = await page.locator('a').evaluateAll(as => as.map(a => ({ text: (a.textContent||'').trim(), href: a.href })).filter(x => x.href));
    let candidate = primoLinks.find(x => x.text.includes(frame) && !/search/i.test(x.href));
    if (candidate && !noRecords) {
      rec.discovery = 'maine-primo';
      await captureRecord(page, rec, candidate.href);
      return rec;
    }

    // 2) Use a public search engine to resolve legacy Digital Commons records into their current location.
    const query = `\"An Khe February 16 1966 ${frame}\"`;
    const ddg = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    rec.web_search_url = ddg;
    response = await page.goto(ddg, { waitUntil: 'domcontentloaded', timeout: 45000 });
    rec.web_http_status = response?.status() ?? null;
    await page.waitForTimeout(1200);
    body = await page.locator('body').innerText();
    rec.web_body_excerpt = body.slice(0, 20000);
    await page.screenshot({ path: path.join(out, `${frame}-websearch.png`), fullPage: true });
    const webLinks = await page.locator('a').evaluateAll(as => as.map(a => ({ text: (a.textContent||'').trim(), href: a.href })).filter(x => x.href));
    const matching = webLinks.filter(x => clean(x.text).includes(frame) || x.href.includes(frame));
    rec.web_matches = matching.slice(0, 20);
    candidate = matching.find(x => /digitalcommons\.library\.umaine\.edu|maine\.primo\.exlibrisgroup\.com/i.test(x.href));
    if (!candidate) {
      candidate = webLinks.find(x => /digitalcommons\.library\.umaine\.edu\/sewell_aerial_vietnam_all\//i.test(x.href) && clean(x.text).includes(frame));
    }
    if (candidate) {
      rec.discovery = 'web-search';
      await captureRecord(page, rec, candidate.href);
      return rec;
    }

    rec.status = 'NOT_LOCATED';
    rec.notes.push(noRecords ? 'Maine catalog direct search returned no records.' : 'No verified record link found.');
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

const payload = { target, generated_at: new Date().toISOString(), results };
fs.writeFileSync(path.join(out, 'audit.json'), JSON.stringify(payload, null, 2));
const md = [
  '# Case 0109 Aerial Audit',
  '',
  `Target: ${target.grid} / ${target.lat}, ${target.lon}`,
  '',
  '| Frame | Status | Discovery | Record | Image candidates |',
  '|---|---|---|---|---:|',
  ...results.map(r => `| ${r.frame} | ${r.status} | ${r.discovery ?? ''} | ${r.record_url ? `[record](${r.record_url})` : ''} | ${r.image_candidates?.length ?? 0} |`),
  '',
  'PASS RULE: A frame is never accepted merely because its identifier is echoed in a search query or a “No records found” page.',
  '',
  'This audit records only real archival pages/images retrieved by Chromium. No generated imagery is used.'
].join('\n');
fs.writeFileSync(path.join(out, 'AUDIT.md'), md);

await context.close();
await browser.close();
