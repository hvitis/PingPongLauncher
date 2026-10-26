// Run after import-step.mjs. Keep CAD coordinates; convert millimeters/Z-up to meters/Y-up.
import fs from 'node:fs';
const source = JSON.parse(fs.readFileSync('node_modules/.cache/launcher-step.json'));
const chunks = [],
  views = [],
  accessors = [],
  meshes = [],
  nodes = [];
let length = 0;
const materials = [
  ['Graphite structure', [0.12, 0.15, 0.14, 1], 0.12],
  ['Warm ivory panels', [0.76, 0.75, 0.69, 1], 0],
  ['Orange launch wheels', [0.98, 0.24, 0.055, 1], 0],
  ['Steel hardware', [0.48, 0.53, 0.53, 1], 0.75],
  ['Green electronics', [0.13, 0.32, 0.23, 1], 0.2],
  ['Ivory hopper', [0.88, 0.86, 0.79, 1], 0],
  ['Ball', [0.97, 0.97, 0.94, 1], 0],
].map(([name, color, metal]) => ({
  name,
  pbrMetallicRoughness: { baseColorFactor: color, metallicFactor: metal, roughnessFactor: 0.58 },
}));
function buffer(array, type, kind, min, max) {
  const b = Buffer.from(array.buffer);
  chunks.push(b);
  const vi =
    views.push({
      buffer: 0,
      byteOffset: length,
      byteLength: b.length,
      target: kind === 'SCALAR' ? 34963 : 34962,
    }) - 1;
  length += b.length;
  return (
    accessors.push({
      bufferView: vi,
      componentType: type,
      count: array.length / (kind === 'VEC3' ? 3 : 1),
      type: kind,
      ...(min ? { min, max } : {}),
    }) - 1
  );
}
function classify(i) {
  if (i <= 5) return 'base';
  if ((i >= 6 && i <= 18) || (i >= 32 && i <= 44)) return 'wheels';
  if (i >= 45 && i <= 52) return 'feed';
  if (i === 97) return 'hopper';
  if (i >= 53 && i <= 96) return 'hardware';
  if (i >= 98) return 'ball';
  return 'body';
}
function translate(name, i) {
  const fixed = {
    0: 'Base enclosure',
    4: 'Base lid and tilt support',
    5: 'Power supply CAD envelope',
    6: 'Left motor cage',
    7: 'Left motor cap',
    8: 'Left 550 motor',
    9: 'Left wheel flange',
    10: 'Left launch wheel',
    19: 'Main body, right half',
    20: 'Main body, left half',
    21: 'Outlet tube (source: revision pending)',
    22: 'Left launch support',
    23: 'Right launch support',
    24: 'Tilt linkage, right',
    25: 'Tilt linkage, left',
    26: 'Right adjustment knob',
    27: 'Left adjustment knob',
    32: 'Right motor cage',
    33: 'Right motor cap',
    34: 'Right 550 motor',
    35: 'Right wheel flange',
    36: 'Right launch wheel',
    45: 'Rear cover',
    46: 'Feed motor mount',
    47: 'Geared feed motor',
    48: 'Feed screw',
    49: 'Rear support',
    50: 'Bevel pinion',
    51: 'Bevel gear',
    52: 'Gear component',
    53: 'Wing nut',
    55: 'M5 washer',
    97: 'Ball hopper',
    98: '40 mm ball',
    99: 'Ball stopper CAD detail',
    100: 'Stopper detail',
  };
  return (
    fixed[i] ??
    name
      .replace('内六角圆柱头螺钉', 'Socket head screw')
      .replace('六角螺母', 'Hex nut')
      .replace('螺母_有螺母槽的', 'Captive nut knob')
      .replace('螺母', 'Printed knob')
      .replace('轴承', 'Bearing')
      .replace('PWM', 'PWM controller')
  );
}
source.meshes.forEach((m, i) => {
  const p = new Float32Array(m.attributes.position.array.length),
    n = new Float32Array(m.attributes.normal.array.length),
    min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  for (let k = 0; k < p.length; k += 3) {
    const a = m.attributes.position.array,
      b = m.attributes.normal.array;
    p[k] = a[k] / 1000;
    p[k + 1] = a[k + 2] / 1000;
    p[k + 2] = -a[k + 1] / 1000;
    n[k] = b[k];
    n[k + 1] = b[k + 2];
    n[k + 2] = -b[k + 1];
    for (let j = 0; j < 3; j++) {
      min[j] = Math.min(min[j], p[k + j]);
      max[j] = Math.max(max[j], p[k + j]);
    }
  }
  const group = classify(i);
  const material =
    i === 98
      ? 6
      : i === 97
        ? 5
        : [10, 36].includes(i)
          ? 2
          : [8, 34, 47].includes(i) || group === 'hardware'
            ? 3
            : i >= 1 && i <= 3
              ? 4
              : [4, 6, 7, 32, 33, 21].includes(i)
                ? 1
                : 0;
  const name = translate(m.name || `Component ${i}`, i);
  meshes.push({
    name,
    primitives: [
      {
        attributes: {
          POSITION: buffer(p, 5126, 'VEC3', min, max),
          NORMAL: buffer(n, 5126, 'VEC3'),
        },
        indices: buffer(new Uint32Array(m.index.array), 5125, 'SCALAR'),
        material,
      },
    ],
  });
  nodes.push({ name, mesh: i, extras: { group, sourceName: m.name || '', sourceMesh: i } });
});
const gltf = {
  asset: { version: '2.0', generator: 'Ping Pong Launcher / occt-import-js 0.0.23' },
  scene: 0,
  scenes: [{ nodes: nodes.map((_, i) => i) }],
  nodes,
  meshes,
  materials,
  accessors,
  bufferViews: views,
  buffers: [{ byteLength: length }],
};
let json = Buffer.from(JSON.stringify(gltf));
json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 32)]);
const bin = Buffer.concat(chunks);
const header = Buffer.alloc(20);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + json.length + bin.length, 8);
header.writeUInt32LE(json.length, 12);
header.writeUInt32LE(0x4e4f534a, 16);
const bh = Buffer.alloc(8);
bh.writeUInt32LE(bin.length, 0);
bh.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync('docs/assets/models/launcher.glb', Buffer.concat([header, json, bh, bin]));
console.log(`Exported ${meshes.length} CAD meshes (${(bin.length / 1e6).toFixed(1)} MB)`);
