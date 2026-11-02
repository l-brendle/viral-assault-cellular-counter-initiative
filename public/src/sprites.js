'use strict';
// Procedurally generated pixel art. Everything is drawn pixel-by-pixel into
// small offscreen canvases once at startup, then blitted by the game.

const SPR = { virus: {}, organ: [], organInf: [] };

let _seed = 1337;
const srand = () => (_seed = (_seed * 1664525 + 1013904223) >>> 0) / 4294967296;

function mk(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
function px(g, x, y, col, w = 1, h = 1) {
  g.fillStyle = col;
  g.fillRect(Math.floor(x), Math.floor(y), w, h);
}
function disc(g, cx, cy, r, col) {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++)
      if (x * x + y * y <= r * r + r * 0.5) px(g, cx + x, cy + y, col);
}
function fromRows(rows, pal) {
  const c = mk(rows[0].length, rows.length), g = c.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== '.' && pal[ch]) px(g, x, y, pal[ch]);
  }));
  return c;
}

// virus spikes radiating from (cx, cy) outwards from radius r, and the angry little face
function drawSpikes(g, cx, cy, r, n, len, outline, tip, rot = 0) {
  for (let k = 0; k < n; k++) {
    const a = rot + (k + 0.5) / n * Math.PI * 2;
    for (let d = r - 1; d <= r + len; d++) {
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
      if (d < r + len) px(g, x, y, outline); else px(g, x - 1, y - 1, tip, 2, 2);
    }
  }
}
function drawFace(g, cx, cy, r, outline) {
  const dx = Math.max(2, Math.round(r * 0.38)), ey = Math.round(cy - r * 0.15) - 1;
  for (const sd of [-1, 1]) {
    const ex = sd < 0 ? cx - dx - 1 : cx + dx - 1;
    px(g, ex, ey, '#fff', 2, 2);
    px(g, sd < 0 ? ex + 1 : ex, ey + 1, '#2a0a14');       // pupil looks at the middle
    px(g, ex, ey - 1, outline, 2, 1);                      // angry brow
  }
  if (r >= 6) px(g, cx - 1, cy + Math.round(r * 0.45), '#2a0a14', 3, 1);
}

// Round, shaded blob with optional spikes / face / nucleus.
function makeBlob(o) {
  const r = o.r, n = o.spikes || 0, len = n ? (o.spikeLen || 3) : 0;
  const size = (r + len + 2) * 2, c = mk(size, size), g = c.getContext('2d');
  const cx = size / 2, cy = size / 2;

  drawSpikes(g, cx, cy, r, n, len, o.spikeStem || o.outline, o.spikeColor);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
    if (d > r) continue;
    let col;
    if (d > r - 1.15) col = o.outline;
    else {
      const v = (-dx * 0.6 - dy * 0.8) / r;
      col = v > 0.4 ? o.light : v < -0.35 ? o.dark : o.body;
    }
    px(g, x, y, col);
  }
  if (o.spots) for (let i = 0; i < r; i++) {
    const a = srand() * 6.28, d = srand() * r * 0.7;
    px(g, cx + Math.cos(a) * d, cy + Math.sin(a) * d, o.dark);
  }
  if (o.nucleus) {
    disc(g, Math.round(cx + (o.nx || 0)), Math.round(cy + (o.ny || 0)), o.nr, o.nucleus);
    px(g, cx + (o.nx || 0) - o.nr + 1, cy + (o.ny || 0) - o.nr + 1, o.light);
  }
  if (o.face) drawFace(g, cx, cy, r, o.outline);
  return c;
}

function makeFighter(c1, c2) {
  const rows = [
    '.....oooooo.....',
    '...ooccccccoo...',
    '..occwwwwwwcco..',
    '.occwwwwwwwwcco.',
    '.ocwwkkwwkkwwco.',
    'occwwkkwwkkwwcco',
    'occwwwwwwwwwwcco',
    'occwwwwmmwwwwcco',
    'occwwwwwwwwwwcco',
    '.occwwwwwwwwcco.',
    '.occcwwwwwwccco.',
    '..occcccccccco..',
    '...oooooooooo...',
    '....occo..occo..',
    '....oooo..oooo..',
    '................',
  ];
  return fromRows(rows, { o: '#12204a', c: c1, w: '#f4f8ff', k: '#12204a', m: '#e0607a', d: c2 });
}

