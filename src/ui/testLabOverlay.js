/**
 * Test Lab DOM side-panel.
 *
 * Injected into the page only while the TEST_LAB scene is active.
 * All DOM is created and destroyed via initTestLabOverlay / destroyTestLabOverlay.
 * updateTestLabOverlay() must be called each frame (from TestLabScene.update).
 */

import {
  mousePosScreen,
  screenToWorld,
  engineObjects,
  Color,
} from "../engine.js";
import {
  system,
  enemy as enemyCfg,
  boss as bossCfg,
  orbiter as orbCfg,
  missile as missileCfg,
  player as playerCfg,
} from "../config/index.js";
import { player } from "../entities/player.js";
import { BaseEntity } from "../entities/baseEntity.js";
import { Enemy } from "../entities/enemy.js";
import { Boss } from "../entities/boss.js";
import { BossOrbiter } from "../entities/bossOrbiter.js";
import { BossMissile } from "../entities/bossMissile.js";
import { Loot } from "../entities/loot.js";
import { Bullet } from "../entities/bullet.js";
import * as gameEffects from "../visuals/gameEffects.js";
import { getCurrentBoss, setCurrentBoss } from "../game/world.js";

// ─────────────────────────────────────────────────────────────────────────────
// Module state — reset on each init/destroy cycle
// ─────────────────────────────────────────────────────────────────────────────

let panel = null;
let behaviorEnabled = true;
let exitCallback = null;
let _pendingSpawnPos = null;
let _clickHandler = null;

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export function initTestLabOverlay(onExit) {
  if (!DEV_BUILD) return;
  behaviorEnabled = true;
  exitCallback = onExit ?? null;
  _pendingSpawnPos = null;
  panel = buildPanel();
  document.body.appendChild(panel);
  setupListeners();

  // Use a direct DOM mousedown listener (bubble phase, runs after LittleJS's
  // own listener so mousePosScreen is already updated) to detect spawn clicks.
  // This avoids relying on mouseWasPressed inside gameUpdatePost where timing
  // could cause missed frames.
  _clickHandler = (e) => {
    if (!panel || panel.contains(e.target)) return;
    const worldPos = screenToWorld(mousePosScreen.copy());
    const { x: lx, y: ly } = system.levelSize;
    if (
      worldPos.x > 0 &&
      worldPos.x < lx &&
      worldPos.y > 0 &&
      worldPos.y < ly
    ) {
      _pendingSpawnPos = worldPos;
    }
  };
  document.addEventListener("mousedown", _clickHandler);
}

export function destroyTestLabOverlay() {
  if (!DEV_BUILD || !panel) return;
  panel.remove();
  panel = null;
  exitCallback = null;
  _pendingSpawnPos = null;
  if (_clickHandler) {
    document.removeEventListener("mousedown", _clickHandler);
    _clickHandler = null;
  }
}

/**
 * Call each frame from TestLabScene.update().
 * Handles click-to-spawn and per-frame boss + weapon sync.
 */
export function updateTestLabOverlay() {
  if (!DEV_BUILD || !panel) return;

  // Process spawn queued by the DOM mousedown listener
  if (_pendingSpawnPos) {
    handleSpawnAt(_pendingSpawnPos);
    _pendingSpawnPos = null;
  }

  // Auto-clear HUD boss bar when boss dies
  const trackedBoss = getCurrentBoss();
  if (trackedBoss && trackedBoss.destroyed) {
    setCurrentBoss(null);
  }

  // Mirror live weapon levels into the inputs
  if (player) syncWeaponLevelInputs();
}

// ─────────────────────────────────────────────────────────────────────────────
// DOM construction
// ─────────────────────────────────────────────────────────────────────────────

