(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const $ = (id) => document.getElementById(id);
  const scoreEl = $('score');
  const hullEl = $('hull');
  const levelEl = $('level');
  const weaponEl = $('weapon');
  const energyEl = $('energy');
  const overlay = $('overlay');
  const overlayTitle = $('overlayTitle');
  const overlayText = $('overlayText');
  const startBtn = $('startBtn');
  const routeChoice = $('routeChoice');
  const fireBtn = $('fireBtn');
  const bombBtn = $('bombBtn');
  const dodgeBtn = $('dodgeBtn');

  const W = canvas.width;
  const H = canvas.height;
  const PLAY_TOP = 30;
  const PLAY_BOTTOM = H - 30;
  const keys = new Set();
  const touch = { up: false, down: false, left: false, right: false, fire: false };

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rand = (a, b) => a + Math.random() * (b - a);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rectHit = (a, b) => a.x - a.w / 2 < b.x + b.w / 2 && a.x + a.w / 2 > b.x - b.w / 2 && a.y - a.h / 2 < b.y + b.h / 2 && a.y + a.h / 2 > b.y - b.h / 2;
  const circleRect = (c, r) => {
    const nx = clamp(c.x, r.x - r.w / 2, r.x + r.w / 2);
    const ny = clamp(c.y, r.y - r.h / 2, r.y + r.h / 2);
    const dx = c.x - nx;
    const dy = c.y - ny;
    return dx * dx + dy * dy <= c.r * c.r;
  };

  const BIOMES = {
    meadow: { name: 'Cloudberry Run', sky1: '#183866', sky2: '#70b7c8', ground: '#496a58', accent: '#b6e68d', hazard: 'wind' },
    canyon: { name: 'Ember Canyon', sky1: '#301b36', sky2: '#d06f52', ground: '#6a3d35', accent: '#ffcf70', hazard: 'rocks' },
    ruins: { name: 'Moonlit Ruins', sky1: '#101637', sky2: '#3e4a75', ground: '#323d59', accent: '#8ce6de', hazard: 'gate' },
    storm: { name: 'Thunder Reach', sky1: '#111827', sky2: '#334155', ground: '#253248', accent: '#d9ecff', hazard: 'lightning' },
    nebula: { name: 'Candy Nebula', sky1: '#281440', sky2: '#8c4b96', ground: '#4a285c', accent: '#ffc4f4', hazard: 'gravity' }
  };

  const ROUTES = [
    ['meadow', 'canyon'],
    ['ruins', 'storm'],
    ['nebula', 'canyon'],
    ['storm', 'meadow'],
    ['ruins', 'nebula']
  ];

  const BOSS_NAMES = ['Glimmerjaw', 'Cinder Crown', 'Archive Warden', 'Storm Koi', 'Sugar Comet'];
  const WEAPON_NAMES = ['Pulse I', 'Twin Pulse', 'Tri-Spark', 'Comet Array'];

  let raf = 0;
  let last = 0;
  let running = false;
  let paused = false;
  let state;
  let audioCtx = null;

  const stars = Array.from({ length: 120 }, () => ({ x: rand(0, W), y: rand(0, H), z: rand(0.2, 1), s: Math.random() < 0.8 ? 1 : 2 }));

  function freshState() {
    return {
      score: 0,
      hull: 6,
      maxHull: 6,
      level: 1,
      biome: 'meadow',
      time: 0,
      sectionTime: 0,
      boss: false,
      bossDefeated: false,
      spawn: 0.5,
      terrainSpawn: 1.7,
      powerSpawn: 7,
      hazardSpawn: 5,
      combo: 0,
      comboTimer: 0,
      bombs: 2,
      shield: 0,
      energy: 100,
      maxEnergy: 100,
      dodgeCooldown: 0,
      shake: 0,
      flash: 0,
      hitStop: 0,
      player: { x: 150, y: H / 2, w: 30, h: 18, vx: 0, vy: 0, cool: 0, inv: 0, weapon: 1, tilt: 0 },
      shots: [],
      enemyShots: [],
      enemies: [],
      terrain: [],
      powers: [],
      hazards: [],
      particles: [],
      popups: [],
      bossObj: null
    };
  }

  function reset() {
    state = freshState();
    updateHud();
  }

  function updateHud() {
    scoreEl.textContent = state.score.toLocaleString();
    hullEl.textContent = '♥'.repeat(Math.max(0, state.hull)) + '♡'.repeat(Math.max(0, state.maxHull - state.hull));
    levelEl.textContent = state.level;
    weaponEl.textContent = WEAPON_NAMES[state.player.weapon - 1];
    if (energyEl) energyEl.textContent = Math.round(state.energy) + '%';
  }

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }

  function sfx(freq, duration = 0.05, type = 'square', gain = 0.025, slide = 0) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    const now = audioCtx.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), now + duration);
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(g).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  function popup(text, x, y, color = '#fff') {
    state.popups.push({ text, x, y, color, t: 0.8, max: 0.8 });
  }

  function burst(x, y, color, count = 10, speed = 160) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const v = rand(speed * 0.35, speed);
      state.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: rand(0.25, 0.6), max: 0.6, color, size: Math.random() < 0.7 ? 3 : 5 });
    }
  }

  function begin() {
    ensureAudio();
    reset();
    running = true;
    paused = false;
    overlay.classList.add('hidden');
    routeChoice.classList.add('hidden');
    startBtn.classList.remove('hidden');
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    canvas.focus();
  }

  function makeShot(x, y, vx, vy, w, h, d, color = '#fff5a1') {
    state.shots.push({ x, y, vx, vy, w, h, d, color });
  }

  function shoot() {
    const p = state.player;
    if (!running || paused || p.cool > 0) return;
    const speed = 690;
    if (p.weapon === 1) makeShot(p.x + 19, p.y, speed, 0, 12, 4, 1);
    if (p.weapon === 2) {
      makeShot(p.x + 19, p.y - 6, speed, 0, 12, 4, 1);
      makeShot(p.x + 19, p.y + 6, speed, 0, 12, 4, 1);
    }
    if (p.weapon === 3) [-0.11, 0, 0.11].forEach((a) => makeShot(p.x + 19, p.y, speed, speed * a, 13, 4, 1));
    if (p.weapon === 4) [-0.18, -0.06, 0.06, 0.18].forEach((a) => makeShot(p.x + 19, p.y, speed, speed * a, 14, 5, 1));
    p.cool = Math.max(0.075, 0.17 - p.weapon * 0.02);
    sfx(680 + p.weapon * 90, 0.035, 'square', 0.018, 120);
  }

  function dodge() {
    const s = state;
    const p = s.player;
    if (!running || paused || s.energy < 35 || s.dodgeCooldown > 0) return;
    const dx = (keys.has('arrowright') || keys.has('d') || touch.right ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') || touch.left ? 1 : 0);
    const dy = (keys.has('arrowdown') || keys.has('s') || touch.down ? 1 : 0) - (keys.has('arrowup') || keys.has('w') || touch.up ? 1 : 0);
    const len = Math.hypot(dx, dy) || 1;
    const fx = dx === 0 && dy === 0 ? 1 : dx / len;
    const fy = dx === 0 && dy === 0 ? 0 : dy / len;
    p.vx += fx * 520;
    p.vy += fy * 520;
    p.inv = Math.max(p.inv, 0.5);
    s.energy -= 35;
    s.dodgeCooldown = 0.4;
    s.shake = Math.max(s.shake, 5);
    burst(p.x - 12, p.y, '#79ecff', 10, 110);
    popup('DODGE!', p.x, p.y - 28, '#79ecff');
    sfx(250, 0.09, 'sawtooth', 0.025, 650);
    updateHud();
  }

  function bomb() {
    if (!running || paused || state.bombs <= 0) return;
    state.bombs--;
    state.shake = 24;
    state.flash = 0.25;
    state.hitStop = 0.06;
    state.enemyShots.length = 0;
    state.enemies.forEach((e) => {
      e.hp -= 6;
      if (e.hp <= 0 && !e.dead) killEnemy(e, true);
    });
    state.terrain.forEach((o) => {
      if (o.destructible) {
        o.hp -= 6;
        if (o.hp <= 0) destroyTerrain(o);
      }
    });
    if (state.bossObj) state.bossObj.hp -= 20;
    burst(state.player.x, state.player.y, '#ffffff', 28, 310);
    popup('SCREEN CLEAR!', state.player.x + 70, state.player.y - 30, '#fff2a6');
    sfx(90, 0.4, 'sawtooth', 0.05, 50);
    updateHud();
  }

  function award(points, x = state.player.x, y = state.player.y) {
    state.combo = Math.min(12, state.combo + 1);
    state.comboTimer = 3;
    const mult = 1 + state.combo * 0.1;
    const gain = Math.round(points * mult);
    state.score += gain;
    popup('+' + gain, x, y, '#fff5a1');
    updateHud();
  }

  function graze(projectile) {
    if (projectile.grazed) return;
    projectile.grazed = true;
    state.energy = Math.min(state.maxEnergy, state.energy + 7);
    state.score += 35 + state.combo * 5;
    state.combo = Math.min(12, state.combo + 0.25);
    state.comboTimer = Math.max(state.comboTimer, 1.5);
    popup('GRAZE', state.player.x + 18, state.player.y - 20, '#8ce6de');
    sfx(920, 0.025, 'sine', 0.012, 90);
    updateHud();
  }

  function damage(amount = 1, source = null) {
    const p = state.player;
    if (p.inv > 0) return;
    if (state.shield > 0) {
      state.shield--;
      p.inv = 0.8;
      state.shake = 9;
      state.combo = 0;
      burst(p.x, p.y, '#73c9ff', 14, 180);
      popup('SHIELD!', p.x, p.y - 26, '#73c9ff');
      sfx(170, 0.12, 'triangle', 0.03, 280);
      updateHud();
      return;
    }
    state.hull -= amount;
    state.combo = 0;
    state.comboTimer = 0;
    p.inv = 1.15;
    state.shake = 18;
    state.flash = 0.14;
    state.hitStop = 0.055;
    if (source) {
      const dx = p.x - source.x;
      const dy = p.y - source.y;
      const len = Math.hypot(dx, dy) || 1;
      p.vx += (dx / len) * 260 - 90;
      p.vy += (dy / len) * 260;
    } else p.vx -= 180;
    burst(p.x, p.y, '#ff9aa9', 18, 230);
    popup('-' + amount + ' HULL', p.x, p.y - 28, '#ff9aa9');
    sfx(95, 0.16, 'sawtooth', 0.04, 45);
    updateHud();
    if (state.hull <= 0) gameOver();
  }

  function spawnEnemyUnit(type, x, y) {
    const specs = {
      scout: { hp: 1, w: 25, h: 18, v: 178, pts: 100, rate: 2.0 },
      zig: { hp: 2, w: 29, h: 20, v: 150, pts: 190, rate: 1.55 },
      tank: { hp: 6, w: 43, h: 31, v: 100, pts: 460, rate: 1.1 },
      diver: { hp: 2, w: 27, h: 21, v: 135, pts: 240, rate: 99 },
      turret: { hp: 4, w: 34, h: 25, v: 125, pts: 330, rate: 0.95 }
    };
    const spec = specs[type];
    state.enemies.push({ type, x, y, baseY: y, w: spec.w, h: spec.h, hp: spec.hp, maxHp: spec.hp, vx: -(spec.v + state.level * 7), t: rand(0, 5), fire: rand(0.45, 1.2), rate: spec.rate, points: spec.pts });
  }

  function spawnFormation() {
    const s = state;
    const roll = Math.random();
    if (roll < 0.32) {
      const y = rand(100, H - 100);
      for (let i = 0; i < 4; i++) spawnEnemyUnit('scout', W + 45 + i * 46, y + (i - 1.5) * 28);
    } else if (roll < 0.55) {
      const y = rand(110, H - 110);
      for (let i = 0; i < 5; i++) spawnEnemyUnit(i === 2 && s.level > 1 ? 'zig' : 'scout', W + 40 + i * 42, y + Math.sin(i * 1.5) * 58);
    } else if (roll < 0.73 && s.level > 1) {
      spawnEnemyUnit('diver', W + 80, rand(80, H - 80));
      spawnEnemyUnit('diver', W + 150, rand(80, H - 80));
    } else if (roll < 0.88 && s.level > 2) {
      spawnEnemyUnit('tank', W + 60, rand(100, H - 100));
      spawnEnemyUnit('scout', W + 120, rand(80, H - 80));
      spawnEnemyUnit('scout', W + 165, rand(80, H - 80));
    } else spawnEnemyUnit(s.level > 2 ? 'turret' : 'zig', W + 70, rand(90, H - 90));
  }

  function spawnTerrainPair() {
    const s = state;
    const difficulty = Math.min(1, s.level * 0.12 + s.sectionTime / 150);
    const gapH = rand(190, 235) - difficulty * 22;
    const gapCenter = rand(140, H - 140);
    const width = rand(85, 150);
    const topH = Math.max(30, gapCenter - gapH / 2);
    const bottomY = gapCenter + gapH / 2;
    const bottomH = Math.max(30, H - bottomY);
    const speed = -(175 + s.level * 8);
    const group = Math.random().toString(36).slice(2);
    s.terrain.push({ type: 'wall', group, x: W + width / 2 + 30, y: topH / 2, w: width, h: topH, vx: speed, hp: 999, solid: true, top: true });
    s.terrain.push({ type: 'wall', group, x: W + width / 2 + 30, y: bottomY + bottomH / 2, w: width, h: bottomH, vx: speed, hp: 999, solid: true, top: false });
    s.hazards.push({ type: 'gateBonus', group, x: W + width / 2 + 30, y: gapCenter, w: width + 10, h: gapH - 18, vx: speed, scored: false, harmless: true });
    if (Math.random() < 0.38) {
      const rockY = clamp(gapCenter + rand(-gapH * 0.3, gapH * 0.3), PLAY_TOP + 40, PLAY_BOTTOM - 40);
      s.terrain.push({ type: 'crystal', x: W + width + 110, y: rockY, w: 38, h: 38, r: 19, vx: speed - 18, hp: 3 + Math.floor(s.level / 2), maxHp: 3 + Math.floor(s.level / 2), destructible: true, solid: true, spin: rand(0, 6) });
    }
  }

  function spawnBiomeHazard() {
    const type = BIOMES[state.biome].hazard;
    const speed = -(155 + state.level * 6);
    if (type === 'wind') state.hazards.push({ type: 'wind', x: W + 110, y: rand(110, H - 110), w: 230, h: rand(90, 150), vx: speed * 0.7, force: Math.random() < 0.5 ? -95 : 95, t: 0, harmless: true });
    else if (type === 'rocks') {
      for (let i = 0; i < 3; i++) {
        const r = rand(16, 30);
        state.terrain.push({ type: 'rock', x: W + 60 + i * rand(70, 115), y: rand(70, H - 70), w: r * 2, h: r * 2, r, vx: speed - rand(0, 40), vy: rand(-35, 35), hp: 2, maxHp: 2, destructible: true, solid: true, spin: rand(0, 6) });
      }
    } else if (type === 'gate') {
      const gapY = rand(135, H - 135);
      state.hazards.push({ type: 'movingGate', x: W + 100, y: gapY, w: 55, h: 150, vx: speed, baseY: gapY, t: 0, solid: true });
    } else if (type === 'lightning') state.hazards.push({ type: 'lightning', x: W + 100, y: H / 2, w: 32, h: H - 60, vx: speed * 0.65, warn: 1.3, live: 0.42, t: 0, solid: false });
    else if (type === 'gravity') state.hazards.push({ type: 'gravity', x: W + 110, y: rand(110, H - 110), r: 46, w: 92, h: 92, vx: speed * 0.55, pull: 300, t: 0, solid: false });
  }

  function spawnPower(x = W + 30, y = rand(85, H - 85), forced = null) {
    const roll = Math.random();
    const kind = forced || (roll < 0.22 ? 'heal' : roll < 0.47 ? 'weapon' : roll < 0.7 ? 'shield' : roll < 0.88 ? 'bomb' : 'score');
    state.powers.push({ kind, x, y, w: 23, h: 23, vx: -125, t: 0 });
  }

  function spawnBoss() {
    state.boss = true;
    state.enemies = [];
    state.enemyShots = [];
    state.hazards = state.hazards.filter((h) => h.harmless);
    const hp = 62 + state.level * 21;
    state.bossObj = { x: W + 130, y: H / 2, w: 112, h: 88, hp, maxHp: hp, t: 0, fire: 0.8, phase: 0, name: BOSS_NAMES[Math.min(4, state.level - 1)] };
    popup('WARNING', W / 2, H / 2 - 70, '#ff8ca8');
    sfx(110, 0.5, 'square', 0.04, -20);
  }

  function enemyFire(e) {
    const p = state.player;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const speed = 180 + state.level * 10;
    const spread = e.type === 'turret' ? [-0.15, 0, 0.15] : [0];
    spread.forEach((a) => {
      const base = Math.atan2(dy, dx) + a;
      state.enemyShots.push({ x: e.x - 12, y: e.y, vx: Math.cos(base) * speed, vy: Math.sin(base) * speed, w: 9, h: 9, grazed: false });
    });
  }

  function bossFire(b) {
    const p = state.player;
    const ratio = b.hp / b.maxHp;
    const phase = b.phase % (ratio < 0.45 ? 4 : 3);
    if (phase === 0) {
      const base = Math.atan2(p.y - b.y, p.x - b.x);
      for (let i = -3; i <= 3; i++) {
        const a = base + i * 0.16;
        state.enemyShots.push({ x: b.x - 48, y: b.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, w: 10, h: 10, grazed: false });
      }
    } else if (phase === 1) {
      for (let i = 0; i < 14; i++) {
        const a = i * Math.PI * 2 / 14 + b.t * 0.4;
        state.enemyShots.push({ x: b.x - 38, y: b.y, vx: Math.cos(a) * 165, vy: Math.sin(a) * 165, w: 9, h: 9, grazed: false });
      }
    } else if (phase === 2) [-145, -85, -28, 28, 85, 145].forEach((vy) => state.enemyShots.push({ x: b.x - 50, y: b.y, vx: -250, vy, w: 10, h: 10, grazed: false }));
    else {
      for (let i = -2; i <= 2; i++) {
        const y = clamp(p.y + i * 42, 45, H - 45);
        state.enemyShots.push({ x: b.x - 50, y, vx: -315, vy: 0, w: 16, h: 6, grazed: false });
      }
    }
    b.phase++;
    sfx(140, 0.045, 'square', 0.015, 70);
  }

  function collect(kind) {
    if (kind === 'heal') state.hull = Math.min(state.maxHull, state.hull + 2);
    if (kind === 'weapon') state.player.weapon = Math.min(4, state.player.weapon + 1);
    if (kind === 'shield') state.shield = Math.min(3, state.shield + 2);
    if (kind === 'bomb') state.bombs = Math.min(5, state.bombs + 1);
    if (kind === 'score') state.score += 1800;
    state.energy = Math.min(state.maxEnergy, state.energy + 18);
    burst(state.player.x, state.player.y, powerColor(kind), 14, 140);
    popup(kind.toUpperCase() + '!', state.player.x, state.player.y - 28, powerColor(kind));
    sfx(540, 0.1, 'triangle', 0.025, 600);
    updateHud();
  }

  function killEnemy(e, bombKill = false) {
    if (e.dead) return;
    e.dead = true;
    burst(e.x, e.y, e.type === 'tank' ? '#ffd27f' : '#ff9bd1', e.type === 'tank' ? 18 : 10, e.type === 'tank' ? 230 : 160);
    award(e.points || 100, e.x, e.y - 12);
    if (!bombKill && Math.random() < 0.075) spawnPower(e.x, e.y);
    state.hitStop = Math.max(state.hitStop, e.type === 'tank' ? 0.045 : 0.022);
    sfx(e.type === 'tank' ? 90 : 150, 0.08, 'square', 0.02, -50);
  }

  function destroyTerrain(o) {
    if (o.dead) return;
    o.dead = true;
    burst(o.x, o.y, state.biome === 'nebula' ? '#ffc4f4' : '#ffd37b', 18, 210);
    award(o.type === 'crystal' ? 500 : 280, o.x, o.y - 14);
    state.energy = Math.min(state.maxEnergy, state.energy + 8);
    if (Math.random() < 0.22) spawnPower(o.x, o.y);
    sfx(120, 0.09, 'square', 0.022, -45);
  }

  function separatePlayerFromRect(r) {
    const p = state.player;
    const left = (p.x + p.w / 2) - (r.x - r.w / 2);
    const right = (r.x + r.w / 2) - (p.x - p.w / 2);
    const top = (p.y + p.h / 2) - (r.y - r.h / 2);
    const bottom = (r.y + r.h / 2) - (p.y - p.h / 2);
    const min = Math.min(left, right, top, bottom);
    if (min === left) p.x = r.x - r.w / 2 - p.w / 2 - 1;
    else if (min === right) p.x = r.x + r.w / 2 + p.w / 2 + 1;
    else if (min === top) p.y = r.y - r.h / 2 - p.h / 2 - 1;
    else p.y = r.y + r.h / 2 + p.h / 2 + 1;
  }

  function finishLevel() {
    running = false;
    cancelAnimationFrame(raf);
    state.boss = false;
    state.bossDefeated = true;
    if (state.level >= 5) {
      overlayTitle.textContent = 'Galaxy Saved!';
      overlayText.textContent = `Final score: ${state.score.toLocaleString()}. You cleared all five sectors.`;
      startBtn.textContent = 'Play Again';
      startBtn.classList.remove('hidden');
      routeChoice.classList.add('hidden');
      overlay.classList.remove('hidden');
      return;
    }
    const opts = ROUTES[state.level - 1];
    routeChoice.innerHTML = '';
    routeChoice.classList.remove('hidden');
    opts.forEach((key) => {
      const b = BIOMES[key];
      const hint = { meadow: 'wind lanes', canyon: 'asteroid rush', ruins: 'moving gates', storm: 'lightning fields', nebula: 'gravity wells' }[key];
      const btn = document.createElement('button');
      btn.textContent = `${b.name} · ${hint}`;
      btn.addEventListener('click', () => nextLevel(key));
      routeChoice.appendChild(btn);
    });
    overlayTitle.textContent = 'Route Select';
    overlayText.textContent = 'Guardian destroyed. Choose the next hazard profile.';
    startBtn.classList.add('hidden');
    overlay.classList.remove('hidden');
  }

  function nextLevel(key) {
    state.level++;
    state.biome = key;
    state.sectionTime = 0;
    state.boss = false;
    state.bossDefeated = false;
    state.bossObj = null;
    state.enemyShots = [];
    state.enemies = [];
    state.terrain = [];
    state.powers = [];
    state.hazards = [];
    state.player.x = 150;
    state.player.y = H / 2;
    state.player.inv = 1.5;
    state.energy = Math.min(state.maxEnergy, state.energy + 35);
    state.hull = Math.min(state.maxHull, state.hull + 1);
    state.score += 1200 * state.level;
    state.spawn = 0.4;
    state.terrainSpawn = 1.3;
    state.hazardSpawn = 4;
    updateHud();
    routeChoice.classList.add('hidden');
    startBtn.classList.remove('hidden');
    overlay.classList.add('hidden');
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
    canvas.focus();
  }

  function gameOver() {
    running = false;
    cancelAnimationFrame(raf);
    overlayTitle.textContent = 'Ship Lost';
    overlayText.textContent = `Score ${state.score.toLocaleString()} · reached sector ${state.level}. Dodge through gaps, graze enemy fire for energy, and destroy breakable hazards for safer routes.`;
    startBtn.textContent = 'Retry Mission';
    startBtn.classList.remove('hidden');
    routeChoice.classList.add('hidden');
    overlay.classList.remove('hidden');
  }

  function updateHazards(dt) {
    const p = state.player;
    for (const h of state.hazards) {
      h.t = (h.t || 0) + dt;
      if (typeof h.vx === 'number') h.x += h.vx * dt;
      if (h.type === 'wind') {
        const inside = Math.abs(p.x - h.x) < h.w / 2 && Math.abs(p.y - h.y) < h.h / 2;
        if (inside) p.vy += h.force * dt;
      }
      if (h.type === 'movingGate') {
        h.y = h.baseY + Math.sin(h.t * 2.2) * 85;
        const top = { x: h.x, y: (h.y - h.h / 2) / 2, w: h.w, h: h.y - h.h / 2 };
        const bottomTop = h.y + h.h / 2;
        const bottom = { x: h.x, y: bottomTop + (H - bottomTop) / 2, w: h.w, h: H - bottomTop };
        if (rectHit(p, top)) { separatePlayerFromRect(top); damage(1, top); }
        if (rectHit(p, bottom)) { separatePlayerFromRect(bottom); damage(1, bottom); }
      }
      if (h.type === 'lightning') {
        if (h.warn > 0) h.warn -= dt;
        else if (h.live > 0) {
          h.live -= dt;
          const beam = { x: h.x, y: H / 2, w: 26, h: H - 60 };
          if (rectHit(p, beam)) damage(2, beam);
        } else h.dead = true;
      }
      if (h.type === 'gravity') {
        const dx = h.x - p.x;
        const dy = h.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < 190 && d > 1) {
          const strength = h.pull * (1 - d / 190);
          p.vx += (dx / d) * strength * dt;
          p.vy += (dy / d) * strength * dt;
        }
        if (d < h.r + p.w * 0.35) damage(1, h);
      }
      if (h.type === 'gateBonus' && !h.scored && h.x < p.x) {
        h.scored = true;
        if (Math.abs(p.y - h.y) < h.h / 2 - 12) {
          state.score += 500;
          state.energy = Math.min(state.maxEnergy, state.energy + 15);
          popup('THREAD THE NEEDLE +500', p.x + 70, p.y - 36, '#b6e68d');
          sfx(820, 0.07, 'triangle', 0.018, 500);
          updateHud();
        }
      }
    }
    state.hazards = state.hazards.filter((h) => !h.dead && h.x > -260);
  }

  function update(dt) {
    const s = state;
    const p = s.player;
    s.time += dt;
    s.sectionTime += dt;
    p.cool = Math.max(0, p.cool - dt);
    p.inv = Math.max(0, p.inv - dt);
    s.dodgeCooldown = Math.max(0, s.dodgeCooldown - dt);
    s.flash = Math.max(0, s.flash - dt);
    s.shake *= Math.pow(0.02, dt);
    s.comboTimer -= dt;
    if (s.comboTimer <= 0) s.combo = 0;
    s.energy = Math.min(s.maxEnergy, s.energy + 13 * dt);

    const left = keys.has('arrowleft') || keys.has('a') || touch.left;
    const right = keys.has('arrowright') || keys.has('d') || touch.right;
    const up = keys.has('arrowup') || keys.has('w') || touch.up;
    const down = keys.has('arrowdown') || keys.has('s') || touch.down;
    const ix = (right ? 1 : 0) - (left ? 1 : 0);
    const iy = (down ? 1 : 0) - (up ? 1 : 0);

    p.vx += ix * 980 * dt;
    p.vy += iy * 980 * dt;
    const drag = Math.pow(0.0015, dt);
    p.vx *= drag;
    p.vy *= drag;
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > 320) { p.vx = p.vx / speed * 320; p.vy = p.vy / speed * 320; }
    p.x = clamp(p.x + p.vx * dt, 38, W - 190);
    p.y = clamp(p.y + p.vy * dt, PLAY_TOP + 12, PLAY_BOTTOM - 12);
    p.tilt = lerp(p.tilt, clamp(p.vy / 280, -1, 1), Math.min(1, dt * 10));

    if (keys.has(' ') || touch.fire) shoot();
    stars.forEach((st) => { st.x -= (38 + 185 * st.z) * dt; if (st.x < 0) { st.x = W; st.y = rand(0, H); } });

    if (!s.boss && s.sectionTime > 38) spawnBoss();
    if (!s.boss) {
      s.spawn -= dt;
      if (s.spawn <= 0) { spawnFormation(); s.spawn = Math.max(0.8, 2.05 - state.level * 0.1) + rand(0.15, 0.55); }
      s.terrainSpawn -= dt;
      if (s.terrainSpawn <= 0) { spawnTerrainPair(); s.terrainSpawn = rand(3.2, 5.0); }
      s.hazardSpawn -= dt;
      if (s.hazardSpawn <= 0) { spawnBiomeHazard(); s.hazardSpawn = rand(5.2, 8.5); }
      s.powerSpawn -= dt;
      if (s.powerSpawn <= 0) { spawnPower(); s.powerSpawn = rand(8, 12); }
    }

    s.shots.forEach((o) => { o.x += o.vx * dt; o.y += o.vy * dt; });
    s.enemies.forEach((e) => {
      e.t += dt;
      e.x += e.vx * dt;
      if (e.type === 'zig') e.y = e.baseY + Math.sin(e.t * 5.1) * 70;
      if (e.type === 'diver') {
        const dx = p.x - e.x, dy = p.y - e.y, len = Math.hypot(dx, dy) || 1;
        e.vx += dx / len * 58 * dt;
        e.y += dy / len * 125 * dt;
      }
      if (e.type === 'turret') e.y = e.baseY + Math.sin(e.t * 1.8) * 24;
      e.fire -= dt;
      if (e.fire <= 0 && e.x < W - 70 && e.type !== 'diver') { enemyFire(e); e.fire = rand(0.75, 1.4) * e.rate; }
    });
    s.enemyShots.forEach((o) => { o.x += o.vx * dt; o.y += o.vy * dt; });
    s.terrain.forEach((o) => { o.x += o.vx * dt; if (o.vy) o.y += o.vy * dt; o.spin = (o.spin || 0) + dt; });
    s.powers.forEach((o) => { o.x += o.vx * dt; o.t += dt; o.y += Math.sin(o.t * 4) * 14 * dt; });
    updateHazards(dt);

    if (s.bossObj) {
      const b = s.bossObj;
      b.t += dt;
      b.x += (W - 155 - b.x) * Math.min(1, dt * 1.8);
      b.y = H / 2 + Math.sin(b.t * 1.35) * 145;
      b.fire -= dt;
      if (b.fire <= 0) { bossFire(b); b.fire = Math.max(0.34, 1.0 - state.level * 0.07 - (b.hp / b.maxHp < 0.45 ? 0.22 : 0)); }
    }

    for (const sh of s.shots) {
      for (const e of s.enemies) {
        if (!sh.dead && !e.dead && rectHit(sh, e)) {
          sh.dead = true; e.hp -= sh.d; burst(sh.x, sh.y, '#fff5a1', 4, 80); if (e.hp <= 0) killEnemy(e);
        }
      }
      for (const o of s.terrain) {
        if (!sh.dead && !o.dead && o.destructible && (o.r ? circleRect({ x: sh.x, y: sh.y, r: 4 }, o) : rectHit(sh, o))) {
          sh.dead = true; o.hp -= sh.d; burst(sh.x, sh.y, '#ffd37b', 3, 65); if (o.hp <= 0) destroyTerrain(o);
        }
      }
      if (s.bossObj && !sh.dead && rectHit(sh, s.bossObj)) {
        sh.dead = true;
        s.bossObj.hp -= sh.d;
        burst(sh.x, sh.y, '#fff5a1', 4, 70);
        if (s.bossObj.hp <= 0) {
          award(5500 * state.level, s.bossObj.x - 20, s.bossObj.y);
          burst(s.bossObj.x, s.bossObj.y, '#ffffff', 50, 340);
          state.bossObj = null;
          sfx(70, 0.6, 'sawtooth', 0.05, 120);
          finishLevel();
          return;
        }
      }
    }

    for (const e of s.enemies) if (!e.dead && rectHit(p, e)) { e.dead = true; burst(e.x, e.y, '#ff9bd1', 8, 140); damage(e.type === 'tank' ? 2 : 1, e); }
    for (const sh of s.enemyShots) {
      if (sh.dead) continue;
      if (rectHit(p, sh)) { sh.dead = true; damage(1, sh); }
      else {
        const d = Math.hypot(p.x - sh.x, p.y - sh.y);
        if (d < 27 && d > 13) graze(sh);
      }
    }
    for (const o of s.terrain) {
      if (o.dead || !o.solid) continue;
      const collides = o.r ? circleRect({ x: p.x, y: p.y, r: 11 }, o) : rectHit(p, o);
      if (collides) { if (!o.r) separatePlayerFromRect(o); damage(1, o); }
    }
    for (const pow of s.powers) if (!pow.dead && rectHit(p, pow)) { pow.dead = true; collect(pow.kind); }
    if (s.bossObj && rectHit(p, s.bossObj)) damage(2, s.bossObj);

    s.particles.forEach((q) => { q.t -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= Math.pow(0.05, dt); q.vy *= Math.pow(0.05, dt); });
    s.popups.forEach((q) => { q.t -= dt; q.y -= 28 * dt; });

    s.shots = s.shots.filter((o) => !o.dead && o.x < W + 40 && o.y > -40 && o.y < H + 40);
    s.enemies = s.enemies.filter((o) => !o.dead && o.x > -90 && o.y > -100 && o.y < H + 100);
    s.enemyShots = s.enemyShots.filter((o) => !o.dead && o.x > -50 && o.x < W + 50 && o.y > -50 && o.y < H + 50);
    s.terrain = s.terrain.filter((o) => !o.dead && o.x + o.w / 2 > -50);
    s.powers = s.powers.filter((o) => !o.dead && o.x > -50);
    s.particles = s.particles.filter((o) => o.t > 0);
    s.popups = s.popups.filter((o) => o.t > 0);
    updateHud();
  }

  function drawShip(x, y) {
    const p = state.player;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(p.tilt * 0.13);
    ctx.fillStyle = '#dff8ff'; ctx.fillRect(-14, -6, 21, 12); ctx.fillRect(-4, -12, 12, 24);
    ctx.fillStyle = '#65d8ff'; ctx.fillRect(-1, -5, 12, 10);
    ctx.fillStyle = '#24304f'; ctx.fillRect(8, -2, 10, 4);
    ctx.fillStyle = '#ffd46a';
    const flame = 5 + Math.floor(Math.random() * 5);
    ctx.fillRect(-20 - flame, -5, 6 + flame, 4); ctx.fillRect(-20 - flame, 1, 6 + flame, 4);
    if (state.shield > 0) { ctx.strokeStyle = '#73c9ff'; ctx.lineWidth = 2; ctx.strokeRect(-24, -17, 49, 34); }
    ctx.restore();
  }

  function drawEnemy(e) {
    ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y));
    ctx.fillStyle = e.type === 'tank' ? '#f2b96b' : e.type === 'diver' ? '#ff7f8e' : e.type === 'turret' ? '#8ce6de' : e.type === 'zig' ? '#ee9bd0' : '#a9ef8c';
    ctx.fillRect(-e.w / 2, -e.h / 2, e.w * 0.8, e.h); ctx.fillRect(-4, -e.h / 2 - 4, 9, e.h + 8);
    ctx.fillStyle = '#23304a'; ctx.fillRect(-e.w / 2 - 5, -4, 7, 8); ctx.fillStyle = '#fff'; ctx.fillRect(1, -3, 4, 4);
    if (e.maxHp > 2 && e.hp < e.maxHp) { ctx.fillStyle = '#141827'; ctx.fillRect(-e.w / 2, -e.h / 2 - 9, e.w, 3); ctx.fillStyle = '#ffd16e'; ctx.fillRect(-e.w / 2, -e.h / 2 - 9, e.w * e.hp / e.maxHp, 3); }
    ctx.restore();
  }

  function drawBoss(b) {
    ctx.save(); ctx.translate(Math.round(b.x), Math.round(b.y));
    const rage = b.hp / b.maxHp < 0.45;
    ctx.fillStyle = rage ? '#ff6d87' : '#ff9ab7'; ctx.fillRect(-52, -30, 74, 60);
    ctx.fillStyle = '#ffd36e'; ctx.fillRect(-18, -44, 32, 88); ctx.fillStyle = '#6de4dc'; ctx.fillRect(-4, -12, 36, 24); ctx.fillStyle = '#29304e'; ctx.fillRect(-60, -10, 18, 20); ctx.restore();
    ctx.fillStyle = '#111827cc'; ctx.fillRect(W - 350, 18, 320, 18); ctx.fillStyle = rage ? '#ff5575' : '#ff7a9c'; ctx.fillRect(W - 348, 20, 316 * (b.hp / b.maxHp), 14);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'right'; ctx.fillText(b.name + (rage ? ' · RAGE' : ''), W - 30, 52);
  }

  function powerColor(k) { return ({ heal: '#79ec8f', weapon: '#ffe071', shield: '#73c9ff', bomb: '#ff9bd1', score: '#ffffff' })[k]; }

  function drawTerrain(o, b) {
    ctx.save();
    if (o.type === 'wall') {
      ctx.fillStyle = b.ground; ctx.fillRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h); ctx.fillStyle = b.accent;
      for (let y = o.y - o.h / 2 + 12; y < o.y + o.h / 2 - 8; y += 22) ctx.fillRect(o.x - o.w / 2 + 10, y, Math.max(8, o.w - 25), 4);
    } else {
      ctx.translate(Math.round(o.x), Math.round(o.y)); ctx.rotate((o.spin || 0) * 0.8); ctx.fillStyle = o.type === 'crystal' ? b.accent : '#a06f51'; ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h); ctx.fillStyle = '#ffffff55'; ctx.fillRect(-o.w / 5, -o.h / 2, Math.max(3, o.w / 5), o.h / 2);
    }
    ctx.restore();
  }

  function drawHazard(h, b) {
    ctx.save();
    if (h.type === 'wind') {
      ctx.globalAlpha = 0.22; ctx.fillStyle = b.accent; ctx.fillRect(h.x - h.w / 2, h.y - h.h / 2, h.w, h.h); ctx.globalAlpha = 0.8; ctx.strokeStyle = b.accent;
      for (let y = h.y - h.h / 2 + 15; y < h.y + h.h / 2; y += 22) { ctx.beginPath(); ctx.moveTo(h.x - h.w / 2 + 15, y); ctx.lineTo(h.x + h.w / 2 - 15, y + Math.sign(h.force) * 10); ctx.stroke(); }
    } else if (h.type === 'movingGate') {
      ctx.fillStyle = b.ground; const topH = Math.max(0, h.y - h.h / 2), bottomY = h.y + h.h / 2; ctx.fillRect(h.x - h.w / 2, 0, h.w, topH); ctx.fillRect(h.x - h.w / 2, bottomY, h.w, H - bottomY); ctx.fillStyle = b.accent; ctx.fillRect(h.x - h.w / 2, topH - 6, h.w, 6); ctx.fillRect(h.x - h.w / 2, bottomY, h.w, 6);
    } else if (h.type === 'lightning') {
      if (h.warn > 0) { ctx.globalAlpha = 0.35 + Math.sin(h.t * 20) * 0.2; ctx.fillStyle = '#fff1a0'; ctx.fillRect(h.x - 18, PLAY_TOP, 36, PLAY_BOTTOM - PLAY_TOP); }
      else if (h.live > 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(h.x - 13, PLAY_TOP, 26, PLAY_BOTTOM - PLAY_TOP); ctx.fillStyle = '#9ee9ff'; ctx.fillRect(h.x - 7, PLAY_TOP, 14, PLAY_BOTTOM - PLAY_TOP); }
    } else if (h.type === 'gravity') {
      const pulse = 1 + Math.sin(h.t * 4) * 0.08; ctx.translate(h.x, h.y); ctx.fillStyle = '#11162f'; ctx.beginPath(); ctx.arc(0, 0, h.r * pulse, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = b.accent; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, h.r * 1.35, h.t, h.t + Math.PI * 1.4); ctx.stroke();
    }
    ctx.restore();
  }

  function draw() {
    const s = state, b = BIOMES[s.biome], sx = s.shake ? (Math.random() - 0.5) * s.shake : 0, sy = s.shake ? (Math.random() - 0.5) * s.shake : 0;
    ctx.save(); ctx.translate(sx, sy);
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, b.sky1); g.addColorStop(1, b.sky2); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; stars.forEach((st) => { ctx.globalAlpha = 0.2 + 0.8 * st.z; ctx.fillRect(Math.round(st.x), Math.round(st.y), st.s, st.s); }); ctx.globalAlpha = 1;
    ctx.fillStyle = b.ground; ctx.fillRect(0, 0, W, PLAY_TOP); ctx.fillRect(0, PLAY_BOTTOM, W, H - PLAY_BOTTOM); ctx.fillStyle = b.accent;
    for (let x = -((s.time * 150) % 64); x < W; x += 64) { ctx.fillRect(x, PLAY_TOP - 5, 34, 4); ctx.fillRect(x + 24, PLAY_BOTTOM + 1, 34, 4); }
    s.hazards.forEach((h) => drawHazard(h, b)); s.terrain.forEach((o) => drawTerrain(o, b));
    s.powers.forEach((o) => { const pulse = 1 + Math.sin(o.t * 6) * 0.12; ctx.save(); ctx.translate(o.x, o.y); ctx.scale(pulse, pulse); ctx.fillStyle = powerColor(o.kind); ctx.fillRect(-10, -10, 20, 20); ctx.fillStyle = '#111827'; ctx.fillRect(-3, -3, 6, 6); ctx.restore(); });
    s.shots.forEach((o) => { ctx.fillStyle = o.color; ctx.fillRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h); });
    s.enemyShots.forEach((o) => { ctx.fillStyle = o.grazed ? '#ffb0c1' : '#ff6f93'; ctx.fillRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h); });
    s.enemies.forEach(drawEnemy); if (s.bossObj) drawBoss(s.bossObj);
    s.particles.forEach((q) => { ctx.globalAlpha = clamp(q.t / q.max, 0, 1); ctx.fillStyle = q.color; ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size); }); ctx.globalAlpha = 1;
    if (s.player.inv <= 0 || Math.floor(s.player.inv * 16) % 2 === 0) drawShip(s.player.x, s.player.y);
    ctx.font = '14px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#ffffffdd'; ctx.fillText(BIOMES[s.biome].name, 18, 50); ctx.fillText('Bombs: ' + s.bombs + '   Shield: ' + s.shield, 18, 70); if (s.combo >= 1) ctx.fillText('Combo x' + (1 + s.combo * 0.1).toFixed(1), 18, 90);
    const meterX = 18, meterY = 104, meterW = 150, meterH = 9; ctx.fillStyle = '#111827aa'; ctx.fillRect(meterX, meterY, meterW, meterH); ctx.fillStyle = s.energy >= 35 ? '#70e6ff' : '#ff9a9a'; ctx.fillRect(meterX + 2, meterY + 2, (meterW - 4) * s.energy / s.maxEnergy, meterH - 4); ctx.fillStyle = '#fff'; ctx.font = '11px monospace'; ctx.fillText('DODGE ENERGY', meterX, meterY + 22);
    s.popups.forEach((q) => { ctx.globalAlpha = clamp(q.t / q.max, 0, 1); ctx.fillStyle = q.color; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.fillText(q.text, q.x, q.y); }); ctx.globalAlpha = 1;
    if (s.flash > 0) { ctx.fillStyle = '#ffffff55'; ctx.fillRect(0, 0, W, H); }
    if (paused) { ctx.fillStyle = '#0009'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.font = 'bold 34px monospace'; ctx.textAlign = 'center'; ctx.fillText('PAUSED', W / 2, H / 2); }
    ctx.restore();
  }

  function loop(now) {
    if (!running) return;
    const rawDt = Math.min(0.033, (now - last) / 1000 || 0); last = now;
    if (!paused) { if (state.hitStop > 0) state.hitStop -= rawDt; else update(rawDt); }
    draw();
    if (running) raf = requestAnimationFrame(loop);
  }

  function setTouchMove(btn, key) {
    const on = (e) => { e.preventDefault(); touch[key] = true; canvas.focus(); };
    const off = () => { touch[key] = false; };
    btn.addEventListener('pointerdown', on); btn.addEventListener('pointerup', off); btn.addEventListener('pointercancel', off); btn.addEventListener('pointerleave', off);
  }

  startBtn.addEventListener('click', () => { startBtn.classList.remove('hidden'); startBtn.textContent = 'Start Mission'; begin(); });
  canvas.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'x', 'p', 'shift', 'c'].includes(k)) e.preventDefault();
    if (k === 'p') { paused = !paused; return; }
    if (k === 'x') bomb();
    if (k === 'shift' || k === 'c') dodge();
    keys.add(k);
    if (k === ' ') shoot();
  });
  canvas.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  fireBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); touch.fire = true; ensureAudio(); canvas.focus(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((evt) => fireBtn.addEventListener(evt, () => { touch.fire = false; }));
  bombBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); ensureAudio(); bomb(); canvas.focus(); });
  if (dodgeBtn) dodgeBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); ensureAudio(); dodge(); canvas.focus(); });
  document.querySelectorAll('[data-move]').forEach((btn) => setTouchMove(btn, btn.dataset.move));

  reset();
  draw();
})();
