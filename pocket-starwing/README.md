# Starward Run

Starward Run is an autopilot survival roguelite: the ship flies, aims and dodges automatically while the player shapes the build, focuses priority targets, fires the Star Laser and chooses whether to accept live risks.

## Core interaction

- Five pre-flight choices, ending with an explicit run-defining doctrine.
- Automatic movement, aiming, firing and dodging.
- Tap the ship to fire the Star Laser when charged and its 30-second lock has expired.
- Tap an enemy or a destructible boss system to focus the arsenal for 7 seconds and gain a damage bonus.
- Timed live events continue combat while the player gets five seconds to opt in.

## V9 production systems

### Weapon evolution
Every weapon can reach a dramatic late-run form: Pulse Overdrive, Galaxy Spread, Cluster Apocalypse, Rail Lance, Flak Cascade, Arc Web, Drone Fleet, Beam Array and Nova Core. Upgrade cards show progress toward the next evolution, and the ship changes visually as its arsenal grows.

### Boss encounters
Bosses enter with a short cinematic beat, expose destructible weapon systems, telegraph major attacks, change behavior between phases and alter the visual arena. Destroying systems weakens attacks and exposes the core for bonus damage.

### Elite variants
Elite enemies can be Shielded, Phase, Berserker, Splitter, Commander, Vampire, Armored or Cloaked. The modifier is visually readable and changes behavior rather than only adding health.

### Mechanically distinct sectors
Each biome has a rule: Tailwind, Heat Front, Ruin Hunters, Ion Storm, Gravity Tide, Gold Rush or Prismatic Void. Rules change movement, elite frequency, shield regeneration, projectile curvature, build progress and encounter composition.

### Mythic / God effects
Rare signature upgrades can fundamentally alter combat, including Critical Nova, Star Laser Wake, Prism Mirror, Ghost Fleet and Arsenal Singularity.

### Live stories and rare encounters
Live challenges are framed as short situations such as a civilian mayday, unstable rift, bounty broadcast, fleet crossing or derelict reactor. Longer runs can encounter an allied carrier, derelict megaship, wormhole or Asteroid Leviathan.

### Doctrines
Unlocked doctrines can radically change a run without creating permanent raw-power progression: Balanced Systems, Fortress Doctrine, Hunter Doctrine, Experimental Arsenal, Swarm Protocol, Boss Hunter, Chaos Draft and Glass Fleet.

### Meta progression
Stellar Cores unlock breadth: weapons, events, biomes, doctrines, signature upgrades, bosses and cosmetic ship skins. The pre-run menu shows collection progress across the arsenal, events, bosses, biomes, doctrines and skins.

### Presentation and performance
- Player projectiles use a cool-color hierarchy while enemy fire stays warm and warning attacks are brighter.
- Dynamic nebulae, planets, debris, aurora bands, comets, boss arena effects and rare megastructures.
- Ship visuals grow missile pods, cannons, armor, shield hardware, drones and evolved weapon effects.
- Death uses a short reactor-failure sequence before an animated results screen with build-of-the-run, evolutions, boss history, unlocks and Stellar Cores.
- Adaptive rendering quality, projectile caps and particle limits preserve mobile performance while keeping enemy density high.

## Validation

`smoke-test.cjs` runs a deterministic multi-minute simulation and verifies:

- five pre-flight choices and doctrine UX
- dense combat and sparse blocking choices
- live events and focus fire
- 30-second Star Laser lock
- weapon evolution
- elite affixes
- rare encounters
- boss mechanics and destructible weak-point targeting
- adaptive quality bounds
- death/results flow and saved meta progression
