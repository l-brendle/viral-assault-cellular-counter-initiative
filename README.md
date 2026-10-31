# VACCINE: Nano Edition

**V**iral **A**ssault **C**ellular **C**ounter-**I**nitiative: Nano Edition

You are an immune-system fighter. Shoot viruses to damage them, but to *turn* one into an ally you must get close
and poke its glowing weak spot with your tail (click / tap it, press Space, or use the POKE button). Defend the
organs, level up and survive 6 minutes. 1 player, local co-op, or online co-op (2 players, room codes).

## Controls
| | Desktop | Phone |
|---|---|---|
| Move | WASD (P2: arrows) | left stick |
| Aim | mouse (P2: IJKL) | right stick |
| Poke weak spot | click it / Space (P2: Enter) | tap it / POKE button |
| Toggle shooting | F or right click (P2: U) | FIRE button |
| Pause | P / Esc | pause button |

You start without a gun: **Antibody Shot** is a level-up unlock (offered on your first level-up), and Rapid / Split /
Strong Antibody upgrades only appear after it. **Mitosis** makes you swell and then split off child allies (one more
per level), leaving you smaller until you grow back.

Gamepad: left stick move, right stick aim, A pokes, B toggles shooting.

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
