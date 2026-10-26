import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceSpring } from '../docs/spring.js';
const vector = (x, y = 0, z = 0) => ({ x, y, z });

test('position settles monotonically without overshoot from rest', () => {
  const position = vector(0),
    velocity = vector(0),
    target = vector(1);
  let previous = 0;
  for (let frame = 0; frame < 120; frame++) {
    advanceSpring(position, velocity, target, 1 / 60);
    assert(position.x >= previous && position.x <= 1);
    previous = position.x;
  }
  assert(Math.abs(position.x - 1) < 1e-8);
});

test('retargeting preserves presentation value and release velocity', () => {
  const position = vector(0),
    velocity = vector(0);
  for (let frame = 0; frame < 4; frame++) advanceSpring(position, velocity, vector(1), 1 / 60);
  const before = { ...position },
    moving = { ...velocity };
  advanceSpring(position, velocity, vector(-1), 0);
  assert.deepEqual(position, before);
  assert.deepEqual(velocity, moving);
  for (let frame = 0; frame < 120; frame++) advanceSpring(position, velocity, vector(-1), 1 / 60);
  assert(Math.abs(position.x + 1) < 1e-8);
});

test('settling is consistent across frame rates and independent axes', () => {
  function simulate(rate) {
    const position = vector(0, 4, -2),
      velocity = vector(1, -3, 2),
      target = vector(3, -2, 7);
    for (let frame = 0; frame < rate; frame++) advanceSpring(position, velocity, target, 1 / rate);
    return position;
  }
  const a = simulate(30),
    b = simulate(120);
  for (const axis of ['x', 'y', 'z']) assert(Math.abs(a[axis] - b[axis]) < 1e-10);
});