const tintCache = new Map();
function tinted(img, col) {
  let m = tintCache.get(img);
  if (!m) { m = {}; tintCache.set(img, m); }
  if (!m[col]) {
    const c = mk(img.width, img.height), g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
    m[col] = c;
  }
  return m[col];
}

function makeBackground() {
  const S = 64, c = mk(S, S), g = c.getContext('2d');
  px(g, 0, 0, '#4a1626', S, S);
  const cols = ['#541a2c', '#5e2034', '#431320', '#6a2840'];
  for (let i = 0; i < 46; i++) {
    const x = srand() * S, y = srand() * S, r = 2 + Math.floor(srand() * 5), col = cols[Math.floor(srand() * cols.length)];
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) disc(g, Math.round(x + ox), Math.round(y + oy), r, col);
  }
  for (let i = 0; i < 70; i++)
    px(g, Math.floor(srand() * S), Math.floor(srand() * S), srand() < 0.5 ? '#7a3248' : '#36101b');
  return c;
}

// lung tissue: soft mauve with faint bubble rings (alveoli) and a few capillary specks
function makeLungBackground() {
  const S = 64, c = mk(S, S), g = c.getContext('2d');
  px(g, 0, 0, '#4d2640', S, S);
  for (let i = 0; i < 16; i++) {
    const x = srand() * S, y = srand() * S, r = 4 + Math.floor(srand() * 8);
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      disc(g, Math.round(x + ox), Math.round(y + oy), r, '#552a47');
      for (let k = 0; k < r * 7; k++) { const a = k / (r * 7) * 6.283; px(g, Math.round(x + ox + Math.cos(a) * r), Math.round(y + oy + Math.sin(a) * r), '#6c3a5c'); }
      px(g, Math.round(x + ox - r * 0.5), Math.round(y + oy - r * 0.5), '#8c5278', 2, 1);
    }
  }
  for (let i = 0; i < 40; i++) px(g, Math.floor(srand() * S), Math.floor(srand() * S), srand() < 0.5 ? '#2f6b7a' : '#3a1a32');
  return c;
}

// air sac: a grape-like cluster. 0 = open (pink, plump), 1 = clogged (bruised, deflating), 2 = collapsed (grey-green, flat)
function makeSac(st) {
  if (st === 2) return makeInfectedSac();
  const c = mk(38, 34), g = c.getContext('2d');
  const pal = [
    { o: '#3a0f2a', body: '#f08ab4', light: '#ffd0e4', dark: '#c05888' },
    { o: '#2c1a38', body: '#b090c0', light: '#d8c0e8', dark: '#7a5a90' },
    { o: '#16300e', body: '#6f8a50', light: '#a0b878', dark: '#3f5a2a' },
  ][st];
  const lobes = [
    [[19, 16, 9], [8, 13, 7], [30, 13, 7], [12, 25, 7], [26, 25, 7]],
    [[19, 18, 8], [9, 16, 6], [29, 16, 6], [13, 26, 5], [25, 26, 5]],
    [[19, 24, 9], [10, 22, 6], [28, 22, 6], [19, 17, 4]],
  ][st];
  for (const [cx, cy, r] of lobes) disc(g, cx, cy, r, pal.o);
  for (const [cx, cy, r] of lobes) disc(g, cx, cy, r - 1, pal.body);
  for (const [cx, cy, r] of lobes) { px(g, cx - r * 0.45, cy - r * 0.55, pal.light, 2, 2); px(g, cx + r * 0.25, cy + r * 0.35, pal.dark, 3, 2); }
  if (st) for (const [x, y] of [[14, 14], [24, 20], [18, 26], [28, 14]]) px(g, x, y + (st > 1 ? 2 : 0), '#9ae05a', 2, 2);   // slime specks
  return c;
}

