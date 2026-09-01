(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const padEl = document.getElementById('flightPad');
  const puckEl = document.getElementById('padPuck');
  const scoreEl = document.getElementById('score');
  const hullEl = document.getElementById('hull');
  const levelEl = document.getElementById('level');
  const weaponEl = document.getElementById('weapon');
  const energyEl = document.getElementById('energy');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayText = document.getElementById('overlayText');
  const startBtn = document.getElementById('startBtn');
  const routeChoice = document.getElementById('routeChoice');
  const dodgeBtn = document.getElementById('dodgeBtn');

  ctx.imageSmoothingEnabled = false;

  const W = canvas.width;
  const H = canvas.height;
  const TOP = 28;
  const BOTTOM = H - 28;
  const PLAYER_MIN_X = 92;
  const PLAYER_MAX_X = 272;
  const PLAYER_MIN_Y = TOP + 18;
  const PLAYER_MAX_Y = BOTTOM - 18;

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rand = (a, b) => a + Math.random() * (b - a);
  const rectHit = (a, b) => a.x - a.w / 2 < b.x + b.w / 2 && a.x + a.w / 2 > b.x - b.w / 2 && a.y - a.h / 2 < b.y + b.h / 2 && a.y + a.h / 2 > b.y - b.h / 2;
  const circleHit = (a, b, margin = 0) => Math.hypot(a.x - b.x, a.y - b.y) < (a.r || Math.max(a.w, a.h) / 2) + (b.r || Math.max(b.w, b.h) / 2) + margin;

  const BIOMES = {
    meadow: { name: 'Cloudberry', sky1: '#183866', sky2: '#70b7c8', ground: '#496a58', accent: '#b6e68d', hazard: 'wind' },
    canyon: { name: 'Ember', sky1: '#301b36', sky2: '#d06f52', ground: '#6a3d35', accent: '#ffcf70', hazard: 'rocks' },
    ruins: { name: 'Ruins', sky1: '#101637', sky2: '#3e4a75', ground: '#323d59', accent: '#8ce6de', hazard: 'gate' },
    storm: { name: 'Storm', sky1: '#111827', sky2: '#334155', ground: '#253248', accent: '#d9ecff', hazard: 'lightning' },
    nebula: { name: 'Nebula', sky1: '#281440', sky2: '#8c4b96', ground: '#4a285c', accent: '#ffc4f4', hazard: 'gravity' }
  };

  const ROUTES = [
    ['meadow', 'canyon'],
    ['ruins', 'storm'],
    ['nebula', 'canyon'],
    ['storm', 'meadow'],
    ['ruins', 'nebula']
  ];

  const BOSS_NAMES = ['Glimmerjaw', 'Cinder Crown', 'Archive Warden', 'Storm Koi', 'Sugar Comet'];

  const WEAPONS = {
    pulse:   { name: 'Pulse', color: '#fff1a0', cool: 0.14, speed: 760, symbol: '•' },
    rapid:   { name: 'Rapid', color: '#7dffef', cool: 0.067, speed: 980, symbol: '»' },
    scatter: { name: 'Scatter', color: '#ffb5e5', cool: 0.205, speed: 610, symbol: '✣' },
    wave:    { name: 'Wave', color: '#9fc5ff', cool: 0.115, speed: 570, symbol: '≈' },
    seeker:  { name: 'Seek', color: '#b7ff8c', cool: 0.275, speed: 520, symbol: '◇' },
    lance:   { name: 'Lance', color: '#ffd06e', cool: 0.39, speed: 445, symbol: '◆' }
  };
  const WEAPON_ORDER = ['pulse', 'rapid', 'scatter', 'wave', 'seeker', 'lance'];

  const ENEMIES = {
    scout:   { hp: 1, w: 25, h: 18, v: 185, pts: 100, rate: 2.0 },
    zig:     { hp: 2, w: 29, h: 20, v: 155, pts: 190, rate: 1.65 },
    diver:   { hp: 2, w: 28, h: 20, v: 142, pts: 230, rate: 99 },
    turret:  { hp: 4, w: 34, h: 26, v: 126, pts: 340, rate: 1.15 },
    tank:    { hp: 7, w: 45, h: 32, v: 102, pts: 500, rate: 1.35 },
    mine:    { hp: 1, w: 24, h: 24, v: 118, pts: 180, rate: 99 },
    splitter:{ hp: 3, w: 34, h: 24, v: 135, pts: 310, rate: 1.85 },
    carrier: { hp: 9, w: 52, h: 36, v: 84, pts: 720, rate: 2.4 }
  };

  const keys = new Set();
  const input = {
    active: false,
    pointerId: null,
    startClientX: 0,
    startClientY: 0,
    startShipX: 150,
    startShipY: H / 2,
    desiredX: 150,
    desiredY: H / 2,
    targetX: 150,
    targetY: H / 2,
    puckX: 0,
    puckY: 0
  };

  let state;
  let running = false;
  let paused = false;
  let raf = 0;
  let last = 0;
  let audioCtx = null;

  const stars = Array.from({ length: 120 }, () => ({ x: rand(0, W), y: rand(0, H), z: rand(0.2, 1), s: Math.random() < 0.82 ? 1 : 2 }));

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
      combo: 0,
      comboTimer: 0,
      shield: 0,
      energy: 100,
      maxEnergy: 100,
      dodgeCooldown: 0,
      shake: 0,
      flash: 0,
      hitStop: 0,
      director: { waveAt: 0.8, terrainAt: 3.2, hazardAt: 6, setPieceAt: 10, powerAt: 8, beat: 0 },
      player: { x: 150, y: H / 2, w: 31, h: 19, vx: 0, vy: 0, cool: 0.15, inv: 0, tilt: 0, weapon: 'pulse', weaponLevel: 1 },
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

  function resetInput(x = 150, y = H / 2) {
    input.active = false;
    input.pointerId = null;
    input.startShipX = x;
    input.startShipY = y;
    input.desiredX = x;
    input.desiredY = y;
    input.targetX = x;
    input.targetY = y;
    input.puckX = 0;
    input.puckY = 0;
    padEl.classList.remove('active');
    renderPuck();
  }

  function reset() {
    state = freshState();
    resetInput(state.player.x, state.player.y);
    updateHud();
  }

  function updateHud() {
    scoreEl.textContent = state.score.toLocaleString();
    hullEl.textContent = '♥'.repeat(Math.max(0, state.hull)) + '♡'.repeat(Math.max(0, state.maxHull - state.hull));
    levelEl.textContent = state.level;
    const w = WEAPONS[state.player.weapon];
    weaponEl.textContent = `${w.symbol} ${w.name} ${'★'.repeat(state.player.weaponLevel)}`;
    energyEl.textContent = Math.round(state.energy) + '%';
  }

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }

  function sfx(freq, duration = 0.05, type = 'square', gain = 0.015, slide = 0) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    const now = audioCtx.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(35, freq + slide), now + duration);
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(g).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  function burst(x, y, color, count = 9, speed = 160) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const v = rand(speed * 0.3, speed);
      state.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: rand(0.22, 0.58), max: 0.58, color, size: Math.random() < 0.72 ? 3 : 5 });
    }
  }

  function popup(text, x, y, color = '#fff') {
    state.popups.push({ text, x, y, color, t: 0.72, max: 0.72 });
  }

  function begin() {
    ensureAudio();
    reset();
    running = true;
    paused = false;
    overlay.classList.add('hidden');
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    canvas.focus();
  }

  function shapeAxis(v, dead = 0.035) {
    const a = Math.abs(v);
    if (a <= dead) return 0;
    const t = clamp((a - dead) / (1 - dead), 0, 1);
    return Math.sign(v) * Math.pow(t, 0.82);
  }

  function updatePadDesired(clientX, clientY) {
    const r = padEl.getBoundingClientRect();
    const dxNorm = shapeAxis((clientX - input.startClientX) / Math.max(30, r.width * 0.58));
    const dyNorm = shapeAxis((clientY - input.startClientY) / Math.max(60, r.height * 0.46));
    input.desiredX = clamp(input.startShipX + dxNorm * 105, PLAYER_MIN_X, PLAYER_MAX_X);
    input.desiredY = clamp(input.startShipY + dyNorm * 260, PLAYER_MIN_Y, PLAYER_MAX_Y);
    input.puckX = clamp((clientX - input.startClientX) / Math.max(1, r.width * 0.32), -1, 1);
    input.puckY = clamp((clientY - input.startClientY) / Math.max(1, r.height * 0.22), -1, 1);
    renderPuck();
  }

  function renderPuck() {
    if (!puckEl) return;
    const x = input.puckX * 19;
    const y = input.puckY * 42;
    puckEl.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  }

  function beginPad(ev) {
    if (!running || paused || input.active) return;
    ev.preventDefault();
    ensureAudio();
    input.active = true;
    input.pointerId = ev.pointerId;
    input.startClientX = ev.clientX;
    input.startClientY = ev.clientY;
    input.startShipX = state.player.x;
    input.startShipY = state.player.y;
    input.desiredX = state.player.x;
    input.desiredY = state.player.y;
    input.targetX = state.player.x;
    input.targetY = state.player.y;
    input.puckX = 0;
    input.puckY = 0;
    padEl.classList.add('active');
    renderPuck();
    try { padEl.setPointerCapture(ev.pointerId); } catch (_) {}
  }

  function movePad(ev) {
    if (!input.active || ev.pointerId !== input.pointerId) return;
    ev.preventDefault();
    updatePadDesired(ev.clientX, ev.clientY);
  }

  function endPad(ev) {
    if (!input.active || (ev && ev.pointerId !== input.pointerId)) return;
    if (ev) ev.preventDefault();
    input.active = false;
    input.pointerId = null;
    input.startShipX = state.player.x;
    input.startShipY = state.player.y;
    input.desiredX = state.player.x;
    input.desiredY = state.player.y;
    input.targetX = state.player.x;
    input.targetY = state.player.y;
    input.puckX = 0;
    input.puckY = 0;
    padEl.classList.remove('active');
    renderPuck();
  }

  function makeShot(x, y, vx, vy, w, h, d, color, extra = {}) {
    state.shots.push({ x, y, vx, vy, w, h, d, color, age: 0, ...extra });
  }

  function nearestTarget(x, y, max = 700) {
    let best = null;
    let bd = max;
    for (const e of state.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < bd) { bd = d; best = e; }
    }
    if (state.bossObj) {
      const d = Math.hypot(state.bossObj.x - x, state.bossObj.y - y);
      if (d < bd) best = state.bossObj;
    }
    return best;
  }

  function shoot() {
    const p = state.player;
    if (!running || paused || p.cool > 0) return;
    const lvl = p.weaponLevel;
    const w = WEAPONS[p.weapon];

    if (p.weapon === 'pulse') {
      const ys = lvl === 1 ? [0] : lvl === 2 ? [-6, 6] : [-9, 0, 9];
      ys.forEach(y => makeShot(p.x + 20, p.y + y, w.speed, 0, 13, 4, 1.0, w.color));
    }

    if (p.weapon === 'rapid') {
      const ys = lvl === 1 ? [0] : lvl === 2 ? [-5, 5] : [-8, 0, 8];
      ys.forEach((y, i) => makeShot(p.x + 20, p.y + y, w.speed + i * 20, 0, 10, 3, 0.52, w.color));
    }

    if (p.weapon === 'scatter') {
      const n = lvl === 1 ? 3 : lvl === 2 ? 5 : 7;
      for (let i = 0; i < n; i++) {
        const a = (i - (n - 1) / 2) * (lvl === 3 ? 0.072 : 0.085);
        makeShot(p.x + 18, p.y, w.speed, w.speed * a, 10, 4, 0.7, w.color);
      }
    }

    if (p.weapon === 'wave') {
      const lanes = lvl === 1 ? [0] : lvl === 2 ? [-8, 8] : [-12, 0, 12];
      lanes.forEach((y, i) => makeShot(p.x + 18, p.y + y, w.speed, 0, 11, 5, 0.7, w.color, { wave: true, waveAmp: 65 + lvl * 14, waveFreq: 8.5 + i * 0.45, wavePhase: i * 2.1, baseY: p.y + y }));
    }

    if (p.weapon === 'seeker') {
      const n = lvl;
      for (let i = 0; i < n; i++) makeShot(p.x + 18, p.y + (i - (n - 1) / 2) * 10, w.speed, rand(-28, 28), 10, 7, 0.86, w.color, { homing: true, turn: 4.6 + lvl * 0.4 });
    }

    if (p.weapon === 'lance') {
      const count = lvl === 3 ? 2 : 1;
      for (let i = 0; i < count; i++) makeShot(p.x + 22, p.y + (i ? 8 : 0), w.speed, 0, 20 + lvl * 5, 10 + lvl * 2, 2.5 + lvl * 1.0, w.color, { pierce: 1 + lvl, blast: 26 + lvl * 8 });
    }

    p.cool = Math.max(0.045, w.cool - (lvl - 1) * 0.014);
    const pitch = p.weapon === 'rapid' ? 1040 : p.weapon === 'lance' ? 170 : p.weapon === 'wave' ? 760 : p.weapon === 'seeker' ? 510 : 650;
    sfx(pitch, 0.025, p.weapon === 'seeker' ? 'sine' : 'square', 0.007, p.weapon === 'lance' ? -55 : 60);
  }

  function dodge() {
    const s = state;
    const p = s.player;
    if (!running || paused || s.energy < 30 || s.dodgeCooldown > 0) return;
    let dx = input.targetX - p.x;
    let dy = input.targetY - p.y;
    if (Math.abs(dx) + Math.abs(dy) < 2) {
      const up = keys.has('arrowup') || keys.has('w');
      const down = keys.has('arrowdown') || keys.has('s');
      const left = keys.has('arrowleft') || keys.has('a');
      const right = keys.has('arrowright') || keys.has('d');
      dx = (right ? 1 : 0) - (left ? 1 : 0);
      dy = (down ? 1 : 0) - (up ? 1 : 0);
    }
    if (Math.abs(dx) + Math.abs(dy) < 0.1) dy = -1;
    const len = Math.hypot(dx, dy) || 1;
    p.vx += dx / len * 430;
    p.vy += dy / len * 430;
    p.inv = Math.max(p.inv, 0.48);
    s.energy -= 30;
    s.dodgeCooldown = 0.36;
    s.shake = 5;
    burst(p.x - 12, p.y, '#79ecff', 10, 120);
    sfx(250, 0.08, 'sawtooth', 0.02, 650);
    updateHud();
  }

  function award(points, x = state.player.x, y = state.player.y) {
    state.combo = Math.min(16, state.combo + 1);
    state.comboTimer = 3;
    const gain = Math.round(points * (1 + state.combo * 0.075));
    state.score += gain;
    popup('+' + gain, x, y, '#fff5a1');
    updateHud();
  }

  function damage(amount = 1, source = null) {
    const p = state.player;
    if (p.inv > 0) return;
    if (state.shield > 0) {
      state.shield--;
      p.inv = 0.82;
      state.combo = 0;
      state.shake = 8;
      burst(p.x, p.y, '#73c9ff', 14, 180);
      sfx(170, 0.12, 'triangle', 0.025, 280);
      updateHud();
      return;
    }
    state.hull -= amount;
    state.combo = 0;
    state.comboTimer = 0;
    p.inv = 1.08;
    state.shake = 16;
    state.flash = 0.12;
    state.hitStop = 0.045;
    if (source) {
      const dx = p.x - source.x;
      const dy = p.y - source.y;
      const len = Math.hypot(dx, dy) || 1;
      p.vx += dx / len * 210 - 50;
      p.vy += dy / len * 210;
    }
    burst(p.x, p.y, '#ff9aa9', 17, 215);
    sfx(95, 0.14, 'sawtooth', 0.035, 45);
    updateHud();
    if (state.hull <= 0) gameOver();
  }

  function graze(sh) {
    if (sh.grazed) return;
    sh.grazed = true;
    state.energy = Math.min(100, state.energy + 7);
    state.score += 40;
    state.combo = Math.min(16, state.combo + 0.25);
    state.comboTimer = Math.max(state.comboTimer, 1.5);
    burst(sh.x, sh.y, '#8ce6de', 3, 55);
  }

  function spawnEnemy(type, x, y, extra = {}) {
    const s = ENEMIES[type];
    state.enemies.push({ type, x, y, baseY: y, w: s.w, h: s.h, hp: s.hp, maxHp: s.hp, vx: -(s.v + state.level * 7), t: rand(0, 4), fire: rand(0.55, 1.25), rate: s.rate, points: s.pts, ...extra });
  }

  function spawnWave(kind) {
    const y = rand(95, H - 95);
    const L = state.level;
    if (kind === 'line') for (let i = 0; i < 5; i++) spawnEnemy('scout', W + 60 + i * 44, y + (i - 2) * 24);
    else if (kind === 'vee') for (let i = 0; i < 5; i++) spawnEnemy(i === 2 && L > 1 ? 'zig' : 'scout', W + 55 + i * 45, y + Math.abs(i - 2) * 35 - 35);
    else if (kind === 'divers') { spawnEnemy('diver', W + 80, 75); spawnEnemy('diver', W + 150, H - 75); if (L > 3) spawnEnemy('diver', W + 220, y); }
    else if (kind === 'mines') for (let i = 0; i < 6; i++) spawnEnemy('mine', W + 70 + i * 70, 80 + (i % 3) * 150, { phase: i * 0.7 });
    else if (kind === 'armour') { spawnEnemy('tank', W + 80, y); spawnEnemy('turret', W + 150, clamp(y - 80, 70, H - 70)); spawnEnemy('turret', W + 190, clamp(y + 80, 70, H - 70)); }
    else if (kind === 'split') { spawnEnemy('splitter', W + 80, y); spawnEnemy('splitter', W + 155, clamp(y + 90, 80, H - 80)); }
    else if (kind === 'carrier') spawnEnemy('carrier', W + 100, y);
  }

  function chooseWave() {
    const L = state.level;
    const pool = ['line', 'vee', 'line'];
    if (L >= 2) pool.push('divers', 'mines');
    if (L >= 3) pool.push('armour', 'split');
    if (L >= 4) pool.push('carrier', 'mines', 'divers');
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function spawnTunnel(style = 'normal') {
    const s = state;
    const d = Math.min(1, s.level * 0.12 + s.sectionTime / 150);
    const gap = rand(205, 248) - d * 18;
    const width = rand(90, 145);
    const speed = -(176 + s.level * 8);
    let center = rand(145, H - 145);
    if (style === 'high') center = 145;
    if (style === 'low') center = H - 145;
    const topH = Math.max(30, center - gap / 2);
    const bottomY = center + gap / 2;
    const bottomH = H - bottomY;
    const group = Math.random().toString(36).slice(2);
    s.terrain.push({ type: 'wall', group, x: W + width / 2 + 25, y: topH / 2, w: width, h: topH, vx: speed, hp: 999, solid: true });
    s.terrain.push({ type: 'wall', group, x: W + width / 2 + 25, y: bottomY + bottomH / 2, w: width, h: bottomH, vx: speed, hp: 999, solid: true });
    s.hazards.push({ type: 'gateBonus', group, x: W + width / 2 + 25, y: center, w: width + 10, h: gap - 18, vx: speed, scored: false, harmless: true });
  }

  function spawnBreakables(count = 3) {
    const speed = -(185 + state.level * 8);
    for (let i = 0; i < count; i++) {
      const r = rand(16, 27);
      state.terrain.push({ type: state.biome === 'canyon' ? 'rock' : 'crystal', x: W + 80 + i * 100, y: rand(75, H - 75), w: r * 2, h: r * 2, r, vx: speed - rand(0, 30), vy: rand(-18, 18), hp: 2 + Math.floor(state.level / 2), maxHp: 4, destructible: true, solid: true, spin: rand(0, 6) });
    }
  }

  function spawnSetPiece() {
    const b = state.biome;
    const beat = state.director.beat++ % 4;
    if (b === 'meadow') {
      spawnTunnel(beat % 2 ? 'high' : 'low');
      state.hazards.push({ type: 'wind', x: W + 260, y: beat % 2 ? H - 145 : 145, w: 260, h: 120, vx: -125, force: beat % 2 ? -110 : 110, t: 0, harmless: true });
    } else if (b === 'canyon') {
      spawnTunnel(); spawnBreakables(4 + beat % 2);
    } else if (b === 'ruins') {
      spawnTunnel(); state.hazards.push({ type: 'movingGate', x: W + 280, y: H / 2, w: 58, h: 180, vx: -168, baseY: H / 2, t: 0, solid: true });
    } else if (b === 'storm') {
      spawnTunnel(beat % 2 ? 'high' : 'low');
      for (let i = 0; i < 2; i++) state.hazards.push({ type: 'lightning', x: W + 240 + i * 170, y: H / 2, w: 30, h: H - 60, vx: -112, warn: 1.45 + i * 0.25, live: 0.42, t: 0 });
    } else {
      spawnTunnel(); state.hazards.push({ type: 'gravity', x: W + 260, y: beat % 2 ? 150 : H - 150, r: 48, w: 96, h: 96, vx: -105, pull: 280, t: 0 });
    }
  }

  function spawnHazard() {
    const h = BIOMES[state.biome].hazard;
    if (h === 'rocks') spawnBreakables(3);
    else if (h === 'wind') state.hazards.push({ type: 'wind', x: W + 110, y: rand(110, H - 110), w: 230, h: rand(90, 145), vx: -120, force: Math.random() < 0.5 ? -92 : 92, t: 0, harmless: true });
    else if (h === 'gate') state.hazards.push({ type: 'movingGate', x: W + 100, y: rand(140, H - 140), w: 55, h: 175, vx: -165, baseY: H / 2, t: 0, solid: true });
    else if (h === 'lightning') state.hazards.push({ type: 'lightning', x: W + 100, y: H / 2, w: 32, h: H - 60, vx: -108, warn: 1.5, live: 0.42, t: 0 });
    else state.hazards.push({ type: 'gravity', x: W + 110, y: rand(110, H - 110), r: 46, w: 92, h: 92, vx: -102, pull: 270, t: 0 });
  }

  function unlockedWeapons() {
    return WEAPON_ORDER.slice(0, Math.min(WEAPON_ORDER.length, 2 + state.level));
  }

  function spawnPower(x = W + 30, y = rand(85, H - 85), forced = null, weaponType = null) {
    const r = Math.random();
    const kind = forced || (r < 0.56 ? 'weapon' : r < 0.72 ? 'heal' : r < 0.88 ? 'shield' : 'score');
    if (kind === 'weapon' && !weaponType) {
      const unlocked = unlockedWeapons();
      weaponType = unlocked[Math.floor(Math.random() * unlocked.length)];
    }
    state.powers.push({ kind, weaponType, x, y, w: 27, h: 27, vx: -125, t: 0 });
  }

  function collect(pow) {
    if (pow.kind === 'heal') state.hull = Math.min(state.maxHull, state.hull + 2);
    if (pow.kind === 'shield') state.shield = Math.min(3, state.shield + 2);
    if (pow.kind === 'score') state.score += 1800;
    if (pow.kind === 'weapon') {
      if (state.player.weapon === pow.weaponType) state.player.weaponLevel = Math.min(3, state.player.weaponLevel + 1);
      else { state.player.weapon = pow.weaponType; state.player.weaponLevel = 1; }
      state.player.cool = 0;
      const w = WEAPONS[state.player.weapon];
      popup(`${w.symbol} ${w.name}`, state.player.x, state.player.y - 34, w.color);
    }
    state.energy = Math.min(100, state.energy + 16);
    burst(state.player.x, state.player.y, powerColor(pow), 14, 145);
    sfx(540, 0.09, 'triangle', 0.022, 600);
    updateHud();
  }

  function powerColor(p) {
    if (p.kind === 'weapon') return WEAPONS[p.weaponType || 'pulse'].color;
    return ({ heal: '#79ec8f', shield: '#73c9ff', score: '#fff' })[p.kind] || '#fff';
  }

  function enemyFire(e) {
    const p = state.player;
    const base = Math.atan2(p.y - e.y, p.x - e.x);
    const speed = 165 + state.level * 8;
    const spread = e.type === 'turret' ? [-0.15, 0, 0.15] : e.type === 'carrier' ? [-0.1, 0.1] : [0];
    for (const a of spread) state.enemyShots.push({ x: e.x - 12, y: e.y, vx: Math.cos(base + a) * speed, vy: Math.sin(base + a) * speed, w: 9, h: 9, grazed: false });
  }

  function killEnemy(e, quiet = false) {
    if (e.dead) return;
    e.dead = true;
    burst(e.x, e.y, e.type === 'tank' || e.type === 'carrier' ? '#ffd27f' : '#ff9bd1', e.type === 'carrier' ? 24 : 11, e.type === 'carrier' ? 250 : 170);
    award(e.points, e.x, e.y - 12);
    if (e.type === 'splitter' && !quiet) {
      spawnEnemy('scout', e.x, e.y - 18, { vx: -225 });
      spawnEnemy('scout', e.x, e.y + 18, { vx: -225 });
    }
    if (e.type === 'carrier' && !quiet) {
      spawnEnemy('diver', e.x, e.y - 25);
      spawnEnemy('diver', e.x, e.y + 25);
      spawnPower(e.x, e.y, 'weapon');
    } else if (!quiet && Math.random() < 0.085) spawnPower(e.x, e.y);
    state.hitStop = Math.max(state.hitStop, e.type === 'tank' || e.type === 'carrier' ? 0.038 : 0.018);
    sfx(145, 0.07, 'square', 0.014, -50);
  }

  function destroyTerrain(o) {
    if (o.dead) return;
    o.dead = true;
    award(180 + state.level * 30, o.x, o.y - 10);
    burst(o.x, o.y, '#ffd37b', 14, 220);
    if (Math.random() < 0.14) spawnPower(o.x, o.y);
    sfx(120, 0.08, 'square', 0.018, -45);
  }

  function spawnBoss() {
    state.boss = true;
    state.enemies = [];
    state.enemyShots = [];
    state.hazards = state.hazards.filter(h => h.harmless);
    const hp = 72 + state.level * 25;
    state.bossObj = { x: W + 140, y: H / 2, w: 118, h: 92, hp, maxHp: hp, t: 0, fire: 0.9, phase: 0, name: BOSS_NAMES[state.level - 1] };
    state.flash = 0.12;
    sfx(110, 0.45, 'square', 0.032, -20);
  }

  function bossFire(b) {
    const p = state.player;
    const ratio = b.hp / b.maxHp;
    const phase = b.phase % (ratio < 0.45 ? 4 : 3);
    if (phase === 0) {
      const base = Math.atan2(p.y - b.y, p.x - b.x);
      for (let i = -2; i <= 2; i++) {
        const a = base + i * 0.17;
        state.enemyShots.push({ x: b.x - 48, y: b.y, vx: Math.cos(a) * 205, vy: Math.sin(a) * 205, w: 10, h: 10, grazed: false });
      }
    } else if (phase === 1) {
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI * 2 / 12 + b.t * 0.35;
        state.enemyShots.push({ x: b.x - 38, y: b.y, vx: Math.cos(a) * 148, vy: Math.sin(a) * 148, w: 9, h: 9, grazed: false });
      }
    } else if (phase === 2) {
      [-118, -58, 0, 58, 118].forEach(vy => state.enemyShots.push({ x: b.x - 50, y: b.y, vx: -215, vy, w: 10, h: 10, grazed: false }));
    } else {
      for (let i = -1; i <= 1; i++) state.enemyShots.push({ x: b.x - 50, y: clamp(p.y + i * 58, 45, H - 45), vx: -265, vy: 0, w: 16, h: 6, grazed: false });
    }
    b.phase++;
    sfx(140, 0.04, 'square', 0.012, 70);
  }

  function separatePlayer(o) {
    const p = state.player;
    const dx = p.x - o.x;
    const dy = p.y - o.y;
    const px = (p.w + o.w) / 2 - Math.abs(dx);
    const py = (p.h + o.h) / 2 - Math.abs(dy);
    if (px < py) { p.x += dx < 0 ? -px : px; p.vx = dx < 0 ? -100 : 100; }
    else { p.y += dy < 0 ? -py : py; p.vy = dy < 0 ? -100 : 100; }
    input.targetX = p.x; input.targetY = p.y; input.desiredX = p.x; input.desiredY = p.y;
  }

  function updateHazards(dt) {
    const p = state.player;
    for (const h of state.hazards) {
      h.t = (h.t || 0) + dt;
      h.x += (h.vx || 0) * dt;
      if (h.type === 'wind' && rectHit(p, h)) {
        p.vy += h.force * dt;
        input.targetY = clamp(input.targetY + h.force * 0.08 * dt, PLAYER_MIN_Y, PLAYER_MAX_Y);
      }
      if (h.type === 'movingGate') {
        h.y = h.baseY + Math.sin(h.t * 1.75) * 105;
        const top = { x: h.x, y: (h.y - h.h / 2) / 2, w: h.w, h: Math.max(0, h.y - h.h / 2) };
        const bottomY = h.y + h.h / 2;
        const bottom = { x: h.x, y: bottomY + (H - bottomY) / 2, w: h.w, h: Math.max(0, H - bottomY) };
        if (rectHit(p, top) || rectHit(p, bottom)) damage(1, h);
      }
      if (h.type === 'lightning') {
        h.warn -= dt;
        if (h.warn <= 0) h.live -= dt;
        if (h.warn <= 0 && h.live > 0 && Math.abs(p.x - h.x) < 20) damage(1, h);
      }
      if (h.type === 'gravity') {
        const dx = h.x - p.x;
        const dy = h.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 210) {
          const f = h.pull * (1 - d / 210);
          p.vx += dx / d * f * dt;
          p.vy += dy / d * f * dt;
        }
        if (d < h.r + 10) damage(1, h);
      }
      if (h.type === 'gateBonus' && !h.scored && h.x < p.x - 25) {
        h.scored = true;
        if (Math.abs(p.y - h.y) < h.h / 2) {
          award(420 + state.level * 70, p.x, p.y - 34);
          state.energy = Math.min(100, state.energy + 10);
        }
      }
    }
    state.hazards = state.hazards.filter(h => h.x + (h.w || h.r * 2 || 100) > -80 && (h.type !== 'lightning' || h.warn > 0 || h.live > 0));
  }

  function updateDirector() {
    const d = state.director;
    const t = state.sectionTime;
    if (!state.boss && t >= 38) { spawnBoss(); return; }
    if (state.boss) return;
    if (t >= d.waveAt) { spawnWave(chooseWave()); d.waveAt = t + rand(2.25, 3.25); }
    if (t >= d.terrainAt) { spawnTunnel(); d.terrainAt = t + rand(5.4, 7.3); }
    if (t >= d.hazardAt) { spawnHazard(); d.hazardAt = t + rand(7.4, 10.5); }
    if (t >= d.setPieceAt) { spawnSetPiece(); d.setPieceAt = t + rand(11.5, 14.5); }
    if (t >= d.powerAt) { spawnPower(); d.powerAt = t + rand(9, 12.5); }
  }

  function updatePlayer(dt) {
    const p = state.player;

    if (!input.active) {
      const dx = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0);
      const dy = (keys.has('arrowdown') || keys.has('s') ? 1 : 0) - (keys.has('arrowup') || keys.has('w') ? 1 : 0);
      input.desiredX = clamp(input.desiredX + dx * 150 * dt, PLAYER_MIN_X, PLAYER_MAX_X);
      input.desiredY = clamp(input.desiredY + dy * 300 * dt, PLAYER_MIN_Y, PLAYER_MAX_Y);
    }

    const targetFollow = 1 - Math.exp(-14 * dt);
    input.targetX += (input.desiredX - input.targetX) * targetFollow;
    input.targetY += (input.desiredY - input.targetY) * targetFollow;

    const shipFollow = 1 - Math.exp(-17 * dt);
    const oldX = p.x;
    const oldY = p.y;
    p.x += (input.targetX - p.x) * shipFollow;
    p.y += (input.targetY - p.y) * shipFollow;
    p.vx = (p.x - oldX) / Math.max(0.001, dt);
    p.vy = (p.y - oldY) / Math.max(0.001, dt);

    p.x = clamp(p.x, PLAYER_MIN_X, PLAYER_MAX_X);
    p.y = clamp(p.y, PLAYER_MIN_Y, PLAYER_MAX_Y);
    p.tilt = clamp(p.vy / 260, -1, 1);
  }

  function update(dt) {
    const s = state;
    const p = s.player;
    s.time += dt;
    s.sectionTime += dt;
    p.cool = Math.max(0, p.cool - dt);
    p.inv = Math.max(0, p.inv - dt);
    s.flash = Math.max(0, s.flash - dt);
    s.dodgeCooldown = Math.max(0, s.dodgeCooldown - dt);
    s.energy = Math.min(100, s.energy + 8 * dt);
    s.comboTimer -= dt;
    if (s.comboTimer <= 0) s.combo = Math.max(0, s.combo - dt * 2);

    updatePlayer(dt);
    shoot();

    for (const st of stars) {
      st.x -= (35 + 180 * st.z) * dt;
      if (st.x < 0) { st.x = W; st.y = rand(0, H); }
    }

    updateDirector();

    for (const sh of s.shots) {
      sh.age += dt;
      if (sh.homing) {
        const t = nearestTarget(sh.x, sh.y);
        if (t) {
          const desired = Math.atan2(t.y - sh.y, t.x - sh.x);
          const current = Math.atan2(sh.vy, sh.vx);
          let diff = ((desired - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          const a = current + clamp(diff, -sh.turn * dt, sh.turn * dt);
          const speed = Math.hypot(sh.vx, sh.vy);
          sh.vx = Math.cos(a) * speed;
          sh.vy = Math.sin(a) * speed;
        }
      }
      if (sh.wave) {
        const oscillation = Math.sin(sh.age * sh.waveFreq + sh.wavePhase) * sh.waveAmp;
        sh.vy = oscillation;
      }
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
    }

    for (const e of s.enemies) {
      e.t += dt;
      e.x += e.vx * dt;
      if (e.type === 'zig') e.y = e.baseY + Math.sin(e.t * 5) * 72;
      if (e.type === 'diver') {
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const l = Math.hypot(dx, dy) || 1;
        e.vx += dx / l * 58 * dt;
        e.y += dy / l * 128 * dt;
      }
      if (e.type === 'mine') {
        e.y = e.baseY + Math.sin(e.t * 2.6 + (e.phase || 0)) * 40;
        if (e.x < p.x + 230 && e.x > p.x + 80) e.vx = -70;
      }
      if (e.type === 'carrier' && Math.floor(e.t * 1.1) !== Math.floor((e.t - dt) * 1.1) && e.x < W - 100 && Math.random() < 0.33) spawnEnemy('scout', e.x - 25, e.y + rand(-25, 25), { vx: -225 });
      e.fire -= dt;
      if (e.fire <= 0 && e.x < W - 60 && !['diver', 'mine'].includes(e.type)) { enemyFire(e); e.fire = rand(0.85, 1.45) * e.rate; }
    }

    for (const sh of s.enemyShots) { sh.x += sh.vx * dt; sh.y += sh.vy * dt; }
    for (const o of s.terrain) { o.x += o.vx * dt; if (o.vy) o.y += o.vy * dt; o.spin = (o.spin || 0) + dt; }
    for (const pow of s.powers) { pow.x += pow.vx * dt; pow.t += dt; pow.y += Math.sin(pow.t * 4) * 13 * dt; }
    updateHazards(dt);

    if (s.bossObj) {
      const b = s.bossObj;
      b.t += dt;
      b.x += (W - 155 - b.x) * Math.min(1, dt * 1.8);
      b.y = H / 2 + Math.sin(b.t * 1.35) * 145;
      b.fire -= dt;
      if (b.fire <= 0) {
        bossFire(b);
        b.fire = Math.max(0.46, 1.08 - state.level * 0.055 - (b.hp / b.maxHp < 0.45 ? 0.14 : 0));
      }
    }

    for (const sh of s.shots) {
      for (const e of s.enemies) {
        if (sh.dead || e.dead || !rectHit(sh, e)) continue;
        e.hp -= sh.d;
        burst(sh.x, sh.y, sh.color, 3, 70);
        if (sh.blast && e.hp <= 0) {
          for (const other of s.enemies) if (!other.dead && Math.hypot(other.x - e.x, other.y - e.y) < sh.blast) other.hp -= sh.d * 0.55;
        }
        if (!sh.pierce || --sh.pierce < 0) sh.dead = true;
        if (e.hp <= 0) killEnemy(e);
      }
      for (const o of s.terrain) {
        if (sh.dead || o.dead || !o.destructible) continue;
        const hit = o.r ? circleHit(sh, o, -5) : rectHit(sh, o);
        if (hit) {
          o.hp -= sh.d;
          if (!sh.pierce || --sh.pierce < 0) sh.dead = true;
          if (o.hp <= 0) destroyTerrain(o);
        }
      }
      if (s.bossObj && !sh.dead && rectHit(sh, s.bossObj)) {
        s.bossObj.hp -= sh.d;
        if (!sh.pierce || --sh.pierce < 0) sh.dead = true;
        if (s.bossObj.hp <= 0) {
          award(5500 * state.level, s.bossObj.x, s.bossObj.y);
          burst(s.bossObj.x, s.bossObj.y, '#fff', 55, 350);
          s.bossObj = null;
          finishLevel();
          return;
        }
      }
    }

    for (const e of s.enemies) if (!e.dead && rectHit(p, e)) { e.dead = true; damage(e.type === 'tank' || e.type === 'carrier' ? 2 : 1, e); }
    for (const sh of s.enemyShots) {
      if (sh.dead) continue;
      if (rectHit(p, sh)) { sh.dead = true; damage(1, sh); }
      else {
        const d = Math.hypot(p.x - sh.x, p.y - sh.y);
        if (d < 29 && d > 13) graze(sh);
      }
    }
    for (const o of s.terrain) {
      if (o.dead || !o.solid) continue;
      const hit = o.r ? circleHit(p, o, -4) : rectHit(p, o);
      if (hit) { if (!o.r) separatePlayer(o); damage(1, o); }
    }
    for (const pow of s.powers) if (!pow.dead && rectHit(p, pow)) { pow.dead = true; collect(pow); }
    if (s.bossObj && rectHit(p, s.bossObj)) damage(2, s.bossObj);

    for (const q of s.particles) { q.t -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= Math.pow(0.05, dt); q.vy *= Math.pow(0.05, dt); }
    for (const q of s.popups) { q.t -= dt; q.y -= 26 * dt; }

    s.shots = s.shots.filter(o => !o.dead && o.x < W + 90 && o.y > -80 && o.y < H + 80);
    s.enemies = s.enemies.filter(o => !o.dead && o.x > -110 && o.y > -130 && o.y < H + 130);
    s.enemyShots = s.enemyShots.filter(o => !o.dead && o.x > -70 && o.x < W + 70 && o.y > -70 && o.y < H + 70);
    s.terrain = s.terrain.filter(o => !o.dead && o.x + (o.w || 40) / 2 > -80);
    s.powers = s.powers.filter(o => !o.dead && o.x > -70);
    s.particles = s.particles.filter(o => o.t > 0);
    s.popups = s.popups.filter(o => o.t > 0);
    updateHud();
  }

  function finishLevel() {
    running = false;
    cancelAnimationFrame(raf);
    state.boss = false;
    endPad();
    if (state.level >= 5) {
      overlayTitle.textContent = '★ ★ ★';
      overlayText.textContent = state.score.toLocaleString();
      routeChoice.classList.add('hidden');
      startBtn.classList.remove('hidden');
      startBtn.textContent = '▶';
      overlay.classList.remove('hidden');
      return;
    }
    const opts = ROUTES[state.level - 1];
    routeChoice.innerHTML = '';
    routeChoice.classList.remove('hidden');
    for (const key of opts) {
      const btn = document.createElement('button');
      btn.textContent = BIOMES[key].name;
      btn.style.borderColor = BIOMES[key].accent;
      btn.addEventListener('click', () => nextLevel(key));
      routeChoice.appendChild(btn);
    }
    overlayTitle.textContent = '◆';
    overlayText.textContent = '';
    startBtn.classList.add('hidden');
    overlay.classList.remove('hidden');
  }

  function nextLevel(key) {
    state.level++;
    state.biome = key;
    state.sectionTime = 0;
    state.boss = false;
    state.bossObj = null;
    state.enemyShots = [];
    state.enemies = [];
    state.terrain = [];
    state.hazards = [];
    state.powers = [];
    state.director = { waveAt: 1, terrainAt: 2.8, hazardAt: 5.5, setPieceAt: 8.5, powerAt: 6.5, beat: 0 };
    state.player.x = 150;
    state.player.y = H / 2;
    state.player.inv = 1.35;
    state.hull = Math.min(state.maxHull, state.hull + 1);
    state.score += 1000 * state.level;
    resetInput(state.player.x, state.player.y);
    const unlocked = unlockedWeapons();
    const reward = unlocked[Math.min(unlocked.length - 1, state.level)];
    spawnPower(W + 110, H / 2, 'weapon', reward);
    routeChoice.classList.add('hidden');
    overlay.classList.add('hidden');
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
    updateHud();
  }

  function gameOver() {
    running = false;
    cancelAnimationFrame(raf);
    endPad();
    overlayTitle.textContent = '×';
    overlayText.textContent = state.score.toLocaleString();
    startBtn.textContent = '▶';
    startBtn.classList.remove('hidden');
    routeChoice.classList.add('hidden');
    overlay.classList.remove('hidden');
  }

  function drawShip() {
    const p = state.player;
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    ctx.rotate(p.tilt * 0.12);
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
    ctx.save();
    ctx.translate(Math.round(e.x), Math.round(e.y));
    const colors = { scout: '#a9ef8c', zig: '#ee9bd0', diver: '#ff7f8e', turret: '#8ce6de', tank: '#f2b96b', mine: '#ffca6e', splitter: '#c7a8ff', carrier: '#f6a86b' };
    ctx.fillStyle = colors[e.type] || '#fff';
    if (e.type === 'mine') {
      ctx.rotate(e.t); ctx.fillRect(-10, -10, 20, 20); ctx.fillStyle = '#fff'; ctx.fillRect(-3, -3, 6, 6);
    } else {
      ctx.fillRect(-e.w / 2, -e.h / 2, e.w * 0.8, e.h); ctx.fillRect(-4, -e.h / 2 - 4, 9, e.h + 8);
      ctx.fillStyle = '#23304a'; ctx.fillRect(-e.w / 2 - 5, -4, 7, 8); ctx.fillStyle = '#fff'; ctx.fillRect(1, -3, 4, 4);
    }
    ctx.restore();
  }

  function drawTerrain(o, b) {
    ctx.save();
    if (o.type === 'wall') {
      ctx.fillStyle = b.ground; ctx.fillRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h);
      ctx.fillStyle = b.accent;
      for (let y = o.y - o.h / 2 + 12; y < o.y + o.h / 2 - 8; y += 22) ctx.fillRect(o.x - o.w / 2 + 10, y, Math.max(8, o.w - 25), 4);
    } else {
      ctx.translate(o.x, o.y); ctx.rotate((o.spin || 0) * 0.8);
      ctx.fillStyle = o.type === 'crystal' ? b.accent : '#a06f51'; ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
      ctx.fillStyle = '#ffffff55'; ctx.fillRect(-o.w / 5, -o.h / 2, Math.max(3, o.w / 5), o.h / 2);
    }
    ctx.restore();
  }

  function drawHazard(h, b) {
    ctx.save();
    if (h.type === 'wind') {
      ctx.globalAlpha = 0.2; ctx.fillStyle = b.accent; ctx.fillRect(h.x - h.w / 2, h.y - h.h / 2, h.w, h.h);
      ctx.globalAlpha = 0.72; ctx.strokeStyle = b.accent;
      for (let y = h.y - h.h / 2 + 15; y < h.y + h.h / 2; y += 22) { ctx.beginPath(); ctx.moveTo(h.x - h.w / 2 + 15, y); ctx.lineTo(h.x + h.w / 2 - 15, y + Math.sign(h.force) * 10); ctx.stroke(); }
    } else if (h.type === 'movingGate') {
      ctx.fillStyle = b.ground; const topH = Math.max(0, h.y - h.h / 2), bottomY = h.y + h.h / 2;
      ctx.fillRect(h.x - h.w / 2, 0, h.w, topH); ctx.fillRect(h.x - h.w / 2, bottomY, h.w, H - bottomY);
      ctx.fillStyle = b.accent; ctx.fillRect(h.x - h.w / 2, topH - 6, h.w, 6); ctx.fillRect(h.x - h.w / 2, bottomY, h.w, 6);
    } else if (h.type === 'lightning') {
      if (h.warn > 0) { ctx.globalAlpha = 0.28 + Math.sin(h.t * 20) * 0.16; ctx.fillStyle = '#fff1a0'; ctx.fillRect(h.x - 18, TOP, 36, BOTTOM - TOP); }
      else if (h.live > 0) { ctx.fillStyle = '#fff'; ctx.fillRect(h.x - 13, TOP, 26, BOTTOM - TOP); ctx.fillStyle = '#9ee9ff'; ctx.fillRect(h.x - 7, TOP, 14, BOTTOM - TOP); }
    } else if (h.type === 'gravity') {
      const pulse = 1 + Math.sin(h.t * 4) * 0.08; ctx.translate(h.x, h.y); ctx.fillStyle = '#11162f'; ctx.beginPath(); ctx.arc(0, 0, h.r * pulse, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = b.accent; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, h.r * 1.35, h.t, h.t + Math.PI * 1.4); ctx.stroke();
    }
    ctx.restore();
  }

  function drawBoss(b) {
    ctx.save(); ctx.translate(b.x, b.y);
    const rage = b.hp / b.maxHp < 0.45;
    ctx.fillStyle = rage ? '#ff6d87' : '#ff9ab7'; ctx.fillRect(-52, -30, 74, 60);
    ctx.fillStyle = '#ffd36e'; ctx.fillRect(-18, -44, 32, 88);
    ctx.fillStyle = '#6de4dc'; ctx.fillRect(-4, -12, 36, 24);
    ctx.restore();
    ctx.fillStyle = '#111827cc'; ctx.fillRect(W - 350, 18, 320, 14);
    ctx.fillStyle = rage ? '#ff5575' : '#ff7a9c'; ctx.fillRect(W - 348, 20, 316 * (b.hp / b.maxHp), 10);
  }

  function drawPower(pow) {
    const color = powerColor(pow);
    const pulse = 1 + Math.sin(pow.t * 6) * 0.12;
    ctx.save(); ctx.translate(pow.x, pow.y); ctx.scale(pulse, pulse);
    ctx.fillStyle = color; ctx.fillRect(-12, -12, 24, 24);
    ctx.fillStyle = '#10162a';
    if (pow.kind === 'weapon') {
      const type = pow.weaponType || 'pulse';
      if (type === 'rapid') { ctx.fillRect(-7, -5, 14, 3); ctx.fillRect(-7, 2, 14, 3); }
      else if (type === 'scatter') { ctx.fillRect(-7, -1, 14, 3); ctx.fillRect(-4, -7, 3, 14); ctx.fillRect(3, -7, 3, 14); }
      else if (type === 'wave') { ctx.fillRect(-8, -5, 5, 5); ctx.fillRect(-2, 0, 5, 5); ctx.fillRect(4, -5, 5, 5); }
      else if (type === 'seeker') { ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(7, 0); ctx.lineTo(0, 7); ctx.lineTo(-7, 0); ctx.closePath(); ctx.fill(); }
      else if (type === 'lance') { ctx.fillRect(-8, -3, 16, 6); }
      else { ctx.fillRect(-7, -2, 14, 4); }
    } else if (pow.kind === 'heal') { ctx.fillRect(-2, -8, 4, 16); ctx.fillRect(-8, -2, 16, 4); }
    else if (pow.kind === 'shield') { ctx.strokeStyle = '#10162a'; ctx.lineWidth = 3; ctx.strokeRect(-7, -7, 14, 14); }
    else { ctx.fillRect(-4, -4, 8, 8); }
    ctx.restore();
  }

  function draw() {
    const s = state;
    const b = BIOMES[s.biome];
    const sx = s.shake ? (Math.random() - 0.5) * s.shake : 0;
    const sy = s.shake ? (Math.random() - 0.5) * s.shake : 0;
    s.shake *= 0.88;

    ctx.save(); ctx.translate(sx, sy);
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, b.sky1); g.addColorStop(1, b.sky2); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    for (const st of stars) { ctx.globalAlpha = 0.2 + 0.8 * st.z; ctx.fillRect(st.x, st.y, st.s, st.s); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = b.ground; ctx.fillRect(0, 0, W, TOP); ctx.fillRect(0, BOTTOM, W, H - BOTTOM);
    ctx.fillStyle = b.accent;
    for (let x = -((s.time * 150) % 64); x < W; x += 64) { ctx.fillRect(x, TOP - 5, 34, 4); ctx.fillRect(x + 24, BOTTOM + 1, 34, 4); }

    for (const h of s.hazards) drawHazard(h, b);
    for (const o of s.terrain) drawTerrain(o, b);
    for (const pow of s.powers) drawPower(pow);
    for (const sh of s.shots) { ctx.fillStyle = sh.color; ctx.fillRect(sh.x - sh.w / 2, sh.y - sh.h / 2, sh.w, sh.h); }
    for (const sh of s.enemyShots) { ctx.fillStyle = sh.grazed ? '#ffb0c1' : '#ff6f93'; ctx.fillRect(sh.x - sh.w / 2, sh.y - sh.h / 2, sh.w, sh.h); }
    for (const e of s.enemies) drawEnemy(e);
    if (s.bossObj) drawBoss(s.bossObj);
    for (const q of s.particles) { ctx.globalAlpha = clamp(q.t / q.max, 0, 1); ctx.fillStyle = q.color; ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size); }
    ctx.globalAlpha = 1;
    if (s.player.inv <= 0 || Math.floor(s.player.inv * 16) % 2 === 0) drawShip();
    for (const q of s.popups) { ctx.globalAlpha = clamp(q.t / q.max, 0, 1); ctx.fillStyle = q.color; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.fillText(q.text, q.x, q.y); }
    ctx.globalAlpha = 1;
    if (s.flash > 0) { ctx.fillStyle = '#ffffff55'; ctx.fillRect(0, 0, W, H); }
    if (paused) { ctx.fillStyle = '#0009'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.font = 'bold 34px monospace'; ctx.textAlign = 'center'; ctx.fillText('Ⅱ', W / 2, H / 2); }
    ctx.restore();
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.033, (now - last) / 1000 || 0);
    last = now;
    if (!paused) {
      if (state.hitStop > 0) state.hitStop -= dt;
      else update(dt);
    }
    draw();
    if (running) raf = requestAnimationFrame(loop);
  }

  padEl.addEventListener('pointerdown', beginPad, { passive: false });
  padEl.addEventListener('pointermove', movePad, { passive: false });
  padEl.addEventListener('pointerup', endPad, { passive: false });
  padEl.addEventListener('pointercancel', endPad, { passive: false });

  canvas.addEventListener('keydown', ev => {
    const k = ev.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'x', 'p', 'shift', 'c'].includes(k)) ev.preventDefault();
    if (k === 'p') { paused = !paused; return; }
    if (k === 'shift' || k === 'c') dodge();
    keys.add(k);
  });
  canvas.addEventListener('keyup', ev => keys.delete(ev.key.toLowerCase()));

  dodgeBtn.addEventListener('pointerdown', ev => { ev.preventDefault(); ensureAudio(); dodge(); canvas.focus(); });
  startBtn.addEventListener('click', () => { startBtn.textContent = '▶'; begin(); });

  reset();
  draw();
})();
