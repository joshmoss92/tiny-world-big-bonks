# Pocket Starwing

A self-contained original pixel-art browser rail shooter.

## Play
Open `index.html` directly or serve this folder with any static HTTP server. No build step or runtime dependencies are required.

## Controls
- Move: WASD or arrow keys
- Fire: Space (hold for autofire)
- Dodge burst: Shift or C
- Bomb: X
- Pause: P
- Touch controls are built into the page, including hold-to-fire and dodge.

## Gameplay systems
- Five-sector branching campaign with five biome hazard profiles
- Environmental collision with knockback and short invulnerability frames
- Procedural tunnel walls with readable safe gaps
- Breakable crystals/asteroids that can drop power-ups
- Biome hazards: wind lanes, asteroid rushes, moving ruin gates, telegraphed lightning, gravity wells
- Thread-the-needle gate bonuses
- Bullet grazing: near misses award score and recharge dodge energy
- Energy-powered dodge with directional burst and invulnerability window
- Enemy formations with scouts, zig fighters, divers, turrets and tanks
- Multi-phase bosses with rage behaviour at low health
- Four weapon tiers, shields, repair pickups, bombs and score pickups
- Combo multiplier, particles, hit-stop, screen shake, audio feedback and collision knockback

## Design goal
Fast, readable arcade action: the player should be able to understand why they were hit, recover from mistakes, and take deliberate risks for higher scores instead of surviving random obstacle spam.
