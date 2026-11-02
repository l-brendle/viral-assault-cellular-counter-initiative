'use strict';
(() => {
// ---------------------------------------------------------------- config
const CFG = { W: 1200, H: 900, MAX_VIRUS: 220, MAX_ALLY: 40, CELL: 32 };
let VIEW_H = 240;   // phones render at 180 so everything appears ~33% bigger
let VIEW_W = 427;

const TYPES = {
  basic:  { r: 6, hp: 20, speed: 34, dmg: 4,  arc: 0.55, xp: 1, ally: 16, col: '#6ccf3c' },
  runner: { r: 4, hp: 10, speed: 62, dmg: 3,  arc: 0.65, xp: 1, ally: 11, col: '#f0b030' },
  brute:  { r: 9, hp: 70, speed: 22, dmg: 12, arc: 0.45, xp: 4, ally: 24, col: '#a050d8' },
  slimeling: { r: 4, hp: 8, speed: 40, dmg: 2, arc: 0.55, xp: 1, ally: 10, col: '#8fdc4a' },   // lung level: spawned by sick air sacs
  saboteur: { r: 5, hp: 14, speed: 48, dmg: 2, arc: 0.55, xp: 3, ally: 13, col: '#e050c0' },   // lung level: goes for the air sacs
};
const ORGANS = [
  { name: 'BRAIN', tag: 'BRN', x: 600,  y: 150 },
  { name: 'LUNGS', tag: 'LNG', x: 190,  y: 400 },
  { name: 'HEART', tag: 'HRT', x: 600,  y: 440 },
  { name: 'LIVER', tag: 'LVR', x: 1010, y: 400 },
  { name: 'GUT',   tag: 'GUT', x: 600,  y: 770 },
];
// Levels: each is the inside of one organ. `sacs` are fixables (things to poke back into shape) placed in the world.
const LEVELS = {
  classic: { name: 'CLASSIC', time: 360, bg: 'bg', clear: '#12060b', edge: '#7a2a40', win: 'THE FEVER BROKE', intro: '' },
  lung: { name: 'LUNGS', time: 300, bg: 'bgLung', clear: '#1c0d1c', edge: '#5aa8b8', win: 'THE LUNGS BREATHE EASY', intro: 'LUNGS: KEEP THE AIR SACS OPEN',
    sacs: [[300, 250], [600, 200], [900, 250], [200, 480], [460, 470], [740, 470], [1000, 480], [360, 730], [840, 730]] },
};
const LEVEL_KEYS = Object.keys(LEVELS);
let lvKey = 'classic';
const lvl = () => LEVELS[lvKey];

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
function resize() {
  VIEW_W = Math.max(320, Math.round(VIEW_H * innerWidth / innerHeight));
  canvas.width = VIEW_W; canvas.height = VIEW_H;
  const s = Math.min(innerWidth / VIEW_W, innerHeight / VIEW_H);   // uniform scale keeps pixels square
  canvas.style.width = Math.floor(VIEW_W * s) + 'px'; canvas.style.height = Math.floor(VIEW_H * s) + 'px';
  ctx.imageSmoothingEnabled = false;
}
const isTouch = matchMedia('(pointer: coarse)').matches;
if (isTouch) VIEW_H = 180;
let touchUI = isTouch;       // show touch hints + on-screen controls
function toView(e) {
  const r = canvas.getBoundingClientRect();
  mouse.sx = (e.clientX - r.left) / r.width * VIEW_W; mouse.sy = (e.clientY - r.top) / r.height * VIEW_H;
  if (e.pointerType === 'mouse') mouse.moved = true;   // touches must not hijack the mouse aim
}
addEventListener('resize', resize); resize();

// ---------------------------------------------------------------- helpers
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

// ---------------------------------------------------------------- audio
let AC = null; const sfxT = {};
function initAudio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* no audio */ } }
  if (AC && AC.state === 'suspended') AC.resume();
}
function sfx(key, f, d = 0.07, type = 'square', vol = 0.025, slide = 0) {
  if (evq) evq.push(['s', key, f, d, type, vol, slide]);
  if (!AC) return;
  const t = AC.currentTime;
  if (sfxT[key] && t - sfxT[key] < 0.04) return;
  sfxT[key] = t;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d);
}

// ---------------------------------------------------------------- input
const keys = {};
const mouse = { sx: 0, sy: 0, moved: false };
let coop = false;
let net = null;          // online session: { peer, conn, role: 'host' | 'guest', ... }
let evq = null;          // host: events (sfx / particles) queued for the guest
let lobby = null, titleMsg = '';
const meIdx = () => net ? (net.role === 'host' ? 0 : 1) : -1;
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (k.startsWith('arrow') || k === ' ') e.preventDefault();
  initAudio(); onKey(k);
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

// floating virtual sticks: touch the left half to move, the right half to aim (auto fire)
const touch = { move: null, aim: null };
const STICK_R = 26;
function stickVec(st, dead) {
  if (!st) return null;
  let dx = (st.x - st.ox) / STICK_R, dy = (st.y - st.oy) / STICK_R;
  const l = Math.hypot(dx, dy);
  if (l > 1) { dx /= l; dy /= l; }
  return l < dead ? { x: 0, y: 0, l: 0 } : { x: dx, y: dy, l: Math.min(1, l) };
}
// ---- fullscreen (hides the mobile browser's address bar). iPhone Safari has no fullscreen API for pages:
// there the game shows a hint to add it to the home screen, where the manifest makes it fullscreen.
const fsRoot = document.documentElement;
const fsSupported = !!(fsRoot.requestFullscreen || fsRoot.webkitRequestFullscreen);
const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
const isStandalone = () => matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches || !!navigator.standalone;
const fsAvail = () => touchUI && fsSupported && !isStandalone();
let fsPending = null;    // touch: fullscreen may only start from pointerup (that is what counts as a user gesture)
function setFullscreen(mode) {
  try {
    if (isFullscreen()) { if (mode === 'toggle') (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    const p = (fsRoot.requestFullscreen || fsRoot.webkitRequestFullscreen).call(fsRoot, { navigationUI: 'hide' });
    if (p && p.then) p.then(() => { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); }).catch(() => {});
  } catch (err) { /* not allowed right now */ }
}
function requestFs(mode, e) { if (e.pointerType === 'mouse') setFullscreen(mode); else fsPending = mode; }
document.addEventListener('fullscreenchange', resize);
document.addEventListener('webkitfullscreenchange', resize);
const fsBtnPlay = () => ({ x: VIEW_W - 34, y: 26, w: 14, h: 13 });
const fsBtnTitle = () => ({ x: VIEW_W - 54, y: 4, w: 50, h: 14 });
// click / tap on a weak spot (within reach) -> tail poke
function pokeClick(fingers) {
  const wx = mouse.sx + cam.x, wy = mouse.sy + cam.y;
  const t = pokeTargetAt(wx, wy, fingers ? 15 : 10), me = isGuest() ? players[meIdx()] : players[0];
  if (!t || !me) return false;
  if (isGuest()) {
    const sp = spotOf(t);
    if (Math.hypot(sp.x - me.x, sp.y - me.y) > reachOf(me) * 1.1) { tip(sp.x, sp.y - 6, 'TOO FAR'); return true; }
    relay({ k: 'poke', wx, wy });
  } else tryPoke(me, t);
  return true;
}
function pokeNearestKey(idx) {   // key / on-screen button: poke whichever weak spot is closest and in reach
  const me = isGuest() ? players[meIdx()] : players[idx];
  if (!me || me.down) return;
  const t = pokeNearest(me);
  if (!t) { tip(me.x, me.y - 14, 'NOTHING TO POKE'); return; }
  if (isGuest()) relay({ k: 'poke', nearest: true }); else tryPoke(me, t);
}
function toggleFire(idx) {   // shooting on/off, per player (once unlocked)
  if (!S.shoot) return;
  const me = isGuest() ? players[meIdx()] : players[idx];
  if (!me || me.down) return;
  if (isGuest()) { relay({ k: 'fire' }); tip(me.x, me.y - 14, me.autoFire ? 'FIRE OFF' : 'FIRE ON', '#ffd88a'); return; }
  me.autoFire = !me.autoFire;
  tip(me.x, me.y - 14, me.autoFire ? 'FIRE ON' : 'FIRE OFF', '#ffd88a');
  sfx('fire', me.autoFire ? 600 : 300, 0.06, 'square', 0.02);
}
const fireBtn = () => ({ x: VIEW_W - 64, y: VIEW_H - 126, w: 40, h: 14 });
const pauseBtn = () => ({ x: VIEW_W - 18, y: 26, w: 14, h: 13 });
const inRect = (r, x, y) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
function doPause() { if (isGuest()) relay({ k: 'pause' }); else togglePause(); }

canvas.addEventListener('pointerdown', e => {
  e.preventDefault(); initAudio(); toView(e);
  const fingers = e.pointerType !== 'mouse';
  if (fingers) touchUI = true;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
  if (state === 'play') {
    if (!fingers) { if (e.button === 2) toggleFire(0); else pokeClick(false); return; }   // right click toggles shooting
    if (inRect(pauseBtn(), mouse.sx, mouse.sy)) { doPause(); return; }
    if (fsAvail() && inRect(fsBtnPlay(), mouse.sx, mouse.sy)) { requestFs('toggle', e); return; }
    if (S.shoot && inRect(fireBtn(), mouse.sx, mouse.sy)) { toggleFire(0); return; }
    if (pokeClick(true)) return;   // a tap right on a weak spot pokes it instead of starting a stick
    const st = { id: e.pointerId, ox: mouse.sx, oy: mouse.sy, x: mouse.sx, y: mouse.sy };
    if (mouse.sx < VIEW_W / 2) { if (!touch.move) touch.move = st; } else if (!touch.aim) touch.aim = st;
    return;
  }
  if (state === 'title') {
    if (fsAvail() && inRect(fsBtnTitle(), mouse.sx, mouse.sy)) { requestFs('toggle', e); return; }
    const m = titleBtnAt(mouse.sx, mouse.sy);
    if (m) { if (fingers && fsAvail() && m < 5) requestFs('enter', e); titleChoice(m); }   // starting a game on a phone goes fullscreen
  }
  else if (state === 'lobby') lobbyTap();
  else if (state === 'over' && G.overT > 0.7 && !isGuest()) startGame(coop);
  else if (state === 'levelup') { const i = cardAt(mouse.sx, mouse.sy); if (i >= 0) pickUpgrade(i); }
  else if (state === 'paused') doPause();
});
canvas.addEventListener('pointermove', e => {
  toView(e);
  for (const k of ['move', 'aim']) if (touch[k] && touch[k].id === e.pointerId) { touch[k].x = mouse.sx; touch[k].y = mouse.sy; }
});
const endPointer = e => {
  if (fsPending && e.pointerType !== 'mouse') { const m = fsPending; fsPending = null; setFullscreen(m); }
  for (const k of ['move', 'aim']) if (touch[k] && touch[k].id === e.pointerId) touch[k] = null;
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('contextmenu', e => e.preventDefault());

// room-code keypad (works with touch or mouse; physical keyboard still works too)
const CODE_KEYS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
function lobbyButtons() {
  const c = VIEW_W / 2, out = [];
  if (lobby.mode === 'join') {
    for (let i = 0; i < 24; i++) out.push({ id: CODE_KEYS[i], x: c - 96 + (i % 8) * 24, y: 84 + Math.floor(i / 8) * 17, w: 22, h: 15 });
    out.push({ id: 'DEL', x: c - 72, y: 140, w: 44, h: 15 }, { id: 'GO', x: c - 22, y: 140, w: 44, h: 15 }, { id: 'BACK', x: c + 28, y: 140, w: 44, h: 15 });
  } else out.push({ id: 'BACK', x: c - 22, y: VIEW_H - 22, w: 44, h: 15 });
  return out;
}
function lobbyTap() { for (const b of lobbyButtons()) if (inRect(b, mouse.sx, mouse.sy)) { lobbyPress(b.id); return; } }
function lobbyPress(id) {
  if (id === 'BACK') netDown('');
  else if (lobby.mode === 'join' && !net) {
    if (id === 'DEL') lobby.code = lobby.code.slice(0, -1);
    else if (id === 'GO') { if (lobby.code.length === 4) { lobby.msg = 'CONNECTING...'; netConnect('guest', lobby.code); } else lobby.msg = 'ENTER ALL 4 LETTERS'; }
    else if (lobby.code.length < 4) lobby.code += id;
  }
}
const isGuest = () => !!net && net.role === 'guest';
function titleChoice(m) {
  titleMsg = '';
  if (m === 1) startGame(false);
  else if (m === 2) startGame(true);
  else if (m === 3) { lobby = { mode: 'host', code: '', msg: 'CONNECTING...' }; state = 'lobby'; netConnect('host'); }
  else if (m === 4) { lobby = { mode: 'join', code: '', msg: '' }; state = 'lobby'; }
  else if (m === 5) { lvKey = LEVEL_KEYS[(LEVEL_KEYS.indexOf(lvKey) + 1) % LEVEL_KEYS.length]; newGame(false); }   // cycle the level (the title shows it behind the menu)
}
function pickUpgrade(i) { if (isGuest()) relay({ k: 'pick', i }); else chooseUpgrade(i); }
function togglePause() { if (state === 'play') state = 'paused'; else if (state === 'paused') state = 'play'; }
function onKey(k) {
  if (state === 'lobby') {
    if (k === 'escape') lobbyPress('BACK');
    else if (k === 'backspace') lobbyPress('DEL');
    else if (k === 'enter') lobbyPress('GO');
    else if (k.length === 1 && CODE_KEYS.includes(k.toUpperCase())) lobbyPress(k.toUpperCase());
  }
  else if (state === 'title') { if (k === '1' || k === 'enter' || k === ' ') titleChoice(1); else if ('234'.includes(k) && k) titleChoice(+k); else if (k === 'l') titleChoice(5); }
  else if (state === 'over' && G.overT > 0.7 && (k === 'enter' || k === ' ') && !isGuest()) startGame(coop);
  else if (state === 'levelup' && '123'.includes(k) && k) pickUpgrade(+k - 1);
  else if (state === 'play' && k === ' ') pokeNearestKey(0);
  else if (state === 'play' && k === 'f') toggleFire(0);
  else if (state === 'play' && k === 'u' && coop && !net) toggleFire(1);
  else if (state === 'play' && k === 'enter' && coop && !net) pokeNearestKey(1);
  else if (k === 'p' || k === 'escape') doPause();
}
function gamepads() { try { return [...navigator.getGamepads()].filter(Boolean); } catch (e) { return []; } }
// movement + optional explicit aim for one player.
// P1: WASD + mouse.  P2: arrows + IJKL.  Gamepads: first pad -> P2 (or P1 in single player), second pad -> P1.
function readInput(p) {
  const K = k => keys[k] ? 1 : 0;
  let mx, my, aim = null, poke = false, toggle = false;
  const solo = !coop || !!net;
  if (p.scheme === 0) {
    mx = K('d') - K('a'); my = K('s') - K('w');
    if (solo) { mx += K('arrowright') - K('arrowleft'); my += K('arrowdown') - K('arrowup'); }
  } else {
    mx = K('arrowright') - K('arrowleft'); my = K('arrowdown') - K('arrowup');
    const ax = K('l') - K('j'), ay = K('k') - K('i');
    if (ax || ay) aim = Math.atan2(ay, ax);
  }
  const pad = gamepads()[solo ? 0 : (p.scheme === 1 ? 0 : 1)];
  if (pad) {
    const dz = v => Math.abs(v) < 0.2 ? 0 : v;
    mx += dz(pad.axes[0] || 0); my += dz(pad.axes[1] || 0);
    const down = !!(pad.buttons[0] && pad.buttons[0].pressed);
    poke = down && !p.padDown; p.padDown = down;
    const down2 = !!(pad.buttons[1] && pad.buttons[1].pressed);
    toggle = down2 && !p.padDown2; p.padDown2 = down2;   // button B / circle toggles shooting   // button A / cross pokes the nearest weak spot
    const rx = dz(pad.axes[2] || 0), ry = dz(pad.axes[3] || 0);
    if (rx || ry) aim = Math.atan2(ry, rx);
  }
  if (touchUI && p.scheme === 0) {
    const m = stickVec(touch.move, 0.12), a = stickVec(touch.aim, 0.3);
    if (m) { mx += m.x; my += m.y; }
    if (a && a.l > 0) aim = Math.atan2(a.y, a.x);
  }
  return { mx, my, aim, poke, toggle };
}

// ---------------------------------------------------------------- state
let state = 'title';
let G, S, players, organs, choices = [], cam = { x: 0, y: 0 };

const UPGRADES = [
  { id: 'aura',   name: 'ANTISEPTIC AURA',  desc: ['HURTS VIRUSES', 'AROUND YOU'] },
  { id: 'orbit',  name: 'PLATELET ORBIT',   desc: ['PLATELETS CIRCLE', 'YOU AND SMASH'] },
  { id: 'shoot',  name: 'ANTIBODY SHOT',    desc: ['UNLOCKS SHOOTING', 'AT NEARBY VIRUSES'], max: 1 },
  { id: 'split',  name: 'MITOSIS',          desc: ['SPLIT OFF CHILD', 'ALLIES REGULARLY'] },
  { id: 'rate',   name: 'RAPID ANTIBODIES', desc: ['SHOOT FASTER'], needs: 'shoot' },
  { id: 'multi',  name: 'SPLIT ANTIBODY',   desc: ['+1 SHOT PER', 'VOLLEY'], needs: 'shoot' },
  { id: 'dmg',    name: 'STRONG ANTIBODY',  desc: ['SHOTS HIT HARDER'], needs: 'shoot' },
  { id: 'speed',  name: 'SWIFT CELL',       desc: ['RUN FASTER'] },
  { id: 'magnet', name: 'CYTOKINE PULL',    desc: ['PULL XP FROM', 'FURTHER AWAY'] },
  { id: 'regen',  name: 'IMMUNE MEMORY',    desc: ['SHAKE OFF', 'INFECTION FASTER'] },
  { id: 'reach',  name: 'LONG TAIL',        desc: ['POKE WEAK SPOTS', 'FROM FURTHER AWAY'] },
];
const MAX_UP = 5;
const PCOL = ['#8fd0ff', '#ffc070'];   // per-player UI colours

const mkPlayer = (idx, x, y) => ({ fx: { speed: 0, slow: 0, shield: 0, poke: 0, bloat: 0 }, stuckT: 0, slimeImm: 0, mass: 1, splitT: 0, splitting: 0, splitBase: 0, kx: 0, ky: 0, kickT: 0, autoFire: true, padDown2: false, tail: null, tailG: null, pokeCd: 0, padDown: false, idx, x, y, vx: 0, vy: 0, infection: 0, hitT: 9, bob: 0, aim: 0, flash: 0,
  scheme: idx, remote: false, netInp: null, fireCd: 0, orbitA: idx * Math.PI, auraT: 0, down: false, reviveT: 0, inp: { mx: 0, my: 0, aim: null } });

function newGame(co) {
  coop = !!co;
  G = { fix: [], phase: 1, suffT: 0, sabT: 14, mucT: 12, coughT: 20, cough: null, lowWarn: false, slimes: [], globs: [], beams: [], pills: [], pillT: rand(12, 20), vacuumT: 0, tips: [], t: 0, kills: 0, conv: 0, units: [], projs: [], gems: [], parts: [], nextId: 1,
        spawnT: 2, nextSwarm: 40, msg: '', msgT: 0, shake: 0, overT: 0, result: '', reason: '' };
  // team-wide progression: one level, one XP bar, one set of upgrades shared by everybody
  S = { level: 1, xp: 0, next: 6, res: 0, scale: 1, speed: 72, fireRate: 3, shots: 1, dmg: 12, magnet: 36, regen: 1, reach: 52, shoot: false, up: {} };
  players = coop ? [mkPlayer(0, CFG.W / 2 - 16, 600), mkPlayer(1, CFG.W / 2 + 16, 600)] : [mkPlayer(0, CFG.W / 2, 600)];
  organs = lvKey !== 'classic' ? [] : ORGANS.map((d, i) => ({ ...d, i, team: 'i', hp: 150, maxHp: 150, r: 18, weakA: rand(0, 6.28),
    weakS: rand(0.25, 0.45), arc: 0.28, spawnT: 0, spawnMax: 0, cvT: 0, flash: 0 }));
  organs.forEach(o => { o.spawnT = o.spawnMax = rand(6, 12); });
  G.fix = (lvl().sacs || []).map(([x, y], i) => ({ fix: true, i, x, y, r: 15, st: 0, cd: 0, weakA: rand(0, 6.283), weakS: rand(0.3, 0.5) }));
  if (lvl().intro) say(lvl().intro);
  updateCam();
}
function startGame(co) {
  newGame(co);
  if (net && net.role === 'host') players[1].remote = true;
  state = 'play'; sfx('start', 300, 0.25, 'square', 0.04, 400);
}
const alivePlayers = () => players.filter(p => !p.down);
function nearestPlayer(u) {
  let best = null, bd = 1e9;
  for (const p of players) if (!p.down) { const d = dist(u, p); if (d < bd) { bd = d; best = p; } }
  return best;
}
function updateCam() {
  if (!players.length) return;
  const a = alivePlayers(), ps = a.length ? a : players;
  const mx = ps.reduce((t, p) => t + p.x, 0) / ps.length, my = ps.reduce((t, p) => t + p.y, 0) / ps.length;
  cam.x = clamp(Math.round(mx - VIEW_W / 2), 0, Math.max(0, CFG.W - VIEW_W));
  cam.y = clamp(Math.round(my - VIEW_H / 2), 0, Math.max(0, CFG.H - VIEW_H));
}

function say(text) { G.msg = text; G.msgT = 2.6; }

// ---------------------------------------------------------------- units
function addUnit(team, type, x, y) {
  const T = TYPES[type], hpm = team === 'v' ? 1 + G.t / 300 : 1;
  const u = { id: G.nextId++, team, type, x, y, vx: 0, vy: 0, r: T.r, hp: T.hp * hpm, maxHp: T.hp * hpm,
    speed: T.speed * rand(0.9, 1.1), dmg: T.dmg, arc: T.arc, weakA: rand(0, 6.28),
    weakS: rand(0.35, 0.8) * (Math.random() < 0.5 ? -1 : 1), atkCd: rand(0, 0.5), born: G.t, stuckT: 0, slimeImm: 0, flash: 0, cvT: 0, convCd: rand(1.5, 5), tail: null,
    tgt: null, think: rand(0, 0.3), dead: false, hitCd: 0 };
  G.units.push(u);
  return u;
}
const count = team => { let n = 0; for (const u of G.units) if (u.team === team && !u.dead) n++; return n; };

function pickType() {
  const r = Math.random();
  if (G.t > 100 && r < 0.15) return 'brute';
  if (G.t > 35 && r < 0.45) return 'runner';
  return 'basic';
}
function spawnVirus(type) {
  if (count('v') >= CFG.MAX_VIRUS) return;
  const a0 = alivePlayers(), c = a0[Math.floor(Math.random() * a0.length)];
  for (let i = 0; i < 6; i++) {
    const a = rand(0, 6.28), d = rand(250, 310);
    const x = clamp(c.x + Math.cos(a) * d, 10, CFG.W - 10), y = clamp(c.y + Math.sin(a) * d, 10, CFG.H - 10);
    if (nearestPlayer({ x, y }) && dist({ x, y }, nearestPlayer({ x, y })) > 200 || i === 5) { addUnit('v', type || pickType(), x, y); return; }
  }
}

function burst(x, y, col, n = 10, sp = 60) {
  if (evq) evq.push(['b', Math.round(x), Math.round(y), col, n, sp]);
  for (let i = 0; i < n; i++) {
    const a = rand(0, 6.28), s = rand(sp * 0.4, sp);
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.25, 0.55), max: 0.55, col, sz: Math.random() < 0.3 ? 2 : 1 });
  }
}
function dropGem(x, y, v) { if (G.gems.length < 300) G.gems.push({ x: x + rand(-3, 3), y: y + rand(-3, 3), v, ph: rand(0, 6) }); }

