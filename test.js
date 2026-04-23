"use strict";

import {
  vec2,
  rgb,
  drawRect,
  setCanvasFixedSize,
  setCameraPos,
  setTileDefaultSize,
  setObjectMaxSpeed,
  engineInit,
  glSetAntialias,
  setCanvasPixelated,
  setTilesPixelated,
  PostProcessPlugin,
  mousePos,
  mouseWasPressed,
  time,
  sin,
  Color,
} from "./src/engine.js";

import {
  system,
  engine,
  starfield as starCfg,
  enemy as enemyCfg,
  boss as bossCfg,
  orbiter as orbCfg,
  missile as missileCfg,
} from "./src/config.js";

import {
  loadSprites,
  loadDynamicSpritesheet as setupParticleSpritesheet,
} from "./src/sprites.js";

import { spawnPlayer } from "./src/entities/player.js";
import { BaseEntity } from "./src/entities/baseEntity.js";
import { Enemy } from "./src/entities/enemy.js";
import { Boss } from "./src/entities/boss.js";
import { BossOrbiter, BossMissile } from "./src/entities/bossChildren.js";
import { Pinata } from "./src/entities/pinata.js";
import { Loot } from "./src/entities/loot.js";

let behaviorEnabled = true;

async function gameInit() {
  setupSharpenShader();
  setCanvasFixedSize(system.canvasSize);
  setCameraPos(system.cameraPos);
  setTileDefaultSize(vec2(1));
  setObjectMaxSpeed(engine.objectMaxSpeed);

  await setupSpritesheets();
  await setupParticleSpritesheet(
    system.particleLists,
    system.particleSheetName,
  );

  spawnPlayer(999);
  setupUIListeners();
}

function setupUIListeners() {
  const entitySelect = document.getElementById("entity-select");
  const hpInput = document.getElementById("hp-input");
  const behaviorToggle = document.getElementById("behavior-toggle");

  behaviorToggle.addEventListener("change", (e) => {
    behaviorEnabled = e.target.checked;
  });

  entitySelect.addEventListener("change", () => {
    const type = entitySelect.value;
    let defaultHp = 1;

    if (type.startsWith("type")) {
      defaultHp = enemyCfg.swarm[type].hp;
    } else if (type === "pinata") {
      defaultHp = enemyCfg.swarm.pinata.hp;
    } else if (type === "boss") {
      defaultHp = bossCfg.hp;
    } else if (type === "orbiter") {
      defaultHp = orbCfg.hp;
    } else if (type === "missile") {
      defaultHp = missileCfg.hp;
    } else if (type.startsWith("loot_")) {
      defaultHp = 1; // Loot typically doesn't have HP, but we'll set it to 1
    }

    hpInput.value = defaultHp;
  });
}

async function setupSpritesheets() {
  for (let i = 0; i < system.spriteSheetLists.length; i++) {
    const fullPath = system.spriteSheetLists[i].replace(".png", "");
    await loadSprites(fullPath, i);
  }
}

function setupSharpenShader() {
  const sharpenShader = `
  void mainImage(out vec4 fragColor, in vec2 fragCoord) {
      vec2 uv = fragCoord.xy / iResolution.xy;
      vec2 step = 1.0 / iResolution.xy;
      
      vec4 tex0 = texture(iChannel0, uv);
      vec4 tex1 = texture(iChannel0, uv + vec2(step.x, 0.0));
      vec4 tex2 = texture(iChannel0, uv + vec2(-step.x, 0.0));
      vec4 tex3 = texture(iChannel0, uv + vec2(0.0, step.y));
      vec4 tex4 = texture(iChannel0, uv + vec2(0.0, -step.y));
      
      fragColor = tex0 * 5.0 - (tex1 + tex2 + tex3 + tex4);
  }`;
  new PostProcessPlugin(sharpenShader);
}

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
}

function handleSpawn() {
  const spawnPos = mousePos;
  const entityType = document.getElementById("entity-select").value;
  const hpValue = parseInt(document.getElementById("hp-input").value) || 1;

  let entity = null;

  if (entityType.startsWith("type")) {
    entity = new Enemy(spawnPos.copy(), entityType);
    entity.hp = hpValue;
  } else if (entityType === "pinata") {
    entity = new Pinata(spawnPos.copy());
    entity.hp = hpValue;
  } else if (entityType === "boss") {
    // Adjust Boss constructor behavior for immediate spawn at mouse
    entity = new Boss(spawnPos.copy());
    entity.pos = spawnPos.copy(); // Force position to mouse click
    entity.hp = hpValue;
    entity.maxHp = hpValue;
    entity.state = "active"; // Skip glide-in
    entity.initOrbiters(); // Orbiters need explicit init if skipping state change
  } else if (entityType === "orbiter") {
    entity = new BossOrbiter(0, spawnPos.copy());
    entity.hp = hpValue;
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
    entity.applyHitEffect({
      flashColor: new Color(1, 1, 1),
      duration: 0.2,
    });
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
