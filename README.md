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