function kill(u) {
  if (u.dead) return;
  u.dead = true;
  if (u.team === 'v') {
    G.kills++; dropGem(u.x, u.y, TYPES[u.type].xp);
    burst(u.x, u.y, TYPES[u.type].col, 8); sfx('kill', 180, 0.08, 'square', 0.02, -80);
  } else burst(u.x, u.y, '#8fd0ff', 8);
}
function damageUnit(u, d) { u.hp -= d; u.flash = 0.1; if (u.hp <= 0) kill(u); }

function convert(u) {
  if (u.team === 'v') {
    if (count('i') >= CFG.MAX_ALLY) { kill(u); return; }
    u.team = 'i'; G.conv++;
    dropGem(u.x, u.y, TYPES[u.type].xp + 1);
    burst(u.x, u.y, '#7fe8ff', 16, 80); sfx('conv', 500, 0.18, 'sine', 0.05, 500);
  } else {
    u.team = 'v';
    burst(u.x, u.y, '#9ae05a', 14, 70); sfx('inf', 300, 0.18, 'sawtooth', 0.03, -200);
  }
  u.hp = u.maxHp * 0.7; u.cvT = 1.2; u.flash = 0.25; u.tgt = null; u.think = 0; u.convCd = rand(4, 6); u.tail = null;
}
function convertOrgan(o) {
  o.team = o.team === 'i' ? 'v' : 'i';
  o.hp = o.team === 'v' ? 100 : 80; o.cvT = 2; o.exposed = false; o.stunT = 0; o.flash = 0.3;
  o.spawnT = o.spawnMax = o.team === 'v' ? 2 : 10;
  burst(o.x, o.y, o.team === 'v' ? '#9ae05a' : '#7fe8ff', 30, 90);
  G.shake = 4;
  say(o.team === 'v' ? o.name + ' INFECTED!' : o.name + ' CLEANSED!');
  sfx('organ', o.team === 'v' ? 120 : 400, 0.35, o.team === 'v' ? 'sawtooth' : 'sine', 0.05, o.team === 'v' ? -60 : 400);
  if (organs.every(x => x.team === 'v')) say('ALL ORGANS LOST! RESCUE ONE!');
}

// ---------------------------------------------------------------- upgrades / xp
function gainXp(v) { S.xp += v; checkLevel(); }
function checkLevel() {
  if (state !== 'play' || S.xp < S.next) return;
  S.xp -= S.next; S.level++;
  S.next = Math.round(4 + S.level * 4.5);
  S.res = Math.min(0.55, 1 - Math.pow(0.94, S.level - 1));   // capped: you can never become immune
  S.scale = Math.min(2.4, 1 + 0.08 * (S.level - 1));
  for (const p of players) { p.infection = Math.max(0, p.infection - 8); burst(p.x, p.y, '#8fd0ff', 24, 90); }
  const pool = UPGRADES.filter(u => (S.up[u.id] || 0) < (u.max || MAX_UP) && (!u.needs || S[u.needs]));
  choices = pool.sort(() => Math.random() - 0.5).slice(0, 3);
  const first = pool.find(u => u.id === 'shoot');   // the very first level-up always offers the shooting unlock
  if (S.level === 2 && first && !choices.includes(first)) choices[0] = first;
  sfx('lvl', 400, 0.4, 'square', 0.05, 600);
  if (!choices.length) {   // everything maxed: full heal instead of an empty menu
    for (const p of players) p.infection = 0;
    say('LEVEL UP! FULLY HEALED'); checkLevel(); return;
  }
  state = 'levelup';
}
function chooseUpgrade(i) {
  const u = choices[i];
  if (!u) return;
  S.up[u.id] = (S.up[u.id] || 0) + 1;
  if (u.id === 'shoot') S.shoot = true;
  if (u.id === 'rate') S.fireRate *= 1.25;
  if (u.id === 'multi') S.shots++;
  if (u.id === 'dmg') S.dmg *= 1.3;
  if (u.id === 'speed') S.speed *= 1.12;
  if (u.id === 'magnet') S.magnet += 30;
  if (u.id === 'regen') S.regen += 1.5;
  if (u.id === 'reach') S.reach += 14;
  state = 'play';
  sfx('pick', 600, 0.12, 'square', 0.04, 300);
  checkLevel();
}

function endGame(win, reason) {
  if (state === 'over') return;
  state = 'over'; G.overT = 0; G.result = win ? 'win' : 'lose'; G.reason = reason;
  sfx('end', win ? 500 : 200, 0.6, 'square', 0.05, win ? 600 : -120);
}

// ---------------------------------------------------------------- update
let grid = [], gw = 0;
function buildGrid() {
  gw = Math.ceil(CFG.W / CFG.CELL) + 1;
  grid = new Array(gw * (Math.ceil(CFG.H / CFG.CELL) + 1));
  for (const u of G.units) {
    const k = Math.floor(u.y / CFG.CELL) * gw + Math.floor(u.x / CFG.CELL);
    (grid[k] || (grid[k] = [])).push(u);
  }
}
function nearestEnemy(u, rad) {
  const cx = Math.floor(u.x / CFG.CELL), cy = Math.floor(u.y / CFG.CELL);
  let best = null, bd = (rad * CFG.CELL) ** 2;
  for (let oy = -rad; oy <= rad; oy++) for (let ox = -rad; ox <= rad; ox++) {
    const cell = grid[(cy + oy) * gw + cx + ox];
    if (!cell) continue;
    for (const n of cell) {
      if (n.team === u.team || n.dead) continue;
      const d = (n.x - u.x) ** 2 + (n.y - u.y) ** 2;
      if (d < bd) { bd = d; best = n; }
    }
  }
  return best;
}
function nearestFix(u, ok, rad) {
  let best = null, bd = rad;
  for (const f of G.fix) if (ok(f)) { const d = dist(u, f); if (d < bd) { bd = d; best = f; } }
  return best;
}
function chooseTarget(u) {
  if (u.team === 'v') {
    if (u.type === 'saboteur') { const f = nearestFix(u, canBreak, 1e9); if (f) return f; }
    const np = nearestPlayer(u);
    if (np && dist(u, np) < 90) return np;   // a player in the open is the juiciest target
    const e = nearestEnemy(u, 2);
    if (e) return e;
    if (np && dist(u, np) < 150) return np;
    let best = null, bd = 1e9;
    for (const o of organs) if (o.team === 'i') { const d = dist(u, o); if (d < bd) { bd = d; best = o; } }
    return best || np;
  }
  const e = nearestEnemy(u, 3);
  if (e) return e;
  let best = null, bd = 300;
  for (const v of G.units) if (v.team === 'v' && !v.dead) { const d = dist(u, v); if (d < bd) { bd = d; best = v; } }
  if (best) return best;
  bd = 500;
  for (const o of organs) if (o.team === 'v') { const d = dist(u, o); if (d < bd) { bd = d; best = o; } }
  if (best) return best;
  const rf = nearestFix(u, canRepair, 500);
  if (rf) return rf;
  const np = nearestPlayer(u);
  return np && dist(u, np) > 50 ? np : null;
}

