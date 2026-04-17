---
trigger: model_decision
description: when working on a LittleJS Project
---

# LittleJS - AI Agent Guidelines

Follow these rules strictly when working on LittleJS projects. Optimize for minimal changes, clarity, and zero external dependencies.

## 1. Core Constraints

- **One File Only:** Use `index.html` exclusively. No build steps, no external JS/CSS files.
- **JS Only:** Do not modify HTML or CSS. Write all logic in JavaScript.
- **No External Assets:** No images, spritesheets, or audio files.
- **Untextured Rendering:** Use solid-color primitives only (`drawRect`, `drawCircle`, `drawLine`). Do not use texture/sprite APIs.
- **Synthesized Audio:** Use the `SoundGenerator` class (ZZFX) for all audio. Do not write raw audio code.

## 2. Engine Lifecycle & Structure

- **Global Variables:** Use built-in globals: `time`, `frame`, `mousePos`, `paused`, `debug`.
- **Initialization:** Always include all required callbacks in `engineInit`.

```javascript
function gameInit() {}
function gameUpdate() {}
function gameUpdatePost() {}
function gameRender() {}
function gameRenderPost() {}

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost);
```

- **Physics:** Runs at a fixed 60 FPS. `timeDelta` is constant in `gameUpdate`.

## 3. Mathematical & Visual Conventions

- **World Space:** Defaults to world space (Y-up, origin at center). To draw in pixels, set `screenSpace = true`.
- **Angles:** Clockwise is **positive**.
- **Circle Sizes:** For `drawCircle` and `drawEllipse`, the size parameter is the **diameter**, not the radius.
- **Input:** Use `keyDirection()` to get a `vec2` for directional input.
- **Math Shortcuts:** Use `vec2(x, y)`, `rgb(r, g, b)`, `hsl(h, s, l)`. Do not use `new Vector2` or `new Color`.

## 4. Coding Conventions

- **Factory Functions:** Use `vec2()`, `tile()`, `rgb()`.
- **Constructors:** Use `new EngineObject()`, `new Sound()`, `new Timer()`.
- **Type Checking:** Use `isNumber()`, `isString()`, `isVector2()`, `isColor()`.
- **Diagnostics:**
  - Use `ASSERT(condition, msg)` and `LOG(msg)` (stripped in release).
  - Use `debugRect()`, `debugCircle()`, etc., for visual debugging.
- **Freeze Constants:** Do not modify `WHITE`, `BLACK`, `RED`, etc. Use `.copy()` first.

## 5. Agent Interaction & Response

- **Minimalism:** Prefer minimal, local changes. Do not refactor for style.
- **Smallest Version First:** Build a working MVP before iterating.
- **Documentation:** Use JSDoc with `@memberof` grouping (e.g., Engine, Draw, Math).
- **Format:**
  - Provide a 1-3 line step summary.
  - Include quick test instructions (expected behavior + controls).
  - Offer 2-4 next-step choices.
- **Error Handling:** If an error occurs, request the console text and provide a minimal fix.

## 6. Common Pitfalls to Avoid

- **Y-Origin:** World space Y increases **upward**. Tile coordinates start at the bottom-left.
- **Side Effects:** Never place logic inside `ASSERT` or `LOG`.
- **Line Breaks:** Do not use literal `\n` characters for rendered text; use `\n` escape sequences instead.
- **Redefinition:** Do not redefine Math shortcuts or existing engine globals.

## 7. References

[cheatsheet](https://github.com/KilledByAPixel/LittleJS-AI/blob/main/AI/reference.md)
