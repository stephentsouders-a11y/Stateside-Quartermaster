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

function previewUrl(relative) {
  const u = new URL(relative, base);
  u.searchParams.set('preview_theme_id', previewThemeId);
  return u.toString();
}
function stripAuditParams(raw) {
  const u = new URL(raw, base);
  ['preview_theme_id','sq_audit','sq_opera_audit'].forEach(k => u.searchParams.delete(k));
  u.hash = '';
  return u.pathname + (u.search ? u.search : '');
}
function safeName(s) {
  return String(s || 'route').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 140);
}
function lastRouteLabel(url) {
  const u = new URL(url, base);
  return u.searchParams.get('sg_component') || u.searchParams.get('sq_bfl_type') ||
    u.searchParams.get('sg_type') || u.searchParams.get('sq_bfl_subcategory') ||
    u.searchParams.get('sg_category') || u.searchParams.get('sq_bfl_category') || '';
}
async function gotoWithRetry(page, url, attempts = 5) {
  let response = null;
  let lastError = null;
  for (let i = 0; i < attempts; i++) {
    try {
      response = await page.goto(url, { waitUntil:'domcontentloaded', timeout:75000 });
      const status = response ? response.status() : null;
      if (status !== 429 && status != null && status < 500) return response;
    } catch (err) {
      lastError = err;
      response = null;
    }
    await sleep(Math.min(30000, 2500 * Math.pow(2, i)));
  }
  if (!response && lastError) throw lastError;
  return response;
}
async function waitForRail(page) {
  await page.locator('[data-sq-collection-rail]').waitFor({ state:'attached', timeout:30000 });
  await page.waitForTimeout(700);
}
async function waitForTreeApi(page) {
  try {
    await page.waitForFunction(() => {
      const rail = document.querySelector('[data-sq-collection-rail]');
      if (!rail) return false;
      const api = window.__sqSidebarTreeDataApi;
      if (api && api.categoryList) return true;
      const cats = rail.querySelectorAll('[data-sq-context-categories-list] a[href]');
      return cats.length > 0;
    }, { timeout:90000 });
  } catch (_) {}
  await page.waitForTimeout(400);
}
async function collectTreeInventory(page, root) {
  await waitForRail(page);
  await waitForTreeApi(page);
  return page.evaluate(async rootHandle => {
    const rail = document.querySelector('[data-sq-collection-rail]');
    const api = window.__sqSidebarTreeDataApi;
    const rows = [];
    const seen = new Set();
    const pause = ms => new Promise(r => setTimeout(r, ms));
    const add = (level, label, href, parent) => {
      if (!href) return;
      const u = new URL(href, location.origin);
      ['preview_theme_id','sq_audit','sq_opera_audit'].forEach(k => u.searchParams.delete(k));
      u.hash = '';
      const key = level + '|' + (label || '') + '|' + u.pathname + u.search;
      if (seen.has(key)) return;
      seen.add(key);
      rows.push({ root:rootHandle, level, label:(label || '').trim(), href:u.pathname + u.search, parent:parent || '' });
    };
    const snapshot = list => !list ? [] : Array.from(list.querySelectorAll('a[href]')).map(a => ({
      href:a.href,
      label:(a.textContent || '').replace(/\s+/g,' ').trim(),
      kind:a.dataset.sqCascadeKind || ''
    }));
    const find = (list, href) => !list ? null : Array.from(list.querySelectorAll('a[href]')).find(a => a.href === href) || null;

    const shopAll = rail && rail.querySelector('a[href][data-sq-shop-all], a[href]');
    if (shopAll && /Shop All/i.test((shopAll.textContent || '').trim())) add('shop-all', 'Shop All', shopAll.href, '');

    if (!api || !api.categoryList) {
      const anchors = rail ? Array.from(rail.querySelectorAll('a[href]')) : [];
      anchors.forEach(a => add('static', (a.textContent || '').replace(/\s+/g,' ').trim(), a.href, ''));
      return rows;
    }

    let categories = snapshot(api.categoryList);
    if (!categories.length && window.__sqBflSidebarApi && window.__sqBflSidebarApi.ready) {
      try { await Promise.race([window.__sqBflSidebarApi.ready, pause(90000)]); } catch (_) {}
      await pause(250);
      categories = snapshot(api.categoryList);
    }

    for (const cat of categories) {
      add('category', cat.label, cat.href, '');
      const liveCat = find(api.categoryList, cat.href);
      if (!liveCat || typeof api.activateCategory !== 'function') continue;
      try { await Promise.resolve(api.activateCategory(liveCat)); } catch (_) {}
      await pause(120);
      const subs = snapshot(api.subcategoryList);
      for (const sub of subs) {
        add(sub.kind === 'type' ? 'type' : 'subcategory', sub.label, sub.href, cat.label);
        if (sub.kind !== 'subcategory' || typeof api.activateSubcategory !== 'function') continue;
        const liveSub = find(api.subcategoryList, sub.href);
        if (!liveSub) continue;
        try { await Promise.resolve(api.activateSubcategory(liveSub)); } catch (_) {}
        await pause(100);
        const types = snapshot(api.typeList);
        types.forEach(type => add('type', type.label, type.href, cat.label + ' > ' + sub.label));
      }
    }
    return rows;
  }, root);
}
async function visibleProductLinks(page) {
  return page.locator('main a[href*="/products/"]:visible').evaluateAll(as => {
    const seen = new Set();
    return as.map(a => ({ href:a.getAttribute('href') || '', text:(a.textContent || '').replace(/\s+/g,' ').trim() }))
      .filter(x => x.href && !seen.has(x.href) && seen.add(x.href));
  });
}
async function validateDestination(page, row) {
  const item = { ...row, pass:false, status:null, finalUrl:null, productCount:0, heading:'', reason:'' };
  const target = previewUrl(row.href);
  let response;
  try { response = await gotoWithRetry(page, target); }
  catch (err) { item.reason = 'navigation-error: ' + String(err); return item; }
  item.status = response ? response.status() : null;
  if (item.status == null || item.status >= 400) { item.reason = 'http-status-' + item.status; return item; }
  await page.waitForTimeout(350);
  item.finalUrl = stripAuditParams(page.url());
  if (/filter\.p\.product_type=/.test(item.finalUrl)) { item.reason = 'residual-product-type-filter'; return item; }
  if (/undefined|null|javascript:/i.test(item.finalUrl)) { item.reason = 'malformed-destination'; return item; }

  const u = new URL(page.url());
  const isBfl = ['sq_bfl_category','sq_bfl_subcategory','sq_bfl_type'].some(k => u.searchParams.has(k));
  const isState = ['sg_category','sg_type','sg_component'].some(k => u.searchParams.has(k));
  const isSqTypeTag = /\/sq-type-[^/?#]+/i.test(u.pathname);

  if (isBfl) {
    try { await page.locator('main .sqbfl').waitFor({ state:'visible', timeout:90000 }); } catch (_) {}
  }
  if (isState) {
    try { await page.locator('main [data-sq-sg-route-surface]').waitFor({ state:'visible', timeout:90000 }); } catch (_) {}
  }
  if (isSqTypeTag) {
    try { await page.locator('main a[href*="/products/"]').first().waitFor({ state:'attached', timeout:25000 }); } catch (_) {}
  }
  await page.waitForTimeout(250);

  const products = await visibleProductLinks(page);
  item.productCount = products.length;
  item.sampleProducts = products.slice(0, 12).map(x => x.text);
  item.heading = await page.locator('main h1, main h2').filter({ visible:true }).first().textContent().catch(() => '') || '';
  item.heading = item.heading.replace(/\s+/g,' ').trim();

  if (isBfl || isState) {
    if (!item.productCount) { item.reason = 'routed-destination-has-zero-products'; return item; }
    const expected = lastRouteLabel(page.url());
    if (expected) {
      const norm = s => decodeURIComponent(String(s || '')).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
      const h = norm(item.heading), e = norm(expected), l = norm(row.label);
      if (h && e && !h.includes(e) && l && !h.includes(l)) { item.reason = 'route-heading-mismatch'; return item; }
    }
  } else if (isSqTypeTag) {
    if (!item.productCount) { item.reason = 'tag-destination-has-zero-products'; return item; }
    const slug = u.pathname.split('/').filter(Boolean).pop() || '';
    const expectedSlug = 'sq-type-' + row.label.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    if (slug !== expectedSlug) { item.reason = 'sq-type-label-route-mismatch'; return item; }
  } else {
    const mainText = await page.locator('main').innerText().catch(() => '');
    const collectionLinks = await page.locator('main a[href*="/collections/"]').count().catch(() => 0);
    if (!mainText.trim() && !item.productCount && !collectionLinks) { item.reason = 'blank-main-content'; return item; }
  }

  item.pass = true;
  return item;
}

(async() => {
  const browser = await chromium.launch({ headless:true });
  const context = await browser.newContext({
    viewport:{ width:1440, height:1000 },
    recordVideo:{ dir:path.join(outDir,'videos'), size:{ width:1440, height:1000 } }
  });
  await context.route('**/*', route => {
    const req = route.request();
    const type = req.resourceType();
    const url = req.url();
    if (['image','font','media'].includes(type) || /web-pixels-manager|monorail|facebook|doubleclick|google-analytics|googletagmanager/i.test(url)) return route.abort();
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const consoleErrors = [];
  page.on('pageerror', err => consoleErrors.push(String(err)));
  page.on('console', msg => { if (msg.type() === 'error' && !/429|web-pixels|favicon|Content Security Policy/i.test(msg.text())) consoleErrors.push(msg.text()); });

  const report = {
    startedAt:new Date().toISOString(),
    previewThemeId,
    roots:[],
    inventory:[],
    destinations:[],
    summary:{ rootCount:roots.length, rootsLoaded:0, inventoryLinks:0, uniqueDestinations:0, passed:0, failed:0, residualProductTypeLinks:0, consoleErrors:0 }
  };

  for (const root of roots) {
    const rec = { root, status:null, links:0, error:null };
    try {
      const response = await gotoWithRetry(page, previewUrl('/collections/' + root + '?filter.v.availability=1&sq_audit=inventory'));
      rec.status = response ? response.status() : null;
      const rows = await collectTreeInventory(page, root);
      rec.links = rows.length;
      report.inventory.push(...rows);
      if (rows.some(x => /filter\.p\.product_type=/.test(x.href))) report.summary.residualProductTypeLinks += rows.filter(x => /filter\.p\.product_type=/.test(x.href)).length;
      report.summary.rootsLoaded++;
    } catch (err) {
      rec.error = String(err);
    }
    report.roots.push(rec);
    await sleep(600);
  }

  const deduped = [];
  const routeMap = new Map();
  for (const row of report.inventory) {
    const key = stripAuditParams(row.href);
    if (!routeMap.has(key)) {
      routeMap.set(key, row);
      deduped.push(row);
    }
  }
  report.summary.inventoryLinks = report.inventory.length;
  report.summary.uniqueDestinations = deduped.length;

  for (let i = 0; i < deduped.length; i++) {
    const row = deduped[i];
    const result = await validateDestination(page, row);
    report.destinations.push(result);
    if (result.pass) report.summary.passed++;
    else {
      report.summary.failed++;
      if (report.summary.failed <= 20) {
        await page.screenshot({ path:path.join(outDir,'screenshots','failure-'+String(report.summary.failed).padStart(3,'0')+'-'+safeName(row.root+'-'+row.label)+'.png'), fullPage:true }).catch(() => {});
      }
    }
    if ((i + 1) % 25 === 0) {
      fs.writeFileSync(path.join(outDir,'sidebar-audit-progress.json'), JSON.stringify({ completed:i+1, total:deduped.length, summary:report.summary }, null, 2));
    }
    await sleep(450);
  }

  report.summary.consoleErrors = consoleErrors.length;
  report.consoleErrors = consoleErrors.slice(0, 250);
  report.finishedAt = new Date().toISOString();
  const failures = report.destinations.filter(x => !x.pass);
  fs.writeFileSync(path.join(outDir,'sidebar-route-inventory.json'), JSON.stringify(report.inventory,null,2));
  fs.writeFileSync(path.join(outDir,'sidebar-audit.json'), JSON.stringify(report,null,2));
  fs.writeFileSync(path.join(outDir,'sidebar-audit-failures.json'), JSON.stringify(failures,null,2));
  fs.writeFileSync(path.join(outDir,'sidebar-audit-summary.md'),
    '# Stateside Quartermaster Exhaustive Sidebar Routing Audit\n\n' +
    '- Preview theme: ' + previewThemeId + '\n' +
    '- Root trees: ' + report.summary.rootCount + '\n' +
    '- Root trees loaded: ' + report.summary.rootsLoaded + '\n' +
    '- Tree links inventoried: ' + report.summary.inventoryLinks + '\n' +
    '- Unique destinations visited: ' + report.summary.uniqueDestinations + '\n' +
    '- Destination passes: ' + report.summary.passed + '\n' +
    '- Destination failures: ' + report.summary.failed + '\n' +
    '- Residual product-type links: ' + report.summary.residualProductTypeLinks + '\n' +
    '- Filtered console/page errors: ' + report.summary.consoleErrors + '\n' +
    '- Result: ' + (report.summary.failed || report.summary.residualProductTypeLinks ? 'FAIL' : 'PASS') + '\n'
  );
  await context.close();
  await browser.close();
  if (report.summary.failed || report.summary.residualProductTypeLinks) process.exitCode = 1;
})().catch(err => {
  console.error(err);
  process.exit(1);
});