// ---- poking: the only way to turn a virus (or cure an organ) is to poke its glowing weak spot with the tail.
// You must be within reach, then click / tap the weak spot (or press the poke key / button for the nearest one).
const reachOf = p => (S.reach + 6 * (S.scale - 1)) * (p && p.fx && p.fx.poke > 0 ? 1.5 : 1);
const isOrgan = t => t.tag !== undefined;
const canRepair = f => f.st > 0;                 // air sacs: players and allies repair them, viruses clog them
const canBreak = f => f.st < 2 && f.cd <= 0;
const spotOf = t => ({ x: t.x + Math.cos(t.weakA) * t.r, y: t.y + Math.sin(t.weakA) * t.r });
function pokeables() {
  const out = [];
  for (const u of G.units) if (u.team === 'v' && !u.dead && (u.cvT || 0) <= 0) out.push(u);
  for (const o of organs) if (o.team === 'v' && (o.cvT || 0) <= 0) out.push(o);
  for (const f of G.fix) if (canRepair(f)) out.push(f);
  return out;
}
function pokeTargetAt(wx, wy, rad) {
  let best = null, bd = rad;
  for (const t of pokeables()) { const sp = spotOf(t), d = Math.hypot(sp.x - wx, sp.y - wy); if (d < bd) { bd = d; best = t; } }
  return best;
}
function pokeNearest(p) {
  let best = null, bd = reachOf(p);
  for (const t of pokeables()) { const sp = spotOf(t), d = Math.hypot(sp.x - p.x, sp.y - p.y); if (d <= bd) { bd = d; best = t; } }
  return best;
}
function tip(x, y, text, col = '#ff9a9a') { G.tips.push({ x, y, text, col, t: 0.9 }); }
function tryPoke(p, t, slack = 1) {
  if (!t || p.down || p.tail || p.pokeCd > 0) return false;
  const sp = spotOf(t);
  if (Math.hypot(sp.x - p.x, sp.y - p.y) > reachOf(p) * slack) { tip(sp.x, sp.y - 6, 'TOO FAR'); sfx('far', 140, 0.08, 'square', 0.03, -40); return false; }
  p.tail = { ref: t, t: 0, hit: false }; p.pokeCd = 0.65 * (p.fx.poke > 0 ? 0.35 : 1);
  sfx('poke', 520, 0.08, 'square', 0.03, 300);
  return true;
}
const TAIL_HIT = 0.28, TAIL_END = 0.58;   // seconds: the tail reaches out, lands (the swap), then retracts
// One animation for every conversion. `a` lashes its tail at the weak spot of `a.tail.ref`; when the tip lands the
// target changes sides. Cancelled if the target moves out of range, dies or changes sides first.
function tailStep(a, dt, maxDist, foeTeam) {
  if (!a.tail) return;
  const tg = a.tail.ref, sp = spotOf(tg);
  a.tail.t += dt;
  const bad = tg.fix ? (foeTeam === 'v' ? !canRepair(tg) : !canBreak(tg)) : (tg.dead || tg.team !== foeTeam);
  if (bad || Math.hypot(sp.x - a.x, sp.y - a.y) > maxDist) { a.tail = null; return; }
  if (!a.tail.hit && a.tail.t >= TAIL_HIT) {
    a.tail.hit = true; burst(sp.x, sp.y, '#fff', 8, 60);
    if (tg.fix) { if (foeTeam === 'v') repairFix(tg); else clogFix(tg); }
    else if (isOrgan(tg)) convertOrgan(tg); else convert(tg);
  }
  if (a.tail && a.tail.t >= TAIL_END) a.tail = null;
}
// ---- mitosis: the player slowly swells, then splits off child allies and is left smaller ("missing mass")
const SPLIT_MIN = 0.78, SPLIT_MAX = 1.28, SPLIT_TIME = 0.45;
function doSplit(p, lv) {
  const n = Math.min(lv, Math.max(0, CFG.MAX_ALLY - count('i')));
  for (let i = 0; i < n; i++) {
    const a = p.splitBase + i / lv * 6.283;
    const c = addUnit('i', 'basic', p.x + Math.cos(a) * 6, p.y + Math.sin(a) * 6);
    c.kx = Math.cos(a) * 130; c.ky = Math.sin(a) * 130; c.kickT = 0.4; c.convCd = rand(3, 6);
  }
  burst(p.x, p.y, '#8fd0ff', 20, 100); G.shake = Math.max(G.shake, 2);
  tip(p.x, p.y - 22, 'SPLIT!', '#8fd0ff'); sfx('split', 220, 0.3, 'sine', 0.05, 500);
}
function mitosisStep(p, dt) {
  const lv = S.up.split || 0;
  if (!lv) { p.mass = 1; p.splitT = 0; p.splitting = 0; return; }
  const cycle = Math.max(10, 26 - 3 * lv);
  if (p.splitting > 0) {   // squash and pinch, then the children pop out
    p.splitting += dt;
    if (p.splitting >= SPLIT_TIME) { doSplit(p, lv); p.splitting = 0; p.splitT = 0; p.mass = SPLIT_MIN; }
    return;
  }
  p.splitT += dt;
  p.mass = SPLIT_MIN + (SPLIT_MAX - SPLIT_MIN) * Math.min(1, p.splitT / cycle);
  if (p.splitT >= cycle) { p.splitting = 0.0001; p.splitBase = rand(0, 6.283); sfx('split', 160, 0.4, 'sine', 0.04, 200); }
}
function pokeStep(p, dt) { p.pokeCd -= dt; tailStep(p, dt, reachOf(p) * 1.6, 'v'); }
function repairFix(f) {
  f.st = Math.max(0, f.st - 1); f.cd = 8; G.fixed = (G.fixed || 0) + 1;   // clogging is paused for a while after a repair
  burst(f.x, f.y, '#7fe8ff', 14, 70); tip(f.x, f.y - 20, f.st ? 'BETTER' : 'OPEN!', '#7fffd0');
  dropGem(f.x, f.y, 2); sfx('conv', 600, 0.15, 'sine', 0.04, 400);
}
function clogFix(f) {
  f.st = Math.min(2, f.st + 1); f.cd = 3;
  burst(f.x, f.y, '#9ae05a', 12, 60); tip(f.x, f.y - 20, f.st > 1 ? 'COLLAPSED!' : 'CLOGGED!', '#ffd060');
  sfx('inf', 220, 0.15, 'sawtooth', 0.03, -120);
}
function hurtOrgan(o, d) {
  o.hp -= d; o.flash = 0.1;
  if (o.hp > 0) return;
  if (o.team === 'v') { o.hp = 100; o.stunT = 10; tip(o.x, o.y - 26, 'STUNNED', '#ffd88a'); }   // can't be cured by damage, only stunned
  else { o.hp = 0; o.exposed = true; }                                                           // worn down: a virus can now infect it
}

// ---------------------------------------------------------------- hazards (infected organs) and medicine loot
const sizeOf = p => p.mass * (p.fx.bloat > 0 ? 1.35 : 1);
const oxy = () => { if (!G.fix.length) return 1; let s = 0; for (const f of G.fix) s += f.st === 0 ? 1 : f.st === 1 ? 0.5 : 0; return s / G.fix.length; };   // lung level: how open the air sacs are
const spdMul = p => (p.fx.speed > 0 ? 1.5 : 1) * (p.fx.slow > 0 ? 0.5 : 1) * (p.fx.bloat > 0 ? 0.8 : 1) * (G.fix.length ? 0.65 + 0.35 * oxy() : 1);
const organNamed = n => organs.find(o => o.name === n);

// Anything (player, ally, virus) that touches slime is frozen in place for 3s, then can't be re-stuck for a moment.
function slimeStick(e, dt, isPlayer) {
  if (e.stuckT > 0) { e.stuckT -= dt; if (e.stuckT <= 0) e.slimeImm = 1.2; return; }
  e.slimeImm -= dt;
  if (e.slimeImm > 0) return;
  const r = isPlayer ? 6 * S.scale : e.r;
  for (const sl of G.slimes) if (Math.hypot(e.x - sl.x, e.y - sl.y) < sl.r + r * 0.6) {
    e.stuckT = 3; burst(e.x, e.y, '#9ae05a', 6, 40);
    if (isPlayer) { tip(e.x, e.y - 16, 'STUCK!', '#9ae05a'); sfx('stuck', 160, 0.15, 'sawtooth', 0.03, -60); }
    return;
  }
}

const PILLS = [
  { w: 2, name: 'ANTIBIOTIC', msg: 'INFECTION -40', good: true, apply: p => { p.infection = Math.max(0, p.infection - 40); } },
  { w: 2, name: 'ADRENALINE', msg: 'SPEED UP', good: true, apply: p => { p.fx.speed = 10; } },
  { w: 2, name: 'VITAMIN C', msg: 'HALF DAMAGE', good: true, apply: p => { p.fx.shield = 12; } },
  { w: 2, name: 'STIMULANT', msg: 'FAST POKES, LONG REACH', good: true, apply: p => { p.fx.poke = 12; } },
  { w: 1.5, name: 'PROBIOTICS', msg: 'FRIENDLY CELLS APPEAR', good: true, apply: p => {
    for (let i = 0; i < 3 && count('i') < CFG.MAX_ALLY; i++) {
      const a = rand(0, 6.283), c = addUnit('i', 'basic', p.x + Math.cos(a) * 8, p.y + Math.sin(a) * 8);
      c.kx = Math.cos(a) * 110; c.ky = Math.sin(a) * 110; c.kickT = 0.4;
    }
  } },
  { w: 1.5, name: 'XP MAGNET', msg: 'XP COMES TO YOU', good: true, apply: () => { G.vacuumT = 5; } },
  { w: 1, name: 'PLACEBO', msg: 'JUST SUGAR...', good: false, apply: () => {} },
  { w: 1.2, name: 'SEDATIVE', msg: 'YOU FEEL SLOW', good: false, apply: p => { p.fx.slow = 8; } },
  { w: 1.2, name: 'EXPIRED PILL', msg: 'INFECTION +15', good: false, apply: p => { p.infection += 15; p.hitT = 0; } },
  { w: 1, name: 'GROWTH HORMONE', msg: 'BIGGER BUT SLOWER', good: false, apply: p => { p.fx.bloat = 10; } },
];
function takePill(p) {
  let r = Math.random() * PILLS.reduce((t, x) => t + x.w, 0), pill = PILLS[0];
  for (const x of PILLS) { r -= x.w; if (r <= 0) { pill = x; break; } }
  pill.apply(p);
  say(pill.name + ': ' + pill.msg);
  tip(p.x, p.y - 18, pill.name, pill.good ? '#7fffd0' : '#ffd88a');
  burst(p.x, p.y, pill.good ? '#7fffd0' : '#ffd88a', 12, 70); sfx('pill', pill.good ? 700 : 260, 0.2, 'sine', 0.04, pill.good ? 500 : -80);
}

function hazardsStep(dt, alive) {
  const lung = organNamed('LUNGS'), heart = organNamed('HEART'), pickP = () => alive[Math.floor(Math.random() * alive.length)];
  // ---- infected lungs lob slime
  if (lung && lung.team === 'v' && lung.stunT <= 0 && alive.length) {
    lung.spitT = (lung.spitT == null ? 4 : lung.spitT) - dt;
    if (lung.spitT <= 0) {
      lung.spitT = Math.max(3.5, 7 - G.t / 90) * rand(0.8, 1.2);
      const n = 1 + (G.t > 120 ? 1 : 0) + (G.t > 240 ? 1 : 0) + (players.length > 1 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        let tx, ty;
        if (Math.random() < 0.5) { const p = pickP(); tx = p.x + rand(-40, 40); ty = p.y + rand(-40, 40); }
        else { const a = rand(0, 6.283), d = rand(60, 240); tx = lung.x + Math.cos(a) * d; ty = lung.y + Math.sin(a) * d; }
        G.globs.push({ sx: lung.x, sy: lung.y, tx: clamp(tx, 20, CFG.W - 20), ty: clamp(ty, 20, CFG.H - 20), t: 0, dur: 1 + rand(0, 0.3) });
      }
      burst(lung.x, lung.y, '#9ae05a', 10, 60); sfx('spit', 200, 0.2, 'sawtooth', 0.03, -80);
    }
  }
  for (const g of G.globs) {
    g.t += dt;
    if (g.t >= g.dur) { g.dead = true; G.slimes.push({ x: g.tx, y: g.ty, r: rand(13, 18), life: 14 }); burst(g.tx, g.ty, '#9ae05a', 10, 50); sfx('splat', 120, 0.12, 'square', 0.03, -40); }
  }
  G.globs = G.globs.filter(g => !g.dead);
  for (const sl of G.slimes) sl.life -= dt;
  G.slimes = G.slimes.filter(sl => sl.life > 0);
  if (G.slimes.length > 40) G.slimes.splice(0, G.slimes.length - 40);

  // ---- infected heart fires fever rays in random directions; a warning lane shows where they will pass
  if (heart && heart.team === 'v' && heart.stunT <= 0 && alive.length) {
    heart.rayT = (heart.rayT == null ? 6 : heart.rayT) - dt;
    if (heart.rayT <= 0) {
      heart.rayT = Math.max(4.5, 8.5 - G.t / 100) * rand(0.85, 1.15);
      const n = 1 + (G.t > 150 ? 1 : 0) + (G.t > 270 ? 1 : 0), warn = G.t > 200 ? 1.1 : 1.4;
      for (let i = 0; i < n; i++) {
        let a = rand(0, 6.283);
        if (Math.random() < 0.25) { const p = pickP(); a = Math.atan2(p.y - heart.y, p.x - heart.x); }   // now and then one is aimed
        G.beams.push({ x: heart.x, y: heart.y, a, len: 360, w: 14, t: 0, warn, fire: 0.7, fired: false });
      }
      say('FEVER RAYS! MOVE AWAY FROM THE STRIPES'); sfx('charge', 120, warn, 'sawtooth', 0.03, 300);
    }
  }
  for (const b of G.beams) {
    b.t += dt;
    if (b.t < b.warn) continue;
    if (!b.fired) { b.fired = true; sfx('ray', 90, 0.5, 'sawtooth', 0.05, 160); G.shake = Math.max(G.shake, 3); }
    const ca = Math.cos(b.a), sa = Math.sin(b.a);
    const hit = (x, y, r) => { const dx = x - b.x, dy = y - b.y, along = dx * ca + dy * sa; return along >= 0 && along <= b.len && Math.abs(-dx * sa + dy * ca) < b.w / 2 + r; };
    for (const u of G.units) if (!u.dead && hit(u.x, u.y, u.r)) damageUnit(u, 70 * dt);
    for (const p of alive) if (hit(p.x, p.y, 5 * S.scale)) { p.infection += 32 * dt * (p.fx.shield > 0 ? 0.5 : 1); p.hitT = 0; p.flash = 0.1; }
    if (Math.random() < 0.7) { const d = rand(10, b.len); G.parts.push({ x: b.x + ca * d, y: b.y + sa * d, vx: rand(-20, 20), vy: rand(-30, -5), life: 0.4, max: 0.4, col: Math.random() < 0.5 ? '#ffb040' : '#ff6a1a', sz: 2 }); }
  }
  G.beams = G.beams.filter(b => b.t < b.warn + b.fire);

  // ---- medicine loot: random pills appear; the effect is a surprise (mostly helpful, sometimes not)
  G.vacuumT = Math.max(0, G.vacuumT - dt);
  G.pillT -= dt;
  if (G.pillT <= 0 && alive.length) {
    G.pillT = rand(18, 30);
    if (G.pills.length < 3) {
      const c = pickP(), a = rand(0, 6.283), d = rand(70, 200);
      G.pills.push({ x: clamp(c.x + Math.cos(a) * d, 20, CFG.W - 20), y: clamp(c.y + Math.sin(a) * d, 20, CFG.H - 20), life: 25 });
    }
  }
  for (const pl of G.pills) {
    pl.life -= dt;
    for (const p of alive) if (Math.hypot(p.x - pl.x, p.y - pl.y) < 10 + 6 * S.scale) { takePill(p); pl.life = 0; break; }
  }
  G.pills = G.pills.filter(pl => pl.life > 0);
}

