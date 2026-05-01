export class SceneContext {
  constructor(initial = {}) {
    this._state = {
      gameWon: false,
      lastRunDebrief: null,
      gameOverTime: 0,
      previousState: null,
      ...initial,
    };
  }

  snapshot() {
    return { ...this._state };
  }

  merge(payload = {}) {
    this._state = { ...this._state, ...payload };
    return this.snapshot();
  }

  get(key) {
    return this._state[key];
  }
}
