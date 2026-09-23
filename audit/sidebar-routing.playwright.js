const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const base = process.env.SQ_BASE_URL || 'https://www.statesideqm.com';
const previewThemeId = process.env.SQ_PREVIEW_THEME_ID || '159040962715';
const outDir = path.resolve('artifacts');
fs.mkdirSync(path.join(outDir, 'screenshots'), { recursive: true });
fs.mkdirSync(path.join(outDir, 'videos'), { recursive: true });

const roots = [
  'tactical-gear','uniforms','firearm-accessories','body-armor-ballistic-protection','apparel',
  'flags-patriotic-decor','literature','outdoor-preparedness-gear','first-aid-medical-ifak',
  'flashlights-lighting','knives-axes-cutlery','dive-scuba','armed-forces-gear',
  'morale-patches-tactical-id','footwear-gloves-eyewear','accessories-gifts-collectibles',
  'safety-rescue-climbing','airsoft-milsim','k9-dog-gear','patriotic-american-heritage','art',
  'zippos-lighters-torches','watches','armored-vehicles','child-safety-shop','thin-line',
  'sta-brite-insignia','products-built-for-the-line-u-s-army','army-national-guard-series',
  'products-built-for-the-line-u-s-air-force','air-national-guard-series',
  'products-built-for-the-line-u-s-navy','products-built-for-the-line-u-s-marine-corps',
  'products-built-for-the-line-u-s-coast-guard','products-built-for-the-line-u-s-space-force',
  'rotc-series','jrotc-series','military-schools-academies','stateside-quartermaster-logo-merch',
  'law-enforcement-corrections-shop','firefighting-ems-search-rescue-shop','state-guard-series',
  'custom-personalized-products'
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

const focused = [
  {
    name: 'Air Force Badge Bundles',
    start: '/collections/sta-brite-air-force?filter.v.availability=1&sort_by=title-ascending&sq_root=sta-brite-insignia',
    label: 'Air Force Badge Bundles',
    expectedPath: '/collections/sta-brite-air-force/sq-type-air-force-badge-bundles',
    expectedProducts: 7,
    forbidden: /patch/i
  },
  {
    name: 'Air Force Cap Devices',
    start: '/collections/sta-brite-air-force?filter.v.availability=1&sort_by=title-ascending&sq_root=sta-brite-insignia',
    label: 'Air Force Cap Devices',
    expectedPath: '/collections/sta-brite-air-force/sq-type-air-force-cap-devices'
  },
  {
    name: 'Air Force Beret Flashes',
    start: '/collections/sta-brite-air-force?filter.v.availability=1&sort_by=title-ascending&sq_root=sta-brite-insignia',
    label: 'Air Force Beret Flashes',
    expectedPath: '/collections/sta-brite-air-force/sq-type-air-force-beret-flashes'
  }
];

function previewUrl(relative) {
  const u = new URL(relative, base);
  u.searchParams.set('preview_theme_id', previewThemeId);
  return u.toString();
}
function safeName(s) {
  return s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}
async function gotoWithRetry(page, url, attempts = 4) {
  let response = null;
  for (let i = 0; i < attempts; i++) {
    try { response = await page.goto(url, { waitUntil:'domcontentloaded', timeout:60000 }); } catch (_) { response = null; }
    const status = response ? response.status() : null;
    if (status !== 429 && status != null && status < 500) return response;
    await sleep(Math.min(30000, 3500 * Math.pow(2, i)));
  }
  return response;
}
async function waitForRail(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.locator('[data-sq-collection-rail]').waitFor({ state: 'attached', timeout: 25000 });
  await page.waitForTimeout(1800);
}
async function productTitles(page) {
  return await page.locator('main a[href*="/products/"]').evaluateAll(as => {
    const seen = new Set();
    const out = [];
    for (const a of as) {
      const href = a.getAttribute('href') || '';
      if (!href || seen.has(href)) continue;
      seen.add(href);
      const text = (a.textContent || '').replace(/\s+/g,' ').trim();
      if (text) out.push(text);
    }
    return out;
  });
}

(async() => {
  const browser = await chromium.launch({ headless: true });
  const modes = [
    { name:'desktop', viewport:{ width:1440, height:1000 } },
    { name:'mobile', viewport:{ width:390, height:844 } }
  ];
  const report = {
    startedAt: new Date().toISOString(),
    base,
    previewThemeId,
    modes: {},
    summary: { roots: roots.length, rootPagesChecked:0, brokenLinks:0, residualProductTypeLinks:0, focusedFailures:0, consoleErrors:0 }
  };
  let failed = false;

  for (const mode of modes) {
    const context = await browser.newContext({
      viewport: mode.viewport,
      recordVideo: { dir:path.join(outDir,'videos'), size:mode.viewport }
    });
    await context.route('**/*', route => {
      const req = route.request();
      const type = req.resourceType();
      const url = req.url();
      if (['image','font','media'].includes(type) || /web-pixels-manager|monorail|shopifycloud\/storefront-renderer\/assets\/.*\.map/i.test(url)) return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', err => consoleErrors.push(String(err)));
    const modeReport = { roots:[], focused:[], consoleErrors };
    report.modes[mode.name] = modeReport;

    for (const test of focused) {
      const item = { name:test.name, start:test.start, expectedPath:test.expectedPath, pass:false };
      try {
        const startResponse = await gotoWithRetry(page, previewUrl(test.start));
        item.startStatus = startResponse ? startResponse.status() : null;
        await waitForRail(page);
        const candidate = page.locator('[data-sq-collection-rail] a[href]', { hasText:test.label }).first();
        await candidate.waitFor({ state:'attached', timeout:20000 });
        await page.waitForTimeout(1200);
        item.sidebarHref = await candidate.getAttribute('href');
        const hrefUrl = new URL(item.sidebarHref, base);
        item.resolverApplied = !hrefUrl.searchParams.has('filter.p.product_type') && hrefUrl.pathname === test.expectedPath;
        const destResponse = await gotoWithRetry(page, previewUrl(hrefUrl.pathname + hrefUrl.search));
        item.destinationStatus = destResponse ? destResponse.status() : null;
        await page.waitForTimeout(1200);
        item.destinationUrl = page.url();
        item.destinationPath = new URL(item.destinationUrl).pathname;
        item.productTitles = await productTitles(page);
        item.productLinkCount = item.productTitles.length;
        item.pathPass = item.destinationPath === test.expectedPath;
        item.countPass = test.expectedProducts == null ? true : item.productLinkCount === test.expectedProducts;
        item.forbiddenPass = test.forbidden ? !item.productTitles.some(t => test.forbidden.test(t)) : true;
        item.pass = item.resolverApplied && item.pathPass && item.countPass && item.forbiddenPass && item.startStatus !== 429 && item.destinationStatus !== 429;
        await page.screenshot({ path:path.join(outDir,'screenshots',mode.name+'-'+safeName(test.name)+'.png'), fullPage:true });
      } catch (err) { item.error = String(err); }
      if (!item.pass) { failed = true; report.summary.focusedFailures++; }
      modeReport.focused.push(item);
      await sleep(2500);
    }

    for (const root of roots) {
      const url = previewUrl('/collections/' + root + '?filter.v.availability=1');
      const item = { root, url, status:null, anchors:0, residualProductTypeLinks:[], malformed:[], repaired:[] };
      try {
        const response = await gotoWithRetry(page, url);
        item.status = response ? response.status() : null;
        await waitForRail(page);
        const links = await page.locator('[data-sq-collection-rail] a[href]').evaluateAll(as => as.map(a => ({
          href:a.href,
          text:(a.textContent||'').replace(/\s+/g,' ').trim(),
          repaired:a.getAttribute('data-sq-route-repaired')||''
        })));
        item.anchors = links.length;
        item.residualProductTypeLinks = links.filter(x => x.href.includes('filter.p.product_type='));
        item.malformed = links.filter(x => !/^https?:\/\//.test(x.href) || /(?:undefined|null|javascript:)/i.test(x.href));
        item.repaired = links.filter(x => x.repaired === 'product-type-tag');
        if ((item.status && item.status >= 400) || item.residualProductTypeLinks.length || item.malformed.length) {
          failed = true;
          report.summary.brokenLinks += item.malformed.length + ((item.status && item.status >= 400) ? 1 : 0);
          report.summary.residualProductTypeLinks += item.residualProductTypeLinks.length;
        }
      } catch (err) {
        item.error = String(err);
        failed = true;
        report.summary.brokenLinks++;
      }
      modeReport.roots.push(item);
      report.summary.rootPagesChecked++;
      await sleep(2500);
    }

    if (false) for (const test of focused) {
      const item = { name:test.name, start:test.start, expectedPath:test.expectedPath, pass:false };
      try {
        await page.goto(previewUrl(test.start), { waitUntil:'domcontentloaded', timeout:45000 });
        await waitForRail(page);
        const candidate = page.locator('[data-sq-collection-rail] a[href]', { hasText:test.label }).first();
        await candidate.waitFor({ state:'attached', timeout:15000 });
        item.sidebarHref = await candidate.getAttribute('href');
        const hrefUrl = new URL(item.sidebarHref, base);
        item.resolverApplied = !hrefUrl.searchParams.has('filter.p.product_type') && hrefUrl.pathname === test.expectedPath;
        await page.goto(previewUrl(hrefUrl.pathname + hrefUrl.search), { waitUntil:'domcontentloaded', timeout:45000 });
        await page.waitForTimeout(1000);
        item.destinationUrl = page.url();
        item.destinationPath = new URL(item.destinationUrl).pathname;
        item.productTitles = await productTitles(page);
        item.productLinkCount = item.productTitles.length;
        item.pathPass = item.destinationPath === test.expectedPath;
        item.countPass = test.expectedProducts == null ? true : item.productLinkCount === test.expectedProducts;
        item.forbiddenPass = test.forbidden ? !item.productTitles.some(t => test.forbidden.test(t)) : true;
        item.pass = item.resolverApplied && item.pathPass && item.countPass && item.forbiddenPass;
        await page.screenshot({ path:path.join(outDir,'screenshots',mode.name+'-'+safeName(test.name)+'.png'), fullPage:true });
      } catch (err) {
        item.error = String(err);
      }
      if (!item.pass) { failed = true; report.summary.focusedFailures++; }
      modeReport.focused.push(item);
    }

    report.summary.consoleErrors += consoleErrors.filter(x => !/429|web-pixels|favicon|Content Security Policy/i.test(x)).length;
    await context.close();
  }

  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(outDir,'sidebar-audit.json'), JSON.stringify(report,null,2));
  fs.writeFileSync(path.join(outDir,'sidebar-audit-summary.md'),
    '# Stateside Quartermaster Sidebar Routing Audit\n\n' +
    '- Preview theme: ' + previewThemeId + '\n' +
    '- Root pages checked: ' + report.summary.rootPagesChecked + '\n' +
    '- Residual product-type links: ' + report.summary.residualProductTypeLinks + '\n' +
    '- Malformed/status failures: ' + report.summary.brokenLinks + '\n' +
    '- Focused routing failures: ' + report.summary.focusedFailures + '\n' +
    '- Console/page errors observed: ' + report.summary.consoleErrors + '\n' +
    '- Result: ' + (failed ? 'FAIL' : 'PASS') + '\n'
  );
  await browser.close();
  if (failed) process.exitCode = 1;
})().catch(err => {
  console.error(err);
  process.exit(1);
});