// ---------------------------------------------------------------- lung level: breathing, clogging, mucus, coughs
// Inhale pulls everything toward the trachea (up), exhale blows it back down. Saboteur viruses clog the air sacs; the
// fewer open sacs, the less oxygen (slower, less recovery). Escalates in three phases.
function breathY() {
  const ph = (G.t % 10) / 10;
  if (ph < 0.4) return -Math.sin(ph / 0.4 * Math.PI);
  if (ph >= 0.5 && ph < 0.9) return Math.sin((ph - 0.5) / 0.4 * Math.PI);
  return 0;
}
const TRACHEA = { x: 600, y: 30 };
function lungStep(dt, alive) {
  if (!G.fix.length) return;
  const push = 55 * breathY();
  for (const p of alive) if (p.stuckT <= 0) p.y = clamp(p.y + push * dt, 10, CFG.H - 10);
  for (const u of G.units) if (u.stuckT <= 0) u.y = clamp(u.y + push * 0.7 * dt, 6, CFG.H - 6);
  for (const f of G.fix) { f.weakA += f.weakS * dt; f.cd -= dt; }
  const O = oxy(), phase = G.t > 200 ? 3 : G.t > 90 ? 2 : 1;
  if (phase !== G.phase) {
    G.phase = phase; say(phase === 2 ? 'SICK SACS SPIT FASTER! AVOID SLIME' : 'COUGHING FITS! BRACE YOURSELF'); sfx('charge', 140, 0.6, 'sawtooth', 0.03, 200);
  }
  G.sabT -= dt;   // saboteurs
  if (G.sabT <= 0) {
    G.sabT = Math.max(6, 15 - G.t / 40) * rand(0.8, 1.2) / (players.length > 1 ? 1.4 : 1);
    const n = 1 + (G.t > 150 ? 1 : 0);
    for (let i = 0; i < n; i++) spawnVirus('saboteur');
    if (G.t < 60 || Math.random() < 0.3) say('SABOTEURS! THEY CLOG THE AIR SACS');
  }
  // sick sacs behave like the infected lungs of the classic level: they lob slime and breed little slime enemies
  for (const f of G.fix) {
    if (f.st === 0) { f.spawnMax = 0; continue; }
    const fast = (phase >= 2 ? 0.75 : 1) * (phase >= 3 ? 0.85 : 1);
    f.spitT = (f.spitT == null ? rand(2, 6) : f.spitT) - dt;
    if (f.spitT <= 0) {
      f.spitT = (f.st === 2 ? 6.5 : 11) * fast * rand(0.8, 1.2);
      if (G.globs.length < 8) {
        let tx, ty;
        if (Math.random() < 0.5) { const p = alive[Math.floor(Math.random() * alive.length)]; tx = p.x + rand(-40, 40); ty = p.y + rand(-40, 40); }
        else { const a = rand(0, 6.283), d = rand(60, 200); tx = f.x + Math.cos(a) * d; ty = f.y + Math.sin(a) * d; }
        G.globs.push({ sx: f.x, sy: f.y, tx: clamp(tx, 20, CFG.W - 20), ty: clamp(ty, 20, CFG.H - 20), t: 0, dur: 1 + rand(0, 0.3) });
        burst(f.x, f.y, '#9ae05a', 8, 50); sfx('spit', 200, 0.2, 'sawtooth', 0.03, -80);
      }
    }
    f.spawnMax = (f.st === 2 ? 8 : 14) * fast;
    f.spawnT = (f.spawnT == null ? rand(3, f.spawnMax) : f.spawnT) - dt;
    if (f.spawnT <= 0) {
      f.spawnT = f.spawnMax;
      if (count('v') < CFG.MAX_VIRUS) { const a = rand(0, 6.283); addUnit('v', 'slimeling', f.x + Math.cos(a) * 20, f.y + Math.sin(a) * 20); burst(f.x, f.y, '#8fdc4a', 8, 50); }
    }
  }
  if (phase >= 3 && !G.cough) {   // coughs: a telegraphed shockwave from the trachea
    G.coughT -= dt;
    if (G.coughT <= 0) { G.coughT = rand(20, 28); G.cough = { t: 0, warn: 1.6 }; say('COUGH! HOLD ON'); sfx('charge', 100, 1.6, 'sawtooth', 0.03, 260); }
  }
  if (G.cough) {
    const c = G.cough, was = c.t; c.t += dt;
    if (was < c.warn && c.t >= c.warn) {
      G.shake = Math.max(G.shake, 6); sfx('ray', 80, 0.5, 'sawtooth', 0.05, 160);
      const kick = e => { const dx = e.x - TRACHEA.x, dy = e.y - TRACHEA.y, d = Math.hypot(dx, dy) || 1; e.kx = dx / d * 300; e.ky = dy / d * 300; e.kickT = 0.5; };
      for (const p of alive) kick(p);
      for (const u of G.units) kick(u);
    }
    if (c.t > c.warn + 0.7) G.cough = null;
  }
  if (O < 0.3 && !G.lowWarn) { G.lowWarn = true; say('OXYGEN LOW! POKE THE SACS OPEN'); } else if (O > 0.5) G.lowWarn = false;
  if (O < 0.15) { G.suffT += dt; if (G.suffT >= 15) endGame(false, 'THE LUNGS COLLAPSED'); }
  else G.suffT = Math.max(0, G.suffT - dt * 2);
}

function strikeUnit(a, b) { a.atkCd = 0.7 + Math.random() * 0.2; damageUnit(b, a.dmg); }
function strikeOrgan(a, o) { a.atkCd = 0.8; hurtOrgan(o, a.dmg * 0.4); }

// Units (viruses AND allies) actively try to turn the other side: when their cooldown is up they lash their tail at the
// closest enemy weak spot in reach. The cooldown keeps it from snowballing. Worn-down ("exposed") organs skip the wait.
const UNIT_REACH = 46;
function lashTarget(u, organsOnly) {
  const foe = u.team === 'v' ? 'i' : 'v';
  let best = null, bd = UNIT_REACH;
  const test = n => { const sp = spotOf(n), d = Math.hypot(sp.x - u.x, sp.y - u.y); if (d < bd) { bd = d; best = n; } };
  if (!organsOnly) {
    const cx = Math.floor(u.x / CFG.CELL), cy = Math.floor(u.y / CFG.CELL);
    for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) {
      const cell = grid[(cy + oy) * gw + cx + ox];
      if (cell) for (const n of cell) if (n.team === foe && !n.dead && n.cvT <= 0) test(n);
    }
  }
  for (const o of organs) if (o.team === foe && o.cvT <= 0 && (!organsOnly || o.exposed)) test(o);
  for (const f of G.fix) if (foe === 'i' ? canBreak(f) && u.type === 'saboteur' : canRepair(f)) test(f);   // only saboteurs clog air sacs; allies repair them
  return best;
}

function update(dt) {
  G.t += dt;
  if (G.t >= lvl().time) { endGame(true, lvl().win); return; }
  G.msgT -= dt; G.shake = Math.max(0, G.shake - 20 * dt);
  for (const t of G.tips) t.t -= dt;
  G.tips = G.tips.filter(t => t.t > 0);

  const pr = 6 * S.scale;

  // ---- players: movement, recovery, revive
  for (const p of players) {
    p.hitT += dt; p.flash -= dt;
    for (const k in p.fx) if (p.fx[k] > 0) p.fx[k] = Math.max(0, p.fx[k] - dt);
    if (p.down) p.tail = null;
    if (p.down) {   // an infected player lies still until a teammate stands next to them for 3s
      const helper = players.find(q => !q.down && dist(q, p) < 26);
      p.reviveT = helper ? p.reviveT + dt : Math.max(0, p.reviveT - dt);
      if (p.reviveT >= 3) {
        p.down = false; p.reviveT = 0; p.infection = 40; p.hitT = 0;
        burst(p.x, p.y, '#7fe8ff', 24, 90); say('P' + (p.idx + 1) + ' IS BACK!'); sfx('organ', 400, 0.35, 'sine', 0.05, 400);
      }
      continue;
    }
    const inp = p.inp = p.remote ? (p.netInp || { mx: 0, my: 0, aim: null }) : readInput(p);
    const l = Math.hypot(inp.mx, inp.my);
    if (l > 1) { inp.mx /= l; inp.my /= l; }
    if (inp.poke) tryPoke(p, pokeNearest(p));
    if (inp.toggle) toggleFire(p.idx);
    pokeStep(p, dt);
    mitosisStep(p, dt);
    const k = Math.min(1, 10 * dt);
    const spd = S.speed * spdMul(p);
    if (p.stuckT > 0) { inp.mx = inp.my = 0; p.vx = p.vy = 0; }   // frozen in slime
    p.vx += (inp.mx * spd - p.vx) * k; p.vy += (inp.my * spd - p.vy) * k;
    p.x = clamp(p.x + p.vx * dt, 10, CFG.W - 10); p.y = clamp(p.y + p.vy * dt, 10, CFG.H - 10);
    if (p.kickT > 0) { p.kickT -= dt; const f = p.kickT / 0.4; p.x = clamp(p.x + p.kx * f * dt, 10, CFG.W - 10); p.y = clamp(p.y + p.ky * f * dt, 10, CFG.H - 10); }
    p.bob += Math.hypot(p.vx, p.vy) * dt * 0.25;
    slimeStick(p, dt, true);
    if (p.hitT > 4) p.infection = Math.max(0, p.infection - S.regen * 1.2 * oxy() * dt);   // you only shake it off after 4s without a hit
    for (const o of organs) if (o.team === 'i' && Math.hypot(p.x - o.x, p.y - o.y) < 60) p.infection = Math.max(0, p.infection - 2.5 * dt);
    if (p.infection >= 100) {
      p.infection = 100; p.down = true; p.reviveT = 0; p.vx = p.vy = 0;
      burst(p.x, p.y, '#9ae05a', 20, 80); G.shake = 4; sfx('inf', 200, 0.4, 'sawtooth', 0.04, -120);
      if (players.length > 1) say('P' + (p.idx + 1) + ' INFECTED! REVIVE THEM');
    }
  }
  const alive = alivePlayers();
  if (!alive.length) { endGame(false, players.length > 1 ? 'BOTH PLAYERS WERE INFECTED' : 'YOU BECAME A VIRUS'); return; }
  updateCam();   // shared camera; players can't leave the screen
  for (const p of alive) { p.x = clamp(p.x, cam.x + 8, cam.x + VIEW_W - 8); p.y = clamp(p.y, cam.y + 8, cam.y + VIEW_H - 8); }

  // ---- aim + auto fire
  for (const p of alive) {
    let ne = null, ned = 320;
    for (const u of G.units) if (u.team === 'v') { const d = dist(u, p); if (d < ned) { ned = d; ne = u; } }
    for (const o of organs) if (o.team === 'v') { const d = dist(o, p); if (d < ned) { ned = d; ne = o; } }
    if (p.inp.aim !== null) p.aim = p.inp.aim;
    else if (p.scheme === 0 && !p.remote && mouse.moved) p.aim = Math.atan2(mouse.sy + cam.y - p.y, mouse.sx + cam.x - p.x);
    else if (ne) p.aim = Math.atan2(ne.y - p.y, ne.x - p.x);
    p.fireCd -= dt;
    if (p.fireCd <= 0 && ne && p.autoFire && S.shoot) {
      p.fireCd = 1 / S.fireRate;
      for (let i = 0; i < S.shots; i++) {
        const a = p.aim + (i - (S.shots - 1) / 2) * 0.17;
        G.projs.push({ x: p.x + Math.cos(a) * 8, y: p.y + Math.sin(a) * 8, vx: Math.cos(a) * 270, vy: Math.sin(a) * 270, life: 0.8, dmg: S.dmg });
      }
      sfx('shot', 700, 0.05, 'square', 0.012, -300);
    }
  }

  // ---- spawning
  G.spawnT -= dt;
  if (G.spawnT <= 0) {
    const lost = organs.filter(o => o.team === 'v').length;   // every lost organ makes waves bigger
    G.spawnT = Math.max(0.3, 1.9 - G.t * 0.004) / (1 + 0.3 * lost) / (players.length > 1 ? 1.5 : 1) * (G.fix.length ? 1.3 : 1);
    const n = 1 + Math.floor(G.t / 90) + (lost >= 3 ? 1 : 0);
    for (let i = 0; i < n; i++) spawnVirus();
  }
  if (G.t >= G.nextSwarm) {
    G.nextSwarm += 45; say('SWARM INCOMING!');
    const c = alive[Math.floor(Math.random() * alive.length)];
    const a = rand(0, 6.28), n = 8 + Math.floor(G.t / 10) + (players.length > 1 ? 6 : 0);
    for (let i = 0; i < n; i++) {
      if (count('v') >= CFG.MAX_VIRUS) break;
      addUnit('v', pickType(), clamp(c.x + Math.cos(a) * 280 + rand(-30, 30), 10, CFG.W - 10), clamp(c.y + Math.sin(a) * 280 + rand(-30, 30), 10, CFG.H - 10));
    }
  }

  // ---- organs
  for (const o of organs) {
    o.weakA += o.weakS * dt; o.cvT -= dt; o.flash -= dt; o.spawnT -= dt; o.stunT = (o.stunT || 0) - dt;
    if (o.team === 'i') { // healthy organs regenerate and zap nearby viruses
      o.hp = Math.min(o.maxHp, o.hp + 3 * dt);
      if (o.exposed && o.hp > 30) o.exposed = false;
      o.zapT = (o.zapT || 0) - dt;
      if (o.zapT <= 0) {
        let best = null, bd = 85;
        for (const u of G.units) if (u.team === 'v' && !u.dead) { const d = dist(u, o); if (d < bd) { bd = d; best = u; } }
        if (best) {
          o.zapT = 1.1; damageUnit(best, 7); if (evq) evq.push(['z', Math.round(o.x), Math.round(o.y), Math.round(best.x), Math.round(best.y)]);
          for (let i = 1; i < 6; i++) G.parts.push({ x: o.x + (best.x - o.x) * i / 6, y: o.y + (best.y - o.y) * i / 6, vx: 0, vy: 0, life: 0.15, max: 0.15, col: '#bfe8ff', sz: 1 });
        }
      }
    }
    if (o.spawnT <= 0) {
      if (o.team === 'v') { o.spawnT = o.spawnMax = Math.max(4, 9 - G.t / 100); const a = rand(0, 6.28); if (o.stunT <= 0 && count('v') < CFG.MAX_VIRUS) addUnit('v', 'basic', o.x + Math.cos(a) * 22, o.y + Math.sin(a) * 22); }
      else { o.spawnT = o.spawnMax = 14; if (count('i') < CFG.MAX_ALLY) { const a = rand(0, 6.28); burst(o.x, o.y, '#7fe8ff', 8); addUnit('i', 'basic', o.x + Math.cos(a) * 22, o.y + Math.sin(a) * 22); } }
    }
  }

  hazardsStep(dt, alive);
  lungStep(dt, alive);

  // ---- units: AI, movement
  buildGrid();
  for (const u of G.units) {
    if (u.dead) continue;
    u.atkCd -= dt; u.flash -= dt; u.cvT -= dt; u.hitCd -= dt; u.think -= dt;
    slimeStick(u, dt, false);
    if (u.tgt && (u.tgt.dead || u.tgt.down || (u.tgt.team && u.tgt.team === u.team) || (u.tgt.fix && !(u.team === 'v' ? canBreak(u.tgt) || u.type === 'saboteur' && u.tgt.st < 2 : canRepair(u.tgt))))) u.tgt = null;
    if (u.think <= 0 || !u.tgt) { u.think = 0.25 + Math.random() * 0.15; u.tgt = chooseTarget(u); }
    let dx = 0, dy = 0;
    if (u.tgt) {
      const d = Math.hypot(u.tgt.x - u.x, u.tgt.y - u.y) || 1;
      dx = (u.tgt.x - u.x) / d; dy = (u.tgt.y - u.y) / d;
      const w = Math.sin(G.t * 3 + u.id) * 0.3;
      const nx = dx - dy * w, ny = dy + dx * w; dx = nx; dy = ny;
    }
    u.convCd -= dt;
    if (!u.tail && (u.convCd <= 0 || u.team === 'v')) {
      const t = lashTarget(u, u.convCd > 0);
      if (t) { u.tail = { ref: t, t: 0, hit: false }; u.convCd = rand(5, 8); }
    }
    if (u.tail) { tailStep(u, dt, 58, u.team === 'v' ? 'i' : 'v'); dx = 0; dy = 0; }   // standing still while the tail lashes
    if (u.stuckT > 0) { dx = 0; dy = 0; u.vx = u.vy = 0; }       // frozen in slime
    const kk = Math.min(1, 6 * dt);
    u.vx += (dx * u.speed - u.vx) * kk; u.vy += (dy * u.speed - u.vy) * kk;
    u.x = clamp(u.x + u.vx * dt, 6, CFG.W - 6); u.y = clamp(u.y + u.vy * dt, 6, CFG.H - 6);
    if (u.kickT > 0) { u.kickT -= dt; const f = u.kickT / 0.4; u.x += u.kx * f * dt; u.y += u.ky * f * dt; }
    // weak spot sits on the back, opposite to the heading
    if (Math.hypot(u.vx, u.vy) > 4) {
      let df = Math.atan2(-u.vy, -u.vx) - u.weakA;
      while (df > Math.PI) df -= Math.PI * 2;
      while (df < -Math.PI) df += Math.PI * 2;
      u.weakA += df * Math.min(1, 8 * dt);
    }
  }

  // ---- units: pair collisions & combat
  for (const u of G.units) {
    if (u.dead) continue;
    const cx = Math.floor(u.x / CFG.CELL), cy = Math.floor(u.y / CFG.CELL);
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const cell = grid[(cy + oy) * gw + cx + ox];
      if (!cell) continue;
      for (const n of cell) {
        if (n.id <= u.id || n.dead || u.dead) continue;
        const ddx = n.x - u.x, ddy = n.y - u.y, d = Math.hypot(ddx, ddy) || 0.01, minD = u.r + n.r;
        if (d >= minD) continue;
        const push = (minD - d) * (u.team === n.team ? 0.4 : 0.2) / d;
        u.x -= ddx * push; u.y -= ddy * push; n.x += ddx * push; n.y += ddy * push;
        if (u.team !== n.team) {
          if (u.atkCd <= 0) strikeUnit(u, n);
          if (!n.dead && !u.dead && n.atkCd <= 0) strikeUnit(n, u);
        }
      }
    }
  }
  // units vs player / organs
  for (const u of G.units) {
    if (u.dead) continue;
    for (const p of alive) {
      const dpx = p.x - u.x, dpy = p.y - u.y, dp = Math.hypot(dpx, dpy) || 0.01;
      const ppr = 6 * S.scale * sizeOf(p);
      if (dp >= u.r + ppr) continue;
      const push = (u.r + ppr - dp) * 0.5 / dp;
      u.x -= dpx * push; u.y -= dpy * push;
      if (u.team === 'v' && u.atkCd <= 0) {
        u.atkCd = 0.8;
        p.infection += u.dmg * (1 + G.t / 200) * (1 - S.res) * (p.fx.shield > 0 ? 0.5 : 1);   p.hitT = 0; p.flash = 0.15; G.shake = Math.max(G.shake, 2);   // viruses hit harder as the infection matures
        p.vx += dpx / dp * 40; p.vy += dpy / dp * 40;
        sfx('hurt', 150, 0.1, 'sawtooth', 0.03, -60);
      }
    }
    for (const o of organs) {
      const dx = u.x - o.x, dy = u.y - o.y, d = Math.hypot(dx, dy) || 0.01, minD = o.r * 0.85 + u.r;
      if (d < minD) { u.x = o.x + dx / d * minD; u.y = o.y + dy / d * minD; }
      if (d < o.r + u.r + 1 && u.team !== o.team && u.atkCd <= 0) strikeOrgan(u, o);
    }
  }
  G.units = G.units.filter(u => !u.dead);

  // ---- projectiles (two substeps so fast shots can't skip over a tiny weak spot)
  for (const p of G.projs) {
    for (let sub = 0; sub < 2 && !p.dead; sub++) {
      p.x += p.vx * dt / 2; p.y += p.vy * dt / 2;
      for (const u of G.units) {
        if (u.team !== 'v' || u.dead) continue;
        const d = Math.hypot(p.x - u.x, p.y - u.y);
        if (d >= u.r + 2.5) continue;
        p.dead = true;
        damageUnit(u, p.dmg); burst(p.x, p.y, '#fff', 3, 40);
        break;
      }
      if (p.dead) break;
      for (const o of organs) {
        if (o.team !== 'v' || Math.hypot(p.x - o.x, p.y - o.y) >= o.r + 2.5) continue;
        p.dead = true;
        hurtOrgan(o, p.dmg * 0.6); burst(p.x, p.y, '#fff', 3, 40);
        break;
      }
    }
    p.life -= dt;
    if (p.life <= 0 || p.x < 0 || p.y < 0 || p.x > CFG.W || p.y > CFG.H) p.dead = true;
  }
  G.projs = G.projs.filter(p => !p.dead);

  // ---- auto weapons (per player, shared upgrade levels)
  const aLv = S.up.aura || 0, oLv = S.up.orbit || 0;
  for (const p of alive) {
    if (aLv) {
      p.auraT -= dt;
      if (p.auraT <= 0) {
        p.auraT = 0.45;
        const R = 26 * S.scale + 8 * aLv;
        for (const u of G.units) if (u.team === 'v' && !u.dead && dist(u, p) < R + u.r) damageUnit(u, 2 + 2 * aLv);
      }
    }
    if (oLv) {
      p.orbitA += 3 * dt;
      const n = oLv + 1;
      for (let i = 0; i < n; i++) {
        const a = p.orbitA + i / n * 6.283, ox = p.x + Math.cos(a) * (22 * S.scale + 14), oy = p.y + Math.sin(a) * (22 * S.scale + 14);
        for (const u of G.units) if (u.team === 'v' && !u.dead && u.hitCd <= 0 && Math.hypot(u.x - ox, u.y - oy) < u.r + 3) {
          u.hitCd = 0.35; damageUnit(u, 5 + 3 * oLv);
        }
      }
    }
  }

  // ---- gems, particles (any player can collect)
  for (const g of G.gems) {
    let bp = null, d = 1e9;
    for (const p of alive) { const dd = Math.hypot(p.x - g.x, p.y - g.y); if (dd < d) { d = dd; bp = p; } }
    if (!bp) continue;
    if (d < S.magnet || G.vacuumT > 0) { g.x += (bp.x - g.x) / d * 160 * dt; g.y += (bp.y - g.y) / d * 160 * dt; }
    if (d < 6 + 6 * S.scale * sizeOf(bp)) { g.dead = true; gainXp(g.v); sfx('gem', 900, 0.04, 'sine', 0.02, 300); }
  }
  G.gems = G.gems.filter(g => !g.dead);
  for (const p of G.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; p.life -= dt; }
  G.parts = G.parts.filter(p => p.life > 0);
}

