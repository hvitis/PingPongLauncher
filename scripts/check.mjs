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
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    asset.photoSha256,
    `${key}: image checksum`,
  );
  for (const field of ['sourcePage', 'sourceImage'])
    assert.equal(new URL(asset[field]).protocol, 'https:');
  for (const field of ['credit', 'checkedOn', 'rights', 'sourceSha256'])
    assert(asset[field], `${key}: ${field}`);
}
for (const [id, illustration] of Object.entries(visuals.components)) {
  assert(visuals.assets[illustration.asset], `${id}: photo reference missing`);
  assert(illustration.observations.length > 0 && illustration.note);
  assert(['listing', 'reference', 'material'].includes(illustration.scope));
  const svg = fs.readFileSync(path.join('docs', illustration.svg), 'utf8');
  assert(svg.includes('viewBox=') && svg.includes('<title') && svg.includes('<desc'));
  assert(
    !/<(?:script|image|foreignObject|iframe)\b/i.test(svg),
    `${id}: SVG must stay native and self-contained`,
  );
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
for (const file of [
  'app.js',
  'viewer.js',
  'wizard.js',
  'shopping.js',
  'storage.js',
  'spring.js',
  'component-visuals.js',
  'launcher-tabs.js',
  'mobile01.js',
  'hien.js',
]) {
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

// Cross-check the new launcher's independently consumed content and PCB connectivity.
const mobile01 = JSON.parse(fs.readFileSync('docs/data/mobile01.json', 'utf8'));
assert.equal(mobile01.parts.length, 23);
assert.equal(mobile01.connections.length, 13);
for (const part of mobile01.parts) {
  assert(html.includes(part.id) && html.includes(part.spec), `Missing Mobile01 part: ${part.id}`);
  assert(fs.readFileSync('docs/downloads/mobile01-parts.csv', 'utf8').includes(part.spec));
}
const pcb = fs.readFileSync('docs/downloads/mobile01-control-breakout.kicad_pcb', 'utf8');
const stack = [[]];
for (const token of pcb.match(/"(?:\\.|[^"\\])*"|[()]|[^\s()]+/g)) {
  if (token === '(') {
    const node = [];
    stack.at(-1).push(node);
    stack.push(node);
  } else if (token === ')') {
    assert(stack.length > 1, 'Unexpected closing PCB expression');
    stack.pop();
  } else stack.at(-1).push(token.startsWith('"') ? JSON.parse(token) : token);
}
assert.equal(stack.length, 1, 'Unclosed PCB expression');
assert.equal(stack[0].length, 1);
const board = stack[0][0];
assert.equal(board[0], 'kicad_pcb');
const footprints = board.filter((node) => node[0] === 'footprint');
assert.equal(footprints.length, 13, 'Nine electrical footprints and four mounting holes');
const pads = new Map();
for (const footprint of footprints) {
  const reference = footprint.find((node) => node[0] === 'fp_text' && node[1] === 'reference')?.[2];
  for (const pad of footprint.filter((node) => node[0] === 'pad' && node[1])) {
    pads.set(`${reference}.${pad[1]}`, pad.find((node) => node[0] === 'net')[2]);
  }
}
const padCSV = fs
  .readFileSync('docs/downloads/mobile01-pcb-netlist.csv', 'utf8')
  .trim()
  .split(/\r?\n/)
  .slice(1);
assert.equal(pads.size, padCSV.length);
for (const row of padCSV) {
  const [reference, number, net] = row.split(',');
  assert.equal(pads.get(`${reference}.${number}`), net, `${reference}.${number}: PCB/CSV mismatch`);
}
assert.equal(pads.get('J1.2'), '+5V_LOGIC');
assert.equal(pads.get('J5.1'), 'GND');
assert.equal(pads.get('C2.1'), '+5V_LOGIC');
assert.equal(pads.get('C2.2'), 'GND');
assert(
  !board.some((node) => ['segment', 'zone'].includes(node[0])),
  'Placement draft must remain labelled unrouted',
);
console.log(
  'Mobile01 checks passed: parts content, connector map, PCB expression structure, and all pad nets agree. Native KiCad DRC remains open.',
);

// Cross-check Hien's independently consumed content, parts, and PCB connectivity.
const hien = JSON.parse(fs.readFileSync('docs/data/hien.json', 'utf8'));
assert.equal(hien.parts.length, 21);
assert.equal(hien.connections.length, 14);
assert.equal(hien.modes.length, 4);
const hienPartsCSV = fs.readFileSync('docs/downloads/hien-parts.csv', 'utf8');
for (const part of hien.parts) {
  assert(html.includes(part.id) && html.includes(part.spec), `Missing Hien part: ${part.id}`);
  assert(
    hienPartsCSV.includes(part.spec.replaceAll('"', '""')),
    `Missing in Hien parts CSV: ${part.id}`,
  );
}
const hienPcb = fs.readFileSync('docs/downloads/hien-servo-breakout.kicad_pcb', 'utf8');
const hienStack = [[]];
for (const token of hienPcb.match(/"(?:\\.|[^"\\])*"|[()]|[^\s()]+/g)) {
  if (token === '(') {
    const node = [];
    hienStack.at(-1).push(node);
    hienStack.push(node);
  } else if (token === ')') {
    assert(hienStack.length > 1, 'Unexpected closing PCB expression');
    hienStack.pop();
  } else hienStack.at(-1).push(token.startsWith('"') ? JSON.parse(token) : token);
}
assert.equal(hienStack.length, 1, 'Unclosed PCB expression');
assert.equal(hienStack[0].length, 1);
const hienBoard = hienStack[0][0];
assert.equal(hienBoard[0], 'kicad_pcb');
const hienFootprints = hienBoard.filter((node) => node[0] === 'footprint');
assert.equal(hienFootprints.length, 18, 'Fourteen electrical footprints and four mounting holes');
const hienPads = new Map();
for (const footprint of hienFootprints) {
  const reference = footprint.find((node) => node[0] === 'fp_text' && node[1] === 'reference')?.[2];
  for (const pad of footprint.filter((node) => node[0] === 'pad' && node[1])) {
    hienPads.set(`${reference}.${pad[1]}`, pad.find((node) => node[0] === 'net')[2]);
  }
}
const hienPadCSV = fs
  .readFileSync('docs/downloads/hien-pcb-netlist.csv', 'utf8')
  .trim()
  .split(/\r?\n/)
  .slice(1);
