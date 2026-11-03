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
  ember: { r: 4, hp: 8, speed: 46, dmg: 3, arc: 0.55, xp: 1, ally: 10, col: '#ff8a30' },   // heart level: spawned by sick valves
  spark: { r: 4, hp: 8, speed: 52, dmg: 3, arc: 0.55, xp: 1, ally: 10, col: '#7aa8ff' },   // brain level: spawned by sick synapses
  manflu: { r: 22, hp: 900, speed: 30, dmg: 11, arc: 0.4, xp: 14, ally: 40, col: '#a8c83a' },   // brain level boss: harmless in the end, if you let it
  pylori: { r: 4, hp: 8, speed: 44, dmg: 3, arc: 0.55, xp: 1, ally: 10, col: '#d8b840' },   // stomach level: bred by eroded glands
  toxin: { r: 4, hp: 8, speed: 50, dmg: 3, arc: 0.55, xp: 1, ally: 10, col: '#c03048' },   // bloodstream level: bred by clotted vessels
  ulcer: { r: 22, hp: 1000, speed: 26, dmg: 12, arc: 0.4, xp: 14, ally: 40, col: '#e08a30' },   // stomach boss: H. pylori, eats craters into the wall
  sepsis: { r: 22, hp: 1000, speed: 30, dmg: 11, arc: 0.4, xp: 14, ally: 40, col: '#a040b0' },   // bloodstream boss: sends saboteurs out to clot the vessels
  saboteur: { r: 5, hp: 60, speed: 48, dmg: 2, arc: 0.55, xp: 3, ally: 13, col: '#e050c0' },   // lung level: goes for the air sacs
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
  classic: { name: 'CLASSIC', time: 360, bg: 'bg', clear: '#12060b', edge: '#7a2a40', win: 'THE FEVER BROKE', intro: '', tune: { solo: { spawn: 1.55, swarm: 0.55, dmg: 0.55, hp: 0.8, arc: 1.35 } } },
  brain: { name: 'BRAIN', time: 300, bg: 'bgBrain', clear: '#08041a', edge: '#6a7aff', win: 'THE MIND IS CLEAR', intro: 'BRAIN: RELIGHT THE SYNAPSES. LIT ONES SPARK',
    txt: { bar: 'SIGNAL', warn: 'BLACKOUT IN', end: 'THE BRAIN WENT DARK', low: 'SIGNAL FAILING! RELIGHT THE SYNAPSES', sab: 'SABOTEURS! THEY JAM THE SYNAPSES', p2: 'THE DARKNESS DEEPENS!', p3: 'STORM! THE SYNAPSES CRACKLE FASTER' },
    tune: { solo: { spawn: 0.6, swarm: 1.7, dmg: 1.7, hp: 1.3, sab: 0.53, arc: 0.53, grace: 25 }, camp: { spawn: 0.42, swarm: 2.4, dmg: 2.4, hp: 1.55, sab: 0.4, arc: 0.45, grace: 25 } },   // balanced with tools/sim; the first campaign level keeps a longer grace period
    ph: [120, 240], boss: 240, bossType: 'manflu',
    hints: [[4, 'GET CLOSE, THEN CLICK OR TAP A WEAK SPOT'], [14, 'POKE JAMMED SYNAPSES TO RELIGHT THEM'], [26, 'LIT SYNAPSES GIVE LIGHT. DARK ONES HIDE VIRUSES'], [40, 'POKED VIRUSES BECOME YOUR ALLIES']],
    web: [[0, 1], [0, 2], [0, 3], [0, 4], [1, 3], [2, 4], [3, 4], [3, 5], [4, 6], [1, 5], [2, 6], [1, 4], [2, 3], [1, 2, -80], [5, 6, 70]],
    fix: [[600, 170, 'syn'], [290, 300, 'syn'], [910, 300, 'syn'], [430, 540, 'syn'], [770, 540, 'syn'], [250, 740, 'syn'], [950, 740, 'syn']] },
  lung: { name: 'LUNGS', time: 300, bg: 'bgLung', clear: '#1c0d1c', edge: '#5aa8b8', win: 'THE LUNGS BREATHE EASY', intro: 'LUNGS: KEEP THE AIR SACS OPEN',
    txt: { bar: 'OXYGEN', warn: 'COLLAPSE IN', end: 'THE LUNGS COLLAPSED', low: 'OXYGEN LOW! POKE THE SACS OPEN', sab: 'SABOTEURS! THEY CLOG THE AIR SACS', p2: 'SICK SACS SPIT FASTER! AVOID SLIME', p3: 'COUGHING FITS! BRACE YOURSELF' },
    tune: { solo: { spawn: 0.67, swarm: 1.5, dmg: 1.5, hp: 1.22, sab: 0.33, arc: 0.48 }, camp: { spawn: 0.34, swarm: 2.9, dmg: 2.9, hp: 1.70, sab: 0.25, arc: 0.4 } },
    fix: [[300, 250], [600, 200], [900, 250], [200, 480], [460, 470], [740, 470], [1000, 480], [360, 730], [840, 730]] },
  heart: { name: 'HEART', time: 300, bg: 'bgHeart', clear: '#14040a', edge: '#d04050', win: 'THE HEART BEATS STEADY', intro: 'HEART: KEEP THE RHYTHM, COOL THE FEVER',
    txt: { bar: 'RHYTHM', warn: 'ARREST IN', end: 'CARDIAC ARREST', low: 'RHYTHM FAILING! POKE THE VALVES', sab: 'SABOTEURS! THEY JAM THE VALVES', p2: 'FEVER SPIKES! WATCH THE STRIPES', p3: 'FEVER SURGES FROM THE CORE!' },
    tune: { solo: { spawn: 0.63, swarm: 1.6, dmg: 1.6, hp: 1.27, sab: 0.29, arc: 0.43 }, camp: { spawn: 0.31, swarm: 3.2, dmg: 3.2, hp: 1.79, sab: 0.25, arc: 0.33 } },
    fix: [[600, 170, 'pace'], [360, 440, 'valve'], [840, 440, 'valve'], [470, 720, 'valve'], [730, 720, 'valve']] },
  stomach: { name: 'STOMACH', time: 300, bg: 'bgStomach', clear: '#1c1206', edge: '#d0a030', win: 'THE STOMACH SETTLED', intro: 'STOMACH: KEEP THE GLANDS SEALED. SEALED GLANDS SHIELD FROM ACID',
    txt: { bar: 'MUCUS', warn: 'PERFORATION IN', end: 'THE STOMACH WALL GAVE WAY', low: 'MUCUS LOW! POKE THE GLANDS SEALED', sab: 'SABOTEURS! THEY ERODE THE GLANDS', p2: 'THE ACID RISES! STAY NEAR SEALED GLANDS', p3: 'ACID FLOOD! GET OFF THE FLOOR' },
    tune: { solo: { spawn: 0.74, swarm: 1.35, dmg: 1.35, hp: 1.16, sab: 0.74, arc: 0.74 }, camp: { spawn: 0.29, swarm: 3.4, dmg: 3.4, hp: 1.84, sab: 0.3, arc: 0.31 } },
    ph: [100, 200], boss: 200, bossType: 'ulcer',
    hints: [[4, 'GET CLOSE, THEN CLICK OR TAP A WEAK SPOT'], [14, 'ACID RISES FROM THE BOTTOM AND BURNS YOU'], [26, 'SEALED GLANDS PROTECT THE GROUND AROUND THEM']],
    fix: [[300, 200, 'gland'], [600, 170, 'gland'], [900, 200, 'gland'], [200, 470, 'gland'], [600, 450, 'gland'], [1000, 470, 'gland'], [360, 720, 'gland'], [840, 720, 'gland']] },
  blood: { name: 'BLOODSTREAM', time: 300, bg: 'bgBlood', clear: '#1a0610', edge: '#e04a6a', win: 'THE BLOOD IS CLEAN', intro: 'BLOODSTREAM: KEEP THE VESSELS OPEN. THE CURRENT CARRIES EVERYONE',
    txt: { bar: 'FLOW', warn: 'CIRCULATION LOSS IN', end: 'THE BLOOD STOPPED FLOWING', low: 'FLOW FAILING! CLEAR THE VESSELS', sab: 'SABOTEURS! THEY CLOT THE VESSELS', p2: 'THE CURRENT GROWS STRONGER!', p3: 'THE CURRENT SURGES BACK AND FORTH!' },
    tune: { solo: { spawn: 1.18, swarm: 0.85, dmg: 0.85, hp: 0.92, sab: 0.25, arc: 0.95 }, camp: { spawn: 0.34, swarm: 2.9, dmg: 2.9, hp: 1.70, sab: 0.2, arc: 0.35 } },
    ph: [100, 200], boss: 200, bossType: 'sepsis',
    hints: [[4, 'GET CLOSE, THEN CLICK OR TAP A WEAK SPOT'], [14, 'THE CURRENT CARRIES EVERYTHING ALONG ITS CANAL. THE WALLS HAVE GAPS'], [26, 'POKE CLOTTED VESSELS OPEN TO KEEP THE BLOOD FLOWING']],
    fix: [[200, 112, 'vessel'], [700, 112, 'vessel'], [450, 337, 'vessel'], [1000, 337, 'vessel'], [150, 562, 'vessel'], [700, 562, 'vessel'], [450, 787, 'vessel'], [1000, 787, 'vessel']] },
};
const BOSSES = { manflu: 'MAN FLU', ulcer: 'ULCER', sepsis: 'SEPSIS' };
const FIXNAMES = { gland: ['SEALED', 'LEAKING', 'ERODED'], vessel: ['OPEN', 'NARROW', 'CLOTTED'], syn: ['LIT', 'DIM', 'DARK'], sac: ['OPEN', 'CLOGGED', 'COLLAPSED'], valve: ['OPEN', 'STIFF', 'STUCK'], pace: ['STEADY', 'ERRATIC', 'STALLED'] };
const LEVEL_KEYS = Object.keys(LEVELS);
const CAMPAIGN = ['classic', 'brain', 'lung', 'heart', 'stomach', 'blood'];            // the campaign plays these in order, upgrades carry over
const LEVEL_SEL = ['campaign', 'brain', 'lung', 'heart', 'stomach', 'blood', 'classic'];
let playMode = 1;   // 1 = single player, 2 = hosting online: both pick a level next
let lvSel = 'campaign';   // what the title screen has selected
let lvKey = 'brain';      // the level that is actually loaded
let camp = null;          // campaign progress while playing it: { i, S0 } (S0 = upgrades at the start of this level)
const lvl = () => LEVELS[lvKey];
// per-level difficulty multipliers (spawn/swarm/sab/arc: >1 = fewer; dmg/hp: >1 = tougher), one set for playing the level on its
// own and one for the campaign, where upgrades carried over from earlier levels make the player stronger
const tuneSet = () => { const t = lvl().tune; return t && (camp && camp.S0 && t.camp ? t.camp : t.solo); };
const SOFT = 0.75;   // slower level-ups mean a weaker player at any moment, so every level's pressure is eased by this share of its tuning
const ease = k => {
  const t = tuneSet(), v = (t && t[k]) || 1;
  return k === 'grace' ? v : 1 + (v - 1) * SOFT;
};
const GRACE = () => ease('grace') > 1 ? ease('grace') : 15;   // seconds the signal may stay below 15% before you lose

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
let AC = null, AU = null; const sfxT = {};   // AC: gameplay sounds (frozen while the game is held), AU: sounds of the pause screens themselves
const UI_SFX = new Set(['lvl', 'pick', 'end', 'start']);
let uiSfx = false;   // set while the Man Flu scene runs, so its own sounds are not frozen with the rest
function mkAudio() { try { return new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' }); } catch (e) { return null; } }
function initAudio() {
  if (!AC) { AC = mkAudio(); AU = mkAudio(); }
  for (const c of [AC, AU]) if (c && c.state !== 'running') c.resume().catch(() => {});
}
const gameHeld = () => state === 'paused' || state === 'levelup' || state === 'over' || !!G.cine;
let acHeld = false;
// AudioContext.suspend()/resume() lag by seconds on some browsers, so the context keeps running and the gameplay
// sounds are tracked by hand: on hold each one is cut and its unplayed rest is stored, on resume the rest is played.
let live = [], rest = [];
function voice(ctx, f, d, type, vol, slide, track) {
  const t = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + d);
  if (track) { const v = { o, g, t, f, d, type, vol, slide }; live.push(v); o.onended = () => { live = live.filter(x => x !== v); }; }
}
function syncAudio() {
  if (!AC) return;
  const h = gameHeld();
  if (h === acHeld) return;
  acHeld = h;
  const now = AC.currentTime;
  if (h) {
    for (const v of live) {
      const e = now - v.t, r = v.d - e;
      v.o.onended = null;
      try { v.g.gain.cancelScheduledValues(0); v.g.gain.value = 0; v.o.stop(); } catch (x) {}
      if (r > 0.03) {
        const k = e / v.d, f2 = v.slide ? Math.max(30, v.f) * Math.pow(Math.max(30, v.f + v.slide) / Math.max(30, v.f), k) : v.f;
        rest.push({ f: f2, d: r, type: v.type, vol: v.vol * Math.pow(0.0001 / v.vol, k), slide: v.slide ? (v.f + v.slide) - f2 : 0 });
      }
    }
    live = [];
  } else {
    if (AC.state === 'running') for (const r of rest) voice(AC, r.f, r.d, r.type, r.vol, r.slide, true);
    rest = [];
  }
}
function sfx(key, f, d = 0.07, type = 'square', vol = 0.025, slide = 0) {
  if (evq) evq.push(['s', key, f, d, type, vol, slide]);
  const own = UI_SFX.has(key) || uiSfx;
  const ctx = own ? AU : AC;
  if (!ctx || (!own && acHeld)) return;
  if (ctx.state !== 'running') { ctx.resume().catch(() => {}); return; }   // the browser still mutes the page (e.g. Safari auto-play): a late sound is worse than none
  const t = ctx.currentTime;
  if (sfxT[key] && t - sfxT[key] < 0.04) return;
  sfxT[key] = t;
  voice(ctx, f, d, type, vol, slide, !own);
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
const touch = { move: null, aim: null, fire: null };   // fire: pointer holding the FIRE button (manual fire only)
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
const fsBtnPlay = () => ({ x: VIEW_W - 34, y: 42, w: 14, h: 13 });
const btnW = label => Math.max(66, label.length * FONT_ADV + 10);   // translated labels can be longer than the English ones
const fsBtnTitle = () => { const w = btnW(tr(isFullscreen() ? 'WINDOWED' : 'FULLSCREEN')); return { x: VIEW_W - 4 - w, y: 4, w, h: 14 }; };
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
// Auto fire off in the settings = manual fire: you shoot only while holding FIRE (F, right mouse button, gamepad B or the on-screen button).
// The host's setting counts for everyone; guests learn it from the snapshot.
const manualFire = () => isGuest() ? !!G.manualFire : !settings.autoFire;
function toggleFire(idx) {   // shooting on/off, per player (once unlocked)
  if (!S.shoot || manualFire()) return;
  const me = isGuest() ? players[meIdx()] : players[idx];
  if (!me || me.down) return;
  if (isGuest()) { relay({ k: 'fire' }); tip(me.x, me.y - 14, me.autoFire ? 'FIRE OFF' : 'FIRE ON', '#ffd88a'); return; }
  me.autoFire = !me.autoFire;
  tip(me.x, me.y - 14, me.autoFire ? 'FIRE ON' : 'FIRE OFF', '#ffd88a');
  sfx('fire', me.autoFire ? 600 : 300, 0.06, 'square', 0.02);
}
const fireBtn = () => manualFire() ? { x: VIEW_W - 84, y: VIEW_H - 118, w: 60, h: 22 } : { x: VIEW_W - 78, y: VIEW_H - 112, w: 54, h: 14 };
const pauseBtn = () => ({ x: VIEW_W - 18, y: 42, w: 14, h: 13 });
const inRect = (r, x, y) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
function doPause() { if (isGuest()) relay({ k: 'pause' }); else togglePause(); }

canvas.addEventListener('pointerdown', e => {
  e.preventDefault(); initAudio(); toView(e);
  const fingers = e.pointerType !== 'mouse';
  if (fingers) touchUI = true;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
  if (state === 'play') {
    if (!fingers) { if (e.button === 2) { mouse.rdown = true; toggleFire(0); } else pokeClick(false); return; }   // right click toggles shooting (or holds fire)
    if (inRect(pauseBtn(), mouse.sx, mouse.sy)) { doPause(); return; }
    if (fsAvail() && inRect(fsBtnPlay(), mouse.sx, mouse.sy)) { requestFs('toggle', e); return; }
    if (S.shoot && inRect(fireBtn(), mouse.sx, mouse.sy)) { if (manualFire()) touch.fire = e.pointerId; else toggleFire(0); return; }
    if (pokeClick(true)) return;   // a tap right on a weak spot pokes it instead of starting a stick
    const st = { id: e.pointerId, ox: mouse.sx, oy: mouse.sy, x: mouse.sx, y: mouse.sy };
    if (mouse.sx < VIEW_W / 2) { if (!touch.move) touch.move = st; } else if (!touch.aim) touch.aim = st;
    return;
  }
  if (state === 'title') {
    if (fsAvail() && inRect(fsBtnTitle(), mouse.sx, mouse.sy)) { requestFs('toggle', e); return; }
    const m = titleBtnAt(mouse.sx, mouse.sy);
    if (m) { if (fingers && fsAvail() && m < 4) requestFs('enter', e); titleChoice(m); }   // starting a game on a phone goes fullscreen
  }
  else if (state === 'levels') { if (inRect(powBackBtn(), mouse.sx, mouse.sy)) state = 'title'; else { const t = levelTiles().find(t => inRect(t, mouse.sx, mouse.sy)); if (t) pickLevel(t.key); } }
  else if (state === 'lobby') lobbyTap();
  else if (state === 'powers') { if (inRect(powBackBtn(), mouse.sx, mouse.sy)) state = 'title'; }
  else if (state === 'settings') settingsTap();
  else if (state === 'over' && G.overT > 0.3 && inRect(menuBtn(), mouse.sx, mouse.sy)) toMenu();
  else if (state === 'over' && G.overT > 0.7 && !isGuest()) overContinue();
  else if (state === 'levelup') { const i = cardAt(mouse.sx, mouse.sy); if (i >= 0) pickUpgrade(i); }
  else if (state === 'paused') {
    if (pauseSettings) settingsTap();
    else if (inRect(pauseBtns().set, mouse.sx, mouse.sy)) pauseSettings = true;
    else if (inRect(pauseBtns().menu, mouse.sx, mouse.sy)) toMenu();
    else doPause();   // a tap anywhere else resumes
  }
});
canvas.addEventListener('pointermove', e => {
  toView(e);
  for (const k of ['move', 'aim']) if (touch[k] && touch[k].id === e.pointerId) { touch[k].x = mouse.sx; touch[k].y = mouse.sy; }
});
const endPointer = e => {
  if (fsPending && e.pointerType !== 'mouse') { const m = fsPending; fsPending = null; setFullscreen(m); }
  for (const k of ['move', 'aim']) if (touch[k] && touch[k].id === e.pointerId) touch[k] = null;
  if (touch.fire === e.pointerId) touch.fire = null;
  if (e.pointerType === 'mouse' && e.button === 2) mouse.rdown = false;
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
  if (m < 5) camp = null;   // a new run from the title always starts the campaign from the beginning
  if (m === 1 || m === 2) { playMode = m; state = 'levels'; }
  else if (m === 3) { lobby = { mode: 'join', code: '', msg: '' }; state = 'lobby'; }
  else if (m === 6) state = 'powers';
  else if (m === 7) state = 'settings';
}
function pickLevel(key) {
  lvSel = key; lvKey = key === 'campaign' ? CAMPAIGN[0] : key; camp = null; newGame(false);
  if (playMode === 1) startGame(false);
  else { lobby = { mode: 'host', code: '', msg: 'CONNECTING...' }; state = 'lobby'; netConnect('host'); }
}
function pickUpgrade(i) { if (isGuest()) relay({ k: 'pick', i }); else chooseUpgrade(i); }
function togglePause() { pauseSettings = false; if (state === 'play') state = 'paused'; else if (state === 'paused') state = 'play'; }
function onKey(k) {
  if (state === 'lobby') {
    if (k === 'escape') lobbyPress('BACK');
    else if (k === 'backspace') lobbyPress('DEL');
    else if (k === 'enter') lobbyPress('GO');
    else if (k.length === 1 && CODE_KEYS.includes(k.toUpperCase())) lobbyPress(k.toUpperCase());
  }
  else if (state === 'title') { if (k === '1' || k === 'enter' || k === ' ') titleChoice(1); else if ('23'.includes(k) && k) titleChoice(+k); else if (k === 'p') titleChoice(6); else if (k === 's') titleChoice(7); }
  else if (state === 'settings' || (state === 'paused' && pauseSettings)) settingsKey(k);
  else if (state === 'levels') { if (k === 'escape' || k === 'backspace') state = 'title'; else if (k >= '1' && k <= '7') pickLevel(LEVEL_SEL[+k - 1]); }
  else if (state === 'powers') { if (k === 'escape' || k === 'enter' || k === ' ' || k === 'p') state = 'title'; }
  else if (state === 'over' && G.overT > 0.3 && (k === 'm' || k === 'escape')) toMenu();
  else if (state === 'over' && G.overT > 0.7 && (k === 'enter' || k === ' ') && !isGuest()) overContinue();
  else if (state === 'levelup' && '123'.includes(k) && k) pickUpgrade(+k - 1);
  else if (state === 'play' && k === ' ') pokeNearestKey(0);
  else if (state === 'play' && k === 'f') toggleFire(0);
  else if (state === 'paused' && k === 's') pauseSettings = true;
  else if (state === 'paused' && k === 'm') toMenu();
  else if (k === 'p' || k === 'escape') doPause();
}
function gamepads() { try { return [...navigator.getGamepads()].filter(Boolean); } catch (e) { return []; } }
// movement + optional explicit aim for one player.
// WASD / arrows + mouse, or the first gamepad. (Online co-op: the other player is remote.)
function readInput(p) {
  const K = k => keys[k] ? 1 : 0;
  let mx = 0, my = 0, aim = null, poke = false, toggle = false, fire = !!keys['f'] || !!mouse.rdown || touch.fire !== null;
  mx = K('d') - K('a') + K('arrowright') - K('arrowleft'); my = K('s') - K('w') + K('arrowdown') - K('arrowup');
  const pad = gamepads()[0];
  if (pad) {
    const dz = v => Math.abs(v) < 0.2 ? 0 : v;
    mx += dz(pad.axes[0] || 0); my += dz(pad.axes[1] || 0);
    const down = !!(pad.buttons[0] && pad.buttons[0].pressed);
    poke = down && !p.padDown; p.padDown = down;
    const down2 = !!(pad.buttons[1] && pad.buttons[1].pressed);
    toggle = down2 && !p.padDown2; p.padDown2 = down2; if (down2) fire = true;   // button B / circle toggles shooting   // button A / cross pokes the nearest weak spot
    const rx = dz(pad.axes[2] || 0), ry = dz(pad.axes[3] || 0);
    if (rx || ry) aim = Math.atan2(ry, rx);
  }
  if (touchUI) {
    const m = stickVec(touch.move, 0.12), a = stickVec(touch.aim, 0.3);
    if (m) { mx += m.x; my += m.y; }
    if (a && a.l > 0) aim = Math.atan2(a.y, a.x);
  }
  return { mx, my, aim, poke, toggle, fire };
}

// ---------------------------------------------------------------- state
let state = 'title';
let pauseSettings = false;   // the settings screen opened from the pause menu (the run stays frozen underneath)
let G, S, players, organs, choices = [], cam = { x: 0, y: 0 };

// player settings (kept in localStorage): auto level-up picks upgrades by itself so play is never interrupted,
// auto fire is whether shooting starts switched on (F still toggles it during play)
const settings = (() => { try { return { autoLevel: false, autoFire: true, lang: 'en', ...JSON.parse(localStorage.getItem('vaccine.settings') || '{}') }; } catch (e) { return { autoLevel: false, autoFire: true, lang: 'en' }; } })();
setLang(settings.lang);
function saveSettings() { try { localStorage.setItem('vaccine.settings', JSON.stringify(settings)); } catch (e) { /* private mode */ } }
// cross-level progression: beating a level unlocks a power that can then show up in the level-up choices (kept in localStorage)
const UNLOCKS = { brain: 'plight', lung: 'pslime', heart: 'pray' };
const loadUnlocks = () => { try { return new Set(JSON.parse(localStorage.getItem('vaccine.unlocks') || '[]')); } catch (e) { return new Set(); } };
let unlocked = loadUnlocks();
let hasPet = (() => { try { return localStorage.getItem('vaccine.pet') === '1'; } catch (e) { return false; } })();   // the Man Flu pet follows you through every level once earned
function saveUnlocks() { try { localStorage.setItem('vaccine.unlocks', JSON.stringify([...unlocked])); } catch (e) { /* private mode */ } }
const UPGRADES = [
  { id: 'aura',   name: 'ANTISEPTIC AURA',  desc: 'HURTS VIRUSES AROUND YOU' },
  { id: 'orbit',  name: 'PLATELET ORBIT',   desc: 'PLATELETS CIRCLE YOU AND SMASH' },
  { id: 'shoot',  name: 'ANTIBODY SHOT',    desc: 'UNLOCKS SHOOTING AT NEAR VIRUSES', max: 1 },
  { id: 'split',  name: 'MITOSIS',          desc: 'SPLIT OFF CHILD ALLIES REGULARLY' },
  { id: 'rate',   name: 'RAPID ANTIBODIES', desc: 'SHOOT FASTER', needs: 'shoot' },
  { id: 'multi',  name: 'SPLIT ANTIBODY',   desc: '+1 SHOT PER VOLLEY', needs: 'shoot' },
  { id: 'dmg',    name: 'STRONG ANTIBODY',  desc: 'SHOTS HIT HARDER', needs: 'shoot' },
  { id: 'speed',  name: 'SWIFT CELL',       desc: 'RUN FASTER' },
  { id: 'magnet', name: 'CYTOKINE PULL',    desc: 'PULL XP FROM FURTHER AWAY' },
  { id: 'regen',  name: 'IMMUNE MEMORY',    desc: 'SHAKE OFF INFECTION FASTER' },
  { id: 'reach',  name: 'LONG TAIL',        desc: 'POKE WEAK SPOTS FROM FARTHER OUT' },
  { id: 'plight', name: 'STATIC SHOCK',     desc: 'LIGHTNING ZAPS NEARBY VIRUSES', unlock: 'brain', info: 'LIGHTNING STRIKES VIRUSES NEAR YOU. UPGRADES: MORE BOLTS, MORE DAMAGE' },
  { id: 'pslime', name: 'PHAGE SLIME',      desc: 'SLIME STICKS NEARBY VIRUSES', unlock: 'lung', info: 'SPITS SLIME THAT FREEZES VIRUSES. UPGRADES: MORE GLOBS, BIGGER PUDDLES' },
  { id: 'pray',   name: 'FEVER BEAM',       desc: 'HORIZONTAL RAY, LONG RANGE', unlock: 'heart', info: 'A LONG HORIZONTAL RAY THROUGH VIRUSES. UPGRADES: LONGER AND STRONGER' },
];
const MAX_UP = 5;
const PCOL = ['#8fd0ff', '#ffc070'];   // per-player UI colours

const mkPlayer = (idx, x, y) => ({ fx: { speed: 0, slow: 0, shield: 0, poke: 0, bloat: 0 }, stuckT: 0, slimeImm: 0, mass: 1, splitT: 0, splitting: 0, splitBase: 0, kx: 0, ky: 0, kickT: 0, autoFire: settings.autoFire, padDown2: false, tail: null, tailG: null, pokeCd: 0, padDown: false, idx, x, y, vx: 0, vy: 0, infection: 0, hitT: 9, bob: 0, aim: 0, flash: 0,
  scheme: idx, remote: false, netInp: null, fireCd: 0, orbitA: idx * Math.PI, auraT: 0, down: false, reviveT: 0, inp: { mx: 0, my: 0, aim: null } });

function newGame(co) {
  coop = !!co;
  G = { fix: [], bolts: [], beat: 0, flowA: 0, phase: 1, suffT: 0, sabT: 14, mucT: 12, coughT: 20, cough: null, lowWarn: false, slimes: [], globs: [], pb: [], pr: [], pg: [], ps: [], fp: [], holes: [], beams: [], pills: [], pillT: rand(12, 20), vacuumT: 0, tips: [], t: 0, kills: 0, conv: 0, units: [], projs: [], gems: [], parts: [], nextId: 1,
        spawnT: 2, nextSwarm: 40, msg: '', msgT: 0, shake: 0, overT: 0, result: '', reason: '' };
  // team-wide progression: one level, one XP bar, one set of upgrades shared by everybody
  S = { level: 1, xp: 0, next: 8, res: 0, scale: 1, speed: 72, fireRate: 3, shots: 1, dmg: 12, magnet: 36, regen: 1, reach: 52, shoot: false, up: {} };
  players = coop ? [mkPlayer(0, CFG.W / 2 - 16, 600), mkPlayer(1, CFG.W / 2 + 16, 600)] : [mkPlayer(0, CFG.W / 2, 600)];
  G.pet = hasPet ? { x: players[0].x - 14, y: players[0].y + 8, vx: 0, vy: 0 } : null;
  organs = lvKey !== 'classic' ? [] : ORGANS.map((d, i) => ({ ...d, i, team: 'i', hp: 150, maxHp: 150, r: 18, weakA: rand(0, 6.28),
    weakS: rand(0.25, 0.45), arc: 0.28, spawnT: 0, spawnMax: 0, cvT: 0, flash: 0 }));
  organs.forEach(o => { o.spawnT = o.spawnMax = rand(6, 12); });
  G.fix = (lvl().fix || []).map(([x, y, kind = 'sac'], i) => ({ fix: true, kind, i, x, y, r: 15, st: 0, cd: 0, weakA: rand(0, 6.283), weakS: rand(0.3, 0.5), hackP: 0, hackN: 0 }));
  G.edges = lvl().web || [];   // brain: neuron lanes between the synapses (decoration: they carry the data-flow pulses)
  G.sabT = 20 * ease('sab'); G.hintI = 0;
  if (lvl().intro) say(lvl().intro);
  updateCam();
}
function startGame(co) {
  if (lvSel === 'campaign') { if (!camp) camp = { i: 0, S0: null }; lvKey = CAMPAIGN[camp.i]; }
  newGame(co);
  if (camp && camp.S0) S = JSON.parse(JSON.stringify(camp.S0));   // upgrades earned so far come along
  if (net && net.role === 'host') players[1].remote = true;
  state = 'play'; sfx('start', 300, 0.25, 'square', 0.04, 400);
}
const menuLabel = () => tr('MENU') + (touchUI ? '' : ' [M]');
const pauseBtns = () => { const ws = btnW(setLabel()), wm = btnW(menuLabel()), y = VIEW_H / 2 + 22; return { set: { x: VIEW_W / 2 - 2 - ws, y, w: ws, h: 14 }, menu: { x: VIEW_W / 2 + 2, y, w: wm, h: 14 } }; };
const menuBtn = () => ({ x: VIEW_W / 2 - 40, y: VIEW_H - 19, w: 80, h: 14 });
function toMenu() { camp = null; pauseSettings = false; netDown(''); }   // back to the title screen (also leaves an online game)
// after a round: campaign win -> next organ (carrying the upgrades), loss -> retry that organ, final win -> start over
function overContinue() {
  if (camp && G.result === 'win') { if (camp.i < CAMPAIGN.length - 1) { camp.i++; camp.S0 = JSON.parse(JSON.stringify(S)); } else camp = null; }
  startGame(coop);
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
  const T = TYPES[type], hpm = team === 'v' ? (1 + G.t / 300) * ease('hp') : 1;
  const u = { id: G.nextId++, team, type, x, y, vx: 0, vy: 0, r: T.r, hp: T.hp * hpm, maxHp: T.hp * hpm,
    speed: T.speed * rand(0.9, 1.1), dmg: T.dmg, arc: T.arc, weakA: rand(0, 6.28),
    weakS: rand(0.35, 0.8) * (Math.random() < 0.5 ? -1 : 1), atkCd: rand(0, 0.5), born: G.t, stuckT: 0, slimeImm: 0, flash: 0, cvT: 0, convCd: team === 'v' ? rand(6, 18) : rand(1.5, 5), tail: null,
    tgt: null, think: rand(0, 0.3), dead: false, hitCd: 0, boss: !!BOSSES[type] };
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
    const sp = { x: clamp(c.x + Math.cos(a) * d, 10, CFG.W - 10), y: clamp(c.y + Math.sin(a) * d, 10, CFG.H - 10) };
    wallPush(sp, 8); const x = sp.x, y = sp.y;
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
    if (u.boss) { for (let i = 0; i < 8; i++) dropGem(u.x + rand(-20, 20), u.y + rand(-20, 20), 3); G.shake = 6; say(BOSSES[u.type] + ' DEFEATED!'); }
    burst(u.x, u.y, TYPES[u.type].col, 8); sfx('kill', 180, 0.08, 'square', 0.02, -80);
  } else burst(u.x, u.y, '#8fd0ff', 8);
}
function damageUnit(u, d) { if (u.morph) return; u.hp -= d; u.flash = 0.1; if (u.hp <= 0) kill(u); }

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
  u.hp = u.maxHp * 0.7; u.cvT = 1.2; u.flash = 0.25; u.tgt = null; u.think = 0; u.convCd = u.team === 'v' ? rand(14, 20) : rand(4, 6); u.tail = null;
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
const XP_K = 4 / 3;   // xp per level; a third more than the original curve means a quarter fewer level-ups
function gainXp(v) { S.xp += v; checkLevel(); }
function checkLevel() {
  if (state !== 'play' || S.xp < S.next) return;
  S.xp -= S.next; S.level++;
  S.next = Math.round((4 + S.level * 4.5) * XP_K);
  S.res = Math.min(0.55, 1 - Math.pow(0.94, S.level - 1));   // capped: you can never become immune
  S.scale = Math.min(2.4, 1 + 0.08 * (S.level - 1));
  for (const p of players) { p.infection = Math.max(0, p.infection - 8); burst(p.x, p.y, '#8fd0ff', 24, 90); }
  const pool = UPGRADES.filter(u => (S.up[u.id] || 0) < (u.max || MAX_UP) && (!u.needs || S[u.needs]) && (!u.unlock || unlocked.has(u.id)));
  choices = pool.sort(() => Math.random() - 0.5).slice(0, 3);
  const first = pool.find(u => u.id === 'shoot');   // the very first level-up always offers the shooting unlock
  if (S.level === 2 && first && !choices.includes(first)) choices[0] = first;
  sfx('lvl', 400, 0.4, 'square', 0.05, 600);
  if (!choices.length) {   // everything maxed: full heal instead of an empty menu
    for (const p of players) p.infection = 0;
    say('LEVEL UP! FULLY HEALED'); checkLevel(); return;
  }
  if (settings.autoLevel && !isGuest()) {   // no menu: take the shooting unlock when offered, otherwise a random one of the three
    const i = Math.max(0, choices.findIndex(c => c.id === 'shoot'));
    tip(players[0].x, players[0].y - 22, 'LEVEL UP: ' + choices[i].name, '#8fd0ff');
    chooseUpgrade(i); return;
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
  const pw = win && !isGuest() && UNLOCKS[lvKey];
  if (pw && !unlocked.has(pw)) { unlocked.add(pw); saveUnlocks(); G.newPower = pw; }
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
  if (u.boss) return nearestPlayer(u);   // Man Flu only wants you
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
  if (G.fix.length) {   // allies go for saboteurs first: they are what wrecks the level
    let sab = null, sd = 170;
    for (const v of G.units) if (v.team === 'v' && v.type === 'saboteur' && !v.dead) { const d = dist(u, v); if (d < sd) { sd = d; sab = v; } }
    if (sab) return sab;
  }
  const e = nearestEnemy(u, 3);
  if (e) return e;
  let best = null, bd = 300;
  for (const v of G.units) if (v.team === 'v' && !v.dead) { const d = dist(u, v); if (d < bd) { bd = d; best = v; } }
  if (best) return best;
  const np = nearestPlayer(u);   // allies do not cure infected organs: that is the player's job
  return np && dist(u, np) > 50 ? np : null;
}

// ---- poking: the only way to turn a virus (or cure an organ) is to poke its glowing weak spot with the tail.
// You must be within reach, then click / tap the weak spot (or press the poke key / button for the nearest one).
const reachOf = p => (S.reach + 6 * (S.scale - 1)) * (p && p.fx && p.fx.poke > 0 ? 1.5 : 1);
const isOrgan = t => t.tag !== undefined;
const canRepair = f => f.st > 0;                 // air sacs: only players repair them, viruses clog them
const canBreak = f => f.st < 2 && f.cd <= 0;
const spotOf = t => ({ x: t.x + Math.cos(t.weakA) * t.r, y: t.y + Math.sin(t.weakA) * t.r });
function pokeables() {
  const out = [];
  for (const u of G.units) if (u.team === 'v' && !u.dead && !u.boss && (u.cvT || 0) <= 0) out.push(u);
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
  f.st = Math.max(0, f.st - 1); f.cd = 8; f.hackP = 0; G.fixed = (G.fixed || 0) + 1;   // clogging is paused for a while after a repair
  burst(f.x, f.y, '#7fe8ff', 14, 70); tip(f.x, f.y - 20, f.st ? 'BETTER' : 'OPEN!', '#7fffd0');
  dropGem(f.x, f.y, 2); sfx('conv', 600, 0.15, 'sine', 0.04, 400);
}
function clogFix(f) {
  f.st = Math.min(2, f.st + 1); f.cd = 3; f.hackP = 0;
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
const oxy = () => {   // lungs: how open the air sacs are (oxygen). heart: how well the valves and pacemaker work (rhythm; the pacemaker counts double)
  if (!G.fix.length) return 1;
  let s = 0, w = 0;
  for (const f of G.fix) { const k = f.kind === 'pace' ? 2 : 1; s += k * (f.st === 0 ? 1 : f.st === 1 ? 0.5 : 0); w += k; }
  return s / w;
};
const spdMul = p => (p.fx.speed > 0 ? 1.5 : 1) * (p.fx.slow > 0 ? 0.5 : 1) * (p.fx.bloat > 0 ? 0.8 : 1) * (lvKey === 'lung' ? 0.65 + 0.35 * oxy() : 1);
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
  if (!isPlayer && e.team === 'v') for (const sl of G.ps) if (Math.hypot(e.x - sl.x, e.y - sl.y) < sl.r * 1.1 + r * 0.6) { e.stuckT = 3; burst(e.x, e.y, PCOL[sl.pi || 0], 6, 40); return; }   // the players' own slime only catches viruses
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
      lung.spitT = Math.max(3.5, 7 - G.t / 90) * ease('arc') * rand(0.8, 1.2);
      const n = 1 + (G.t > 120 ? 1 : 0) + (G.t > 240 ? 1 : 0) + (players.length > 1 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        let tx, ty;
        if (Math.random() < 0.5) { const p = pickP(); tx = p.x + rand(-40, 40); ty = p.y + rand(-40, 40); }
        else { const a = rand(0, 6.283), d = rand(60, 240); tx = lung.x + Math.cos(a) * d; ty = lung.y + Math.sin(a) * d; }
        G.globs.push({ sx: lung.x, sy: lung.y, tx: clamp(tx, 20, CFG.W - 20), ty: clamp(ty, 20, CFG.H - 20), t: 0, dur: 2.2 + rand(0, 0.4) });
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
      heart.rayT = Math.max(4.5, 8.5 - G.t / 100) * ease('arc') * rand(0.85, 1.15);
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
    for (const p of alive) if (hit(p.x, p.y, 5 * S.scale)) { p.infection += 32 * ease('dmg') * dt * (p.fx.shield > 0 ? 0.5 : 1); p.hitT = 0; p.flash = 0.1; }
    if (Math.random() < 0.7) { const d = rand(10, b.len); G.parts.push({ x: b.x + ca * d, y: b.y + sa * d, vx: rand(-20, 20), vy: rand(-30, -5), life: 0.4, max: 0.4, col: b.c ? (Math.random() < 0.5 ? '#a0c8ff' : '#5a8aff') : (Math.random() < 0.5 ? '#ffb040' : '#ff6a1a'), sz: 2 }); }
  }
  G.beams = G.beams.filter(b => b.t < b.warn + b.fire);

  // ---- medicine loot: random pills appear; the effect is a surprise (mostly helpful, sometimes not)
  G.vacuumT = Math.max(0, G.vacuumT - dt);
  G.pillT -= dt;
  if (G.pillT <= 0 && alive.length) {
    G.pillT = rand(18, 30);
    if (G.pills.length < 3) {
      const c = pickP(), a = rand(0, 6.283), d = rand(70, 200);
      const pill = { x: clamp(c.x + Math.cos(a) * d, 20, CFG.W - 20), y: clamp(c.y + Math.sin(a) * d, 20, CFG.H - 20), life: 25 };
      wallPush(pill, 10); G.pills.push(pill);
    }
  }
  for (const h of G.holes) {   // craters eaten into the wall by the Ulcer: acid pools that blink before they close
    if (h.life < 4 && Math.floor(G.t * 6) % 2) continue;
    const x = h.x - cam.x + shx, y = h.y - cam.y + shy, pu = 0.5 + 0.5 * Math.sin(G.t * 5 + h.x);
    ctx.fillStyle = '#3a1604'; ctx.beginPath(); ctx.arc(x, y, h.r + 2, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(255,140,40,' + (0.55 + 0.2 * pu) + ')'; ctx.beginPath(); ctx.arc(x, y, h.r, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(255,230,120,0.5)'; ctx.beginPath(); ctx.arc(x - h.r * 0.25, y - h.r * 0.25, h.r * 0.45, 0, 6.283); ctx.fill();
  }
  for (const pl of G.pills) {
    pl.life -= dt;
    for (const p of alive) if (Math.hypot(p.x - pl.x, p.y - pl.y) < 10 + 6 * S.scale) { takePill(p); pl.life = 0; break; }
  }
  G.pills = G.pills.filter(pl => pl.life > 0);
}

// ---------------------------------------------------------------- fixable levels (lungs, heart)
// Saboteur viruses clog the fixables; poking one repairs a step. The worse they get, the worse the organ's hazards.
// Lungs: inhale pulls everything up toward the trachea, exhale blows it down; sick sacs lob slime and breed slimelings;
// phase 3 adds telegraphed coughs. Heart: the pacemaker sets the beat (and a swirling blood current); sick valves and
// the pacemaker fire fever rays and breed ember cells; phase 3 adds fever surges from the core.
function breathY() {
  const ph = (G.t % 10) / 10;
  if (ph < 0.4) return -Math.sin(ph / 0.4 * Math.PI);
  if (ph >= 0.5 && ph < 0.9) return Math.sin((ph - 0.5) / 0.4 * Math.PI);
  return 0;
}
const TRACHEA = { x: 600, y: 30 }, HEART_C = { x: 600, y: 450 };
const beatPulse = () => Math.pow(Math.max(0, Math.sin(G.beat * 6.283)), 3);
// bloodstream: four horizontal lanes that flow in alternating directions. From phase 3 on the current swings back and forth.
const LANE_H = CFG.H / 4;
const flowK = () => { const t = lvl().ph[1]; return G.t < t ? 1 : Math.cos(Math.PI * (G.t - t) / 12); }
const flowSpeed = () => 34 * (1 + 0.25 * (G.phase - 1)) * flowK();
const laneDir = y => Math.floor(clamp(y, 0, CFG.H - 1) / LANE_H) % 2 ? -1 : 1;
// the lanes are canals: vessel walls between them stop movement and shots except at the gaps (g = x of each gap)
const WALL_HALF = 9, GAP_W = 170;
const BLOOD_WALLS = [{ y: LANE_H, g: [300, 900] }, { y: LANE_H * 2, g: [150, 600, 1050] }, { y: LANE_H * 3, g: [300, 900] }];
const laneOf = y => clamp(Math.floor(y / LANE_H), 0, 3);
const inGap = (w, x, r = 0) => w.g.some(g => Math.abs(x - g) < GAP_W / 2 - r);
function wallBlocks(x, y) { for (const w of BLOOD_WALLS) if (Math.abs(y - w.y) < WALL_HALF && !inGap(w, x)) return true; return false; }
function wallPush(e, r, py) {   // keep something of radius r out of the vessel walls; py is where it was before it moved
  if (lvKey !== 'blood') return;
  const from = py === undefined ? e.y : py;
  for (const w of BLOOD_WALLS) {
    const lim = WALL_HALF + r;
    if (Math.abs(e.y - w.y) >= lim || inGap(w, e.x, r * 0.5)) continue;
    e.y = from < w.y ? w.y - lim : w.y + lim;
    if (e.vy !== undefined) e.vy = 0;
  }
}
// where to head so you end up at (tx, ty): straight on in the same canal, otherwise to the nearest useful gap first
function routeTo(x, y, tx, ty) {
  const l = laneOf(y), lt = laneOf(ty);
  if (lvKey !== 'blood' || l === lt) return { x: tx, y: ty };
  const dir = lt > l ? 1 : -1, w = BLOOD_WALLS[dir > 0 ? l : l - 1];
  let gx = w.g[0], best = 1e9;
  for (const g of w.g) { const c = Math.abs(x - g) + Math.abs(g - tx); if (c < best) { best = c; gx = g; } }
  const near = Math.abs(x - gx) < GAP_W * 0.3 || Math.abs(y - w.y) < WALL_HALF + 24 && Math.abs(x - gx) < GAP_W * 0.45;
  return near ? { x: gx, y: w.y + dir * 60 } : { x: gx, y: y };
}
// stomach: acid rises from the bottom in waves (more with every weakened gland); sealed glands keep the ground around them safe
const GLAND_SAFE = 70;
const acidDepth = () => { const sick = G.fix.reduce((n, f) => n + (f.st > 0 ? 1 : 0), 0); return Math.min(500, [90, 170, 260][G.phase - 1] * (0.4 + 0.3 * (1 + Math.sin(G.t * 0.24))) + 22 * sick); };
const acidTop = () => CFG.H - acidDepth();
const acidSafe = p => G.fix.some(f => f.st === 0 && Math.hypot(f.x - p.x, f.y - p.y) < GLAND_SAFE);
function beatStep(dt) {   // runs on the host and on guests (cosmetic rhythm only needs the pacemaker state)
  if (lvKey === 'blood') G.flowA += dt * flowK();
  if (lvKey !== 'heart' || !G.fix.length) return;
  const st = G.fix[0].st, period = st === 0 ? 0.9 : st === 1 ? 0.75 + 0.3 * Math.sin(G.t * 1.7) : 0.55;
  G.beat += dt / period;
  G.flowA += dt * 0.5 * (0.35 + 0.65 * beatPulse()) * (1 + 0.5 * st);
}
const phaseNow = () => { const ph = lvl().ph || [90, 200]; return G.t > ph[1] ? 3 : G.t > ph[0] ? 2 : 1; };

// sick fixables breed little enemies (progress bar under them)
function sickSpawn(f, dt, fast, type) {
  f.spawnMax = (f.st === 2 ? 8 : 14) * fast;
  f.spawnT = (f.spawnT == null ? rand(3, f.spawnMax) : f.spawnT) - dt;
  if (f.spawnT <= 0) {
    f.spawnT = f.spawnMax;
    if (count('v') < CFG.MAX_VIRUS) { const a = rand(0, 6.283); addUnit('v', type, f.x + Math.cos(a) * 20, f.y + Math.sin(a) * 20); burst(f.x, f.y, TYPES[type].col, 8, 50); }
  }
}

const ALLY_T = 18;   // seconds between the allies a healthy objective produces
const HACK_T = 4.5, HACK_R = 34;   // seconds one saboteur needs to flip a fixable one step, and how close it must be to stay linked
function fixStep(dt, alive) {
  if (!G.fix.length) return;
  const T = lvl().txt, phase = phaseNow(), O = oxy();
  for (const f of G.fix) {
    f.weakA += f.weakS * dt; f.cd -= dt;
    if (f.hackN > 0 && canBreak(f)) {   // saboteurs linked to it are hacking it; more of them hack faster
      if (!f.hacking) { f.hacking = true; sfx('charge', 330, 0.5, 'square', 0.03, -200); }
      f.hackP += dt * (1 + 0.6 * (f.hackN - 1)) / HACK_T;
      if (f.hackP >= 1) { clogFix(f); f.hacking = false; }
    } else { f.hacking = false; f.hackP = Math.max(0, f.hackP - dt * 0.25); }
    f.hackN = 0;
    if (f.st === 0) {   // a healthy objective slowly produces an ally to help defend it
      f.allyMax = ALLY_T; f.allyT = (f.allyT == null ? rand(6, ALLY_T) : f.allyT) - dt;
      if (f.allyT <= 0) {
        f.allyT = ALLY_T;
        if (count('i') < CFG.MAX_ALLY) { const a = rand(0, 6.283); burst(f.x, f.y, '#7fe8ff', 8, 50); addUnit('i', 'basic', f.x + Math.cos(a) * 20, f.y + Math.sin(a) * 20); }
      }
    } else f.allyMax = 0;
  }
  beatStep(dt);
  if (phase !== G.phase) { G.phase = phase; say(phase === 2 ? T.p2 : T.p3); sfx('charge', 140, 0.6, 'sawtooth', 0.03, 200); }
  G.sabT -= dt;   // saboteurs
  if (G.sabT <= 0) {
    G.sabT = Math.max(6, 24 - G.t / 14) * ease('sab') * rand(0.8, 1.2) / (players.length > 1 ? 1.4 : 1);
    const n = 1 + (G.t > 120 ? 1 : 0) + (G.t > 220 ? 1 : 0);
    for (let i = 0; i < n; i++) spawnVirus('saboteur');
    if (!G.sabSaid) { G.sabSaid = true; say(T.sab); }   // only the first wave is announced
  }
  if (lvKey === 'heart') heartStep(dt, alive, phase); else if (lvKey === 'brain') brainStep(dt, alive, phase); else if (lvKey === 'stomach') stomachStep(dt, alive, phase); else if (lvKey === 'blood') bloodStep(dt, alive, phase); else lungStep(dt, alive, phase);
  if (O < 0.3 && !G.lowWarn) { G.lowWarn = true; say(T.low); } else if (O > 0.5) G.lowWarn = false;
  if (O < 0.15) { G.suffT += dt; if (G.suffT >= GRACE()) endGame(false, T.end); }
  else G.suffT = Math.max(0, G.suffT - dt * 2);
}

// Brain: lit (active) synapses regularly spark lightning that hurts viruses and anyone else it touches (you, if you stand
// too close). Sick synapses stop sparking and breed spark enemies instead. Dark synapses stop lighting their area, so the
// level goes dark; phase 3 makes the active synapses crackle much faster.
const BOLT = { warn: 0.95, fire: 0.18, reach: 125 };   // a long warning: time to step out of the lane
function brainStep(dt, alive, phase) {
  for (const f of G.fix) {
    if (f.st > 0) {
      f.spawnMax = 0;
      const fast = (phase >= 2 ? 0.75 : 1) * (phase >= 3 ? 0.85 : 1) * ease('arc');
      sickSpawn(f, dt, fast, 'spark');
      continue;
    }
    f.spawnMax = 0;
    f.boltT = (f.boltT == null ? rand(1, 4) : f.boltT) - dt;
    if (f.boltT <= 0) {
      f.boltT = rand(1.4, 2.6) * (phase >= 2 ? 0.85 : 1) * (phase >= 3 ? 0.6 : 1);
      const n = Math.random() < 0.3 ? 2 : 1;   // now and then a double discharge
      for (let k = 0; k < n; k++) {
        let a = rand(0, 6.283), best = null, bd = BOLT.reach + 15;   // it likes to strike a virus within reach, otherwise any direction
        for (const u of G.units) if (u.team === 'v' && !u.dead) { const d = dist(f, u) + (k ? rand(0, 60) : 0); if (d < bd) { bd = d; best = u; } }
        if (best && Math.random() < 0.75) a = Math.atan2(best.y - f.y, best.x - f.x);
        if (G.bolts.length < 28) G.bolts.push({ x: f.x, y: f.y, a, len: BOLT.reach * rand(0.8, 1), t: k * 0.12, warn: BOLT.warn, fire: BOLT.fire, fired: false, seed: Math.floor(Math.random() * 1000) });
      }
      if (!G.boltWarned) { G.boltWarned = true; say('LIT SYNAPSES SPARK. IT HURTS VIRUSES AND YOU'); }
    }
  }
  for (const b of G.bolts) {
    b.t += dt;
    if (b.fired || b.t < b.warn) continue;
    b.fired = true; sfx('bolt', 700, 0.12, 'sawtooth', 0.03, -400);
    const ca = Math.cos(b.a), sa = Math.sin(b.a);
    const hit = (x, y, r) => { const dx = x - b.x, dy = y - b.y, along = dx * ca + dy * sa; return along >= 0 && along <= b.len && Math.abs(-dx * sa + dy * ca) < 7 + r; };
    for (const u of G.units) if (u.team === 'v' && !u.dead && hit(u.x, u.y, u.r)) { damageUnit(u, 16); burst(u.x, u.y, '#bfe0ff', 5, 50); }
    for (const p of alive) if (hit(p.x, p.y, 5 * S.scale)) { p.infection += 11 * ease('dmg') * (p.fx.shield > 0 ? 0.5 : 1); p.hitT = 0; p.flash = 0.15; G.shake = Math.max(G.shake, 2); tip(p.x, p.y - 14, 'ZAP!', '#bfe0ff'); }
    for (let k = 0; k < 4; k++) { const d = rand(6, b.len); G.parts.push({ x: b.x + ca * d, y: b.y + sa * d, vx: rand(-20, 20), vy: rand(-20, 20), life: 0.3, max: 0.3, col: Math.random() < 0.5 ? '#a0c8ff' : '#e8f4ff', sz: 2 }); }
  }
  G.bolts = G.bolts.filter(b => b.t < b.warn + b.fire);
}

function lungStep(dt, alive, phase) {
  const push = 55 * breathY();
  for (const p of alive) if (p.stuckT <= 0) p.y = clamp(p.y + push * dt, 10, CFG.H - 10);
  for (const u of G.units) if (u.stuckT <= 0 && !u.hack) u.y = clamp(u.y + push * 0.7 * dt, 6, CFG.H - 6);
  // sick sacs behave like the infected lungs of the classic level: they lob slime and breed little slime enemies
  for (const f of G.fix) {
    if (f.st === 0) { f.spawnMax = 0; continue; }
    const fast = (phase >= 2 ? 0.75 : 1) * (phase >= 3 ? 0.85 : 1) * ease('arc');
    f.spitT = (f.spitT == null ? rand(2, 6) : f.spitT) - dt;
    if (f.spitT <= 0) {
      f.spitT = (f.st === 2 ? 6.5 : 11) * fast * rand(0.8, 1.2);
      if (G.globs.length < 8) {
        let tx, ty;
        if (Math.random() < 0.5) { const p = alive[Math.floor(Math.random() * alive.length)]; tx = p.x + rand(-40, 40); ty = p.y + rand(-40, 40); }
        else { const a = rand(0, 6.283), d = rand(60, 200); tx = f.x + Math.cos(a) * d; ty = f.y + Math.sin(a) * d; }
        G.globs.push({ sx: f.x, sy: f.y, tx: clamp(tx, 20, CFG.W - 20), ty: clamp(ty, 20, CFG.H - 20), t: 0, dur: 2.2 + rand(0, 0.4) });
        burst(f.x, f.y, '#9ae05a', 8, 50); sfx('spit', 200, 0.2, 'sawtooth', 0.03, -80);
      }
    }
    sickSpawn(f, dt, fast, 'slimeling');
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
}

function stomachStep(dt, alive, phase) {
  const top = acidTop();
  for (const p of alive) if (p.y > top && !acidSafe(p)) {
    p.infection += 4 * ease('dmg') * (1 - S.res) * (p.fx.shield > 0 ? 0.5 : 1) * dt; p.hitT = 0;
    p.acidT = (p.acidT || 0) - dt;
    if (p.acidT <= 0) { p.acidT = 1.2; p.flash = 0.1; tip(p.x, p.y - 14, 'ACID!', '#d8e830'); sfx('hurt', 200, 0.06, 'sawtooth', 0.02, -60); }
  }
  for (const f of G.fix) {
    if (f.st === 0) { f.spawnMax = 0; continue; }
    sickSpawn(f, dt, (phase >= 2 ? 0.75 : 1) * (phase >= 3 ? 0.85 : 1) * ease('arc'), 'pylori');
  }
  if (phase === 2 && !G.acidWarned) { G.acidWarned = true; say('ACID RISES! SEALED GLANDS KEEP YOU SAFE'); }
}

function bloodStep(dt, alive, phase) {
  const v = flowSpeed();
  for (const p of alive) if (p.stuckT <= 0) { p.x = clamp(p.x + laneDir(p.y) * v * dt, 10, CFG.W - 10); wallPush(p, 5 * S.scale); }
  for (const u of G.units) if (u.stuckT <= 0 && !u.hack && !u.boss) { u.x = clamp(u.x + laneDir(u.y) * v * 0.7 * dt, 6, CFG.W - 6); wallPush(u, u.r); }
  for (const f of G.fix) {
    if (f.st === 0) { f.spawnMax = 0; continue; }
    sickSpawn(f, dt, (phase >= 2 ? 0.75 : 1) * (phase >= 3 ? 0.85 : 1) * ease('arc'), 'toxin');
  }
}

function heartStep(dt, alive, phase) {
  // blood current: a clockwise swirl around the core that surges with every beat (harder when the pacemaker is off)
  const amp = 24 * (0.35 + 0.65 * beatPulse()) * (1 + 0.4 * G.fix[0].st);
  const swirl = (e, k) => {
    const dx = e.x - HEART_C.x, dy = e.y - HEART_C.y, d = Math.hypot(dx, dy);
    if (d < 40) return;
    e.x = clamp(e.x - dy / d * amp * k * dt, 10, CFG.W - 10); e.y = clamp(e.y + dx / d * amp * k * dt, 10, CFG.H - 10);
  };
  for (const p of alive) swirl(p, 1);
  for (const u of G.units) swirl(u, 0.7);
  // sick valves / pacemaker fire fever rays in random directions (a warning lane shows where) and breed embers
  for (const f of G.fix) {
    if (f.st === 0) { f.spawnMax = 0; continue; }
    const fast = (phase >= 2 ? 0.75 : 1) * (phase >= 3 ? 0.85 : 1) * ease('arc');
    f.rayT = (f.rayT == null ? rand(3, 8) : f.rayT) - dt;
    if (f.rayT <= 0) {
      f.rayT = (f.st === 2 ? 7 : 12) * fast * rand(0.85, 1.15);
      if (G.beams.length < 8) {
        let a = rand(0, 6.283);
        if (Math.random() < 0.3) { const p = alive[Math.floor(Math.random() * alive.length)]; a = Math.atan2(p.y - f.y, p.x - f.x); }   // now and then one is aimed
        G.beams.push({ x: f.x, y: f.y, a, len: 300, w: 14, t: 0, warn: phase >= 2 ? 1.1 : 1.4, fire: 0.7, fired: false });
        sfx('charge', 120, 1.2, 'sawtooth', 0.03, 300);
        if (!G.rayWarned) { G.rayWarned = true; say('FEVER RAYS! MOVE AWAY FROM THE STRIPES'); }
      }
    }
    sickSpawn(f, dt, fast, 'ember');
  }
  if (phase >= 3) {   // fever surge: a ring of rays from the core, safe lanes in between
    G.coughT -= dt;
    if (G.coughT <= 0) {
      G.coughT = rand(22, 30);
      const n = 6, off = rand(0, 6.283);
      for (let i = 0; i < n; i++) G.beams.push({ x: HEART_C.x, y: HEART_C.y, a: off + i / n * 6.283, len: 420, w: 14, t: 0, warn: 1.6, fire: 0.8, fired: false });
      say('FEVER SURGE! STAND BETWEEN THE STRIPES'); sfx('charge', 100, 1.6, 'sawtooth', 0.03, 260);
    }
  }
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
      if (cell) for (const n of cell) if (n.team === foe && !n.dead && n.cvT <= 0 && !n.boss) test(n);
    }
  }
  for (const o of organs) if (o.team === foe && o.cvT <= 0 && (!organsOnly || o.exposed)) test(o);
  return best;
}

function update(dt) {
  if (G.cine) { uiSfx = true; cineStep(dt); uiSfx = false; return; }   // the Man Flu scene: the rest of the game is paused
  G.t += dt;
  if (G.t >= lvl().time) { endGame(true, lvl().win); return; }
  G.msgT -= dt; G.shake = Math.max(0, G.shake - 20 * dt);
  const hs = lvl().hints;   // short scripted tips for the first level
  if (hs && G.hintI < hs.length && G.t >= hs[G.hintI][0]) say(hs[G.hintI++][1]);
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
    const py0 = p.y;
    p.vx += (inp.mx * spd - p.vx) * k; p.vy += (inp.my * spd - p.vy) * k;
    p.x = clamp(p.x + p.vx * dt, 10, CFG.W - 10); p.y = clamp(p.y + p.vy * dt, 10, CFG.H - 10);
    if (p.kickT > 0) { p.kickT -= dt; const f = p.kickT / 0.4; p.x = clamp(p.x + p.kx * f * dt, 10, CFG.W - 10); p.y = clamp(p.y + p.ky * f * dt, 10, CFG.H - 10); }
    wallPush(p, 5 * S.scale, py0);
    p.bob += Math.hypot(p.vx, p.vy) * dt * 0.25;
    slimeStick(p, dt, true);
    if (p.hitT > 2) p.infection = Math.max(0, p.infection - S.regen * 1.2 * oxy() * dt);   // you only shake it off after 2s without a hit
    for (const o of organs) if (o.team === 'i' && Math.hypot(p.x - o.x, p.y - o.y) < 60) p.infection = Math.max(0, p.infection - 2.5 * dt);
    if (p.infection >= 100 && startCine(p)) p.infection = 100;   // the plot twist: with Man Flu on screen, a full infection starts its scene instead of ending the run
    else if (p.infection >= 100) {
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
    if (p.fireCd <= 0 && (manualFire() ? p.inp.fire : ne && p.autoFire) && S.shoot) {
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
    G.spawnT = Math.max(0.3, 1.9 - G.t * 0.004) / (1 + 0.3 * lost) / (players.length > 1 ? 1.5 : 1) * (G.fix.length ? 1.3 : 1) * ease('spawn');
    const n = 1 + Math.floor(G.t / 90) + (lost >= 3 ? 1 : 0);
    for (let i = 0; i < n; i++) spawnVirus();
  }
  if (G.t >= G.nextSwarm) {
    G.nextSwarm += 45; say('SWARM INCOMING!');
    const c = alive[Math.floor(Math.random() * alive.length)];
    const a = rand(0, 6.28), n = Math.round((8 + Math.floor(G.t / 10) + (players.length > 1 ? 6 : 0)) * ease('swarm'));
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
  fixStep(dt, alive);
  bossStep(dt, alive);

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
      const tp = routeTo(u.x, u.y, u.tgt.x, u.tgt.y), d = Math.hypot(tp.x - u.x, tp.y - u.y) || 1;
      dx = (tp.x - u.x) / d; dy = (tp.y - u.y) / d;
      const w = Math.sin(G.t * 3 + u.id) * 0.3;
      const nx = dx - dy * w, ny = dy + dx * w; dx = nx; dy = ny;
    }
    u.convCd -= dt;
    if (!u.tail && !u.boss && (u.convCd <= 0 || u.team === 'v')) {
      const t = lashTarget(u, u.convCd > 0);
      if (t) { u.tail = { ref: t, t: 0, hit: false }; u.convCd = u.team === 'v' ? rand(18, 26) : rand(5, 8); }   // viruses wait much longer than allies between lashes
    }
    if (u.tail) { tailStep(u, dt, 58, u.team === 'v' ? 'i' : 'v'); dx = 0; dy = 0; }   // standing still while the tail lashes
    u.hack = null;   // saboteurs stop next to a fixable and hack it: they stay linked, and it only flips if they survive
    if (u.type === 'saboteur' && u.team === 'v' && u.tgt && u.tgt.fix && canBreak(u.tgt) && Math.hypot(u.tgt.x - u.x, u.tgt.y - u.y) < HACK_R) { u.hack = u.tgt; u.tgt.hackN++; dx = 0; dy = 0; }
    if (u.stuckT > 0 || u.morph) { dx = 0; dy = 0; u.vx = u.vy = 0; }       // frozen in slime (or busy transforming)
    const kk = Math.min(1, 6 * dt);
    u.vx += (dx * u.speed - u.vx) * kk; u.vy += (dy * u.speed - u.vy) * kk;
    const uy0 = u.y;
    u.x = clamp(u.x + u.vx * dt, 6, CFG.W - 6); u.y = clamp(u.y + u.vy * dt, 6, CFG.H - 6);
    if (u.kickT > 0) { u.kickT -= dt; const f = u.kickT / 0.4; u.x += u.kx * f * dt; u.y += u.ky * f * dt; }
    wallPush(u, u.r, uy0);
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
      if (u.team === 'v' && u.atkCd <= 0 && !u.morph) {
        u.atkCd = 1.1;
        p.infection += u.dmg * ease('dmg') * (1 + G.t / 200) * (1 - S.res) * (p.fx.shield > 0 ? 0.5 : 1);   p.hitT = 0; p.flash = 0.15; G.shake = Math.max(G.shake, 2);   // viruses hit harder as the infection matures
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
      if (lvKey === 'blood' && wallBlocks(p.x, p.y)) { p.dead = true; burst(p.x, p.y, '#c0405a', 2, 30); break; }   // the vessel wall stops shots
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
  powersStep(dt, alive);
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
// accents: the font only has plain capitals, so a letter with an accent is its base letter plus a few extra dots above (or below)
const ACCENT = { '\u0300': { up: ['01000', '00100'] }, '\u0301': { up: ['00010', '00100'] }, '\u0302': { up: ['00100', '01010'] }, '\u0303': { up: ['01101', '10010'] },
  '\u0308': { up: ['01010', '00000'] }, '\u0327': { dn: ['00100', '01100'] } };
const textCache = new Map();
function textRuns(s) {   // translated, upper-cased text as [glyph, accent] pairs
  let r = textCache.get(s);
  if (!r) {
    r = [];
    for (const ch of tr(s).toUpperCase().normalize('NFD')) { if (ACCENT[ch] && r.length) r[r.length - 1][1] = ACCENT[ch]; else r.push([ch, null]); }
    if (textCache.size > 3000) textCache.clear();
    textCache.set(s, r);
  }
  return r;
}
function drawText(s, x, y, col = '#fff', sc = 1, align = 'l', shadow = true) {
  const runs = textRuns(String(s));
  while (sc > 1 && runs.length * FONT_ADV * sc - sc > VIEW_W - 4) sc--;   // long translations shrink instead of running off the screen
  const w = runs.length * FONT_ADV * sc - sc;
  if (align === 'c') x -= w / 2; else if (align === 'r') x -= w;
  x = Math.round(x); y = Math.round(y);
  for (const pass of shadow ? [1, 0] : [0]) {
    ctx.fillStyle = pass ? '#000' : col;
    for (let i = 0; i < runs.length; i++) {
      const gl = FONT[runs[i][0]], ac = runs[i][1], ox = x + i * FONT_ADV * sc + pass * sc, oy = y + pass * sc;
      if (gl) for (let r = 0; r < FONT_H; r++) for (let c = 0; c < FONT_W; c++)
        if (gl[r][c] === '#') ctx.fillRect(ox + c * sc, oy + r * sc, sc, sc);
      if (ac) for (const [rows, y0] of [[ac.up, -2], [ac.dn, FONT_H]]) if (rows)
        rows.forEach((row, r) => { for (let c = 0; c < FONT_W; c++) if (row[c] === '1') ctx.fillRect(ox + c * sc, oy + (y0 + r) * sc, sc, sc); });
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

// ---------------------------------------------------------------- Man Flu (brain boss) and the pet it becomes
// A big scary boss that you can shoot down like anything else. But when it makes your infection reach 100% nothing bad happens:
// it blinks, shrinks and turns into a small pet that follows you through all later levels.
const MORPH_T = 3;
const CINE_T = 4;   // seconds: dash in, slow-motion poke, transformation, pet appears
function startCine(p) {
  const fl = G.units.find(u => u.type === 'manflu' && !u.dead);
  if (!fl || G.cine) return false;
  const sx = fl.x - cam.x, sy = fl.y - cam.y;
  if (sx < -20 || sy < -20 || sx > VIEW_W + 20 || sy > VIEW_H + 20) return false;   // only when it is on screen
  G.fp = []; G.cine = { t: 0, p, x0: fl.x, y0: fl.y, px: p.x, py: p.y, hit: false, done: false };
  fl.tgt = null; fl.vx = fl.vy = 0; p.vx = p.vy = 0;
  sfx('charge', 120, 1.5, 'sine', 0.04, 200);
  return true;
}
function cineStep(dt) {
  const c = G.cine, u = G.units.find(x => x.boss && !x.dead), p = c.p;
  c.t += dt;
  p.flash -= dt;   // the rest of the world stands still, but sparks, tips and hit flashes keep playing
  for (const q of G.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.92; q.vy *= 0.92; q.life -= dt; }
  G.parts = G.parts.filter(q => q.life > 0);
  for (const t of G.tips) t.t -= dt;
  G.tips = G.tips.filter(t => t.t > 0);
  if (u && !c.done) {
    const dx = p.x - c.x0, dy = p.y - c.y0, d = Math.hypot(dx, dy) || 1, stand = u.r + 16;
    if (c.t < 0.5) {   // dash up next to the player
      const k = 1 - (1 - c.t / 0.5) ** 2;
      u.x = c.x0 + (dx - dx / d * stand) * k; u.y = c.y0 + (dy - dy / d * stand) * k;
    } else if (c.t < 1.9) {   // the poke, in slow motion
      u.tail = { ref: { x: c.px, y: c.py, r: 0, weakA: 0 }, t: (c.t - 0.5) / 1.4 * TAIL_END, hit: true };
      if (c.t >= 1.18 && !c.hit) { c.hit = true; p.flash = 0.5; burst(p.x, p.y, '#c8f060', 12, 40); sfx('hurt', 150, 0.3, 'sawtooth', 0.04, -60); tip(p.x, p.y - 16, 'POKE!', '#c8f060'); }
      if (c.hit) { const kb = Math.min(1, (c.t - 1.18) / 0.7) * 8; p.x = c.px - dx / d * kb; p.y = c.py - dy / d * kb; }
    } else {   // blinking and shrinking into the pet
      u.tail = null; u.morph = { t: Math.min(1, (c.t - 1.9) / 1.5) * MORPH_T };
    }
  }
  if (c.t >= 3.4 && !c.done) {
    c.done = true;
    if (u) { burst(u.x, u.y, '#ff9ac8', 24, 70); G.pet = { x: u.x, y: u.y, vx: 0, vy: 0 }; G.units = G.units.filter(x => x !== u); }
    sfx('conv', 600, 0.4, 'sine', 0.05, 500); G.shake = 0;
    say(hasPet ? 'MAN FLU IS YOUR FRIEND AGAIN!' : 'MAN FLU IS NOW YOUR PET! IT FOLLOWS YOU FROM NOW ON'); G.msgT = 6;
    hasPet = true; try { localStorage.setItem('vaccine.pet', '1'); } catch (e) { /* private mode */ }
    p.infection = 0; p.hitT = 9;
  }
  if (c.t >= CINE_T) G.cine = null;
}
// everything is darkened except the players, Man Flu and the pet
let spotC = null;
function drawCineSpot() {
  const c = G.cine, a = Math.min(1, c.t / 0.35, Math.max(0, (CINE_T - c.t) / 0.35));
  if (a <= 0) return;
  if (!spotC) spotC = document.createElement('canvas');
  if (spotC.width !== VIEW_W || spotC.height !== VIEW_H) { spotC.width = VIEW_W; spotC.height = VIEW_H; }
  spotC.getContext('2d').drawImage(canvas, 0, 0);   // the lit frame, copied before it is darkened
  ctx.globalAlpha = 0.8 * a; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); ctx.globalAlpha = 1;
  const boss = G.units.find(u => u.boss && !u.dead), spots = players.map(p => [p.x, p.y, 22]);
  if (boss) spots.push([boss.x, boss.y, 40]);
  if (G.pet) spots.push([G.pet.x, G.pet.y, 16]);
  ctx.save(); ctx.beginPath();
  for (const [x, y, r] of spots) { ctx.moveTo(x - cam.x + shx + r, y - cam.y + shy); ctx.arc(x - cam.x + shx, y - cam.y + shy, r, 0, 6.283); }
  ctx.clip(); ctx.drawImage(spotC, 0, 0); ctx.restore();
  ctx.strokeStyle = '#c8f060'; ctx.lineWidth = 1; ctx.globalAlpha = 0.3 * a;
  for (const [x, y, r] of spots) { ctx.beginPath(); ctx.arc(x - cam.x + shx, y - cam.y + shy, r, 0, 6.283); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
// how each boss fires: a fan aimed at the nearest player, or a fixed ring. iv = seconds between volleys (healthy, below half health)
const BOSS_AI = {
  manflu: { n: 5, spread: 0.2, speed: 135, iv: [1.4, 1.0], range: 380 },
  ulcer: { n: 8, ring: true, speed: 95, iv: [4.5, 3.0], range: 9999 },
  sepsis: { n: 3, spread: 0.25, speed: 120, iv: [2.4, 1.8], range: 380 },
};
const bossAngles = (u, t) => {
  const ai = BOSS_AI[u.type], out = [];
  if (ai.ring) for (let i = 0; i < ai.n; i++) out.push(i / ai.n * 6.283 + (u.id % 8) * 0.1);
  else { const base = Math.atan2(t.y - u.y, t.x - u.x); for (let i = 0; i < ai.n; i++) out.push(base + (i - (ai.n - 1) / 2) * ai.spread); }
  return out;
};
const FP_COL = { stomach: ['#3a1604', '#ff9a30', '#d06a10'], blood: ['#2a0410', '#e04a70', '#a01840'] };
function bossStep(dt, alive) {
  const bt = lvl().boss;
  if (bt && !G.bossSpawned && G.t >= bt) {
    G.bossSpawned = true;
    const c = alive[Math.floor(Math.random() * alive.length)], a = rand(0, 6.283), bs = lvl().bossType;
    addUnit('v', bs, clamp(c.x + Math.cos(a) * 330, 30, CFG.W - 30), clamp(c.y + Math.sin(a) * 330, 30, CFG.H - 30));
    say('BOSS: ' + BOSSES[bs] + '!'); G.shake = 5; sfx('charge', 90, 1.2, 'sawtooth', 0.05, 120);
  }
  for (const u of G.units) {   // bosses fire at the nearest player; their shots hit nothing else
    if (!u.boss || u.dead || u.morph || !alive.length) continue;
    const ai = BOSS_AI[u.type], low = u.hp < u.maxHp * 0.5 ? 1 : 0;
    if (u.type === 'ulcer') {   // eats craters into the wall as it goes: acid pools that stay for a while
      u.holeT = (u.holeT == null ? 2 : u.holeT) - dt;
      if (u.holeT <= 0 && G.holes.length < 14) { u.holeT = low ? 2.2 : 3.2; G.holes.push({ x: u.x, y: u.y, r: 20, life: 24 }); burst(u.x, u.y, '#ff9a30', 8, 40); }
    } else if (u.type === 'sepsis') {   // the infection spreads: it sheds saboteurs that go for the vessels
      u.sabT = (u.sabT == null ? 6 : u.sabT) - dt;
      if (u.sabT <= 0) { u.sabT = low ? 6.5 : 9; for (let i = 0; i < 2; i++) if (count('v') < CFG.MAX_VIRUS) addUnit('v', 'saboteur', u.x + rand(-14, 14), u.y + rand(-14, 14)); burst(u.x, u.y, '#e050c0', 8, 50); sfx('charge', 200, 0.3, 'sine', 0.03, 200); }
    }
    u.shotT = (u.shotT == null ? 2 : u.shotT) - dt;
    if (u.shotT > 0) continue;
    const t = nearestPlayer(u);
    if (!t || dist(u, t) > ai.range) { u.shotT = 0.5; continue; }
    u.shotT = ai.iv[low];
    for (const a of bossAngles(u, t)) if (G.fp.length < 60) G.fp.push({ id: G.fpId = (G.fpId || 0) + 1, x: u.x + Math.cos(a) * u.r, y: u.y + Math.sin(a) * u.r, vx: Math.cos(a) * ai.speed, vy: Math.sin(a) * ai.speed, life: 3.2 });
    sfx('spit', 180, 0.15, 'sawtooth', 0.03, -80); burst(u.x, u.y, TYPES[u.type].col, 6, 40);
  }
  for (const h of G.holes) {
    h.life -= dt;
    for (const p of alive) if (Math.hypot(h.x - p.x, h.y - p.y) < h.r + 3) {
      p.infection += 7 * ease('dmg') * (1 - S.res) * (p.fx.shield > 0 ? 0.5 : 1) * dt; p.hitT = 0;
      p.acidT = (p.acidT || 0) - dt;
      if (p.acidT <= 0) { p.acidT = 1; p.flash = 0.1; tip(p.x, p.y - 14, 'ACID!', '#ff9a30'); }
    }
  }
  G.holes = G.holes.filter(h => h.life > 0);
  for (const b of G.fp) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    for (const p of alive) if (Math.hypot(b.x - p.x, b.y - p.y) < 5 * S.scale + 3) {
      b.life = 0; burst(b.x, b.y, (FP_COL[lvKey] || [0, '#c8f060'])[1], 6, 40);
      p.infection += 4 * ease('dmg') * (1 + G.t / 200) * (1 - S.res) * (p.fx.shield > 0 ? 0.5 : 1); p.hitT = 0; p.flash = 0.15;
      sfx('hurt', 150, 0.08, 'sawtooth', 0.025, -60); break;
    }
    if (b.x < 0 || b.y < 0 || b.x > CFG.W || b.y > CFG.H) b.life = 0;
  }
  G.fp = G.fp.filter(b => b.life > 0);
  const pt = G.pet;
  if (pt && alive.length) {   // the pet trots after the nearest player and stays a little behind
    let t = alive[0]; for (const p of alive) if (dist(p, pt) < dist(t, pt)) t = p;
    const d = dist(t, pt), a = Math.atan2(t.y - pt.y, t.x - pt.x), sp = d > 26 ? Math.min(140, 30 + (d - 26) * 3) : 0, k = Math.min(1, 6 * dt);
    pt.vx += (Math.cos(a) * sp - pt.vx) * k; pt.vy += (Math.sin(a) * sp - pt.vy) * k;
    pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    pt.heartT = (pt.heartT == null ? rand(3, 8) : pt.heartT) - dt;
    if (pt.heartT <= 0) { pt.heartT = rand(5, 10); burst(pt.x, pt.y - 6, '#ff9ac8', 3, 20); }
  }
}

// ---------------------------------------------------------------- level powers (unlocked by beating a level)
// Static shock (brain): short lightning at nearby viruses. Phage slime (lung): globs of the player's colour that freeze viruses only.
// Fever beam (heart): one long horizontal ray. Upgrading raises the count / area / range and the damage.
const PBOLT = { warn: 0.22, fire: 0.16, reach: 130 }, PRAY = { warn: 0.3, fire: 0.4 };
function powersStep(dt, alive) {
  const lL = S.up.plight || 0, sL = S.up.pslime || 0, rL = S.up.pray || 0;
  const foes = lL || sL || rL ? G.units.filter(u => u.team === 'v' && !u.dead) : [];
  for (const p of alive) {
    if (lL) {
      p.zapT = (p.zapT == null ? 1 : p.zapT) - dt;
      if (p.zapT <= 0) {
        const near = foes.filter(u => dist(u, p) < PBOLT.reach).sort((a, b) => dist(a, p) - dist(b, p));
        if (!near.length) p.zapT = 0.3;
        else {
          p.zapT = 2.4 - 0.15 * lL;
          for (let i = 0; i < lL && G.pb.length < 24; i++) {
            const t = near[i % near.length], a = Math.atan2(t.y - p.y, t.x - p.x) + (i >= near.length ? rand(-0.5, 0.5) : 0);
            G.pb.push({ x: p.x, y: p.y, a, len: PBOLT.reach, t: -i * 0.07, pi: p.idx, dmg: 14 + 5 * lL, seed: Math.floor(Math.random() * 1000), fired: false, p });
          }
        }
      }
    }
    if (sL) {
      p.slT = (p.slT == null ? 2 : p.slT) - dt;
      if (p.slT <= 0) {
        const pool = foes.filter(u => dist(u, p) < 260).sort(() => Math.random() - 0.5);
        if (!pool.length) p.slT = 0.5;
        else {
          p.slT = 6.5 - 0.5 * sL;
          for (let i = 0; i < sL && G.pg.length < 12; i++) {
            const t = pool[i % pool.length];
            G.pg.push({ sx: p.x, sy: p.y, tx: clamp(t.x + rand(-14, 14), 20, CFG.W - 20), ty: clamp(t.y + rand(-14, 14), 20, CFG.H - 20), t: -i * 0.12, dur: 0.8, pi: p.idx, r: (12 + 3 * sL) * rand(0.9, 1.1) });
          }
          sfx('spit', 260, 0.15, 'sawtooth', 0.025, -100);
        }
      }
    }
    if (rL) {
      p.rayT = (p.rayT == null ? 2 : p.rayT) - dt;
      if (p.rayT <= 0) {
        const len = 170 + 45 * rL;
        let side = 0, best = 0, nd = 1e9, nside = 0;
        for (const sd of [-1, 1]) {
          let c = 0;
          for (const u of foes) { const dx = (u.x - p.x) * sd; if (dx > 0 && dx < len && Math.abs(u.y - p.y) < 14 + u.r) c++; }
          if (c > best) { best = c; side = sd; }
        }
        for (const u of foes) { const d = dist(u, p); if (d < nd) { nd = d; nside = u.x >= p.x ? 1 : -1; } }
        if (!side && nd < len) side = nside;   // nothing in a lane: still fire toward the nearest virus
        if (!side) p.rayT = 0.4;
        else { p.rayT = 4.6 - 0.35 * rL; G.pr.push({ x: p.x, y: p.y, s: side, len, t: 0, pi: p.idx, dps: 70 + 20 * rL, fired: false, p }); }
      }
    }
  }
  for (const b of G.pb) {
    b.t += dt; if (b.p && !b.fired) { b.x = b.p.x; b.y = b.p.y; }
    if (b.fired || b.t < PBOLT.warn) continue;
    b.fired = true; sfx('bolt', 700, 0.1, 'sawtooth', 0.025, -400);
    const ca = Math.cos(b.a), sa = Math.sin(b.a);
    for (const u of foes) {
      if (u.dead) continue;
      const dx = u.x - b.x, dy = u.y - b.y, along = dx * ca + dy * sa;
      if (along >= 0 && along <= b.len && Math.abs(-dx * sa + dy * ca) < 7 + u.r) { damageUnit(u, b.dmg); burst(u.x, u.y, '#bfe0ff', 5, 50); }
    }
    for (let k = 0; k < 4; k++) { const d = rand(6, b.len); G.parts.push({ x: b.x + ca * d, y: b.y + sa * d, vx: rand(-20, 20), vy: rand(-20, 20), life: 0.3, max: 0.3, col: Math.random() < 0.5 ? '#a0c8ff' : '#e8f4ff', sz: 2 }); }
  }
  G.pb = G.pb.filter(b => b.t < PBOLT.warn + PBOLT.fire);
  for (const b of G.pr) {
    b.t += dt; if (b.p && !b.fired) { b.x = b.p.x; b.y = b.p.y; }
    if (b.t < PRAY.warn) continue;
    if (!b.fired) { b.fired = true; sfx('ray', 140, 0.35, 'sawtooth', 0.04, 160); }
    for (const u of foes) if (!u.dead && (u.x - b.x) * b.s > 0 && (u.x - b.x) * b.s < b.len && Math.abs(u.y - b.y) < 6 + u.r) damageUnit(u, b.dps * dt);
    if (Math.random() < 0.7) G.parts.push({ x: b.x + b.s * rand(10, b.len), y: b.y + rand(-4, 4), vx: rand(-20, 20), vy: rand(-30, -5), life: 0.4, max: 0.4, col: Math.random() < 0.5 ? PCOL[b.pi || 0] : '#fff', sz: 2 });
  }
  G.pr = G.pr.filter(b => b.t < PRAY.warn + PRAY.fire);
  for (const g of G.pg) {
    g.t += dt;
    if (g.t >= g.dur) { g.dead = true; G.ps.push({ x: g.tx, y: g.ty, r: g.r, life: 9, pi: g.pi }); burst(g.tx, g.ty, PCOL[g.pi || 0], 10, 50); sfx('splat', 150, 0.1, 'square', 0.025, -40); }
  }
  G.pg = G.pg.filter(g => !g.dead);
  for (const sl of G.ps) sl.life -= dt;
  G.ps = G.ps.filter(sl => sl.life > 0);
  if (G.ps.length > 30) G.ps.splice(0, G.ps.length - 30);
}
function drawPowers() {
  const ox = shx - cam.x, oy = shy - cam.y;
  const ell = (x, y, rx, ry) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 6.283); };
  for (const g of G.ps) {   // puddles in the player's colour
    const col = PCOL[g.pi || 0], a = Math.min(1, g.life / 2);
    ctx.fillStyle = col; ctx.globalAlpha = 0.4 * a; ell(g.x + ox, g.y + oy, g.r * 1.3, g.r * 0.95); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.5 * a; ell(g.x + ox, g.y + oy, g.r * 1.3, g.r * 0.95); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.5 * a;
    for (let i = 0; i < 3; i++) { const t = i * 2.1 + g.x; ctx.fillRect(Math.round(g.x + ox + Math.cos(t) * g.r * 0.7), Math.round(g.y + oy + Math.sin(t) * g.r * 0.5 - (G.t * 4 + i) % 2), 1, 1); }
    ctx.globalAlpha = 1;
  }
  for (const g of G.pg) {
    if (g.t < 0) continue;
    const col = PCOL[g.pi || 0], k = Math.min(1, g.t / g.dur), gx = g.sx + (g.tx - g.sx) * k, gy = g.sy + (g.ty - g.sy) * k, h = Math.sin(k * Math.PI) * 30;
    ctx.setLineDash([3, 2]); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.globalAlpha = 0.4 + 0.5 * k; ell(g.tx + ox, g.ty + oy, g.r * 1.3, g.r * 0.95); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    rect(gx - 3 + ox, gy - h - 3 + oy, 6, 6, '#000', 0.5); rect(gx - 2 + ox, gy - h - 2 + oy, 4, 4, col); rect(gx - 1 + ox, gy - h - 2 + oy, 1, 1, '#fff');
  }
  for (const b of G.pr) {   // the fever beam: a thin dashed lane, then the burning ray
    const col = PCOL[b.pi || 0], firing = b.t >= PRAY.warn, x0 = b.s > 0 ? b.x + 6 + ox : b.x - 6 - b.len + ox, y0 = b.y + oy;
    if (!firing) {
      const k = b.t / PRAY.warn, pu = 0.5 + 0.5 * Math.sin(b.t * 30);
      ctx.fillStyle = col; ctx.globalAlpha = 0.1 + 0.25 * k * pu; ctx.fillRect(x0, y0 - 5, b.len, 10);
      ctx.globalAlpha = 0.5 + 0.5 * k; for (let d = 0; d < b.len; d += 10) ctx.fillRect(x0 + d, y0 - 1, 5, 1);
    } else {
      const f = 0.8 + 0.2 * Math.sin(b.t * 70), fade = Math.min(1, (PRAY.warn + PRAY.fire - b.t) / 0.15);
      ctx.fillStyle = col; ctx.globalAlpha = 0.5 * f * fade; ctx.fillRect(x0, y0 - 9, b.len, 18);
      ctx.globalAlpha = 0.95 * fade; ctx.fillRect(x0, y0 - 5, b.len, 10);
      ctx.fillStyle = '#fff'; ctx.fillRect(x0, y0 - 2, b.len, 4);
    }
    ctx.globalAlpha = 1;
  }
  for (const b of G.pb) {
    if (b.t < 0) continue;
    const col = PCOL[b.pi || 0], ca = Math.cos(b.a), sa = Math.sin(b.a), firing = b.t >= PBOLT.warn, n = Math.max(3, Math.floor(b.len / 9)), pts = [];
    for (let i = 0; i <= n; i++) {
      const k = i / n, h = Math.sin(b.seed * 12.9898 + i * 78.233) * 43758.5453, off = (h - Math.floor(h) - 0.5) * 12 * Math.sin(k * Math.PI) * (firing ? 1 : 0);
      pts.push([b.x + ca * b.len * k - sa * off + ox, b.y + sa * b.len * k + ca * off + oy]);
    }
    const path = () => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); };
    if (!firing) { ctx.setLineDash([3, 3]); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.globalAlpha = 0.4 + 0.5 * b.t / PBOLT.warn; path(); ctx.stroke(); ctx.setLineDash([]); }
    else { ctx.lineCap = 'round'; ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.globalAlpha = 0.5; path(); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.globalAlpha = 1; path(); ctx.stroke(); ctx.lineCap = 'butt'; }
    ctx.globalAlpha = 1;
  }
}

// slime in flight: a pulsing landing zone (drawn above units and allies so it stays readable in a crowd) and the glob itself
// stomach acid: a wavy yellow-green surface rising from the floor, with a safe bubble round every sealed gland
function drawAcid() {
  const top = acidTop() - cam.y + shy;
  if (top < VIEW_H) {
    const y0 = Math.max(0, Math.floor(top));
    rect(0, y0 + 3, VIEW_W, VIEW_H - y0, '#c8d820', 0.28);
    for (let x = 0; x < VIEW_W; x += 2) { const wy = top + Math.sin((x + cam.x) * 0.07 + G.t * 2.2) * 2; if (wy >= 0 && wy < VIEW_H) rect(x, wy, 2, 3, '#f0f060', 0.7); }
    for (let i = 0; i < 24; i++) {
      const bx = ((i * 83 + 17) % CFG.W) - cam.x, by = top + 8 + ((i * 47 + G.t * (10 + i % 5 * 4)) % 140);
      if (bx > 0 && bx < VIEW_W && by > 0 && by < VIEW_H) rect(bx, by, 2, 2, '#fffbb0', 0.45);
    }
  }
  for (const f of G.fix) if (f.st === 0) {
    ctx.strokeStyle = 'rgba(160,255,220,' + (0.2 + 0.1 * Math.sin(G.t * 2 + f.i)) + ')'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(f.x - cam.x + shx, f.y - cam.y + shy, GLAND_SAFE, 0, 6.283); ctx.stroke();
  }
}
// bloodstream: streaks flow along each lane in its direction; the lane borders are marked faintly
function drawCurrent() {
  const off = G.flowA * 34;
  for (let l = 0; l < 4; l++) {
    const dir = l % 2 ? -1 : 1, y0 = l * LANE_H - cam.y + shy;
    for (let i = 0; i < 26; i++) {
      const sx = (((i * 97 + 31 * l + off * dir * (0.8 + (i % 4) * 0.15)) % CFG.W) + CFG.W) % CFG.W - cam.x, sy = y0 + 14 + ((i * 53 + l * 29) % (LANE_H - 28));
      if (sx > -12 && sx < VIEW_W && sy > 0 && sy < VIEW_H) {
        rect(sx, sy, 8, 1, '#ffb0c0', 0.3); rect(sx + (dir > 0 ? 8 : -1), sy - 1, 1, 3, '#ffb0c0', 0.3);
      }
    }
  }
}
// the vessel walls between the canals: a thick wall of cells with a lit edge, open at the gaps
function drawBloodWalls() {
  for (const w of BLOOD_WALLS) {
    const wy = w.y - WALL_HALF - cam.y + shy;
    if (wy > VIEW_H || wy + WALL_HALF * 2 < 0) continue;
    const xs = [0, ...w.g.flatMap(g => [g - GAP_W / 2, g + GAP_W / 2]), CFG.W];
    for (let i = 0; i < xs.length; i += 2) {
      const x0 = xs[i] - cam.x + shx, wd = xs[i + 1] - xs[i];
      if (x0 > VIEW_W || x0 + wd < 0) continue;
      rect(x0, wy, wd, WALL_HALF * 2, '#1e0610'); rect(x0, wy + 2, wd, WALL_HALF * 2 - 4, '#3e0e1e');
      rect(x0, wy, wd, 2, '#d04a66'); rect(x0, wy + WALL_HALF * 2 - 2, wd, 2, '#d04a66');   // the lit edges
      for (let cx = Math.ceil(xs[i] / 18) * 18; cx < xs[i + 1] - 6; cx += 18) rect(cx - cam.x + shx, wy + 5 + (cx / 18 % 2) * 3, 6, 4, '#7a2038', 0.9);   // the cells the wall is made of
      if (i) rect(x0, wy - 1, 3, WALL_HALF * 2 + 2, '#ff8a98', 0.8);   // lips at the ends of a gap
      if (i + 1 < xs.length - 1) rect(x0 + wd - 3, wy - 1, 3, WALL_HALF * 2 + 2, '#ff8a98', 0.8);
    }
  }
}
function drawGlobs() {
  for (const g of G.globs) {
    const k = Math.min(1, g.t / g.dur), gx = g.sx + (g.tx - g.sx) * k, gy = g.sy + (g.ty - g.sy) * k, h = Math.sin(k * Math.PI) * 46;
    const pu = 0.5 + 0.5 * Math.sin(G.t * (8 + 14 * k)), cx = g.tx - cam.x + shx, cy = g.ty - cam.y + shy;
    ctx.fillStyle = '#9ae05a'; ctx.globalAlpha = 0.08 + 0.2 * k * (0.6 + 0.4 * pu);
    ctx.beginPath(); ctx.ellipse(cx, cy, 20, 14, 0, 0, 6.283); ctx.fill();
    ctx.setLineDash([3, 2]); ctx.strokeStyle = '#e8ff9a'; ctx.lineWidth = 2; ctx.globalAlpha = 0.5 + 0.5 * k * (0.5 + 0.5 * pu);
    ctx.beginPath(); ctx.ellipse(cx, cy, 20, 14, 0, 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#9ae05a'; ctx.lineWidth = 1; ctx.globalAlpha = 0.6 + 0.4 * pu;
    const r = 6 + 14 * (1 - k); ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.7, 0, 0, 6.283); ctx.stroke();   // closes in as it is about to land
    ctx.globalAlpha = 1;
    rect(gx - 2 - cam.x + shx, gy + 1 - cam.y + shy, 5, 2, '#000', 0.3);
    rect(gx - 3 - cam.x + shx, gy - h - 3 - cam.y + shy, 6, 6, '#2f6a16'); rect(gx - 2 - cam.x + shx, gy - h - 2 - cam.y + shy, 4, 4, '#9ae05a'); rect(gx - 1 - cam.x + shx, gy - h - 2 - cam.y + shy, 1, 1, '#fff');
  }
}

// the neuron web: every lane is a very faint dotted track; when both synapses are lit, soft light pulses swell and travel along it (in both directions)
// instead of bright dots, so the lanes don't read as gems or shots. A dim end makes the lane flicker and the pulses fizzle out; dark ends leave only a ghost lane.
function drawWeb() {
  for (const [a, b, bend = 0] of G.edges) {
    const A = G.fix[a], B = G.fix[b];
    if (!A || !B) continue;
    const l = dist(A, B), nx = -(B.y - A.y) / l, ny = (B.x - A.x) / l, n = Math.floor(l / 4);
    const worst = Math.max(A.st, B.st), ok = worst === 0;
    const at = (t, side) => { const o = side * 1.6 + bend * 4 * t * (1 - t); return [A.x + (B.x - A.x) * t + nx * o - cam.x + shx, A.y + (B.y - A.y) * t + ny * o - cam.y + shy]; };
    const pulses = [];   // positions of the light pulses on this lane (0..1 from A to B), two per lane, one each way
    if (worst < 2) for (let k = 0; k < 2; k++) {
      let t = (G.t * (0.22 + 0.05 * k) + k / 2 + a * 0.13) % 1;
      if (k) t = 1 - t;
      if (!ok && (k ? 1 - t : t) > 0.45 + 0.2 * Math.sin(G.t * 3 + k)) continue;   // fizzles out part-way along a lane with a dim end
      pulses.push(t);
    }
    for (let k = 1; k < n; k++) {
      const t = k / n, [x, y] = at(t, 0);
      if (x < -2 || y < -2 || x > VIEW_W + 2 || y > VIEW_H + 2) continue;
      let glow = 0;
      for (const pt of pulses) { const d = (t - pt) / 0.09; glow += Math.exp(-d * d); }
      if (ok) rect(x, y, 1, 1, '#6aaee8', 0.14 + 0.3 * Math.min(1, glow));
      else if (worst === 1) rect(x, y, 1, 1, '#8a78c8', 0.1 + 0.1 * Math.sin(G.t * 9 + k * 0.7 + a) + 0.2 * Math.min(1, glow));
      else rect(x, y, 1, 1, '#4a3a78', 0.1);
    }
  }
}

// lightning from lit synapses: a faint charging line, then a jagged bright bolt
function drawBolts() {
  for (const f of G.fix) {   // tiny sparks crackling around every lit synapse
    if (f.st !== 0) continue;
    for (let k = 0; k < 5; k++) {
      const ph = G.t * (3 + k * 1.3) + f.i * 2.1 + k * 1.7, vis = Math.sin(ph * 3.1) > 0.35;
      if (!vis) continue;
      const a = ph * 1.9 + k * 1.26, r = 13 + 8 * Math.abs(Math.sin(ph));
      rect(f.x + Math.cos(a) * r - cam.x + shx, f.y + Math.sin(a) * r - cam.y + shy, k % 2 ? 2 : 1, k % 2 ? 1 : 2, k % 2 ? '#e8f4ff' : '#8ab4ff', 0.9);
    }
  }
  for (const b of G.bolts) {
    const ca = Math.cos(b.a), sa = Math.sin(b.a), firing = b.t >= b.warn, n = Math.max(3, Math.floor(b.len / 9));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const k = i / n, h = Math.sin(b.seed * 12.9898 + i * 78.233) * 43758.5453, off = (h - Math.floor(h) - 0.5) * 14 * Math.sin(k * Math.PI) * (firing ? 1 : 0);
      pts.push([b.x + ca * b.len * k - sa * off - cam.x + shx, b.y + sa * b.len * k + ca * off - cam.y + shy]);
    }
    const path = () => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); };
    if (!firing) {   // charging: a bright dashed lane that grows more urgent, with a target ring at the far end
      const k = Math.min(1, Math.max(0, b.t) / b.warn), pu = 0.5 + 0.5 * Math.sin(b.t * (10 + 22 * k));
      ctx.lineCap = 'butt';
      ctx.strokeStyle = '#4a6aff'; ctx.lineWidth = 7; ctx.globalAlpha = 0.12 + 0.22 * k * (0.6 + 0.4 * pu); path(); ctx.stroke();
      ctx.setLineDash([4, 3]); ctx.strokeStyle = '#e8f4ff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.45 + 0.5 * k * (0.5 + 0.5 * pu); path(); ctx.stroke(); ctx.setLineDash([]);
      const ex = b.x + ca * b.len - cam.x + shx, ey = b.y + sa * b.len - cam.y + shy, rr = 4 + 5 * (1 - k);
      ctx.strokeStyle = '#bfe0ff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.5 + 0.5 * pu; ctx.beginPath(); ctx.arc(ex, ey, rr, 0, 6.283); ctx.stroke();
    } else {
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#4a6aff'; ctx.lineWidth = 5; ctx.globalAlpha = 0.35; path(); ctx.stroke();
      ctx.strokeStyle = '#bfe0ff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.9; path(); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.globalAlpha = 1; path(); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

// brain: the level is dark; only players, allies and lit synapses give light. Dark synapses mean dark corners where
// viruses hide. Lightning flashes briefly light everything.
let darkC = null;
function drawDarkness() {
  if (!darkC) darkC = document.createElement('canvas');
  if (darkC.width !== VIEW_W || darkC.height !== VIEW_H) { darkC.width = VIEW_W; darkC.height = VIEW_H; }
  const g = darkC.getContext('2d'), flash = G.bolts.some(b => b.t >= b.warn && b.t < b.warn + 0.1);
  g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, VIEW_W, VIEW_H);
  const sig = oxy(), dark = clamp(0.28 + 0.55 * (1 - sig) + 0.04 * (G.phase - 1), 0.28, 0.9);   // the lower the signal, the darker the level
  g.fillStyle = 'rgba(4,2,20,' + (flash ? dark * 0.8 : dark) + ')'; g.fillRect(0, 0, VIEW_W, VIEW_H);
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,0.3)';
  const light = (x, y, r) => {
    x = Math.round(x - cam.x + shx); y = Math.round(y - cam.y + shy);
    if (x < -r || y < -r || x > VIEW_W + r || y > VIEW_H + r) return;
    for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x, y, r * (1 - k * 0.18), 0, 6.283); g.fill(); }
  };
  for (const p of players) if (!p.down) light(p.x, p.y, 78);
  for (const f of G.fix) if (f.st < 2) light(f.x, f.y, f.st === 0 ? 120 : 56);
  for (const u of G.units) if (u.team === 'i') light(u.x, u.y, 24);
  ctx.drawImage(darkC, 0, 0);
}

