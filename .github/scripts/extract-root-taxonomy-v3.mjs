import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'https://www.statesideqm.com';
const THEME = '158561894555';
const routes = [
  ['01','Accessories, Gifts & Collectibles','/collections/accessories-gifts-collectibles'],
  ['02','Airsoft & Milsim','/collections/airsoft-milsim'],
  ['03','Apparel & Headwear','/collections/apparel'],
  ['04','Armed Forces Gear','/collections/armed-forces-gear'],
  ['06','Art & Military Prints','/collections/art'],
  ['07','Body Armor & Ballistic Protection','/collections/body-armor-ballistic-protection'],
  ['08','Books, Literature, Manuals & Reference','/collections/literature'],
  ['09','Child Safety Shop','/collections/child-safety-shop'],
  ['10','DIVE / SCUBA','/collections/dive-scuba'],
  ['11','Firearm Accessories, Holsters & Shooting Gear','/collections/firearm-accessories'],
  ['12','First Aid, Medical & IFAK','/collections/first-aid-medical-ifak'],
  ['13','Flags, Displays & Memorials','/collections/flags-patriotic-decor'],
  ['14','Flashlights, Lighting & Power','/collections/flashlights-lighting'],
  ['15','Footwear, Gloves & Eyewear','/collections/footwear-gloves-eyewear'],
  ['16','K9 & Working Dog Gear','/collections/k9-dog-gear'],
  ['17','Knives, Axes & Multi-Tools','/collections/knives-axes-cutlery'],
  ['18','Morale Patches, Stickers & Tactical ID','/collections/morale-patches-tactical-id'],
  ['19','Outdoor, Survival & Preparedness','/collections/outdoor-preparedness-gear'],
  ['20','Patriotic & American Heritage','/collections/patriotic-american-heritage'],
  ['21','Safety, Rescue & Climbing','/collections/safety-rescue-climbing'],
  ['22','Sta-Brite Insignia','/collections/sta-brite-insignia'],
  ['23','Tactical Gear, Packs & Load Carriage','/collections/tactical-gear'],
  ['24','Thin Line Shop','/collections/thin-line'],
  ['25','Uniforms, Insignia & Identification','/collections/uniforms'],
  ['26','Watches & Timepieces','/collections/watches'],
  ['27','Zippo, Lighters & Fire Starters','/collections/zippos-lighters-torches'],
  ['28','Logo Merch','/collections/stateside-quartermaster-logo-merch'],
  ['29','Army National Guard Series','/collections/army-national-guard-series'],
  ['30','Air National Guard Series','/collections/air-national-guard-series'],
  ['31','State Guard Series','/collections/state-guard-series'],
  ['32','U.S. Army Series','/collections/products-built-for-the-line-u-s-army'],
  ['33','U.S. Navy Series','/collections/products-built-for-the-line-u-s-navy'],
  ['34','U.S. Air Force Series','/collections/products-built-for-the-line-u-s-air-force'],
  ['35','U.S. Marine Corps Series','/collections/products-built-for-the-line-u-s-marine-corps'],
  ['36','U.S. Coast Guard Series','/collections/products-built-for-the-line-u-s-coast-guard'],
  ['37','U.S. Space Force Series','/collections/products-built-for-the-line-u-s-space-force'],
  ['38','ROTC Series','/collections/rotc-series'],
  ['39','JROTC Series','/collections/jrotc-series'],
  ['40','Military Schools & Academies','/collections/military-schools-academies'],
  ['41','Law Enforcement & Corrections','/collections/law-enforcement-corrections'],
  ['42','Firefighting, EMS & Search & Rescue','/collections/firefighting-ems-search-rescue']
];

const clean = v => String(v || '').replace(/\s+/g, ' ').trim();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultNavigationTimeout(60000);

const prime = new URL('/', BASE);
prime.searchParams.set('preview_theme_id', THEME);
await page.goto(prime.toString(), { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(700);

const output = { generatedAt: new Date().toISOString(), previewThemeId: THEME, roots: {} };
for (const [idx, name, route] of routes) {
  const url = new URL(route, BASE);
  url.searchParams.set('preview_theme_id', THEME);
  const response = await page.goto(url.toString(), { waitUntil: 'domcontentloaded' }).catch(() => null);
  await page.waitForTimeout(900);
  const status = response?.status() || 0;
  const data = await page.evaluate(() => {
    const main = document.getElementById('MainContent');
    if (!main) return { title: '', links: [] };
    const text = el => String(el?.textContent || '').replace(/\s+/g, ' ').trim();
    const links = [...main.querySelectorAll('a[href*="/collections/"]')].map(a => {
      if (a.closest('collection-component, results-list, .product-grid, product-card, .sq-global-refine-sidebar')) return null;
      const u = new URL(a.href, location.origin);
      const m = u.pathname.match(/^\/collections\/([^/?#]+)/);
      if (!m) return null;
      let label = text(a.querySelector('[class*="title"],[class*="label"],strong,h3,h4')) || a.getAttribute('aria-label') || text(a);
      label = label.replace(/^shop\s+(?:all\s+)?/i, '').trim();
      if (!label || label.length > 120) return null;
      let node = a;
      let heading = '';
      let containerClass = '';
      for (let i = 0; i < 9 && node && node !== main; i++, node = node.parentElement) {
        if (!containerClass && node.className) containerClass = String(node.className).slice(0, 240);
        const h = node.querySelector?.(':scope > h2,:scope > h3,:scope > header h2,:scope > header h3,:scope > .section-header h2,:scope > .section-header h3');
        if (h && text(h)) { heading = text(h).replace(/\s*\(.*?\)\s*$/, ''); break; }
      }
      return { label, handle: decodeURIComponent(m[1]), path: u.pathname, heading, containerClass };
    }).filter(Boolean);
    return { title: text(main.querySelector('h1')), links };
  });
  const rootHandle = route.split('/').filter(Boolean).pop();
  const seen = new Set();
  data.links = data.links.filter(x => x.handle !== rootHandle && !seen.has(`${x.heading}|${x.handle}`) && seen.add(`${x.heading}|${x.handle}`));
  output.roots[rootHandle] = { idx: Number(idx), name, route, status, title: data.title, links: data.links };
  console.log(`TAXONOMY ${idx}/42 ${name}: HTTP ${status}, ${data.links.length} candidate links`);
  await page.waitForTimeout(350);
}

fs.mkdirSync('taxonomy-v3', { recursive: true });
fs.writeFileSync('taxonomy-v3/root-taxonomy.json', JSON.stringify(output, null, 2));
await browser.close();
