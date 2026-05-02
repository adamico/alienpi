/**
 * HTML/CSS overlay for cockpit HUD panels.
 *
 * All text elements (substrate, time, health pips, weapon list) are rendered
 * as absolutely-positioned HTML divs layered over the LittleJS canvas.
 * This lets us use CSS perspective/rotateY to match the angled cockpit art
 * in embed_bg.png without fighting the canvas coordinate system.
 *
 * POSITIONING — all values are in reference px at 1280×720 canvas size.
 * The overlay div matches the canvas's own centering transform so they
 * stay pixel-aligned regardless of browser zoom / window size.
 *
 * Tune the LAYOUT constants to shift text zones over the cockpit screens.
 * Tune PERSP_DEG to adjust the 3-D tilt angle of the panel text.
 */

const PIP_FILLED = "■";
const PIP_EMPTY = "□";

const WEAPON_ORDER = ["vulcan", "shotgun", "latch"];
const WEAPON_DOT_COLOR = { vulcan: "#4af", shotgun: "#f64", latch: "#4f8" };

/**
 * Per-element HUD config.
 * Each element has independent rect, fontScale, and perspective controls.
 */
const ELEMENT_CONFIG = {
  substrate: {
    rect: { left: -26, top: 56, width: 266, height: 50 },
    fontScale: 1.25,
    persp: { deg: 0, dist: "1600px", skew: -8, roll: 13, origin: "left" },
  },
  health: {
    rect: { left: -40, top: 144, width: 154, height: 106 },
    fontScale: 1.8,
    persp: { deg: 0, dist: "1600px", skew: -8, roll: 10, origin: "left" },
  },
  weapons: {
    rect: { left: -19, top: 290, width: 258, height: 182 },
    fontScale: 1.9,
    persp: { deg: 49, dist: "900px", skew: 1, roll: -1, origin: "left" },
  },
  time: {
    rect: { left: 1091, top: 45, width: 227, height: 84 },
    fontScale: 2.05,
    persp: { deg: 0, dist: "1600px", skew: 14, roll: -12, origin: "right" },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Module-level state
// ─────────────────────────────────────────────────────────────────────────────

let overlay = null;
let els = null;

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export function initHudOverlay(container) {
  if (overlay) return;
  overlay = buildOverlay();
  (container ?? document.body).appendChild(overlay);
}

export function getHudOverlayConfig() {
  return structuredClone(ELEMENT_CONFIG);
}

/**
 * Hot-update element constants from preview without a full restart.
 * @param {{ elements?: object }} opts
 */
export function setLayoutConstants({ elements } = {}) {
  if (elements) {
    ["substrate", "health", "weapons", "time"].forEach((key) => {
      const incoming = elements[key];
      if (!incoming) return;
      const current = ELEMENT_CONFIG[key];
      if (incoming.rect) Object.assign(current.rect, incoming.rect);
      if (incoming.fontScale !== undefined)
        current.fontScale = incoming.fontScale;
      if (incoming.persp) {
        if (incoming.persp.deg !== undefined)
          current.persp.deg = incoming.persp.deg;
        if (incoming.persp.dist !== undefined)
          current.persp.dist = pxDist(incoming.persp.dist, current.persp.dist);
        if (incoming.persp.skew !== undefined)
          current.persp.skew = incoming.persp.skew;
        if (incoming.persp.roll !== undefined)
          current.persp.roll = incoming.persp.roll;
      }
    });
  }
  // Rebuild the overlay in place
  if (overlay) {
    const parent = overlay.parentNode;
    const wasVisible = overlay.style.display !== "none";
    overlay.remove();
    overlay = null;
    els = null;
    overlay = buildOverlay();
    overlay.style.display = wasVisible ? "block" : "none";
    parent.appendChild(overlay);
  }
}

export function setHudOverlayVisible(visible) {
  if (!overlay) return;
  overlay.style.display = visible ? "block" : "none";
}

/**
 * Update all overlay elements each frame.
 * @param {{
 *   substrate: number,
 *   gameTime: number,
 *   playerHp: number,
 *   maxHp: number,
 *   weaponLevels: Record<string,number>,
 *   currentWeaponKey: string,
 *   maxLevel: number,
 *   weaponsCfg: object,
 * }} data
 */
export function updateHudOverlay({
  substrate,
  gameTime,
  playerHp,
  maxHp,
  weaponLevels,
  currentWeaponKey,
  maxLevel,
  weaponsCfg,
}) {
  if (!els) return;

  // Substrate
  els.subValue.textContent = fmtNumber(substrate);

  // Time
  const m = Math.floor(gameTime / 60);
  const s = Math.floor(gameTime % 60);
  els.timeValue.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  // Health pips — rebuild only when maxHp changes
  if (els.healthRow.children.length !== maxHp) {
    els.healthRow.innerHTML = "";
    for (let i = 0; i < maxHp; i++) {
      const pip = document.createElement("div");
      Object.assign(pip.style, {
        width: scaledPx(13, ELEMENT_CONFIG.health.fontScale),
        height: scaledPx(13, ELEMENT_CONFIG.health.fontScale),
        borderRadius: "2px",
        flexShrink: "0",
      });
      els.healthRow.appendChild(pip);
    }
  }
  for (let i = 0; i < els.healthRow.children.length; i++) {
    els.healthRow.children[i].style.background =
      i < playerHp ? "#e55" : "#3a2020";
  }

  // Weapons
  els.weaponRows.forEach(({ row, nameEl, pipsEl }, i) => {
    const key = WEAPON_ORDER[i];
    const level = weaponLevels?.[key] ?? 0;
    const active = currentWeaponKey === key;
    const label = weaponsCfg?.[key]?.label ?? key.toUpperCase();

    nameEl.textContent = label;
    pipsEl.textContent =
      PIP_FILLED.repeat(level) + PIP_EMPTY.repeat(maxLevel - level);

    if (level === 0) {
      applyWeaponRowStyle(row, nameEl, pipsEl, "locked");
    } else if (active) {
      applyWeaponRowStyle(row, nameEl, pipsEl, "active");
    } else {
      applyWeaponRowStyle(row, nameEl, pipsEl, "idle");
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DOM construction
// ─────────────────────────────────────────────────────────────────────────────

function buildOverlay() {
  const root = document.createElement("div");
  Object.assign(root.style, {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "1280px",
    height: "720px",
    pointerEvents: "none",
    userSelect: "none",
    display: "none",
    zIndex: "10",
    fontFamily: '"Orbitron", "Exo 2", monospace',
  });

  const substrateStyle = elementStyle("substrate");
  const healthStyle = elementStyle("health");
  const weaponsStyle = elementStyle("weapons");
  const timeStyle = elementStyle("time");

  // ── Left mid screen: substrate + health ─────────────────────────────────

  const leftSub = zone(ELEMENT_CONFIG.substrate.rect, substrateStyle);

  const subLine = document.createElement("div");
  Object.assign(subLine.style, {
    display: "flex",
    alignItems: "baseline",
    gap: "8px",
    padding: "7px 10px 0",
  });

  const subLabel = textEl("SUBSTRATE", {
    fontSize: scaledPx(9, ELEMENT_CONFIG.substrate.fontScale),
    letterSpacing: "1.5px",
    color: "#5eda8a",
  });
  subLine.appendChild(subLabel);

  const subValue = textEl("0", {
    fontSize: scaledPx(17, ELEMENT_CONFIG.substrate.fontScale),
    fontWeight: "700",
    color: "#6fffa0",
    lineHeight: "1",
    textShadow: "0 0 8px #3f8",
  });
  subLine.appendChild(subValue);
  leftSub.appendChild(subLine);

  root.appendChild(leftSub);

  const leftMid = zone(ELEMENT_CONFIG.health.rect, healthStyle);

  const healthRow = document.createElement("div");
  Object.assign(healthRow.style, {
    display: "flex",
    gap: "5px",
    padding: "6px 10px 0",
  });
  leftMid.appendChild(healthRow);
  root.appendChild(leftMid);

  // ── Left main screen: weapon list ────────────────────────────────────────

  const leftMain = zone(ELEMENT_CONFIG.weapons.rect, {
    ...weaponsStyle,
    padding: "8px 6px",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  });

  const weaponRows = WEAPON_ORDER.map((key) => {
    const row = document.createElement("div");
    Object.assign(row.style, {
      display: "flex",
      alignItems: "center",
      gap: "7px",
      padding: "5px 6px",
      borderRadius: "4px",
      flex: "1",
      transition: "background 0.12s",
    });

    const dot = document.createElement("div");
    Object.assign(dot.style, {
      width: scaledPx(17, ELEMENT_CONFIG.weapons.fontScale),
      height: scaledPx(17, ELEMENT_CONFIG.weapons.fontScale),
      borderRadius: "3px",
      flexShrink: "0",
      background: WEAPON_DOT_COLOR[key],
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: scaledPx(9, ELEMENT_CONFIG.weapons.fontScale),
      fontWeight: "900",
      color: "#000",
    });
    dot.textContent = key[0].toUpperCase();
    row.appendChild(dot);

    const nameEl = document.createElement("div");
    Object.assign(nameEl.style, {
      fontSize: scaledPx(11, ELEMENT_CONFIG.weapons.fontScale),
      minWidth: "58px",
      letterSpacing: "0.5px",
    });
    row.appendChild(nameEl);

    const pipsEl = document.createElement("div");
    Object.assign(pipsEl.style, {
      fontSize: scaledPx(11, ELEMENT_CONFIG.weapons.fontScale),
      letterSpacing: "2px",
      marginLeft: "auto",
    });
    row.appendChild(pipsEl);

    leftMain.appendChild(row);
    return { row, nameEl, pipsEl };
  });

  root.appendChild(leftMain);

  // ── Right mid screen: time ───────────────────────────────────────────────

  const rightMid = zone(ELEMENT_CONFIG.time.rect, {
    ...timeStyle,
    textAlign: "left",
  });

  const timeLine = document.createElement("div");
  Object.assign(timeLine.style, {
    display: "flex",
    alignItems: "baseline",
    gap: "8px",
    padding: "7px 10px 0",
  });

  const timeLabel = textEl("TIME", {
    fontSize: scaledPx(9, ELEMENT_CONFIG.time.fontScale),
    letterSpacing: "1.5px",
    color: "#bbd",
  });
  timeLine.appendChild(timeLabel);

  const timeValue = textEl("00:00", {
    fontSize: scaledPx(17, ELEMENT_CONFIG.time.fontScale),
    fontWeight: "700",
    color: "#e8e8ff",
    lineHeight: "1",
    textShadow: "0 0 8px #88f",
  });
  timeLine.appendChild(timeValue);
  rightMid.appendChild(timeLine);

  root.appendChild(rightMid);

  els = { subValue, healthRow, weaponRows, timeValue };
  return root;
}

// ─────────────────────────────────────────────────────────────────────────────
// Style helpers
// ─────────────────────────────────────────────────────────────────────────────

function zone(rect, extraStyle = {}) {
  const d = document.createElement("div");
  Object.assign(d.style, {
    position: "absolute",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    overflow: "hidden",
    boxSizing: "border-box",
    ...extraStyle,
  });
  return d;
}

function textEl(content, styleProps) {
  const d = document.createElement("div");
  Object.assign(d.style, styleProps);
  d.textContent = content;
  return d;
}

function panelTransform(deg, dist, origin, skewDeg = 0, rollDeg = 0) {
  return {
    transform: `perspective(${dist}) rotateY(${deg}deg) skewX(${skewDeg}deg) rotateZ(${rollDeg}deg)`,
    transformOrigin: `${origin} center`,
  };
}

function elementStyle(key) {
  const cfg = ELEMENT_CONFIG[key];
  return panelTransform(
    cfg.persp.deg,
    cfg.persp.dist,
    cfg.persp.origin,
    cfg.persp.skew ?? 0,
    cfg.persp.roll ?? 0,
  );
}

function scaledPx(basePx, scale = 1) {
  return `${Math.round(basePx * scale * 100) / 100}px`;
}

function pxDist(value, fallback) {
  if (typeof value === "number") return `${value}px`;
  if (typeof value === "string" && value.trim()) {
    return /px$/.test(value.trim()) ? value.trim() : `${value.trim()}px`;
  }
  return fallback;
}

function applyWeaponRowStyle(row, nameEl, pipsEl, state) {
  if (state === "locked") {
    row.style.background = "transparent";
    row.style.outline = "none";
    row.style.opacity = "0.3";
    nameEl.style.color = "#888";
    pipsEl.style.color = "#666";
  } else if (state === "active") {
    row.style.background = "rgba(50,200,70,0.15)";
    row.style.outline = "1px solid rgba(80,220,80,0.45)";
    row.style.opacity = "1";
    nameEl.style.color = "#6f6";
    pipsEl.style.color = "#5e5";
  } else {
    row.style.background = "transparent";
    row.style.outline = "none";
    row.style.opacity = "0.75";
    nameEl.style.color = "#ccc";
    pipsEl.style.color = "#aaa";
  }
}

function fmtNumber(n) {
  return Math.floor(n).toLocaleString();
}
