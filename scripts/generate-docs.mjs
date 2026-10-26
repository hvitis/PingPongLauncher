import fs from 'node:fs';
import { writeZip } from './lib/zip.mjs';
const project = JSON.parse(fs.readFileSync('docs/data/project.json', 'utf8'));
const inventory = JSON.parse(fs.readFileSync('docs/data/print-inventory.json', 'utf8'));
const write = (path, text) => {
  if (!fs.existsSync(path) || fs.readFileSync(path, 'utf8') !== text) fs.writeFileSync(path, text);
};
const escape = (value) => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
const csv = (value) => `"${String(value).replaceAll('"', '""')}"`;
write(
  'docs/assembly-guide.md',
  `# English assembly guide\n\n${project.sourceNote}\n\nWARNING: Disconnect power before assembly or adjustment. Wait for every moving part to stop.\n\nWARNING: Fit guards around accessible rotating parts before operation. Keep hands clear of the wheels and feeder.\n\nRead [the build notes](build-notes.md), [print guide](print-guide.md), and [wiring guide](wiring-guide.md) before a build.\n\n${project.steps.map((step, index) => `## ${index + 1}. ${step.title}\n\n${step.intro}\n\n${step.actions.map((action, i) => `${i + 1}. ${action}`).join('\n')}\n\n**Check:** ${step.check}\n\n**Build note:** ${step.note}\n\n![${step.caption}](assets/photos/${step.photo})\n\nSource: ${step.source}\n`).join('\n')}\nThe website saves checklist progress in local browser storage. A checked box records your action; it does not certify the hardware.\n`,
);
write(
  'docs/hardware-bom.md',
  `# Translated hardware list\n\nQuantities follow the supplied spreadsheet, unless the source column identifies a guide addition or photo. They are purchase quantities, not a verified installed count.\n\n| ID | Part | Specification | Quantity | Source | Build note |\n|---|---|---|---|---|---|\n${project.bom.map((part) => `| ${[part.id, part.name, part.spec, part.quantity, part.source, part.note].map(escape).join(' | ')} |`).join('\n')}\n\n## Tools\n\n${project.tools.map((tool) => `- ${tool}`).join('\n')}\n\nThe original purchase links and historical prices remain in [the extracted source table](data/source-bom.json). They are not current recommendations.\n`,
);
write(
  'docs/downloads/hardware-bom.csv',
  [
    [
      'ID',
      'Part',
      'Specification',
      'Quantity',
      'Category',
      'Source',
      'Build note',
      'Botland status',
      'Botland links',
      'Link types',
      'Compatibility note',
      'Purchase/pack note',
      'Checked on',
    ],
    ...project.bom.map((part) => [
      part.id,
      part.name,
      part.spec,
      part.quantity,
      part.category,
      part.source,
      part.note,
      project.supplierStatuses[part.botland.status].label,
      part.botland.links.map((link) => link.url).join(' | '),
      part.botland.links.map((link) => link.kind).join(' | '),
      part.botland.note,
      part.botland.orderNote,
      project.supplierCheckedOn,
    ]),
  ]
    .map((row) => row.map(csv).join(','))
    .join('\r\n') + '\r\n',
);
write(
  'docs/print-guide.md',
  `# Print guide\n\nThe English 3MF preserves the original geometry, plate assignments, orientations, profile, and painted support data. It changes part display names and removes the original computer path in model metadata.\n\n## Saved source profile\n\n| Setting | Saved value | Meaning |\n|---|---|---|\n${project.printSettings.map((setting) => `| ${[setting.label, setting.value, setting.note].map(escape).join(' | ')} |`).join('\n')}\n\nAll 28 objects use extruder/filament slot 1, configured as PETG. The project also contains saved PLA slots. Use the material and temperatures appropriate to your actual filament. Source settings are not a validated profile for another printer.\n\n## Before printing\n\n1. Open [launcher-english.3mf](downloads/launcher-english.3mf).\n2. Select your printer, nozzle, bed, and material profiles.\n3. Keep the geometry at 100% scale in millimeter units.\n4. Inspect each part orientation and the available build volume.\n5. Inspect support painting, thin walls, bridges, and first layers.\n6. Review the full layer preview before exporting printer-specific G-code.\n7. Print the bevel gears separately with a finer layer height.\n8. Inspect the completed parts for cracks, blocked holes, and fit.\n\nThe source recommends a lower bevel-gear layer height but gives no value. First print a small fit-critical part to check your printer and material. Never scale a functional part to fit the bed; that changes shaft, bearing, and fastener fits.\n\n## Plate inventory\n\n| Plate | Objects | Parts |\n|---|---|---|\n${inventory.plates.map((plate) => `| ${plate.plate} | ${plate.objects.length} | ${plate.names.join(', ')} |`).join('\n')}\n\nThe STL pack contains one file per source object, organized by plate. Each STL uses the original build orientation and millimeter coordinates, then moves its minimum XYZ to zero. STL does not retain support painting, plate layout, or slicer settings. The 3MF is the preferred starting point.\n\n## Mesh inspection\n\nThe 28 exported objects contain 1,422,006 triangles. The edge-incidence checks find zero boundary edges, zero non-manifold edges, and zero degenerate triangles. These checks use the shared source vertex indices before binary STL export.\n\nThese checks do not establish wall thickness, correct winding everywhere, self-intersection absence, strength, wheel balance, dimensional accuracy, or physical fit. No printer G-code, material total, or print time is claimed. The [machine-readable report](data/print-inventory.json) includes object dimensions and limitations.\n\n## After printing\n\n1. Remove supports without damaging bearing seats or thin walls.\n2. Remove burrs and loose filament from the ball path.\n3. Measure the shaft bores, insert pockets, and bearing seats.\n4. Install inserts only in confirmed insert pockets.\n5. Keep inserts square and stop at the required depth.\n6. Dry-fit every joint before tightening its fasteners.\n7. Measure a tight bevel-gear bore and correct its fit.\n\nThe original note suggests a lighter for a tight pinion. This guide uses measured fit correction because the source supplies no controlled heating procedure.\n`,
);
write(
  'docs/build-notes.md',
  `# Build status and unresolved details\n\n${project.sourceNote}\n\n## Evidence\n\n- The spreadsheet provides the base hardware list, quantities, and historical shopping notes.\n- Four image annotations provide controller, gear, wheel-rubber, and stopper details.\n- The STEP provides assembly geometry and fastener names.\n- The 3MF provides 28 objects on ten print plates and saved slicer settings.\n- Photographs and video show a physical prototype.\n\nThe source set does not provide a full assembly procedure, terminal-level wiring schematic, or physical test report. The wizard sequence and engineering checks are guide additions.\n\n## Resolve before routine use\n\n${project.openQuestions.map((question) => `- ${question}`).join('\n')}\n\n## Representation differences\n\nThe viewer contains 101 CAD meshes. The print project contains 28 objects. They are separate supplied representations; revision equivalence is unverified. The outlet object name explicitly says revision pending. Names assigned to generic geometry are descriptive identifications.\n\nThe assembly animation translates CAD groups to show suggested order. It does not establish insertion clearances, exact tool access, joint order, or a collision-free assembly path.\n\n## Performance\n\nNo build time, current price, ball capacity, launch rate, range, speed, spin range, accuracy, continuous-duty rating, or lifetime has been verified. Mesh closure is not physical validation.\n\n## Source cleanup\n\nThe original Chinese-named input folder and duplicate root STEP are removed after derivative verification, as requested. English-named working CAD, print files, media, translations, and a historical checksum manifest remain.\n`,
);
write('docs/future-iterations.md', fs.readFileSync('FUTURE.md', 'utf8'));
write(
  'docs/downloads/shopping-list.csv',
  fs.readFileSync('docs/downloads/hardware-bom.csv', 'utf8'),
);
write(
  'docs/shopping-list.md',
  `# Shopping checklist for the complete launcher

This list combines the translated source hardware, photo-based consumables, printing materials, and guide additions for installation and commissioning. Quantities from the spreadsheet are purchase quantities, not verified installed counts.

Before buying, resolve the motor shafts, current ratings, fastener differences, wheel rubber, guards, and support mounting. “Confirm” and “to fit” entries require a measured selection. A complete list of functions is not a verified selection of compatible products.

${['Electronics', 'Fasteners', 'Mechanical', 'Consumables']
  .map(
    (category) => `## ${category}

${project.bom
  .filter((part) => part.category === category)
  .map(
    (part) =>
      `- [ ] **${part.quantity} — ${part.name} (${part.id})**. ${part.spec}.\n  ${part.note} Source: ${part.source}.`,
  )
  .join('\n\n')}`,
  )
  .join('\n\n')}

## Botland sourcing and compatibility

Listings checked ${project.supplierCheckedOn}. Links open the Polish shop. Current prices and stock remain on the linked pages.

${Object.values(project.supplierStatuses)
  .map((status) => `- **${status.label}:** ${status.description}`)
  .join('\n')}

| ID | Botland listing or category | Match status | Fit and purchase notes |
|---|---|---|---|
${project.bom.map((part) => `| ${part.id} | ${part.botland.links.map((link) => `[${escape(link.label)}${link.kind === 'category' ? ' (browse only)' : ''}](${link.url})`).join('<br>') || 'No verified listing'} | ${project.supplierStatuses[part.botland.status].label} | ${escape(part.botland.note)} ${escape(part.botland.orderNote)} |`).join('\n')}

The AKS-23456 kit is shared across H02, H03, and H09. It already lists M3 nuts, so H10 packs can be omitted if using that kit. H18 and H23 can share H21 material when the confirmed design permits it. Do not buy the same kit or spool once per row.

## Tools to borrow or buy

${project.tools.map((tool) => `- [ ] ${tool}`).join('\n')}

Eye protection and a clear trial area with a suitable catch net are also needed for commissioning. Select adhesives compatible with the actual rubber and printed material.

## Before checkout

${project.openQuestions.map((question) => `- [ ] ${question}`).join('\n')}

The website saves gathered-item checkboxes locally on your device. No shop account or purchase is connected. Use the CSV download for a spreadsheet or a printed buying list.
`,
);
const files = [
  'shopping-list.md',
  'future-iterations.md',
  'assembly-guide.md',
  'hardware-bom.md',
  'print-guide.md',
  'wiring-guide.md',
  'translation.md',
  'build-notes.md',
  'attribution.md',
];
writeZip('docs/downloads/english-build-guide.zip', [
  ...files.map((name) => [name, fs.readFileSync(`docs/${name}`)]),
  ['hardware-bom.csv', fs.readFileSync('docs/downloads/hardware-bom.csv')],
  ['shopping-list.csv', fs.readFileSync('docs/downloads/shopping-list.csv')],
  ...fs
    .readdirSync('docs/assets/photos')
    .filter((name) => /\.(webp|png)$/.test(name))
    .map((name) => [`assets/photos/${name}`, fs.readFileSync(`docs/assets/photos/${name}`)]),
  ['data/print-inventory.json', fs.readFileSync('docs/data/print-inventory.json')],
  ['data/source-manifest.json', fs.readFileSync('docs/data/source-manifest.json')],
  ['data/source-bom.json', fs.readFileSync('docs/data/source-bom.json')],
]);
console.log(
  'English assembly, BOM, print guide, build notes, CSV, and documentation ZIP generated.',
);
