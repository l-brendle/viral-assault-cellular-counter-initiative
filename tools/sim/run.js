'use strict';
// Balance runner: plays many games with bots in parallel worker threads and reports win rates.
//   node tools/sim/run.js --levels brain,lung,heart,classic --bots decent,perfect --mode solo --n 40
//   node tools/sim/run.js --mode camp --bots decent,perfect --n 40      (campaign: arrival states come from earlier levels)
//   --D lung:2.5,heart:3        scalar difficulty override per level (spawn 1/D, swarm D, dmg D, hp sqrt(D), sab 1/D, arc 1/D)
//   --PK lung:1.2:2.5:3         (optional 4th number: arc pressure separate from sabotage pressure)
//   --PK lung:1.2:2.5           same but general pressure D=1.2 and sabotage/hazard pressure K=2.5
//   --only heart                campaign mode: evaluate just that level (earlier levels are only played to get arrival upgrades)
//   --tune '{"lung":{"solo":{...},"camp":{...}}}'   full tuning override
const { Worker, isMainThread, parentPort } = require('worker_threads');
const { loadGame } = require('./env');
const { makeBot } = require('./bots');
const CAMPAIGN = ['brain', 'lung', 'heart'];

const scalar = (D, grace = 15, K = D, A = K) => ({ spawn: 1 / D, swarm: D, dmg: D, hp: Math.sqrt(D), sab: 1 / K, arc: 1 / A, grace });   // D: general pressure, K: sabotage + hazard pressure

// one full game; returns { win, t, S, reason }
function play(env, o, tune) {   // o.presets: extra bot presets by name
  const d = env.d;
  env.seed(o.seed);
  if (tune) for (const k of Object.keys(tune)) d.LEVELS[k].tune = tune[k];
  if (o.mode === 'camp') d.startCamp(o.idx, o.S0 ? JSON.parse(JSON.stringify(o.S0)) : null); else { d.setLevel(o.level); d.start(false); }
  const bot = makeBot(o.bot, o.seed, o.presets);
  let guard = 0;
  while (d.state !== 'over' && guard++ < 60 * 400) {
    bot.tick(d);
    if (o.immortal) { d.P.infection = Math.min(d.P.infection, 60); d.G.suffT = 0; }
    if (d.state === 'play') d.step(1);
  }
  return { win: d.G.result === 'win', t: d.G.t, S: JSON.parse(JSON.stringify(d.S)), reason: d.G.reason, lvl: d.S.level };
}

if (!isMainThread) {
  const env = loadGame();
  parentPort.on('message', task => {
    if (task === 'quit') process.exit(0);
    let out;
    if (task.chain) {   // campaign: per level, evaluate from the arrival state, then harvest the next arrival state with an immortal run
      out = []; let S0 = null;
      const only = task.only ? CAMPAIGN.indexOf(task.only) : -1;   // --only heart: just harvest arrival states for earlier levels, evaluate that level
      for (let i = 0; i < CAMPAIGN.length; i++) {
        if (only >= 0 && i > only) break;
        if (only < 0 || i === only) {
          const r = play(env, { mode: 'camp', idx: i, S0, bot: task.bot, presets: task.presets, seed: task.seed * 31 + i }, task.tune);
          out.push({ level: CAMPAIGN[i], win: r.win, t: r.t, startLvl: S0 ? S0.level : 1, reason: r.reason });
          if (i === only) break;
        }
        S0 = play(env, { mode: 'camp', idx: i, S0, bot: task.bot, presets: task.presets, seed: task.seed * 31 + i + 1000, immortal: true }, task.tune).S;
      }
    } else out = play(env, task, task.tune);
    parentPort.postMessage({ id: task.id, out });
  });
} else {
  const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
  const levels = opt('levels', 'brain,lung,heart,classic').split(','), bots = opt('bots', 'decent,perfect').split(','), mode = opt('mode', 'solo');
  const n = +opt('n', 40), W = +opt('workers', 16), seed0 = +opt('seed', 1);
  let tune = JSON.parse(opt('tune', 'null'));
  const Ds = opt('D', null), PKs = opt('PK', null), presets = JSON.parse(opt('presets', 'null'));   // --presets '{"pA":{"think":0.05,...}}' adds bot variants
  if (Ds) { tune = tune || {}; for (const kv of Ds.split(',')) { const [k, v] = kv.split(':'); tune[k] = { solo: scalar(+v, k === 'brain' ? 25 : 15), camp: scalar(+v, k === 'brain' ? 25 : 15) }; } }
  if (PKs) { tune = tune || {}; for (const kv of PKs.split(',')) { const [k, p, kk, aa] = kv.split(':'); tune[k] = { solo: scalar(+p, k === 'brain' ? 25 : 15, +kk, +(aa || kk)), camp: scalar(+p, k === 'brain' ? 25 : 15, +kk, +(aa || kk)) }; } }
  const tasks = [];
  for (const bot of bots) {
    if (mode === 'camp') for (let k = 0; k < n; k++) tasks.push({ bot, chain: true, seed: seed0 + k, tune, presets, only: opt('only', null) });
    else for (const level of levels) for (let k = 0; k < n; k++) tasks.push({ bot, level, seed: seed0 + k, mode: 'solo', tune, presets });
  }
  tasks.forEach((t, i) => t.id = i);
  const results = new Array(tasks.length); let next = 0, done = 0;
  const t0 = Date.now();
  for (let i = 0; i < Math.min(W, tasks.length); i++) {
    const w = new Worker(__filename);
    const feed = () => { if (next < tasks.length) w.postMessage(tasks[next++]); else w.postMessage('quit'); };
    w.on('message', m => { results[m.id] = m.out; if (++done === tasks.length) report(); else feed(); });
    w.on('error', e => { console.error(e); process.exit(1); });
    feed();
  }
  function report() {
    const pct = (a, b) => b ? Math.round(100 * a / b) + '%' : '-';
    const rows = {};
    tasks.forEach((t, i) => {
      const r = results[i];
      if (t.chain) r.forEach(x => { const k = t.bot + ' camp ' + x.level; (rows[k] = rows[k] || []).push(x); });
      else { const k = t.bot + ' solo ' + t.level; (rows[k] = rows[k] || []).push(r); }
    });
    console.log('mode=' + mode + ' n=' + n + (Ds ? ' D=' + Ds : '') + (PKs ? ' PK=' + PKs : '') + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + 's)');
    for (const k of Object.keys(rows)) {
      const r = rows[k], wins = r.filter(x => x.win).length, avgT = r.reduce((s, x) => s + x.t, 0) / r.length;
      const lose = {}; r.filter(x => !x.win).forEach(x => lose[x.reason] = (lose[x.reason] || 0) + 1);
      const sl = r.reduce((s, x) => s + (x.startLvl || x.lvl || 0), 0) / r.length;
      console.log(k.padEnd(22), 'win', pct(wins, r.length).padStart(4), ' avgT', avgT.toFixed(0).padStart(4), ' avgLv', sl.toFixed(1), ' losses', JSON.stringify(lose));
    }
    process.exit(0);
  }
}
