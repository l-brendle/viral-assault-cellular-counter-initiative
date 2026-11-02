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
  viruses hide. Sick synapses discharge **lightning along the neuron lines** (blue striped lanes warn first, stay off
  the line) and breed **spark** enemies. Phase 2 (1:30) is darker and faster, phase 3 (3:20) adds storms that fire along
  several lines at once. If the signal stays near zero for 15 seconds the brain goes dark and you lose.
- **Lungs** (5 minutes) - the inside of the lungs. Nine **air sacs** are scattered around; they start open and
  **saboteur** viruses (magenta) clog them, one step per lash: open -> clogged -> collapsed. Poke a clogged sac's
  weak spot to repair one step (allies help too). Fewer open sacs means less oxygen: you move slower and shake off
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
