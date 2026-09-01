(() => {
'use strict';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');

const overlay = $('overlay');
const overlayTitle = $('overlayTitle');
const overlayText = $('overlayText');
const eyebrow = $('eyebrow');
const choiceGrid = $('choiceGrid');
const startBtn = $('startBtn');

const ui = {
  time: $('time'),
  hull: $('hull'),
  shield: $('shield'),
  level: $('level'),
  salvage: $('salvage'),
  damage: $('statDamage'),
  rate: $('statRate'),
  dodge: $('statDodge'),
  thrust: $('statThrust'),
  repair: $('statRepair'),
  luck: $('statLuck'),
  xp: $('xpText'),
  xpBar: $('xpBar'),
  chips: $('buildChips')
};

const W = canvas.width;
const H = canvas.height;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const chance = (p) => Math.random() < p;

ctx.imageSmoothingEnabled = false;

const RARITIES = [
  { name: 'Rare', cls: 'rare', weight: 55, power: 1.00 },
  { name: 'Epic', cls: 'epic', weight: 25, power: 1.45 },
  { name: 'Legendary', cls: 'legendary', weight: 12, power: 2.10 },
  { name: 'Mythic', cls: 'mythic', weight: 6, power: 3.10 },
  { name: 'God', cls: 'god', weight: 2, power: 4.80 }
];

const BIOMES = [
  { name: 'Cloudreach', top: '#10294f', bottom: '#67b6c8', accent: '#b8ef9a' },
  { name: 'Ember Belt', top: '#25162e', bottom: '#c55a47', accent: '#ffd06c' },
  { name: 'Silent Ruins', top: '#0b1230', bottom: '#354467', accent: '#7ce6df' },
  { name: 'Stormglass', top: '#0b1120', bottom: '#26394f', accent: '#d9efff' },
  { name: 'Violet Deep', top: '#211132', bottom: '#70407c', accent: '#ffc0ef' }
];

const WEAPONS = {
  pulse:   { name: 'Pulse Cannon', icon: '•', color: '#fff1a0', cooldown: .34, damage: 5.0, speed: 650 },
  scatter: { name: 'Scatter Array', icon: '✣', color: '#ffb5e5', cooldown: .72, damage: 3.2, speed: 570 },
  missile: { name: 'Seeker Rack', icon: '◇', color: '#b7ff8c', cooldown: .92, damage: 8.0, speed: 450 },
  rail:    { name: 'Rail Lance', icon: '━', color: '#ffffff', cooldown: 1.15, damage: 12.0, speed: 1050 },
  flak:    { name: 'Flak Core', icon: '✹', color: '#ff9b77', cooldown: .82, damage: 7.0, speed: 520 },
  arc:     { name: 'Arc Coil', icon: 'ϟ', color: '#9fc5ff', cooldown: .98, damage: 6.2, speed: 700 },
  drone:   { name: 'Escort Drones', icon: '⊙', color: '#7fffc3', cooldown: .62, damage: 4.0, speed: 680 },
  laser:   { name: 'Prism Laser', icon: '▸', color: '#ff8df4', cooldown: .18, damage: 2.4, speed: 1200 },
  nova:    { name: 'Nova Mortar', icon: '✦', color: '#ffd27a', cooldown: 1.35, damage: 13.0, speed: 420 }
};

const ENEMIES = {
  scout:    { hp: 8,  speed: 118, fire: 2.7, damage: 1, xp: 2, salvage: 1, size: 15, color: '#a9ef8c' },
  dart:     { hp: 6,  speed: 180, fire: 99,  damage: 1, xp: 2, salvage: 1, size: 12, color: '#ff879a' },
  gunner:   { hp: 17, speed: 88,  fire: 1.75,damage: 1, xp: 4, salvage: 2, size: 20, color: '#8ce6de' },
  tank:     { hp: 42, speed: 62,  fire: 2.15,damage: 2, xp: 7, salvage: 4, size: 28, color: '#f2b96b' },
  sniper:   { hp: 15, speed: 72,  fire: 3.6, damage: 2, xp: 5, salvage: 3, size: 18, color: '#ff9a78' },
  swarm:    { hp: 4,  speed: 205, fire: 4.2, damage: 1, xp: 1, salvage: 1, size: 10, color: '#e8ff92' },
  bomber:   { hp: 28, speed: 76,  fire: 3.1, damage: 2, xp: 6, salvage: 4, size: 23, color: '#ffa86e' },
  guardian: { hp: 32, speed: 68,  fire: 2.5, damage: 1, xp: 7, salvage: 4, size: 24, color: '#73c9ff' },
  splitter: { hp: 20, speed: 98,  fire: 2.8, damage: 1, xp: 5, salvage: 3, size: 19, color: '#f09bd7' }
};

const PREFIXES = [
  'Refined', 'Twin', 'Quantum', 'Adaptive', 'Ancient', 'Overclocked',
  'Harmonic', 'Void-Touched', 'Stellar', 'Recursive', 'Royal', 'Impossible',
  'Astral', 'Mirrored', 'Hyperdense', 'Living', 'Fractal', 'Sovereign'
];

const SUFFIXES = [
  'Mk II', 'Protocol', 'Core', 'Array', 'Engine', 'Matrix',
  'Lattice', 'Directive', 'Catalyst', 'Circuit', 'Doctrine', 'Drive'
];

const STAT_FAMILIES = [
  { key:'hull', name:'Hull Matrix', group:'survival', base:2, desc:'maximum hull', format:(v)=>`+${v} max hull and repair ${Math.max(1,Math.ceil(v*.7))} hull` },
  { key:'dodge', name:'Evasive AI', group:'survival', base:1, desc:'evasion intelligence', format:(v)=>`+${v} evade intelligence` },
  { key:'thrust', name:'Vector Thrusters', group:'survival', base:.12, desc:'maneuver thrust', format:(v)=>`+${Math.round(v*100)}% thrust` },
  { key:'shield', name:'Shield Lattice', group:'survival', base:2, desc:'shield capacity', format:(v)=>`+${v} shield capacity and refill` },
  { key:'repair', name:'Repair Nanites', group:'survival', base:.018, desc:'hull regeneration', format:(v)=>`+${v.toFixed(3)} hull/sec repair` },
  { key:'armor', name:'Reactive Armor', group:'survival', base:.07, desc:'damage mitigation', format:(v)=>`+${Math.round(v*100)}% mitigation chance` },
  { key:'damage', name:'Targeting Uplink', group:'offense', base:.13, desc:'weapon damage', format:(v)=>`+${Math.round(v*100)}% weapon damage` },
  { key:'rate', name:'Cryo Cooling', group:'offense', base:.11, desc:'fire rate', format:(v)=>`+${Math.round(v*100)}% fire rate` },
  { key:'crit', name:'Critical Matrix', group:'offense', base:.055, desc:'critical chance', format:(v)=>`+${Math.round(v*100)}% critical chance` },
  { key:'projectile', name:'Accelerator', group:'offense', base:.14, desc:'projectile velocity', format:(v)=>`+${Math.round(v*100)}% projectile speed` },
  { key:'pierce', name:'Phase Bore', group:'offense', base:1, desc:'projectile penetration', format:(v)=>`+${v} projectile pierce` },
  { key:'splash', name:'Blast Geometry', group:'offense', base:1, desc:'explosive radius', format:(v)=>`+${v} splash power` },
  { key:'salvage', name:'Salvage Logic', group:'utility', base:.16, desc:'salvage yield', format:(v)=>`+${Math.round(v*100)}% salvage` },
  { key:'xp', name:'Combat Telemetry', group:'utility', base:.14, desc:'experience gain', format:(v)=>`+${Math.round(v*100)}% XP` },
  { key:'luck', name:'Lucky Star', group:'utility', base:.04, desc:'rarity luck', format:(v)=>`+${Math.round(v*100)}% luck` }
];

const stars = Array.from({ length: 150 }, () => ({
  x: rand(0, W), y: rand(0, H), z: rand(.15, 1), s: chance(.16) ? 2 : 1
}));

let S;
let raf = 0;
let last = 0;

function freshState() {
  return {
    phase: 'menu',
    time: 0,
    level: 1,
    xp: 0,
    xpNeed: 14,
    salvage: 0,
    hull: 12,
    maxHull: 12,
    shield: 2,
    maxShield: 2,
    shieldRegen: .07,
    shieldDelay: 0,
    threat: .58,
    grace: 15,
    kills: 0,
    bosses: 0,
    openingPick: 0,
    stats: {
      damage: 1,
      rate: 1,
      dodge: 1,
      thrust: 1.08,
      repair: .008,
      luck: 0,
      armor: .05,
      crit: .03,
      xp: 1,
      salvage: 1,
      projectile: 1,
      pierce: 0,
      splash: 0
    },
    weapons: {
      pulse: 1, scatter: 0, missile: 0, rail: 0, flak: 0,
      arc: 0, drone: 0, laser: 0, nova: 0
    },
    weaponCooldowns: {},
    upgradeLog: {},
    ship: { x: 165, y: H/2, targetY: H/2, aiTimer: 0, inv: 0, tilt: 0 },
    enemies: [],
    bullets: [],
    shots: [],
    particles: [],
    boss: null,
    director: { spawn: 2.5, wave: 10, event: 38, boss: 110 },
    choiceQueue: [],
    best: Number(localStorage.getItem('starwardBest') || 0)
  };
}

function formatTime(t) {
  return `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
}

function rollRarity(minIndex = 0) {
  const weights = RARITIES.map((r, i) => {
    if (i < minIndex) return 0;
    const luckBoost = i === 0 ? 1 : 1 + (S.stats.luck * i * .9);
    return r.weight * luckBoost;
  });
  let total = weights.reduce((a,b)=>a+b,0);
  let roll = Math.random() * total;
  for (let i=0;i<RARITIES.length;i++) {
    roll -= weights[i];
    if (roll <= 0) return RARITIES[i];
  }
  return RARITIES[Math.max(0,minIndex)];
}

function randomName(base) {
  return `${pick(PREFIXES)} ${base} ${chance(.42) ? pick(SUFFIXES) : ''}`.trim();
}

function applyStat(key, amount) {
  switch (key) {
    case 'hull':
      S.maxHull += amount;
      S.hull = Math.min(S.maxHull, S.hull + Math.max(1, Math.ceil(amount*.7)));
      break;
    case 'dodge': S.stats.dodge += amount; break;
    case 'thrust': S.stats.thrust += amount; break;
    case 'shield':
      S.maxShield += amount;
      S.shield = S.maxShield;
      S.shieldRegen += .012 * Math.max(1, amount/2);
      break;
    case 'repair': S.stats.repair += amount; break;
    case 'armor': S.stats.armor = Math.min(.8, S.stats.armor + amount); break;
    case 'damage': S.stats.damage += amount; break;
    case 'rate': S.stats.rate += amount; break;
    case 'crit': S.stats.crit = Math.min(.75, S.stats.crit + amount); break;
    case 'projectile': S.stats.projectile += amount; break;
    case 'pierce': S.stats.pierce += amount; break;
    case 'splash': S.stats.splash += amount; break;
    case 'salvage': S.stats.salvage += amount; break;
    case 'xp': S.stats.xp += amount; break;
    case 'luck': S.stats.luck = Math.min(.8, S.stats.luck + amount); break;
  }
}

function generateStatCard(group = null, minRarity = 0) {
  const familyPool = group ? STAT_FAMILIES.filter(f => f.group === group) : STAT_FAMILIES;
  const family = pick(familyPool);
  const rarity = rollRarity(minRarity);
  const variance = rand(.9, 1.12);
  let amount = family.base * rarity.power * variance;
  if (['hull','dodge','shield','pierce','splash'].includes(family.key)) {
    amount = Math.max(1, Math.round(amount));
  }
  const title = randomName(family.name);
  return {
    id: `${family.key}:${rarity.name}:${Math.round(Number(amount)*10000)}:${title}`,
    title,
    rarity,
    desc: `A ${rarity.name.toLowerCase()} modification focused on ${family.desc}.`,
    effect: family.format(amount),
    apply() { applyStat(family.key, amount); }
  };
}

function generateWeaponCard(minRarity = 0) {
  const key = pick(Object.keys(WEAPONS));
  const weapon = WEAPONS[key];
  const rarity = rollRarity(minRarity);
  const current = S.weapons[key];
  const gain = Math.max(1, Math.round(rarity.power * .72));
  const title = randomName(weapon.name);
  return {
    id: `weapon:${key}:${rarity.name}:${gain}:${title}`,
    title,
    rarity,
    desc: current
      ? `Evolve ${weapon.name} beyond its current ★${current} configuration.`
      : `Install a new automatic ${weapon.name} system.`,
    effect: `${current ? 'Upgrade' : 'Install'} ${weapon.name} +${gain}`,
    apply() { S.weapons[key] = Math.min(15, current + gain); }
  };
}

function generateCard(kind = 'random', minRarity = 0) {
  if (kind === 'weapon') return generateWeaponCard(minRarity);
  if (kind === 'survival' || kind === 'offense' || kind === 'utility') return generateStatCard(kind, minRarity);
  return chance(.34) ? generateWeaponCard(minRarity) : generateStatCard(null, minRarity);
}

function makeDraft(spec = ['random','random','random'], minRarity = 0) {
  const out = [];
  let guard = 0;
  while (out.length < 3 && guard++ < 100) {
    const kind = spec[out.length] || 'random';
    const card = generateCard(kind, minRarity);
    if (!out.some(c => c.id === card.id)) out.push(card);
  }
  while (out.length < 3) out.push(generateCard('random', minRarity));
  return out;
}

function updateUI() {
  ui.time.textContent = formatTime(S.time);
  ui.hull.textContent = `${Math.max(0,Math.ceil(S.hull))}/${S.maxHull}`;
  ui.shield.textContent = `${Math.max(0,Math.floor(S.shield))}/${S.maxShield}`;
  ui.level.textContent = S.level;
  ui.salage = ui.salvage;
  ui.salvage.textContent = Math.floor(S.salvage);
  ui.damage.textContent = `${Math.round(S.stats.damage*100)}%`;
  ui.rate.textContent = `${Math.round(S.stats.rate*100)}%`;
  ui.dodge.textContent = S.stats.dodge;
  ui.thrust.textContent = `${Math.round(S.stats.thrust*100)}%`;
  ui.repair.textContent = `${S.stats.repair.toFixed(3)}/s`;
  ui.luck.textContent = `${Math.round(S.stats.luck*100)}%`;
  ui.xp.textContent = `${Math.floor(S.xp)} / ${S.xpNeed} XP`;
  ui.xpBar.style.width = `${clamp(S.xp/S.xpNeed*100,0,100)}%`;

  const chips = [];
  for (const [key, level] of Object.entries(S.weapons)) {
    if (level > 0) chips.push(`<span class="weapon-chip">${WEAPONS[key].icon} ${WEAPONS[key].name} ★${level}</span>`);
  }
  for (const [name, count] of Object.entries(S.upgradeLog)) {
    chips.push(`<span>${name}${count>1 ? ` ×${count}` : ''}</span>`);
  }
  ui.chips.innerHTML = chips.join('') || '<span class="empty-chip">No upgrades yet</span>';
}

function hideOverlay() {
  overlay.classList.add('hidden');
  choiceGrid.classList.add('hidden');
}

function showChoiceScreen({ type, heading, body, cards, progress = '', onPick }) {
  S.phase = 'choice';
  eyebrow.textContent = type;
  overlayTitle.textContent = heading;
  overlayText.innerHTML = `${progress ? `<div class="draft-progress">${progress}</div>` : ''}${body}`;
  choiceGrid.innerHTML = '';
  choiceGrid.classList.remove('hidden');
  startBtn.classList.add('hidden');
  overlay.classList.remove('hidden');

  cards.forEach((card) => {
    const button = document.createElement('button');
    button.className = `choice-card r-${card.rarity.cls}`;
    button.innerHTML = `
      <span class="rarity">${card.rarity.name.toUpperCase()}</span>
      <h3>${card.title}</h3>
      <p>${card.desc}</p>
      <span class="effect">${card.effect}</span>
    `;
    button.addEventListener('click', () => {
      card.apply();
      S.upgradeLog[card.title] = (S.upgradeLog[card.title] || 0) + 1;
      updateUI();
      hideOverlay();
      onPick();
    }, { once: true });
    choiceGrid.appendChild(button);
  });
}

function showOpeningDraft() {
  const index = S.openingPick;
  const specs = [
    ['weapon','survival','offense'],
    ['survival','weapon','random'],
    ['survival','offense','utility'],
    ['weapon','survival','random'],
    ['survival','offense','weapon']
  ];
  const minRarity = index === 4 ? 1 : 0;
  showChoiceScreen({
    type: 'PRE-FLIGHT',
    heading: 'Configure the ship',
    body: 'Choose one system. Combat starts only after all five installations.',
    cards: makeDraft(specs[index], minRarity),
    progress: `INITIAL UPGRADE ${index+1} / 5`,
    onPick: () => {
      S.openingPick += 1;
      if (S.openingPick < 5) {
        setTimeout(showOpeningDraft, 60);
      } else {
        beginCombat();
      }
    }
  });
}

function startRun() {
  cancelAnimationFrame(raf);
  S = freshState();
  updateUI();
  showOpeningDraft();
}

function beginCombat() {
  hideOverlay();
  S.phase = 'running';
  S.grace = 15;
  last = performance.now();
  raf = requestAnimationFrame(loop);
}

function queueChoice(fn) {
  S.choiceQueue.push(fn);
}

function resumeOrNext() {
  if (S.choiceQueue.length) {
    const fn = S.choiceQueue.shift();
    setTimeout(fn, 50);
  } else {
    S.phase = 'running';
    hideOverlay();
  }
}

function showLevelDraft(minRarity = 0, label = 'LEVEL UP') {
  showChoiceScreen({
    type: label,
    heading: 'Choose an upgrade',
    body: 'Adapt the build before the next pressure spike.',
    cards: makeDraft(['random','survival','random'], minRarity),
    onPick: resumeOrNext
  });
}

function gainXP(amount) {
  S.xp += amount * S.stats.xp;
  while (S.xp >= S.xpNeed) {
    S.xp -= S.xpNeed;
    S.level += 1;
    S.xpNeed = Math.round(S.xpNeed * 1.2 + 3);
    queueChoice(() => showLevelDraft(0, 'LEVEL UP'));
  }
  if (S.phase === 'running' && S.choiceQueue.length) {
    const fn = S.choiceQueue.shift();
    fn();
  }
}

function spawnEnemy(type, y = rand(65,H-65), elite = false) {
  const base = ENEMIES[type];
  const hpScale = 1 + S.time / 240;
  S.enemies.push({
    type,
    x: W + 40,
    y,
    baseY: y,
    hp: base.hp * hpScale * (elite ? 2.1 : 1),
    speed: base.speed,
    fireTimer: rand(.6, Math.max(.8, base.fire)),
    elite,
    size: base.size,
    color: base.color,
    t: 0
  });
}

function spawnWave() {
  const pool = ['scout','dart','gunner'];
  if (S.time > 40) pool.push('swarm','sniper');
  if (S.time > 80) pool.push('bomber','guardian','splitter');
  if (S.time > 145) pool.push('tank');
  const count = Math.min(7, 2 + Math.floor(S.time/60));
  for (let i=0;i<count;i++) {
    spawnEnemy(
      pick(pool),
      80 + i*(H-160)/Math.max(1,count-1),
      chance(.025 + S.time/6500)
    );
  }
}

function nearestTarget() {
  let best = S.boss || null;
  let bestX = best ? best.x : Infinity;
  for (const enemy of S.enemies) {
    if (enemy.x < bestX) {
      best = enemy;
      bestX = enemy.x;
    }
  }
  return best;
}

function updateWeapons(dt) {
  for (const key of Object.keys(WEAPONS)) {
    S.weaponCooldowns[key] = Math.max(0, (S.weaponCooldowns[key] || 0) - dt);
  }
  const target = nearestTarget();
  if (!target) return;

  for (const [key, level] of Object.entries(S.weapons)) {
    if (level <= 0 || S.weaponCooldowns[key] > 0) continue;

    const info = WEAPONS[key];
    S.weaponCooldowns[key] = info.cooldown / (S.stats.rate * Math.sqrt(level));
    const count = key === 'scatter' ? Math.min(8,2+level) : key === 'drone' ? Math.min(5,level) : 1;

    for (let i=0;i<count;i++) {
      const baseAngle = Math.atan2(target.y-S.ship.y,target.x-S.ship.x);
      const angle = baseAngle + (i-(count-1)/2) * (key === 'scatter' ? .105 : .04);
      const speed = (info.speed + level*34) * S.stats.projectile;
      const crit = chance(S.stats.crit) ? 2 : 1;
      S.shots.push({
        kind: key,
        x: S.ship.x+22,
        y: S.ship.y,
        vx: Math.cos(angle)*speed,
        vy: Math.sin(angle)*speed,
        damage: (info.damage + level*1.35)*S.stats.damage*crit,
        life: 3.4,
        color: info.color,
        pierce: S.stats.pierce + (key === 'rail' ? 2 : 0),
        splash: S.stats.splash + ((key === 'flak' || key === 'nova') ? 1+level*.22 : 0),
        homing: key === 'missile'
      });
    }
  }
}

function damageShip(amount) {
  if (S.ship.inv > 0 || S.phase !== 'running') return;
  let damage = amount;

  if (S.shield > 0) {
    const absorbed = Math.min(S.shield, damage);
    S.shield -= absorbed;
    damage -= absorbed;
  }
  if (damage > 0 && chance(S.stats.armor)) damage = Math.max(0, damage-1);

  S.hull -= damage;
  S.ship.inv = .5;
  S.shieldDelay = 4;

  if (S.hull <= 0) endRun();
}

function killEnemy(enemy) {
  const data = ENEMIES[enemy.type];
  S.salvage += data.salvage * S.stats.salvage;
  S.kills += 1;
  gainXP(data.xp);
  for (let i=0;i<8;i++) {
    S.particles.push({
      x: enemy.x, y: enemy.y,
      vx: rand(-130,130), vy: rand(-130,130),
      life: .5, max: .5, color: enemy.color
    });
  }

  if (enemy.type === 'splitter') {
    spawnEnemy('swarm', enemy.y-18);
    spawnEnemy('swarm', enemy.y+18);
    const a = S.enemies[S.enemies.length-1];
    const b = S.enemies[S.enemies.length-2];
    if (a) a.x = enemy.x;
    if (b) b.x = enemy.x;
  }
}

function updateAutopilot(dt) {
  S.ship.aiTimer -= dt;
  if (S.ship.aiTimer <= 0) {
    S.ship.aiTimer = Math.max(.055, .24 - S.stats.dodge*.024);
    let bestY = H/2;
    let bestRisk = Infinity;

    for (let y=62;y<H-52;y+=32) {
      let risk = Math.abs(y-H/2)*.0017;
      for (const bullet of S.bullets) {
        const dx = bullet.x-S.ship.x;
        if (dx > -10 && dx < 330) {
          risk += Math.max(0, 8-Math.abs(y-bullet.y)/11) * (1+S.stats.dodge*.28);
        }
      }
      for (const enemy of S.enemies) {
        const dx = enemy.x-S.ship.x;
        if (dx > 0 && dx < 190) risk += Math.max(0, 7-Math.abs(y-enemy.y)/14);
      }
      if (risk < bestRisk) {
        bestRisk = risk;
        bestY = y;
      }
    }
    S.ship.targetY = bestY;
  }

  const previousY = S.ship.y;
  const maxMove = 225*S.stats.thrust*dt;
  S.ship.y += clamp(S.ship.targetY-S.ship.y,-maxMove,maxMove);
  S.ship.y = clamp(S.ship.y,45,H-40);
  S.ship.tilt = (S.ship.y-previousY)*.09;
  S.ship.inv = Math.max(0,S.ship.inv-dt);
}

function updateEnemies(dt) {
  for (const enemy of S.enemies) {
    const info = ENEMIES[enemy.type];
    enemy.t += dt;
    enemy.x -= enemy.speed * dt * (.76 + S.threat*.09);

    if (enemy.type === 'dart') enemy.y = enemy.baseY + Math.sin(enemy.t*4.2)*74;
    if (enemy.type === 'swarm') enemy.y = enemy.baseY + Math.sin(enemy.t*5.4 + enemy.x*.02)*42;
    if (enemy.type === 'bomber') enemy.y = enemy.baseY + Math.sin(enemy.t*1.5)*55;

    enemy.fireTimer -= dt;
    if (enemy.fireTimer <= 0 && enemy.x < W-45 && info.fire < 90 && S.grace <= 0) {
      enemy.fireTimer = info.fire * rand(.9,1.25) / Math.sqrt(S.threat);
      const angle = Math.atan2(S.ship.y-enemy.y,S.ship.x-enemy.x);
      const speed = enemy.type === 'sniper' ? 260 : 155 + S.time*.08;
      const spread = enemy.type === 'bomber' ? [-.16,0,.16] : [0];
      for (const offset of spread) {
        S.bullets.push({
          x: enemy.x, y: enemy.y,
          vx: Math.cos(angle+offset)*speed,
          vy: Math.sin(angle+offset)*speed,
          damage: info.damage,
          life: 6
        });
      }
    }

    if (Math.hypot(enemy.x-S.ship.x,enemy.y-S.ship.y) < enemy.size+13) {
      enemy.hp = 0;
      damageShip(info.damage);
    }
  }
}

function updateProjectiles(dt) {
  for (const bullet of S.bullets) {
    bullet.x += bullet.vx*dt;
    bullet.y += bullet.vy*dt;
    bullet.life -= dt;
    if (Math.hypot(bullet.x-S.ship.x,bullet.y-S.ship.y) < 14) {
      bullet.life = 0;
      damageShip(bullet.damage);
    }
  }

  for (const shot of S.shots) {
    if (shot.homing) {
      const target = nearestTarget();
      if (target) {
        const desired = Math.atan2(target.y-shot.y,target.x-shot.x);
        const speed = Math.hypot(shot.vx,shot.vy);
        const current = Math.atan2(shot.vy,shot.vx);
        let diff = ((desired-current+Math.PI*3)%(Math.PI*2))-Math.PI;
        const angle = current + clamp(diff,-3.8*dt,3.8*dt);
        shot.vx = Math.cos(angle)*speed;
        shot.vy = Math.sin(angle)*speed;
      }
    }

    shot.x += shot.vx*dt;
    shot.y += shot.vy*dt;
    shot.life -= dt;

    for (const enemy of S.enemies) {
      if (enemy.hp <= 0) continue;
      if (Math.hypot(shot.x-enemy.x,shot.y-enemy.y) < enemy.size+5) {
        enemy.hp -= shot.damage;

        if (shot.splash > 0) {
          const radius = 44 + shot.splash*16;
          for (const other of S.enemies) {
            if (other !== enemy && other.hp > 0 && Math.hypot(other.x-enemy.x,other.y-enemy.y)<radius) {
              other.hp -= shot.damage*.32;
            }
          }
        }

        if (shot.kind === 'arc') {
          const other = S.enemies.find(o => o !== enemy && o.hp>0 && Math.hypot(o.x-enemy.x,o.y-enemy.y)<110);
          if (other) other.hp -= shot.damage*.55;
        }

        if (shot.pierce > 0) shot.pierce -= 1;
        else shot.life = 0;
        break;
      }
    }

    if (S.boss && Math.hypot(shot.x-S.boss.x,shot.y-S.boss.y) < S.boss.size) {
      S.boss.hp -= shot.damage;
      if (shot.pierce <= 0) shot.life = 0;
    }
  }
}

function spawnBoss() {
  const hp = 190 * (1 + S.bosses*.48);
  S.boss = {
    x: W+85, y:H/2, size:58,
    hp, maxHp:hp, fireTimer:1.4, t:0
  };
}

function updateBoss(dt) {
  if (!S.boss) return;
  const boss = S.boss;
  boss.t += dt;
  boss.x += (W-165-boss.x)*dt*.35;
  boss.y = H/2 + Math.sin(boss.t*1.15)*125;
  boss.fireTimer -= dt;

  if (boss.fireTimer <= 0 && S.grace <= 0) {
    boss.fireTimer = Math.max(.48,1.4-S.bosses*.07);
    const base = Math.atan2(S.ship.y-boss.y,S.ship.x-boss.x);
    for (let i=-2;i<=2;i++) {
      const angle = base+i*.14;
      S.bullets.push({
        x:boss.x,y:boss.y,
        vx:Math.cos(angle)*185,
        vy:Math.sin(angle)*185,
        damage:1,life:7
      });
    }
  }

  if (boss.hp <= 0) {
    S.boss = null;
    S.bosses += 1;
    S.salvage += 12;
    S.hull = Math.min(S.maxHull,S.hull+3);
    S.shield = S.maxShield;
    gainXP(14);
    queueChoice(() => showLevelDraft(1,'DREADNOUGHT SALVAGE'));
  }
}

function showEvent() {
  const safe = {
    rarity: RARITIES[0],
    title:'Safe Dock',
    desc:'A maintenance platform offers a conservative stop.',
    effect:'Repair 40% hull and refill shields',
    apply(){S.hull=Math.min(S.maxHull,S.hull+S.maxHull*.4);S.shield=S.maxShield;}
  };
  const tech = {
    rarity: RARITIES[1],
    title:'Salvage Exchange',
    desc:'Trade recovered material for a stronger technology roll.',
    effect:'Spend 6 salvage → Epic-or-better draft',
    apply(){
      S.salvage=Math.max(0,S.salvage-6);
      queueChoice(()=>showLevelDraft(1,'RECOVERED TECHNOLOGY'));
    }
  };
  const risk = {
    rarity: RARITIES[2],
    title:'Dangerous Shortcut',
    desc:'Accept heavier pressure for two immediate upgrade choices.',
    effect:'+15% threat → two upgrade drafts',
    apply(){
      S.threat += .15;
      queueChoice(()=>showLevelDraft(0,'SHORTCUT CACHE I'));
      queueChoice(()=>showLevelDraft(1,'SHORTCUT CACHE II'));
    }
  };

  showChoiceScreen({
    type:'EVENT',
    heading:'Signal Encounter',
    body:'Choose how the autopilot responds.',
    cards:[safe,tech,risk],
    onPick:resumeOrNext
  });
}

function updateDirector(dt) {
  if (S.grace > 0) {
    S.grace -= dt;
    return;
  }

  S.director.spawn -= dt;
  S.director.wave -= dt;
  S.director.event -= dt;
  S.director.boss -= dt;

  if (S.director.spawn <= 0) {
    const pool = S.time < 45 ? ['scout','dart'] : ['scout','dart','gunner'];
    spawnEnemy(pick(pool));
    S.director.spawn = rand(2.4,3.8)/S.threat;
  }

  if (S.director.wave <= 0) {
    spawnWave();
    S.director.wave = rand(10,14)/Math.sqrt(S.threat);
  }

  if (S.director.event <= 0) {
    S.director.event = rand(38,50);
    queueChoice(showEvent);
  }

  if (S.director.boss <= 0 && !S.boss) {
    S.director.boss = 105+rand(10,25);
    spawnBoss();
  }
}

function update(dt) {
  S.time += dt;
  S.threat = .58 + Math.min(2.6,S.time/125);
  S.hull = Math.min(S.maxHull,S.hull+S.stats.repair*dt);

  if (S.shieldDelay > 0) S.shieldDelay -= dt;
  else S.shield = Math.min(S.maxShield,S.shield+S.shieldRegen*dt);

  updateAutopilot(dt);
  updateWeapons(dt);
  updateDirector(dt);
  updateEnemies(dt);
  updateProjectiles(dt);
  updateBoss(dt);

  for (const enemy of S.enemies) {
    if (enemy.hp <= 0) killEnemy(enemy);
  }
  S.enemies = S.enemies.filter(e => e.hp>0 && e.x>-70);
  S.bullets = S.bullets.filter(b => b.life>0 && b.x>-60 && b.x<W+80 && b.y>-60 && b.y<H+60);
  S.shots = S.shots.filter(s => s.life>0 && s.x<W+100 && s.y>-70 && s.y<H+70);

  for (const p of S.particles) {
    p.x += p.vx*dt;
    p.y += p.vy*dt;
    p.life -= dt;
  }
  S.particles = S.particles.filter(p => p.life>0);

  updateUI();

  if (S.phase === 'running' && S.choiceQueue.length) {
    const fn = S.choiceQueue.shift();
    fn();
  }
}

function draw() {
  const biome = BIOMES[Math.floor(S.time/60)%BIOMES.length];
  const gradient = ctx.createLinearGradient(0,0,0,H);
  gradient.addColorStop(0,biome.top);
  gradient.addColorStop(1,biome.bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0,0,W,H);

  for (const star of stars) {
    star.x -= star.z*(1+S.time*.002);
    if (star.x<0) star.x=W;
    ctx.fillStyle = `rgba(255,255,255,${.2+star.z*.55})`;
    ctx.fillRect(star.x,star.y,star.s,star.s);
  }

  ctx.fillStyle='#0005';
  ctx.fillRect(0,0,W,30);
  ctx.fillStyle=biome.accent;
  ctx.font='bold 12px monospace';
  ctx.textAlign='left';
  ctx.fillText(`${biome.name}  •  THREAT ${S.threat.toFixed(1)}×${S.grace>0?`  •  SAFE ${Math.ceil(S.grace)}s`:''}`,15,20);

  ctx.save();
  ctx.translate(S.ship.x,S.ship.y);
  ctx.rotate(S.ship.tilt*.02);
  ctx.fillStyle=S.ship.inv>0?'#fff':'#76e8f1';
  ctx.beginPath();
  ctx.moveTo(25,0);ctx.lineTo(-17,-15);ctx.lineTo(-8,0);ctx.lineTo(-17,15);ctx.closePath();ctx.fill();
  ctx.fillStyle='#ffd876';ctx.fillRect(-22,-4,10,8);
  ctx.restore();

  for (const enemy of S.enemies) {
    ctx.fillStyle=enemy.color;
    ctx.beginPath();
    ctx.moveTo(enemy.x-enemy.size,enemy.y);
    ctx.lineTo(enemy.x,enemy.y-enemy.size*.65);
    ctx.lineTo(enemy.x+enemy.size,enemy.y);
    ctx.lineTo(enemy.x,enemy.y+enemy.size*.65);
    ctx.closePath();ctx.fill();
    if(enemy.elite){ctx.strokeStyle='#ffe56b';ctx.strokeRect(enemy.x-enemy.size-3,enemy.y-enemy.size*.7-3,enemy.size*2+6,enemy.size*1.4+6);}
  }

  for(const shot of S.shots){ctx.fillStyle=shot.color;ctx.fillRect(shot.x-5,shot.y-2,10,4);}
  for(const bullet of S.bullets){ctx.fillStyle='#ff879a';ctx.beginPath();ctx.arc(bullet.x,bullet.y,4,0,Math.PI*2);ctx.fill();}
  for(const p of S.particles){ctx.globalAlpha=Math.max(0,p.life/(p.max||.5));ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3);}
  ctx.globalAlpha=1;

  if(S.boss){
    const b=S.boss;
    ctx.fillStyle='#ff7d9f';ctx.fillRect(b.x-b.size,b.y-b.size*.6,b.size*2,b.size*1.2);
    ctx.fillStyle='#111827dd';ctx.fillRect(W-265,40,225,10);
    ctx.fillStyle='#ff7088';ctx.fillRect(W-263,42,221*clamp(b.hp/b.maxHp,0,1),6);
  }
}

function endRun() {
  S.phase='dead';
  cancelAnimationFrame(raf);
  S.best=Math.max(S.best,S.time);
  localStorage.setItem('starwardBest',S.best);
  eyebrow.textContent='RUN ENDED';
  overlayTitle.textContent=`Survived ${formatTime(S.time)}`;
  overlayText.textContent=`Level ${S.level} • ${S.kills} kills • ${S.bosses} dreadnoughts • Best ${formatTime(S.best)}`;
  choiceGrid.classList.add('hidden');
  startBtn.textContent='New Run';
  startBtn.classList.remove('hidden');
  overlay.classList.remove('hidden');
}

function loop(now) {
  if (S.phase === 'dead' || S.phase === 'menu') return;
  const dt=Math.min(.033,(now-last)/1000||.016);
  last=now;
  if(S.phase==='running') update(dt);
  draw();
  raf=requestAnimationFrame(loop);
}

startBtn.addEventListener('click',startRun);
S=freshState();
updateUI();
draw();
})();