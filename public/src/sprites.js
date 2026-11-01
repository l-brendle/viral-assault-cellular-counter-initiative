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

// Round, shaded blob with optional spikes / face / nucleus.
function makeBlob(o) {
  const r = o.r, n = o.spikes || 0, len = n ? (o.spikeLen || 3) : 0;
  const size = (r + len + 2) * 2, c = mk(size, size), g = c.getContext('2d');
  const cx = size / 2, cy = size / 2;

  for (let k = 0; k < n; k++) {
    const a = (k + 0.5) / n * Math.PI * 2;
    for (let d = r - 1; d <= r + len; d++) {
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
      if (d < r + len) px(g, x, y, o.outline);
      else px(g, x - 1, y - 1, o.spikeColor, 2, 2);
    }
  }
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
  if (o.face) {
    const dx = Math.max(2, Math.round(r * 0.38)), ey = Math.round(cy - r * 0.15) - 1;
    for (const s of [-1, 1]) {
      const ex = s < 0 ? cx - dx - 1 : cx + dx - 1;
      px(g, ex, ey, '#fff', 2, 2);
      px(g, s < 0 ? ex + 1 : ex, ey + 1, '#2a0a14');       // pupil looks at the middle
      px(g, ex, ey - 1, o.outline, 2, 1);                  // angry brow
    }
    if (r >= 6) px(g, cx - 1, cy + Math.round(r * 0.45), '#2a0a14', 3, 1);
  }
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

(function build() {
  // viruses: spiky blobs in three sizes
  SPR.virus.basic = makeBlob({ r: 6, body: '#6ccf3c', light: '#a8f060', dark: '#3f9a2a', outline: '#1d4a1a', spikeColor: '#e8ff7a', spikes: 8, spikeLen: 3, face: true });
  SPR.virus.runner = makeBlob({ r: 4, body: '#f0b030', light: '#ffe070', dark: '#c07a18', outline: '#5a3208', spikeColor: '#fff0a0', spikes: 6, spikeLen: 3, face: true });
  SPR.virus.brute = makeBlob({ r: 9, body: '#a050d8', light: '#d08cf8', dark: '#6a2a98', outline: '#2c1048', spikeColor: '#f0b0ff', spikes: 11, spikeLen: 4, face: true, spots: true });

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
})();

// 3x5 bitmap font
const FONT = (() => {
  const g = {
    A: '.#.|#.#|###|#.#|#.#', B: '##.|#.#|##.|#.#|##.', C: '.##|#..|#..|#..|.##', D: '##.|#.#|#.#|#.#|##.',
    E: '###|#..|##.|#..|###', F: '###|#..|##.|#..|#..', G: '.##|#..|#.#|#.#|.##', H: '#.#|#.#|###|#.#|#.#',
    I: '###|.#.|.#.|.#.|###', J: '..#|..#|..#|#.#|.#.', K: '#.#|#.#|##.|#.#|#.#', L: '#..|#..|#..|#..|###',
    M: '#.#|###|###|#.#|#.#', N: '##.|#.#|#.#|#.#|#.#', O: '.#.|#.#|#.#|#.#|.#.', P: '##.|#.#|##.|#..|#..',
    Q: '.#.|#.#|#.#|##.|.##', R: '##.|#.#|##.|#.#|#.#', S: '.##|#..|.#.|..#|##.', T: '###|.#.|.#.|.#.|.#.',
    U: '#.#|#.#|#.#|#.#|###', V: '#.#|#.#|#.#|#.#|.#.', W: '#.#|#.#|###|###|#.#', X: '#.#|#.#|.#.|#.#|#.#',
    Y: '#.#|#.#|.#.|.#.|.#.', Z: '###|..#|.#.|#..|###',
    0: '###|#.#|#.#|#.#|###', 1: '.#.|##.|.#.|.#.|###', 2: '##.|..#|.#.|#..|###', 3: '##.|..#|.#.|..#|##.',
    4: '#.#|#.#|###|..#|..#', 5: '###|#..|##.|..#|##.', 6: '.##|#..|###|#.#|###', 7: '###|..#|.#.|.#.|.#.',
    8: '###|#.#|###|#.#|###', 9: '###|#.#|###|..#|##.',
    '.': '...|...|...|...|.#.', ':': '...|.#.|...|.#.|...', '/': '..#|..#|.#.|#..|#..', '-': '...|...|###|...|...',
    '+': '...|.#.|###|.#.|...', '%': '#.#|..#|.#.|#..|#.#', '!': '.#.|.#.|.#.|...|.#.', '?': '##.|..#|.#.|...|.#.',
    '>': '#..|.#.|..#|.#.|#..', '[': '##.|#..|#..|#..|##.', ']': '.##|..#|..#|..#|.##',
    '(': '.##|#..|#..|#..|.##', ')': '##.|..#|..#|..#|##.', ',': '...|...|...|.#.|#..', "'": '.#.|.#.|...|...|...', ' ': '...|...|...|...|...',
  };
  const out = {};
  for (const k in g) out[k] = g[k].split('|');
  return out;
})();
