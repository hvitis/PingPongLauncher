import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser = await chromium.launch({headless:true, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[];
const missing=[];
const base='http://launcher.local/PingPongLauncher/';
async function page(options={}) {
 const ctx=await browser.newContext(options);
 await ctx.route('**/*', async route=>{
  const url=new URL(route.request().url());
  assert.equal(url.hostname,'launcher.local');
  const file=path.join(process.env.SITE_ROOT ?? 'docs',url.pathname.replace(/^\/PingPongLauncher\//,'')||'index.html');
  try {await route.fulfill({body:await fs.readFile(file),contentType:({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'})[path.extname(file)]??'application/octet-stream'});}
  catch {missing.push(file);await route.fulfill({status:404,body:'Missing'});}
 });
 const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message)); return p;
}
try {
 const p=await page({viewport:{width:1440,height:1000}});
 await p.goto(base+'?launcher=thrower');
 const main=p.locator('#thrower-workbench');
 await main.locator('#phase-pick button').last().waitFor({state:'attached'});
 assert.deepEqual(await p.locator('[data-launcher]').evaluateAll(t=>t.map(x=>x.dataset.launcher)),['fqj','mobile01','thrower','hien']);
 console.log('Thrower initialized');
 await main.scrollIntoViewIfNeeded();
 await main.locator('#b-motors').click();
 await p.waitForFunction(()=>document.querySelector('#thrower-workbench').shadowRoot.querySelector('#state').textContent!=='idle');
 for (const cam of ['table','player','robot']) await main.locator(`[data-cam="${cam}"]`).click();
 await main.locator('#cutaway').check();
 await main.locator('#explode').fill('0.5');
 await main.locator('[data-tab="poc"]').click();
 for(let phase=1;phase<=5;phase++) {
  await main.locator(`[data-phase="${phase}"]`).click();
  assert.match(await main.locator('#sb-phase').innerText(),new RegExp(`phase ${phase}`));
 }
 const check=main.locator('.checks input').first();await check.check();
 await p.reload();await main.locator('#phase-pick button').last().waitFor({state:'attached'});
 await main.locator('[data-tab="poc"]').click();await main.locator('[data-phase="5"]').click();assert(await main.locator('.checks input').first().isChecked());
 await main.locator('[data-tab="parts"]').click();assert(await main.locator('#printed a').count()>0);
 await main.locator('[data-tab="build"]').click();await main.locator('#steps li').first().click();
 await main.locator('[data-tab="wiring"]').click();await main.locator('[data-wiring-open]').click();
 const wire=p.locator('#thrower-wiring3d');await wire.locator('#wsteps li').first().waitFor();
 await wire.locator('#next').click();await wire.locator('#v-board').click();await wire.locator('[data-wiring-close]').click();
 await main.locator('[data-tab="sim"]').click();
 await main.locator('#b-motors').click();
 await p.locator('#tab-hien').click();
 const paused = await main.locator('#readout').textContent();
 await p.waitForTimeout(250);assert.equal(await main.locator('#readout').textContent(),paused);
 await p.locator('#tab-thrower').click();assert(await main.isVisible());
 await fs.mkdir('test-results',{recursive:true});await p.screenshot({path:'test-results/thrower-desktop.png'});
 await p.setViewportSize({width:390,height:844});await p.evaluate(()=>document.querySelector('#thrower-workbench').scrollIntoView({block:'start'}));await p.screenshot({path:'test-results/thrower-mobile.png'});
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});
 await p.screenshot({path:'test-results/thrower-dark.png'});
 await main.locator('[data-tab="poc"]').click();await main.locator('[data-phase="1"]').click();await main.locator('#sb-play').click();assert.equal(await main.locator('#sb-play').getAttribute('aria-label'),'Play the build');
 const fallback=await page();await fallback.addInitScript(()=>{const orig=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return /webgl/.test(t)?null:orig.call(this,t,...a);};});
 await fallback.goto(base+'?launcher=thrower');await fallback.waitForFunction(()=>document.querySelector('#thrower-status').textContent.includes('unavailable'));
 assert(await fallback.locator('#thrower-downloads').isVisible());
 assert.deepEqual(missing,[]);assert.deepEqual(errors,[]);
 console.log('Thrower browser checks passed: simulation, cameras, five phases, persistence, build, 3D wiring, subpath assets, mobile, reduced motion and WebGL fallback.');
} finally {await browser.close();}
