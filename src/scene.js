import { vec2, rgb, drawRect, timeReal } from "./engine.js";
import { system, starfield as starCfg } from "./config.js";
import { Boundary } from "./entities/boundary.js";

const MARQUEE_COLOR = rgb(0.05, 0.05, 0.1);
const PLAYFIELD_COLOR = rgb(0.01, 0.01, 0.02);
const PLAYFIELD_MARGIN = 1;
const MASK_SIZE = 100;

/** Background fill + optional scrolling starfield. */
export function drawPlayField({ drawStars = true } = {}) {
  drawRect(system.cameraPos, vec2(100), MARQUEE_COLOR);
  drawRect(
    system.cameraPos,
    vec2(
      system.levelSize.x + PLAYFIELD_MARGIN * 2,
      system.levelSize.y * 2,
    ),
    PLAYFIELD_COLOR,
  );

  if (!drawStars) return;

  const pos = vec2(),
    size = vec2(),
    color = rgb();
  for (let i = starCfg.count; i--; ) {
    const offset =
      timeReal * (starCfg.speedBase + (i ** 2.1 % starCfg.speedRange)) +
      i ** 2.3;
    pos.y = starCfg.verticalOffset - (offset % starCfg.verticalRange);
    pos.x = i / system.levelSize.x - starCfg.horizontalOffset;
    size.x = size.y = (i % starCfg.sizeRange) + starCfg.sizeBase;
    color.set(0.5, 0.5, 0.5, Math.sin(i) ** starCfg.alphaPower);
    drawRect(pos, size, color);
  }
}

/**
 * Masks off areas outside the visible playfield. Pass `skipLeft` when the
 * left side is covered by an HTML overlay (test lab) so we don't waste fill.
 */
export function drawMarquee({ skipLeft = false } = {}) {
  const { x: lx, y: ly } = system.levelSize;
  const maskReach = lx * 5;

  if (!skipLeft) {
    drawRect(
      vec2(-MASK_SIZE / 2 - PLAYFIELD_MARGIN, ly),
      vec2(MASK_SIZE, ly * 3),
      MARQUEE_COLOR,
    );
  }
  drawRect(
    vec2(lx + MASK_SIZE / 2 + PLAYFIELD_MARGIN, ly),
    vec2(MASK_SIZE, ly * 3),
    MARQUEE_COLOR,
  );
  drawRect(
    vec2(lx / 2, ly + PLAYFIELD_MARGIN + MASK_SIZE / 2),
    vec2(maskReach, MASK_SIZE),
    MARQUEE_COLOR,
  );
  drawRect(
    vec2(lx / 2, -PLAYFIELD_MARGIN - MASK_SIZE / 2),
    vec2(maskReach, MASK_SIZE),
    MARQUEE_COLOR,
  );
}

/** Creates the four solid walls that keep the player inside the playfield. */
export function setupBoundaries() {
  const wallThick = 2;
  const { x: lx, y: ly } = system.levelSize;
  const margin = PLAYFIELD_MARGIN;
  return [
    new Boundary(
      vec2(-margin - wallThick / 2, ly / 2),
      vec2(wallThick, ly * 3),
    ),
    new Boundary(
      vec2(lx + margin + wallThick / 2, ly / 2),
      vec2(wallThick, ly * 3),
    ),
    new Boundary(
      vec2(lx / 2, ly + wallThick / 2),
      vec2(lx * 2, wallThick),
    ),
    new Boundary(
      vec2(lx / 2, -wallThick / 2),
      vec2(lx * 2, wallThick),
    ),
  ];
}
