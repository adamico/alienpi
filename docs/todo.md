# TODO

## Menus

## HUD

- H1: take inspiration from the HUD of GG Aleste 3, where the different weapons and powerups are displayed in a row at the bottom of the screen, with the currently active one highlighted. This would make it easier for players to see which powerup they have active and what other options they have available.

## Gameplay

- G7: offer the player a difficulty selection (Easy / Normal / Hard) from the main menu; selection persists in settings and is restored next session. Active difficulty visible in HUD or pause screen. HITL: which parameters vary per difficulty and numeric deltas.

- G2: brainstorm new powerup states (damage bonus, warpdrive to escape, bonus substrate)

- G3: brainstorm the addition of bombs (conferring shield and damaging nearby enemies, but not granting substrate for the kills)

- G4: brainstorm improvements to the scoring system (chain multiplier, evasion bonus, clearing time bonus)

## Sounds

- S1: add sound effects for powerup cycler collision with player bullets

## Visuals

## Accessibility

- A1: add powerup cycling tutorial step

## Testing

## Publishing

- PUB1: provide an in-game way for players to send feedback (entry point in menus). HITL: submission target (mailto, prefilled GitHub issue URL, Google Forms/Tally, custom backend?) and where the entry point lives.

- PUB2: instrument the game to report aggregate gameplay metrics (session start, run length, deaths, level reached) to an analytics backend. HITL: provider (Plausible, Umami, GA4, self-hosted?), event taxonomy, and consent UX (opt-in banner vs opt-out). No analytics fires before consent.

## bugs & performance & tweaks

- BPT1: some game mechanics currently bypass the slowdown effect:
  - boss nova attack frequency
  - possibly boss beam attack rotation speed and frequency
  - other timers?

## balance

## game feel
