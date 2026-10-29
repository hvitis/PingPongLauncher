const steps = [
  [
    'Gravity fills the hopper.',
    'The translucent bucket holds practice balls above the intake throat. An agitator disk stirred by the first servo prevents ball bridging.',
  ],
  [
    'The gate meters a single ball.',
    'The escapement servo actuates a feed stop, releasing one ball at a time down the curved 3D-printed throat.',
  ],
  [
    'Gravity drops the ball into the barrel.',
    'The ball rolls down the feed curve (feed_curve v105) into the launch tube directly between the twin wheels.',
  ],
  [
    'Twin DT750 flywheels launch the ball.',
    'Counter-rotating BaneBots orange rubber wheels accelerate the ball. Speed differential between the top and bottom motors creates topspin or backspin.',
  ],
  [
    'Pan and tilt servos vector the shot.',
    'An aluminum turntable bearing and elevation tilt quadrant steer the trajectory. In Service mode it bounces on the home side; in Attack mode it drives flat over the net.',
  ],
];

const modes = {
  service: {
    title: 'Service Mode',
    aim: 'Downward pitch (-12°)',
    spin: 'Moderate topspin (top wheel 3800 RPM, bottom 3200 RPM)',
    trajectory: 'Ball strikes the near table half first, clears the net, and lands deep in the opponent court.',
  },
  attack: {
    title: 'Attack Mode',
    aim: 'Direct flat pitch (+5°)',
    spin: 'Heavy topspin (top wheel 5400 RPM, bottom 3600 RPM)',
    trajectory: 'High velocity offensive drive flying straight over the net to target corners with diving Magnus curvature.',
  },
  backspin: {
    title: 'Backspin Chop',
    aim: 'Slight upward pitch (+3°)',
    spin: 'Heavy backspin (top wheel 3000 RPM, bottom 4800 RPM)',
    trajectory: 'Under-spinning floating trajectory that bites and stays low after bouncing on the opponent half.',
  },
  swing: {
    title: 'Oscillating Swing',
    aim: 'Horizontal sweep (-22° to +22°)',
    spin: 'Selectable topspin / flat drive',
    trajectory: 'Turntable sweeps smoothly across table width, alternating between forehand, middle, and backhand targets.',
  },
};

const flow = document.querySelector('#hien-flow');
const play = document.querySelector('#hien-play');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let step = 0;
let timer;

function renderStep() {
  if (!flow) return;
  flow.dataset.step = step;
  const countEl = document.querySelector('#hien-step-count');
  const titleEl = document.querySelector('#hien-step-title');
  const copyEl = document.querySelector('#hien-step-copy');
  if (countEl) countEl.textContent = `STEP ${step + 1} / ${steps.length}`;
  if (titleEl) titleEl.textContent = steps[step][0];
  if (copyEl) copyEl.textContent = steps[step][1];
}

function stopSequence() {
  if (timer) {
    clearInterval(timer);
    timer = undefined;
  }
  if (play) {
    play.setAttribute('aria-pressed', 'false');
    play.textContent = 'Play sequence';
  }
  if (flow) flow.classList.remove('playing');
}

function advanceStep(direction) {
  step = (step + direction + steps.length) % steps.length;
  renderStep();
}

const prevBtn = document.querySelector('#hien-prev');
const nextBtn = document.querySelector('#hien-next');

if (prevBtn) {
  prevBtn.addEventListener('click', () => {
    stopSequence();
    advanceStep(-1);
  });
}

if (nextBtn) {
  nextBtn.addEventListener('click', () => {
    stopSequence();
    advanceStep(1);
  });
}

if (play) {
  play.addEventListener('click', () => {
    if (timer) {
      stopSequence();
      return;
    }
    if (reduced.matches) {
      advanceStep(1);
      return;
    }
    play.setAttribute('aria-pressed', 'true');
    play.textContent = 'Pause sequence';
    if (flow) flow.classList.add('playing');
    timer = setInterval(() => advanceStep(1), 2200);
  });
}

// Interactive mode explorer buttons
const modeButtons = document.querySelectorAll('[data-hien-mode]');
const modeTitleEl = document.querySelector('#hien-mode-title');
const modeAimEl = document.querySelector('#hien-mode-aim');
const modeSpinEl = document.querySelector('#hien-mode-spin');
const modeTrajEl = document.querySelector('#hien-mode-traj');
const modeDiagram = document.querySelector('#hien-mode-diagram');

modeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.hienMode;
    const info = modes[key];
    if (!info) return;
    modeButtons.forEach((b) => {
      const active = b === btn;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    if (modeTitleEl) modeTitleEl.textContent = info.title;
    if (modeAimEl) modeAimEl.textContent = info.aim;
    if (modeSpinEl) modeSpinEl.textContent = info.spin;
    if (modeTrajEl) modeTrajEl.textContent = info.trajectory;
    if (modeDiagram) modeDiagram.dataset.mode = key;
  });
});

reduced.addEventListener('change', stopSequence);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopSequence();
});
document.addEventListener('launcherchange', (event) => {
  if (event.detail !== 'hien') stopSequence();
});
addEventListener('pagehide', stopSequence);

renderStep();
