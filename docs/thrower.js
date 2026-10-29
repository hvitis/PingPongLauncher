// Native shadow DOM keeps the upstream viewer's selectors out of other projects.
const panel = document.getElementById('launcher-thrower');
let initialized = false;
let inView = true;
new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }).observe(panel);
const active = (host) => !panel.hidden && !document.hidden && inView && !host.hidden;
function warn(message) {
  const status = document.getElementById('thrower-status');
  status.hidden = false;
  status.textContent = message;
}
async function mount(host, fragment, module) {
  const root = host.attachShadow({ mode: 'open' });
  const response = await fetch(new URL(`thrower/${fragment}.html`, import.meta.url));
  if (!response.ok) throw new Error('Could not load the viewer interface.');
  root.innerHTML = `<link rel="stylesheet" href="${new URL('thrower/viewer.css', import.meta.url)}">${await response.text()}`;
  await Promise.all([...root.querySelectorAll('link')].map((link) => new Promise((resolve, reject) => {
    if (link.sheet) return resolve();
    link.onload = resolve;
    link.onerror = () => reject(new Error('Could not load the viewer styles.'));
  })));
  const controller = await import(new URL(`thrower/${module}.js`, import.meta.url));
  let visible = false;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(host);
  await controller.init(root, { active: () => active(host) && visible, warn });
  return root;
}
async function initialize() {
  if (initialized || panel.hidden) return;
  initialized = true;
  const main = document.getElementById('thrower-workbench');
  const wiring = document.getElementById('thrower-wiring3d');
  try {
    const root = await mount(main, 'main', 'app');
    if (document.getElementById('thrower-status').textContent.startsWith('Open PingPongThrower')) document.getElementById('thrower-status').hidden = true;
    let wiringReady = false;
    root.querySelector('[data-wiring-open]').addEventListener('click', async (event) => {
      event.preventDefault();
      main.hidden = true;
      wiring.hidden = false;
      if (!wiringReady) {
        wiringReady = true;
        try {
          const wiringRoot = await mount(wiring, 'wiring', 'wiring3d');
          wiringRoot.querySelector('[data-wiring-close]').addEventListener('click', (e) => {
            e.preventDefault(); wiring.hidden = true; main.hidden = false;
          });
        } catch (error) { warn(error.message); wiring.hidden = true; main.hidden = false; }
      }
    });
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if (!link || panel.hidden || link.getAttribute('href') !== '#thrower-workbench') return;
      wiring.hidden = true; main.hidden = false;
      root.querySelector(`[data-tab="${link.dataset.throwerView || 'sim'}"]`).click();
    });
  } catch (error) {
    main.hidden = true;
    warn(`The interactive viewer is unavailable. ${error.message} Use the reference and build resources below.`);
  }
}
document.addEventListener('launcherchange', initialize);
initialize();
