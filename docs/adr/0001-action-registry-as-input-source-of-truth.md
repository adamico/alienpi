# Action registry as the single source of input truth

Until now, input was read directly throughout the codebase (`keyIsDown(system.shootKey)`, `keyWasPressed("ArrowUp")`, hardcoded gamepad button indices). To support control remapping (issue #7), we introduce a single action registry — `src/input/bindings.js` — that maps semantic **Actions** (`fire`, `focus`, `confirm`, ...) to per-device bindings, and replaces all direct key reads with `actionDown(action)` / `actionPressed(action)` helpers. This deviates from the LittleJS convention of reading keys directly at each call site, but gives us one place to mutate bindings, persist them via `settings`, and resolve **Input icons** against the live mapping.

## Considered Options

- **Keep `system.*Key` constants mutable** and read them directly: smaller diff, but leaves menu navigation (`sceneActions.js`) un-remappable and creates two parallel input systems.
- **Refactor only player actions, leave menu nav hardcoded**: half the call sites stay as-is, but players still can't rebind Confirm/Cancel/Pause — a common arcade pain point.
- **Action registry (chosen)**: one source of truth, mirrors the semantic action names already used by `ICON_MAP` in `src/ui/inputIcon.js`.

## Consequences

- Movement (`keyDirection()`) and menu navigation arrow/WASD reads stay outside the registry — they remain fixed bindings by deliberate scope decision (see plan Q5). Reopen this ADR if that scope expands.
