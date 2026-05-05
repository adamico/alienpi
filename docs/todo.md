# TODO

## Menus

## HUD

- H1: take inspiration from the HUD of GG Aleste 3, where the different weapons and powerups are displayed in a row at the bottom of the screen, with the currently active one highlighted. This would make it easier for players to see which powerup they have active and what other options they have available.

## Gameplay

- G6: when the player takes a hit, briefly slow game time (slow-motion) for game-feel impact, then ease back to normal speed. Duration tunable in config. Effect must not stack when multiple hits land in quick succession.

- G7: offer the player a difficulty selection (Easy / Normal / Hard) from the main menu; selection persists in settings and is restored next session. Active difficulty visible in HUD or pause screen. HITL: which parameters vary per difficulty and numeric deltas.

- G1: remove the current powerups and replace it with a single shootable powerup that cycles through the different powerups. This will make it more intuitive for players to understand how to use the powerups, and it will also add an extra layer of strategy to the game, as players will have to decide which powerup they want to use and when.

- G2: brainstorm new powerup states (damage bonus, warpdrive to escape, bonus substrate)

- G3: brainstorm the addition of bombs (conferring shield and damaging nearby enemies, but not granting substrate for the kills)

- G4: brainstorm improvements to the scoring system (chain multiplier, evasion bonus, clearing time bonus)

- G5 (can leverage G6): brainstorm improvement for the focus mode, instead of slowing the player ship down, it could instead activate a slow motion effect for a short duration. this could be charge based

## Sounds

## Visuals

## Accessibility

## Testing

## Publishing

- PUB1: provide an in-game way for players to send feedback (entry point in menus). HITL: submission target (mailto, prefilled GitHub issue URL, Google Forms/Tally, custom backend?) and where the entry point lives.

- PUB2: instrument the game to report aggregate gameplay metrics (session start, run length, deaths, level reached) to an analytics backend. HITL: provider (Plausible, Umami, GA4, self-hosted?), event taxonomy, and consent UX (opt-in banner vs opt-out). No analytics fires before consent.

## bugs & performance & tweaks

- BPT1: the floating text for the powerup pickup can spawn outside the playing area. Let's implement a dynamic spawn position for it, so that it always spawns within the playing area.

## balance

## game feel