// heart muscle: deep red with diagonal fibres
function makeHeartBackground() {
  const S = 64, c = mk(S, S), g = c.getContext('2d');
  px(g, 0, 0, '#4a111c', S, S);
  for (let i = 0; i < 38; i++) {
    const x = srand() * S, y = srand() * S, len = 6 + Math.floor(srand() * 12), col = ['#5a1624', '#3c0e18', '#6a1c2c'][Math.floor(srand() * 3)];
    for (let k = 0; k < len; k++) for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) px(g, Math.round(x + k * 0.8 + ox), Math.round(y + k * 0.6 + oy), col, 2, 1);
  }
  for (let i = 0; i < 50; i++) px(g, Math.floor(srand() * S), Math.floor(srand() * S), srand() < 0.5 ? '#7a2434' : '#2e0a12');
  return c;
}

// a fully disabled objective: swallowed by the virus. Same look as the infected organs (green body, glowing spike tips, angry face).
function makeInfectedBlob(r, spikes, len, groove) {
  const c = makeBlob({ r, body: '#6faa3a', light: '#a8d860', dark: '#3f6a22', outline: '#16300e', spikeStem: '#4f8a2a', spikeColor: '#e8ff7a', spikes, spikeLen: len, face: true, spots: true });
  if (groove) {   // valve: a dark ring groove round the face, so it still reads as a ring
    const g = c.getContext('2d'), cx = c.width / 2, cy = c.height / 2;
    for (let k = 0; k < 60; k++) { const a = k / 60 * 6.283; px(g, cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3), '#2a4a14'); }
  }
  return c;
}
// the collapsed air sac: the flat sac silhouette, bristling with spikes and wearing a face
function makeInfectedSac() {
  const c = mk(48, 44), g = c.getContext('2d'), ox = 5, oy = 7;
  const pal = { o: '#16300e', body: '#6faa3a', light: '#a8d860', dark: '#3f6a22', tip: '#e8ff7a' };
  const lobes = [[19, 24, 9], [10, 22, 6], [28, 22, 6], [19, 17, 4]].map(([x, y, r]) => [x + ox, y + oy, r]);
  for (const [cx, cy, r] of lobes) drawSpikes(g, cx, cy, r, Math.max(5, r), 3, '#4f8a2a', pal.tip, cx * 0.3);
  for (const [cx, cy, r] of lobes) disc(g, cx, cy, r, pal.o);
  for (const [cx, cy, r] of lobes) disc(g, cx, cy, r - 1, pal.body);
  for (const [cx, cy, r] of lobes) { px(g, cx - r * 0.45, cy - r * 0.55, pal.light, 2, 2); px(g, cx + r * 0.25, cy + r * 0.35, pal.dark, 3, 2); }
  for (const [x, y] of [[14, 20], [30, 18], [22, 30]]) px(g, x + ox, y + oy, pal.dark, 2, 2);
  drawFace(g, 19 + ox, 24 + oy, 9, pal.o);
  return c;
}

// brain tissue: deep indigo with faint wandering neuron fibres and a few glowing specks
function makeBrainBackground() {
  const S = 64, c = mk(S, S), g = c.getContext('2d');
  px(g, 0, 0, '#150c30', S, S);
  for (let i = 0; i < 12; i++) {
    let x = srand() * S, y = srand() * S, a = srand() * 6.283;
    for (let k = 0; k < 26; k++) {
      a += (srand() - 0.5) * 0.9; x += Math.cos(a); y += Math.sin(a);
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) px(g, Math.round(x + ox), Math.round(y + oy), k % 5 ? '#241a56' : '#2f2470');
    }
  }
  for (let i = 0; i < 10; i++) { const x = Math.floor(srand() * S), y = Math.floor(srand() * S); px(g, x, y, '#3a2c80', 2, 2); }
  for (let i = 0; i < 14; i++) px(g, Math.floor(srand() * S), Math.floor(srand() * S), srand() < 0.5 ? '#2e8aa8' : '#0c0620');
  return c;
}

