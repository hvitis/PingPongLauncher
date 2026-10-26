// Critically damped motion, evaluated analytically on independent axes.
// Retargeting keeps the current presentation position and velocity intact.
export function advanceSpring(position, velocity, target, dt, response = 0.4) {
  const omega = (2 * Math.PI) / response;
  const decay = Math.exp(-omega * dt);
  for (const axis of ['x', 'y', 'z']) {
    const offset = position[axis] - target[axis];
    const blend = velocity[axis] + omega * offset;
    position[axis] = target[axis] + (offset + blend * dt) * decay;
    velocity[axis] = (velocity[axis] - omega * blend * dt) * decay;
  }
}
