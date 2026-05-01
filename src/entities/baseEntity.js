import { vec2, EngineObject, drawTile, Timer } from "../engine.js";
import { engine } from "../config/index.js";
import { sprites } from "../visuals/sprites.js";
import { soundExplosion1, soundExplosion2 } from "../audio/sounds.js";
import { playSfx } from "../audio/soundManager.js";
import * as gameEffects from "../visuals/gameEffects.js";

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

    this.effects = [];

    this.invulnerable = false;
    this.invulnerableTimer = new Timer();
    this.explodeOnDestroy = true;
  }

  /**
   * Adds a visual effect to this entity
    * @param {import('../visuals/gameEffects.js').EntityEffect} effect
   */
  applyEffect(effect) {
    this.effects.push(effect);
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

    // Prune finished effects and update active ones
    this.effects = this.effects.filter((e) => !e.isDone());
    this.effects.forEach((e) => e.update(this));

    if (this.invulnerable && this.invulnerableTimer.elapsed()) {
      this.invulnerable = false;
    }
  }

  destroy(immediate = false) {
    if (this.explodeOnDestroy) {
      playSfx(soundExplosion2);
      playSfx(soundExplosion1);
      gameEffects.explode(this.pos, this.visualSize.x);
    }
    super.destroy(immediate);
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

      // Accumulate offsets from all effects
      let renderPos = this.pos;
      this.effects.forEach((e) => {
        renderPos = renderPos.add(e.getOffset());
      });

      // Effect passes: (Under)
      this.effects.forEach((e) => {
        if (e.renderUnder) e.render(this, renderPos, drawSize);
      });

      // Base pass: Draw normally or split
      if (this.color.a > 0) {
        // V2: If banking, split the sprite in half and darken the leaning side.
        // Requires angle to be exactly 0 to avoid the halves separating during rotation.
        if (this.splitShading && Math.abs(this.splitShading) > 0.05 && !this.mirrorX && this.angle === 0) {
          const shadeAmount = Math.abs(this.splitShading) * 0.5; // Max 50% darker
          
          const leftColor = this.color.copy();
          const rightColor = this.color.copy();
          
          if (this.splitShading < 0) {
            // Moving left: lean left -> left half darker
            leftColor.r *= 1 - shadeAmount;
            leftColor.g *= 1 - shadeAmount;
            leftColor.b *= 1 - shadeAmount;
          } else {
            // Moving right: lean right -> right half darker
            rightColor.r *= 1 - shadeAmount;
            rightColor.g *= 1 - shadeAmount;
            rightColor.b *= 1 - shadeAmount;
          }
          
          const s = this.sprite;
          const leftSprite = { pos: s.pos, size: vec2(s.size.x / 2, s.size.y), textureInfo: s.textureInfo, bleed: s.bleed };
          const rightSprite = { pos: s.pos.add(vec2(s.size.x / 2, 0)), size: vec2(s.size.x / 2, s.size.y), textureInfo: s.textureInfo, bleed: s.bleed };
          
          const baseHalfWidth = drawSize.x / 2;
          const leftWidth = this.splitScale ? baseHalfWidth * this.splitScale.left : baseHalfWidth;
          const rightWidth = this.splitScale ? baseHalfWidth * this.splitScale.right : baseHalfWidth;
          
          const leftPos = renderPos.add(vec2(-leftWidth / 2, 0));
          const rightPos = renderPos.add(vec2(rightWidth / 2, 0));
          
          drawTile(leftPos, vec2(leftWidth, drawSize.y), leftSprite, leftColor, this.angle, false);
          drawTile(rightPos, vec2(rightWidth, drawSize.y), rightSprite, rightColor, this.angle, false);
        } else {
          drawTile(
            renderPos,
            drawSize,
            this.sprite,
            this.color,
            this.angle,
            this.mirrorX,
          );
        }
      }

      // Effect passes: (Over)
      this.effects.forEach((e) => {
        if (!e.renderUnder) e.render(this, renderPos, drawSize);
      });
    }
  }
}