// synapse node: a cell body with dendrites. 0 = lit (glowing cyan), 1 = dim (flickering violet), 2 = dark (grey, slimy)
function makeSynapse(st) {
  if (st === 2) return makeBlob({ r: 9, body: '#4f7a30', light: '#86b650', dark: '#2d4a1a', outline: '#0f2208', spikeStem: '#3f6a22', spikeColor: '#e8ff7a', spikes: 7, spikeLen: 6, face: true, spots: true });
  const c = mk(38, 38), g = c.getContext('2d');
  const body = ['#6fd8ff', '#8a78c8', '#4a4a58'][st], light = ['#d0f4ff', '#c0b0f0', '#7a7a88'][st], dark = ['#2a8ac0', '#52408a', '#2a2a34'][st], line = ['#9ae8ff', '#6a5aa8', '#3a3a48'][st];
  for (let k = 0; k < 7; k++) {
    const a = k / 7 * 6.283 + 0.4;
    for (let d = 6; d <= 16; d++) px(g, 19 + Math.cos(a) * d, 19 + Math.sin(a) * d, line);
    px(g, 19 + Math.cos(a) * 16 - 1, 19 + Math.sin(a) * 16 - 1, light, 3, 3);
  }
  disc(g, 19, 19, 9, '#0c0a24'); disc(g, 19, 19, 8, dark); disc(g, 18, 18, 7, body); disc(g, 15, 15, 3, light);
  px(g, 21, 22, '#0c0a24', 3, 3);
  if (st) for (const [x, y] of [[13, 24], [25, 14], [22, 25]]) px(g, x, y, '#9ae05a', 2, 2);
  return c;
}

// heart valve: a ring with two leaflets. 0 = open, 1 = stiff, 2 = stuck shut and slimy
function makeValve(st) {
  if (st === 2) return makeInfectedBlob(13, 12, 4, true);
  const c = mk(36, 34), g = c.getContext('2d');
  const body = ['#e0707e', '#c8a050', '#6f8a50'][st], light = ['#ffb0b8', '#f0d890', '#a0b878'][st], flap = ['#ffd0d6', '#fff0b0', '#c8d8a0'][st];
  disc(g, 18, 17, 15, '#3a0a14'); disc(g, 18, 17, 14, body); disc(g, 18, 17, 9, '#3a0a14'); disc(g, 18, 17, 8, '#2a0810');
  px(g, 8, 9, light, 3, 2); px(g, 22, 25, '#00000055', 3, 2);
  const gap = [8, 4, 1][st], r = [3, 5, 7][st];
  disc(g, 18 - gap, 17, r, flap); disc(g, 18 + gap, 17, r, flap);
  px(g, 18 - gap - 1, 15, '#fff', 1, 1);
  if (st) for (const [x, y] of [[12, 12], [23, 21], [17, 24], [24, 12]]) px(g, x, y, '#9ae05a', 2, 2);
  return c;
}

// pacemaker node: a glowing orb with a bolt. 0 = steady, 1 = erratic (flickers), 2 = stalled (dark)
function makePacemaker(st) {
  if (st === 2) return makeInfectedBlob(12, 12, 4, false);
  const c = mk(32, 32), g = c.getContext('2d');
  const body = ['#ffe070', '#e0a040', '#5a6a48'][st], light = ['#fff6b0', '#ffd890', '#8a9a70'][st], dark = ['#c89020', '#a06820', '#3a4a2c'][st];
  disc(g, 16, 16, 13, '#3a2a08'); disc(g, 16, 16, 12, dark); disc(g, 15, 15, 10, body); disc(g, 12, 11, 4, light);
  const bolt = ['...##.', '..##..', '.##...', '.####.', '...##.', '..##..', '.##...'];
  bolt.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') px(g, 13 + x, 10 + y, st === 2 ? '#222' : st === 1 ? '#7a2a60' : '#6a3a00'); }));
  if (st) for (const [x, y] of [[9, 22], [22, 12], [20, 23]]) px(g, x, y, '#9ae05a', 2, 2);
  return c;
}

