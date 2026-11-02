# VACCINE: Nano Edition

**V**iral **A**ssault **C**ellular **C**ounter-**I**nitiative: Nano Edition

You are an immune-system fighter. Shoot viruses to damage them, but to *turn* one into an ally you must get close
and poke its glowing weak spot with your tail (click / tap it, or press Space). Defend the
organs, level up and survive 6 minutes. 1 player, local co-op, or online co-op (2 players, room codes).

## Controls
| | Desktop | Phone |
|---|---|---|
| Move | WASD (P2: arrows) | left stick |
| Aim | mouse (P2: IJKL) | right stick |
| Poke weak spot | click it / Space (P2: Enter) | tap it |
| Toggle shooting | F or right click (P2: U) | FIRE button |
| Pause | P / Esc | pause button |

You start without a gun: **Antibody Shot** is a level-up unlock (offered on your first level-up), and Rapid / Split /
Strong Antibody upgrades only appear after it. **Mitosis** makes you swell and then split off child allies (one more
per level), leaving you smaller until you grow back.

Gamepad: left stick move, right stick aim, A pokes, B toggles shooting.

## Levels
Pick the level on the title screen (**L** or the LEVEL button). Online co-op uses the host's level.
- **Campaign** (default) - Brain, then Lungs, then Heart. Your upgrades and level carry over to the next organ. A win
  takes you on, a loss retries that organ, and the final win starts the campaign again. In online co-op the guest
  follows the host from level to level.
- **Classic** - defend five organs for 6 minutes.
- **Brain** (5 minutes) - seven synapses linked by neuron lines. Saboteurs jam them (lit -> dim -> dark); poke them
  back. The level is **dark**: only you, your allies and lit synapses give light, so dark synapses leave corners where
  viruses hide. Active (lit) synapses regularly **spark lightning** (a faint line charges for a moment, then the bolt
  strikes) that hurts viruses and you if you stand in its path, so a lit synapse is both your light and your artillery.
  Sick synapses stop sparking and breed **spark** enemies instead. Phase 2 (1:30) is darker, phase 3 (3:20) makes the
  synapses crackle much faster. The darkness follows the **signal** bar (average synapse health: lit 100%, dim 50%, dark
  0%). The red tick on the bar is the 15% line: stay below it for 25 seconds (15 in the other levels) and the brain goes
  dark and you lose. This is the first campaign level, so it has a longer grace period and a few on-screen tips.
- **Lungs** (5 minutes) - the inside of the lungs. Nine **air sacs** are scattered around; they start open and
  **saboteur** viruses (magenta) clog them, one step per lash: open -> clogged -> collapsed. Poke a clogged sac's
  weak spot to repair one step (repairing is the player's job; allies hunt saboteurs and fight instead). Fewer open sacs means less oxygen: you move slower and shake off
  infection less. If oxygen stays near zero for 15 seconds the lungs collapse and you lose.
  The lungs also **breathe**: inhale pulls everything up toward the trachea, exhale pushes it back down.
  Sick (clogged or collapsed) sacs lob sticky **slime** like the infected lungs in Classic and breed little **slime
  enemies** (a bar under each shows the next one). It escalates: phase 2 (1:30) sick sacs spit faster, phase 3 (3:20)
  coughs fire a telegraphed shockwave that throws everyone away from the trachea.

- **Heart** (5 minutes) - the pacemaker and four valves can be jammed by saboteurs (poke them back, like the air sacs).
  The pacemaker sets the heartbeat; when it goes erratic or stalls the beat gets faster and the blood current (a
  clockwise swirl around the core that surges with each beat) pushes harder. Sick valves and the pacemaker fire
  **fever rays** in random directions (striped warning lanes show where) and breed little **ember** enemies. The
  **FEVER** readout is 100% minus the rhythm; if the rhythm stays near zero for 15 seconds it is cardiac arrest.
  Phase 2 (1:30) fires rays faster, phase 3 (3:20) adds fever surges: a ring of rays from the core, with safe lanes
  between them.

## Infected organs fight back
- **Lungs** lob **slime** onto the map (a marker shows where it lands). Anything that touches a puddle - you, allies or
  viruses - is frozen in place for 3 seconds.
- **Heart** fires **fever rays** in random directions. A striped warning lane shows where the ray will pass just before
  it fires; anything in the beam burns.
- Cure the organ (poke its weak spot) to stop it. Stunned organs pause their attacks.
- **Medicine** pills appear at random. You never know what you get: antibiotic, adrenaline, vitamin C, stimulant,
  probiotics and an XP magnet help; placebo, sedative, expired pills and growth hormone don't.

## Balance
Each level has a tuning table in `public/src/game.js` (`tune.solo` for playing the level on its own, `tune.camp` for the
campaign, where upgrades carried over from earlier levels make you much stronger, so Lungs and Heart are harder there).
The numbers were found by simulation: `tools/sim` loads the game headlessly in Node and plays it with bots.

- **perfect** bot: reacts every 0.05s, never misses a telegraphed hazard, hunts saboteurs, repairs, picks the best upgrades.
- **decent** bot: an attentive but human-ish player (slower reactions, misses some hazards, sometimes a poor target or upgrade).
- **novice** bot: sanity check, should almost never win.

```bash
node tools/sim/run.js --mode solo --levels brain,lung,heart,classic --bots novice,decent,perfect --n 60
node tools/sim/run.js --mode camp --bots decent,perfect --n 60          # campaign: arrival upgrades come from the earlier levels
node tools/sim/diag.js lung perfect 1 1.4 1.35 7                        # one game's timeline: level bot P Ksab Karc seed
```

Win rates with the shipped tuning (60 games each):

| | novice | decent | perfect |
|---|---|---|---|
| Brain (solo, = campaign level 1) | 0% | 35% | 97% |
| Lungs (solo) | 15% | 53% | 73% |
| Heart (solo) | 7% | 30% | 100% |
| Classic | 8% | 35% | 88% |
| Campaign: Brain | 3% | 33% | 97% |
| Campaign: Lungs (with carried upgrades) | 12% | 35% | 60% |
| Campaign: Heart (with carried upgrades) | 2% | 32% | 95% |

The goal is decent ~30% and perfect ~100%. Brain and Heart reach it; Lungs does not: its outcome depends more on how fast
the ally army snowballs than on player skill, so the bots stay close together there.

## Run locally
```bash
npm start     # http://localhost:8765  (static file server, no dependencies)
```

## Deploy (Vercel)
The game is a fully static site (everything lives in `public/`; `vercel.json` sets it as the output directory with no build step), so no backend is needed:
```bash
npx vercel --prod
```
Online co-op is peer-to-peer (WebRTC via PeerJS). A room code is the host's peer id; the public PeerJS
cloud server only introduces the two browsers, then game data flows directly between them.
The host's browser runs the simulation. Strict corporate networks may block direct connections (no TURN relay).
