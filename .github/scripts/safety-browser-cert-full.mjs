import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://www.statesideqm.com/collections/safety-rescue-climbing?preview_theme_id=158561894555';
const OUT = process.env.OUT_DIR || 'out/safety-browser-cert';
fs.mkdirSync(OUT, { recursive: true });

const cases = [
  { name: 'desktop', viewport: { width: 1440, height: 1000 }, expectedCols: 3 },
  { name: 'mobile', viewport: { width: 390, height: 844 }, expectedCols: 2 }
];

const report = {
  target: BASE,
  expectedThemeId: '158561894555',
  generatedAt: new Date().toISOString(),
  cases: [],
  failures: []
};

function fail(bucket, message, details = null) {
  const item = details == null ? message : `${message}: ${JSON.stringify(details)}`;
  bucket.failures.push(item);
  report.failures.push(`${bucket.name}: ${item}`);
}

function platformNoise(entry) {
  const text = `${entry.text || ''} ${entry.url || ''}`.toLowerCase();
  if (text.includes('statesideqm.com')) return false;
  return text.includes('shop.app') ||
    text.includes('shopifycloud.com') ||
    text.includes('cdn.shopify.com') ||
    text.includes('shopify.com') ||
    text.includes('google-analytics.com') ||
    text.includes('doubleclick.net');
}

