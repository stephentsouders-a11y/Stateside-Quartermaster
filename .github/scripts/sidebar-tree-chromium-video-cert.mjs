import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const THEME = '159038406811';
const ORIGIN = 'https://www.statesideqm.com';
const OUT = 'audit-out/sidebar-tree';
const VIDEO_DIR = path.join(OUT, 'video');
const SHOT_DIR = path.join(OUT, 'screenshots');
fs.mkdirSync(VIDEO_DIR, { recursive: true });
fs.mkdirSync(SHOT_DIR, { recursive: true });

const HOME_ROOTS = [
  'tactical-gear','uniforms','firearm-accessories','body-armor-ballistic-protection','apparel',
  'flags-patriotic-decor','literature','outdoor-preparedness-gear','first-aid-medical-ifak',
  'flashlights-lighting','knives-axes-cutlery','dive-scuba','armed-forces-gear',
  'morale-patches-tactical-id','footwear-gloves-eyewear','accessories-gifts-collectibles',
  'safety-rescue-climbing','airsoft-milsim','k9-dog-gear','patriotic-american-heritage','art',
  'zippos-lighters-torches','watches','armored-vehicles','child-safety-shop','thin-line',
  'sta-brite-insignia','stateside-quartermaster-logo-merch','army-national-guard-series',
  'air-national-guard-series','state-guard-series','products-built-for-the-line-u-s-army',
  'products-built-for-the-line-u-s-navy','products-built-for-the-line-u-s-air-force',
  'products-built-for-the-line-u-s-marine-corps','products-built-for-the-line-u-s-coast-guard',
  'products-built-for-the-line-u-s-space-force','rotc-series','jrotc-series',
  'military-schools-academies','law-enforcement-corrections-shop',
  'firefighting-ems-search-rescue-shop'
];

const STATE_GUARD = [
  'state-guard-series-alabama','state-guard-series-alaska','state-guard-series-california',
  'state-guard-series-connecticut','state-guard-series-florida','state-guard-series-georgia',
  'state-guard-series-indiana','state-guard-series-louisiana','state-guard-series-maryland',
  'state-guard-series-massachusetts','state-guard-series-michigan','state-guard-series-mississippi',
  'state-guard-series-new-mexico','new-jersey-state-guard-naval-militia',
  'state-guard-series-new-york','state-guard-series-ohio','state-guard-series-oregon',
  'state-guard-series-puerto-rico','state-guard-series-rhode-island',
  'state-guard-series-south-carolina','state-guard-series-tennessee','state-guard-series-texas',
  'state-guard-series-vermont','state-guard-series-virginia','state-guard-series-washington',
  'state-guard-naval-militia-themed-merchandise'
];

const EXPECTED_TOP = ['Shop All','Categories','Price','Color / Pattern','Manufacturer'];
const failures = [];
const coverage = [];
const scenarios = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));

function previewUrl(handle) {
  const u = new URL('/collections/' + handle, ORIGIN);
  u.searchParams.set('filter.v.availability', '1');
  u.searchParams.set('preview_theme_id', THEME);
  return u.href;
}

async function gotoReady(page, url, label, attempts = 4) {
  let last = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      last = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 70000 });
    } catch {
      last = null;
    }
    await sleep(1800);
    const status = last?.status() ?? null;
    const title = await page.title().catch(() => '');
    const body = await page.locator('body').innerText({ timeout: 4000 }).catch(() => '');
    const blocked = status === 429 || /Just a moment|Too Many Requests/i.test(title + ' ' + body.slice(0,500));
    const errored = status === 500 || /Something went wrong/i.test(title);
    if (status === 200 && !blocked && !errored) return last;
    console.log(`${label} attempt ${attempt}: HTTP=${status} title=${title}`);
    await sleep(5000 * attempt);
  }
  return last;
}

