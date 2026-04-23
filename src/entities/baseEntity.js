import { vec2, EngineObject, drawTile, Timer } from "../engine.js";
import { engine } from "../config.js";
import { sprites } from "../sprites.js";
import { soundExplosion1, soundExplosion2 } from "../sounds.js";
import * as gameEffects from "../gameEffects.js";

/**
 * Base class for game objects that need visual size distinct from hitbox size.
 * Automatically handles world scaling and hitbox scaling.
 */
export class BaseEntity extends EngineObject {
  /**
   * @param {Vector2} pos
   * @param {string} spriteName
   * @param {string} sheetName
   * @param {number} hitboxScale Scale of hitbox relative to visual size (0 to 1)
   * @param {number|Vector2} [customSize] Optional fixed size (width or vector)
   * @param {boolean} [mirrorX] Whether to mirror the sprite horizontally (across Y axis)
   * @param {boolean} [mirrorY] Whether to mirror the sprite vertically (across X axis)
   */
  constructor(
    pos,
    spriteName,
    sheetName,
    hitboxScale = 1,
    customSize = null,
    mirrorX = false,
    mirrorY = false,
  ) {
    const tile = sprites.get(spriteName, sheetName);

    // Determine visual size: either a custom size or based on world scale
    const visualSize =
      customSize !== null
        ? sprites.getSize(spriteName, sheetName, customSize)
        : tile
          ? tile.size.scale(engine.worldScale)
          : vec2(1);

    // Call super with the scaled hitbox size for physical interactions
    super(pos, visualSize.scale(hitboxScale));

    this.sprite = tile;
    this.visualSize = visualSize;
    this.hitboxScale = hitboxScale;
    this.mirrorX = mirrorX;
    this.mirrorY = mirrorY;

    this.hitEffectTimer = new Timer();
    this.flashTimer = new Timer();
    this.hitConfig = null;

    this.invulnerable = false;
    this.invulnerableTimer = new Timer();
    this.explodeOnDestroy = true;
  }

  /**
   * Applies a universal hit effect
   * @param {Object} config
   * @param {Color} [config.flashColor] - Color to flash (leave undefined for no flash)
   * @param {number} [config.duration=0.1] - Duration in seconds
   * @param {number} [config.entityShake=0] - Amplitude of entity jitter
   * @param {number} [config.screenShake=0] - Amplitude of screen shake
   */
  applyHitEffect(config) {
    this.hitConfig = {
      duration: 0.1,
      entityShake: 0,
      screenShake: 0,
      ...config,
    };
    this.hitEffectTimer.set(this.hitConfig.duration);
    this.flashTimer.set(config.flashDuration ?? this.hitConfig.duration);

    if (this.hitConfig.screenShake > 0) {
      gameEffects.applyScreenShake(
        this.hitConfig.screenShake,
        this.hitConfig.duration,
      );
    }
  }

  /**
   * Starts invulnerability
   * @param {Object} config
   * @param {number} [config.duration=1] - Duration in seconds
   */
  startInvulnerability({ duration = 1 } = {}) {
    this.invulnerable = true;
    this.invulnerableTimer.set(duration);
  }

  update() {
    super.update();

    if (this.hitConfig && this.hitEffectTimer.elapsed()) {
      this.hitConfig = null;
    }

    if (this.invulnerable && this.invulnerableTimer.elapsed()) {
      this.invulnerable = false;
    }
  }

  destroy() {
    if (this.explodeOnDestroy) {
      soundExplosion2.play();
      soundExplosion1.play();
      gameEffects.explode(this.pos, this.visualSize.x);
    }
    super.destroy();
  }

  render() {
    if (this.sprite) {
      // LittleJS drawTile reflects across Y (horizontal flip) if mirror is true.
      // We manually reflect across X (vertical flip) by negating the Y component.
      // Standard mapping for this project uses -y; mirrorY flips this to +y.
      const drawSize = vec2(
        this.visualSize.x,
        this.mirrorY ? this.visualSize.y : -this.visualSize.y,
      );

      let renderPos = this.pos;
      let renderColor = this.color;
      let doFlash = false;
      let flashColor = null;

      if (this.hitConfig && !this.hitEffectTimer.elapsed()) {
        if (this.hitConfig.entityShake > 0) {
          renderPos = this.pos.add(
            gameEffects.getEntityShake(
              this.hitConfig.entityShake,
              this.hitEffectTimer,
            ),
          );
        }

        if (this.hitConfig.flashColor && !this.flashTimer.elapsed()) {
          doFlash = true;
          flashColor = this.hitConfig.flashColor.copy();
          // Smooth fade out
          flashColor.a *= 1 - this.flashTimer.getPercent();
        }
      }

      // Base pass: Draw normally
      drawTile(
        renderPos,
        drawSize,
        this.sprite,
        renderColor,
        this.angle,
        this.mirrorX,
      );

      // Flash pass: Additive
      if (doFlash) {
        gameEffects.drawEntityFlash(
          renderPos,
          drawSize,
          this.sprite,
          flashColor,
          this.angle,
          this.mirrorX,
        );
      }
    }
  }
}
