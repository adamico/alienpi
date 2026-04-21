---
trigger: model_decision
description: when working on a LittleJS Project
---

# LittleJS - AI Agent Guidelines (Modular Edition)

Follow these rules strictly when working on the AlienPi project. These guidelines incorporate best practices from the `LittleJS-AI` submodule while maintaining our advanced modular architecture.

## 1. Project Architecture & Context

- **Modular Project:** We use ES Modules. Logic is split across `game.js`, `src/config.js`, and specialized files in `src/entities/`.
- **Primary References:** Consult these local files before implementing engine logic:
  - [.agents/littlejs-ai/GPT/reference.md](file:///Users/kc00l/alienpi/.agents/littlejs-ai/GPT/reference.md) (Full API Cheat Sheet)
  - [.agents/littlejs-ai/GPT/tutorial.md](file:///Users/kc00l/alienpi/.agents/littlejs-ai/GPT/tutorial.md) (Pattern Guide)
- **External Assets:** We use external spritesheets and particle textures. Do NOT use the "untextured-only" constraint found in some generic LittleJS AI prompts.

## 2. Technical Pitfalls & Conventions

- **Angles:** Clockwise is **positive**. 0 is up, PI/2 is right, PI is down, 3PI/2 is left.
- **Circles/Ellipses:** The size parameter for `drawCircle` and `drawEllipse` is the **diameter**, not the radius.
- **Math Shortcuts:** Use `vec2(x, y)`, `rgb(r, g, b)`, `hsl(h, s, l)`. Avoid `new Vector2` or `new Color`.
- **Input:** Use `keyDirection()` to get a `vec2` for basic movement.
- **Collision:** 
  - `EngineObject.setCollision(collideSolidObjects, isSolid, collideTiles)` takes three booleans.
  - **CRITICAL:** `setCollision(false)` will fail if `isSolid` (the 2nd param) defaults to true. Always use `setCollision(false, false)` to fully disable collision.
- **Colors:** Use `.copy()` before modifying shared constants like `WHITE` or `BLACK`.

## 3. Engineering Workflow

- **Config-First:** Move all magic numbers and tweakable parameters to `src/config.js`.
- **Entity Structure:** All game entities should extend `BaseEntity` (in `src/entities/baseEntity.js`) to benefit from standardized scaling and hit effects.
- **Particle Systems:** Use `ParticleEmitter` and define settings in the config. Refer to the engine's built-in `fire_01.png`, `smoke_01.png`, etc., in `public/assets/particles/`.

## 4. Coding Style

- **Minimalism:** Prefer minimal, surgical changes over large refactors.
- **JSDoc:** Add brief JSDoc comments for classes and complex methods.
- **Diagnostics:** Use `ASSERT(condition, msg)` for internal state checks and `LOG(msg)` for debugging.

## 5. Submodule Updates
The `.agents/littlejs-ai/` submodule is maintained by the community. Check `GPT/AI_instructions.md` for refined system prompt ideas, but ignore instructions regarding `index.html` or "single file" constraints.