async function waitForRail(page) {
  await page.waitForSelector('[data-sq-collection-rail][data-sq-department-root="true"]', { timeout: 20000 });
  await page.waitForFunction(() => {
    const rail = document.querySelector('[data-sq-collection-rail][data-sq-department-root="true"]');
    if (!rail) return false;
    const vis = e => {
      if (!e) return false;
      const s = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      return !e.hidden && s.display !== 'none' && s.visibility !== 'hidden' && r.width > 2 && r.height > 2;
    };
    const rows = [...rail.querySelectorAll('.sq-collection-rail__primary > li')].filter(vis);
    return rows.length >= 5;
  }, { timeout: 20000 });
}

async function railSnapshot(page) {
  return await page.evaluate(() => {
    const rail = document.querySelector('[data-sq-collection-rail][data-sq-department-root="true"]');
    const vis = e => {
      if (!e) return false;
      const s = getComputedStyle(e), r = e.getBoundingClientRect();
      return !e.hidden && s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) !== 0 && r.width > 2 && r.height > 2;
    };
    const top = rail ? [...rail.querySelectorAll('.sq-collection-rail__primary > li')].filter(vis).map(li => {
      const direct = li.querySelector(':scope > .sq-collection-rail__direct,:scope > [data-sq-rail-trigger]');
      const label = direct ? (direct.querySelector('span')?.textContent || direct.textContent || '') : '';
      return {
        label: label.replace(/\s+/g,' ').trim(),
        open: li.classList.contains('is-open'),
        aria: direct?.getAttribute('aria-expanded') ?? null
      };
    }) : [];
    const whiteFlyouts = rail ? [...rail.querySelectorAll('.sq-collection-rail__flyout')].filter(e => {
      if (!vis(e)) return false;
      const bg = getComputedStyle(e).backgroundColor;
      return bg === 'rgb(255, 255, 255)' || bg === 'rgba(255, 255, 255, 1)';
    }).length : 0;
    return {
      url: location.href,
      railCount: [...document.querySelectorAll('[data-sq-collection-rail]')].filter(vis).length,
      top,
      whiteFlyouts,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 4
    };
  });
}

function normalizeTop(labels) {
  return labels.map(x => x.replace(/\s+/g,' ').trim()).filter(Boolean);
}

async function assertFiveTop(page, label) {
  await waitForRail(page);
  const snap = await railSnapshot(page);
  const labels = normalizeTop(snap.top.map(x => x.label));
  if (snap.railCount !== 1) failures.push(`${label}: expected 1 visible rail, got ${snap.railCount}`);
  if (JSON.stringify(labels) !== JSON.stringify(EXPECTED_TOP)) {
    failures.push(`${label}: top-level controls mismatch: ${JSON.stringify(labels)}`);
  }
  if (snap.whiteFlyouts !== 0) failures.push(`${label}: white flyout visible (${snap.whiteFlyouts})`);
  if (snap.horizontalOverflow) failures.push(`${label}: horizontal overflow`);
  return snap;
}

async function topToggle(page, itemSelector, label) {
  const item = page.locator(itemSelector).first();
  const trigger = item.locator(':scope > [data-sq-rail-trigger]');
  if (!(await trigger.count())) {
    failures.push(`${label}: trigger missing`);
    return { first:false, second:false };
  }
  await trigger.click();
  await sleep(250);
  const first = await item.evaluate(el => el.classList.contains('is-open') && el.querySelector(':scope > [data-sq-rail-trigger]')?.getAttribute('aria-expanded') === 'true');
  if (!first) failures.push(`${label}: first click did not open`);
  await trigger.click();
  await sleep(250);
  const second = await item.evaluate(el => !el.classList.contains('is-open') && el.querySelector(':scope > [data-sq-rail-trigger]')?.getAttribute('aria-expanded') === 'false');
  if (!second) failures.push(`${label}: second click did not collapse`);
  return { first, second };
}

