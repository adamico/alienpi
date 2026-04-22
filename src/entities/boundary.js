import { EngineObject } from "../engine.js";

/**
 * Boundary object to keep entities within the playfield or act as a kill zone.
 */
export class Boundary extends EngineObject {
  /**
   * @param {Vector2} pos - Position of the boundary
   * @param {Vector2} size - Size of the boundary
   * @param {boolean} [isKillZone=false] - If true, entities touching this might be destroyed (depending on their logic)
   */
  constructor(pos, size, isKillZone = false) {
    super(pos, size);
    this.isKillZone = isKillZone;
    this.isBoundary = true;
    this.setCollision(true, !isKillZone); // Always a collider, only solid if not a kill zone
    this.mass = 0;
  }

  render() {
    // Invisible
  }
}
