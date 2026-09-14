import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const origin = process.env.STORE_ORIGIN || 'https://www.statesideqm.com';
const themeId = process.env.PREVIEW_THEME_ID || '';
const out = process.env.AUDIT_OUTPUT || 'audit-output/pagination-first-paint';

fs.mkdirSync(path.join(out, 'videos'), { recursive: true });
fs.mkdirSync(path.join(out, 'screenshots'), { recursive: true });
fs.mkdirSync(path.join(out, 'traces'), { recursive: true });

const roots = [
  'accessories-gifts-collectibles','airsoft-milsim','apparel','armed-forces-gear','art',
  'body-armor-ballistic-protection','literature','child-safety-shop','dive-scuba','firearm-accessories',
  'first-aid-medical-ifak','flags-patriotic-decor','flashlights-lighting','footwear-gloves-eyewear',
  'k9-dog-gear','knives-axes-cutlery','morale-patches-tactical-id','outdoor-preparedness-gear',
  'patriotic-american-heritage','safety-rescue-climbing','sta-brite-insignia','tactical-gear','thin-line',
  'uniforms','watches','zippos-lighters-torches','stateside-quartermaster-logo-merch',
  'army-national-guard-series','air-national-guard-series','products-built-for-the-line-u-s-army',
  'products-built-for-the-line-u-s-navy','products-built-for-the-line-u-s-air-force',
  'products-built-for-the-line-u-s-marine-corps','products-built-for-the-line-u-s-coast-guard',
  'products-built-for-the-line-u-s-space-force','rotc-series','jrotc-series','military-schools-academies',
  'law-enforcement-corrections','firefighting-ems-search-rescue'
];

function withPreview(url) {
  if (!themeId) return url;
  const u = new URL(url);
  u.searchParams.set('preview_theme_id', themeId);
  return u.toString();
}

const reported = `${origin}/collections/dive-scuba-dive-bags-clips-accessories-1?sq_root=dive-scuba`;
const tests = [
  { name: 'reported-live-dive-scuba', url: reported, expectedManaged: true, requirePager: true, required: true, coldLoads: 3 },
  { name: 'reported-preview-dive-scuba', url: withPreview(reported), expectedManaged: true, requirePager: true, required: true, coldLoads: 3 },
  { name: 'ordinary-state-guard-series', url: withPreview(`${origin}/collections/state-guard-series`), expectedManaged: false, requirePager: false, required: false, coldLoads: 1 },
  ...roots.map(root => ({
    name: `root-${root}`,
    url: withPreview(`${origin}/collections/${root}?sq_root=${encodeURIComponent(root)}`),
    expectedManaged: true,
    requirePager: false,
    required: false,
    coldLoads: 1
  }))
];

const browser = await chromium.launch({ headless: true });
const results = [];

const initAuditScript = () => {
  window.__sqPaintAudit = { samples: [], legacyEverVisible: false, desiredEverVisible: false };
  const visible = el => {
    if (!el) return false;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity || '1') > 0 && r.width > 0 && r.height > 0;
  };
  const sample = label => {
    const legacy = [...document.querySelectorAll('.vac-pagination-shell, pagination-component, #MainContent .pagination')];
    const desired = [...document.querySelectorAll('.sq-refine-v3-pager')];
    const row = {
      t: Math.round(performance.now()),
      label,
      legacyCount: legacy.length,
      visibleLegacyCount: legacy.filter(visible).length,
      desiredCount: desired.length,
      visibleDesiredCount: desired.filter(visible).length,
      managedClass: document.documentElement.classList.contains('sq-refine-v3-pagination-authoritative')
    };
    window.__sqPaintAudit.samples.push(row);
    if (row.visibleLegacyCount > 0) window.__sqPaintAudit.legacyEverVisible = true;
    if (row.visibleDesiredCount > 0) window.__sqPaintAudit.desiredEverVisible = true;
  };
  new MutationObserver(() => sample('mutation')).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['class','style'] });
  document.addEventListener('DOMContentLoaded', () => sample('domcontentloaded'), { once: true });
  window.addEventListener('load', () => sample('load'), { once: true });
  const loop = () => {
    sample('raf');
    if (performance.now() < 5000) requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
};