function buildPanel() {
  const root = document.createElement("div");
  root.id = "test-lab-panel";
  Object.assign(root.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "280px",
    height: "100vh",
    background: "rgba(15, 15, 25, 0.9)",
    backdropFilter: "blur(12px)",
    borderRight: "1px solid rgba(255,255,255,0.1)",
    display: "flex",
    flexDirection: "column",
    padding: "24px",
    boxSizing: "border-box",
    zIndex: "100",
    boxShadow: "10px 0 30px rgba(0,0,0,0.5)",
    pointerEvents: "auto",
    overflowY: "auto",
    color: "#fff",
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    fontSize: "14px",
  });

  root.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;">
      <h1 style="font-size:1.4rem;margin:0;background:linear-gradient(135deg,#4facfe,#00f2fe);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:2px;text-transform:uppercase;font-weight:800;">
        Test Lab
      </h1>
      <button id="tl-exit" title="Back to Title (Esc)" style="background:transparent;border:1px solid rgba(255,255,255,0.15);color:#888;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:0.75rem;letter-spacing:0.5px;white-space:nowrap;">
        ← Title
      </button>
    </div>

    <div style="margin-bottom:28px;">
      <label style="display:block;margin-bottom:10px;font-size:0.75rem;color:#888;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Entity Template</label>
      <select id="tl-entity-select" style="width:100%;background:#1a1a2e;border:1px solid rgba(255,255,255,0.1);color:#fff;padding:12px;border-radius:8px;outline:none;cursor:pointer;font-size:0.9rem;">
        <optgroup label="Enemies">
          <option value="type1">Shooter Drone</option>
          <option value="type2">Heavy Tank</option>
          <option value="type3">Dive Bomber</option>
          <option value="boss">Mothership Boss</option>
          <option value="boss_no_orbiters">Mothership (No Orbiters)</option>
          <option value="orbiter">Boss Orbiter</option>
          <option value="orbiter_looter">Boss Orbiter (Loot)</option>
          <option value="missile">Homing Missile</option>
        </optgroup>
        <optgroup label="Loot">
          <option value="loot_blue">Blue Power Bolt</option>
          <option value="loot_green">Green Power Bolt</option>
          <option value="loot_red">Red Power Bolt</option>
          <option value="loot_star">Yellow Star</option>
        </optgroup>
      </select>
    </div>

    <div style="margin-bottom:28px;">
      <label style="display:block;margin-bottom:10px;font-size:0.75rem;color:#888;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Spawn HP</label>
      <div style="display:flex;align-items:center;gap:10px;">
        <button id="tl-hp-minus" style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.1);color:#00f2fe;width:44px;height:44px;border-radius:8px;cursor:pointer;font-size:1.4rem;font-weight:bold;">−</button>
        <input type="number" id="tl-hp-input" value="1" min="1" max="9999"
          style="flex:1;background:#1a1a2e;border:1px solid rgba(255,255,255,0.1);color:#fff;padding:10px;border-radius:8px;text-align:center;font-size:1.1rem;font-family:monospace;outline:none;appearance:textfield;-moz-appearance:textfield;" />
        <button id="tl-hp-plus" style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.1);color:#00f2fe;width:44px;height:44px;border-radius:8px;cursor:pointer;font-size:1.4rem;font-weight:bold;">+</button>
      </div>
    </div>

    <div style="margin-bottom:28px;">
      <label style="display:flex;align-items:center;gap:12px;cursor:pointer;font-size:0.85rem;color:#888;user-select:none;">
        <input type="checkbox" id="tl-behavior-toggle" checked style="width:18px;height:18px;cursor:pointer;" />
        Enable AI / Behavior
      </label>
    </div>

    <div style="margin-bottom:28px;">
      <button id="tl-clear" style="width:100%;background:#1a1a2e;border:1px solid rgba(255,255,255,0.1);color:#00f2fe;height:40px;border-radius:8px;cursor:pointer;font-size:0.85rem;letter-spacing:1px;text-transform:uppercase;">
        Clear Spawned Entities
      </button>
    </div>

    <div style="margin-bottom:28px;">
      <div style="font-size:0.75rem;color:#888;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;margin-bottom:12px;">Weapon Levels</div>
      ${weaponRow("vulcanLevel", "Vulcan", 1)}
      ${weaponRow("shotgunLevel", "Shotgun", 0)}
      ${weaponRow("latchLevel", "Beam", 0)}
    </div>

    <div style="margin-top:auto;font-size:0.8rem;color:#555;line-height:1.6;border-top:1px solid rgba(255,255,255,0.05);padding-top:20px;">
      <p style="margin:8px 0;"><kbd style="background:#222;padding:2px 6px;border-radius:4px;color:#bbb;border:1px solid #333;font-family:monospace;">Left Click</kbd> Spawn at cursor</p>
      <p style="margin:8px 0;"><kbd style="background:#222;padding:2px 6px;border-radius:4px;color:#bbb;border:1px solid #333;font-family:monospace;">WASD</kbd> Move Ship</p>
      <p style="margin:8px 0;"><kbd style="background:#222;padding:2px 6px;border-radius:4px;color:#bbb;border:1px solid #333;font-family:monospace;">Space</kbd> Primary Fire</p>
      <p style="margin:8px 0;"><kbd style="background:#222;padding:2px 6px;border-radius:4px;color:#bbb;border:1px solid #333;font-family:monospace;">Q</kbd> Switch Weapon</p>
      <p style="margin:8px 0;"><kbd style="background:#222;padding:2px 6px;border-radius:4px;color:#bbb;border:1px solid #333;font-family:monospace;">Esc</kbd> Back to title</p>
    </div>
  `;

  // Block engine input capture for all UI events on the panel
  [
    "mousedown",
    "mouseup",
    "click",
    "mousemove",
    "contextmenu",
    "wheel",
    "keydown",
    "keyup",
    "change",
  ].forEach((ev) => root.addEventListener(ev, (e) => e.stopPropagation()));

  return root;
}

function weaponRow(id, label, defaultVal) {
  return `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
      <span style="width:60px;font-size:0.8rem;color:#888;">${label}:</span>
      <button class="tl-weapon-btn" data-target="${id}" data-delta="-1"
        style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.1);color:#00f2fe;width:30px;height:30px;border-radius:6px;cursor:pointer;font-weight:bold;">-</button>
      <input type="number" id="${id}" value="${defaultVal}" min="0" max="3"
        style="width:48px;background:#1a1a2e;border:1px solid rgba(255,255,255,0.1);color:#fff;padding:4px;border-radius:6px;text-align:center;font-family:monospace;outline:none;appearance:textfield;-moz-appearance:textfield;" />
      <button class="tl-weapon-btn" data-target="${id}" data-delta="1"
        style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.1);color:#00f2fe;width:30px;height:30px;border-radius:6px;cursor:pointer;font-weight:bold;">+</button>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Event wiring
