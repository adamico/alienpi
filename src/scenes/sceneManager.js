export class SceneManager {
  constructor({ initialState, transitionPolicy, context }) {
    this.currentState = initialState;
    this.transitionPolicy = transitionPolicy;
    this.context = context;
    this.stateStack = [];
    this.listeners = new Set();
    this.transitionLog = [];
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
    const ctx = this.context.merge({ ...payload, previousState: from });
    this.currentState = nextState;

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
    this.stateStack.push(this.currentState);
    return this.transitionTo(nextState, payload, reason);
  }

  popState(payload = {}, reason = "pop") {
    if (!this.stateStack.length) return false;
    const nextState = this.stateStack.pop();
    return this.transitionTo(nextState, payload, reason);
  }
}
