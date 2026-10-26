import { readList, writeText } from './storage.js';
const KEY = 'pingpong-shopping-v1';

export function initializeShoppingList(parts) {
  const gathered = new Set(readList(KEY).filter((id) => parts.some((part) => part.id === id)));
  const progress = document.querySelector('#shopping-progress');
  function update() {
    progress.textContent = `${gathered.size} of ${parts.length} items gathered · saved on this device`;
    writeText(KEY, JSON.stringify([...gathered]));
  }
  function checkbox(part) {
    const label = document.createElement('label');
    label.className = 'shopping-checkbox';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = gathered.has(part.id);
    input.setAttribute('aria-label', `${part.name}: gathered`);
    input.dataset.part = part.id;
    input.addEventListener('change', () => {
      if (input.checked) gathered.add(part.id);
      else gathered.delete(part.id);
      input.closest('tr')?.classList.toggle('gathered', input.checked);
      update();
    });
    label.append(input);
    return label;
  }
  document.querySelector('#shopping-reset').addEventListener('click', () => {
    gathered.clear();
    document.querySelectorAll('.shopping-checkbox input').forEach((input) => {
      input.checked = false;
      input.closest('tr')?.classList.remove('gathered');
    });
    update();
  });
  update();
  return { checkbox, has: (id) => gathered.has(id) };
}

// A category link is deliberately distinguished from a verified product listing.
export function createSupplierCell(sourcing, statuses) {
  const cell = document.createElement('td');
  cell.className = 'supplier-cell';
  const badge = document.createElement('span');
  badge.className = `supplier-status status-${sourcing.status}`;
  badge.textContent = statuses[sourcing.status].label;
  cell.append(badge);
  for (const item of sourcing.links) {
    const link = document.createElement('a');
    link.href = item.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = `supplier-link link-${item.kind}`;
    link.textContent = `${item.label} ↗`;
    link.setAttribute('aria-label', `${item.label}, Botland ${item.kind}, opens in a new tab`);
    cell.append(link);
  }
  const details = document.createElement('details');
  details.className = 'supplier-notes';
  const summary = document.createElement('summary');
  summary.textContent = 'Fit and purchase notes';
  const note = document.createElement('p');
  note.textContent = sourcing.note;
  details.append(summary, note);
  if (sourcing.orderNote) {
    const order = document.createElement('p');
    order.textContent = sourcing.orderNote;
    details.append(order);
  }
  cell.append(details);
  return cell;
}
