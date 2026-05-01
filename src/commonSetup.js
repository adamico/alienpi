import {
  vec2,
  setCanvasFixedSize,
  setCameraPos,
  setTileDefaultSize,
  setObjectMaxSpeed,
  setDebugKey,
  PostProcessPlugin,
  UISystemPlugin,
  uiSystem,
} from "./engine.js";
import { system, engine, settings } from "./config/index.js";
import { loadSprites, loadDynamicSpritesheet } from "./visuals/sprites.js";
import { spawnPlayer } from "./entities/player.js";

/**
 * Shared initialization for game assets and engine settings
 */
export async function initializeGameAssets() {
  setCanvasFixedSize(system.canvasSize);
  setCameraPos(system.cameraPos);
  setTileDefaultSize(vec2(1));
  setObjectMaxSpeed(engine.objectMaxSpeed);
  setDebugKey(settings.debugKey);

  new UISystemPlugin();
  uiSystem.nativeHeight = 0;

  setupSharpenShader();

  // 1. Load standard spritesheets
  for (let i = 0; i < system.spriteSheetLists.length; i++) {
    const fullPath = system.spriteSheetLists[i].replace(".png", "");
    await loadSprites(fullPath, i);
  }

  // 2. Load dynamic particle sheet
  await loadDynamicSpritesheet(system.particleLists, system.particleSheetName);

  // 3. Load standalone sprites (Boss, Ships, etc.)
  if (system.standaloneSprites && system.standaloneSprites.length > 0) {
    await loadDynamicSpritesheet(system.standaloneSprites, "");
  }
}

/**
 * Shared player spawning logic to ensure both game and test lab
 * use the same initialization sequence.
 * @param {number} [hp] Optional override for player HP (e.g. for test lab)
 */
export function initializePlayer(hp) {
  return spawnPlayer(hp);
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