let curStyle = '';
function render() {
  const cur = state === 'play' ? 'none' : 'default';   // in play the aim crosshair replaces the pointer; every menu / pause / end screen shows the real mouse
  if (cur !== curStyle) { curStyle = cur; canvas.style.cursor = cur; }
  if (state === 'lobby') { drawLobby(); return; }
  // camera
  updateCam();
  if (state === 'title' || state === 'levels' || state === 'settings' || state === 'powers') { cam.x = CFG.W / 2 - VIEW_W / 2 | 0; cam.y = 330; }
  shx = G.shake > 0.5 ? Math.round(rand(-1, 1) * G.shake) : 0; shy = G.shake > 0.5 ? Math.round(rand(-1, 1) * G.shake) : 0;

  ctx.fillStyle = lvl().clear; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.save();
  ctx.beginPath(); ctx.rect(-cam.x + shx, -cam.y + shy, CFG.W, CFG.H); ctx.clip();
  const bx = Math.floor(cam.x / 64) * 64, by = Math.floor(cam.y / 64) * 64;
  for (let y = by; y < cam.y + VIEW_H; y += 64) for (let x = bx; x < cam.x + VIEW_W; x += 64) ctx.drawImage(SPR[lvl().bg], x - cam.x + shx, y - cam.y + shy);
  ctx.restore();
  ctx.strokeStyle = lvl().edge; ctx.lineWidth = 2; ctx.strokeRect(-cam.x + shx - 1, -cam.y + shy - 1, CFG.W + 2, CFG.H + 2);

  // which players can poke right now (drives the weak-spot brackets)
  // who could poke right now: not down, not mid-lash and not on cooldown (the weak-spot highlight and CLICK / TAP hint only show then)
  const pokers = (isGuest() ? [players[meIdx()]] : net ? [players[0]] : players).filter(p => p && !p.down && !p.tail && !p.tailG && !(p.pokeCd > 0));
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
  for (const pl of G.pills) {
    if (pl.life < 5 && Math.floor(G.t * 6) % 2) continue;   // blinks before vanishing
    const by = Math.sin(G.t * 4 + pl.x) * 1.5, pu = 0.5 + 0.5 * Math.sin(G.t * 5);
    for (let i = 0; i < 12; i++) { const t = i / 12 * 6.283 + G.t * 1.5; rect(pl.x + Math.cos(t) * 11 - cam.x + shx, pl.y + by + Math.sin(t) * 11 - cam.y + shy, 1, 1, '#ffe070', 0.35 + 0.4 * pu); }
    sprite(SPR.pill, pl.x, pl.y + by, 18, 9);
  }

  if (G.fix.length) {   // level furniture + the fixables (air sacs / valves / pacemaker)
    const heart = lvKey === 'heart', lung = lvKey === 'lung';
    if (lung) {   // trachea
      const tx = TRACHEA.x - cam.x + shx, ty = -cam.y + shy;
      rect(tx - 9, ty, 18, 56, '#5a2c46'); rect(tx - 7, ty, 14, 56, '#a86a88');
      for (let y = 4; y < 56; y += 8) rect(tx - 9, ty + y, 18, 2, '#5a2c46');
    } else {   // the core, beating
      const pu = beatPulse(), cx = HEART_C.x - cam.x + shx, cy = HEART_C.y - cam.y + shy;
      for (let i = 0; i < 40; i++) { const t = i / 40 * 6.283; rect(cx + Math.cos(t) * (30 + 6 * pu), cy + Math.sin(t) * (30 + 6 * pu), 2, 2, '#ff6070', 0.25 + 0.3 * pu); }
    }
    const br = breathY(), bp = beatPulse();
    for (const f of G.fix) {
      const img = SPR[f.kind][f.st], k = heart ? 1 + 0.14 * bp : lung ? 1 - 0.18 * br : 1, w = Math.round(img.width * k), h = Math.round(img.height * k);
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
      if (f.st > 0 && f.spawnMax > 0) {   // when the next little enemy pops out
        const bx2 = Math.round(f.x - 12 - cam.x + shx), by2 = Math.round(f.y + 25 - cam.y + shy);
        rect(bx2 - 1, by2 - 1, 26, 4, '#000', 0.7); rect(bx2, by2, Math.round(24 * clamp(1 - f.spawnT / f.spawnMax, 0, 1)), 2, heart ? '#ff9a40' : '#9ae05a');
      }
      const fl = Math.floor(G.t * 4) % 2;
      if (f.st === 0 && f.allyMax > 0) {   // when the next ally pops out
        const bx2 = Math.round(f.x - 12 - cam.x + shx), by2 = Math.round(f.y + 25 - cam.y + shy);
        rect(bx2 - 1, by2 - 1, 26, 4, '#000', 0.7); rect(bx2, by2, Math.round(24 * clamp(1 - f.allyT / f.allyMax, 0, 1)), 2, '#7fe8ff');
      }
      drawText(FIXNAMES[f.kind][f.st], f.x - cam.x + shx, f.y + 17 - cam.y + shy, f.st === 2 && fl ? '#ffffff' : ['#7fe8ff', '#ffd060', '#ff8a7a'][f.st], 1, 'c');
      const fx0 = f.x - cam.x + shx, fy0 = f.y - cam.y + shy;
      if (f.st === 2) {   // lost: a pulsing red ring and a cross, readable from afar
        const pu = 0.5 + 0.5 * Math.sin(G.t * 5);
        ctx.strokeStyle = 'rgba(255,70,60,' + (0.45 + 0.4 * pu) + ')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(fx0, fy0, 24 + 2 * pu, 0, 6.283); ctx.stroke();
        for (let i = -6; i <= 6; i += 2) { rect(fx0 + i - 1, fy0 + i - 1 - 30, 3, 3, '#000', 0.6); rect(fx0 + i, fy0 + i - 30, 2, 2, '#ff4a3a'); rect(fx0 - i - 1, fy0 + i - 1 - 30, 3, 3, '#000', 0.6); rect(fx0 - i, fy0 + i - 30, 2, 2, '#ff4a3a'); }
      }
      if (f.hackP > 0.01 || f.hackN > 0) {   // being hacked: alarm ring, progress arc and a percentage
        const hot = f.hackN > 0, pu = 0.5 + 0.5 * Math.sin(G.t * 14);
        if (hot) { ctx.strokeStyle = 'rgba(255,60,200,' + (0.3 + 0.5 * pu) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(fx0, fy0, 27 + 3 * pu, 0, 6.283); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(fx0, fy0, 21, 0, 6.283); ctx.stroke();
        ctx.strokeStyle = hot ? '#ff40d0' : '#a04080'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(fx0, fy0, 21, -1.5708, -1.5708 + 6.283 * clamp(f.hackP, 0, 1)); ctx.stroke();
        if (hot) drawText('HACKING ' + Math.round(f.hackP * 100) + '%', fx0, fy0 - 40, fl ? '#ffffff' : '#ff60e0', 1, 'c');
      }
    }
    for (const u of G.units) {   // the saboteurs' data link to the fixable they are hacking
      const f = u.hack || u.hackG;
      if (!f || u.dead || u.team !== 'v') continue;
      const ax = u.x - cam.x + shx, ay = u.y - cam.y + shy, bx = f.x - cam.x + shx, by = f.y - cam.y + shy, L = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / L, ny = (bx - ax) / L;
      const n = Math.max(3, Math.floor(L / 5));
      for (let i = 0; i <= n; i++) {
        const k = i / n, j = Math.sin(G.t * 40 + i * 2.3 + u.id) * 2.2 * Math.sin(k * 3.1416);
        rect(ax + (bx - ax) * k + nx * j - 1, ay + (by - ay) * k + ny * j - 1, 2, 2, '#ff40d0', 0.8);
      }
      for (let i = 0; i < 3; i++) { const k = (G.t * 1.6 + i / 3) % 1; rect(ax + (bx - ax) * k - 1.5, ay + (by - ay) * k - 1.5, 4, 4, '#fff'); }
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
    const grow = clamp((G.t - u.born) / 0.35, 0.35, 1); let sz = (inf ? img.width : TYPES[u.type].ally) * grow;
    const mk = u.morph ? u.morph.t / MORPH_T : u.morphK > 0 ? u.morphK : 0;
    if (u.boss && mk > 0) {   // transforming: shrinks into the pet and blinks all the way
      const bw = img.width; img = mk > 0.5 ? SPR.pet : img; sz = bw + (SPR.pet.width - bw) * mk;
      if (Math.floor((G.t + (G.cine ? G.cine.t : 0)) * 14) % 2) img = tinted(img, '#ffffff');
    }
    if (u.flash > 0) img = tinted(img, '#ffffff');
    rect(u.x - u.r * 0.8 - cam.x + shx, u.y + u.r - 1 - cam.y + shy, Math.round(u.r * 1.6), 2, '#000', 0.3);
    if (!tailOf(u)) {   // idle tail wags behind the body, beside the weak spot
      const [tcol, tdark] = unitTail(u);
      const a = u.weakA + 0.9 + Math.sin(G.t * 5 + u.id) * 0.4, bx = u.x + Math.cos(u.weakA + 0.9) * u.r * 0.7, by = u.y + Math.sin(u.weakA + 0.9) * u.r * 0.7, len = u.r * 0.9 + 3;
      drawLash(bx, by, bx + Math.cos(a) * len, by + Math.sin(a) * len, 1.5, tcol, tdark, null, u.id % 7);
    }
    sprite(img, u.x, u.y, sz, sz);
    if (u.stuckT > 0) { ctx.globalAlpha = 0.55; sprite(tinted(inf ? SPR.virus[u.type] : SPR.ally, '#7fe04a'), u.x, u.y, sz, sz); ctx.globalAlpha = 1; }
    if (u.boss) continue;
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
  for (const u of G.units) {   // warning: dotted lanes just before a boss fires
    if (!u.boss || u.dead || u.morph || u.morphK > 0 || G.cine || !(u.shotT > 0 && u.shotT < 0.55)) continue;
    const t = nearestPlayer(u);
    if (!t || dist(u, t) > BOSS_AI[u.type].range) continue;
    const k = 1 - u.shotT / 0.55, col = (FP_COL[lvKey] || [0, '#c8f060'])[1];
    for (const a of bossAngles(u, t)) for (let d = u.r + 6; d < u.r + 70; d += 8) rect(u.x + Math.cos(a) * d - cam.x + shx, u.y + Math.sin(a) * d - cam.y + shy, 2, 2, col, 0.25 + 0.6 * k);
  }
  for (const b of G.fp) {   // snot balls
    const x = b.x - cam.x + shx, y = b.y - cam.y + shy, pu = Math.floor(G.t * 10) % 2;
    const fc = FP_COL[lvKey] || ['#26340a', '#c8f060', '#a8c83a']; rect(x - 3, y - 3, 6, 6, fc[0]); rect(x - 2, y - 2, 4, 4, pu ? fc[1] : fc[2]); rect(x - 1, y - 2, 1, 1, '#fff');
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
      ctx.fillStyle = b.c ? '#3a5aff' : '#ff4a1a'; ctx.globalAlpha = 0.1 + 0.3 * k * (0.6 + 0.4 * pu); ctx.fillRect(16, -b.w / 2, b.len, b.w);
      ctx.fillStyle = b.c ? '#bfe0ff' : '#ffe070'; ctx.globalAlpha = 0.3 + 0.5 * k;
      for (let d = 16; d < b.len; d += 14) { ctx.fillRect(d, -b.w / 2, 5, 2); ctx.fillRect(d + 7, b.w / 2 - 2, 5, 2); }
      ctx.globalAlpha = 0.5 + 0.5 * pu; ctx.fillRect(16, -b.w / 2, b.len, 1); ctx.fillRect(16, b.w / 2 - 1, b.len, 1);
    } else {
      const f = 0.8 + 0.2 * Math.sin(b.t * 70);
      ctx.fillStyle = b.c ? '#5a8aff' : '#ff6a1a'; ctx.globalAlpha = 0.5 * f; ctx.fillRect(8, -b.w / 2 - 3, b.len, b.w + 6);
      ctx.fillStyle = b.c ? '#a0c8ff' : '#ffb040'; ctx.globalAlpha = 0.95; ctx.fillRect(8, -b.w / 2 + 1, b.len, b.w - 2);
      ctx.fillStyle = b.c ? '#f0f8ff' : '#fff6c0'; ctx.fillRect(8, -2, b.len, 4);
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }

  if (G.pet) {   // the Man Flu pet: bobbing and happy
    const pt = G.pet, bob = Math.sin(G.t * 7) * 1.5 * (Math.hypot(pt.vx || 0, pt.vy || 0) > 8 ? 1 : 0.4);
    rect(pt.x - 5 - cam.x + shx, pt.y + 7 - cam.y + shy, 10, 2, '#000', 0.3);
    sprite(SPR.pet, pt.x, pt.y + bob);
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

  if (lvKey === 'heart') {   // every beat throbs the screen red; blood cells swirl around the core faster on the beat
    const pu = beatPulse();
    rect(0, 0, VIEW_W, VIEW_H, '#ff2040', 0.05 + 0.1 * pu);
    for (let i = 0; i < 60; i++) {
      const r = 70 + (i * 53) % 400, a = i * 2.39 + G.flowA * (1 + (i % 5) * 0.12) * 60 / (r + 60) * 2;
      const x = HEART_C.x + Math.cos(a) * r - cam.x + shx, y = HEART_C.y + Math.sin(a) * r - cam.y + shy;
      if (x > 0 && x < VIEW_W && y > 0 && y < VIEW_H) rect(x, y, 2, 2, i % 3 ? '#ff8a98' : '#ffd0d6', 0.5);
    }
  }
  drawGlobs();
  if (lvKey === 'stomach') drawAcid();
  if (lvKey === 'blood') { drawCurrent(); drawBloodWalls(); }
  if (lvKey === 'brain') { drawDarkness(); drawWeb(); drawBolts(); }
  drawPowers();
  if (lvKey === 'lung') {
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
  if (G.cine) drawCineSpot();
  drawHud();
  if (touchUI && state === 'play') drawTouch();
  if (state === 'title') drawTitle();
  if (state === 'powers') drawPowersMenu();
  if (state === 'settings') drawSettingsMenu();
  if (state === 'levels') drawLevelSelect();
  if (state === 'levelup') drawLevelUp();
  if (state === 'over') drawOver();
  if (state === 'paused') {
    if (pauseSettings) drawSettingsMenu();
    else {
      rect(0, 0, VIEW_W, VIEW_H, '#000', 0.5); drawText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 22, '#fff', 3, 'c'); drawText(touchUI ? 'TAP TO RESUME' : 'P TO RESUME', VIEW_W / 2, VIEW_H / 2 + 4, '#bfe8ff', 1, 'c');
      const pb = pauseBtns();
      for (const [b, label] of [[pb.set, setLabel()], [pb.menu, menuLabel()]]) {
        const h = !touchUI && inRect(b, mouse.sx, mouse.sy);
        rect(b.x - 1, b.y - 1, b.w + 2, b.h + 2, h ? '#ffe070' : '#4aa8ff'); rect(b.x, b.y, b.w, b.h, h ? '#243c78' : '#12204a');
        drawText(label, b.x + b.w / 2, b.y + 4, '#fff', 1, 'c');
      }
    }
  }
  if (state === 'play' && mouse.moved && !touchUI) { // crosshair (player 1 aims with the mouse)
    const mx = Math.round(mouse.sx), my = Math.round(mouse.sy);
    // bright arms with a dark outline so it reads on every background; the centre dot marks the exact aim point
    for (const [dx, dy, w, h] of [[-8, 0, 5, 1], [4, 0, 5, 1], [0, -8, 1, 5], [0, 4, 1, 5]]) { rect(mx + dx - 1, my + dy - 1, w + 2, h + 2, '#000', 0.85); }
    rect(mx - 2, my - 2, 5, 5, '#000', 0.85);
    for (const [dx, dy, w, h] of [[-8, 0, 5, 1], [4, 0, 5, 1], [0, -8, 1, 5], [0, 4, 1, 5]]) rect(mx + dx, my + dy, w, h, '#fff060');
    rect(mx - 1, my - 1, 3, 3, '#fff060'); rect(mx, my, 1, 1, '#000');
  }
}

function drawHud() {
  if (state === 'title' || state === 'levels' || state === 'settings' || state === 'powers') return;
  const n = players.length;
  players.forEach((p, i) => {
    const y = 4 + i * 17, label = n > 1 ? 'P' + (i + 1) + ' INFECTION' : 'INFECTION';
    drawText(label, 4, y, p.down ? '#9ae05a' : (n > 1 ? PCOL[i] : '#ffb0b8'));
    rect(3, y + 8, 82, 7, '#000'); rect(4, y + 9, 80, 5, '#3a1018');
    rect(4, y + 9, Math.round(80 * Math.min(1, p.infection / 100)), 5, p.infection > 70 ? '#ff4040' : '#d86a30');
  });
  const xy = 4 + n * 17;
  rect(3, xy, 82, 5, '#000'); rect(4, xy + 1, 80, 3, '#102840');
  rect(4, xy + 1, Math.round(80 * S.xp / S.next), 3, '#38b8ff');
  drawText('LV ' + S.level + '  RES ' + Math.round(S.res * 100) + '%', 4, xy + 8, '#bfe8ff');
  const keyHint = touchUI ? '' : ' [F]';
  const fireLine = S.shoot && !(manualFire() && touchUI);   // phones show the FIRE button instead of a status line
  if (fireLine) {
    if (manualFire()) drawText('HOLD [F] TO FIRE', 4, xy + 17, '#ffd88a');
    else drawText(players.map((p, i) => (n > 1 ? 'P' + (i + 1) + ' ' : '') + tr('FIRE ' + (p.autoFire ? 'ON' : 'OFF'))).join('  ') + keyHint, 4, xy + 17, players.every(p => p.autoFire) ? '#7fffd0' : '#ffd88a');
  }
  {   // active medicine effects
    const locals = isGuest() ? [players[meIdx()]] : net ? [players[0]] : players;
    let by = xy + 17 + (fireLine ? 9 : 0);
    for (const p of locals) {
      if (!p) continue;
      const list = [['speed', 'SPEED'], ['shield', 'SHIELD'], ['poke', 'POKE+'], ['bloat', 'BIG'], ['slow', 'SLOW']].filter(([k]) => p.fx[k] > 0).map(([k, nm]) => tr(nm) + ' ' + Math.ceil(p.fx[k]));
      if (!list.length) continue;
      drawText((locals.length > 1 ? 'P' + (p.idx + 1) + ' ' : '') + list.join('  '), 4, by, p.fx.slow > 0 || p.fx.bloat > 0 ? '#ffd88a' : '#7fffd0'); by += 9;
    }
  }
  // timer
  const left = Math.max(0, lvl().time - G.t), mm = Math.floor(left / 60), ss = Math.floor(left % 60);
  drawText(mm + ':' + String(ss).padStart(2, '0'), VIEW_W / 2, 4, '#fff', 2, 'c');
  if (G.fix.length) {
    const heart = lvKey === 'heart', T = lvl().txt, O = oxy(), w = 80, x = VIEW_W / 2 - w / 2, warn = G.suffT > 0;
    rect(x - 1, 20, w + 2, 7, '#000'); rect(x, 21, w, 5, '#102840'); rect(x, 21, Math.round(w * 0.15), 5, '#3a1018'); rect(x, 21, Math.round(w * O), 5, O < 0.3 ? '#ff5050' : heart ? '#ff7a8a' : lvKey === 'brain' ? '#8a9aff' : '#4ad8ff');
    rect(x + Math.round(w * 0.15), 20, 1, 7, '#ff5050');   // below this line the countdown to losing starts
    drawText(warn ? tr(T.warn) + ' ' + Math.max(0, Math.ceil(GRACE() - G.suffT)) : tr(T.bar) + ' ' + Math.round(O * 100) + '%', VIEW_W / 2, 29, warn && Math.floor(G.t * 4) % 2 ? '#ff5050' : O < 0.3 ? '#ff9a9a' : '#bfe8ff', 1, 'c');
    if (heart) {
      const fv = Math.round((1 - O) * 100), pu = beatPulse(), ic = SPR.heartIcon, k = 1 + 0.5 * pu;
      ctx.drawImage(ic, Math.round(VIEW_W / 2 - 22 - ic.width * k / 2), Math.round(VIEW_H - 14 - (k - 1) * 4), Math.round(ic.width * k), Math.round(ic.height * k));
      drawText('FEVER ' + fv + '%', VIEW_W / 2 + 4, VIEW_H - 12, fv > 60 ? '#ff6a5a' : fv > 30 ? '#ffb060' : '#ffd0d6', 1, 'l');
    } else if (lvKey === 'brain') {
      drawText('LIT ' + G.fix.filter(f => f.st === 0).length + '/' + G.fix.length, VIEW_W / 2, VIEW_H - 12, '#bfd0ff', 1, 'c');
    } else if (lvKey === 'stomach') {
      drawText('ACID ' + Math.round(acidDepth() / CFG.H * 100) + '%', VIEW_W / 2, VIEW_H - 12, '#e8e860', 1, 'c');
    } else if (lvKey === 'blood') {
      const k = flowK();
      drawText(k > 0.2 ? 'CURRENT FORWARD' : k < -0.2 ? 'CURRENT REVERSED' : 'CURRENT SLACK', VIEW_W / 2, VIEW_H - 12, '#ffb0c0', 1, 'c');
    } else {
      const br = breathY();
      drawText(br < -0.05 ? '< INHALE: PULLED UP' : br > 0.05 ? 'EXHALE: PUSHED DOWN >' : 'BREATHE', VIEW_W / 2, VIEW_H - 12, '#ffd0e8', 1, 'c');
    }
    rect(3, VIEW_H - 63, tr('PHASE ' + G.phase + '/3').length * FONT_ADV + 3, FONT_H + 3, '#000', 0.55);
    drawText('PHASE ' + G.phase + '/3', 4, VIEW_H - 62, ['#bfe8ff', '#ffd88a', '#ff9a8a'][G.phase - 1]);
    const hacked = G.fix.filter(f => f.hackN > 0);
    if (hacked.length) {   // loud banner: something is being attacked right now
      const top = hacked.reduce((a, b) => b.hackP > a.hackP ? b : a), txt = '! ' + tr(fixTag(top)) + ' ' + tr('UNDER ATTACK') + (hacked.length > 1 ? ' +' + (hacked.length - 1) : '') + ' !', fl = Math.floor(G.t * 5) % 2;
      rect(VIEW_W / 2 - (txt.length * FONT_ADV) / 2 - 5, 39, txt.length * FONT_ADV + 10, FONT_H + 4, fl ? '#a01880' : '#400a38', 0.9);
      drawText(txt, VIEW_W / 2, 41, '#fff', 1, 'c');
    }
  }
  const boss = G.units.find(u => u.boss && !u.dead);
  if (boss) {   // boss health bar along the bottom of the screen
    const w = Math.min(200, VIEW_W - 40), x = VIEW_W / 2 - w / 2, y = VIEW_H - 32, fr = clamp(boss.hpF !== undefined ? boss.hpF : boss.hp / boss.maxHp, 0, 1), fl = boss.morph || boss.morphK > 0;
    drawText(BOSSES[boss.type], VIEW_W / 2, y - 16, fl && Math.floor((G.t + (G.cine ? G.cine.t : 0)) * 8) % 2 ? '#ff9ac8' : { manflu: '#c8f060', ulcer: '#ffb050', sepsis: '#e08aff' }[boss.type], 2, 'c');
    rect(x - 2, y - 2, w + 4, 11, '#000'); rect(x - 1, y - 1, w + 2, 9, { manflu: '#a8c83a', ulcer: '#e08a30', sepsis: '#a040b0' }[boss.type]); rect(x, y, w, 7, '#2a0a08');
    rect(x, y, Math.round(w * fr), 7, fl ? '#ff9ac8' : '#d03020'); rect(x, y, Math.round(w * fr), 2, fl ? '#ffd0e4' : '#ff6a50');
  }
  drawText('ALLIES ' + count('i'), VIEW_W - 4, 4, '#7fffd0', 1, 'r');
  drawText('KILLS ' + G.kills, VIEW_W - 4, 13, '#fff', 1, 'r');
  drawText('TURNED ' + G.conv, VIEW_W - 4, 22, '#7fe8ff', 1, 'r');
  if (camp) drawText((camp.i + 1) + '/' + CAMPAIGN.length + ' ' + tr(lvl().name), VIEW_W - 4, 31, '#ffe070', 1, 'r');
  // minimap: where every objective is and how it is doing (blue ok, yellow damaged, red lost, flashing magenta being hacked)
  {
    const mw = 60, mh = 45, mx = 4, my = VIEW_H - mh - 4, k = mw / CFG.W, fl = Math.floor(G.t * 6) % 2;
    rect(mx - 1, my - 1, mw + 2, mh + 2, '#000', 0.75); rect(mx, my, mw, mh, '#0c1424', 0.6);
    const vx = mx + cam.x * k, vy = my + cam.y * k, vw = VIEW_W * k, vh = VIEW_H * k;
    rect(vx, vy, vw, 1, '#fff', 0.35); rect(vx, vy + vh - 1, vw, 1, '#fff', 0.35); rect(vx, vy, 1, vh, '#fff', 0.35); rect(vx + vw - 1, vy, 1, vh, '#fff', 0.35);
    const dot = (x, y, r, col) => rect(Math.round(mx + clamp(x * k, r, mw - r - 1) - r), Math.round(my + clamp(y * k, r, mh - r - 1) - r), r * 2 + 1, r * 2 + 1, col);
    for (const o of organs) { const inf = o.team === 'v'; dot(o.x, o.y, 2, '#000'); dot(o.x, o.y, 1, inf ? '#9ae05a' : '#2a7ad8'); }
    for (const f of G.fix) {
      const hot = f.hackN > 0, col = hot ? (fl ? '#ffffff' : '#ff40d0') : ['#4ad8ff', '#ffd060', '#ff5a4a'][f.st];
      dot(f.x, f.y, 2, '#000'); dot(f.x, f.y, hot || f.st > 0 ? 2 : 1, col);
      if (f.st === 2 && !hot && fl) dot(f.x, f.y, 0, '#000');
    }
    for (const p of players) dot(p.x, p.y, 1, p.down ? '#ff9a9a' : p.idx ? '#ffc070' : '#7fffd0');
    const lbl = organs.length ? 'ORGANS ' + organs.filter(o => o.team === 'i').length + '/' + organs.length : '';
    if (lbl) drawText(lbl, mx, my - 9, '#bfe8ff', 1, 'l');
  }
  if (G.msgT > 0 && state !== 'levelup' && state !== 'over') {   // not under the level-up / end screens
    const sc = tr(G.msg).length * 12 + 12 > VIEW_W ? 1 : 2, ls = wrapText(G.msg, Math.floor((VIEW_W - 16) / (FONT_ADV * sc))).slice(0, 3), lh = FONT_H * sc + 2, my = 54;   // below the HUD stack on the left; long messages drop to small text and wrap
    const w = Math.max(...ls.map(l => l.length)) * FONT_ADV * sc + 12;
    rect(VIEW_W / 2 - w / 2, my, w, lh * ls.length + 2, '#000', 0.6);
    const mcol = G.msg.includes('CLEANSED') || G.msg.includes('BACK') ? '#7fe8ff' : G.msg.includes('SWARM') || G.msg.includes('INFECTED!') && G.msg[0] === 'P' ? '#ffd060' : '#b8f070';
    ls.forEach((l, k) => drawText(l, VIEW_W / 2, my + 2 + k * lh, mcol, sc, 'c'));
  }
  // offscreen arrows: infected organs (green) and downed players (to revive)
  const marks = organs.filter(o => o.team === 'v').map(o => ({ x: o.x, y: o.y, tag: tr(o.tag), col: '#9ae05a', tc: '#b8f070' }))
    .concat(G.fix.filter(f => f.st > 0 || f.hackN > 0).map(f => ({ x: f.x, y: f.y, tag: tr(fixTag(f)), col: f.hackN > 0 ? '#ff40d0' : f.st > 1 ? '#ff5a4a' : '#ffd060', tc: f.hackN > 0 ? '#ff90e8' : f.st > 1 ? '#ff9a8a' : '#ffd88a', hot: f.hackN > 0, lost: f.st > 1, pct: f.hackN > 0 ? Math.round(f.hackP * 100) : -1 })))
    .concat(players.filter(p => p.down).map(p => ({ x: p.x, y: p.y, tag: 'P' + (p.idx + 1), col: '#7fffd0', tc: '#7fffd0' })));
  for (const o of marks) {
    const sx = o.x - cam.x, sy = o.y - cam.y;
    if (sx > 0 && sx < VIEW_W && sy > 0 && sy < VIEW_H) continue;
    const a = Math.atan2(sy - VIEW_H / 2, sx - VIEW_W / 2);
    const ex = clamp(VIEW_W / 2 + Math.cos(a) * 400, 16, VIEW_W - 16), ey = clamp(VIEW_H / 2 + Math.sin(a) * 400, 60, VIEW_H - 48);
    const pu = 0.6 + 0.4 * Math.sin(G.t * (o.hot ? 14 : 6)), sz = o.hot ? 8 : o.lost ? 6 : 4;
    ctx.globalAlpha = o.hot ? 1 : pu; ctx.fillStyle = '#000'; ctx.beginPath();
    ctx.moveTo(ex + Math.cos(a) * (sz + 2), ey + Math.sin(a) * (sz + 2)); ctx.lineTo(ex + Math.cos(a + 2.5) * (sz + 2), ey + Math.sin(a + 2.5) * (sz + 2)); ctx.lineTo(ex + Math.cos(a - 2.5) * (sz + 2), ey + Math.sin(a - 2.5) * (sz + 2)); ctx.fill();
    ctx.fillStyle = o.hot && Math.floor(G.t * 8) % 2 ? '#ffffff' : o.col; ctx.beginPath();
    ctx.moveTo(ex + Math.cos(a) * sz, ey + Math.sin(a) * sz); ctx.lineTo(ex + Math.cos(a + 2.5) * sz, ey + Math.sin(a + 2.5) * sz); ctx.lineTo(ex + Math.cos(a - 2.5) * sz, ey + Math.sin(a - 2.5) * sz); ctx.fill(); ctx.globalAlpha = 1;
    drawText((o.hot ? '! ' : '') + o.tag + (o.pct >= 0 ? ' ' + o.pct + '%' : ''), ex, ey + sz + 2, o.tc, 1, 'c');
  }
}

const fixTag = f => f.kind === 'pace' ? 'PACE' : f.kind === 'valve' ? 'VALVE' : f.kind === 'syn' ? 'SYNAPSE' : f.kind === 'gland' ? 'GLAND' : f.kind === 'vessel' ? 'VESSEL' : 'SAC';

function drawTouch() {
  const ring = (x, y, r, col, a) => {
    for (let i = 0; i < 40; i++) { const t = i / 40 * 6.283; rect(x + Math.cos(t) * r, y + Math.sin(t) * r, 1, 1, col, a); }
  };
  for (const [k, hx, col] of [['move', 112, '#bfe8ff'], ['aim', VIEW_W - 52, '#ffc070']]) {
    const st = touch[k];
    if (!st) { ring(hx, VIEW_H - 52, STICK_R, col, 0.22); drawText(k === 'move' ? 'MOVE' : 'AIM', hx, VIEW_H - 54, col, 1, 'c'); continue; }
    ring(st.ox, st.oy, STICK_R, col, 0.5);
    const v = stickVec(st, 0);
    rect(st.ox + v.x * STICK_R - 3, st.oy + v.y * STICK_R - 3, 7, 7, col, 0.8);
  }
  if (S.shoot) {   // FIRE toggle button
    const b = fireBtn(), me = isGuest() ? players[meIdx()] : players[0], manual = manualFire(), on = manual ? touch.fire !== null : !me || me.autoFire;
    rect(b.x - 1, b.y - 1, b.w + 2, b.h + 2, on ? '#7fffd0' : manual ? '#ffd88a' : '#ff9a9a', 0.7); rect(b.x, b.y, b.w, b.h, on && manual ? '#1c4a5a' : '#12204a', 0.85);
    drawText(manual ? 'FIRE' : on ? 'FIRE ON' : 'FIRE OFF', b.x + b.w / 2, b.y + (manual ? 7 : 4), on ? '#7fffd0' : manual ? '#ffd88a' : '#ff9a9a', manual ? 1 : 1, 'c');
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
const tbtn = i => ({ x: i ? (i === 1 ? -98 : 4) : -47, y: VIEW_H - 76 + (i ? 1 : 0) * 24 });   // 1 PLAYER on top, the two online buttons below, anchored to the bottom
const powLabel = () => tr('POWERS') + (touchUI ? '' : ' [P]'), setLabel = () => tr('SETTINGS') + (touchUI ? '' : ' [S]');
const powBtn = () => { const w = btnW(powLabel()); return VIEW_H < 220 ? { x: VIEW_W / 2 - 2 - w, y: VIEW_H - 25, w, h: 14 } : { x: 4, y: 4, w, h: 14 }; };   // phones: one row under the main buttons, clear of the title
const setBtn = () => { const w = btnW(setLabel()); return VIEW_H < 220 ? { x: VIEW_W / 2 + 2, y: VIEW_H - 25, w, h: 14 } : { x: 4, y: 22, w, h: 14 }; };
const powBackBtn = () => ({ x: VIEW_W / 2 - 40, y: VIEW_H - 24, w: 80, h: 14 });
function titleBtnAt(mx, my) {
  const c = VIEW_W / 2;
  if (inRect(powBtn(), mx, my)) return 6;
  if (inRect(setBtn(), mx, my)) return 7;
  for (let i = 0; i < 3; i++) { const b = tbtn(i); if (mx >= c + b.x && mx < c + b.x + TBW && my >= b.y && my < b.y + TBH) return i + 1; }
  return 0;
}
function drawTitle() {
  rect(0, 0, VIEW_W, VIEW_H, '#000', 0.55);
  const c = VIEW_W / 2, compact = VIEW_H < 220;
  drawText('VACCINE', c, compact ? 4 : 10, '#9ae05a', compact ? 3 : 4, 'c');
  drawText('VIRAL ASSAULT CELLULAR COUNTER-INITIATIVE', c, compact ? 28 : 42, '#bfe8ff', 1, 'c');
  drawText('NANO EDITION', c, compact ? 38 : 52, '#ffe070', 1, 'c');
  if (!compact) {
    const bob = Math.sin(performance.now() / 200) * 2;
    ctx.drawImage(SPR.player, c - 28, 62 + bob, 32, 32); ctx.drawImage(SPR.player2, c + 0, 62 - bob, 32, 32);
    ctx.drawImage(SPR.virus.basic, c - 66, 70); ctx.drawImage(SPR.virus.brute, c + 40, 64); ctx.drawImage(SPR.virus.runner, c - 86, 88);
  }
  let lines = touchUI
    ? ['LEFT STICK MOVES, RIGHT STICK AIMS', 'ONLINE CO-OP WORKS BETWEEN PHONES AND PCS']
    : ['1 PLAYER: WASD MOVE, MOUSE AIM, SPACE POKES', 'ONLINE CO-OP: HOST OR JOIN A ROOM WITH A 4-LETTER CODE'];
  lines.push(touchUI ? 'GET CLOSE, THEN TAP A GLOWING WEAK SPOT TO POKE IT' : 'GET CLOSE, THEN CLICK A GLOWING WEAK SPOT TO POKE IT', 'YOUR TAIL TURNS VIRUSES INTO ALLIES',
    'PLAY THE CAMPAIGN OR ANY SINGLE LEVEL');
  if (compact) lines = [lines[0], lines[2], lines[4]];
  lines.forEach((t, i) => drawText(t, c, (compact ? 52 : 100) + i * (compact ? 10 : 9), i < (compact ? 1 : 2) ? '#fff' : '#ffd88a', 1, 'c'));
  const hov = titleBtnAt(mouse.sx, mouse.sy);
  const labels = touchUI ? ['1 PLAYER', 'HOST ONLINE', 'JOIN ONLINE'] : ['[1] 1 PLAYER', '[2] HOST ONLINE', '[3] JOIN ONLINE'];
  for (let i = 0; i < 3; i++) {
    const b = tbtn(i), h = hov === i + 1 && !touchUI, x = c + b.x;
    rect(x - 1, b.y - 1, TBW + 2, TBH + 2, h ? '#ffe070' : '#4aa8ff'); rect(x, b.y, TBW, TBH, h ? '#243c78' : '#12204a');
    drawText(labels[i], x + TBW / 2, b.y + 6, '#fff', 1, 'c');
  }
  {
    const b = setBtn(), h = hov === 7 && !touchUI;
    rect(b.x - 1, b.y - 1, b.w + 2, b.h + 2, h ? '#ffe070' : '#4aa8ff'); rect(b.x, b.y, b.w, b.h, h ? '#243c78' : '#12204a');
    drawText(setLabel(), b.x + b.w / 2, b.y + 4, '#fff', 1, 'c');
  }
  {
    const b = powBtn(), h = hov === 6 && !touchUI;
    rect(b.x - 1, b.y - 1, b.w + 2, b.h + 2, h ? '#ffe070' : '#ffd24a'); rect(b.x, b.y, b.w, b.h, h ? '#3c3418' : '#241e0c');
    drawText(powLabel(), b.x + b.w / 2, b.y + 4, '#ffd24a', 1, 'c');
  }
  if (fsAvail()) {
    const f = fsBtnTitle();
    rect(f.x - 1, f.y - 1, f.w + 2, f.h + 2, '#4aa8ff'); rect(f.x, f.y, f.w, f.h, '#12204a');
    drawText(isFullscreen() ? 'WINDOWED' : 'FULLSCREEN', f.x + f.w / 2, f.y + 4, '#fff', 1, 'c');
  }
  const tip = touchUI && !fsSupported && !isStandalone() ? 'TIP: SHARE > ADD TO HOME SCREEN FOR FULLSCREEN' : '';
  drawText(titleMsg || tip || (touchUI ? '' : 'P PAUSES'), c, VIEW_H < 220 ? VIEW_H - 9 : VIEW_H - 26, titleMsg ? '#ff9a9a' : tip ? '#ffd88a' : '#8aa0d0', 1, 'c');
}
// level select: a campaign tile (the five organs in order) on top, one tile per single level below
function levelTiles() {
  const compact = VIEW_H < 220, c = VIEW_W / 2, gap = compact ? 4 : 6, tw = 96, th = compact ? 40 : 56, ch = compact ? 30 : 40;
  const top = compact ? 22 : 34, W = tw * 3 + gap * 2, out = [{ key: 'campaign', x: c - W / 2, y: top, w: W, h: ch }];
  LEVEL_SEL.slice(1).forEach((key, i) => out.push({ key, x: c - W / 2 + (i % 3) * (tw + gap), y: top + ch + gap + Math.floor(i / 3) * (th + gap), w: tw, h: th }));
  return out;
}
function tileBg(key, x, y, w, h) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const img = SPR[LEVELS[key].bg];
  for (let yy = y; yy < y + h; yy += 64) for (let xx = x; xx < x + w; xx += 64) ctx.drawImage(img, xx, yy);
  ctx.restore();
}
function drawLevelSelect() {
  rect(0, 0, VIEW_W, VIEW_H, '#000', 0.8);
  const c = VIEW_W / 2, compact = VIEW_H < 220;
  drawText(playMode === 2 ? 'CHOOSE A LEVEL TO HOST' : 'CHOOSE A LEVEL', c, compact ? 4 : 8, '#ffe070', compact ? 2 : 3, 'c');
  const hov = !touchUI && levelTiles().find(t => inRect(t, mouse.sx, mouse.sy));
  levelTiles().forEach((t, i) => {
    const h = hov && hov.key === t.key, camp = t.key === 'campaign';
    rect(t.x - 1, t.y - 1, t.w + 2, t.h + 2, h ? '#ffe070' : camp ? '#ffd24a' : LEVELS[t.key].edge);
    if (camp) {
      rect(t.x, t.y, t.w, t.h, '#12102a');
      const n = CAMPAIGN.length, sz = compact ? 16 : 20, step = (t.w - 12) / n, iy = t.y + (compact ? 12 : 16);
      CAMPAIGN.forEach((k, j) => {
        const ix = t.x + 6 + j * step + (step - sz) / 2;
        ctx.save(); ctx.beginPath(); ctx.rect(ix, iy, sz, sz); ctx.clip(); ctx.drawImage(SPR[LEVELS[k].bg], ix, iy); ctx.restore();
        rect(ix - 1, iy - 1, sz + 2, 1, LEVELS[k].edge); rect(ix - 1, iy + sz, sz + 2, 1, LEVELS[k].edge); rect(ix - 1, iy, 1, sz, LEVELS[k].edge); rect(ix + sz, iy, 1, sz, LEVELS[k].edge);
        if (j < n - 1) drawText('>', ix + sz + (step - sz) / 2 - 1, iy + sz / 2 - 3, '#ffd24a', 1, 'c');
      });
      drawText((touchUI ? '' : '[1] ') + 'CAMPAIGN', t.x + 5, t.y + 3, '#ffd24a', 1, 'l');
      drawText('UPGRADES CARRY OVER', t.x + t.w - 5, t.y + 3, '#bfe8ff', 1, 'r');
    } else {
      tileBg(t.key, t.x, t.y, t.w, t.h);
      rect(t.x, t.y, t.w, t.h, '#000', h ? 0.2 : 0.45);
      rect(t.x, t.y + t.h - 21, t.w, 21, '#000', 0.7);
      drawText((touchUI ? '' : '[' + (i + 1) + '] ') + LEVELS[t.key].name, t.x + t.w / 2, t.y + t.h - 18, '#fff', 1, 'c');
      drawText(Math.round(LEVELS[t.key].time / 60) + ' MIN', t.x + t.w / 2, t.y + t.h - 9, LEVELS[t.key].edge, 1, 'c');
    }
  });
  const b = powBackBtn(), h = !touchUI && inRect(b, mouse.sx, mouse.sy);
  rect(b.x - 1, b.y - 1, b.w + 2, b.h + 2, h ? '#ffe070' : '#4aa8ff'); rect(b.x, b.y, b.w, b.h, h ? '#243c78' : '#12204a');
  drawText('BACK', b.x + b.w / 2, b.y + 4, '#fff', 1, 'c');
}
const SETTING_DEFS = [
  { key: 'autoLevel', name: 'AUTO LEVEL-UP', info: 'PICKS UPGRADES FOR YOU SO THE GAME NEVER STOPS. THE SHOOTING UNLOCK COMES FIRST' },
  { key: 'autoFire', name: 'AUTO FIRE', info: 'ON: SHOOTS BY ITSELF, F TOGGLES. OFF: HOLD FIRE TO SHOOT (F, RIGHT CLICK)' },
  { key: 'lang', name: 'LANGUAGE', info: 'CHANGE THE GAME LANGUAGE' },
];
const settingRows = () => {
  const w = Math.min(VIEW_W - 24, 330), x = VIEW_W / 2 - w / 2, h = VIEW_H < 220 ? 34 : 40;
  return SETTING_DEFS.map((d, i) => ({ x, y: (VIEW_H < 220 ? 34 : 50) + i * (h + 6), w, h }));
};
function settingsBack() { if (pauseSettings) pauseSettings = false; else state = 'title'; }
function settingsTap() {
  if (inRect(powBackBtn(), mouse.sx, mouse.sy)) { settingsBack(); return; }
  const i = settingRows().findIndex(r => inRect(r, mouse.sx, mouse.sy));
  if (i < 0) return;
  if (SETTING_DEFS[i].key !== 'lang') { toggleSetting(i); return; }
  const a = langArrows(settingRows()[i]);
  if (inRect(a.prev, mouse.sx, mouse.sy)) toggleSetting(i, -1); else if (inRect(a.next, mouse.sx, mouse.sy)) toggleSetting(i, 1);
}
function settingsKey(k) {
  if (k === 'escape' || k === 'enter' || k === ' ' || k === 's') settingsBack();
  else if (k === '1') toggleSetting(0); else if (k === '2') toggleSetting(1);
  else if (k === '3' || k === 'arrowright') toggleSetting(2, 1); else if (k === 'arrowleft') toggleSetting(2, -1);
}
function toggleSetting(i, dir = 1) { const d = SETTING_DEFS[i]; if (!d) return; if (d.key === 'lang') { settings.lang = LANGS[(LANG + dir + LANGS.length) % LANGS.length].code; setLang(settings.lang); textCache.clear(); } else settings[d.key] = !settings[d.key]; saveSettings(); sfx('pick', 600, 0.08, 'square', 0.03, 200); }
// the language row cycles with arrows: [<] NAME [>] at the right end of the row (click either arrow, or use the left / right keys)
const langArrows = r => ({ prev: { x: r.x + r.w - 92, y: r.y, w: 52, h: 14 }, next: { x: r.x + r.w - 40, y: r.y, w: 40, h: 14 }, mid: r.x + r.w - 6 - 12 - 24 });
function drawSettingsMenu() {
  rect(0, 0, VIEW_W, VIEW_H, '#000', 0.8);
  const c = VIEW_W / 2, compact = VIEW_H < 220;
  drawText('SETTINGS', c, compact ? 6 : 10, '#9ae05a', compact ? 2 : 3, 'c');
  settingRows().forEach((r, i) => {
    const d = SETTING_DEFS[i], isLang = d.key === 'lang', on = !isLang && settings[d.key], h = !touchUI && inRect(r, mouse.sx, mouse.sy);
    rect(r.x - 1, r.y - 1, r.w + 2, r.h + 2, h ? '#ffe070' : on ? '#7fffd0' : '#4aa8ff'); rect(r.x, r.y, r.w, r.h, '#12204a');
    drawText((touchUI ? '' : '[' + (i + 1) + '] ') + d.name, r.x + 6, r.y + 4, '#fff', 1, 'l');
    if (isLang) {
      const a = langArrows(r), hp = !touchUI && inRect(a.prev, mouse.sx, mouse.sy), hn = !touchUI && inRect(a.next, mouse.sx, mouse.sy);
      drawText('<', a.mid - 31, r.y + 4, hp ? '#ffe070' : '#8aa0d0', 1, 'l'); drawText(LANGS[LANG].name, a.mid, r.y + 4, '#ffe070', 1, 'c'); drawText('>', r.x + r.w - 6, r.y + 4, hn ? '#ffe070' : '#8aa0d0', 1, 'r');
    } else drawText(on ? 'ON' : 'OFF', r.x + r.w - 6, r.y + 4, on ? '#7fffd0' : '#ff9a9a', 1, 'r');
    wrapText(d.info, Math.floor((r.w - 12) / FONT_ADV)).slice(0, 2).forEach((t, j) => drawText(t, r.x + 6, r.y + 16 + j * 9, '#bfe8ff', 1, 'l'));
  });
  const b = powBackBtn(), h = !touchUI && inRect(b, mouse.sx, mouse.sy);
  rect(b.x - 1, b.y - 1, b.w + 2, b.h + 2, h ? '#ffe070' : '#4aa8ff'); rect(b.x, b.y, b.w, b.h, h ? '#243c78' : '#12204a');
  drawText('BACK', b.x + b.w / 2, b.y + 4, '#fff', 1, 'c');
}
function drawPowersMenu() {
  rect(0, 0, VIEW_W, VIEW_H, '#000', 0.8);
  const c = VIEW_W / 2;
  drawText('POWERS', c, 8, '#ffd24a', 3, 'c');
  drawText('BEAT A LEVEL TO UNLOCK ITS POWER', c, 34, '#bfe8ff', 1, 'c');
  const rows = UPGRADES.filter(u => u.unlock).map(u => ({ on: unlocked.has(u.id), name: u.name, info: u.info, lock: 'BEAT THE ' + LEVELS[u.unlock].name + ' LEVEL TO UNLOCK' }))
    .concat([{ on: hasPet, name: 'MAN FLU', tag: 'PET', info: 'A LITTLE FRIEND THAT FOLLOWS YOU THROUGH EVERY LEVEL', lock: 'A SECRET WAITS IN THE BRAIN' }]);
  const step = Math.min(40, Math.floor((VIEW_H - 74) / rows.length)), compact = step < 36;
  rows.forEach((r, i) => {
    const y = 44 + i * step, w = Math.min(VIEW_W - 24, 360), x = c - w / 2, h = step - 4;
    rect(x - 1, y - 1, w + 2, h + 2, r.on ? '#ffd24a' : '#303a58'); rect(x, y, w, h, r.on ? '#1c2448' : '#0c1020');
    drawText(r.on ? r.name : '??? ' + (r.tag ? 'SECRET' : r.name), x + 6, y + 3, r.on ? '#ffd24a' : '#6a7490', 1, 'l');
    drawText(r.on ? (r.tag ? 'EARNED' : 'UNLOCKED') : 'LOCKED', x + w - 6 - (r.on && r.tag ? 18 : 0), y + 3, r.on ? '#7fffd0' : '#ff9a9a', 1, 'r');
    if (r.on) wrapText(compact ? r.info.split('. ')[0] : r.info, Math.floor((w - 12) / FONT_ADV)).slice(0, compact ? 1 : 2).forEach((t, j) => drawText(t, x + 6, y + 13 + j * 9, '#bfe8ff', 1, 'l'));
    else drawText(r.lock, x + 6, y + 13, '#8aa0d0', 1, 'l');
    if (r.on && r.tag) ctx.drawImage(SPR.pet, Math.round(x + w - 22), Math.round(y + h / 2 - 6));
  });
  const b = powBackBtn(), h = !touchUI && inRect(b, mouse.sx, mouse.sy);
  rect(b.x - 1, b.y - 1, b.w + 2, b.h + 2, h ? '#ffe070' : '#4aa8ff'); rect(b.x, b.y, b.w, b.h, h ? '#243c78' : '#12204a');
  drawText('BACK', c, b.y + 4, '#fff', 1, 'c');
}
function drawLobby() {
  ctx.fillStyle = '#12060b'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  for (let y = 0; y < VIEW_H; y += 64) for (let x = 0; x < VIEW_W; x += 64) ctx.drawImage(SPR.bg, x, y);
  rect(0, 0, VIEW_W, VIEW_H, '#000', 0.6);
  const c = VIEW_W / 2, hov = lobbyButtons().find(b => inRect(b, mouse.sx, mouse.sy));
  drawText('ONLINE CO-OP', c, 10, '#7fe8ff', 2, 'c');
  if (lobby.mode === 'host') {
    const o = VIEW_H < 220 ? -14 : 0;   // phones: pull everything up so the status line clears the BACK button
    drawText('YOUR ROOM CODE', c, 56 + o, '#bfe8ff', 1, 'c');
    drawText(lobby.code || '....', c, 70 + o, '#ffe070', 5, 'c');
    drawText('YOUR FRIEND PICKS JOIN ONLINE, TYPES THE CODE', c, 112 + o, '#fff', 1, 'c');
    drawText('OR SEND THEM THIS LINK:', c, 121 + o, '#fff', 1, 'c');
    drawText(location.host, c, 130 + o, '#ffd88a', 1, 'c');
    drawText('/?room=' + lobby.code, c, 139 + o, '#ffd88a', 1, 'c');
  } else {
    drawText('ENTER ROOM CODE', c, 34, '#bfe8ff', 1, 'c');
    for (let i = 0; i < 4; i++) {
      const x = c - 52 + i * 27;
      rect(x - 1, 45, 26, 28, '#4aa8ff'); rect(x, 46, 24, 26, '#12204a');
      if (lobby.code[i]) drawText(lobby.code[i], x + 12, 49, '#ffe070', 3, 'c');
    }
  }
  for (const b of lobbyButtons()) {
    const h = hov === b, special = b.id.length > 1;
    rect(b.x - 1, b.y - 1, b.w + 2, b.h + 2, h ? '#ffe070' : special ? '#ffc070' : '#4aa8ff'); rect(b.x, b.y, b.w, b.h, h ? '#243c78' : '#12204a');
    drawText(b.id, b.x + b.w / 2, b.y + 4, '#fff', 1, 'c');
  }
  const dots = '.'.repeat(1 + Math.floor(performance.now() / 400) % 3);
  drawText(tr(lobby.msg) + (/WAIT|CONNECT/.test(lobby.msg) ? dots : ''), c, lobby.mode === 'host' ? (VIEW_H < 220 ? 142 : 168) : 168, /NO SUCH|FULL|LOST|LEFT|ENTER ALL|ERROR/.test(lobby.msg) ? '#ff9a9a' : '#7fffd0', 1, 'c');
}

const CARD = { w: 100, h: 84, gap: 4, y: 92 };
function cardRect(i) { const tot = 3 * CARD.w + 2 * CARD.gap; return { x: VIEW_W / 2 - tot / 2 + i * (CARD.w + CARD.gap), y: CARD.y, w: CARD.w, h: CARD.h }; }
function cardAt(mx, my) {
  for (let i = 0; i < choices.length; i++) { const r = cardRect(i); if (mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h) return i; }
  return -1;
}
function drawLevelUp() {
  rect(0, 0, VIEW_W, VIEW_H, '#000', 0.65);
  drawText('LEVEL UP!', VIEW_W / 2, 18, '#ffe070', 3, 'c');
  drawText('YOU GREW BIGGER AND MORE RESISTANT', VIEW_W / 2, 46, '#bfe8ff', 1, 'c');
  drawText('RESISTANCE ' + Math.round(S.res * 100) + '%', VIEW_W / 2, 56, '#7fffd0', 1, 'c');
  drawText('CHOOSE AN UPGRADE', VIEW_W / 2, 72, '#fff', 1, 'c');
  const hov = cardAt(mouse.sx, mouse.sy);
  choices.forEach((u, i) => {
    const r = cardRect(i), lv = S.up[u.id] || 0, h = hov === i;
    rect(r.x - 1, r.y - 1, r.w + 2, r.h + 2, h ? '#ffe070' : '#4aa8ff');
    rect(r.x, r.y, r.w, r.h, h ? '#243c78' : '#12204a');
    drawText('[' + (i + 1) + ']', r.x + 4, r.y + 4, '#8aa0d0');
    if (u.unlock) drawText(LEVELS[u.unlock].name + ' POWER', r.x + r.w - 4, r.y + 4, '#ffd24a', 1, 'r');
    drawText(u.name, r.x + r.w / 2, r.y + 16, u.unlock ? '#ffd24a' : '#fff', 1, 'c');
    wrapText(u.desc, 15).slice(0, 3).forEach((t, j) => drawText(t, r.x + r.w / 2, r.y + 32 + j * 9, '#bfe8ff', 1, 'c'));
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
  const more = camp && win && camp.i < CAMPAIGN.length - 1;
  drawText(more ? 'ORGAN SAVED!' : win ? 'HOST SAVED!' : 'INFECTION WINS', c, 34, win ? '#7fe8ff' : '#9ae05a', 3, 'c');
  drawText(G.reason, c, 62, '#fff', 1, 'c');
  if (camp) drawText(more ? 'NEXT: ' + LEVELS[CAMPAIGN[camp.i + 1]].name + '. UPGRADES CARRY OVER' : win ? 'CAMPAIGN COMPLETE!' : 'CAMPAIGN ' + (camp.i + 1) + '/' + CAMPAIGN.length + ': ' + lvl().name, c, 72, win ? '#ffe070' : '#ffd88a', 1, 'c');
  const saved = organs.filter(o => o.team === 'i').length;
  [['TIME SURVIVED', Math.floor(G.t / 60) + ':' + String(Math.floor(G.t % 60)).padStart(2, '0')], ['LEVEL', S.level], ['VIRUSES KILLED', G.kills], ['VIRUSES TURNED', G.conv], G.fix.length ? ['REPAIRS MADE', G.fixed || 0] : ['ORGANS SAVED', saved + '/5']]
    .forEach(([k, v], i) => { const y0 = VIEW_H < 220 ? 86 : 94; drawText(k, c - 10, y0 + i * 10, '#bfe8ff', 1, 'r'); drawText(v, c + 10, y0 + i * 10, '#fff'); });
  if (G.overT > 0.7 && Math.floor(performance.now() / 500) % 2) drawText(isGuest() ? 'WAITING FOR HOST TO RESTART' : (touchUI ? 'TAP' : 'CLICK') + (more ? ' TO CONTINUE' : camp && !win ? ' TO RETRY' : ' TO TRY AGAIN'), c, VIEW_H - (VIEW_H < 220 ? 40 : 36), '#fff', isGuest() ? 1 : 2, 'c');
  if (G.newPower && Math.floor(performance.now() / 300) % 4) drawText('NEW POWER UNLOCKED: ' + UPGRADES.find(u => u.id === G.newPower).name, c, VIEW_H - 50, '#ffd24a', 1, 'c');
  const b = menuBtn(), hov = !touchUI && inRect(b, mouse.sx, mouse.sy);
  rect(b.x - 1, b.y - 1, b.w + 2, b.h + 2, hov ? '#ffe070' : '#4aa8ff'); rect(b.x, b.y, b.w, b.h, hov ? '#243c78' : '#12204a');
  drawText(touchUI ? 'MENU' : 'MENU [M]', c, b.y + 4, '#fff', 1, 'c');
}

// ---------------------------------------------------------------- online
// Host-authoritative: the host simulates everything. The guest sends its input and renders snapshots.
const TYPE_IDS = ['basic', 'runner', 'brute', 'saboteur', 'slimeling', 'ember', 'spark', 'manflu', 'pylori', 'toxin', 'ulcer', 'sepsis'];
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
      if (d.k === 'in' && players[1]) players[1].netInp = { mx: +d.mx || 0, my: +d.my || 0, aim: d.aim == null ? null : +d.aim, fire: !!d.fh };
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
  relay({ k: 'snap', mf: settings.autoFire ? 0 : 1, lv: lvKey, cp: camp ? [camp.i] : 0, ph: G.phase, sf: r1(G.suffT), cg: G.cough ? [r2(G.cough.t), G.cough.warn] : 0, fx: G.fix.map(f => [f.st, r2(f.weakA), r1(f.spawnT || 0), r1(f.spawnMax || 0), r2(f.hackP), f.hackN, r1(f.allyT || 0), f.allyMax || 0]), st: state, t: r2(G.t), kills: G.kills, conv: G.conv, msg: G.msg, msgT: r1(G.msgT), sh: r1(G.shake), res: G.result, why: G.reason,
    S, ch: choices.map(u => u.id),
    pl: players.map(p => [r1(p.x), r1(p.y), r1(p.infection), p.down ? 1 : 0, r1(p.reviveT), r2(p.aim), p.flash > 0 ? 1 : 0, r1(p.vx), r1(p.vy), p.tail ? [r1(spotOf(p.tail.ref).x), r1(spotOf(p.tail.ref).y), r2(p.tail.t)] : 0, p.autoFire ? 1 : 0, r2(p.mass), r2(p.splitting), r2(p.splitBase), p.stuckT > 0 ? 1 : 0, [r1(p.fx.speed), r1(p.fx.slow), r1(p.fx.shield), r1(p.fx.poke), r1(p.fx.bloat)], r2(Math.max(0, p.pokeCd))]),
    og: organs.map(o => [o.team === 'v' ? 1 : 0, r1(o.hp), r1(o.spawnT), r1(o.spawnMax), r2(o.weakA), o.flash > 0 ? 1 : 0]),
    un: G.units.map(u => [u.id, u.team === 'v' ? 1 : 0, TYPE_IDS.indexOf(u.type), r1(u.x), r1(u.y), r2(u.weakA), u.flash > 0 ? 1 : 0, u.tail ? [r1(spotOf(u.tail.ref).x), r1(spotOf(u.tail.ref).y), r2(u.tail.t)] : 0, u.stuckT > 0 ? 1 : 0, u.hack ? u.hack.i : -1, u.morph ? r2(u.morph.t / MORPH_T) : -1, u.boss ? r2(u.hp / u.maxHp) : -1, u.boss ? r2(Math.max(0, u.shotT || 0)) : -1]),
    pj: G.projs.map(p => [r1(p.x), r1(p.y), Math.round(p.vx), Math.round(p.vy)]),
    gm: G.gems.map(g => [Math.round(g.x), Math.round(g.y)]),
    pb: G.pb.map(b => [r1(b.x), r1(b.y), r2(b.a), r1(b.len), r2(b.t), b.seed, b.pi]), pr: G.pr.map(b => [r1(b.x), r1(b.y), b.s, r1(b.len), r2(b.t), b.pi]), pg: G.pg.map(g => [r1(g.sx), r1(g.sy), r1(g.tx), r1(g.ty), r2(g.t), r2(g.dur), g.pi, r1(g.r)]), ps: G.ps.map(x => [r1(x.x), r1(x.y), r1(x.r), r1(x.life), x.pi]), np: G.newPower || '', ci: G.cine ? r2(G.cine.t) : -1, fp: G.fp.map(b => [b.id, r1(b.x), r1(b.y), r1(b.vx), r1(b.vy)]), pt: G.pet ? [r1(G.pet.x), r1(G.pet.y)] : 0,
    sl: G.slimes.map(x => [r1(x.x), r1(x.y), r1(x.r), r1(x.life)]), gl: G.globs.map(g => [r1(g.sx), r1(g.sy), r1(g.tx), r1(g.ty), r2(g.t), r2(g.dur)]),
    ho: G.holes.map(h => [r1(h.x), r1(h.y), r1(h.life)]),
    bm: G.beams.map(b => [r1(b.x), r1(b.y), r2(b.a), r1(b.len), r1(b.w), r2(b.t), r1(b.warn), r1(b.fire), b.c || 0]), bo: G.bolts.map(b => [r1(b.x), r1(b.y), r2(b.a), r1(b.len), r2(b.t), b.seed]), pi: G.pills.map(x => [r1(x.x), r1(x.y), r1(x.life)]), vac: r1(G.vacuumT), ev: evq });
  evq = [];
}

function applySnap(d) {
  if (!net.got) { net.got = true; coop = true; lobby = null; if (LEVELS[d.lv]) lvKey = d.lv; newGame(true); }
  if (LEVELS[d.lv] && d.lv !== lvKey) { lvKey = d.lv; newGame(true); net.units.clear(); }   // the host moved on to the next campaign level
  camp = d.cp ? { i: d.cp[0] } : null;
  const prevState = state;
  state = d.st;
  if (state === 'over' && prevState !== 'over') G.overT = 0;
  G.manualFire = !!d.mf; G.t = d.t; G.kills = d.kills; G.conv = d.conv; G.msg = d.msg; G.msgT = d.msgT; G.shake = Math.max(G.shake, d.sh); G.result = d.res; G.reason = d.why;
  S = d.S; choices = d.ch.map(id => UPGRADES.find(u => u.id === id)).filter(Boolean);
  const me = meIdx();
  d.pl.forEach((a, i) => {
    let p = players[i];
    if (!p || players.length !== d.pl.length) { players = d.pl.map((q, j) => players[j] || { idx: j, x: q[0], y: q[1], tx: q[0], ty: q[1], vx: 0, vy: 0, bob: 0, orbitA: j * Math.PI }); p = players[i]; }
    p.tx = a[0]; p.ty = a[1]; p.infection = a[2]; p.down = !!a[3]; p.reviveT = a[4]; p.flash = a[6] ? 0.1 : -1;
    p.autoFire = !!a[10]; p.mass = a[11]; p.splitting = a[12]; p.splitBase = a[13]; p.stuckT = a[14] ? 1 : 0;
    p.fx = { speed: a[15][0], slow: a[15][1], shield: a[15][2], poke: a[15][3], bloat: a[15][4] };
    p.tailG = a[9] ? { x: a[9][0], y: a[9][1], t: a[9][2] } : null; p.pokeCd = a[16];
    if (i !== me) { p.aim = a[5]; p.vx = a[7]; p.vy = a[8]; }
    else { const ex = a[0] - p.x, ey = a[1] - p.y; if (Math.hypot(ex, ey) > 50 || p.down) { p.x = a[0]; p.y = a[1]; } else { p.x += ex * 0.15; p.y += ey * 0.15; } }
  });
  d.fx.forEach((a, i) => { const f = G.fix[i]; if (f) { f.st = a[0]; f.weakA = a[1]; f.spawnT = a[2]; f.spawnMax = a[3]; f.hackP = a[4]; f.hackN = a[5]; f.allyT = a[6]; f.allyMax = a[7]; } });
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
    u.stuckT = a[8] ? 1 : 0; u.hackG = a[9] >= 0 ? G.fix[a[9]] : null; u.morphK = a[10]; u.boss = !!BOSSES[type]; u.hpF = a[11] >= 0 ? a[11] : undefined; if (u.boss) u.shotT = a[12];
    u.tailG = a[7] ? { x: a[7][0], y: a[7][1], t: a[7][2] } : null;
    seen.add(a[0]); list.push(u);
  }
  for (const id of net.units.keys()) if (!seen.has(id)) net.units.delete(id);
  G.units = list;
  G.projs = d.pj.map(a => ({ x: a[0], y: a[1], vx: a[2], vy: a[3] }));
  G.gems = d.gm.map((a, i) => ({ x: a[0], y: a[1], ph: i * 0.7 }));
  G.pb = (d.pb || []).map(a => ({ x: a[0], y: a[1], a: a[2], len: a[3], t: a[4], seed: a[5], pi: a[6] })); G.pr = (d.pr || []).map(a => ({ x: a[0], y: a[1], s: a[2], len: a[3], t: a[4], pi: a[5] }));
  G.pg = (d.pg || []).map(a => ({ sx: a[0], sy: a[1], tx: a[2], ty: a[3], t: a[4], dur: a[5], pi: a[6], r: a[7] })); G.ps = (d.ps || []).map(a => ({ x: a[0], y: a[1], r: a[2], life: a[3], pi: a[4] })); G.newPower = d.np || ''; G.cine = d.ci >= 0 ? { t: d.ci } : null; {   // guest: snot keeps flying between snapshots (velocity extrapolation) and only eases onto the host's position
    net.fp = net.fp || new Map(); const seenF = new Set(), list = [];
    for (const a of d.fp || []) {
      let b = net.fp.get(a[0]);
      if (!b || Math.hypot(b.x - a[1], b.y - a[2]) > 24) { b = { id: a[0], x: a[1], y: a[2] }; net.fp.set(a[0], b); }
      b.tx = a[1]; b.ty = a[2]; b.vx = a[3]; b.vy = a[4]; seenF.add(a[0]); list.push(b);
    }
    for (const id of net.fp.keys()) if (!seenF.has(id)) net.fp.delete(id);
    G.fp = list; G.holes = (d.ho || []).map(a => ({ x: a[0], y: a[1], r: 20, life: a[2] }));
  } G.pet = d.pt ? { x: G.pet ? G.pet.x : d.pt[0], y: G.pet ? G.pet.y : d.pt[1], tx: d.pt[0], ty: d.pt[1], vx: 0, vy: 0 } : null;
  G.slimes = d.sl.map(a => ({ x: a[0], y: a[1], r: a[2], life: a[3] }));
  G.globs = d.gl.map(a => ({ sx: a[0], sy: a[1], tx: a[2], ty: a[3], t: a[4], dur: a[5] }));
  G.bolts = (d.bo || []).map(a => ({ x: a[0], y: a[1], a: a[2], len: a[3], t: a[4], seed: a[5], warn: BOLT.warn, fire: BOLT.fire }));
  G.beams = d.bm.map(a => ({ x: a[0], y: a[1], a: a[2], len: a[3], w: a[4], t: a[5], warn: a[6], fire: a[7], c: a[8] }));
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
    if (p.pokeCd > 0) p.pokeCd -= dt;
  }
  for (const u of G.units) { u.x += (u.tx - u.x) * k; u.y += (u.ty - u.y) * k; u.flash -= dt; if (u.tailG) u.tailG.t += dt; if (u.shotT > 0) u.shotT -= dt; }
  for (const p of G.projs) { p.x += p.vx * dt; p.y += p.vy * dt; }
  for (const g of G.globs) g.t += dt;
  for (const b of G.fp) { b.tx += b.vx * dt; b.ty += b.vy * dt; b.x += b.vx * dt + (b.tx - b.x) * k; b.y += b.vy * dt + (b.ty - b.y) * k; }
  if (G.pet) { G.pet.x += (G.pet.tx - G.pet.x) * k; G.pet.y += (G.pet.ty - G.pet.y) * k; G.pet.vx = (G.pet.tx - G.pet.x) * 8; G.pet.vy = (G.pet.ty - G.pet.y) * 8; }
  if (G.cine) G.cine.t += dt;
  for (const g of G.pg) g.t += dt;
  for (const b of G.pb) b.t += dt;
  for (const b of G.pr) b.t += dt;
  for (const g of G.ps) g.life -= dt;
  if (G.cough) G.cough.t += dt;
  for (const b of G.beams) b.t += dt;
  for (const b of G.bolts) b.t += dt;
  for (const p of G.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; p.life -= dt; }
  G.parts = G.parts.filter(p => p.life > 0);
  G.shake = Math.max(0, G.shake - 20 * dt);
  for (const t of G.tips) t.t -= dt;
  G.tips = G.tips.filter(t => t.t > 0);
  if (state === 'play') { G.t += dt; G.msgT -= dt; beatStep(dt); }
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
    relay({ k: 'in', mx: r2(inp.mx), my: r2(inp.my), aim: inp.aim === null ? null : r2(inp.aim), fh: inp.fire ? 1 : 0 });
  }
}

// ---------------------------------------------------------------- main loop
newGame(false);
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state === 'play' && !isGuest() && (document.hidden || (isTouch && innerHeight > innerWidth))) state = 'paused';
  if (state !== 'play' && (touch.move || touch.aim || touch.fire !== null)) { touch.move = touch.aim = null; touch.fire = null; mouse.rdown = false; }
  syncAudio();
  if (isGuest()) guestTick(dt);
  else { if (state === 'play') update(dt); syncAudio(); hostSend(dt); }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
{ // ?room=ABCD in the URL joins that room straight away
  const room = new URLSearchParams(location.search).get('room');
  if (room && /^[a-z]{4}$/i.test(room)) { lobby = { mode: 'join', code: room.toUpperCase(), msg: 'CONNECTING...' }; state = 'lobby'; netConnect('guest', lobby.code); }
}

// small hook for automated testing
window.__dbg = { route: routeTo, cont: overContinue, get acid() { return lvKey === 'stomach' ? acidTop() : 1e9; }, safe: acidSafe, get camp() { return camp; }, get lvKey() { return lvKey; }, setState(v) { state = v; }, poke(p) { const t = pokeNearest(p); return t ? tryPoke(p, t) : false; }, pokeRef(p, t) { return t ? tryPoke(p, t) : false; }, setLevel(k) { lvSel = k; lvKey = k === 'campaign' ? CAMPAIGN[0] : k; camp = null; newGame(false); },
  startCamp(i, S0) { lvSel = 'campaign'; camp = { i, S0: S0 || null }; startGame(false); }, reach: reachOf, spot: spotOf, get LEVELS() { return LEVELS; }, get tuneSet() { return tuneSet(); }, get fix() { return G.fix; }, get unlocked() { return unlocked; }, gainXp, oxy, get choices() { return choices; }, render, addUnit, get cam() { return cam; }, get G() { return G; }, get lobby() { return lobby; }, get net() { return net; }, get units() { return G.units; }, get P() { return players[0]; }, get players() { return players; }, get S() { return S; }, get organs() { return organs; }, get state() { return state; },
  start: startGame, step(n, dt = 1 / 60) { for (let i = 0; i < n && state === 'play'; i++) update(dt); },
  pick: i => { if (state === 'levelup') chooseUpgrade(i); } };
})();