// ---------------------------------------------------------------- drawing
function drawText(s, x, y, col = '#fff', sc = 1, align = 'l', shadow = true) {
  s = String(s).toUpperCase();
  const w = s.length * 4 * sc - sc;
  if (align === 'c') x -= w / 2; else if (align === 'r') x -= w;
  x = Math.round(x); y = Math.round(y);
  for (const pass of shadow ? [1, 0] : [0]) {
    ctx.fillStyle = pass ? '#000' : col;
    for (let i = 0; i < s.length; i++) {
      const gl = FONT[s[i]]; if (!gl) continue;
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++)
        if (gl[r][c] === '#') ctx.fillRect(x + (i * 4 + c) * sc + pass * sc, y + r * sc + pass * sc, sc, sc);
    }
  }
}
function rect(x, y, w, h, col, a = 1) { ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h); ctx.globalAlpha = 1; }
let shx = 0, shy = 0;
function sprite(img, x, y, w = img.width, h = img.height) {
  ctx.drawImage(img, Math.round(x - w / 2 - cam.x + shx), Math.round(y - h / 2 - cam.y + shy), w, h);
}
function weakGlow(x, y, r, a, col, big, near) {
  const wx = Math.round(x + Math.cos(a) * r - cam.x + shx), wy = Math.round(y + Math.sin(a) * r - cam.y + shy);
  const pulse = 0.6 + 0.4 * Math.sin(G.t * 8 + a * 3);
  if (big && near) {   // in poking reach: bright halo + spinning reticle ring around the weak spot
    rect(wx - 6, wy - 6, 13, 13, '#ffe070', 0.3 * pulse);
    for (let i = 0; i < 10; i++) {
      const t = G.t * 3 + i / 10 * 6.283;
      rect(wx + Math.cos(t) * 8 - 1, wy + Math.sin(t) * 8 - 1, 2, 2, i % 2 ? '#fff' : '#ffe070', 0.6 + 0.4 * pulse);
    }
  }
  if (big) {
    rect(wx - 3, wy - 3, 7, 7, col, 0.28 * pulse); rect(wx - 2, wy - 2, 5, 5, col, 0.3 * pulse);
    rect(wx - 1, wy, 3, 1, col, 0.55 + 0.45 * pulse); rect(wx, wy - 1, 1, 3, col, 0.55 + 0.45 * pulse);
  } else {
    rect(wx - 1, wy - 1, 3, 3, '#ff6a7a', 0.18 * pulse); rect(wx, wy, 1, 1, '#ff9aa6', 0.6);
  }
}

function tailOf(p) {
  if (isGuest()) return p.tailG;
  if (!p.tail) return null;
  const sp = spotOf(p.tail.ref);
  return { x: sp.x, y: sp.y, t: p.tail.t };
}
const tailExt = t => t < TAIL_HIT ? 1 - (1 - t / TAIL_HIT) ** 2 : t < TAIL_HIT + 0.05 ? 1 : Math.max(0, 1 - (t - TAIL_HIT - 0.05) / (TAIL_END - TAIL_HIT - 0.05));
function drawLash(bx, by, ex, ey, amp, col, dark, tipCol, phase, skipR = 0) {
  const dx = ex - bx, dy = ey - by, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, n = Math.max(4, Math.round(l / 2));
  for (let i = 0; i <= n; i++) {
    const u = i / n, w = Math.sin(u * Math.PI) * amp * Math.sin(G.t * 18 + u * 5 + phase);
    if (skipR && Math.hypot(dx * u, dy * u) < skipR) continue;   // hide the part of the tail that is inside the body
    const x = bx + dx * u + nx * w - cam.x + shx, y = by + dy * u + ny * w - cam.y + shy;
    rect(x - 1, y - 1, 4, 4, dark); rect(x, y, 2, 2, i === n && tipCol ? tipCol : col);
  }
}
function lashTo(bx, by, tt, col, dark, phase, skipR = 0) {   // tail extending toward (tt.x, tt.y)
  const ext = tailExt(tt.t), ex = bx + (tt.x - bx) * ext, ey = by + (tt.y - by) * ext;
  drawLash(bx, by, ex, ey, (1 - ext) * Math.min(7, Math.hypot(tt.x - bx, tt.y - by) * 0.1) + 1, col, dark, '#fff', phase, skipR);
}
function drawTail(p) {   // short wagging tail; lashes out to the weak spot when poking
  const sc = S.scale * sizeOf(p), bx = p.x - Math.cos(p.aim) * 5 * sc, by = p.y + 3 * sc, tt = tailOf(p), col = p.idx ? '#ffc070' : '#8fd0ff';
  if (tt) { lashTo(bx, by, tt, col, '#12204a', 0); return; }
  const a = p.aim + Math.PI + Math.sin(G.t * 6 + p.idx) * 0.5, len = 9 * sc;
  drawLash(bx, by, bx + Math.cos(a) * len, by + Math.sin(a) * len, 2, col, '#12204a', null, p.idx);
}

