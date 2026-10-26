import { LauncherViewer } from './viewer.js';
import { initializeWizard } from './wizard.js';
import { initializeShoppingList, createSupplierCell } from './shopping.js';
import { initializeComponentVisuals } from './component-visuals.js';

const $ = (selector) => document.querySelector(selector);
const [project, inventory, componentManifest] = await Promise.all([
  fetch(new URL('./data/project.json', import.meta.url)).then((response) => {
    if (!response.ok) throw new Error('Cannot load build content');
    return response.json();
  }),
  fetch(new URL('./data/print-inventory.json', import.meta.url)).then((response) => {
    if (!response.ok) throw new Error('Cannot load print inventory');
    return response.json();
  }),
  fetch(new URL('./data/component-visuals.json', import.meta.url)).then((response) => {
    if (!response.ok) throw new Error('Cannot load component image references');
    return response.json();
  }),
]);
const shopping = initializeShoppingList(project.bom);
const componentVisuals = initializeComponentVisuals(componentManifest, renderParts);

function renderParts() {
  const filter = $('.filter-group .selected')?.dataset.filter ?? 'All';
  const query = $('#parts-search').value.trim().toLowerCase();
  const visible = project.bom.filter(
    (part) =>
      (filter === 'All' || part.category === filter) &&
      `${part.name} ${part.spec} ${part.note} ${part.id} ${part.botland.note} ${part.botland.links.map((link) => link.label).join(' ')}`
        .toLowerCase()
        .includes(query),
  );
  $('#parts-body').replaceChildren(
    ...visible.map((part) => {
      const row = document.createElement('tr');
      row.classList.toggle('gathered', shopping.has(part.id));
      const gathered = document.createElement('td');
      gathered.className = 'gathered-cell';
      gathered.append(shopping.checkbox(part));
      const name = document.createElement('td');
      const identification = document.createElement('div');
      identification.className = 'part-identification';
      const copy = document.createElement('div');
      copy.className = 'part-copy';
      const id = document.createElement('span');
      id.className = 'part-id';
      id.textContent = part.id;
      copy.append(id, document.createTextNode(part.name));
      const source = document.createElement('small');
      source.textContent = part.source;
      copy.append(source);
      identification.append(componentVisuals.thumbnail(part), copy);
      name.append(identification);
      const spec = document.createElement('td');
      spec.textContent = part.spec;
      const note = document.createElement('small');
      note.textContent = part.note;
      spec.append(note);
      const quantity = document.createElement('td');
      quantity.textContent = part.quantity;
      row.append(
        gathered,
        name,
        spec,
        quantity,
        createSupplierCell(part.botland, project.supplierStatuses),
      );
      return row;
    }),
  );
  if (!visible.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = 'No parts match this search. Try another word or category.';
    row.append(cell);
    $('#parts-body').append(row);
  }
  $('#parts-count').textContent =
    `${visible.length} of ${project.bom.length} parts shown · quantities follow the source unless labeled as a guide addition`;
}
$('.filter-group').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-filter]');
  if (!button) return;
  document.querySelectorAll('[data-filter]').forEach((item) => {
    item.classList.toggle('selected', item === button);
    item.setAttribute('aria-pressed', String(item === button));
  });
  renderParts();
});
$('#parts-search').addEventListener('input', renderParts);
renderParts();
$('#supplier-checked-on').textContent =
  `Botland listings checked ${project.supplierCheckedOn}. Open a link for current availability.`;
for (const [selector, values] of [
  ['#tool-list', project.tools],
  ['#open-questions', project.openQuestions],
]) {
  $(selector).replaceChildren(
    ...values.map((value) => {
      const li = document.createElement('li');
      li.textContent = value;
      return li;
    }),
  );
}
$('#print-settings').replaceChildren(
  ...project.printSettings.map((setting) => {
    const box = document.createElement('div');
    box.className = 'print-setting';
    const label = document.createElement('span');
    label.textContent = setting.label;
    const value = document.createElement('b');
    value.textContent = setting.value;
    const note = document.createElement('p');
    note.textContent = setting.note;
    box.append(label, value, note);
    return box;
  }),
);
const plateTitles = [
  'Ball hopper',
  'Base enclosure',
  'Base lid',
  'Launch wheels & mounts',
  'Rear drive & linkages',
  'Body half A',
  'Body half B',
  'Flanges, gears & knobs',
  'Feed screw',
  'Launch supports',
];
$('#plate-grid').replaceChildren(
  ...inventory.plates.map((plate, index) => {
    const card = document.createElement('article');
    card.className = 'plate-card';
    const image = document.createElement('img');
    image.loading = 'lazy';
    image.src = `assets/plates/plate-${String(plate.plate).padStart(2, '0')}.png`;
    image.alt = `Original plate ${plate.plate} preview: ${plate.names.join(', ')}`;
    const body = document.createElement('div');
    const tag = document.createElement('span');
    tag.textContent = `PLATE ${String(plate.plate).padStart(2, '0')} / ${plate.objects.length} OBJECT${plate.objects.length === 1 ? '' : 'S'}`;
    const title = document.createElement('h3');
    title.textContent = plateTitles[index];
    const names = document.createElement('p');
    names.textContent = plate.names.join(' · ');
    body.append(tag, title, names);
    card.append(image, body);
    return card;
  }),
);

const hero = new LauncherViewer($('#hero-viewer'), {
  onSelect: (name) => {
    $('#viewer-part').textContent = name;
  },
});
const assembly = new LauncherViewer($('#assembly-viewer'), {
  compact: true,
  onSelect: (name) => {
    $('#assembly-part').textContent = name;
  },
});
const viewerButtons = [...document.querySelectorAll('.viewer-toolbar button')];
viewerButtons.forEach((button) => {
  button.disabled = true;
});
hero.ready.then(() => {
  if ($('#hero-viewer').dataset.ready === 'true')
    viewerButtons.forEach((button) => {
      button.disabled = false;
    });
});
$('#explode').addEventListener('click', () => {
  const enabled = $('#explode').getAttribute('aria-pressed') !== 'true';
  $('#explode').setAttribute('aria-pressed', String(enabled));
  hero.setExploded(enabled);
});
$('#rotate').addEventListener('click', () => {
  const enabled = $('#rotate').getAttribute('aria-pressed') !== 'true';
  $('#rotate').setAttribute('aria-pressed', String(hero.setRotation(enabled)));
});
$('#reset-view').addEventListener('click', () => {
  hero.reset();
  hero.setExploded(false);
  $('#explode').setAttribute('aria-pressed', 'false');
  $('#rotate').setAttribute('aria-pressed', 'false');
  $('#viewer-part').textContent = 'Drag to orbit · Scroll to zoom · Select a part';
});
initializeWizard(project.steps, assembly);
addEventListener('pagehide', (event) => {
  if (!event.persisted) {
    hero.dispose();
    assembly.dispose();
  }
});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (event) => {
  if (event.matches) $('#rotate').setAttribute('aria-pressed', 'false');
});

$('#mechanism-play').addEventListener('click', () => {
  const playing = $('#mechanism-play').getAttribute('aria-pressed') !== 'true';
  $('#mechanism-play').setAttribute('aria-pressed', String(playing));
  $('#mechanism-play').textContent = playing ? 'Pause the mechanism Ⅱ' : 'Play the mechanism →';
  $('#mechanism-diagram').classList.toggle('playing', playing);
});
