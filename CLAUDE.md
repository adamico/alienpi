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

[game.js](game.js) is the entry point / composition root — it imports from `src/`, defines the lifecycle callbacks, and wires them up at the bottom via `engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, system.spriteSheet)`. It owns `gameRender` (background) and `drawUI` (debug text).

**File layout.**

```
game.js                   # entry: lifecycle callbacks + engineInit
src/
  config/                 # domain-split tuning constants (barrel: config/index.js)
    index.js              # re-exports all public config symbols
    constants.js          # GAME_STATES, sprite-sheet names/paths, starfield
    system.js             # system object (canvas, camera, input keys, asset lists)
    engine.js             # engine physics tunables
    economy.js            # economy namespace (loan/payout/repair)
    settings.js           # settings object + loadSettings() + saveSettings()
    strings.js            # all UI strings
    ui.js                 # debug UI layout constants
    entities/
      player.js           # player config
      weapons.js          # weapons object (vulcan / shotgun / latch) + bullet configs
      projectiles.js      # enemyBullet, bossBullet configs
      enemies.js          # enemy swarm/flocking/formation config + missile
      boss.js             # boss, beam, orbiter, orbiterLooter, shield configs
      loot.js             # loot config
  sprites.js              # sprites Map + loadSprites()
  sounds.js               # SoundGenerator class + sound definitions
  entities/
    bullet.js             # Bullet
    enemy.js              # Enemy
    player.js             # Player + `spawnPlayer()` + exported `player` ref
```

Dependency direction is one-way: entities import from `config/` / `sprites.js` / `sounds.js`; those never import from entities (avoids circular imports). `enemy.js` imports `bullet.js` for the collision `instanceof` check.

Config module rules: always import from `./config/index.js` (or `../config/index.js` from entity subdirs). Domain files under `config/entities/` import from `../../engine.js` and `../constants.js` only — never from sibling entity source files. Never import `config/index.js` from inside `config/` submodules to avoid circular refs.

**Coordinate system.** World space is Y-up; `cameraScale` is the LittleJS default of 32 (no `setCameraScale` call), so the 1280×720 canvas maps to a 40×22.5 world-unit viewport. Camera is parked at `LEVEL_SIZE.scale(0.5)` = `(10, 10)`. `LEVEL_SIZE` (20×20) is just the inner dark rect drawn in `gameRender`; the player can roam the full viewport. Sprites are sized from atlas pixel dimensions multiplied by `WORLD_SCALE` (0.02) to convert pixel art to world units.

**Sprite pipeline.** Assets live in [public/assets/](public/assets/) as a Kenney-style atlas: `sheet.png` + `sheet.xml` (SubTexture entries). `loadSprites()` in [src/sprites.js](src/sprites.js) parses the XML (called from `gameInit`) and registers each sub-rect into the module-level `sprites` Map keyed by filename. `setTileDefaultSize(vec2(1))` is set in `gameInit` so `TileInfo` pos/size are treated as raw pixel coordinates into `textureInfos[0]`. When adding a new sprite, look it up via `sprites.get('<name>.png')` and scale with `tile.size.scale(WORLD_SCALE)`.

**Entities.** Each game object extends `EngineObject`:

- `Player` ([src/entities/player.js](src/entities/player.js)) — reads `keyDirection()` each frame, applies `player.accel` to velocity, clamps length to `engine.objectMaxSpeed` (scaled by `player.focusSpeedScale` while `system.focusKey` is held for focus mode), and relies on `damping` for friction. `keyIsDown(system.shootKey)` spawns two `Bullet`s from the hull on a `player.shootCooldown` frame timer. The exported `player` binding (the runtime instance, not the config) is assigned inside `spawnPlayer()`.
- `Bullet` ([src/entities/bullet.js](src/entities/bullet.js)) — self-destroys once `pos.length() < BULLET_DESPAWN_RADIUS` (i.e. near world origin).
- `Enemy` ([src/entities/enemy.js](src/entities/enemy.js)) — handles bullet collisions in `collideWithObject`, returning `false` for non-solid collision.

`collisionRadius` is clamped by `MIN_COLLISION_RADIUS` because sprites scaled by `WORLD_SCALE` are very small.

**Tuning constants** live in [src/config/](src/config/) split into domain modules. All public symbols are re-exported by [src/config/index.js](src/config/index.js): `system` (canvas/level/camera/sprite-sheet/input keys), `engine` (global physics + render scalars like `objectMaxSpeed`, `worldScale`, `minCollisionRadius`), `player` / `weapons` / `enemy` / `boss` (per-entity sprite + tuning), `economy`, `settings`, `strings`, and `ui` (debug-text layout). Entity modules import only the namespaces they need (e.g. bullet.js imports `engine` + `weapons` + `enemyBullet as enemyBulletCfg`). Prefer editing/extending these over inlining magic numbers.

**Physics defaults** are set once in `gameInit` via `setObjectMaxSpeed(engine.objectMaxSpeed)`. LittleJS's `EngineObject.update()` then clamps each entity's velocity per-axis to that cap. Player overrides its own cap via length-clamp before `super.update()` to implement focus mode.

**Audio.** `SoundGenerator` in [src/sounds.js](src/sounds.js) is a thin `Sound` subclass that maps named ZZFX parameters onto the LittleJS positional array. `soundShoot` is built from a raw ZZFX array (sparse-array syntax intentional — note the `eslint-disable no-sparse-arrays` block). New sounds should prefer `SoundGenerator`.

## LittleJS conventions

See [.agents/rules/littlejs.md](.agents/rules/littlejs.md) for the full rule set. Key items:

- Lifecycle callbacks, Y-up world, clockwise-positive angles, `vec2`/`rgb`/`hsl` factories, `keyDirection()` input, fixed 60 FPS physics.
- Use factory functions (`vec2()`, `rgb()`, `tile()`) not `new Vector2` / `new Color`.
- For `drawCircle`/`drawEllipse` the size is **diameter**, not radius.
- Don't mutate engine color constants (`WHITE`, `BLACK`, ...) — `.copy()` first.
- All audio must go through the `SoundGenerator` (ZZFX) class — don't write raw audio. Note the existing `soundShoot` is a raw ZZFX array; new sounds should prefer `SoundGenerator`.
- LittleJS's "One File Only" convention is intentionally broken here: `game.js` + the `src/` tree split lifecycle, entities, and data into dedicated modules. There is still no build step — the browser resolves ES module imports directly from `node_modules/littlejsengine/dist/littlejs.esm.js`.