function render() {
  if (state === 'lobby') { drawLobby(); return; }
  // camera
  updateCam();
  if (state === 'title') { cam.x = CFG.W / 2 - VIEW_W / 2 | 0; cam.y = 330; }
  shx = G.shake > 0.5 ? Math.round(rand(-1, 1) * G.shake) : 0; shy = G.shake > 0.5 ? Math.round(rand(-1, 1) * G.shake) : 0;

  ctx.fillStyle = lvl().clear; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.save();
  ctx.beginPath(); ctx.rect(-cam.x + shx, -cam.y + shy, CFG.W, CFG.H); ctx.clip();
  const bx = Math.floor(cam.x / 64) * 64, by = Math.floor(cam.y / 64) * 64;
  for (let y = by; y < cam.y + VIEW_H; y += 64) for (let x = bx; x < cam.x + VIEW_W; x += 64) ctx.drawImage(SPR[lvl().bg], x - cam.x + shx, y - cam.y + shy);
  ctx.restore();
  ctx.strokeStyle = lvl().edge; ctx.lineWidth = 2; ctx.strokeRect(-cam.x + shx - 1, -cam.y + shy - 1, CFG.W + 2, CFG.H + 2);

  // which players can poke right now (drives the weak-spot brackets)
  const pokers = (isGuest() ? [players[meIdx()]] : net ? [players[0]] : players).filter(p => p && !p.down);
  const bodyRing = (cx, cy, r) => {
    const n = Math.max(14, Math.round(r * 3.2)), al = 0.5 + 0.4 * Math.sin(G.t * 7);
    for (let i = 0; i < n; i++) { const t = i / n * 6.283 + G.t; rect(cx + Math.cos(t) * r - cam.x + shx, cy + Math.sin(t) * r - cam.y + shy, 1, 1, i % 2 ? '#fff' : '#ffe070', al); }
  };
  const nearSpot = t => { const sp = spotOf(t); return pokers.some(p => Math.hypot(sp.x - p.x, sp.y - p.y) <= reachOf(p)); };

  // slime puddles + flying globs (with a landing marker), medicine pills
  for (const sl of G.slimes) {
    ctx.globalAlpha = 0.9 * Math.min(1, sl.life / 2);
    sprite(SPR.slime, sl.x, sl.y, Math.round(sl.r * 2.8), Math.round(sl.r * 2.1)); ctx.globalAlpha = 1;
  }
  for (const g of G.globs) {
    const k = g.t / g.dur, gx = g.sx + (g.tx - g.sx) * k, gy = g.sy + (g.ty - g.sy) * k, h = Math.sin(k * Math.PI) * 46;
    const pulse = 0.4 + 0.5 * Math.sin(G.t * 12);
    for (let i = 0; i < 18; i++) { const t = i / 18 * 6.283 + G.t * 2; rect(g.tx + Math.cos(t) * 15 - cam.x + shx, g.ty + Math.sin(t) * 10 - cam.y + shy, 2, 1, '#9ae05a', (0.35 + 0.5 * k) * (0.6 + pulse * 0.4)); }
    rect(gx - 2 - cam.x + shx, gy + 1 - cam.y + shy, 5, 2, '#000', 0.3);
    rect(gx - 3 - cam.x + shx, gy - h - 3 - cam.y + shy, 6, 6, '#2f6a16'); rect(gx - 2 - cam.x + shx, gy - h - 2 - cam.y + shy, 4, 4, '#9ae05a'); rect(gx - 1 - cam.x + shx, gy - h - 2 - cam.y + shy, 1, 1, '#fff');
  }
  for (const pl of G.pills) {
    if (pl.life < 5 && Math.floor(G.t * 6) % 2) continue;   // blinks before vanishing
    const by = Math.sin(G.t * 4 + pl.x) * 1.5, pu = 0.5 + 0.5 * Math.sin(G.t * 5);
    for (let i = 0; i < 12; i++) { const t = i / 12 * 6.283 + G.t * 1.5; rect(pl.x + Math.cos(t) * 11 - cam.x + shx, pl.y + by + Math.sin(t) * 11 - cam.y + shy, 1, 1, '#ffe070', 0.35 + 0.4 * pu); }
    sprite(SPR.pill, pl.x, pl.y + by, 18, 9);
  }

  if (G.fix.length) {   // trachea (where mucus and coughs come from) and the air sacs
    const tx = TRACHEA.x - cam.x + shx, ty = -cam.y + shy;
    rect(tx - 9, ty, 18, 56, '#5a2c46'); rect(tx - 7, ty, 14, 56, '#a86a88');
    for (let y = 4; y < 56; y += 8) rect(tx - 9, ty + y, 18, 2, '#5a2c46');
    const br = breathY();
    for (const f of G.fix) {
      const img = SPR.sac[f.st], k = 1 - 0.18 * br, w = Math.round(img.width * k), h = Math.round(img.height * k);
      if (f.st === 0) {
        const pu = 0.5 + 0.5 * Math.sin(G.t * 2 + f.i);
        ctx.strokeStyle = 'rgba(120,230,255,' + (0.2 + 0.15 * pu) + ')'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(f.x - cam.x + shx, f.y - cam.y + shy, 22, 0, 6.283); ctx.stroke();
      }
      rect(f.x - 11 - cam.x + shx, f.y + 12 - cam.y + shy, 22, 3, '#000', 0.35);
      sprite(img, f.x, f.y, w, h);
      if (f.st > 0) {
        weakGlow(f.x, f.y, f.r, f.weakA, '#fff6a0', true, nearSpot(f));
        if (nearSpot(f)) bodyRing(f.x, f.y, f.r + 5);
      }
      if (f.st > 0 && f.spawnMax > 0) {   // when the next slime enemy pops out
        const bx2 = Math.round(f.x - 12 - cam.x + shx), by2 = Math.round(f.y + 25 - cam.y + shy);
        rect(bx2 - 1, by2 - 1, 26, 4, '#000', 0.7); rect(bx2, by2, Math.round(24 * clamp(1 - f.spawnT / f.spawnMax, 0, 1)), 2, '#9ae05a');
      }
      drawText(['OPEN', 'CLOGGED', 'COLLAPSED'][f.st], f.x - cam.x + shx, f.y + 17 - cam.y + shy, ['#7fe8ff', '#ffd060', '#ff8a7a'][f.st], 1, 'c');
    }
  }

  // gems
  for (const g of G.gems) sprite(SPR.gem, g.x, g.y + Math.sin(G.t * 4 + g.ph) * 1.2);

  // organs
  for (const o of organs) {
    const inf = o.team === 'v';
    if (!inf) { // protective halo
      const pu = 0.5 + 0.5 * Math.sin(G.t * 2 + o.i);
      ctx.strokeStyle = 'rgba(120,220,255,' + (0.25 + 0.2 * pu) + ')'; ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(o.x - 26 - cam.x + shx) + 0.5, Math.round(o.y - 26 - cam.y + shy) + 0.5, 52, 52);
      ctx.beginPath(); ctx.arc(o.x - cam.x + shx, o.y - cam.y + shy, 28, 0, 6.283); ctx.stroke();
    }
    rect(o.x - 14 - cam.x + shx, o.y + 16 - cam.y + shy, 28, 4, '#000', 0.4);
    sprite(o.flash > 0 ? tinted(inf ? SPR.organInf[o.i] : SPR.organ[o.i], '#fff') : (inf ? SPR.organInf[o.i] : SPR.organ[o.i]), o.x, o.y);
    weakGlow(o.x, o.y, o.r, o.weakA, '#fff6a0', inf, inf && nearSpot(o));
    if (inf && nearSpot(o)) bodyRing(o.x, o.y, o.r + 4);
    // hp bar
    const bxx = Math.round(o.x - 12 - cam.x + shx), byy = Math.round(o.y + 24 - cam.y + shy);
    rect(bxx - 1, byy - 1, 26, 4, '#000', 0.7);
    rect(bxx, byy, Math.round(24 * Math.max(0, o.hp) / (inf ? 100 : o.maxHp)), 2, inf ? '#9ae05a' : '#4aa8ff');
    // spawn progress: when the next friendly cell (or virus) pops out
    const prog = clamp(1 - o.spawnT / (o.spawnMax || 1), 0, 1);
    rect(bxx - 1, byy + 3, 26, 4, '#000', 0.7);
    rect(bxx, byy + 4, Math.round(24 * prog), 2, inf ? '#e060ff' : '#7fffd0');
    drawText(o.name, o.x - cam.x + shx, o.y - 31 - cam.y + shy, inf ? '#b8f070' : '#bfe8ff', 1, 'c');
  }

  // auras
  const aLv = S.up.aura || 0;
  if (aLv) for (const p of players) {
    if (p.down) continue;
    const R = 26 * S.scale + 8 * aLv;
    for (let i = 0; i < 64; i++) {
      const a = i / 64 * 6.283 + G.t * 0.8;
      rect(p.x + Math.cos(a) * R - cam.x + shx, p.y + Math.sin(a) * R - cam.y + shy, 1, 1, '#7fe8ff', i % 2 ? 0.7 : 0.25);
    }
  }

  // units (sorted for depth)
  G.units.sort((a, b) => a.y - b.y);
  const unitTail = u => u.team === 'v' ? [TYPES[u.type].col, '#2a0a14'] : ['#3fd6a6', '#12204a'];
  for (const u of G.units) {
    const inf = u.team === 'v';
    let img = inf ? SPR.virus[u.type] : SPR.ally;
    const grow = clamp((G.t - u.born) / 0.35, 0.35, 1), sz = (inf ? img.width : TYPES[u.type].ally) * grow;
    if (u.flash > 0) img = tinted(img, '#ffffff');
    rect(u.x - u.r * 0.8 - cam.x + shx, u.y + u.r - 1 - cam.y + shy, Math.round(u.r * 1.6), 2, '#000', 0.3);
    if (!tailOf(u)) {   // idle tail wags behind the body, beside the weak spot
      const [tcol, tdark] = unitTail(u);
      const a = u.weakA + 0.9 + Math.sin(G.t * 5 + u.id) * 0.4, bx = u.x + Math.cos(u.weakA + 0.9) * u.r * 0.7, by = u.y + Math.sin(u.weakA + 0.9) * u.r * 0.7, len = u.r * 0.9 + 3;
      drawLash(bx, by, bx + Math.cos(a) * len, by + Math.sin(a) * len, 1.5, tcol, tdark, null, u.id % 7);
    }
    sprite(img, u.x, u.y, sz, sz);
    if (u.stuckT > 0) { ctx.globalAlpha = 0.55; sprite(tinted(inf ? SPR.virus[u.type] : SPR.ally, '#7fe04a'), u.x, u.y, sz, sz); ctx.globalAlpha = 1; }
    weakGlow(u.x, u.y, u.r, u.weakA, '#fff6a0', inf, inf && nearSpot(u));
    if (inf && nearSpot(u)) bodyRing(u.x, u.y, u.r + 3);   // the whole virus pulses when you can poke it
  }
  for (const p of pokers) {   // the weak spot a poke would hit right now: dotted guide line + label
    const t = pokeNearest(p);
    if (!t) continue;
    const sp = spotOf(t), dx = sp.x - p.x, dy = sp.y - p.y, l = Math.hypot(dx, dy) || 1;
    for (let d = 10; d < l - 4; d += 4) rect(p.x + dx / l * d - cam.x + shx, p.y + dy / l * d - cam.y + shy, 1, 1, '#fff', 0.6);
    drawText(touchUI ? 'TAP' : 'CLICK', sp.x - cam.x + shx, sp.y - 20 - cam.y + shy, '#ffe070', 1, 'c');
  }
  for (const u of G.units) {   // lashes on top of every body so the tip is always visible on its target
    const ut = tailOf(u);
    if (ut) { const [tcol, tdark] = unitTail(u); lashTo(u.x, u.y, ut, tcol, tdark, u.id % 7, u.r * 0.9); }
  }

  for (const b of G.beams) {   // fever rays: striped warning lane first, then the burning beam
    const firing = b.t >= b.warn;
    ctx.save(); ctx.translate(b.x - cam.x + shx, b.y - cam.y + shy); ctx.rotate(b.a);
    if (!firing) {
      const k = b.t / b.warn, pu = 0.5 + 0.5 * Math.sin(b.t * 18);
      ctx.fillStyle = '#ff4a1a'; ctx.globalAlpha = 0.1 + 0.3 * k * (0.6 + 0.4 * pu); ctx.fillRect(16, -b.w / 2, b.len, b.w);
      ctx.fillStyle = '#ffe070'; ctx.globalAlpha = 0.3 + 0.5 * k;
      for (let d = 16; d < b.len; d += 14) { ctx.fillRect(d, -b.w / 2, 5, 2); ctx.fillRect(d + 7, b.w / 2 - 2, 5, 2); }
      ctx.globalAlpha = 0.5 + 0.5 * pu; ctx.fillRect(16, -b.w / 2, b.len, 1); ctx.fillRect(16, b.w / 2 - 1, b.len, 1);
    } else {
      const f = 0.8 + 0.2 * Math.sin(b.t * 70);
      ctx.fillStyle = '#ff6a1a'; ctx.globalAlpha = 0.5 * f; ctx.fillRect(8, -b.w / 2 - 3, b.len, b.w + 6);
      ctx.fillStyle = '#ffb040'; ctx.globalAlpha = 0.95; ctx.fillRect(8, -b.w / 2 + 1, b.len, b.w - 2);
      ctx.fillStyle = '#fff6c0'; ctx.fillRect(8, -2, b.len, 4);
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }

  // players
  for (const p of players) {
    const s = Math.round(16 * S.scale * sizeOf(p)), by = p.down ? 0 : Math.sin(p.bob) * 1.2, base = p.idx ? SPR.player2 : SPR.player;
    let sw = s, sh = s;
    if (p.down) {   // infected and out: greenish, with a revive meter
      sprite(tinted(base, '#6fbf2a'), p.x, p.y, s, s);
      rect(p.x - 10 - cam.x + shx, p.y - s / 2 - 7 - cam.y + shy, 20, 4, '#000', 0.7);
      rect(p.x - 9 - cam.x + shx, p.y - s / 2 - 6 - cam.y + shy, Math.round(18 * p.reviveT / 3), 2, '#7fffd0');
      drawText('REVIVE', p.x - cam.x + shx, p.y - s / 2 - 14 - cam.y + shy, '#7fffd0', 1, 'c');
      continue;
    }
    const lvS = S.up.split || 0;
    if (p.splitting > 0) {   // squash sideways, pinch, and little copies bud off in the directions the children will fly
      const k = Math.min(1, p.splitting / SPLIT_TIME), e = Math.sin(k * Math.PI);
      sw = Math.round(s * (1 + 0.5 * e)); sh = Math.round(s * (1 - 0.28 * e));
      for (let i = 0; i < lvS; i++) {
        const a = p.splitBase + i / lvS * 6.283, d = k * (s * 0.55 + 6), cs = Math.round(10 + 6 * k);
        ctx.globalAlpha = 0.35 + 0.5 * k; sprite(SPR.ally, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, cs, cs); ctx.globalAlpha = 1;
      }
    } else if (lvS && p.mass > 1.08) {   // growing tense before the split
      const wob = Math.sin(G.t * 16) * (p.mass - 1.08) * 0.4 * s;
      sw = Math.round(s + wob); sh = Math.round(s - wob);
    }
    drawTail(p);
    ctx.strokeStyle = p.idx ? 'rgba(255,190,100,0.75)' : 'rgba(120,220,255,0.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(p.x - cam.x + shx, p.y + 6 * S.scale * sizeOf(p) - cam.y + shy, 8 * S.scale * sizeOf(p), 3 * S.scale * sizeOf(p), 0, 0, 6.283); ctx.stroke();
    sprite(p.flash > 0 ? tinted(base, '#ffffff') : base, p.x, p.y + by, sw, sh);
    if (p.stuckT > 0) { ctx.globalAlpha = 0.55; sprite(tinted(base, '#7fe04a'), p.x, p.y + by, sw, sh); ctx.globalAlpha = 1; }
    if (p.fx.shield > 0) for (let i = 0; i < 20; i++) { const t = i / 20 * 6.283 + G.t * 2; rect(p.x + Math.cos(t) * (s * 0.7 + 2) - cam.x + shx, p.y + Math.sin(t) * (s * 0.7 + 2) - cam.y + shy, 1, 1, '#7fe8ff', 0.8); }
    if (p.infection > 40 && p.flash <= 0) { ctx.globalAlpha = (p.infection - 40) / 100; sprite(tinted(base, '#6fbf2a'), p.x, p.y + by, sw, sh); ctx.globalAlpha = 1; }
    for (let i = 1; i <= 3; i++) rect(p.x + Math.cos(p.aim) * (12 * S.scale + i * 7) - cam.x + shx, p.y + Math.sin(p.aim) * (12 * S.scale + i * 7) - cam.y + shy, 1, 1, PCOL[p.idx], 0.6 - i * 0.12);
    if (players.length > 1) drawText(p.idx === meIdx() ? 'YOU' : 'P' + (p.idx + 1), p.x - cam.x + shx, p.y - s / 2 - 8 - cam.y + shy, PCOL[p.idx], 1, 'c');
  }
  // orbiters
  const oLv = S.up.orbit || 0;
  if (oLv) for (const p of players) {
    if (p.down) continue;
    for (let i = 0; i < oLv + 1; i++) {
      const a = p.orbitA + i / (oLv + 1) * 6.283, ox = p.x + Math.cos(a) * (22 * S.scale + 14) - cam.x + shx, oy = p.y + Math.sin(a) * (22 * S.scale + 14) - cam.y + shy;
      rect(ox - 2, oy - 2, 5, 5, '#ff6a7a'); rect(ox - 1, oy - 1, 3, 3, '#ffd0d6');
    }
  }
  for (const p of G.projs) sprite(SPR.shot, p.x, p.y);
  for (const p of G.parts) rect(p.x - cam.x + shx, p.y - cam.y + shy, p.sz, p.sz, p.col, clamp(p.life / 0.35, 0, 1));

  if (G.fix.length) {
    const br = breathY();
    if (Math.abs(br) > 0.03) {   // big air current: tinted screen, sweeping bands and long streaks all moving the way the breath pushes
      const dir = Math.sign(br), a = Math.abs(br);
      rect(0, 0, VIEW_W, VIEW_H, dir < 0 ? '#9ad8ff' : '#ff9ac0', 0.1 * a);
      for (let i = 0; i < 3; i++) rect(0, (((i * 90 + G.t * 150 * dir) % (VIEW_H + 60)) + VIEW_H + 60) % (VIEW_H + 60) - 30, VIEW_W, 26, '#ffffff', 0.07 * a);
      for (let i = 0; i < 70; i++) {
        const len = 6 + (i * 7) % 10, y = (((i * 61 + G.t * (170 + (i % 4) * 40) * dir) % VIEW_H) + VIEW_H) % VIEW_H;
        rect((i * 47 + 13) % VIEW_W, y, 1 + (i % 3 === 0 ? 1 : 0), len, '#ffffff', 0.5 * a);
      }
    }
    if (G.cough) {   // sucked-in ring while charging, then the shockwave
      const c = G.cough, cx = TRACHEA.x - cam.x + shx, cy = TRACHEA.y - cam.y + shy, firing = c.t >= c.warn;
      const r = firing ? 20 + (c.t - c.warn) / 0.7 * 420 : 200 - 180 * c.t / c.warn, al = firing ? 1 - (c.t - c.warn) / 0.7 : 0.4 + 0.4 * Math.sin(c.t * 14);
      for (let i = 0; i < 90; i++) { const t = i / 90 * 6.283; rect(cx + Math.cos(t) * r, cy + Math.sin(t) * r, 2, 2, firing ? '#fff' : '#ff8a7a', Math.max(0, al)); }
    }
  }
  for (const t of G.tips) drawText(t.text, t.x - cam.x + shx, t.y - cam.y + shy - (0.9 - t.t) * 10, t.col, 1, 'c');
  drawHud();
  if (touchUI && state === 'play') drawTouch();
  if (state === 'title') drawTitle();
  if (state === 'levelup') drawLevelUp();
  if (state === 'over') drawOver();
  if (state === 'paused') { rect(0, 0, VIEW_W, VIEW_H, '#000', 0.5); drawText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 5, '#fff', 3, 'c'); }
  if (state !== 'title' && state !== 'levelup' && mouse.moved && !touchUI) { // crosshair (player 1 aims with the mouse)
    const mx = Math.round(mouse.sx), my = Math.round(mouse.sy);
    for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) rect(mx + dx, my + dy, 1, 1, '#fff');
  }
}

function drawHud() {
  if (state === 'title') return;
  const n = players.length;
  players.forEach((p, i) => {
    const y = 4 + i * 14, label = n > 1 ? 'P' + (i + 1) + ' INFECTION' : 'INFECTION';
    drawText(label, 4, y, p.down ? '#9ae05a' : (n > 1 ? PCOL[i] : '#ffb0b8'));
    rect(3, y + 7, 82, 7, '#000'); rect(4, y + 8, 80, 5, '#3a1018');
    rect(4, y + 8, Math.round(80 * Math.min(1, p.infection / 100)), 5, p.infection > 70 ? '#ff4040' : '#d86a30');
  });
  const xy = 4 + n * 14;
  rect(3, xy, 82, 5, '#000'); rect(4, xy + 1, 80, 3, '#102840');
  rect(4, xy + 1, Math.round(80 * S.xp / S.next), 3, '#38b8ff');
  drawText('LV ' + S.level + '  RES ' + Math.round(S.res * 100) + '%', 4, xy + 7, '#bfe8ff');
  const keyHint = touchUI ? '' : (coop && !net ? ' [F/U]' : ' [F]');
  if (S.shoot) drawText(players.map((p, i) => (n > 1 ? 'P' + (i + 1) + ' ' : '') + 'FIRE ' + (p.autoFire ? 'ON' : 'OFF')).join('  ') + keyHint, 4, xy + 14, players.every(p => p.autoFire) ? '#7fffd0' : '#ffd88a');
  {   // active medicine effects
    const locals = isGuest() ? [players[meIdx()]] : net ? [players[0]] : players;
    let by = xy + 14 + (S.shoot ? 7 : 0);
    for (const p of locals) {
      if (!p) continue;
      const list = [['speed', 'SPEED'], ['shield', 'SHIELD'], ['poke', 'POKE+'], ['bloat', 'BIG'], ['slow', 'SLOW']].filter(([k]) => p.fx[k] > 0).map(([k, nm]) => nm + ' ' + Math.ceil(p.fx[k]));
      if (!list.length) continue;
      drawText((locals.length > 1 ? 'P' + (p.idx + 1) + ' ' : '') + list.join('  '), 4, by, p.fx.slow > 0 || p.fx.bloat > 0 ? '#ffd88a' : '#7fffd0'); by += 7;
    }
  }
  // timer
  const left = Math.max(0, lvl().time - G.t), mm = Math.floor(left / 60), ss = Math.floor(left % 60);
  drawText(mm + ':' + String(ss).padStart(2, '0'), VIEW_W / 2, 4, '#fff', 2, 'c');
  if (G.fix.length) {
    const O = oxy(), w = 80, x = VIEW_W / 2 - w / 2, warn = G.suffT > 0;
    rect(x - 1, 16, w + 2, 7, '#000'); rect(x, 17, w, 5, '#102840'); rect(x, 17, Math.round(w * O), 5, O < 0.3 ? '#ff5050' : '#4ad8ff');
    drawText(warn ? 'COLLAPSE IN ' + Math.max(0, Math.ceil(15 - G.suffT)) : 'OXYGEN ' + Math.round(O * 100) + '%', VIEW_W / 2, 24, warn && Math.floor(G.t * 4) % 2 ? '#ff5050' : O < 0.3 ? '#ff9a9a' : '#bfe8ff', 1, 'c');
    const br = breathY();
    drawText(br < -0.05 ? '< INHALE: PULLED UP' : br > 0.05 ? 'EXHALE: PUSHED DOWN >' : 'BREATHE', VIEW_W / 2, VIEW_H - 12, '#ffd0e8', 1, 'c');
    drawText('PHASE ' + G.phase + '/3', 4, VIEW_H - 22, ['#bfe8ff', '#ffd88a', '#ff9a8a'][G.phase - 1]);
    G.fix.forEach((f, i) => { const bx = 4 + i * 9; rect(bx - 1, VIEW_H - 13, 8, 10, '#000', 0.7); rect(bx, VIEW_H - 12, 6, 8, ['#2a9ac0', '#c8a020', '#b04030'][f.st]); });
  }
  drawText('ALLIES ' + count('i'), VIEW_W - 4, 4, '#7fffd0', 1, 'r');
  drawText('KILLS ' + G.kills, VIEW_W - 4, 11, '#fff', 1, 'r');
  drawText('TURNED ' + G.conv, VIEW_W - 4, 18, '#7fe8ff', 1, 'r');
  // organs
  organs.forEach((o, i) => {
    const x = 4 + i * 17, y = VIEW_H - 12, inf = o.team === 'v';
    rect(x - 1, y - 1, 16, 10, '#000', 0.7);
    rect(x, y, 14, 8, inf ? '#3f6a22' : '#1c4a78');
    drawText(o.tag, x + 1, y + 1, inf ? '#e8ff7a' : '#fff', 1, 'l', false);
  });
  if (G.msgT > 0) {
    const w = G.msg.length * 8 + 12, my = G.fix.length ? 34 : 28;
    rect(VIEW_W / 2 - w / 2, my, w, 12, '#000', 0.6);
    drawText(G.msg, VIEW_W / 2, my + 3, G.msg.includes('CLEANSED') || G.msg.includes('BACK') ? '#7fe8ff' : G.msg.includes('SWARM') || G.msg.includes('INFECTED!') && G.msg[0] === 'P' ? '#ffd060' : '#b8f070', 2, 'c');
  }
  // offscreen arrows: infected organs (green) and downed players (to revive)
  const marks = organs.filter(o => o.team === 'v').map(o => ({ x: o.x, y: o.y, tag: o.tag, col: '#9ae05a', tc: '#b8f070' }))
    .concat(G.fix.filter(f => f.st > 0).map(f => ({ x: f.x, y: f.y, tag: 'SAC', col: f.st > 1 ? '#ff8a7a' : '#ffd060', tc: '#ffd88a' })))
    .concat(players.filter(p => p.down).map(p => ({ x: p.x, y: p.y, tag: 'P' + (p.idx + 1), col: '#7fffd0', tc: '#7fffd0' })));
  for (const o of marks) {
    const sx = o.x - cam.x, sy = o.y - cam.y;
    if (sx > 0 && sx < VIEW_W && sy > 0 && sy < VIEW_H) continue;
    const a = Math.atan2(sy - VIEW_H / 2, sx - VIEW_W / 2);
    const ex = clamp(VIEW_W / 2 + Math.cos(a) * 400, 16, VIEW_W - 16), ey = clamp(VIEW_H / 2 + Math.sin(a) * 400, 44, VIEW_H - 30);
    const pu = 0.6 + 0.4 * Math.sin(G.t * 6);
    for (let i = 0; i < 4; i++) rect(ex - Math.cos(a) * i * 2 - 1, ey - Math.sin(a) * i * 2 - 1, 3, 3, o.col, pu * (1 - i * 0.2));
    drawText(o.tag, ex, ey + 6, o.tc, 1, 'c');
  }
}