(function build() {
  // viruses: spiky blobs in three sizes
  SPR.virus.basic = makeBlob({ r: 6, body: '#6ccf3c', light: '#a8f060', dark: '#3f9a2a', outline: '#1d4a1a', spikeColor: '#e8ff7a', spikes: 8, spikeLen: 3, face: true });
  SPR.virus.runner = makeBlob({ r: 4, body: '#f0b030', light: '#ffe070', dark: '#c07a18', outline: '#5a3208', spikeColor: '#fff0a0', spikes: 6, spikeLen: 3, face: true });
  SPR.virus.brute = makeBlob({ r: 9, body: '#a050d8', light: '#d08cf8', dark: '#6a2a98', outline: '#2c1048', spikeColor: '#f0b0ff', spikes: 11, spikeLen: 4, face: true, spots: true });

  SPR.virus.saboteur = makeBlob({ r: 5, body: '#e050c0', light: '#ff98e8', dark: '#a02890', outline: '#4a0c40', spikeColor: '#ffd0f8', spikes: 5, spikeLen: 3, face: true });

  SPR.virus.slimeling = makeBlob({ r: 4, body: '#8fdc4a', light: '#c8f58a', dark: '#4f9a24', outline: '#2f6a16', face: true });

  SPR.virus.ember = makeBlob({ r: 4, body: '#ff8a30', light: '#ffd070', dark: '#c04010', outline: '#4a1004', spikeColor: '#fff0a0', spikes: 6, spikeLen: 2, face: true });

  SPR.virus.spark = makeBlob({ r: 4, body: '#7aa8ff', light: '#c8e0ff', dark: '#3a5ac0', outline: '#101a50', spikeColor: '#e0f0ff', spikes: 4, spikeLen: 3, face: true });

  SPR.player = makeFighter('#4aa8ff');
  SPR.ally = makeFighter('#3fd6a6');
  SPR.player2 = makeFighter('#ffa030');

  // body organs: healthy (pink, calm) and infected (sickly green, spiky)
  const defs = [
    ['#f0a0c0', '#ffd0e0', '#c06890', '#a03060'],  // brain
    ['#f08a9a', '#ffc0c8', '#c0586a', '#b02848'],  // lungs
    ['#e0404e', '#ff8088', '#a02030', '#701020'],  // heart
    ['#c06a40', '#e8996a', '#8a4428', '#5a2410'],  // liver
    ['#f0b060', '#ffd898', '#c08038', '#a05820'],  // gut
  ];
  defs.forEach(([body, light, dark, nuc]) => {
    SPR.organ.push(makeBlob({ r: 18, body, light, dark, outline: '#3a0f1c', nucleus: nuc, nr: 5, nx: 3, ny: 2, spots: true }));
    SPR.organInf.push(makeBlob({ r: 18, body: '#6faa3a', light: '#a8d860', dark: '#3f6a22', outline: '#16300e', spikes: 14, spikeLen: 4, spikeColor: '#e8ff7a', nucleus: '#2a4a14', nr: 4, nx: 3, ny: 2, face: true, spots: true }));
  });

  SPR.gem = fromRows(['..c..', '.cwc.', 'cwwwc', '.cwc.', '..c..'], { c: '#38b8ff', w: '#d8f4ff' });
  SPR.shot = fromRows(['.ccc.', 'cwwwc', 'cwwwc', 'cwwwc', '.ccc.'], { c: '#38b8ff', w: '#ffffff' });
  // slime puddle: irregular green blob with bubbles
  {
    const w = 44, h = 32, c = mk(w, h), g = c.getContext('2d');
    const lobes = [[22, 16, 17, 11], [11, 18, 9, 7], [33, 17, 9, 8], [20, 8, 8, 5], [26, 25, 9, 5], [8, 11, 5, 4]];
    const inside = (x, y, k) => lobes.some(([cx, cy, rx, ry]) => ((x - cx) / (rx + k)) ** 2 + ((y - cy) / (ry + k)) ** 2 <= 1);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!inside(x + 0.5, y + 0.5, 0)) continue;
      const edge = !inside(x + 0.5, y + 0.5, -2.2);
      const col = edge ? '#2f6a16' : (x + y) % 7 === 0 ? '#7fcf3c' : '#4f9a24';
      px(g, x, y, col);
    }
    for (const [bx, by] of [[18, 12], [27, 17], [14, 19], [23, 22]]) { px(g, bx, by, '#c8f08a', 2, 2); px(g, bx, by, '#fff', 1, 1); }
    SPR.slime = c;
  }
  SPR.pill = fromRows([
    '..oooooooo..',
    '.orhrrwwwwo.',
    'orrrrrwwwwwo',
    'orrrrrwwwwwo',
    '.orrrrwwwwo.',
    '..oooooooo..',
  ], { o: '#4a1020', r: '#ff5a6a', w: '#ffffff', h: '#ffc0c8' });
  SPR.bg = makeBackground();
  SPR.bgLung = makeLungBackground();
  SPR.sac = [0, 1, 2].map(makeSac);
  SPR.valve = [0, 1, 2].map(makeValve);
  SPR.pace = [0, 1, 2].map(makePacemaker);
  SPR.bgHeart = makeHeartBackground();
  SPR.bgBrain = makeBrainBackground();
  SPR.syn = [0, 1, 2].map(makeSynapse);
  SPR.heartIcon = fromRows(['.rr.rr.', 'rhrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], { r: '#ff4a62', h: '#ffc0c8' });
})();

