# Starward Run

An original browser idle roguelite survival autoscroller. The ship flies, aims, shoots and dodges automatically; the player shapes the run through occasional upgrade and route decisions.

## Core loop

1. Every run starts with five setup choices. Each choice offers three upgrades.
2. The ship then fights on its own at a fast visual pace.
3. Normal upgrade decisions are intentionally spaced apart, even if the upgrade meter fills early.
4. Route events appear occasionally and resolve in a single decision rather than chaining into more menus.
5. Dreadnought bosses provide rare boss-reward choices.
6. The run continues until the build can no longer survive the escalating threat.

## Upgrade language

Upgrade cards use plain-English names and effects such as:
- Reinforced Hull — more maximum hull.
- Larger Shield — more rechargeable shield.
- Faster Repairs — passive hull repair.
- Better Dodging — earlier autopilot reactions.
- Faster Engines — quicker movement between safe lanes.
- Weapon Damage / Fire Rate / Critical Chance.
- Piercing Shots / Blast Radius.
- Salvage Bonus / Upgrade Progress / Rarity Luck.
- Weapon cards clearly say `Unlock` or `Upgrade` and show the resulting level.

Rarities are colour coded: Rare, Epic, Legendary, Mythic and God.

## Idle pacing

- Five setup choices before combat.
- Normal choices cannot interrupt more frequently than roughly once every 68 seconds.
- Route events are roughly two minutes apart and never open follow-up choice chains.
- Bosses are several minutes apart and provide a single special reward choice.
- Adaptive pressure eases enemy density when hull is low.
- Breather windows periodically clear pressure without requiring input.

The visual travel speed is deliberately faster than the combat lethality, so the game looks energetic without simply making enemy fire unfairly fast.
