# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Browser arcade game ("Alien Orbit Assault") built on the [LittleJS](https://github.com/KilledByAPixel/LittleJS) engine. Single-page, no build step — `index.html` loads `game.js` as an ES module directly from `node_modules/littlejsengine/dist/littlejs.esm.js`.

## Running / Developing

`package.json` defines no npm scripts. Use the VSCode launch configurations in [.vscode/launch.json](.vscode/launch.json):

- **Server + Game** (compound) — starts `python -m http.server 8080` and opens Chrome at `http://localhost:8080/index.html`.

From the terminal the equivalent is `python3 -m http.server 8080` then navigate to that URL. A server is required because `game.js` is an ES module (file:// won't work).

Lint: `npx eslint .` (no script alias; config in [eslint.config.mjs](eslint.config.mjs), uses `@eslint/js` recommended with browser globals).

There is no test suite.

## Architecture

All game code lives in [game.js](game.js). It follows the LittleJS lifecycle and is wired up at the bottom via `LJS.engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, G.spritesheet)`.

**Coordinate system.** World space (Y-up, origin at center), camera at `(0, 0)` with `CAMERA_SCALE = 60`. Sprites are sized from the atlas pixel dimensions multiplied by `WORLD_SCALE` (0.015) to convert pixel art to world units.

**Sprite pipeline.** Assets live in [public/assets/](public/assets/) as a Kenney-style atlas: `sheet.png` + `sheet.xml` (SubTexture entries). `loadSprites()` in `gameInit` parses the XML and registers each sub-rect into a module-level `sprites` Map keyed by filename (e.g. `playerShip1_blue.png`). `setTileDefaultSize(vec2(1))` is set so `TileInfo` pos/size are treated as raw pixel coordinates into `textureInfos[0]`. When adding a new sprite, look it up via `sprites.get('<name>.png')` and scale with `tile.size.scale(WORLD_SCALE)` as shown in `Player`, `Bullet`, `Enemy`.

**Entities.** Each game object extends `LJS.EngineObject`:
- `Player` — reads `LJS.keyDirection()` / `keyIsDown("Space")`, spawns bullets from its hull toward world origin.
- `Bullet` — self-destroys once it enters `BULLET_DESPAWN_RADIUS` around the origin.
- `Enemy` — handles bullet collisions in `collideWithObject`, returning `false` for non-solid collision.

`collisionRadius` is clamped by `MIN_COLLISION_RADIUS` because sprites scaled by `WORLD_SCALE` are very small.

**Tuning constants** are grouped at the top of `game.js` under `SYSTEM CONFIG`, `PLAYER SETTINGS`, `COMBAT SETTINGS`, `RENDER SETTINGS`, `UI SETTINGS`. Prefer editing/extending these over inlining magic numbers (see recent commits — this refactor is ongoing).

**Audio.** `SoundGenerator` is a thin `Sound` subclass that maps named ZZFX parameters onto the LittleJS positional array. `soundShoot` is built from a raw ZZFX array (sparse-array syntax intentional — note the `eslint-disable no-sparse-arrays` block).

## LittleJS conventions

See [.agents/rules/littlejs.md](.agents/rules/littlejs.md) for the full rule set. Key items:

- Lifecycle callbacks, Y-up world, clockwise-positive angles, `vec2`/`rgb`/`hsl` factories, `keyDirection()` input, fixed 60 FPS physics.
- Use factory functions (`vec2()`, `rgb()`, `tile()`) not `new Vector2` / `new Color`.
- For `drawCircle`/`drawEllipse` the size is **diameter**, not radius.
- Don't mutate engine color constants (`WHITE`, `BLACK`, ...) — `.copy()` first.
- All audio must go through the `SoundGenerator` (ZZFX) class — don't write raw audio. Note the existing `soundShoot` is a raw ZZFX array; new sounds should prefer `SoundGenerator`.
- The "One File Only" rule means keeping logic in `game.js`; this project already loads `index.html` + the single module and no build step.