// ─────────────────────────────────────────────────────────────────────────────

function setupListeners() {
  const maxWepLevel = playerCfg.weaponSystem.maxLevel;
  ["vulcanLevel", "shotgunLevel", "latchLevel"].forEach((id) => {
    const el = panel.querySelector(`#${id}`);
    if (el) el.max = maxWepLevel;
  });

  panel.querySelector("#tl-hp-plus").addEventListener("click", () => {
    const el = panel.querySelector("#tl-hp-input");
    el.value = parseInt(el.value) + 1;
  });

  panel.querySelector("#tl-hp-minus").addEventListener("click", () => {
    const el = panel.querySelector("#tl-hp-input");
    el.value = Math.max(1, parseInt(el.value) - 1);
  });

  panel.querySelector("#tl-behavior-toggle").addEventListener("change", (e) => {
    behaviorEnabled = e.target.checked;
  });

  panel.querySelector("#tl-exit").addEventListener("click", () => {
    exitCallback?.();
  });

  panel.querySelector("#tl-clear").addEventListener("click", () => {
    const SPAWNED = [Enemy, Boss, BossOrbiter, BossMissile, Loot, Bullet];
    for (const obj of engineObjects.slice()) {
      if (SPAWNED.some((C) => obj instanceof C)) obj.destroy();
    }
    setCurrentBoss(null);
  });

  panel.querySelector("#tl-entity-select").addEventListener("change", (e) => {
    const type = e.target.value;
    const hpInput = panel.querySelector("#tl-hp-input");
    if (type.startsWith("type")) hpInput.value = enemyCfg.swarm[type].hp;
    else if (type === "boss" || type === "boss_no_orbiters")
      hpInput.value = bossCfg.hp;
    else if (type === "orbiter" || type === "orbiter_looter")
      hpInput.value = orbCfg.baseHp;
    else if (type === "missile") hpInput.value = missileCfg.hp;
    else hpInput.value = 1;
  });

  const WEAPON_KEYS = {
    vulcanLevel: "vulcan",
    shotgunLevel: "shotgun",
    latchLevel: "latch",
  };

  panel.querySelectorAll(".tl-weapon-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      const delta = parseInt(btn.dataset.delta);
      const weaponKey = WEAPON_KEYS[targetId];
      const input = panel.querySelector(`#${targetId}`);
      const newValue = Math.min(
        maxWepLevel,
        Math.max(0, parseInt(input.value) + delta),
      );
      input.value = newValue;

      if (delta > 0 && player) {
        while (player.weaponLevels[weaponKey] < newValue) {
          player.upgradeWeapon(weaponKey);
        }
        player.updateWeaponSprite();
      } else {
        applyWeaponLevels();
      }
    });
  });

  ["vulcanLevel", "shotgunLevel", "latchLevel"].forEach((id) => {
    panel.querySelector(`#${id}`).addEventListener("change", applyWeaponLevels);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-frame helpers
// ─────────────────────────────────────────────────────────────────────────────

function applyWeaponLevels() {
  if (!player) return;
  player.weaponLevels.vulcan = parseInt(
    panel.querySelector("#vulcanLevel").value,
  );
  player.weaponLevels.shotgun = parseInt(
    panel.querySelector("#shotgunLevel").value,
  );
  player.weaponLevels.latch = parseInt(
    panel.querySelector("#latchLevel").value,
  );

  if (player.weaponLevels[player.currentWeaponKey] === 0) {
    for (const key of ["vulcan", "shotgun", "latch"]) {
      if (player.weaponLevels[key] > 0) {
        player.weaponIndex = ["vulcan", "shotgun", "latch"].indexOf(key);
        break;
      }
    }
  }
  player.updateWeaponSprite();
}

const WEAPON_INPUT_IDS = {
  vulcan: "vulcanLevel",
  shotgun: "shotgunLevel",
  latch: "latchLevel",
};

function syncWeaponLevelInputs() {
  for (const [key, id] of Object.entries(WEAPON_INPUT_IDS)) {
    const el = panel?.querySelector(`#${id}`);
    if (!el || document.activeElement === el) continue;
    const level = String(player.weaponLevels[key] ?? 0);
    if (el.value !== level) el.value = level;
  }
}

function handleSpawnAt(spawnPos) {
  const entityType = panel.querySelector("#tl-entity-select").value;
  const hpValue = parseInt(panel.querySelector("#tl-hp-input").value) || 1;

  let entity = null;

  if (entityType.startsWith("type")) {
    entity = new Enemy(spawnPos.copy(), entityType);
    entity.hp = hpValue;
  } else if (entityType === "boss" || entityType === "boss_no_orbiters") {
    entity = new Boss(spawnPos.copy());
    entity.pos = spawnPos.copy();
    entity.hp = hpValue;
    entity.maxHp = hpValue;
    entity.state = "active";
    if (entityType === "boss") entity.initOrbiters();
    setCurrentBoss(entity);
  } else if (entityType === "orbiter") {
    entity = new BossOrbiter(0, hpValue, false, spawnPos.copy());
  } else if (entityType === "orbiter_looter") {
    entity = new BossOrbiter(0, hpValue, true, spawnPos.copy());
  } else if (entityType === "missile") {
    entity = new BossMissile(spawnPos.copy());
    entity.hp = hpValue;
  } else if (entityType.startsWith("loot_")) {
    entity = new Loot(spawnPos.copy(), entityType.replace("loot_", ""));
  }

  if (entity) {
    const originalUpdate = entity.update;
    entity.update = function () {
      if (behaviorEnabled) {
        originalUpdate.call(this);
      } else {
        BaseEntity.prototype.update.call(this);
      }
    };
    entity.applyEffect(new gameEffects.FlashEffect(new Color(1, 1, 1), 0.2));
    console.log(
      `[TEST LAB] Spawned ${entityType} at ${spawnPos.x.toFixed(1)}, ${spawnPos.y.toFixed(1)} with ${hpValue} HP`,
    );
  }

  if (document.activeElement) document.activeElement.blur();
}
