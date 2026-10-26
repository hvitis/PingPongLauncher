import { readText, writeText } from './storage.js';

const MODE_KEY = 'pingpong-component-view-v1';
const scopeLabels = { listing: 'Listing photo', reference: 'Reference', material: 'Material' };

export function initializeComponentVisuals(manifest, onModeChange) {
  let mode = readText(MODE_KEY) === 'svg' ? 'svg' : 'photo';
  const dialog = document.querySelector('#component-dialog');
  const buttons = [...document.querySelectorAll('[data-component-mode]')];
  let opener;

  function updateControls() {
    for (const button of buttons) {
      const selected = button.dataset.componentMode === mode;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      if (mode === button.dataset.componentMode) return;
      mode = button.dataset.componentMode;
      writeText(MODE_KEY, mode);
      updateControls();
      onModeChange();
    });
  }
  updateControls();

  function show(part, trigger) {
    const component = manifest.components[part.id];
    const asset = manifest.assets[component.asset];
    opener = trigger;
    document.querySelector('#component-dialog-id').textContent = `${part.id} / ${scopeLabels[component.scope]}`;
    document.querySelector('#component-dialog-title').textContent = part.name;
    const photo = document.querySelector('#component-dialog-photo');
    photo.src = asset.photo;
    photo.alt = `${part.name}: source photograph. ${component.note}`;
    const svg = document.querySelector('#component-dialog-svg');
    svg.src = component.svg;
    svg.alt = `${part.name}: SVG appearance illustration, not to scale.`;
    document.querySelector('#component-dialog-note').textContent = component.note;
    document.querySelector('#component-dialog-observations').textContent = `Visible features: ${component.observations.join(' · ')}.`;
    document.querySelector('#component-photo-source').href = asset.sourcePage;
    document.querySelector('#component-svg-download').href = component.svg;
    document.querySelector('#component-photo-credit').textContent = `${asset.credit} · reference checked ${asset.checkedOn}`;
    dialog.showModal();
  }

  document.querySelector('#component-dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => { if (opener?.isConnected) opener.focus({ preventScroll: true }); });

  function thumbnail(part) {
    const component = manifest.components[part.id];
    const asset = manifest.assets[component.asset];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'component-thumb';
    button.dataset.componentId = part.id;
    button.setAttribute('aria-label', `View photo and SVG for ${part.name}`);
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', 'component-dialog');
    const image = document.createElement('img');
    image.src = mode === 'photo' ? asset.photo : component.svg;
    image.alt = mode === 'photo' ? `${part.name}: ${scopeLabels[component.scope].toLowerCase()}` : `${part.name}: SVG illustration`;
    image.width = 80;
    image.height = 64;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', () => {
      if (image.dataset.fallback) return;
      image.dataset.fallback = 'true';
      image.src = component.svg;
      image.alt = `${part.name}: SVG illustration; photo unavailable`;
    });
    const label = document.createElement('span');
    label.textContent = mode === 'svg' ? 'SVG diagram' : scopeLabels[component.scope];
    button.append(image, label);
    button.addEventListener('click', () => show(part, button));
    return button;
  }
  return { thumbnail };
}
