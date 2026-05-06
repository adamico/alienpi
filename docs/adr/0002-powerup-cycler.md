# Powerup cycler replaces per-colour loot drops

The four-colour loot system (`blue` / `green` / `red` / `star` from `src/config/entities/loot.js`) is being replaced by a single shootable **Cycler** that steps through a fixed sequence of **Powerup states** (`vulcan`, `shotgun`, `beam`, `bonusSubstrate`) one step per shot. Each shot gates on a 0.5 s cooldown to prevent rapid-fire weapons (Vulcan stream, Beam) from blasting past every state in a fraction of a second. After **N = 2 × pool length** cycles the **Cycler** force-locks to `bonusSubstrate` and stops cycling, drifting until despawn or pickup. Picking a weapon-upgrade state when that weapon is already at max level falls back to the bonusSubstrate effect (500 substrate) so a pickup is never a no-op. Visual: a single body whose colour tints to the armed state's colour (reuses `loot.types.<key>.color`).

## Considered Options

- **Keep per-colour drops** — no design surface for new utility states (warpdrive, damage bonus, etc.) without inventing more colours. Rejected.
- **Inventory / slot model** (player carries N states, fires one) — adds UI surface (slot HUD) and a "when do I use it?" decision that arcade twin-stick pacing doesn't reward. Rejected.
- **Timed buff pickups** (timer-based effects) — conflicts with the "instant on collect" feel of existing weapon upgrades + bonusSubstrate; would force a hybrid model.
- **Cycler with random next state** — removes player agency over which state lands. Rejected.
- **Cycler with no durability cap** — player could cycle indefinitely; pickup loses urgency. Rejected.

## Consequences

- `bossOrbiter.destroy()` (currently picks a random colour key and spawns a `Loot`) collapses to spawning one `Cycler` with the deterministic starting state `vulcan`.
- The `star` upgrade key is dropped from the pool. Weapon-level mode locks to `INDIVIDUAL` (per-weapon level-ups via the per-weapon Cycler state).
- Future utility states (G2 follow-ups: damage bonus, warpdrive, …) plug in by extending the pool array. Lock threshold scales automatically (`N = 2 × pool.length`).
- HUD `H1` (Phase 3) needs to show the player's per-weapon levels but no longer needs a separate "active weapon star" indicator.
- Reopen this ADR if playtest shows the lock threshold or cooldown is mis-tuned, or if the cycler-versus-inventory trade-off should be revisited for utility states with non-instant effects.
