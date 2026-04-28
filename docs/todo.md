# TODO

## Boss

- B1: One more boss attack to make the shotgun weapon useful. something like the diving drones, with low hp but in huge numbers. Priority: high
- ~~B2: Add boss health bar when he appears. Priority: medium~~ DONE

## Menus

- ~~M1: add flash effects toggle in the settings. Priority: high~~ DONE
- ~~M2: add screen shake effect toggle in the settings. Priority: high~~ DONE
- M3: add credits. Priority: low
- M4: add main menu image. Priority: medium
- ~~M5: add keyboard navigation to the menus. Priority: high~~ DONE
- ~~M6: add keyboard navigation to the pause menu. Priority: high~~ DONE
- M7: improve pause menu display. Priority: low
- M8: improve main menu display. Priority: low
- ~~M9: add social links to main menu. Priority: high.~~ DONE (placeholder URLs)
- ~~M10: add link to feedback/discord in main menu. Priority: high~~ DONE (placeholder URL)
- M11: wire social links. Priority: medium
- M12: add flash/shake effects to the pause menu. Priority: low
- M13: when the music/sfx off are checked, make the volume sliders go to 0. Priority: medium

## HUD

- H1: improve the player health display. Priority: medium
- ~~H2: improve the weapon display. Priority: high~~ DONE
- H3: remove littlejs debug info. Priority: low

## Gameplay

- ~~G1: implement score system. Priority: high~~ DONE
- G2: add weapon tutorials. Priority: medium
- G3: add difficulty levels. Priority: low
- G4: add attract mode. Priority: low
- G5: add introductory lore dialog. Priority: medium.
- ~~G6: add victory dialog. Priority: medium.~~ DONE (victory/game-over screen handled in `updateUI` via `gameWon` flag — distinct title, color, and prompt)

## Sounds

- ~~S1: add loot collection sound effect. Priority: high~~ DONE
- ~~S2: add "<weapon> unlocked" sound effect. Priority: high~~ DONE
- ~~S3: add "<weapon> upgrade" sound effect. Priority: high~~ DONE
- ~~S4: add "<weapon> max" sound effect. Priority: high~~ DONE
- ~~S5: add title music. Priority: high~~ DONE
- ~~S6: add game over music. Priority: high~~ DONE (`soundGameOverMusic` + `soundVictoryMusic` both wired to game state)
- S7: improve boss beam sound effect. Priority: high.
- ~~S8: add boss death sound effect. Priority: medium~~ N/A (victory screen covers this)
- ~~S9: add weapon change sound effect. Priority: medium~~ DONE

## Visuals

- V1: replace bullet sprites with animated versions. Priority: high
- ~~V2: add banking effect to the player sprite. Priority: medium~~ DONE
- V3: add small sprites for each weapon. Priority: low
- V4: Improve the boss movement visuals with particles or exhaust effects. Priority: low
- ~~V5: recolor boss sprite. green -> red. Priority: high~~ DONE
- ~~V6: recolor boss orbiter sprite. green -> red. Priority: high.~~ DONE
- ~~V7: readd orbiters life line. Priority: high.~~ DONE
- ~~V8: improve orbiter respawn telegraph. Priority: medium.~~ DONE
- V9: replace or improve boss missile sprite. Priority: medium.
- V10: add glow effects (player, orbiters, bullets, etc). Priority: medium.
- V11: add weapon change animations. Priority: medium.
- ~~V12: add font to the game. Priority: high.~~ DONE
- ~~V13: make loot entity sprites be rendered on top of the explosion particles. Priority: medium.~~ DONE

## Accessibility

- A1: add touch controls. Priority: high
- A2: add gamepad controls. Priority: medium
- ~~A3: add a fullscreen button. Priority: high~~ DONE

## Testing

- T1: improve the test lab reusing elements from the actual game. Priority: high
- T2: add a button to clear the spawned entities. Priority: medium
- T3: when the player collects a spawned loot, update the level

## Publishing

- ~~P1: finish the itch.io page. Priority: high~~ DONE
- P1.5: publish game on itch.io. Priority: high
- P2: test html loading, especially images/sounds/fonts. Priority: high
- ~~P3: add build script. Priority: medium~~ DONE
- P4: add analytics. Priority: low
- P5: add feedback form. Priority: medium
- P6: add post-launch updates. Priority: low
