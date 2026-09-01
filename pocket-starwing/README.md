# Starward Run

Starward Run is an original browser-based idle survival roguelite.

## The design

The ship flies, aims, shoots and dodges automatically. The player makes high-value decisions instead of steering constantly:

- Five structured pre-flight choices establish the run.
- Build choices are deliberately spaced out.
- Kills charge a screen-clearing Star Laser, but it can fire at most once every 30 seconds.
- Timed live challenges appear without pausing combat. Tap the playfield within five seconds to opt into extra danger and rewards, or ignore them.
- Bosses, sectors, escalating enemy formations and build synergies create long-run structure.
- Backgrounds use biome-specific parallax, planets, nebulae, debris, energy bands and comets.

## UX principles

The interface is designed around three questions:

1. How healthy is the ship?
2. Is the Star Laser ready?
3. Is there a live decision worth taking?

Everything else stays secondary so the game remains readable while enemy density climbs.

## Validation

`smoke-test.cjs` verifies:
- the five-step starting draft,
- the run starts correctly,
- live events appear and can be accepted,
- enemy density reaches a meaningful level,
- blocking upgrade choices stay limited,
- and Star Laser activations never occur less than 30 seconds apart.
