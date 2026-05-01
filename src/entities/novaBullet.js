import { drawCircle, drawTile, rgb, time, vec2 } from "../engine.js";
import { bossBullet as bossBulletCfg } from "../config/index.js";
import { Bullet } from "./bullet.js";

export class NovaBullet extends Bullet {
  constructor(pos, vel, damage = 1) {
    super(pos, vel, "bossNova", bossBulletCfg, damage);
  }

  render() {
    const corePulseCfg = this.renderCfg?.corePulse;
    if (!corePulseCfg || !this.sprite) {
      super.render();
      return;
    }

    const drawSize = vec2(
      this.visualSize.x,
      this.mirrorY ? this.visualSize.y : -this.visualSize.y,
    );

    let renderPos = this.pos;
    this.effects.forEach((effect) => {
      renderPos = renderPos.add(effect.getOffset());
    });

    this.effects.forEach((effect) => {
      if (effect.renderUnder) effect.render(this, renderPos, drawSize);
    });

    if (this.color.a > 0) {
      const pulse =
        (Math.sin((time - this.spawnTime) * corePulseCfg.speed) + 1) * 0.5;
      const coreGlowColor = rgb(
        corePulseCfg.glowColor.r,
        corePulseCfg.glowColor.g,
        corePulseCfg.glowColor.b,
        corePulseCfg.glowAlphaBase + pulse * corePulseCfg.glowAlphaPulse,
      );
      const coreColor = rgb(
        corePulseCfg.coreColor.r,
        corePulseCfg.coreColor.g,
        corePulseCfg.coreColor.b,
        corePulseCfg.coreAlphaBase + pulse * corePulseCfg.coreAlphaPulse,
      );

      drawTile(
        renderPos,
        drawSize,
        this.sprite,
        this.color,
        this.angle,
        this.mirrorX,
      );
      drawCircle(
        renderPos,
        this.visualSize.x *
          (corePulseCfg.glowSizeBase + pulse * corePulseCfg.glowSizePulse),
        coreGlowColor,
      );
      drawCircle(
        renderPos,
        this.visualSize.x *
          (corePulseCfg.coreSizeBase + pulse * corePulseCfg.coreSizePulse),
        coreColor,
      );
    }

    this.effects.forEach((effect) => {
      if (!effect.renderUnder) effect.render(this, renderPos, drawSize);
    });
  }
}