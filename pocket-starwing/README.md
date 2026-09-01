# Starward Run

Starward Run is an autopilot survival roguelite designed around long stretches of watchable combat interrupted by a small number of meaningful decisions.

## Core loop

1. Configure a five-choice starting build.
2. The ship flies, aims, shoots and dodges automatically.
3. Tap an enemy to focus fire on it for five seconds.
4. Kills charge the Star Laser; once charged and off its 30-second lock, tap the ship to erase normal enemies and enemy projectiles.
5. Optional live events appear for five seconds without pausing combat. Tap empty space to accept them or ignore them.
6. Long runs progress through sectors, bosses, route decisions and Deep Space modifiers.

## Build system

Upgrades use plain-language categories: Weapon, Offense, Defense, Autopilot, Command, Utility, Special and Doctrine. Cards show a before/after preview where possible. Synergy thresholds visibly evolve the ship and its weapons, including Fortress Build, Ace Autopilot, Full Auto, Missile Storm, Beam Lance and Detonation Grid.

## Bosses

Bosses have distinct mechanics rather than sharing one bullet pattern:
- Glimmer Maw summons escorts.
- Cinder Throne emits radial projectile rings.
- Archive Crown uses a rechargeable shield that creates damage windows.
- Storm Seraph telegraphs dangerous sweeping lanes.
- Violet Oracle teleports and fires radial bursts after it is unlocked.
- The optional Rift Tyrant combines several mechanics.

## Live events

Examples include voluntary swarms, elite hunters, reactor overdrive, shield gambits, carrier fleets, rescue escorts, treasure runners, asteroid gauntlets, hull sacrifice and voluntary Rift boss fights.

## Long-run structure

Every sector changes the environment. Starting in Sector 5, Deep Space modifiers add rule changes such as Elite Sector, Bullet Storm, Hyperlane, Shield Blackout and Boss Rush. Rare route decisions also create safer or more aggressive paths.

## Meta progression

Runs earn Stellar Cores. Cores unlock breadth rather than permanent raw stats: new weapon families, event types, doctrines, signature upgrades, biome variants, boss encounters and cosmetic ship skins. Run history and best survival are stored locally.

## Presentation

The canvas uses layered nebulae, moving planets, parallax stars, debris, aurora bands, comets, animated enemy silhouettes, build-specific ship attachments, boss telegraphs, particles and screen shake. A small Web Audio synthesizer provides weapons, impacts, warnings, boss intensity, upgrade cues and Star Laser effects without requiring external audio files. Reduced-motion preferences are respected.

## Testing

`node --check game.js` validates syntax. `node smoke-test.cjs` exercises the five opening choices, dense combat, focus fire, live events, boss mechanics, Star Laser cooldown enforcement, blocking-choice cadence, results presentation and local meta-progression persistence.
