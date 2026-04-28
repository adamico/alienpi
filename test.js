"use strict";

import {
  vec2,
  rgb,
  drawRect,
  engineInit,
  glSetAntialias,
  setCanvasPixelated,
  setTilesPixelated,
  mousePos,
  mouseWasPressed,
  time,
  sin,
  Color,
} from "./src/engine.js";

import {
  system,
  starfield as starCfg,
  enemy as enemyCfg,
  boss as bossCfg,
  orbiter as orbCfg,
  missile as missileCfg,
  player as playerCfg,
} from "./src/config.js";

import { initializeGameAssets, initializePlayer } from "./src/commonSetup.js";

import { player } from "./src/entities/player.js";
import { BaseEntity } from "./src/entities/baseEntity.js";
import { Enemy } from "./src/entities/enemy.js";
import { Boss } from "./src/entities/boss.js";
import { BossOrbiter, BossMissile } from "./src/entities/bossChildren.js";
import { Loot } from "./src/entities/loot.js";
import * as gameEffects from "./src/gameEffects.js";
import { updateSoundVolumes } from "./src/sounds.js";

let behaviorEnabled = true;

async function gameInit() {
  await initializeGameAssets();
  initializePlayer(999);
  setupUIListeners();

  // Hide loading indicator
  const loader = document.getElementById("loading-overlay");
  if (loader) loader.style.opacity = "0";
  setTimeout(() => loader?.remove(), 500);
}

function setupUIListeners() {
  const entitySelect = document.getElementById("entity-select");
  const hpInput = document.getElementById("hp-input");
  const behaviorToggle = document.getElementById("behavior-toggle");
  const maxWepLevel = playerCfg.weaponSystem.maxLevel;

  // Sync HTML inputs with config
  ["vulcanLevel", "shotgunLevel", "latchLevel"].forEach((id) => {
    document.getElementById(id).max = maxWepLevel;
  });

  behaviorToggle.addEventListener("change", (e) => {
    behaviorEnabled = e.target.checked;
  });

  entitySelect.addEventListener("change", () => {
    const type = entitySelect.value;
    let defaultHp = 1;

    if (type.startsWith("type")) {
      defaultHp = enemyCfg.swarm[type].hp;
    } else if (type === "boss" || type === "boss_no_orbiters") {
      defaultHp = bossCfg.hp;
    } else if (type === "orbiter" || type === "orbiter_looter") {
      defaultHp = orbCfg.hp;
    } else if (type === "missile") {
      defaultHp = missileCfg.hp;
    } else if (type.startsWith("loot_")) {
      defaultHp = 1; // Loot typically doesn't have HP, but we'll set it to 1
    }

    hpInput.value = defaultHp;
  });

  // --- Weapon Level Listeners ---
  const WEAPON_KEYS = {
    vulcanLevel: "vulcan",
    shotgunLevel: "shotgun",
    latchLevel: "latch",
  };

  document.querySelectorAll(".weapon-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      const delta = parseInt(btn.dataset.delta);
      const weaponKey = WEAPON_KEYS[targetId];
      const input = document.getElementById(targetId);
      const newValue = Math.min(
        maxWepLevel,
        Math.max(0, parseInt(input.value) + delta),
      );
      input.value = newValue;

      if (delta > 0 && player) {
        // Use upgradeWeapon so unlock/upgrade/max sounds fire correctly
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
    document.getElementById(id).addEventListener("change", applyWeaponLevels);
  });

  function applyWeaponLevels() {
    if (!player) return;
    player.weaponLevels.vulcan = parseInt(
      document.getElementById("vulcanLevel").value,
    );
    player.weaponLevels.shotgun = parseInt(
      document.getElementById("shotgunLevel").value,
    );
    player.weaponLevels.latch = parseInt(
      document.getElementById("latchLevel").value,
    );

    // If current weapon became 0, switch to first available
    if (player.weaponLevels[player.currentWeaponKey] === 0) {
      for (let i = 0; i < 3; i++) {
        const key = ["vulcan", "shotgun", "latch"][i];
        if (player.weaponLevels[key] > 0) {
          player.weaponIndex = i;
          break;
        }
      }
    }
    player.updateWeaponSprite();
  }
}

// common setup functions removed as they are now in commonSetup.js

function gameUpdate() {
  if (mouseWasPressed(0)) {
    // Only spawn if mouse is within the playfield borders
    const { x: lx, y: ly } = system.levelSize;
    if (
      mousePos.x > 0 &&
      mousePos.x < lx &&
      mousePos.y > 0 &&
      mousePos.y < ly
    ) {
      handleSpawn();
    }
  }
  updateSoundVolumes();
}