async function settledState(page) {
  return page.evaluate(() => {
    const visible = el => {
      if (!el) return false;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity || '1') > 0 && r.width > 0 && r.height > 0;
    };
    const legacy = [...document.querySelectorAll('.vac-pagination-shell, pagination-component, #MainContent .pagination')];
    const desired = [...document.querySelectorAll('.sq-refine-v3-pager')];
    const main = document.getElementById('MainContent');
    return {
      title: document.title,
      readyState: document.readyState,
      managedClass: document.documentElement.classList.contains('sq-refine-v3-pagination-authoritative'),
      legacyCount: legacy.length,
      visibleLegacyCount: legacy.filter(visible).length,
      desiredCount: desired.length,
      visibleDesiredCount: desired.filter(visible).length,
      desiredText: desired.filter(visible).map(x => (x.textContent || '').replace(/\s+/g, ' ').trim()),
      mainReady: main?.dataset?.sqRefineV3Ready || null,
      mainError: main?.dataset?.sqRefineV3Error || null,
      paginationRepaired: main?.dataset?.sqRefineV3PaginationRepaired || null,
      paginationCertified: main?.dataset?.sqRefineV3PaginationCertified || null
    };
  });
}

async function runTest(test, index) {
  const safe = `${String(index + 1).padStart(2, '0')}-${test.name.replace(/[^a-z0-9_-]+/gi, '-')}`;
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    recordVideo: { dir: path.join(out, 'videos'), size: { width: 1280, height: 720 } }
  });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  const page = await context.newPage();
  const consoleErrors = [];
  const requestFailures = [];
  const attempts = [];
  let video = null;

  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push(`pageerror: ${err.message}`));
  page.on('requestfailed', req => requestFailures.push({ url: req.url(), error: req.failure()?.errorText || 'unknown' }));

  try {
    for (let attempt = 1; attempt <= test.coldLoads; attempt++) {
      await page.addInitScript(initAuditScript);
      let responseStatus = null;
      let navError = null;
      try {
        const response = await page.goto(test.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        responseStatus = response?.status() ?? null;
        await page.waitForTimeout(6500);
      } catch (e) {
        navError = String(e?.message || e);
      }

      let observed = {};
      let settled = {};
      try {
        observed = await page.evaluate(() => window.__sqPaintAudit || {});
        settled = await settledState(page);
      } catch (e) {
        navError = navError || String(e?.message || e);
      }

      const screenshot = path.join(out, 'screenshots', `${safe}-cold-${attempt}.png`);
      await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});

      attempts.push({
        attempt,
        responseStatus,
        finalUrl: page.url(),
        navError,
        legacyFlash: !!observed.legacyEverVisible,
        desiredEverVisible: !!observed.desiredEverVisible,
        sampleCount: observed.samples?.length || 0,
        firstVisibleLegacySample: observed.samples?.find(x => x.visibleLegacyCount > 0) || null,
        firstVisibleDesiredSample: observed.samples?.find(x => x.visibleDesiredCount > 0) || null,
        settled
      });
    }

    const last = attempts.at(-1) || {};
    const settled = last.settled || {};
    let pagerClick = null;
    const next = page.locator('a[data-sq-pagination-repair="next"], .sq-refine-v3-pager a[aria-label*="Next"]');
    if (settled.visibleDesiredCount > 0 && await next.count() > 0) {
      const href = await next.first().getAttribute('href');
      pagerClick = { href, attempted: true, passed: false };
      try {
        await next.first().click({ timeout: 10000 });
        await page.waitForLoadState('domcontentloaded', { timeout: 45000 }).catch(() => {});
        await page.waitForTimeout(2500);
        pagerClick.finalUrl = page.url();
        pagerClick.passed = /(?:sq_view_page|page)=2(?:&|$)/.test(page.url());
        await page.screenshot({ path: path.join(out, 'screenshots', `${safe}-after-next.png`), fullPage: true }).catch(() => {});
      } catch (e) {
        pagerClick.error = String(e?.message || e);
      }
    }

    const statusOkay = attempts.every(a => a.responseStatus === null || a.responseStatus < 400);
    const noNavErrors = attempts.every(a => !a.navError);
    const noLegacyFlash = attempts.every(a => !a.legacyFlash);
    const guardOkay = test.expectedManaged ? attempts.every(a => a.settled?.managedClass === true) : attempts.every(a => a.settled?.managedClass !== true);
    const pagerOkay = test.requirePager ? attempts.every(a => (a.settled?.visibleDesiredCount || 0) > 0) : true;
    const clickOkay = test.requirePager ? pagerClick?.passed === true : true;
    const passed = statusOkay && noNavErrors && (test.expectedManaged ? noLegacyFlash : true) && guardOkay && pagerOkay && clickOkay;

    results.push({
      ...test,
      passed,
      attempts,
      pagerClick,
      consoleErrors: consoleErrors.slice(0, 40),
      requestFailures: requestFailures.slice(0, 40)
    });
  } finally {
    await context.tracing.stop({ path: path.join(out, 'traces', `${safe}.zip`) }).catch(() => {});
    video = page.video();
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    if (video) {
      try {
        const oldPath = await video.path();
        if (fs.existsSync(oldPath)) fs.renameSync(oldPath, path.join(out, 'videos', `${safe}.webm`));
      } catch {}
    }
  }
}