async function installFlashProbe(page) {
  await page.addInitScript(() => {
    window.__sqSafetyFlashEvents = [];
    let lastSignature = '';
    const visible = (el) => {
      if (!el) return false;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity || 1) !== 0 && r.width > 2 && r.height > 2;
    };
    const scan = () => {
      const main = document.getElementById('MainContent');
      if (!main) return;
      const results = main.querySelector('.sq-refine-v3-results');
      const grids = [...main.querySelectorAll('.product-grid')].filter(visible);
      const outside = grids.filter(g => !results || !results.contains(g));
      if (!outside.length) return;
      const signature = `${location.pathname}${location.search}|${outside.length}|${grids.length}`;
      if (signature === lastSignature) return;
      lastSignature = signature;
      window.__sqSafetyFlashEvents.push({
        t: Math.round(performance.now()),
        url: location.href,
        visibleGrids: grids.length,
        visibleOutsideResults: outside.length
      });
      if (window.__sqSafetyFlashEvents.length > 20) window.__sqSafetyFlashEvents.shift();
    };
    const loop = () => { try { scan(); } catch (_) {} requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
}

async function waitReady(page) {
  await page.waitForSelector('#MainContent', { timeout: 60000 });
  await page.waitForFunction(() => document.getElementById('MainContent')?.dataset.sqRefineV3Ready === 'true', null, { timeout: 60000 });
  await page.waitForFunction(() => window.__sqUniformColor?.ready === true, null, { timeout: 60000 });
  await page.waitForSelector('.sq-refine-v3-sidebar [data-sq-ucp-group] input[data-sq-ucp-value]', { timeout: 60000 });
  await page.waitForTimeout(750);
}

async function snapshot(page) {
  return page.evaluate(() => {
    const visible = (el) => {
      if (!el) return false;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity || 1) !== 0 && r.width > 2 && r.height > 2;
    };
    const main = document.getElementById('MainContent');
    const sidebar = main?.querySelector('.sq-refine-v3-sidebar');
    const results = main?.querySelector('.sq-refine-v3-results');
    const summaries = [...(sidebar?.querySelectorAll('details > summary') || [])].map(x => x.textContent.replace(/\s+/g, ' ').trim());
    const exactColorSummaries = summaries.filter(x => x === 'Shop by Color / Pattern');
    const colorGroups = [...(sidebar?.querySelectorAll('[data-sq-ucp-group]') || [])];
    const choices = colorGroups[0] ? [...colorGroups[0].querySelectorAll('input[data-sq-ucp-value]')].map(input => ({
      value: input.value,
      checked: input.checked,
      label: input.closest('label')?.querySelector('span')?.textContent?.trim() || '',
      countText: input.closest('label')?.querySelector('.sq-ucp-count')?.textContent?.trim() || ''
    })) : [];
    const allGrids = [...(main?.querySelectorAll('.product-grid') || [])];
    const visibleGrids = allGrids.filter(visible);
    const outsideVisible = visibleGrids.filter(g => !results?.contains(g));
    const insideVisible = visibleGrids.filter(g => results?.contains(g));
    const authoritative = results?.querySelector('[data-sq-ucp-results] .product-grid') || results?.querySelector('.product-grid');
    const gridStyle = authoritative ? getComputedStyle(authoritative) : null;
    const cols = gridStyle ? gridStyle.gridTemplateColumns.split(' ').filter(Boolean).length : 0;
    const filteredCards = [...(results?.querySelectorAll('[data-sq-ucp-results] [data-product-id]') || [])].filter(visible);
    const normalCards = [...(results?.querySelectorAll('.product-grid > li, .product-grid product-card') || [])].filter(visible);
    const sizeInputs = [...(main?.querySelectorAll('input[name="sq_per_page_control"]') || [])].map(x => ({ value: x.value, checked: x.checked }));
    const pager = results?.querySelector('[data-sq-ucp-results] .sq-refine-v3-pager') || main?.querySelector('.sq-refine-v3-pager');
    const pagerLinks = [...(pager?.querySelectorAll('a') || [])].map(a => ({ text: a.textContent.trim(), href: a.href }));
    const theme = window.Shopify?.theme || null;
    return {
      url: location.href,
      theme: theme ? { id: String(theme.id || ''), role: String(theme.role || '') } : null,
      refineReady: main?.dataset.sqRefineV3Ready || null,
      colorReady: !!window.__sqUniformColor?.ready,
      summaryCount: exactColorSummaries.length,
      colorGroupCount: colorGroups.length,
      choices,
      api: window.__sqUniformColor ? {
        version: window.__sqUniformColor.version,
        total: window.__sqUniformColor.total,
        matches: window.__sqUniformColor.matches,
        page: window.__sqUniformColor.page,
        pageSize: window.__sqUniformColor.pageSize,
        choices: window.__sqUniformColor.choices,
        resultIds: (window.__sqUniformColor.resultIds || []).map(String)
      } : null,
      visibleGridCount: visibleGrids.length,
      visibleInsideGridCount: insideVisible.length,
      visibleOutsideGridCount: outsideVisible.length,
      columns: cols,
      filteredProductIds: filteredCards.map(x => String(x.dataset.productId || '')),
      filteredProductCount: filteredCards.length,
      normalProductCount: normalCards.length,
      pageSizes: sizeInputs,
      pagerLinks,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      sidebarRight: sidebar ? Math.round(sidebar.getBoundingClientRect().right) : null,
      viewportWidth: window.innerWidth,
      sqRoot: new URL(location.href).searchParams.get('sq_root'),
      sqUcp: new URL(location.href).searchParams.getAll('sq_ucp'),
      sqPerPage: new URL(location.href).searchParams.get('sq_per_page'),
      sqViewPage: new URL(location.href).searchParams.get('sq_view_page'),
      flashEvents: window.__sqSafetyFlashEvents || []
    };
  });
}

function verifyBase(bucket, state, expectedCols, phase) {
  if (state.theme?.id && state.theme.id !== report.expectedThemeId) fail(bucket, `${phase} wrong Shopify theme id`, state.theme);
  if (state.theme?.role === 'main') fail(bucket, `${phase} unexpectedly reports MAIN/live theme`, state.theme);
  if (state.refineReady !== 'true' || !state.colorReady) fail(bucket, `${phase} V3/color code not ready`);
  if (state.summaryCount !== 1) fail(bucket, `${phase} Shop by Color / Pattern summary count != 1`, state.summaryCount);
  if (state.colorGroupCount !== 1) fail(bucket, `${phase} color group count != 1`, state.colorGroupCount);
  if (!state.choices.length) fail(bucket, `${phase} color choices did not populate`);
  if (state.visibleOutsideGridCount !== 0) fail(bucket, `${phase} legacy/duplicate visible grids outside V3 results`, state.visibleOutsideGridCount);
  if (state.visibleInsideGridCount !== 1) fail(bucket, `${phase} expected exactly one visible product grid inside V3 results`, state.visibleInsideGridCount);
  if (state.columns !== expectedCols) fail(bucket, `${phase} wrong product grid columns`, { got: state.columns, expected: expectedCols });
  if (state.horizontalOverflow) fail(bucket, `${phase} horizontal overflow detected`);
  if (state.sqRoot === 'uniforms') fail(bucket, `${phase} leaked sq_root=uniforms`);
  const sizes = state.pageSizes.map(x => x.value).sort();
  if (JSON.stringify(sizes) !== JSON.stringify(['100','250','50'])) fail(bucket, `${phase} page-size choices are not exactly 50/100/250`, sizes);
  if (state.flashEvents.length) fail(bucket, `${phase} visible grid flash/legacy surface detected`, state.flashEvents);
}

async function inspectPhase(page, bucket, expectedCols, phase) {
  const state = await snapshot(page);
  bucket.phases[phase] = state;
  verifyBase(bucket, state, expectedCols, phase);
  await page.screenshot({ path: path.join(OUT, `${bucket.name}-${phase}.png`), fullPage: true });
  return state;
}

async function runCase(browser, spec) {
  const context = await browser.newContext({ viewport: spec.viewport });
  const page = await context.newPage();
  const bucket = { name: spec.name, viewport: spec.viewport, phases: {}, consoleErrors: [], platformConsoleNoise: [], pageErrors: [], failures: [] };
  report.cases.push(bucket);
  await installFlashProbe(page);
  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    const loc = msg.location ? msg.location() : {};
    const entry = { text: msg.text(), url: loc?.url || '', line: loc?.lineNumber ?? null, page: page.url() };
    (platformNoise(entry) ? bucket.platformConsoleNoise : bucket.consoleErrors).push(entry);
  });
  page.on('pageerror', err => bucket.pageErrors.push({ message: err.message, page: page.url() }));

  try {
    const response = await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90000 });
    bucket.httpStatus = response?.status() ?? null;
    if (!response || response.status() >= 400) fail(bucket, 'initial HTTP failure', bucket.httpStatus);
    await waitReady(page);
    const initial = await inspectPhase(page, bucket, spec.expectedCols, 'initial');
    if (!initial.normalProductCount) fail(bucket, 'initial product grid rendered no visible products');

    const apiChoices = initial.api?.choices || [];
    const choice = [...apiChoices].filter(x => Number(x.count) > 0).sort((a,b) => Number(b.count) - Number(a.count))[0];
    if (!choice) throw new Error('No populated Color / Pattern choice was available for interaction testing');
    bucket.selectedChoice = choice;

    const selector = `[data-sq-ucp-group] input[data-sq-ucp-value="${CSS.escape(choice.value)}"]`;
    const input = page.locator(selector).first();
    await input.scrollIntoViewIfNeeded();
    await Promise.all([
      page.waitForURL(u => u.searchParams.getAll('sq_ucp').includes(choice.value), { timeout: 30000 }),
      input.check()
    ]);
    await waitReady(page);
    const selected = await inspectPhase(page, bucket, spec.expectedCols, 'selected');
    if (!selected.sqUcp.includes(choice.value)) fail(bucket, 'selected phase URL missing sq_ucp', selected.sqUcp);
    if (!selected.choices.find(x => x.value === choice.value)?.checked) fail(bucket, 'selected checkbox did not remain checked');
    if (!(Number(selected.api?.matches) > 0)) fail(bucket, 'selected color returned no matches', selected.api?.matches);
    if (JSON.stringify(selected.filteredProductIds) !== JSON.stringify(selected.api?.resultIds || [])) fail(bucket, 'filtered rendered product IDs do not equal filter API result IDs', { rendered: selected.filteredProductIds, expected: selected.api?.resultIds });
    if (!selected.filteredProductCount) fail(bucket, 'selected color rendered no matching product cards');

    bucket.pagination = { tested: false, reason: null };
    if (Number(selected.api?.matches) > Number(selected.api?.pageSize || 50)) {
      const next = page.locator('[data-sq-ucp-results] .sq-refine-v3-pager a').filter({ hasText: /^Next$/i }).first();
      if (await next.count()) {
        await Promise.all([
          page.waitForURL(u => u.searchParams.get('sq_view_page') === '2', { timeout: 30000 }),
          next.click()
        ]);
        await waitReady(page);
        const page2 = await inspectPhase(page, bucket, spec.expectedCols, 'page2');
        bucket.pagination.tested = true;
        if (String(page2.api?.page) !== '2') fail(bucket, 'pagination did not move API to page 2', page2.api?.page);
        if (JSON.stringify(page2.filteredProductIds) !== JSON.stringify(page2.api?.resultIds || [])) fail(bucket, 'page 2 rendered IDs do not equal API result IDs');
      } else {
        fail(bucket, 'pagination should have Next link but none was rendered', { matches: selected.api?.matches, pageSize: selected.api?.pageSize });
      }
    } else {
      bucket.pagination.reason = `Not applicable: ${selected.api?.matches || 0} matching products <= ${selected.api?.pageSize || 50} per page; pager correctly need not expose Next.`;
    }

    const size100 = page.locator('input[name="sq_per_page_control"][value="100"]').first();
    await size100.scrollIntoViewIfNeeded();
    await Promise.all([
      page.waitForURL(u => u.searchParams.get('sq_per_page') === '100' && u.searchParams.get('sq_view_page') === '1', { timeout: 30000 }),
      size100.check()
    ]);
    await waitReady(page);
    const sizeState = await inspectPhase(page, bucket, spec.expectedCols, 'page-size-100');
    if (String(sizeState.api?.pageSize) !== '100') fail(bucket, 'page-size control did not update filter API to 100', sizeState.api?.pageSize);
    if (!sizeState.pageSizes.find(x => x.value === '100')?.checked) fail(bucket, '100 page-size radio did not remain checked');
    if (JSON.stringify(sizeState.filteredProductIds) !== JSON.stringify(sizeState.api?.resultIds || [])) fail(bucket, 'page-size-100 rendered IDs do not equal API result IDs');

    const clearBox = page.locator(`[data-sq-ucp-group] input[data-sq-ucp-value="${CSS.escape(choice.value)}"]`).first();
    await clearBox.scrollIntoViewIfNeeded();
    await Promise.all([
      page.waitForURL(u => !u.searchParams.has('sq_ucp'), { timeout: 30000 }),
      clearBox.uncheck()
    ]);
    await waitReady(page);
    const cleared = await inspectPhase(page, bucket, spec.expectedCols, 'cleared');
    if (cleared.sqUcp.length) fail(bucket, 'clear left sq_ucp in URL', cleared.sqUcp);
    if (cleared.choices.some(x => x.checked)) fail(bucket, 'clear left a Color / Pattern checkbox checked', cleared.choices.filter(x => x.checked));
    if (!cleared.normalProductCount) fail(bucket, 'clear did not restore visible normal products');

    if (bucket.consoleErrors.length) fail(bucket, 'browser console errors from storefront implementation', bucket.consoleErrors);
    if (bucket.pageErrors.length) fail(bucket, 'browser page/runtime errors', bucket.pageErrors);
  } catch (err) {
    fail(bucket, 'uncaught certification error', err?.stack || String(err));
    try { await page.screenshot({ path: path.join(OUT, `${bucket.name}-failure.png`), fullPage: true }); } catch (_) {}
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
for (const spec of cases) await runCase(browser, spec);
await browser.close();

report.passed = report.failures.length === 0;
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 2;
