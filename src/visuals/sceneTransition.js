import { timeReal } from "../engine.js";

// CRT-style scanline wipe. A black band sweeps top→bottom in two halves:
// first half closes from the top down, midpoint applies the actual scene
// change, second half opens from the top down to reveal the new scene. A
// thin bright line rides the leading edge for the CRT-scanline feel.
//
// Implemented as a DOM overlay so it covers both the canvas and the DOM-based
// UI (menus, HUD) in a single pass.

const DURATION = 0.5;

let active = false;
let startTime = 0;
let pending = null;
let applied = false;
let overlay = null;
let scanline = null;

function ensureOverlay() {
  if (overlay) return;
  overlay = document.createElement("div");
  overlay.id = "scene-wipe";
  overlay.style.cssText = [
    "position:fixed",
    "inset:0",
    "background:#000",
    "z-index:9999",
    "pointer-events:none",
    "display:none",
    "clip-path:inset(0 0 100% 0)",
  ].join(";");

  scanline = document.createElement("div");
  scanline.style.cssText = [
    "position:absolute",
    "left:0",
    "right:0",
    "top:0",
    "height:5px",
    "background:rgba(180,250,255,1)",
    "box-shadow:0 0 24px 8px rgba(120,200,255,0.75), 0 0 48px 16px rgba(80,160,240,0.4)",
    "transform:translateY(0)",
    "will-change:transform",
  ].join(";");
  overlay.appendChild(scanline);
  document.body.appendChild(overlay);
}

export function isSceneTransitioning() {
  return active;
}

/**
 * Kick off a CRT scanline wipe. `applyFn` is invoked at the midpoint of the
 * wipe (when the screen is fully covered), so the actual scene change is
 * hidden behind the curtain.
 */
export function beginSceneWipe(applyFn) {
  if (active) {
    // Already mid-wipe — apply immediately to avoid stacking transitions.
    applyFn?.();
    return;
  }
  ensureOverlay();
  active = true;
  applied = false;
  startTime = timeReal;
  pending = applyFn ?? null;
  overlay.style.display = "block";
}

/** Update the wipe overlay. Call once per frame from a post-render hook. */
export function renderSceneTransition() {
  if (!active) return;

  const elapsed = timeReal - startTime;
  const t = elapsed / DURATION;

  if (t >= 1) {
    if (!applied && pending) pending();
    active = false;
    applied = false;
    pending = null;
    overlay.style.display = "none";
    return;
  }

  const halfway = t >= 0.5;
  if (halfway && !applied) {
    pending?.();
    applied = true;
    pending = null;
  }

  // Phase 1 (t<0.5): cover grows from the top — bottom inset shrinks to 0
  //   so the scanline rides DOWN (top→bottom).
  // Phase 2 (t>=0.5): cover shrinks from the bottom — bottom inset grows
  //   so the scanline rides UP (bottom→top), revealing the new scene
  //   from the bottom upward.
  const topInset = 0;
  const bottomInset = halfway ? (t - 0.5) * 2 * 100 : (1 - t * 2) * 100;
  overlay.style.clipPath = `inset(${topInset}% 0 ${bottomInset}% 0)`;

  // Scanline rides the leading edge of the cover.
  const linePct = 100 - bottomInset;
  scanline.style.transform = `translateY(${linePct}vh)`;
}
