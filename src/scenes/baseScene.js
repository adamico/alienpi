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

  // Override to return the music sound for this scene.
  // Return null to inherit whatever is already playing.
  getMusic(/* context */) {
    return null;
  }
}
