export class BaseScene {
  constructor(id) {
    this.id = id;
  }

  getId() {
    return this.id;
  }

  enter() {}

  exit() {}

  update() {}

  handleAction() {}

  handleFrame() {
    return false;
  }
}
