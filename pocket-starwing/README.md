# Pocket Starwing

A self-contained original pixel-art browser rail shooter.

## Primary movement
The ship now uses a **fixed forward lane**. The player does not move forward or backward.

On touch or mouse, use the dedicated vertical control rail on the left side of the game. Hold anywhere on the rail and slide your thumb/finger/mouse up or down; the ship moves vertically by the same relative amount. This keeps the player's hand away from the ship and preserves visibility during dodging.

Keyboard fallback is vertical only: W/S or Up/Down. Left/Right and A/D movement are disabled.

## Actions
- Hold FIRE / Space: autofire
- Dodge: button, Shift or C
- Bomb: button or X
- Pause: P

## Weapon families
Weapon drops switch or upgrade distinct weapon families. Collecting the same family upgrades it to a maximum of three stars.
- Pulse Cannon — fast, accurate general-purpose fire
- Star Scatter — broad spread for swarms and tight movement
- Prism Beam — rapid piercing shots for lines of enemies
- Firefly Seekers — homing projectiles for agile targets
- Nova Lance — slow, high-damage armour breaker with splash

More weapon families unlock as sectors progress.

## Enemy roster
The director can mix scouts, zig fighters, divers, turrets, tanks, mines, splitters and carriers. Splitters spawn smaller enemies when destroyed; carriers deploy fighters and drop weapons; mines change speed as the player approaches.

## Level progression
Each biome has recurring set pieces rather than only random hazards:
- Cloudberry Run: high/low tunnel routes plus wind lanes
- Ember Canyon: tunnel runs mixed with breakable asteroid fields
- Moonlit Ruins: tunnels followed by moving gate structures
- Thunder Reach: route changes plus telegraphed lightning sequences
- Candy Nebula: tunnel timing disrupted by gravity wells

The encounter director mixes formations, terrain, hazards and set pieces, then escalates into the sector boss. Route choices change the mechanical mix, not just the colour palette.

## Existing systems
Environmental collision, knockback, readable safe gaps, breakable terrain, graze scoring, dodge energy, combo multipliers, bombs, shields, particles, hit-stop, screen shake and boss rage phases remain part of the core loop.