// 5x7 bitmap font (6px advance, 7px tall)
const FONT_W = 5, FONT_H = 7, FONT_ADV = 6;
const FONT = (() => {
  const g = {
    A: '01110,10001,10001,11111,10001,10001,10001', B: '11110,10001,10001,11110,10001,10001,11110', C: '01110,10001,10000,10000,10000,10001,01110',
    D: '11100,10010,10001,10001,10001,10010,11100', E: '11111,10000,10000,11110,10000,10000,11111', F: '11111,10000,10000,11110,10000,10000,10000',
    G: '01110,10001,10000,10111,10001,10001,01111', H: '10001,10001,10001,11111,10001,10001,10001', I: '01110,00100,00100,00100,00100,00100,01110',
    J: '00111,00010,00010,00010,00010,10010,01100', K: '10001,10010,10100,11000,10100,10010,10001', L: '10000,10000,10000,10000,10000,10000,11111',
    M: '10001,11011,10101,10101,10001,10001,10001', N: '10001,10001,11001,10101,10011,10001,10001', O: '01110,10001,10001,10001,10001,10001,01110',
    P: '11110,10001,10001,11110,10000,10000,10000', Q: '01110,10001,10001,10001,10101,10010,01101', R: '11110,10001,10001,11110,10100,10010,10001',
    S: '01111,10000,10000,01110,00001,00001,11110', T: '11111,00100,00100,00100,00100,00100,00100', U: '10001,10001,10001,10001,10001,10001,01110',
    V: '10001,10001,10001,10001,10001,01010,00100', W: '10001,10001,10001,10101,10101,10101,01010', X: '10001,10001,01010,00100,01010,10001,10001',
    Y: '10001,10001,10001,01010,00100,00100,00100', Z: '11111,00001,00010,00100,01000,10000,11111',
    0: '01110,10001,10011,10101,11001,10001,01110', 1: '00100,01100,00100,00100,00100,00100,01110', 2: '01110,10001,00001,00010,00100,01000,11111',
    3: '11111,00010,00100,00010,00001,10001,01110', 4: '00010,00110,01010,10010,11111,00010,00010', 5: '11111,10000,11110,00001,00001,10001,01110',
    6: '00110,01000,10000,11110,10001,10001,01110', 7: '11111,00001,00010,00100,01000,01000,01000', 8: '01110,10001,10001,01110,10001,10001,01110',
    9: '01110,10001,10001,01111,00001,00010,01100',
    '.': '00000,00000,00000,00000,00000,01100,01100', ':': '00000,01100,01100,00000,01100,01100,00000', '/': '00001,00010,00010,00100,01000,01000,10000',
    '-': '00000,00000,00000,11111,00000,00000,00000', '+': '00000,00100,00100,11111,00100,00100,00000', '%': '11001,11010,00010,00100,01000,01011,10011',
    '!': '00100,00100,00100,00100,00100,00000,00100', '?': '01110,10001,00001,00010,00100,00000,00100', '>': '10000,01000,00100,00010,00100,01000,10000',
    '<': '00001,00010,00100,01000,00100,00010,00001', '[': '01110,01000,01000,01000,01000,01000,01110', ']': '01110,00010,00010,00010,00010,00010,01110',
    '(': '00010,00100,01000,01000,01000,00100,00010', ')': '01000,00100,00010,00010,00010,00100,01000', ',': '00000,00000,00000,00000,00110,00100,01000',
    "'": '00100,00100,01000,00000,00000,00000,00000', ' ': '00000,00000,00000,00000,00000,00000,00000',
    '=': '00000,00000,11111,00000,11111,00000,00000', '&': '01100,10010,10100,01000,10101,10010,01101', '*': '00000,10101,01110,11111,01110,10101,00000',
  };
  const out = {};
  for (const k in g) out[k] = g[k].split(',').map(r => r.replace(/1/g, '#').replace(/0/g, '.'));
  return out;
})();