for (let i = 0; i < tests.length; i++) {
  console.log(`[${i + 1}/${tests.length}] ${tests[i].name}`);
  await runTest(tests[i], i);
  await new Promise(resolve => setTimeout(resolve, 250));
}

await browser.close();

fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));

const rows = results.map(r => {
  const flashes = r.attempts?.filter(a => a.legacyFlash).length || 0;
  const guard = r.attempts?.every(a => a.settled?.managedClass === true) ? 'YES' : 'NO';
  const desired = r.attempts?.every(a => (a.settled?.visibleDesiredCount || 0) > 0) ? 'YES' : 'NO';
  const http = r.attempts?.map(a => a.responseStatus ?? '').join(',') || '';
  const errors = r.attempts?.map(a => a.navError).filter(Boolean).join('; ').replace(/\|/g, '\\|') || '';
  const click = r.pagerClick?.attempted ? (r.pagerClick.passed ? 'PASS' : 'FAIL') : '';
  return `| ${r.passed ? 'PASS' : 'FAIL'} | ${r.name} | ${http} | ${flashes} | ${guard} | ${desired} | ${click} | ${errors} |`;
});

const requiredFailures = results.filter(r => r.required && !r.passed);
const allFailures = results.filter(r => !r.passed);
const receipt = [
  '# Pagination First-Paint Chromium Playwright Audit Receipt',
  '',
  `Generated: ${new Date().toISOString()}`,
  `Store: ${origin}`,
  `Preview theme: ${themeId || 'none'}`,
  `Routes tested: ${results.length}`,
  '',
  '| Result | Test | HTTP | Flash samples | Guard active | Desired pager settled | Next click | Error |',
  '|---|---|---|---:|---|---|---|---|',
  ...rows,
  '',
  `Overall: ${allFailures.length === 0 ? 'PASS' : 'FAIL'}`,
  `Passed: ${results.length - allFailures.length}/${results.length}`,
  `Required failures: ${requiredFailures.length}`,
  `Any legacy flash detected: ${results.some(r => r.attempts?.some(a => a.legacyFlash)) ? 'YES' : 'NO'}`,
  '',
  'Evidence bundle contains per-route Chromium WebM video, Playwright trace ZIP, screenshots, and results.json.'
].join('\n');

fs.writeFileSync(path.join(out, 'AUDIT_RECEIPT.md'), receipt);
console.log(receipt);

if (requiredFailures.length > 0) process.exitCode = 1;
