import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE_URL || 'https://www.statesideqm.com';
const THEME_ID = process.env.THEME_ID || '158900125851';
const STATE_GUARD_ROOT = process.env.STATE_GUARD_ROOT || '/collections/state-guard-series';
const OUT = 'sep18-fresh-load-audit';
const NAV_TIMEOUT = 70000;
const SETTLE_MS = 2200;

fs.mkdirSync(path.join(OUT, 'screenshots'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'videos'), { recursive: true });

const cleanRoute = (href) => {
  try {
    const u = new URL(href, BASE);
    if (u.origin !== new URL(BASE).origin) return null;
    u.searchParams.delete('preview_theme_id');
    u.hash = '';
    return u.pathname + (u.search ? u.search : '');
  } catch {
    return null;
  }
};

const previewUrl = (route) => {
  const u = new URL(route, BASE);
  u.searchParams.set('preview_theme_id', THEME_ID);
  return u.toString();
};

const slug = (s) => String(s || 'page').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
await context.addInitScript(() => {
  window.__sqPerf = { lcp: 0, cls: 0, longTaskMs: 0, longTaskCount: 0 };
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) window.__sqPerf.lcp = Math.max(window.__sqPerf.lcp, e.startTime || 0);
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__sqPerf.cls += e.value || 0;
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {}
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        window.__sqPerf.longTaskCount += 1;
        window.__sqPerf.longTaskMs += e.duration || 0;
      }
    }).observe({ type: 'longtask', buffered: true });
  } catch {}
});
const page = await context.newPage();
page.setDefaultNavigationTimeout(NAV_TIMEOUT);
page.setDefaultTimeout(25000);
const cdp = await context.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

const allErrors = [];
page.on('pageerror', e => allErrors.push({ type: 'pageerror', url: page.url(), message: String(e) }));
page.on('console', m => {
  if (m.type() === 'error') allErrors.push({ type: 'console', url: page.url(), message: m.text().slice(0, 1200) });
});

