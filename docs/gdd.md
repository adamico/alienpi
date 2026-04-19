Your Game Design Document (GDD) for **Project: Xeno-Chassis** is outlined below. It focuses on the modular 3x3 grid, the adaptive swarm logic, and the arcade loop structure.

---

# GDD: Project Xeno-Chassis (Working Title)

## 1. Game Overview

- **Genre:** Vertical Shoot 'em Up (Shmup) / Arcade
- **Theme:** "Alien" (Organic technology, hive minds, genetic adaptation)
- **Platform:** Web / HTML5
- **Core Loop:** 1. **Swarms:** Clear incoming waves of flocking drones using rapid-fire patterns. 2. **Adapt:** Harvest biological "Tiles" from elite carriers. 3. **Mutate:** Real-time 3x3 ship reconfiguration to counter evolving threats. 4. **Exterminate:** Defeat a multi-part "Sponge" Boss to progress.

## 2. Core Mechanics

### 2.1 The 3x3 Modular Ship

The player ship is a 3x3 grid of anchor points. The center $(1,1)$ is the **Life Core**.

- **Part Types:**
  - **Wings:** Increase move speed and tilt-shot angles.
  - **Cannons:** Add projectile streams (Forward, Spread, or Tail).
  - **Plating:** Increases mass (slower move) but allows the ship to survive tile-specific hits.
- **The Physics of Morphing:**
  - **Mass Calculation:** `TotalSpeed = BaseSpeed - (OccupiedTiles * WeightModifier)`.
  - **Hitbox Logic:** Each tile has its own collision box. Losing a "Wing" tile instantly updates the physics and weapon fire patterns.

### 2.2 The "Hive-Mind" Swarms

Enemy waves utilize a weighted Boids-plus-Targeting algorithm.

- **Cohesion:** Keeps the swarm feeling like a single organism.
- **Separation:** Prevents overlap, making the swarm spread out to "gate" the player's movement.
- **Target Tendency:** A vector pulling the flock toward the player's current grid coordinates.
- **State Flip:** When the flock leader is killed, the remaining drones' `Alignment` weight drops to zero, causing them to scatter frantically before retreating or kamikaze-diving.

### 2.3 Adaptive Content Generation

The game "mutates" based on player performance metrics.

- **Input Tracking:** The engine logs `Accuracy`, `Average Distance`, and `Configuration Complexity`.
- **The Mutator:** Between stages, the game adjusts the next wave's attributes:
  - High Player DPS $\rightarrow$ Enemies gain "Hard Shell" plating (requires concentrated fire).
  - High Player Mobility $\rightarrow$ Enemies gain "Web" projectiles (slows player on hit).

## 3. Stage Structure (The "Galaga" Pulse)

5-10 short, high-intensity stages.

1.  **The Ingress:** Fixed-path enemies (splines) for quick satisfaction and initial tile drops.
2.  **The Swarm:** Emergent flocking waves that test positioning.
3.  **The Mutation Point:** A mid-stage mini-boss that drops a guaranteed rare 3x3 component.
4.  **The Stage Boss:** A "Sponge" entity with a 3x3 (or larger) destructible grid. Players must peel off the boss's "skin" tiles to expose the core.

## 4. Technical Specifications (Hints)

### 4.1 Ship Management

```javascript
// Minimalist ship state structure
const playerShip = {
  grid: [
    [null, "wing_L", null],
    ["cannon_L", "core", "cannon_R"],
    [null, "thruster", null],
  ],
  updatePhysics() {
    // Calculate speed/hitbox based on grid occupancy
  },
  onTileHit(x, y) {
    if (x === 1 && y === 1) gameOver();
    this.grid[x][y] = null; // Tile destroyed
    this.updatePhysics();
  },
};
```

### 4.2 Flocking Weights

```javascript
const swarmParams = {
  cohesion: 1.2,
  separation: 1.5,
  alignment: 1.0,
  playerAttraction: 0.5, // The "Aggro" variable
};
```

## 5. Art & Sound Style

- **Visuals:** Sprite-tile based. Use organic palettes (purples, sickly greens, pulsing oranges).
- **Transitions:** When morphing, use a "chromatic aberration" or "organic growth" shader effect to hide the tile swap.
- **Audio:** Biomechanical squelches for power-ups; high-pitched chitters for the swarm.

---

**Next Steps:**

1.  Initialize the `3x3 Array` for the player ship.
2.  Implement a simple `Boids Class` for the drones.
3.  Create a `Spawner` that increments difficulty weights based on the player's current `grid.length`.
