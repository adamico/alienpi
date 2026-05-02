import { vec2, rgb, drawRect, glDraw, timeReal } from "../engine.js";
import { system, starfield as starCfg, GAME_STATES } from "../config/index.js";
import { Boundary } from "../entities/boundary.js";
import { getGameState } from "./world.js";

const MARQUEE_COLOR = rgb(0.05, 0.05, 0.1);
const PLAYFIELD_COLOR = rgb(0.01, 0.01, 0.02);
const PLAYFIELD_MARGIN = 1;
const MASK_SIZE = 100;

// Precomputed per-star table. Size, x, speed, phase, and rgba depend only on
// `i` (alpha is `sin(i)**alphaPower`), so we bake them once and only animate
// the y offset per frame.
let starsX, starsSize, starsSpeed, starsPhase, starsRgba;
function buildStarTable() {
  const n = starCfg.count;
  starsX = new Float32Array(n);
  starsSize = new Float32Array(n);
  starsSpeed = new Float32Array(n);
  starsPhase = new Float32Array(n);
  starsRgba = new Int32Array(n);
  // rgba layout (little-endian on web): R G B A in low->high bytes.
  // r=g=b=0x80 -> 0x00808080, alpha shifted into the high byte.
  const rgbBase = 0x00808080;
  for (let i = 0; i < n; i++) {
    starsX[i] = i / system.levelSize.x - starCfg.horizontalOffset;
    starsSize[i] = (i % starCfg.sizeRange) + starCfg.sizeBase;
    starsSpeed[i] = starCfg.speedBase + (i ** 2.1 % starCfg.speedRange);
    starsPhase[i] = i ** 2.3;
    const a = Math.sin(i) ** starCfg.alphaPower;
    const aByte = Math.max(0, Math.min(255, (a * 255) | 0));
    starsRgba[i] = (aByte << 24) | rgbBase;
  }
}

export function renderBackground() {
  drawPlayField({ drawStars: getGameState() !== GAME_STATES.POST_RUN });
}

export function renderPostBackground() {
  drawMarquee();
}

/** Background fill + optional scrolling starfield. */
export function drawPlayField({ drawStars = true } = {}) {
  drawRect(system.cameraPos, vec2(100), MARQUEE_COLOR);
  drawRect(
    system.cameraPos,
    vec2(system.levelSize.x + PLAYFIELD_MARGIN * 2, system.levelSize.y * 2),
    PLAYFIELD_COLOR,
  );

  if (!drawStars) return;

  if (!starsX) buildStarTable();
  const t = timeReal;
  const vOff = starCfg.verticalOffset;
  const vRange = starCfg.verticalRange;
  const n = starCfg.count;
  // glDraw with all-zero uvs and rgba=0 paints a solid additive-color quad,
  // matching what drawRect does internally — but skips ASSERTs, screen-space
  // checks, color allocation, and per-call rgbaInt() conversion.
  for (let i = 0; i < n; i++) {
    const y = vOff - ((t * starsSpeed[i] + starsPhase[i]) % vRange);
    const s = starsSize[i];
    glDraw(starsX[i], y, s, s, 0, 0, 0, 0, 0, 0, starsRgba[i]);
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
    new Boundary(vec2(lx / 2, ly + wallThick / 2), vec2(lx * 2, wallThick)),
    new Boundary(vec2(lx / 2, -wallThick / 2), vec2(lx * 2, wallThick)),
  ];
}
