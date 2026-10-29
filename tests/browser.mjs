// Optional functional QA. OFFLINE_PREVIEW=1 fulfills requests from docs/ without a server.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const base =
  process.env.BASE_URL ??
  (process.env.OFFLINE_PREVIEW
    ? 'http://launcher.local/PingPongLauncher/'
    : 'http://127.0.0.1:4173/');
const artifacts = 'test-results';
await fs.mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [];
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.mp4': 'video/mp4',
  '.vtt': 'text/vtt',
};
async function context(options = {}) {
  const context = await browser.newContext(options);
  if (process.env.OFFLINE_PREVIEW)
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname !== 'launcher.local') throw new Error(`Unexpected external request: ${url}`);
      const filename = path.join(
        process.env.SITE_ROOT ?? 'docs',
        url.pathname.replace(/^\/PingPongLauncher\//, '') || 'index.html',
      );
      try {
        await route.fulfill({
          body: await fs.readFile(filename),
          contentType: mime[path.extname(filename)] ?? 'application/octet-stream',
        });
      } catch {
        await route.fulfill({ status: 404, body: 'File not found' });
      }
    });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base);
  await page.waitForSelector('#step-list button');
  return { context, page };
}
try {
  const desktop = await context({ viewport: { width: 1440, height: 1000 } });
  const page = desktop.page;
  await page.waitForFunction(
    () => document.querySelector('#hero-viewer').dataset.ready === 'true',
    { timeout: 20000 },
  );
  await page.waitForFunction(
    () => document.querySelector('#assembly-viewer').dataset.ready === 'true',
  );
  assert.equal(await page.locator('#step-list button').count(), 13);
  assert.equal(await page.locator('#plate-grid article').count(), 10);
  assert.equal(await page.locator('#parts-body tr').count(), 24);
  assert.equal(await page.locator('.supplier-cell').count(), 24);
  assert.equal(
    await page.locator('#download-shopping-csv').getAttribute('href'),
    'downloads/shopping-list.csv',
  );
  assert.equal((await page.locator('.supplier-cell .link-product').count()) > 0, true);
  await page.locator('.shopping-checkbox input').first().check();
  assert.match(await page.locator('#shopping-progress').innerText(), /1 of 24/);
  await page.getByRole('button', { name: 'Electronics', exact: true }).click();
  assert.equal(await page.locator('#parts-body tr').count(), 7);
  await page.locator('#parts-search').fill('550');
  assert.equal(await page.locator('#parts-body tr').count(), 1);
  await page.locator('#parts-search').fill('no-match-xyz');
  assert.match(await page.locator('#parts-body').innerText(), /No parts match/);
  await page.getByRole('button', { name: 'All parts', exact: true }).click();
  await page.locator('#parts-search').fill('');
  await page.locator('#explode').click();
  assert.equal(await page.locator('#explode').getAttribute('aria-pressed'), 'true');
  await page.locator('#rotate').click();
  assert.equal(await page.locator('#rotate').getAttribute('aria-pressed'), 'true');
  await page.locator('#reset-view').click();
  assert.equal(await page.locator('#explode').getAttribute('aria-pressed'), 'false');
  await page.locator('#step-complete').check();
  assert.match(await page.locator('#progress-text').innerText(), /1 of 13/);
  await page.locator('#step-next').click();
  assert.match(await page.locator('#step-title').innerText(), /hardware/i);
  await page.reload();
  await page.waitForSelector('#step-list button');
  assert.equal(await page.locator('.shopping-checkbox input').first().isChecked(), true);
  await page.locator('#shopping-reset').click();
  assert.match(await page.locator('#shopping-progress').innerText(), /0 of 24/);
  assert.match(await page.locator('#step-title').innerText(), /hardware/i);
  assert.match(await page.locator('#progress-text').innerText(), /1 of 13/);
  for (let index = 0; index < 13; index++) {
    await page.locator('#step-list button').nth(index).click();
    assert.match(
      await page.locator('#step-counter').innerText(),
      new RegExp(`STEP ${String(index + 1).padStart(2, '0')}`),
    );
    assert.ok(await page.locator('#step-actions li').count());
    await page.locator('#step-complete').check();
  }
  await page.locator('#step-next').click();
  assert.equal(await page.locator('#guide-finish').isVisible(), true);
  await page.locator('#restart').click();
  assert.match(await page.locator('#progress-text').innerText(), /0 of 13/);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: `${artifacts}/desktop.png`, fullPage: false });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const mobile = await context({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 1,
  });
  await mobile.page.waitForFunction(
    () => document.querySelector('#hero-viewer').dataset.ready === 'true',
  );
  assert.equal(
    await mobile.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
    'Mobile viewport has horizontal overflow',
  );
  await mobile.page
    .locator('#step-list button')
    .nth(6)
    .evaluate((element) =>
      element.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' }),
    );
  await mobile.page.locator('#step-list button').nth(6).click();
  assert.match(await mobile.page.locator('#step-title').innerText(), /geared feed/i);
  await mobile.page.screenshot({ path: `${artifacts}/mobile.png`, fullPage: false });
  // Independent launcher panels, URL history, keyboard access and mechanism controls.
  await page.goto(base);
  await page.locator('#tab-mobile01').click();
  assert.equal(await page.locator('#launcher-fqj').isVisible(), false);
  assert.equal(await page.locator('#launcher-mobile01').isVisible(), true);
  assert.equal(await page.locator('#tab-mobile01').getAttribute('aria-selected'), 'true');
  assert.equal(new URL(page.url()).searchParams.get('launcher'), 'mobile01');
  assert.equal(await page.locator('.header nav a').last().getAttribute('href'), '#mobile01-pcb');
  assert.equal(await page.locator('#mobile01-parts tbody tr').count(), 23);
  await page.locator('#mobile01-next').click();
  assert.match(await page.locator('#mobile01-step-count').innerText(), /2 \/ 5/);
  await page.locator('#mobile01-prev').click();
  assert.match(await page.locator('#mobile01-step-count').innerText(), /1 \/ 5/);
  await page.locator('#mobile01-play').click();
  assert.equal(await page.locator('#mobile01-play').getAttribute('aria-pressed'), 'true');
  await page.locator('#tab-mobile01').focus();
  await page.keyboard.press('Home');
  assert.equal(await page.locator('#launcher-fqj').isVisible(), true);
  assert.equal(await page.locator('#mobile01-play').getAttribute('aria-pressed'), 'false');
  await page.keyboard.press('End');
  assert.equal(await page.locator('#launcher-hien').isVisible(), true);
  await page.locator('#tab-mobile01').click();
  assert.equal(await page.locator('#launcher-mobile01').isVisible(), true);
  await page.goBack();
  assert.equal(await page.locator('#launcher-hien').isVisible(), true);
  await page.goForward();
  assert.equal(await page.locator('#launcher-mobile01').isVisible(), true);
  await page.reload();
  assert.equal(await page.locator('#launcher-mobile01').isVisible(), true);
  assert.equal(await page.locator('#tab-mobile01').getAttribute('tabindex'), '0');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator('#tab-mobile01').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${artifacts}/mobile01-desktop.png`, fullPage: false });
  await page
    .locator('#mobile01-wiring .mobile-diagram')
    .screenshot({ path: `${artifacts}/mobile01-schematic.png` });
  await page
    .locator('#mobile01-pcb .mobile-diagram')
    .screenshot({ path: `${artifacts}/mobile01-pcb.png` });
  for (const img of await page.locator('#launcher-mobile01 img').all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate((element) => element.decode());
    assert.equal(await img.evaluate((element) => element.naturalWidth > 0), true);
  }
  for (const file of ['mechanism.svg', 'schematic.svg', 'pcb.svg']) {
    const validXML = await page.evaluate(async (file) => {
      const text = await (await fetch(new URL(`assets/mobile01/${file}`, location.href))).text();
      return !new DOMParser().parseFromString(text, 'image/svg+xml').querySelector('parsererror');
    }, file);
    assert.equal(validXML, true, `${file} must be valid XML`);
  }
  await page.goto(`${base}#mobile01-wiring`);
  assert.equal(await page.locator('#launcher-mobile01').isVisible(), true);
  await page.goto(`${base}#hardware`);
  assert.equal(await page.locator('#launcher-fqj').isVisible(), true);
  await mobile.page.locator('#tab-mobile01').click();
  assert.equal(
    await mobile.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
    'Arduino panel overflows mobile viewport',
  );
  assert.equal(await mobile.page.locator('#mobile01-pcb').isVisible(), true);
  await mobile.page.locator('#tab-mobile01').scrollIntoViewIfNeeded();
  await mobile.page.screenshot({ path: `${artifacts}/mobile01-mobile.png`, fullPage: false });
  const reduced = await context({ reducedMotion: 'reduce' });
  assert.equal(
    await reduced.page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
    true,
  );
  await reduced.page.locator('#tab-mobile01').click();
  await reduced.page.locator('#mobile01-play').click();
  assert.equal(await reduced.page.locator('#mobile01-play').getAttribute('aria-pressed'), 'false');
  assert.match(await reduced.page.locator('#mobile01-step-count').innerText(), /2 \/ 5/);
  const dark = await context({ colorScheme: 'dark', viewport: { width: 390, height: 844 } });
  await dark.page.locator('#tab-mobile01').click();
  assert.equal(
    await dark.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
  );
  await dark.page.screenshot({ path: `${artifacts}/mobile01-dark.png`, fullPage: false });
  // Hien launcher panel, mechanism animation, mode selection, downloads, and vector diagrams.
  await page.locator('#tab-hien').click();
  assert.equal(await page.locator('#launcher-fqj').isVisible(), false);
  assert.equal(await page.locator('#launcher-mobile01').isVisible(), false);
  assert.equal(await page.locator('#launcher-hien').isVisible(), true);
  assert.equal(await page.locator('#tab-hien').getAttribute('aria-selected'), 'true');
  assert.equal(new URL(page.url()).searchParams.get('launcher'), 'hien');
  assert.equal(await page.locator('.header nav a').last().getAttribute('href'), '#hien-pcb');
  assert.equal(await page.locator('#hien-parts tbody tr').count(), 21);
  await page.locator('#hien-next').click();
  assert.match(await page.locator('#hien-step-count').innerText(), /2 \/ 5/);
  await page.locator('#hien-prev').click();
  assert.match(await page.locator('#hien-step-count').innerText(), /1 \/ 5/);
  await page.locator('#hien-play').click();
  assert.equal(await page.locator('#hien-play').getAttribute('aria-pressed'), 'true');
  await page.locator('#hien-play').click();
  assert.equal(await page.locator('#hien-play').getAttribute('aria-pressed'), 'false');
  await page.locator('[data-hien-mode="attack"]').click();
  assert.match(await page.locator('#hien-mode-title').innerText(), /Attack Mode/i);
  assert.equal(
    await page.locator('[data-hien-mode="attack"]').getAttribute('aria-pressed'),
    'true',
  );
  await page.locator('[data-hien-mode="backspin"]').click();
  assert.match(await page.locator('#hien-mode-title').innerText(), /Backspin Chop/i);
  assert.equal(
    await page.locator('[data-hien-mode="backspin"]').getAttribute('aria-pressed'),
    'true',
  );
  await page.locator('[data-hien-mode="swing"]').click();
  assert.match(await page.locator('#hien-mode-title').innerText(), /Oscillating Swing/i);
  assert.equal(
    await page.locator('[data-hien-mode="swing"]').getAttribute('aria-pressed'),
    'true',
  );
  await page.locator('[data-hien-mode="service"]').click();
  assert.match(await page.locator('#hien-mode-title').innerText(), /Service Mode/i);
  assert.equal(
    await page.locator('[data-hien-mode="service"]').getAttribute('aria-pressed'),
    'true',
  );
  await page.reload();
  assert.equal(await page.locator('#launcher-hien').isVisible(), true);
  assert.equal(await page.locator('#tab-hien').getAttribute('tabindex'), '0');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator('#tab-hien').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${artifacts}/hien-desktop.png`, fullPage: false });
  await page
    .locator('#hien-wiring .mobile-diagram')
    .screenshot({ path: `${artifacts}/hien-schematic.png` });
  await page
    .locator('#hien-pcb .mobile-diagram')
    .screenshot({ path: `${artifacts}/hien-pcb.png` });
  for (const img of await page.locator('#launcher-hien img').all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate((element) => element.decode());
    assert.equal(await img.evaluate((element) => element.naturalWidth > 0), true);
  }
  for (const file of ['mechanism.svg', 'schematic.svg', 'pcb.svg']) {
    const validXML = await page.evaluate(async (file) => {
      const text = await (await fetch(new URL(`assets/hien/${file}`, location.href))).text();
      return !new DOMParser().parseFromString(text, 'image/svg+xml').querySelector('parsererror');
    }, file);
    assert.equal(validXML, true, `Hien ${file} must be valid XML`);
  }
  await page.goto(`${base}#hien-wiring`);
  assert.equal(await page.locator('#launcher-hien').isVisible(), true);
  await mobile.page.locator('#tab-hien').click();
  assert.equal(
    await mobile.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
    'Hien panel overflows mobile viewport',
  );
  assert.equal(await mobile.page.locator('#hien-pcb').isVisible(), true);
  await mobile.page.locator('#tab-hien').scrollIntoViewIfNeeded();
  await mobile.page.screenshot({ path: `${artifacts}/hien-mobile.png`, fullPage: false });
  await reduced.page.locator('#tab-hien').click();
  await reduced.page.locator('#hien-play').click();
  assert.equal(await reduced.page.locator('#hien-play').getAttribute('aria-pressed'), 'false');
  assert.match(await reduced.page.locator('#hien-step-count').innerText(), /2 \/ 5/);
  await dark.page.locator('#tab-hien').click();
  assert.equal(
    await dark.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
  );
  await dark.page.screenshot({ path: `${artifacts}/hien-dark.png`, fullPage: false });
  const fallbackContext = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  if (process.env.OFFLINE_PREVIEW)
    await fallbackContext.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      const filename = path.join(
        process.env.SITE_ROOT ?? 'docs',
        url.pathname.replace(/^\/PingPongLauncher\//, '') || 'index.html',
      );
      try {
        await route.fulfill({
          body: await fs.readFile(filename),
          contentType: mime[path.extname(filename)] ?? 'application/octet-stream',
        });
      } catch {
        await route.abort();
      }
    });
  await fallbackContext.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return /webgl/.test(type) ? null : getContext.call(this, type, ...args);
    };
  });
  const fallback = await fallbackContext.newPage();
  fallback.on('pageerror', (error) => errors.push(error.message));
  await fallback.goto(base);
  await fallback.waitForFunction(
    () => document.querySelector('#hero-viewer').dataset.ready === 'fallback',
  );
  assert.equal(await fallback.locator('#hero-viewer .viewer-fallback').isVisible(), true);
  assert.equal(await fallback.locator('#step-list button').count(), 13);
  assert.deepEqual(errors, []);
  console.log(
    'Browser checks passed: original CAD, filters/search, 13 steps, completion/reset/persistence, project subpath, desktop/mobile layout, reduced motion, WebGL fallback, launcher tabs/history/deep links, Arduino mechanism, Hien robot mode/breakout, and dark mode.',
  );
} finally {
  await browser.close();
}
