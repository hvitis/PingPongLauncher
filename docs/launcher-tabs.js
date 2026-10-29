const tabs = [...document.querySelectorAll('[role="tab"][data-launcher]')];
const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));
const nav = document.querySelector('.header nav');
const cta = document.querySelector('.header-cta');
const navigation = {
  fqj: [
    ['Explore', 'explore'],
    ['Parts list', 'hardware'],
    ['Print guide', 'printing'],
    ['Assembly', 'build'],
  ],
  mobile01: [
    ['Explore', 'mobile01-explore'],
    ['Parts list', 'mobile01-parts'],
    ['Wiring', 'mobile01-wiring'],
    ['PCB design', 'mobile01-pcb'],
  ],
  thrower: [['Explore', 'thrower-explore'], ['Simulate', 'thrower-workbench'], ['Print files', 'thrower-downloads']],
  hien: [
    ['Explore', 'hien-explore'],
    ['Mechanism', 'hien-mechanism'],
    ['Shot modes', 'hien-modes'],
    ['Parts list', 'hien-parts'],
    ['Wiring', 'hien-wiring'],
    ['Breakout', 'hien-pcb'],
  ],
};
function selectLauncher(id, { updateURL = false, focus = false } = {}) {
  const selected = tabs.find((tab) => tab.dataset.launcher === id) ?? tabs[0];
  id = selected.dataset.launcher;
  tabs.forEach((tab, index) => {
    const active = tab === selected;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    panels[index].hidden = !active;
  });
  nav.replaceChildren(
    ...navigation[id].map(([label, anchor]) => {
      const link = document.createElement('a');
      link.textContent = label;
      link.href = `#${anchor}`;
      return link;
    }),
  );
  cta.href = id === 'fqj' ? '#downloads' : (id === 'mobile01' ? '#mobile01-pcb' : '#hien-pcb');
  if (id === 'thrower') cta.href = '#thrower-downloads';
  cta.textContent = id === 'fqj' ? 'Get the files ↗' : (id === 'mobile01' ? 'PCB & diagrams ↗' : 'Breakout & wiring ↗');
  if (id === 'thrower') cta.textContent = 'Print files ↗';
  if (updateURL) {
    const url = new URL(location.href);
    if (id === 'fqj') url.searchParams.delete('launcher');
    else url.searchParams.set('launcher', id);
    url.hash = '';
    history.pushState(null, '', url);
  }
  if (focus) selected.focus();
  document.dispatchEvent(new CustomEvent('launcherchange', { detail: id }));
}
function fromLocation() {
  const hashTarget = document.getElementById(location.hash.slice(1));
  const targetPanel = hashTarget?.closest('[role="tabpanel"]');
  const id =
    targetPanel?.id.replace('launcher-', '') ?? new URL(location.href).searchParams.get('launcher');
  selectLauncher(id);
  if (targetPanel) requestAnimationFrame(() => hashTarget.scrollIntoView());
}
for (const [index, tab] of tabs.entries()) {
  tab.addEventListener('click', () => selectLauncher(tab.dataset.launcher, { updateURL: true }));
  tab.addEventListener('keydown', (event) => {
    const next = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index + tabs.length - 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    selectLauncher(tabs[next].dataset.launcher, { updateURL: true, focus: true });
  });
}
addEventListener('popstate', fromLocation);
addEventListener('hashchange', fromLocation);
fromLocation();