function drawTouch() {
  const ring = (x, y, r, col, a) => {
    for (let i = 0; i < 40; i++) { const t = i / 40 * 6.283; rect(x + Math.cos(t) * r, y + Math.sin(t) * r, 1, 1, col, a); }
  };
  for (const [k, hx, col] of [['move', 52, '#bfe8ff'], ['aim', VIEW_W - 52, '#ffc070']]) {
    const st = touch[k];
    if (!st) { ring(hx, VIEW_H - 52, STICK_R, col, 0.22); drawText(k === 'move' ? 'MOVE' : 'AIM', hx, VIEW_H - 54, col, 1, 'c'); continue; }
    ring(st.ox, st.oy, STICK_R, col, 0.5);
    const v = stickVec(st, 0);
    rect(st.ox + v.x * STICK_R - 3, st.oy + v.y * STICK_R - 3, 7, 7, col, 0.8);
  }
  if (S.shoot) {   // FIRE toggle button
    const b = fireBtn(), me = isGuest() ? players[meIdx()] : players[0], on = !me || me.autoFire;
    rect(b.x - 1, b.y - 1, b.w + 2, b.h + 2, on ? '#7fffd0' : '#ff9a9a', 0.7); rect(b.x, b.y, b.w, b.h, '#12204a', 0.85);
    drawText(on ? 'FIRE ON' : 'FIRE OFF', b.x + b.w / 2, b.y + 5, on ? '#7fffd0' : '#ff9a9a', 1, 'c');
  }
  if (fsAvail()) {   // fullscreen toggle: four corner brackets
    const f = fsBtnPlay();
    rect(f.x, f.y, f.w, f.h, '#000', 0.5);
    for (const [cx, cy, dx, dy] of [[3, 3, 1, 1], [10, 3, -1, 1], [3, 9, 1, -1], [10, 9, -1, -1]]) {
      rect(f.x + cx, f.y + cy, 1, 1, '#fff'); rect(f.x + cx + dx, f.y + cy, 1, 1, '#fff'); rect(f.x + cx, f.y + cy + dy, 1, 1, '#fff');
    }
  }
  const b = pauseBtn();
  rect(b.x, b.y, b.w, b.h, '#000', 0.5); rect(b.x + 4, b.y + 3, 2, 7, '#fff'); rect(b.x + 8, b.y + 3, 2, 7, '#fff');
}

const TBW = 94, TBH = 20;
const tbtn = i => ({ x: i % 2 ? 4 : -98, y: VIEW_H - 76 + (i >> 1) * 24 });   // 2x2 button grid anchored to the bottom
const lvBtn = () => ({ x: VIEW_W / 2 - 75, y: VIEW_H - 87, w: 150, h: 10 });
function titleBtnAt(mx, my) {
  const c = VIEW_W / 2;
  if (inRect(lvBtn(), mx, my)) return 5;
  for (let i = 0; i < 4; i++) { const b = tbtn(i); if (mx >= c + b.x && mx < c + b.x + TBW && my >= b.y && my < b.y + TBH) return i + 1; }
  return 0;
}
function drawTitle() {
  rect(0, 0, VIEW_W, VIEW_H, '#000', 0.55);
  const c = VIEW_W / 2, compact = VIEW_H < 220;
  drawText('VACCINE', c, compact ? 6 : 12, '#9ae05a', compact ? 4 : 5, 'c');
  drawText('VIRAL ASSAULT CELLULAR COUNTER-INITIATIVE', c, compact ? 28 : 42, '#bfe8ff', 1, 'c');
  drawText('NANO EDITION', c, compact ? 38 : 52, '#ffe070', 1, 'c');
  if (!compact) {
    const bob = Math.sin(performance.now() / 200) * 2;
    ctx.drawImage(SPR.player, c - 28, 62 + bob, 32, 32); ctx.drawImage(SPR.player2, c + 0, 62 - bob, 32, 32);
    ctx.drawImage(SPR.virus.basic, c - 66, 70); ctx.drawImage(SPR.virus.brute, c + 40, 64); ctx.drawImage(SPR.virus.runner, c - 86, 88);
  }
  let lines = touchUI
    ? ['TOUCH: LEFT STICK MOVES, RIGHT STICK AIMS, TAP A WEAK SPOT TO POKE', 'ONLINE CO-OP WORKS BETWEEN PHONES AND COMPUTERS']
    : ['1 PLAYER: WASD MOVE, MOUSE AIM, SPACE POKES (F: TOGGLE SHOOTING)', 'LOCAL CO-OP: P1 WASD + MOUSE   P2 ARROWS + IJKL (OR GAMEPADS)'];
  lines.push(touchUI ? 'GET CLOSE, THEN TAP A GLOWING WEAK SPOT TO POKE IT' : 'GET CLOSE, THEN CLICK A GLOWING WEAK SPOT TO POKE IT', 'YOUR TAIL TURNS THE VIRUS INTO AN ALLY. CO-OP: DISTRACT + POKE!',
    'SHOOTING IS A LEVEL-UP UNLOCK. SURVIVE ' + Math.round(lvl().time / 60) + ' MINUTES');
  if (compact) lines = [lines[0], lines[2], lines[4]];
  lines.forEach((t, i) => drawText(t, c, (compact ? 56 : 106) + i * 10, i < (compact ? 1 : 2) ? '#fff' : '#ffd88a', 1, 'c'));
  const hov = titleBtnAt(mouse.sx, mouse.sy);
  const labels = touchUI ? ['1 PLAYER', 'LOCAL CO-OP', 'HOST ONLINE', 'JOIN ONLINE'] : ['[1] 1 PLAYER', '[2] LOCAL CO-OP', '[3] HOST ONLINE', '[4] JOIN ONLINE'];
  {
    const b = lvBtn(), h = hov === 5 && !touchUI;
    rect(b.x - 1, b.y - 1, b.w + 2, b.h + 2, h ? '#ffe070' : '#7a6a30'); rect(b.x, b.y, b.w, b.h, h ? '#3c3418' : '#241e0c');
    drawText('LEVEL: ' + lvl().name + (touchUI ? '' : ' [L]'), c, b.y + 3, '#ffe070', 1, 'c');
  }
  for (let i = 0; i < 4; i++) {
    const b = tbtn(i), h = hov === i + 1 && !touchUI, x = c + b.x;
    rect(x - 1, b.y - 1, TBW + 2, TBH + 2, h ? '#ffe070' : '#4aa8ff'); rect(x, b.y, TBW, TBH, h ? '#243c78' : '#12204a');
    drawText(labels[i], x + TBW / 2, b.y + 8, '#fff', 1, 'c');
  }
  if (fsAvail()) {
    const f = fsBtnTitle();
    rect(f.x - 1, f.y - 1, f.w + 2, f.h + 2, '#4aa8ff'); rect(f.x, f.y, f.w, f.h, '#12204a');
    drawText(isFullscreen() ? 'WINDOWED' : 'FULLSCREEN', f.x + f.w / 2, f.y + 5, '#fff', 1, 'c');
  }
  const tip = touchUI && !fsSupported && !isStandalone() ? 'TIP: SHARE > ADD TO HOME SCREEN FOR FULLSCREEN' : '';
  drawText(titleMsg || tip || (touchUI ? '' : 'P PAUSES'), c, VIEW_H - 26, titleMsg ? '#ff9a9a' : tip ? '#ffd88a' : '#8aa0d0', 1, 'c');
}
function drawLobby() {
  ctx.fillStyle = '#12060b'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  for (let y = 0; y < VIEW_H; y += 64) for (let x = 0; x < VIEW_W; x += 64) ctx.drawImage(SPR.bg, x, y);
  rect(0, 0, VIEW_W, VIEW_H, '#000', 0.6);
  const c = VIEW_W / 2, hov = lobbyButtons().find(b => inRect(b, mouse.sx, mouse.sy));
  drawText('ONLINE CO-OP', c, 12, '#7fe8ff', 3, 'c');
  if (lobby.mode === 'host') {
    drawText('YOUR ROOM CODE', c, 56, '#bfe8ff', 1, 'c');
    drawText(lobby.code || '....', c, 70, '#ffe070', 5, 'c');
    drawText('YOUR FRIEND PICKS JOIN ONLINE AND TYPES THE CODE.', c, 112, '#fff', 1, 'c');
    drawText('OR SEND THEM THIS LINK:', c, 122, '#fff', 1, 'c');
    drawText(location.host + '/?room=' + lobby.code, c, 136, '#ffd88a', 1, 'c');
  } else {
    drawText('ENTER ROOM CODE', c, 34, '#bfe8ff', 1, 'c');
    for (let i = 0; i < 4; i++) {
      const x = c - 52 + i * 27;
      rect(x - 1, 45, 26, 28, '#4aa8ff'); rect(x, 46, 24, 26, '#12204a');
      if (lobby.code[i]) drawText(lobby.code[i], x + 12, 53, '#ffe070', 3, 'c');
    }
  }
  for (const b of lobbyButtons()) {
    const h = hov === b, special = b.id.length > 1;
    rect(b.x - 1, b.y - 1, b.w + 2, b.h + 2, h ? '#ffe070' : special ? '#ffc070' : '#4aa8ff'); rect(b.x, b.y, b.w, b.h, h ? '#243c78' : '#12204a');
    drawText(b.id, b.x + b.w / 2, b.y + 5, '#fff', 1, 'c');
  }
  const dots = '.'.repeat(1 + Math.floor(performance.now() / 400) % 3);
  drawText(lobby.msg + (/WAIT|CONNECT/.test(lobby.msg) ? dots : ''), c, lobby.mode === 'host' ? (VIEW_H < 220 ? 146 : 168) : 168, /NO SUCH|FULL|LOST|LEFT|ENTER ALL|ERROR/.test(lobby.msg) ? '#ff9a9a' : '#7fffd0', 1, 'c');
}

const CARD = { w: 92, h: 84, gap: 8, y: 92 };
function cardRect(i) { const tot = 3 * CARD.w + 2 * CARD.gap; return { x: VIEW_W / 2 - tot / 2 + i * (CARD.w + CARD.gap), y: CARD.y, w: CARD.w, h: CARD.h }; }
function cardAt(mx, my) {
  for (let i = 0; i < choices.length; i++) { const r = cardRect(i); if (mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h) return i; }
  return -1;
}
function drawLevelUp() {
  rect(0, 0, VIEW_W, VIEW_H, '#000', 0.65);
  drawText('LEVEL UP!', VIEW_W / 2, 24, '#ffe070', 4, 'c');
  drawText('YOU GREW BIGGER AND MORE RESISTANT', VIEW_W / 2, 52, '#bfe8ff', 1, 'c');
  drawText('RESISTANCE ' + Math.round(S.res * 100) + '%', VIEW_W / 2, 62, '#7fffd0', 1, 'c');
  drawText('CHOOSE AN UPGRADE', VIEW_W / 2, 78, '#fff', 1, 'c');
  const hov = cardAt(mouse.sx, mouse.sy);
  choices.forEach((u, i) => {
    const r = cardRect(i), lv = S.up[u.id] || 0, h = hov === i;
    rect(r.x - 1, r.y - 1, r.w + 2, r.h + 2, h ? '#ffe070' : '#4aa8ff');
    rect(r.x, r.y, r.w, r.h, h ? '#243c78' : '#12204a');
    drawText('[' + (i + 1) + ']', r.x + 4, r.y + 4, '#8aa0d0');
    drawText(u.name, r.x + r.w / 2, r.y + 16, '#fff', 1, 'c');
    u.desc.forEach((t, j) => drawText(t, r.x + r.w / 2, r.y + 32 + j * 8, '#bfe8ff', 1, 'c'));
    drawText(lv === 0 ? 'NEW!' : 'LV ' + lv + ' > ' + (lv + 1), r.x + r.w / 2, r.y + r.h - 12, lv === 0 ? '#7fffd0' : '#ffe070', 1, 'c');
    const pips = u.max || MAX_UP;
    for (let s = 0; s < pips; s++) rect(r.x + r.w / 2 - (pips * 6 - 2) / 2 + s * 6, r.y + r.h - 20, 4, 3, s < lv ? '#ffe070' : '#304070');
  });
}
function drawOver() {
  G.overT += 1 / 60;
  const win = G.result === 'win';
  rect(0, 0, VIEW_W, VIEW_H, win ? '#06223a' : '#220608', 0.75);
  const c = VIEW_W / 2;
  drawText(win ? 'HOST SAVED!' : 'INFECTION WINS', c, 40, win ? '#7fe8ff' : '#9ae05a', 4, 'c');
  drawText(G.reason, c, 70, '#fff', 1, 'c');
  const saved = organs.filter(o => o.team === 'i').length;
  [['TIME SURVIVED', Math.floor(G.t / 60) + ':' + String(Math.floor(G.t % 60)).padStart(2, '0')], ['LEVEL', S.level], ['VIRUSES KILLED', G.kills], ['VIRUSES TURNED', G.conv], G.fix.length ? ['SACS REPAIRED', G.fixed || 0] : ['ORGANS SAVED', saved + '/5']]
    .forEach(([k, v], i) => { drawText(k, c - 10, 95 + i * 11, '#bfe8ff', 1, 'r'); drawText(v, c + 10, 95 + i * 11, '#fff'); });
  if (G.overT > 0.7 && Math.floor(performance.now() / 500) % 2) drawText(isGuest() ? 'WAITING FOR HOST TO RESTART' : 'CLICK TO TRY AGAIN', c, Math.min(175, VIEW_H - 24), '#fff', isGuest() ? 1 : 2, 'c');
}

