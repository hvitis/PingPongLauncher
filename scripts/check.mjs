import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const data = JSON.parse(fs.readFileSync('docs/data/project.json', 'utf8'));
const inventory = JSON.parse(fs.readFileSync('docs/data/print-inventory.json', 'utf8'));
const visuals = JSON.parse(fs.readFileSync('docs/data/component-visuals.json', 'utf8'));
assert.equal(
  new Set(data.steps.map((step) => step.id)).size,
  data.steps.length,
  'Step IDs must be unique',
);
assert.equal(data.steps.length, 13);
assert.equal(data.bom.length, 24);
assert.deepEqual(Object.keys(visuals.components).sort(), data.bom.map((part) => part.id).sort());
for (const [key, asset] of Object.entries(visuals.assets)) {
  const bytes = fs.readFileSync(path.join('docs', asset.photo));
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.photoSha256, `${key}: image checksum`);
  for (const field of ['sourcePage', 'sourceImage']) assert.equal(new URL(asset[field]).protocol, 'https:');
  for (const field of ['credit', 'checkedOn', 'rights', 'sourceSha256']) assert(asset[field], `${key}: ${field}`);
}
for (const [id, illustration] of Object.entries(visuals.components)) {
  assert(visuals.assets[illustration.asset], `${id}: photo reference missing`);
  assert(illustration.observations.length > 0 && illustration.note);
  assert(['listing', 'reference', 'material'].includes(illustration.scope));
  const svg = fs.readFileSync(path.join('docs', illustration.svg), 'utf8');
  assert(svg.includes('viewBox=') && svg.includes('<title') && svg.includes('<desc'));
  assert(!/<(?:script|image|foreignObject|iframe)\b/i.test(svg), `${id}: SVG must stay native and self-contained`);
  assert(!/\son\w+\s*=/i.test(svg), `${id}: executable SVG attribute`);
}
assert.match(data.supplierCheckedOn, /^\d{4}-\d{2}-\d{2}$/);
for (const part of data.bom) {
  assert(data.supplierStatuses[part.botland?.status], `${part.id}: missing supplier status`);
  assert(part.botland.note, `${part.id}: missing compatibility note`);
  for (const link of part.botland.links) {
    const url = new URL(link.url);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.hostname, 'botland.com.pl');
    assert(['product', 'category'].includes(link.kind));
    assert(link.label);
  }
  const products = part.botland.links.filter((link) => link.kind === 'product');
  if (part.botland.status === 'no-match') assert.equal(products.length, 0);
  else assert(products.length > 0, `${part.id}: a product listing is required`);
}
assert.equal(inventory.plates.length, 10);
assert.equal(inventory.objects.length, 28);
assert.equal(
  inventory.objects.reduce((sum, object) => sum + object.triangles, 0),
  1422006,
);
for (const object of inventory.objects) {
  assert.equal(object.boundaryEdges, 0);
  assert.equal(object.nonManifoldEdges, 0);
  assert.equal(object.degenerateTriangles, 0);
}
for (const step of data.steps) {
  for (const key of ['title', 'intro', 'check', 'note', 'source', 'photo', 'caption'])
    assert(step[key], `${step.id}: missing ${key}`);
  assert(step.actions.length > 0);
  assert(fs.existsSync(`docs/assets/photos/${step.photo}`), `Missing photo for ${step.id}`);
}
const html = fs.readFileSync('docs/index.html', 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');
for (const [, link] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
  if (/^(https?:|data:|mailto:|#)/.test(link)) {
    if (link.length > 1 && link.startsWith('#'))
      assert(ids.includes(link.slice(1)), `Broken anchor ${link}`);
    continue;
  }
  assert(fs.existsSync(path.join('docs', link)), `Broken local link: ${link}`);
}
for (const file of ['app.js', 'viewer.js', 'wizard.js', 'shopping.js', 'storage.js', 'spring.js', 'component-visuals.js']) {
  const source = fs.readFileSync(`docs/${file}`, 'utf8');
  for (const [, module] of source.matchAll(/from ['"](\.\/[^'"]+)['"]/g))
    assert(fs.existsSync(path.join('docs', module)), `Missing module ${module}`);
}
const glb = fs.readFileSync('docs/assets/models/launcher.glb');
assert.equal(glb.readUInt32LE(0), 0x46546c67);
assert.equal(glb.readUInt32LE(4), 2);
assert.equal(glb.readUInt32LE(8), glb.length);
const gltf = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString());
assert.equal(gltf.meshes.length, 101);
assert(gltf.nodes.some((node) => node.name === 'Ball hopper'));
assert(gltf.nodes.every((node) => node.extras.group));
assert(!fs.existsSync('docs/__live.js'), 'Development reload must not ship as a file');
console.log(
  `Checks passed: ${data.steps.length} steps, ${data.bom.length} BOM entries, 10 plates, 28 closed meshes, 101 CAD meshes, local links and modules.`,
);
