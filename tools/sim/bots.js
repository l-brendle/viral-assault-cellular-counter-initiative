'use strict';
// Bots that play the game through window.__dbg. One policy, three skill presets:
//   perfect - reacts every 0.05s, always dodges telegraphed hazards, repairs and converts in a sensible order, smart upgrades
//   decent  - an attentive but human-ish player: slower reactions, misses some hazards, sometimes picks a poor target
//   novice  - sanity check: should almost never win
const PRESETS = {
  perfect: { think: 0.05, dodge: 1, pokeP: 1, smart: 1, flee: 50, sep: 1.2, chase: 150, sabW: 12, hunt: 2, fixW: 3 },
  decent: { think: 0.5, dodge: 0.6, pokeP: 0.45, smart: 0.4, smartUpg: 0.55, flee: 80, sep: 0.5, chase: 240 },
  novice: { think: 0.7, dodge: 0.3, pokeP: 0.3, smart: 0, flee: 90, sep: 0.3 },
};
const UPG_ORDER = ['shoot', 'aura', 'regen', 'orbit', 'speed', 'reach', 'rate', 'multi', 'dmg', 'split', 'magnet'];   // found by simulation: aura + regen carry runs

function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function makeBot(name, seed, extra) {
  const sk = Object.assign({ sepR: 70, chase: 260, fleeR: 160, sabW: 4, hunt: 2, fixW: 1, slimeR: 16, globR: 32, upg: UPG_ORDER }, (extra && extra[name]) || PRESETS[name]), rnd = mulberry32(seed * 7919 + 13);
  let nextT = 0, mx = 0, my = 0, fleeing = false, goal = null, pokeNow = false;
  const stats = { n: 0, flee: 0, fix: 0, virus: 0, organ: 0, pill: 0, gem: 0, none: 0, stopped: 0, pokes: 0 };
  const seen = new WeakMap();   // hazard -> did this bot notice it
  const noticed = h => { if (!seen.has(h)) seen.set(h, rnd() < sk.dodge); return seen.get(h); };

  function pickUpgrade(d) {
    const ch = d.choices;
    let i = 0;
    if (rnd() < (sk.smartUpg !== undefined ? sk.smartUpg : sk.smart)) { let best = 1e9; ch.forEach((u, k) => { const r = sk.upg.indexOf(u.id); if (r < best) { best = r; i = k; } }); }
    else i = Math.floor(rnd() * ch.length);
    d.pick(i);
  }

  function decide(d) {
    const P = d.P, G = d.G, reach = d.reach(P), t = G.t;
    const viruses = G.units.filter(u => u.team === 'v' && !u.dead);
    let hx = 0, hy = 0;   // hazard avoidance
    for (const b of G.beams) {
      if (!noticed(b)) continue;
      const dx = P.x - b.x, dy = P.y - b.y, ca = Math.cos(b.a), sa = Math.sin(b.a);
      const along = dx * ca + dy * sa, perp = -dx * sa + dy * ca;
      if (along > -18 && along < b.len + 18 && Math.abs(perp) < b.w / 2 + 22) { const sgn = perp >= 0 ? 1 : -1; hx += -sa * sgn * 3; hy += ca * sgn * 3; }
    }
    for (const sl of G.slimes) {
      if (!noticed(sl)) continue;
      const dd = Math.hypot(P.x - sl.x, P.y - sl.y);
      if (dd < sl.r + sk.slimeR) { hx += (P.x - sl.x) / (dd || 1) * 2.5; hy += (P.y - sl.y) / (dd || 1) * 2.5; }
    }
    for (const gl of G.globs) {
      if (!noticed(gl)) continue;
      const dd = Math.hypot(P.x - gl.tx, P.y - gl.ty);
      if (dd < sk.globR) { hx += (P.x - gl.tx) / (dd || 1) * 2.5; hy += (P.y - gl.ty) / (dd || 1) * 2.5; }
    }
    // keep a little distance from viruses (they bite on contact)
    let sx = 0, sy = 0, near = 0;
    for (const u of viruses) {
      const dd = Math.hypot(P.x - u.x, P.y - u.y);
      if (dd < sk.sepR) { const w = (sk.sepR - dd) / sk.sepR; sx += (P.x - u.x) / (dd || 1) * w; sy += (P.y - u.y) / (dd || 1) * w; near++; }
    }
    // retreat when infection is high
    if (P.infection > sk.flee) fleeing = true; else if (P.infection < sk.flee - 20) fleeing = false;
    let gx = 0, gy = 0, stop = false;
    if (fleeing) {
      let fx = 0, fy = 0;
      for (const u of viruses) { const dd = Math.hypot(P.x - u.x, P.y - u.y); if (dd < sk.fleeR) { fx += (P.x - u.x) / (dd || 1) * (sk.fleeR - dd); fy += (P.y - u.y) / (dd || 1) * (sk.fleeR - dd); } }
      let tx = fx, ty = fy;
      const org = d.organs.filter(o => o.team === 'i').sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0];
      if (org && Math.hypot(org.x - P.x, org.y - P.y) < 500) { const dd = Math.hypot(org.x - P.x, org.y - P.y) || 1; tx += (org.x - P.x) / dd * 120; ty += (org.y - P.y) / dd * 120; }
      const l = Math.hypot(tx, ty) || 1; gx = tx / l; gy = ty / l;
      goal = null;
    } else {
      // candidate goals: points to walk to, with a value
      const cands = [];
      const oxy = d.oxy(), fixUrgent = G.fix.length && (oxy < 0.9 || G.fix.some(f => f.st === 2));
      const hunting = G.fix.length && oxy > sk.hunt && viruses.some(u => u.type === 'saboteur');   // while the signal holds, stop the saboteurs before repairing
      for (const f of G.fix) if (f.st > 0) {
        const sp = d.spot(f), dd = Math.hypot(sp.x - P.x, sp.y - P.y);
        const v = sk.fixW * (1 + f.st) * (fixUrgent ? 2.2 : 1) * (1.6 - oxy) / (1 + dd / 220) * (hunting ? 0.25 : 1);
        cands.push({ v, x: sp.x, y: sp.y, ref: f, kind: 'fix', dd });
      }
      for (const u of viruses) {
        const sp = d.spot(u), dd = Math.hypot(sp.x - P.x, sp.y - P.y);
        if (dd > sk.chase && !(u.type === 'saboteur' && G.fix.length)) continue;
        let w = u.type === 'saboteur' ? (G.fix.length ? sk.sabW : 1) : u.type === 'brute' ? 2 : u.type === 'runner' ? 1.4 : 1;
        if (d.organs.some(o => o.team === 'i' && Math.hypot(u.x - o.x, u.y - o.y) < 120)) w *= 1.8;   // classic: viruses closing in on a healthy organ
        // approach from behind: a point just past the weak spot, away from the body
        const ox = sp.x - u.x, oy = sp.y - u.y, ol = Math.hypot(ox, oy) || 1;
        cands.push({ v: w / (1 + dd / 110), x: sp.x + ox / ol * 22, y: sp.y + oy / ol * 22, sx: sp.x, sy: sp.y, ref: u, kind: 'virus', dd });
      }
      for (const o of d.organs) if (o.team === 'v') {
        const sp = d.spot(o), dd = Math.hypot(sp.x - P.x, sp.y - P.y);
        const ox = sp.x - o.x, oy = sp.y - o.y, ol = Math.hypot(ox, oy) || 1;
        cands.push({ v: 5 / (1 + dd / 250), x: sp.x + ox / ol * 18, y: sp.y + oy / ol * 18, sx: sp.x, sy: sp.y, ref: o, kind: 'organ', dd });
      }
      for (const pl of G.pills) { const dd = Math.hypot(pl.x - P.x, pl.y - P.y); if (dd < 220) cands.push({ v: 1.2 / (1 + dd / 100), x: pl.x, y: pl.y, kind: 'pill', dd }); }
      if (!cands.length) for (const g of G.gems) { const dd = Math.hypot(g.x - P.x, g.y - P.y); if (dd < 300) cands.push({ v: 0.2 / (1 + dd / 100), x: g.x, y: g.y, kind: 'gem', dd }); }
      let best = null;
      if (rnd() < sk.smart) { for (const c of cands) if (!best || c.v > best.v) best = c; }
      else { for (const c of cands) if (c.kind !== 'gem' && (!best || c.dd < best.dd)) best = c; if (!best) for (const c of cands) if (!best || c.v > best.v) best = c; }
      const cur = goal && cands.find(c => c.ref && c.ref === goal.ref);   // stick with the current goal unless something is clearly better (no dithering)
      if (cur && best && cur !== best && cur.v * 1.4 >= best.v) best = cur;
      goal = best;
      if (best) {
        const dx = best.x - P.x, dy = best.y - P.y, l = Math.hypot(dx, dy) || 1;
        const inReach = best.sx !== undefined ? Math.hypot(best.sx - P.x, best.sy - P.y) < reach * 0.75 : (best.kind === 'fix' && l < reach * 0.75);
        if (inReach) stop = true; else { gx = dx / l; gy = dy / l; }
      } else {
        // nothing to do: drift toward the middle of the action (lit synapses / the player's allies)
        const dx = 600 - P.x, dy = 450 - P.y, l = Math.hypot(dx, dy) || 1; if (l > 150) { gx = dx / l * 0.5; gy = dy / l * 0.5; }
      }
    }
    stats.n++; if (fleeing) stats.flee++; else if (goal) stats[goal.kind]++; else stats.none++; if (stop) stats.stopped++;
    let vx = gx + hx + sx * sk.sep, vy = gy + hy + sy * sk.sep;
    if (stop && !hx && !hy) { vx = sx * sk.sep; vy = sy * sk.sep; }
    const l = Math.hypot(vx, vy); if (l > 1) { vx /= l; vy /= l; }
    mx = vx; my = vy;
  }

  return {
    stats,
    pickUpgrade,
    tick(d) {
      const P = d.P;
      if (d.state === 'levelup') { pickUpgrade(d); return; }
      if (d.state !== 'play') return;
      P.remote = true;
      if (d.G.t >= nextT) { nextT = d.G.t + sk.think; decide(d); if (rnd() < sk.pokeP) pokeNow = true; else pokeNow = false; }
      P.netInp = { mx, my, aim: null };
      if (pokeNow || sk.pokeP >= 1) {
        const g = goal && goal.ref;   // poke the target we are after if it is in reach, otherwise whatever is nearest
        const inR = g && Math.hypot(d.spot(g).x - P.x, d.spot(g).y - P.y) <= d.reach(P);
        if (inR ? d.pokeRef(P, g) : d.poke(P)) stats.pokes++;
      }
    },
  };
}
module.exports = { makeBot, PRESETS };