// ---------------------------------------------------------------- online
// Host-authoritative: the host simulates everything. The guest sends its input and renders snapshots.
const TYPE_IDS = ['basic', 'runner', 'brute', 'saboteur', 'slimeling'];
const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;

// Transport: WebRTC data channel via PeerJS (public signalling server), so the site can be fully static.
// The room code is the host's peer id ("vaccine-nano-ABCD").
const ROOM_PREFIX = 'vaccine-nano-', CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
// Players on different networks need STUN, and often a TURN relay, to reach each other. Several free servers, so one being down is fine.
const PEER_OPTS = { config: { iceServers: [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] },
  { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' },
  { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turns:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' },
], sdpSemantics: 'unified-plan' } };
function relay(d) { if (net && net.conn && net.conn.open) net.conn.send(d); }
function netConnect(role, code) {
  if (typeof Peer === 'undefined') { lobby.msg = 'NETWORK LIBRARY MISSING'; return; }
  const me = net = { role, peer: null, conn: null, got: false, inT: 0, snapT: 0, units: new Map() };
  const fail = msg => {
    if (net !== me) return;
    net = null; try { me.peer && me.peer.destroy(); } catch (e) { /* already gone */ }
    if (state === 'lobby') lobby.msg = msg; else netDown(msg);
  };
  if (role === 'host') {
    const openRoom = () => {
      const c = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
      const peer = me.peer = new Peer(ROOM_PREFIX + c, PEER_OPTS);
      peer.on('open', () => { if (net === me) { lobby.code = c; lobby.msg = 'WAITING FOR PLAYER 2'; } });
      peer.on('error', e => { if (e.type === 'unavailable-id' && net === me) { peer.destroy(); openRoom(); } else fail('ERROR: ' + String(e.type || 'CONNECTION').toUpperCase().replace(/-/g, ' ')); });
      peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { /* ignore */ } });
      peer.on('connection', conn => {
        if (me.conn && me.conn.open) { conn.on('open', () => { conn.send({ k: 'full' }); setTimeout(() => conn.close(), 300); }); return; }
        me.conn = conn;
        conn.on('open', () => handleNet({ t: 'peer' }));
        conn.on('data', d => handleNet({ t: 'relay', d }));
        conn.on('close', () => { if (me.conn === conn) { me.conn = null; handleNet({ t: 'left' }); } });
      });
    };
    openRoom();
  } else {
    const peer = me.peer = new Peer(undefined, PEER_OPTS);
    peer.on('error', e => fail(e.type === 'peer-unavailable' ? 'NO SUCH ROOM' : 'ERROR: ' + String(e.type || 'CONNECTION').toUpperCase().replace(/-/g, ' ')));
    peer.on('open', () => {
      const conn = me.conn = peer.connect(ROOM_PREFIX + code, { serialization: 'json' });
      const timer = setTimeout(() => { if (!conn.open) fail('COULD NOT CONNECT. TRY AGAIN'); }, 20000);
      conn.on('open', () => { clearTimeout(timer); handleNet({ t: 'joined' }); });
      conn.on('data', d => { if (d && d.k === 'full') fail('ROOM IS FULL'); else handleNet({ t: 'relay', d }); });
      conn.on('error', () => fail('COULD NOT CONNECT. TRY AGAIN'));
      conn.on('close', () => { if (net === me) handleNet({ t: 'left' }); });
    });
  }
}
function netDown(msg) {
  if (net) { const n = net; net = null; try { n.peer && n.peer.destroy(); } catch (e) { /* already gone */ } }
  evq = null; lobby = null; titleMsg = msg; coop = false;
  newGame(false); state = 'title';
}
function handleNet(m) {
  if (!net) return;
  if (m.t === 'joined') { if (lobby) lobby.msg = 'CONNECTED. WAITING FOR HOST'; coop = true; }
  else if (m.t === 'peer' && net.role === 'host') {   // player 2 arrived: start a fresh online game
    evq = []; startGame(true); lobby = null; say('PLAYER 2 JOINED!');
  }
  else if (m.t === 'left') {
    if (net.role === 'guest') netDown('HOST LEFT THE GAME');
    else if (state !== 'lobby' && players[1]) { players[1].netInp = null; say('P2 DISCONNECTED'); }
  }
  else if (m.t === 'relay') {
    const d = m.d;
    if (net.role === 'host') {
      if (d.k === 'in' && players[1]) players[1].netInp = { mx: +d.mx || 0, my: +d.my || 0, aim: d.aim == null ? null : +d.aim };
      else if (d.k === 'pick' && state === 'levelup') chooseUpgrade(d.i | 0);
      else if (d.k === 'pause') togglePause();
      else if (d.k === 'fire' && players[1]) players[1].autoFire = !players[1].autoFire;
      else if (d.k === 'poke' && players[1]) { const t = d.nearest ? pokeNearest(players[1]) : pokeTargetAt(+d.wx, +d.wy, 20); if (t) tryPoke(players[1], t, 1.3); }
    } else if (d.k === 'snap') applySnap(d);
  }
}

function hostSend(dt) {
  if (!net || net.role !== 'host' || !players[1] || !players[1].remote) return;
  net.snapT -= dt;
  if (net.snapT > 0) return;
  net.snapT = 0.05;   // 20 snapshots / second
  relay({ k: 'snap', lv: lvKey, ph: G.phase, sf: r1(G.suffT), cg: G.cough ? [r2(G.cough.t), G.cough.warn] : 0, fx: G.fix.map(f => [f.st, r2(f.weakA), r1(f.spawnT || 0), r1(f.spawnMax || 0)]), st: state, t: r2(G.t), kills: G.kills, conv: G.conv, msg: G.msg, msgT: r1(G.msgT), sh: r1(G.shake), res: G.result, why: G.reason,
    S, ch: choices.map(u => u.id),
    pl: players.map(p => [r1(p.x), r1(p.y), r1(p.infection), p.down ? 1 : 0, r1(p.reviveT), r2(p.aim), p.flash > 0 ? 1 : 0, r1(p.vx), r1(p.vy), p.tail ? [r1(spotOf(p.tail.ref).x), r1(spotOf(p.tail.ref).y), r2(p.tail.t)] : 0, p.autoFire ? 1 : 0, r2(p.mass), r2(p.splitting), r2(p.splitBase), p.stuckT > 0 ? 1 : 0, [r1(p.fx.speed), r1(p.fx.slow), r1(p.fx.shield), r1(p.fx.poke), r1(p.fx.bloat)]]),
    og: organs.map(o => [o.team === 'v' ? 1 : 0, r1(o.hp), r1(o.spawnT), r1(o.spawnMax), r2(o.weakA), o.flash > 0 ? 1 : 0]),
    un: G.units.map(u => [u.id, u.team === 'v' ? 1 : 0, TYPE_IDS.indexOf(u.type), r1(u.x), r1(u.y), r2(u.weakA), u.flash > 0 ? 1 : 0, u.tail ? [r1(spotOf(u.tail.ref).x), r1(spotOf(u.tail.ref).y), r2(u.tail.t)] : 0, u.stuckT > 0 ? 1 : 0]),
    pj: G.projs.map(p => [r1(p.x), r1(p.y), Math.round(p.vx), Math.round(p.vy)]),
    gm: G.gems.map(g => [Math.round(g.x), Math.round(g.y)]),
    sl: G.slimes.map(x => [r1(x.x), r1(x.y), r1(x.r), r1(x.life)]), gl: G.globs.map(g => [r1(g.sx), r1(g.sy), r1(g.tx), r1(g.ty), r2(g.t), r2(g.dur)]),
    bm: G.beams.map(b => [r1(b.x), r1(b.y), r2(b.a), r1(b.len), r1(b.w), r2(b.t), r1(b.warn), r1(b.fire)]), pi: G.pills.map(x => [r1(x.x), r1(x.y), r1(x.life)]), vac: r1(G.vacuumT), ev: evq });
  evq = [];
}

function applySnap(d) {
  if (!net.got) { net.got = true; coop = true; lobby = null; if (LEVELS[d.lv]) lvKey = d.lv; newGame(true); }
  const prevState = state;
  state = d.st;
  if (state === 'over' && prevState !== 'over') G.overT = 0;
  G.t = d.t; G.kills = d.kills; G.conv = d.conv; G.msg = d.msg; G.msgT = d.msgT; G.shake = Math.max(G.shake, d.sh); G.result = d.res; G.reason = d.why;
  S = d.S; choices = d.ch.map(id => UPGRADES.find(u => u.id === id)).filter(Boolean);
  const me = meIdx();
  d.pl.forEach((a, i) => {
    let p = players[i];
    if (!p || players.length !== d.pl.length) { players = d.pl.map((q, j) => players[j] || { idx: j, x: q[0], y: q[1], tx: q[0], ty: q[1], vx: 0, vy: 0, bob: 0, orbitA: j * Math.PI }); p = players[i]; }
    p.tx = a[0]; p.ty = a[1]; p.infection = a[2]; p.down = !!a[3]; p.reviveT = a[4]; p.flash = a[6] ? 0.1 : -1;
    p.autoFire = !!a[10]; p.mass = a[11]; p.splitting = a[12]; p.splitBase = a[13]; p.stuckT = a[14] ? 1 : 0;
    p.fx = { speed: a[15][0], slow: a[15][1], shield: a[15][2], poke: a[15][3], bloat: a[15][4] };
    p.tailG = a[9] ? { x: a[9][0], y: a[9][1], t: a[9][2] } : null;
    if (i !== me) { p.aim = a[5]; p.vx = a[7]; p.vy = a[8]; }
    else { const ex = a[0] - p.x, ey = a[1] - p.y; if (Math.hypot(ex, ey) > 50 || p.down) { p.x = a[0]; p.y = a[1]; } else { p.x += ex * 0.15; p.y += ey * 0.15; } }
  });
  d.fx.forEach((a, i) => { const f = G.fix[i]; if (f) { f.st = a[0]; f.weakA = a[1]; f.spawnT = a[2]; f.spawnMax = a[3]; } });
  G.phase = d.ph; G.suffT = d.sf; G.cough = d.cg ? { t: d.cg[0], warn: d.cg[1] } : null;
  d.og.forEach((a, i) => {
    let o = organs[i];
    o.team = a[0] ? 'v' : 'i'; o.hp = a[1]; o.spawnT = a[2]; o.spawnMax = a[3]; o.weakA = a[4]; o.flash = a[5] ? 0.1 : -1;
  });
  const seen = new Set(), list = [];
  for (const a of d.un) {
    let u = net.units.get(a[0]);
    const type = TYPE_IDS[a[2]];
    if (!u) { u = { id: a[0], x: a[3], y: a[4], dead: false, born: G.t }; net.units.set(a[0], u); }
    u.team = a[1] ? 'v' : 'i'; u.type = type; u.r = TYPES[type].r; u.tx = a[3]; u.ty = a[4]; u.weakA = a[5]; u.flash = a[6] ? 0.1 : -1;
    u.stuckT = a[8] ? 1 : 0;
    u.tailG = a[7] ? { x: a[7][0], y: a[7][1], t: a[7][2] } : null;
    seen.add(a[0]); list.push(u);
  }
  for (const id of net.units.keys()) if (!seen.has(id)) net.units.delete(id);
  G.units = list;
  G.projs = d.pj.map(a => ({ x: a[0], y: a[1], vx: a[2], vy: a[3] }));
  G.gems = d.gm.map((a, i) => ({ x: a[0], y: a[1], ph: i * 0.7 }));
  G.slimes = d.sl.map(a => ({ x: a[0], y: a[1], r: a[2], life: a[3] }));
  G.globs = d.gl.map(a => ({ sx: a[0], sy: a[1], tx: a[2], ty: a[3], t: a[4], dur: a[5] }));
  G.beams = d.bm.map(a => ({ x: a[0], y: a[1], a: a[2], len: a[3], w: a[4], t: a[5], warn: a[6], fire: a[7] }));
  G.pills = d.pi.map(a => ({ x: a[0], y: a[1], life: a[2] }));
  G.vacuumT = d.vac;
  for (const e of d.ev || []) {
    if (e[0] === 'b') burst(e[1], e[2], e[3], e[4], e[5]);
    else if (e[0] === 's') sfx(e[1], e[2], e[3], e[4], e[5], e[6]);
    else if (e[0] === 'z') for (let i = 1; i < 6; i++) G.parts.push({ x: e[1] + (e[3] - e[1]) * i / 6, y: e[2] + (e[4] - e[2]) * i / 6, vx: 0, vy: 0, life: 0.15, max: 0.15, col: '#bfe8ff', sz: 1 });
  }
}

const guestPad = { idx: 0, scheme: 0, padDown: false, padDown2: false };   // keeps gamepad edge state between frames
function guestTick(dt) {
  if (!net.got) return;
  const k = 1 - Math.exp(-18 * dt), me = meIdx();
  for (const p of players) {
    if (p.idx === me && !p.down && p.inp && !(p.stuckT > 0)) {   // predict our own movement so controls feel instant
      const kk = Math.min(1, 10 * dt);
      p.vx += (p.inp.mx * S.speed * spdMul(p) - p.vx) * kk; p.vy += (p.inp.my * S.speed * spdMul(p) - p.vy) * kk;
      p.x = clamp(p.x + p.vx * dt, 10, CFG.W - 10); p.y = clamp(p.y + p.vy * dt, 10, CFG.H - 10);
      if (p.inp.aim !== null) p.aim = p.inp.aim;
    } else { p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k; }
    p.bob += Math.hypot(p.vx, p.vy) * dt * 0.25; p.orbitA += 3 * dt; p.flash -= dt;
    if (p.tailG) p.tailG.t += dt;
  }
  for (const u of G.units) { u.x += (u.tx - u.x) * k; u.y += (u.ty - u.y) * k; u.flash -= dt; if (u.tailG) u.tailG.t += dt; }
  for (const p of G.projs) { p.x += p.vx * dt; p.y += p.vy * dt; }
  for (const g of G.globs) g.t += dt;
  if (G.cough) G.cough.t += dt;
  for (const b of G.beams) b.t += dt;
  for (const p of G.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; p.life -= dt; }
  G.parts = G.parts.filter(p => p.life > 0);
  G.shake = Math.max(0, G.shake - 20 * dt);
  for (const t of G.tips) t.t -= dt;
  G.tips = G.tips.filter(t => t.t > 0);
  if (state === 'play') { G.t += dt; G.msgT -= dt; }
  // send our input at ~30 Hz
  net.inT -= dt;
  if (net.inT <= 0 && state !== 'lobby') {
    net.inT = 1 / 30;
    const mine = players[me]; if (!mine) return;
    const inp = readInput(guestPad);
    const l = Math.hypot(inp.mx, inp.my); if (l > 1) { inp.mx /= l; inp.my /= l; }
    if (inp.aim === null && mouse.moved) inp.aim = Math.atan2(mouse.sy + cam.y - mine.y, mouse.sx + cam.x - mine.x);
    mine.inp = inp;
    if (inp.poke) pokeNearestKey(0);
    if (inp.toggle) toggleFire(0);
    relay({ k: 'in', mx: r2(inp.mx), my: r2(inp.my), aim: inp.aim === null ? null : r2(inp.aim) });
  }
}

// ---------------------------------------------------------------- main loop
newGame(false);
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state === 'play' && !isGuest() && (document.hidden || (isTouch && innerHeight > innerWidth))) state = 'paused';
  if (state !== 'play' && (touch.move || touch.aim)) touch.move = touch.aim = null;
  if (isGuest()) guestTick(dt);
  else { if (state === 'play') update(dt); hostSend(dt); }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
{ // ?room=ABCD in the URL joins that room straight away
  const room = new URLSearchParams(location.search).get('room');
  if (room && /^[a-z]{4}$/i.test(room)) { lobby = { mode: 'join', code: room.toUpperCase(), msg: 'CONNECTING...' }; state = 'lobby'; netConnect('guest', lobby.code); }
}

// small hook for automated testing
window.__dbg = { setState(v) { state = v; }, poke(p) { const t = pokeNearest(p); return t ? tryPoke(p, t) : false; }, setLevel(k) { lvKey = k; newGame(false); }, get fix() { return G.fix; }, oxy, get choices() { return choices; }, render, addUnit, get cam() { return cam; }, get G() { return G; }, get lobby() { return lobby; }, get net() { return net; }, get units() { return G.units; }, get P() { return players[0]; }, get players() { return players; }, get S() { return S; }, get organs() { return organs; }, get state() { return state; },
  start: startGame, step(n, dt = 1 / 60) { for (let i = 0; i < n && state === 'play'; i++) update(dt); },
  pick: i => { if (state === 'levelup') chooseUpgrade(i); } };
})();
