export class BaseScene {
  constructor(id) {
    this.id = id;
  }

  getId() {
    return this.id;
  }

  enter(_ctx) {}

  exit(_ctx) {}

  update(_dt, _ctx) {}

  handleAction(_action, _ctx) {}
}