function handleSpawn() {
  const spawnPos = mousePos;
  const entityType = document.getElementById("entity-select").value;
  const hpValue = parseInt(document.getElementById("hp-input").value) || 1;

  let entity = null;

  if (entityType.startsWith("type")) {
    entity = new Enemy(spawnPos.copy(), entityType);
    entity.hp = hpValue;
  } else if (entityType === "boss" || entityType === "boss_no_orbiters") {
    // Adjust Boss constructor behavior for immediate spawn at mouse
    entity = new Boss(spawnPos.copy());
    entity.pos = spawnPos.copy(); // Force position to mouse click
    entity.hp = hpValue;
    entity.maxHp = hpValue;
    entity.state = "active"; // Skip glide-in
    if (entityType === "boss") {
      entity.initOrbiters(); // Only init if full boss selected
    }
  } else if (entityType === "orbiter") {
    entity = new BossOrbiter(0, hpValue, false, spawnPos.copy());
  } else if (entityType === "orbiter_looter") {
    entity = new BossOrbiter(0, hpValue, true, spawnPos.copy());
  } else if (entityType === "missile") {
    entity = new BossMissile(spawnPos.copy());
    entity.hp = hpValue;
  } else if (entityType.startsWith("loot_")) {
    const lootKey = entityType.replace("loot_", "");
    entity = new Loot(spawnPos.copy(), lootKey);
  }

  if (entity) {
    // Intercept update to allow freezing behavior
    const originalUpdate = entity.update;
    entity.update = function () {
      if (behaviorEnabled) {
        originalUpdate.call(this);
      } else {
        // Skip AI logic but keep hit effects and basic engine updates
        BaseEntity.prototype.update.call(this);
      }
    };

    // Visual feedback for spawn
    entity.applyEffect(new gameEffects.FlashEffect(new Color(1, 1, 1), 0.2));
    console.log(
      `[TEST LAB] Spawned ${entityType} at ${spawnPos.x.toFixed(1)}, ${spawnPos.y.toFixed(1)} with ${hpValue} HP`,
    );
  }

  // Remove focus from UI to return control to the game
  if (document.activeElement) {
    document.activeElement.blur();
  }
}

function gameRender() {
  drawBackground();
}

function drawBackground() {
  const marqueeColor = rgb(0.05, 0.05, 0.1);
  const playFieldColor = rgb(0.01, 0.01, 0.02);
  const margin = 1;

  // Background
  drawRect(system.cameraPos, vec2(100), marqueeColor);
  drawRect(
    system.cameraPos,
    vec2(system.levelSize.x + margin * 2, system.levelSize.y * 2),
    playFieldColor,
  );

  // Stars (Static for test scene to reduce visual noise)
  const pos = vec2(),
    size = vec2(),
    color = rgb();
  for (let i = starCfg.count; i--; ) {
    const offset =
      time * (starCfg.speedBase + (i ** 2.1 % starCfg.speedRange)) + i ** 2.3;
    pos.y = starCfg.verticalOffset - (offset % starCfg.verticalRange);
    pos.x = i / system.levelSize.x - starCfg.horizontalOffset;
    size.x = size.y = (i % starCfg.sizeRange) + starCfg.sizeBase;
    color.set(0.5, 0.5, 0.5, sin(i) ** starCfg.alphaPower);
    drawRect(pos, size, color);
  }
}

function gameRenderPost() {
  drawMarquee();
}

function drawMarquee() {
  const marqueeColor = rgb(0.05, 0.05, 0.1);
  const { x: lx, y: ly } = system.levelSize;
  const margin = 1;
  const maskSize = 100;
  const maskReach = lx * 5;

  // Right Mask
  drawRect(
    vec2(lx + maskSize / 2 + margin, ly),
    vec2(maskSize, ly * 3),
    marqueeColor,
  );
  // Top Mask
  drawRect(
    vec2(lx / 2, ly + margin + maskSize / 2),
    vec2(maskReach, maskSize),
    marqueeColor,
  );
  // Bottom Mask
  drawRect(
    vec2(lx / 2, -margin - maskSize / 2),
    vec2(maskReach, maskSize),
    marqueeColor,
  );

  // No Left Mask in Test Scene as the HTML UI covers that area
}

glSetAntialias(true);
setCanvasPixelated(false);
setTilesPixelated(false);
engineInit(
  gameInit,
  gameUpdate,
  null,
  gameRender,
  gameRenderPost,
  system.spriteSheetLists,
);