async function genericScenario(page, device) {
  const label = `${device} generic`;
  const response = await gotoReady(page, previewUrl('accessories-gifts-collectibles'), label);
  if (response?.status() !== 200) {
    failures.push(`${label}: HTTP ${response?.status()}`);
    return;
  }
  await waitForRail(page);
  if (device === 'mobile') {
    const mt = page.locator('[data-sq-rail-mobile-toggle]');
    await mt.click();
    await sleep(300);
  }
  await assertFiveTop(page, label);
  await page.screenshot({ path: path.join(SHOT_DIR, `${device}-generic-01-root.png`), fullPage: true });

  await topToggle(page, '[data-sq-context-categories]', `${label} Categories`);
  await topToggle(page, '[data-sq-refinement-key="price"]', `${label} Price`);
  await topToggle(page, '[data-sq-refinement-key="color-pattern"]', `${label} Color / Pattern`);
  await topToggle(page, '[data-sq-refinement-key="manufacturer"]', `${label} Manufacturer`);

  const priceItem = page.locator('[data-sq-refinement-key="price"]').first();
  await priceItem.locator(':scope > [data-sq-rail-trigger]').hover();
  await sleep(450);
  if (await priceItem.evaluate(el => el.classList.contains('is-open'))) failures.push(`${label}: hover auto-opened Price`);

  const catItem = page.locator('[data-sq-context-categories]').first();
  await catItem.locator(':scope > [data-sq-rail-trigger]').click();
  await sleep(500);
  await page.screenshot({ path: path.join(SHOT_DIR, `${device}-generic-02-categories-open.png`), fullPage: true });

  const challenge = page.locator('[data-sq-context-categories-list] > li > a[href]').filter({ hasText: /Challenge Coins/i }).first();
  if (!(await challenge.count())) {
    failures.push(`${label}: Challenge Coins direct category missing`);
    return;
  }
  const rootUrl = new URL(page.url()).pathname;
  await challenge.click();
  await sleep(1800);
  if (new URL(page.url()).pathname !== rootUrl) failures.push(`${label}: Category click navigated instead of expanding`);
  const categoryActive = await challenge.evaluate(a => a.classList.contains('is-cascade-active') && a.getAttribute('aria-expanded') === 'true');
  if (!categoryActive) failures.push(`${label}: Category did not become active/expanded`);
  const catLi = challenge.locator('xpath=..');
  const subPanel = catLi.locator(':scope > .sq-collection-rail__cascade-column:not([hidden])').first();
  if (!(await subPanel.count())) failures.push(`${label}: nested Subcategory panel not inserted below Category`);
  const subLinks = subPanel.locator(':scope > .sq-collection-rail__links > li > a[href]');
  const subCount = await subLinks.count();
  if (subCount < 1) failures.push(`${label}: Category produced zero Subcategories`);
  await page.screenshot({ path: path.join(SHOT_DIR, `${device}-generic-03-subcategories-open.png`), fullPage: true });

  if (subCount > 0) {
    const sub = subLinks.first();
    const beforeSub = new URL(page.url()).pathname;
    await sub.click();
    await sleep(1800);
    if (new URL(page.url()).pathname !== beforeSub) failures.push(`${label}: Subcategory click navigated instead of expanding Types`);
    const subActive = await sub.evaluate(a => a.classList.contains('is-cascade-active') && a.getAttribute('aria-expanded') === 'true');
    if (!subActive) failures.push(`${label}: Subcategory did not become active/expanded`);
    const subLi = sub.locator('xpath=..');
    const typePanel = subLi.locator(':scope > .sq-collection-rail__cascade-column:not([hidden])').first();
    if (!(await typePanel.count())) failures.push(`${label}: nested Type panel not inserted below Subcategory`);
    const typeLinks = typePanel.locator(':scope > .sq-collection-rail__links > li > a[href]');
    const typeCount = await typeLinks.count();
    if (typeCount < 1) failures.push(`${label}: Subcategory produced zero Types`);
    await page.screenshot({ path: path.join(SHOT_DIR, `${device}-generic-04-types-open.png`), fullPage: true });

    await sub.click();
    await sleep(300);
    const typeHiddenAfterSecond = await subLi.locator(':scope > .sq-collection-rail__cascade-column').first().evaluate(el => el.hidden).catch(() => false);
    if (!typeHiddenAfterSecond) failures.push(`${label}: second Subcategory click did not collapse Types`);
  }

  await challenge.click();
  await sleep(300);
  const subHiddenAfterSecond = await catLi.locator(':scope > .sq-collection-rail__cascade-column').first().evaluate(el => el.hidden).catch(() => false);
  if (!subHiddenAfterSecond) failures.push(`${label}: second Category click did not collapse Subcategories`);

  scenarios.push({ scenario:'generic', device, url:page.url(), passed:!failures.some(f => f.startsWith(label)) });
}

