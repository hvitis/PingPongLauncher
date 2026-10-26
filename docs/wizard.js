import { readText as safeRead, writeText as safeWrite } from './storage.js';
const STORAGE_KEY = 'pingpong-build-progress-v1';
const STEP_KEY = 'pingpong-build-step-v1';

export function initializeWizard(steps, viewer) {
  const list = document.querySelector('#step-list');
  const complete = document.querySelector('#step-complete');
  let completed;
  try {
    completed = new Set(
      JSON.parse(safeRead(STORAGE_KEY) ?? '[]').filter((id) =>
        steps.some((step) => step.id === id),
      ),
    );
  } catch {
    completed = new Set();
  }
  const hashStep = new URLSearchParams(location.hash.replace(/^#/, '')).get('step');
  let current = Math.max(
    0,
    steps.findIndex((step) => step.id === (hashStep ?? safeRead(STEP_KEY))),
  );

  steps.forEach((step, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span>${step.short}`;
    button.addEventListener('click', () => show(index));
    button.setAttribute('aria-controls', 'step-title');
    list.append(button);
  });

  function updateProgress() {
    document.querySelector('#progress-text').textContent =
      `${completed.size} of ${steps.length} checks complete`;
    document.querySelector('#progress-fill').style.width =
      `${(completed.size / steps.length) * 100}%`;
    Array.from(list.children).forEach((button, index) => {
      button.classList.toggle('done', completed.has(steps[index].id));
      button.classList.toggle('active', current === index);
      if (current === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
      button.setAttribute(
        'aria-label',
        `Step ${index + 1}: ${steps[index].title}${completed.has(steps[index].id) ? ', checked' : ''}`,
      );
    });
  }

  function show(index, { focus = true } = {}) {
    current = index;
    const step = steps[index];
    safeWrite(STEP_KEY, step.id);
    document.querySelector('#step-counter').textContent =
      `STEP ${String(index + 1).padStart(2, '0')} / ${steps.length}`;
    const title = document.querySelector('#step-title');
    title.textContent = step.title;
    document.querySelector('#step-intro').textContent = step.intro;
    const actions = document.querySelector('#step-actions');
    actions.replaceChildren(
      ...step.actions.map((action) => {
        const li = document.createElement('li');
        li.textContent = action;
        return li;
      }),
    );
    document.querySelector('#step-note').textContent = step.note;
    document.querySelector('#step-check-label').textContent = step.check;
    document.querySelector('#step-source').textContent = `Source: ${step.source}`;
    document.querySelector('#step-photo').src = `assets/photos/${step.photo}`;
    document.querySelector('#step-photo').alt = step.caption;
    document.querySelector('#step-caption').textContent = step.caption;
    document.querySelector('#step-prev').disabled = index === 0;
    document.querySelector('#step-next').textContent =
      index === steps.length - 1 ? 'Review checks ↗' : 'Next step →';
    document.querySelector('#guide-finish').hidden = true;
    complete.checked = completed.has(step.id);
    viewer.setStage({ group: step.group, id: step.id });
    updateProgress();
    if (focus) title.focus({ preventScroll: true });
    if (focus && innerWidth < 541)
      document.querySelector('.step-visual').scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        block: 'start',
      });
  }

  complete.addEventListener('change', () => {
    const id = steps[current].id;
    if (complete.checked) completed.add(id);
    else completed.delete(id);
    safeWrite(STORAGE_KEY, JSON.stringify([...completed]));
    updateProgress();
  });
  document.querySelector('#step-prev').addEventListener('click', () => {
    if (current > 0) show(current - 1);
  });
  document.querySelector('#step-next').addEventListener('click', () => {
    if (current < steps.length - 1) show(current + 1);
    else {
      const remaining = steps.findIndex((step) => !completed.has(step.id));
      if (remaining >= 0) show(remaining);
      else document.querySelector('#guide-finish').hidden = false;
    }
  });
  document
    .querySelector('#replay')
    .addEventListener('click', () =>
      viewer.setStage({ group: steps[current].group, id: steps[current].id }),
    );
  document.querySelector('#restart').addEventListener('click', () => {
    completed.clear();
    safeWrite(STORAGE_KEY, '[]');
    show(0);
  });
  viewer.ready.then(() =>
    viewer.setStage({ group: steps[current].group, index: current }, { animate: false }),
  );
  show(current, { focus: false });
}
