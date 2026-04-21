import {
  drawLine,
  Color,
} from "../../node_modules/littlejsengine/dist/littlejs.esm.js";
import { weapons } from "../config.js";

/**
 * A single Ghostbuster-style tether. Owned and managed by Player — not an
 * EngineObject, so it doesn't participate in the engine's update/collision
 * loop. Player supplies the origin position each frame.
 */
export class LatchBeam {
  constructor() {
    this.target = null;
    this.damageFrame = 0;
  }

  setTarget(target) {
    if (this.target !== target) {
      this.target = target;
      this.damageFrame = 0;
    }
  }

  clear() {
    this.target = null;
    this.damageFrame = 0;
  }

  tick() {
    if (!this.target || this.target.destroyed || this.target.hp <= 0) {
      this.target = null;
      return;
    }
    const cfg = weapons.latch;
    this.damageFrame++;
    if (this.damageFrame >= cfg.damageInterval) {
      this.damageFrame = 0;
      this.target.hp--;
      if (typeof this.target.applyHitEffect === "function") {
        this.target.applyHitEffect({
          flashColor: new Color(1, 1, 1),
          duration: 0.05,
        });
      }
      if (this.target.hp <= 0) {
        this.target.destroy();
        this.target = null;
      }
    }
  }

  render(fromPos) {
    if (!this.target) return;
    const cfg = weapons.latch;
    drawLine(fromPos, this.target.pos, cfg.lineWidth, cfg.color);
  }
}
