'use strict';
// Single-game timeline for debugging a bot/level: node tools/sim/diag.js lung perfect 1.2 2.5 [seed]   (level bot P Ksab Karc seed)
const { loadGame } = require('./env'), { makeBot } = require('./bots');
const [level, botName, P, K, A, seed = 1] = process.argv.slice(2);
const env = loadGame(), d = env.d, Pn = +P, Kn = +K, An = +A;
d.LEVELS[level].tune = { solo: { spawn: 1 / Pn, swarm: Pn, dmg: Pn, hp: Math.sqrt(Pn), sab: 1 / Kn, arc: 1 / An, grace: level === 'brain' ? 25 : 15 } };
env.seed(+seed); d.setLevel(level); d.start(false);
const bot = makeBot(botName, +seed); let last = -10, stuck = 0, frames = 0, clog = 0, rep = 0, prev = d.fix.map(f => f.st);
while (d.state !== 'over') {
  bot.tick(d); if (d.state === 'play') { d.step(1); frames++; if (d.P.stuckT > 0) stuck++; d.fix.forEach((f, i) => { if (f.st > prev[i]) clog++; else if (f.st < prev[i]) rep++; prev[i] = f.st; }); }
  if (d.G.t - last >= 10) { last = d.G.t; const sab = d.units.filter(u => u.team === 'v' && u.type === 'saboteur').length, vs = d.units.filter(u => u.team === 'v').length, al = d.units.filter(u => u.team === 'i').length;
    console.log(d.G.t.toFixed(0).padStart(4) + 's inf=' + d.P.infection.toFixed(0).padStart(3) + ' sig=' + d.oxy().toFixed(2) + ' fix=' + d.fix.map(f => f.st).join('') + ' sab=' + sab + ' virus=' + vs + ' ally=' + al + ' lv=' + d.S.level + ' stuck%=' + (100 * stuck / frames).toFixed(0) + ' globs=' + d.G.globs.length + ' slimes=' + d.G.slimes.length); }
}
console.log('CLOGS', clog, 'REPAIRS', rep, 'per min', (60 * clog / d.G.t).toFixed(1), (60 * rep / d.G.t).toFixed(1));
console.log('STATS', JSON.stringify(bot.stats));
console.log('RESULT', d.G.result, d.G.reason, d.G.t.toFixed(0));
