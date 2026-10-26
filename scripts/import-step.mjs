import fs from 'node:fs';
import occtFactory from 'occt-import-js';
const occt = await occtFactory();
const result = occt.ReadStepFile(
  new Uint8Array(fs.readFileSync('docs/downloads/launcher-assembly.step')),
  {
    linearUnit: 'millimeter',
    linearDeflectionType: 'absolute_value',
    linearDeflection: 0.35,
    angularDeflection: 0.5,
  },
);
if (!result.success) throw new Error('STEP conversion failed');
fs.mkdirSync('node_modules/.cache', { recursive: true });
fs.writeFileSync('node_modules/.cache/launcher-step.json', JSON.stringify(result));
console.log(
  JSON.stringify(
    {
      root: result.root,
      meshes: result.meshes.map((m) => ({
        name: m.name,
        color: m.color,
        vertices: m.attributes.position.array.length / 3,
        triangles: m.index.array.length / 3,
      })),
    },
    null,
    2,
  ),
);