async function stateGuardScenario(page, device) {
  const label = `${device} state-guard`;
  const response = await gotoReady(page, previewUrl('state-guard-series-ohio'), label);
  if (response?.status() !== 200) {
    failures.push(`${label}: HTTP ${response?.status()}`);
    return;
  }
  await waitForRail(page);
  if (device === 'mobile') {
    const mt = page.locator('[data-sq-rail-mobile-toggle]');
    await mt.click();
    await sleep(300);
  }
  await assertFiveTop(page, label);
  const catItem = page.locator('[data-sq-context-categories]').first();
  await topToggle(page, '[data-sq-context-categories]', `${label} Categories`);
  await catItem.locator(':scope > [data-sq-rail-trigger]').click();
  await sleep(1000);

  const uniforms = page.locator('[data-sq-context-categories-list] > li > a[href]').filter({ hasText: /^Uniforms$/i }).first();
  if (!(await uniforms.count())) {
    failures.push(`${label}: Uniforms category missing`);
    return;
  }
  const rootUrl = new URL(page.url()).pathname;
  await uniforms.click();
  await sleep(900);
  if (new URL(page.url()).pathname !== rootUrl) failures.push(`${label}: Uniforms navigated instead of expanding`);
  const uLi = uniforms.locator('xpath=..');
  const subPanel = uLi.locator(':scope > .sq-collection-rail__cascade-column:not([hidden])').first();
  const subLinks = subPanel.locator(':scope > .sq-collection-rail__links > li > a[href]');
  const subCount = await subLinks.count();
  if (subCount < 1) failures.push(`${label}: Uniforms produced zero State Guard subcategories`);
  await page.screenshot({ path: path.join(SHOT_DIR, `${device}-state-guard-01-uniforms-open.png`), fullPage: true });

  if (subCount > 0) {
    const field = subLinks.filter({ hasText: /OCP|Field Uniform/i }).first();
    const sub = (await field.count()) ? field : subLinks.first();
    const before = new URL(page.url()).pathname;
    await sub.click();
    await sleep(700);
    if (new URL(page.url()).pathname !== before) failures.push(`${label}: State Guard Subcategory navigated instead of expanding`);
    const subLi = sub.locator('xpath=..');
    const typePanel = subLi.locator(':scope > .sq-collection-rail__cascade-column:not([hidden])').first();
    const typeCount = await typePanel.locator(':scope > .sq-collection-rail__links > li > a[href]').count();
    if (typeCount < 1) failures.push(`${label}: State Guard Subcategory produced zero component Types`);
    await page.screenshot({ path: path.join(SHOT_DIR, `${device}-state-guard-02-types-open.png`), fullPage: true });

    await sub.click();
    await sleep(250);
    const hidden = await subLi.locator(':scope > .sq-collection-rail__cascade-column').first().evaluate(el => el.hidden).catch(() => false);
    if (!hidden) failures.push(`${label}: State Guard second Subcategory click did not collapse Types`);
  }

  await uniforms.click();
  await sleep(250);
  const hidden = await uLi.locator(':scope > .sq-collection-rail__cascade-column').first().evaluate(el => el.hidden).catch(() => false);
  if (!hidden) failures.push(`${label}: State Guard second Category click did not collapse Subcategories`);
  scenarios.push({ scenario:'state-guard', device, url:page.url(), passed:!failures.some(f => f.startsWith(label)) });
}

