export const engine = {
  minCollisionRadius: 0.4,
  objectMaxSpeed: 0.4,
  worldScale: 0.015,
  slowMo: {
    // Player-hit slow-mo (G6). The engine has no real time-scale knob, so we
    // simulate it by toggling setPaused() each frame at a ratio that ramps
    // from `minScale` back up to 1.0 over `duration`. Re-triggering inside an
    // active effect extends the end time but never past `totalCap`.
    duration: 0.5,
    minScale: 0.25,
    totalCap: 0.8,
    extendRatio: 0.4, // re-entrancy: each retrigger adds duration*extendRatio
  },
};
