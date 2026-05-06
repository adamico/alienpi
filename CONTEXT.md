# Alien Orbit Assault

Browser arcade twin-stick game built on LittleJS. This glossary captures domain terms specific to the project — gameplay, input, and UI vocabulary — that should be used consistently in code, issues, and discussion.

## Language

### Input

**Action**:
A semantic input intent (e.g. `fire`, `focus`, `confirm`) decoupled from the physical key or button that triggers it.
_Avoid_: command, control, key (when meaning intent rather than physical key)

**Binding**:
The mapping from one **Action** to a concrete keyboard code and/or gamepad button index.
_Avoid_: keybind (verb form OK), shortcut, hotkey

**Input source**:
The device that produced the most recent meaningful input — currently `keyboard` or `gamepad`. Drives which sprite an input icon shows.
_Avoid_: input device (use only for hardware-level discussion), controller (ambiguous with gamepad)

**Input icon**:
A small sprite representing the current **Binding** for an **Action**, automatically swapping between keyboard and gamepad art based on **Input source**.
_Avoid_: button hint, glyph

### Pickups

**Powerup state**:
A discrete effect that an active **Cycler** can grant when picked up — currently `vulcan`, `shotgun`, `beam`, `bonusSubstrate`. Each state has a colour and a one-shot effect on collection (weapon-level up, substrate award, etc.).
_Avoid_: powerup type (overloaded with the older per-key loot drop), buff (states are instant, not timed)

**Cycler**:
The single shootable pickup that drifts down the playfield, advancing through the **Powerup state** sequence one step per shot (cooldown-gated). After a set number of cycles it locks to the consolation state (`bonusSubstrate`) until despawn or pickup. Replaces the legacy four-colour loot drops.
_Avoid_: loot, drop (the legacy term), powerup pickup (ambiguous with the resolved state)

### UI

**Footer hints**:
A horizontal strip at the bottom of a menu screen showing **Input icons** + labels for the actions valid on that screen (e.g. `[confirm] Select  [cancel] Back`).
_Avoid_: button prompts, action bar

**Prompt-bearing menu**:
A menu screen where the player navigates and confirms entries (title, pause, credits). Distinguished from toggle/slider screens (settings, economy) where prompts add little value.
_Avoid_: interactive menu (too broad)

## Relationships

- An **Action** has at most one **Binding** per device (keyboard, gamepad)
- An **Input icon** displays the **Binding** for a given **Action** under the active **Input source**
- **Footer hints** are a collection of **Input icons** + labels, scoped to one menu screen
- A **Cycler** holds a fixed sequence of **Powerup states** and exposes one of them at a time as the "armed" state — the one collected if the player touches it

## Example dialogue

> **Dev:** "When the player rebinds Fire to Space, what happens to Confirm — which was already bound to Space?"
> **Designer:** "Confirm becomes unbound on the keyboard side. Its **Input icon** renders as a red 'unbound' glyph everywhere it appears, including the **Footer hints** in the pause menu, until the player rebinds it."

## Flagged ambiguities

- "key" was used to mean both a physical keyboard code AND an action intent — resolved: physical = "key" / "button", semantic intent = **Action**.