async function runRecordedScenario(browser, statePath, name, viewport, fn) {
  const ctx = await browser.newContext({
    viewport,
    storageState: statePath,
    recordVideo: { dir: VIDEO_DIR, size: viewport }
  });
  const page = await ctx.newPage();
  const vid = page.video();
  try {
    await fn(page);
    await sleep(500);
  } catch (e) {
    failures.push(`${name}: uncaught scenario error: ${e.message}`);
  }
  await ctx.close();
  try {
    const p = await vid.path();
    const dest = path.join(VIDEO_DIR, `${name}.webm`);
    if (p !== dest) fs.copyFileSync(p, dest);
  } catch (e) {
    failures.push(`${name}: video finalize failed: ${e.message}`);
  }
}

const browser = await chromium.launch({ headless: true });

const bootstrap = await browser.newContext({ viewport: { width:1440, height:1000 } });
const bp = await bootstrap.newPage();
const bootResp = await gotoReady(bp, `${ORIGIN}/?preview_theme_id=${THEME}`, 'preview bootstrap');
if (bootResp?.status() !== 200) failures.push(`preview bootstrap: HTTP ${bootResp?.status()}`);
const statePath = path.join(OUT, 'preview-state.json');
await bootstrap.storageState({ path: statePath });
await bootstrap.close();

// Full route coverage. No video here to keep artifacts manageable.
const coverageCtx = await browser.newContext({ viewport:{width:1440,height:1000}, storageState:statePath });
const cp = await coverageCtx.newPage();
for (const handle of [...HOME_ROOTS, ...STATE_GUARD]) {
  const label = `coverage ${handle}`;
  const response = await gotoReady(cp, previewUrl(handle), label, 3);
  if (response?.status() !== 200) {
    failures.push(`${label}: HTTP ${response?.status()}`);
    coverage.push({ handle, passed:false, status:response?.status() ?? null });
    continue;
  }
  try {
    const snap = await assertFiveTop(cp, label);
    const toggles = await topToggle(cp, '[data-sq-context-categories]', `${label} Categories`);
    const passed = toggles.first && toggles.second && snap.whiteFlyouts === 0;
    coverage.push({ handle, passed, top:snap.top.map(x=>x.label) });
  } catch (e) {
    failures.push(`${label}: ${e.message}`);
    coverage.push({ handle, passed:false, error:e.message });
  }
  await sleep(350);
}
await coverageCtx.close();

await runRecordedScenario(browser, statePath, 'desktop-generic-tree', {width:1440,height:1000}, p => genericScenario(p,'desktop'));
await runRecordedScenario(browser, statePath, 'mobile-generic-tree', {width:390,height:844}, p => genericScenario(p,'mobile'));
await runRecordedScenario(browser, statePath, 'desktop-state-guard-tree', {width:1440,height:1000}, p => stateGuardScenario(p,'desktop'));
await runRecordedScenario(browser, statePath, 'mobile-state-guard-tree', {width:390,height:844}, p => stateGuardScenario(p,'mobile'));

await browser.close();

const report = {
  generatedAt:new Date().toISOString(),
  theme:THEME,
  homepageCoverage:{ passed:coverage.filter(x=>HOME_ROOTS.includes(x.handle)&&x.passed).length, total:HOME_ROOTS.length },
  stateGuardCoverage:{ passed:coverage.filter(x=>STATE_GUARD.includes(x.handle)&&x.passed).length, total:STATE_GUARD.length },
  coverage,
  scenarios,
  failures,
  passed:failures.length===0
};
fs.writeFileSync(path.join(OUT,'report.json'), JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if (!report.passed) process.exitCode = 2;
