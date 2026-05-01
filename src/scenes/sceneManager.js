export class SceneManager {
  constructor({ initialState, transitionPolicy, context }) {
    this.currentState = initialState;
    this.transitionPolicy = transitionPolicy;
    this.context = context;
    this.stateStack = [];
    this.listeners = new Set();
    this.transitionLog = [];
    this.scenes = new Map();
  }

  getState() {
    return this.currentState;
  }

  getContext() {
    return this.context.snapshot();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  registerScene(scene) {
    this.scenes.set(scene.getId(), scene);
    return scene;
  }

  getScene(state = this.currentState) {
    return this.scenes.get(state);
  }

  recordFrameActions(actions) {
    this.lastFrameActions = actions;
  }

  getTransitionMeta(state = this.currentState) {
    return this.transitionPolicy[state]?.meta || {};
  }

  canTransitionTo(nextState) {
    const rule = this.transitionPolicy[this.currentState];
    if (!rule) return false;
    return rule.canTransitionTo.includes(nextState);
  }

  transitionTo(nextState, payload = {}, reason = "transition") {
    if (!this.canTransitionTo(nextState)) return false;

    const from = this.currentState;
    const fromScene = this.getScene(from);
    const toScene = this.getScene(nextState);

    if (fromScene) fromScene.exit({ from, to: nextState, reason });

    const ctx = this.context.merge({ ...payload, previousState: from });
    this.currentState = nextState;

    if (toScene) {
      toScene.enter({ from, to: nextState, reason, context: ctx });
    }

    const event = {
      at: Date.now(),
      from,
      to: nextState,
      reason,
      payload: { ...payload },
      context: ctx,
    };
    this.transitionLog.push(event);

    for (const listener of this.listeners) listener(event);
    return true;
  }

  pushState(nextState, payload = {}, reason = "push") {
    if (!this.canTransitionTo(nextState)) return false;
    this.stateStack.push(this.currentState);
    return this.transitionTo(nextState, payload, reason);
  }

  popState(payload = {}, reason = "pop") {
    if (!this.stateStack.length) return false;
    const nextState = this.stateStack.pop();
    return this.transitionTo(nextState, payload, reason);
  }

  updateFrame({ actions = [], dt = 0, runtime = {} } = {}) {
    this.recordFrameActions(actions);
    const scene = this.getScene();
    if (!scene) return;

    if (actions.length) {
      scene.handleFrame(actions, {
        dt,
        runtime,
        context: this.getContext(),
        manager: this,
      });
    }

    scene.update(dt, {
      runtime,
      context: this.getContext(),
      manager: this,
    });
  }
}
