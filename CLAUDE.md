# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Browser arcade game ("Alien Orbit Assault") built on the [LittleJS](https://github.com/KilledByAPixel/LittleJS) engine. Single-page, no build step — `index.html` loads `game.js` as an ES module; modules under `src/` and LittleJS itself (`node_modules/littlejsengine/dist/littlejs.esm.js`) are resolved natively by the browser.

## Running / Developing

`package.json` defines no npm scripts. Use the VSCode launch configurations in [.vscode/launch.json](.vscode/launch.json):

- **Server + Game** (compound) — starts `python -m http.server 8080` and opens Chrome at `http://localhost:8080/index.html`.

From the terminal the equivalent is `python3 -m http.server 8080` then navigate to that URL. A server is required because `game.js` is an ES module (file:// won't work).

Lint: `npx eslint .` (no script alias; config in [eslint.config.mjs](eslint.config.mjs), uses `@eslint/js` recommended with browser globals).

There is no test suite.

## Architecture

[game.js](game.js) is the entry point / composition root — it imports from `src/`, defines `gameInit` / `gameUpdate` / `gameUpdatePost`, and wires them up at the bottom via `engineInit(gameInit, gameUpdate, gameUpdatePost, renderBackground, renderPostBackground, system.spriteSheetLists)`. The render callbacks live in [src/game/scene.js](src/game/scene.js); per-frame scene logic runs through `updateSceneFrame()` in [src/scenes/gameSceneManager.js](src/scenes/gameSceneManager.js).

**File layout.**

```
game.js                   # entry: lifecycle callbacks + engineInit
build.sh                  # esbuild bundle → dist/ + alienpi-release.zip (DEV_BUILD=false)
scripts/                  # publish-itch.sh (butler push), devlog-diff.sh
src/
  engine.js               # re-exports LittleJS; import engine symbols from here
  commonSetup.js          # initializeGameAssets(): canvas/camera/physics setup, shaders, sprite loading
  persistence.js          # loadSettings() / saveSettings() (localStorage, PERSISTED_KEYS)
  autoPause.js            # installAutoPause(): pause on window blur / tab hidden
  ui.js                   # initUI() / updateUI(): root UIObject + view registry
  config/                 # domain-split tuning constants (barrel: config/index.js)
    index.js              # re-exports all public config symbols (+ strings from i18n/)
    constants.js          # GAME_STATES, sprite-sheet names/paths, starfield
    system.js             # system object (canvas, camera, asset lists)
    engine.js             # engine physics/render tunables
    settings.js           # settings object + PERSISTED_KEYS
    ui.js                 # UI layout constants (debug text, story reveal timing, ...)
    entities/
      player.js           # player config (incl. focusCharge)
      weapons.js          # weapons object (vulcan / shotgun / latch) + bullet configs
      projectiles.js      # enemyBullet, bossBullet configs
      enemies.js          # enemy swarm/flocking/formation config + missile
      boss.js             # boss, beam, orbiter, orbiterLooter, shield configs
      loot.js             # cycler powerup pool config
  entities/
    baseEntity.js         # BaseEntity (extends EngineObject): visual vs hitbox size, world scaling, explode-on-destroy
    player.js             # Player + `spawnPlayer()` + exported `player` ref
    playerWeapons.js      # weapon switching / firing for the player
    weapons/              # vulcan.js, shotgun.js, latch.js per-weapon behaviour
    bullet.js             # Bullet
    novaBullet.js         # boss Bullet subclass with pulsing-core render
    latchBeam.js          # Latch Beam weapon entity
    enemy.js              # Enemy
    boss.js               # Boss + phase logic (orbiters, shield phase)
    bossBeam.js / bossMissile.js / bossOrbiter.js / bossShield.js  # boss parts
    cycler.js             # Cycler powerup (see docs/adr/0002-powerup-cycler.md)
    boundary.js           # playfield edge / kill-zone boundaries
  game/                   # run state, no rendering of entities
    world.js              # game state, player/boss refs, game time
    score.js              # SCORE table, proximity multiplier, high score (localStorage)
    timeScale.js          # slow-mo (focus hold, player-hit)
    tutorialProgress.js   # tutorial sequence + completion flag (localStorage)
    scene.js              # renderBackground / renderPostBackground, playfield, boundaries
    dpsTracker.js         # debug DPS logging
  scenes/
    sceneManager.js       # generic SceneManager (transition / push / pop)
    gameSceneManager.js   # game's sceneManager instance + transitionTo / pushState / popState
    gameScenes.js         # concrete scenes (title, lore, tutorial, playing, pause, post-run, ...)
    baseScene.js          # scene base class
    transitionPolicy.js   # SCENE_TRANSITIONS allow-list per GAME_STATE
    sceneActions.js / sceneContext.js  # per-frame action collection, shared scene deps
  input/
    bindings.js           # Action → Binding registry, actionDown/actionPressed (ADR 0001)
    input.js              # InputManager, input source tracking, player control lock
    gamepad.js            # vibrate() haptics wrapper
  ui/                     # screens (title, pause, settings, controls, credits, story,
                          # tutorial, run/post-run), HUD, menus, footer hints, input icons
  i18n/                   # player-facing strings per screen; en.js aggregates, index.js selects
  audio/
    soundManager.js       # SoundGenerator, playSfx, music/volume management
    sounds.js             # sound + music definitions
  visuals/
    sprites.js            # sprites registry + loadSprites() / loadDynamicSpritesheet()
    fonts.js              # font assignments + preloadFonts()
    gameEffects.js        # particles, explosions, screen shake, entity flash, floating text
    sceneTransition.js    # CRT scanline wipe between scenes
    lootIcon.js           # hex power-cell renderer
```

Dependency direction is one-way: entities import from `config/` / `visuals/` / `audio/` / `game/`; `config/`, `visuals/sprites.js` and `audio/` never import from entities (avoids circular imports). `enemy.js` imports `bullet.js` for the collision `instanceof` check.

Config module rules: always import from `./config/index.js` (or `../config/index.js` from entity subdirs). Domain files under `config/entities/` import from `../../engine.js` and `../constants.js` only — never from sibling entity source files. Never import `config/index.js` from inside `config/` submodules to avoid circular refs.

**Coordinate system.** World space is Y-up; `cameraScale` is the LittleJS default of 32 (no `setCameraScale` call), so the 1280×720 canvas maps to a 40×22.5 world-unit viewport. Camera is parked at `LEVEL_SIZE.scale(0.5)` = `(10, 10)`. `LEVEL_SIZE` (20×20) is just the inner dark rect drawn in `gameRender`; the player can roam the full viewport. Sprites are sized from atlas pixel dimensions multiplied by `WORLD_SCALE` (0.02) to convert pixel art to world units.

**Sprite pipeline.** Assets live in [public/assets/](public/assets/) as a Kenney-style atlas: `sheet.png` + `sheet.xml` (SubTexture entries). `loadSprites()` in [src/visuals/sprites.js](src/visuals/sprites.js) parses the XML (called from `gameInit`) and registers each sub-rect into the module-level `sprites` Map keyed by filename. `setTileDefaultSize(vec2(1))` is set in `gameInit` so `TileInfo` pos/size are treated as raw pixel coordinates into `textureInfos[0]`. When adding a new sprite, look it up via `sprites.get('<name>.png')` and scale with `tile.size.scale(WORLD_SCALE)`.

**Entities.** Each game object extends `EngineObject`:

- `Player` ([src/entities/player.js](src/entities/player.js)) — reads `keyDirection()` each frame, applies `player.accel` to velocity, clamps length to `engine.objectMaxSpeed` (scaled by `player.focusSpeedScale` while `system.focusKey` is held for focus mode), and relies on `damping` for friction. `keyIsDown(system.shootKey)` spawns two `Bullet`s from the hull on a `player.shootCooldown` frame timer. The exported `player` binding (the runtime instance, not the config) is assigned inside `spawnPlayer()`.
- `Bullet` ([src/entities/bullet.js](src/entities/bullet.js)) — self-destroys once `pos.length() < BULLET_DESPAWN_RADIUS` (i.e. near world origin).
- `Enemy` ([src/entities/enemy.js](src/entities/enemy.js)) — handles bullet collisions in `collideWithObject`, returning `false` for non-solid collision.

`collisionRadius` is clamped by `MIN_COLLISION_RADIUS` because sprites scaled by `WORLD_SCALE` are very small.

**Tuning constants** live in [src/config/](src/config/) split into domain modules. All public symbols are re-exported by [src/config/index.js](src/config/index.js): `system` (canvas/level/camera/sprite-sheet/input keys), `engine` (global physics + render scalars like `objectMaxSpeed`, `worldScale`, `minCollisionRadius`), `player` / `weapons` / `enemy` / `boss` (per-entity sprite + tuning), `settings`, `strings`, and `ui` (debug-text layout). Entity modules import only the namespaces they need (e.g. bullet.js imports `engine` + `weapons` + `enemyBullet as enemyBulletCfg`). Prefer editing/extending these over inlining magic numbers.

**Physics defaults** are set once in `gameInit` via `setObjectMaxSpeed(engine.objectMaxSpeed)`. LittleJS's `EngineObject.update()` then clamps each entity's velocity per-axis to that cap. Player overrides its own cap via length-clamp before `super.update()` to implement focus mode.

**Audio.** `SoundGenerator` in [src/audio/soundManager.js](src/audio/soundManager.js) is a thin `Sound` subclass that maps named ZZFX parameters onto the LittleJS positional array. `soundShoot` is built from a raw ZZFX array (sparse-array syntax intentional — note the `eslint-disable no-sparse-arrays` block). New sounds should prefer `SoundGenerator`.

## LittleJS conventions

See [.agents/rules/littlejs.md](.agents/rules/littlejs.md) for the full rule set. Key items:

- Lifecycle callbacks, Y-up world, clockwise-positive angles, `vec2`/`rgb`/`hsl` factories, `keyDirection()` input, fixed 60 FPS physics.
- Use factory functions (`vec2()`, `rgb()`, `tile()`) not `new Vector2` / `new Color`.
- For `drawCircle`/`drawEllipse` the size is **diameter**, not radius.
- Don't mutate engine color constants (`WHITE`, `BLACK`, ...) — `.copy()` first.
- All audio must go through the `SoundGenerator` (ZZFX) class — don't write raw audio. Note the existing `soundShoot` is a raw ZZFX array; new sounds should prefer `SoundGenerator`.
- LittleJS's "One File Only" convention is intentionally broken here: `game.js` + the `src/` tree split lifecycle, entities, and data into dedicated modules. There is still no build step — the browser resolves ES module imports directly from `node_modules/littlejsengine/dist/littlejs.esm.js`.

## Agent skills

### Issue tracker

Issues live in GitHub Issues at `adamico/alienpi` (use the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
