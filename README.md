# Alien Orbital Assault

A browser-based vertical shoot-'em-up in the Toaplan tradition: three weapons, one shootable powerup, and a multi-phase boss, all built on the [LittleJS](https://github.com/KilledByAPixel/LittleJS) engine.

https://github.com/user-attachments/assets/347b487b-5472-4ab1-b7ef-24578c90b262

**Play it on itch.io:** https://kc00l.itch.io/alien-orbital-assault

## Features

- Three weapons (Vulcan, Shotgun, Latch Beam) that level up through a single drifting powerup. Shoot it to cycle its state, touch it to collect.
- A multi-phase Orbiter boss with beam, missile, orbiter and shield attacks.
- Arcade scoring with a proximity multiplier that rewards flying close to enemies, plus a saved high score.
- Charge-based focus mode that slows the world for precise dodging.
- Full keyboard and gamepad support, with remappable controls and on-screen button prompts that switch to match the device you're using.
- A one-time tutorial, plus settings for music and SFX volume, flash effects, and screen shake. Settings are saved between sessions.

## Architecture

Built on the [LittleJS](https://github.com/KilledByAPixel/LittleJS) engine, with the game code written as plain ES modules. In development the browser loads the source files directly; for release, esbuild bundles and minifies them into a single zip for itch.io. Game state runs through an explicit scene manager with a whitelist of allowed transitions. Tuning values live in config modules, not in gameplay code. Input goes through one action registry, so rebinding, button prompts and gamepad support all share a single source of truth (see [ADR 0001](docs/adr/0001-action-registry-as-input-source-of-truth.md)). ESLint runs on the whole codebase.

```
src/
  audio/        procedural sound effects and music playback
  config/       tuning constants split by domain (player, weapons, enemies, boss, loot, UI)
  entities/     player, enemies, boss parts, bullets, powerup
  game/         run state: score and high score, world, tutorial progress, time scale
  i18n/         player-facing strings (title, story, HUD, menus, tutorial) moved out of the code so the game can be translated later
  input/        action/binding registry, keyboard + gamepad, rumble
  scenes/       scene manager and transition policy (title, play, pause, post-run, ...)
  ui/           menus, HUD, settings and rebind screens, footer button hints
  visuals/      sprite atlas loading, fonts, effects, scene transitions
  persistence.js  versioned localStorage save/load that falls back to defaults if storage is corrupt or unavailable
  autoPause.js    pauses the run when the tab loses focus or is hidden
```

## How this was built

I built this with AI assistance, mainly Claude Code for the systems and multi-file refactors. I worked out the design in conversation with the model and tuned the game feel by hand. Three files keep the AI's output consistent across sessions:

- [CLAUDE.md](CLAUDE.md) sets the architecture rules the model has to follow: module layout, one-way import direction, where config lives, and engine conventions (coordinate system, sprite pipeline, audio).
- [CONTEXT.md](CONTEXT.md) is a domain glossary (Action, Binding, Input source, Cycler, Footer hints), so code, issues and discussion all use the same terms.
- [AGENTS.md](AGENTS.md) lists the project's agent skills for other coding agents.

Design decisions are recorded as ADRs in [docs/adr/](docs/adr/), and the LittleJS-specific rules live in [.agents/rules/littlejs.md](.agents/rules/littlejs.md).

## Run locally

```bash
npm install
python3 -m http.server 8080
```

Open http://localhost:8080/index.html. A local server is required because the game loads as an ES module.

```bash
npx eslint .      # lint
npm run build     # bundle with esbuild into dist/ and alienpi-release.zip
```

## License

Code is released under the [MIT License](LICENSE). Art, music, voice clips and fonts are not covered by MIT; see [LICENSE](LICENSE) for their terms.