async function discoverButtons(route) {
  await page.goto(previewUrl(route), { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
  await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
  await sleep(1400);
  return await page.evaluate(({ base }) => {
    const main = document.getElementById('MainContent') || document.querySelector('main') || document.body;
    const visible = (el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && !el.hidden && r.width > 4 && r.height > 4;
    };
    const generic = /^(home|shop|cart|search|account|login|sign in|menu|close|previous|next|learn more)$/i;
    const rows = [];
    for (const a of main.querySelectorAll('a[href]')) {
      if (!visible(a)) continue;
      let u;
      try { u = new URL(a.href, base); } catch { continue; }
      if (u.origin !== new URL(base).origin) continue;
      if (!/^\/(collections|pages)\//.test(u.pathname)) continue;
      if (/\/products\//.test(u.pathname)) continue;
      u.searchParams.delete('preview_theme_id');
      const label = (a.getAttribute('aria-label') || a.textContent || a.querySelector('img')?.alt || '')
        .replace(/\s+/g, ' ').trim();
      if (!label || generic.test(label)) continue;
      const r = a.getBoundingClientRect();
      const cardLike = !!(
        a.querySelector('img,svg') ||
        a.matches('[class*="card"],[class*="button"],[class*="btn"],.sg-entity,[data-sq-state-guard-merch-feature] a') ||
        a.closest('[class*="card"],[class*="button"],[data-sq-state-guard-root]') ||
        r.width >= 150 || r.height >= 48
      );
      if (!cardLike) continue;
      rows.push({
        label: label.slice(0, 200),
        route: u.pathname + (u.search ? u.search : ''),
        width: Math.round(r.width),
        height: Math.round(r.height),
        className: String(a.className || '').slice(0, 240)
      });
    }
    const seen = new Set();
    return rows.filter(x => {
      const key = x.route;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, { base: BASE });
}

async function measure(route, meta) {
  const requestFailures = [];
  const failed = req => requestFailures.push({ url: req.url(), error: req.failure()?.errorText || 'failed' });
  page.on('requestfailed', failed);
  let response = null;
  let fatal = null;
  let attempts = 0;
  for (; attempts < 2; attempts++) {
    try {
      response = await page.goto(previewUrl(route), { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
      if (response?.status() !== 429) break;
      await sleep(9000);
    } catch (e) {
      fatal = String(e?.message || e);
      if (attempts === 0) await sleep(2500);
    }
  }
  await page.waitForLoadState('load', { timeout: 16000 }).catch(() => {});
  await sleep(SETTLE_MS);

  const status = response?.status() ?? null;
  const headers = response ? await response.allHeaders().catch(() => ({})) : {};
  const perf = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    let transferBytes = 0, encodedBytes = 0, decodedBytes = 0;
    const top = resources.map(r => ({
      name: r.name,
      initiatorType: r.initiatorType || 'other',
      durationMs: Math.round(r.duration || 0),
      transferBytes: r.transferSize || 0,
      encodedBytes: r.encodedBodySize || 0,
      decodedBytes: r.decodedBodySize || 0
    })).sort((a,b) => b.durationMs - a.durationMs).slice(0, 12);
    const byType = {};
    for (const r of resources) {
      transferBytes += r.transferSize || 0;
      encodedBytes += r.encodedBodySize || 0;
      decodedBytes += r.decodedBodySize || 0;
      byType[r.initiatorType || 'other'] = (byType[r.initiatorType || 'other'] || 0) + 1;
    }
    const imgs = [...document.images];
    return {
      title: document.title,
      h1: (document.querySelector('h1')?.textContent || '').replace(/\s+/g,' ').trim(),
      ttfbMs: Math.round(nav?.responseStart || 0),
      domInteractiveMs: Math.round(nav?.domInteractive || 0),
      dclMs: Math.round(nav?.domContentLoadedEventEnd || 0),
      loadMs: Math.round(nav?.loadEventEnd || 0),
      navDurationMs: Math.round(nav?.duration || 0),
      htmlTransferBytes: nav?.transferSize || 0,
      fcpMs: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0),
      lcpMs: Math.round(window.__sqPerf?.lcp || 0),
      cls: Number((window.__sqPerf?.cls || 0).toFixed(4)),
      longTaskMs: Math.round(window.__sqPerf?.longTaskMs || 0),
      longTaskCount: window.__sqPerf?.longTaskCount || 0,
      resources: resources.length,
      transferBytes,
      encodedBytes,
      decodedBytes,
      resourceTypes: byType,
      topResources: top,
      domNodes: document.getElementsByTagName('*').length,
      scripts: document.scripts.length,
      stylesheets: document.styleSheets.length,
      images: imgs.length,
      brokenImages: imgs.filter(i => i.complete && i.naturalWidth === 0).length,
      pendingImages: imgs.filter(i => !i.complete).length,
      scrollHeight: document.documentElement.scrollHeight,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 4
    };
  }).catch(e => ({ evaluateError: String(e) }));

  page.off('requestfailed', failed);
  const row = {
    route,
    ...meta,
    status,
    attempts: attempts + 1,
    fatal,
    serverTiming: headers['server-timing'] || '',
    cacheStatus: headers['x-cache'] || headers['cf-cache-status'] || '',
    requestFailures: requestFailures.slice(0, 25),
    ...perf
  };
  console.log('MEASURE', JSON.stringify({
    group: row.group, label: row.label, route,
    status, ttfbMs: row.ttfbMs, dclMs: row.dclMs, loadMs: row.loadMs,
    fcpMs: row.fcpMs, lcpMs: row.lcpMs, longTaskMs: row.longTaskMs,
    transferKB: Math.round((row.transferBytes || 0) / 1024),
    resources: row.resources, domNodes: row.domNodes, fatal
  }));
  return row;
}

function stateScope(route) {
  const p = String(route || '').toLowerCase();
  return p.startsWith(STATE_GUARD_ROOT) ||
    /state-guard|state-defense|defense-force|guard-reserve|naval-militia|military-reserve|civil-defense-force|state-militia|national-lancers/.test(p);
}

console.log('FRESH_AUDIT_START', JSON.stringify({ BASE, THEME_ID, STATE_GUARD_ROOT, generatedAt: new Date().toISOString() }));

const homeButtons = await discoverButtons('/');
fs.writeFileSync(path.join(OUT, 'homepage-buttons-current.json'), JSON.stringify({ count: homeButtons.length, buttons: homeButtons }, null, 2));
await page.screenshot({ path: path.join(OUT, 'screenshots', 'homepage-current.png'), fullPage: true }).catch(() => {});

const stateRootButtons = await discoverButtons(STATE_GUARD_ROOT);
fs.writeFileSync(path.join(OUT, 'state-guard-root-buttons-current.json'), JSON.stringify({ count: stateRootButtons.length, buttons: stateRootButtons }, null, 2));
await page.screenshot({ path: path.join(OUT, 'screenshots', 'state-guard-root-current.png'), fullPage: true }).catch(() => {});

const stateButtonMap = new Map();
const queue = [];
for (const b of stateRootButtons) {
  stateButtonMap.set(b.route, { ...b, source: STATE_GUARD_ROOT, depth: 1 });
  if (stateScope(b.route)) queue.push({ route: b.route, depth: 1 });
}
const crawled = new Set([STATE_GUARD_ROOT]);
while (queue.length && crawled.size < 140) {
  const item = queue.shift();
  if (crawled.has(item.route) || item.depth > 3) continue;
  crawled.add(item.route);
  let buttons = [];
  try { buttons = await discoverButtons(item.route); } catch (e) {
    console.log('DISCOVERY_ERROR', item.route, String(e?.message || e));
    continue;
  }
  for (const b of buttons) {
    if (!stateButtonMap.has(b.route)) stateButtonMap.set(b.route, { ...b, source: item.route, depth: item.depth + 1 });
    if (stateScope(b.route) && !crawled.has(b.route) && item.depth < 3) queue.push({ route: b.route, depth: item.depth + 1 });
  }
}

const stateButtons = [...stateButtonMap.values()];
fs.writeFileSync(path.join(OUT, 'state-guard-all-buttons-current.json'), JSON.stringify({
  root: STATE_GUARD_ROOT,
  rootCount: stateRootButtons.length,
  crawledStatePages: crawled.size,
  discoveredUniqueButtons: stateButtons.length,
  buttons: stateButtons
}, null, 2));

const routeMap = new Map();
for (const b of homeButtons) {
  if (!routeMap.has(b.route)) routeMap.set(b.route, { group: 'homepage', label: b.label, source: '/' });
}
for (const b of stateButtons) {
  if (!routeMap.has(b.route)) routeMap.set(b.route, { group: 'state-guard', label: b.label, source: b.source, depth: b.depth });
}
if (!routeMap.has(STATE_GUARD_ROOT)) routeMap.set(STATE_GUARD_ROOT, { group: 'state-guard', label: 'State Guard Series root', source: '/' });

const rows = [];
for (const [route, meta] of routeMap) {
  rows.push(await measure(route, meta));
  await sleep(650);
}

const thresholds = {
  ttfbMs: 1000,
  dclMs: 2500,
  loadMs: 4500,
  lcpMs: 4000,
  longTaskMs: 700,
  transferBytes: 4500000,
  resources: 180,
  domNodes: 4500
};
for (const r of rows) {
  r.flags = [];
  for (const [k,v] of Object.entries(thresholds)) if ((r[k] || 0) > v) r.flags.push(k + '>' + v);
  if (r.status !== 200) r.flags.push('http=' + r.status);
  if (r.fatal) r.flags.push('fatal');
  if (r.brokenImages) r.flags.push('brokenImages=' + r.brokenImages);
  if (r.requestFailures?.length) r.flags.push('requestFailures=' + r.requestFailures.length);
}

const score = r => (r.loadMs || r.dclMs || 0) + Math.max(0, (r.ttfbMs || 0) - 800) * 1.5 + (r.longTaskMs || 0) * 0.4;
const ranked = [...rows].sort((a,b) => score(b) - score(a));

for (let i = 0; i < Math.min(6, ranked.length); i++) {
  const r = ranked[i];
  const vctx = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
    recordVideo: { dir: path.join(OUT, 'videos'), size: { width: 1440, height: 1050 } }
  });
  const p = await vctx.newPage();
  try {
    await p.goto(previewUrl(r.route), { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    await p.waitForLoadState('load', { timeout: 16000 }).catch(() => {});
    await p.waitForTimeout(2500);
    await p.screenshot({
      path: path.join(OUT, 'screenshots', String(i + 1).padStart(2,'0') + '-slow-' + slug(r.label) + '.png'),
      fullPage: true
    });
    await p.evaluate(() => window.scrollTo(0, Math.floor(document.body.scrollHeight * 0.65)));
    await p.waitForTimeout(900);
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(700);
  } catch (e) {
    console.log('EVIDENCE_CAPTURE_ERROR', r.route, String(e?.message || e));
  }
  await p.close().catch(() => {});
  await vctx.close().catch(() => {});
}

await context.close();
await browser.close();

const avg = (arr, k) => arr.length ? Math.round(arr.reduce((s,x) => s + (x[k] || 0), 0) / arr.length) : 0;
const homeRows = rows.filter(r => r.group === 'homepage');
const guardRows = rows.filter(r => r.group === 'state-guard');
const report = {
  generatedAt: new Date().toISOString(),
  themeId: THEME_ID,
  currentDiscovery: {
    homepageButtons: homeButtons.length,
    stateGuardRootButtons: stateRootButtons.length,
    stateGuardCrawledPages: crawled.size,
    stateGuardUniqueButtons: stateButtons.length,
    totalUniqueDestinationsTimed: rows.length
  },
  thresholds,
  averages: {
    homepage: { ttfbMs: avg(homeRows,'ttfbMs'), loadMs: avg(homeRows,'loadMs'), lcpMs: avg(homeRows,'lcpMs'), transferKB: Math.round(avg(homeRows,'transferBytes')/1024) },
    stateGuard: { ttfbMs: avg(guardRows,'ttfbMs'), loadMs: avg(guardRows,'loadMs'), lcpMs: avg(guardRows,'lcpMs'), transferKB: Math.round(avg(guardRows,'transferBytes')/1024) }
  },
  rows: ranked,
  errors: allErrors
};
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(report, null, 2));

const cols = ['group','label','source','depth','route','status','ttfbMs','domInteractiveMs','dclMs','loadMs','fcpMs','lcpMs','cls','longTaskMs','longTaskCount','resources','transferBytes','htmlTransferBytes','domNodes','scripts','stylesheets','images','brokenImages','flags'];
const esc = v => '"' + String(v ?? '').replaceAll('"','""') + '"';
const csv = [cols.join(','), ...ranked.map(r => cols.map(c => esc(c === 'flags' ? (r.flags || []).join('|') : r[c])).join(','))].join('\n');
fs.writeFileSync(path.join(OUT, 'results.csv'), csv);

const md = [
  '# Fresh Sep 18 Chromium Load Audit',
  '',
  'Draft theme ID: ' + THEME_ID,
  'Generated: ' + report.generatedAt,
  '',
  '## Current rendered coverage',
  '- Homepage buttons discovered now: ' + homeButtons.length,
  '- State Guard root buttons discovered now: ' + stateRootButtons.length,
  '- State Guard pages crawled now: ' + crawled.size,
  '- Unique State Guard buttons discovered now: ' + stateButtons.length,
  '- Unique destinations timed: ' + rows.length,
  '',
  '## Average cold-load measurements',
  '- Homepage: TTFB ' + report.averages.homepage.ttfbMs + ' ms; load ' + report.averages.homepage.loadMs + ' ms; LCP ' + report.averages.homepage.lcpMs + ' ms; transfer ' + report.averages.homepage.transferKB + ' KB',
  '- State Guard: TTFB ' + report.averages.stateGuard.ttfbMs + ' ms; load ' + report.averages.stateGuard.loadMs + ' ms; LCP ' + report.averages.stateGuard.lcpMs + ' ms; transfer ' + report.averages.stateGuard.transferKB + ' KB',
  '',
  '## Slowest 20 current destinations',
  ...ranked.slice(0,20).map((r,i) =>
    (i+1) + '. ' + r.label + ' — ' + r.route +
    ' — TTFB ' + (r.ttfbMs || 0) + ' ms; DCL ' + (r.dclMs || 0) + ' ms; load ' + (r.loadMs || 0) +
    ' ms; LCP ' + (r.lcpMs || 0) + ' ms; long tasks ' + (r.longTaskMs || 0) +
    ' ms; ' + Math.round((r.transferBytes || 0)/1024) + ' KB; ' + (r.resources || 0) +
    ' resources; flags: ' + ((r.flags || []).join(', ') || 'none')
  ),
  '',
  '## Files',
  '- homepage-buttons-current.json',
  '- state-guard-root-buttons-current.json',
  '- state-guard-all-buttons-current.json',
  '- results.json',
  '- results.csv',
  '- screenshots/',
  '- videos/'
].join('\n');
fs.writeFileSync(path.join(OUT, 'AUDIT.md'), md);
console.log(md);

if (homeButtons.length !== 42) {
  console.log('COVERAGE_NOTE homepage current count is', homeButtons.length, 'not 42');
}
