const steps = [
  ['Gravity fills the feeder.', 'The bucket stores balls above a rotary metering disk.'],
  [
    'The disk meters a ball.',
    'A 1:220 gearmotor turns the pocketed disk and moves a ball into the feed tube.',
  ],
  [
    'The switch detects the ball.',
    'The microswitch tells the controller that a ball has entered the launch channel. Firmware can coordinate aiming around that event.',
  ],
  [
    'The wheels supply the speed.',
    'The facing wheel surfaces pull the ball toward the exit. Similar surface speeds reduce differential spin in an ideal contact model; slip and tire compression affect the result.',
  ],
  [
    'The servo changes the aim.',
    'A servo and small hinge steer the assembly. The illustrated sequence is explanatory; the original sketch and exact shot timing are unavailable.',
  ],
];
const flow = document.querySelector('#mobile01-flow');
const play = document.querySelector('#mobile01-play');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let step = 0;
let timer;
function render() {
  flow.dataset.step = step;
  document.querySelector('#mobile01-step-count').textContent = `STEP ${step + 1} / ${steps.length}`;
  document.querySelector('#mobile01-step-title').textContent = steps[step][0];
  document.querySelector('#mobile01-step-copy').textContent = steps[step][1];
}
function stop() {
  clearInterval(timer);
  timer = undefined;
  play.setAttribute('aria-pressed', 'false');
  play.textContent = 'Play sequence';
  flow.classList.remove('playing');
}
function advance(direction) {
  step = (step + direction + steps.length) % steps.length;
  render();
}
document.querySelector('#mobile01-prev').addEventListener('click', () => {
  stop();
  advance(-1);
});
document.querySelector('#mobile01-next').addEventListener('click', () => {
  stop();
  advance(1);
});
play.addEventListener('click', () => {
  if (timer) {
    stop();
    return;
  }
  if (reduced.matches) {
    advance(1);
    return;
  }
  play.setAttribute('aria-pressed', 'true');
  play.textContent = 'Pause sequence';
  flow.classList.add('playing');
  timer = setInterval(() => advance(1), 2200);
});
reduced.addEventListener('change', stop);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stop();
});
document.addEventListener('launcherchange', (event) => {
  if (event.detail !== 'mobile01') stop();
});
addEventListener('pagehide', stop);
render();
