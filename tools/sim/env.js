'use strict';
// Loads the browser game (public/src/sprites.js + game.js) into a Node vm context with a stubbed DOM, so bots can play it
// headlessly through the window.__dbg hook. Nothing is rendered.
const vm = require('vm'), fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, '..', '..', 'public', 'src');

function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function loadGame() {
  const noop = () => {};
  const g2d = new Proxy({}, { get: (t, k) => k in t ? t[k] : (k === 'measureText' ? () => ({ width: 0 }) : noop), set: (t, k, v) => { t[k] = v; return true; } });
  const canvas = () => ({ width: 0, height: 0, style: {}, getContext: () => g2d, addEventListener: noop, setPointerCapture: noop });
  const doc = { getElementById: canvas, createElement: canvas, documentElement: {}, addEventListener: noop, hidden: false };
  const sb = {
    document: doc, console, Math: Object.create(Math), Date, JSON, Set, Map, Array, Object, Number, String, Proxy,
    innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
    matchMedia: () => ({ matches: false }), requestAnimationFrame: noop, addEventListener: noop,
    performance: { now: () => Date.now() }, navigator: { getGamepads: () => [] }, location: { search: '', href: '' },
    setTimeout, clearTimeout, URLSearchParams,
  };
  sb.window = sb;
  vm.createContext(sb);
  for (const f of ['sprites.js', 'game.js']) vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), sb, { filename: f });
  return {
    d: sb.__dbg,
    seed(n) { const r = mulberry32(n); sb.Math.random = r; },
  };
}
module.exports = { loadGame };