assert.equal(hienPads.size, hienPadCSV.length);
for (const row of hienPadCSV) {
  const [reference, number, net] = row.split(',');
  assert.equal(
    hienPads.get(`${reference}.${number}`),
    net,
    `${reference}.${number}: PCB/CSV mismatch`,
  );
}
assert.equal(hienPads.get('J9.1'), '+12V_ATX');
assert.equal(hienPads.get('J9.2'), 'GND');
assert.equal(hienPads.get('J9.4'), '+5V_ATX');
assert.equal(hienPads.get('J1.1'), 'GND');
assert.equal(hienPads.get('J1.2'), '+5V_LOGIC');
assert.equal(hienPads.get('R1.1'), 'BLE_TX1_D18');
assert.equal(hienPads.get('R1.2'), 'BLE_RX_3V3');
assert.equal(hienPads.get('R2.1'), 'BLE_RX_3V3');
assert.equal(hienPads.get('R2.2'), 'GND');
assert.equal(hienPads.get('C1.1'), '+12V_ATX');
assert.equal(hienPads.get('C2.1'), '+5V_ATX');
assert.equal(hienPads.get('C3.1'), '+5V_LOGIC');
assert(
  !hienBoard.some((node) => ['segment', 'zone'].includes(node[0])),
  'Hien placement draft must remain unrouted',
);
console.log(
  'Hien checks passed: 21 parts, 14 connections, 4 shot modes, PCB expression structure, and all 46 pad nets agree. Placement draft remains unrouted.',
);

// Thrower manifests drive both the port and its download links.
const throwerRoot = 'docs/thrower';
const throwerAssembly = JSON.parse(fs.readFileSync(`${throwerRoot}/web/data/assembly.json`));
for (const mesh of throwerAssembly.meshes)
  assert(fs.existsSync(path.join(throwerRoot, 'web', mesh.file)), `Missing Thrower mesh: ${mesh.file}`);
for (const part of throwerAssembly.printed)
  for (const format of ['a1', 'stl'])
    assert(fs.existsSync(path.join(throwerRoot, part[format])), `Missing Thrower print: ${part[format]}`);
for (let phase = 1; phase <= 5; phase++) {
  assert(fs.existsSync(`${throwerRoot}/print/a1/phase${phase}.zip`));
  assert(fs.existsSync(`${throwerRoot}/docs/wiring_p${phase}.svg`));
}
for (const file of ['main.html', 'wiring.html']) {
  const fragment = fs.readFileSync(`${throwerRoot}/${file}`, 'utf8');
  for (const [, url] of fragment.matchAll(/(?:href|src)="(thrower\/[^"#]+)"/g))
    assert(fs.existsSync(path.join('docs', url)), `Missing Thrower resource: ${url}`);
}
assert.deepEqual([...html.matchAll(/data-launcher="([^"]+)"/g)].map((m) => m[1]), ['fqj', 'mobile01', 'thrower', 'hien']);
console.log('Thrower checks passed: four-tab order, model manifest, printed parts, five phase kits and wiring diagrams.');
