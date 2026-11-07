# VACCINE: Nano Edition

**V**iral **A**ssault **C**ellular **C**ounter-**I**nitiative: Nano Edition

You are an immune-system fighter. Shoot viruses to damage them, but to *turn* one into an ally you must get close
and poke its glowing weak spot with your tail (click / tap it, or press Space). Defend the
organs, level up and survive 6 minutes. 1 player or online co-op (2 players, room codes).

## Controls
| | Desktop | Phone |
|---|---|---|
| Move | WASD / arrows | left stick |
| Aim | mouse | right stick |
| Poke weak spot | click it / Space | tap it |
| Toggle shooting (hold to shoot if auto fire is off) | F or right click | FIRE button |
| Pause | P / Esc | pause button |

The pause menu has **Settings** (`S`) and **Menu** (`M`, back to the title screen; this ends an online game).

You start without a gun: **Antibody Shot** is a level-up unlock (offered on your first level-up), and Rapid / Split /
Strong Antibody upgrades only appear after it. **Mitosis** makes you swell and then split off child allies (one more
per level), leaving you smaller until you grow back.

**Settings** (title screen, `S`): *Auto level-up* picks upgrades for you so play is never interrupted (the Antibody Shot
unlock is taken first), and *Auto fire* on shoots by itself (`F` still toggles it in a run); off means manual fire: you shoot only while holding
the FIRE button (`F`, right mouse button, gamepad B, or the on-screen FIRE button), in any direction you aim, and *Language* switches
between English (default), German, Italian, French and Spanish. All three are remembered in the browser.

Translations live in `public/src/i18n.js`: the game text is written in English and looked up there (`tr()`; `drawText`
translates everything it draws). To add a language, add a column to `LANGS` and to every entry of `TRX`. The pixel font
only has plain capitals, so accented letters are drawn from the base letter plus extra dots.

Gamepad: left stick move, right stick aim, A pokes, B toggles shooting.

## Levels
Pick the level on the title screen (**L** or the LEVEL button). Online co-op uses the host's level.
- **Campaign** (default) - Classic, Brain, Lungs, Heart, Stomach, then Bloodstream. Your upgrades and level carry over to the next organ. A win
  takes you on, a loss retries that organ, and the final win starts the campaign again. In online co-op the guest
  follows the host from level to level.
- **Classic** - defend five organs for 6 minutes (only you can cure an infected organ). It opens the campaign.
- **Brain** (5 minutes) - seven synapses linked by neuron lines. Saboteurs jam them (lit -> dim -> dark); poke them
  back. The level is **dark**: only you, your allies and lit synapses give light, so dark synapses leave corners where
  viruses hide. Active (lit) synapses regularly **spark lightning** (a faint line charges for a moment, then the bolt
  strikes) that hurts viruses and you if you stand in its path, so a lit synapse is both your light and your artillery.
  Sick synapses stop sparking and breed **spark** enemies instead. Phase 2 (1:30) is darker, phase 3 (3:20) makes the
  synapses crackle much faster. The darkness follows the **signal** bar (average synapse health: lit 100%, dim 50%, dark
  0%). The red tick on the bar is the 15% line: stay below it for 25 seconds (15 in the other levels) and the brain goes
  dark and you lose. It has a longer grace period and a few on-screen tips.
- **Lungs** (5 minutes) - the inside of the lungs. Nine **air sacs** are scattered around; they start open and
  **saboteur** viruses (magenta) clog them, one step per lash: open -> clogged -> collapsed. Poke a clogged sac's
  weak spot to repair one step (repairing is the player's job; allies hunt saboteurs and fight instead, but they can't hurt or shove one that is mid-hack: only you can stop it). Fewer open sacs means less oxygen: you move slower and shake off
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

- **Stomach** (5 minutes) - eight mucus glands that saboteurs erode (poke them back to **sealed**). **Acid** rises from
  the bottom in waves, and every weakened gland raises it; standing in it burns you, but the ground around a sealed gland
  stays safe. Eroded glands breed little **H. pylori**. The boss is the **Ulcer**: it eats acid craters into the wall as it
  moves and fires a ring of acid balls (the gaps between them are safe).

- **Bloodstream** (5 minutes) - eight vessels that saboteurs clot. The map is four **canals** separated by vessel walls
  (they stop you, viruses, allies and shots; only the gaps let you through) with a current flowing in
  alternating directions that carries you, allies and viruses along; it grows stronger in phase 2 and swings back and forth
  in phase 3. Clotted vessels breed **toxins**. The boss is **Sepsis**: it sheds saboteurs that go for the vessels and
  shoots clots at you.

Only the Brain has the **Man Flu** boss; each other level has its own.

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

Win rates with the shipped tuning (roughly; 40-60 games each, so single numbers move by about 10 points). The solo rows were
measured before Classic became the first campaign level and before the Bloodstream canals; the campaign rows after:

| | novice | decent | perfect |
|---|---|---|---|
| Brain (solo) | 2% | 38% | 83% |
| Lungs (solo) | 0% | 32% | 80% |
| Heart (solo) | 3% | 23% | 95% |
| Stomach (solo) | 12% | 22% | 83% |
| Bloodstream (solo, canals) | 8% | 40% | 40% |
| Campaign: Classic (level 1) | - | 40% | 58% |
| Campaign: Brain | - | 28% | 78% |
| Campaign: Lungs (with carried upgrades) | - | 33% | 90% |
| Campaign: Heart | - | 23% | 98% |
| Campaign: Stomach | - | 40% | 70% |
| Campaign: Bloodstream | - | ~45% | ~40% |

The goal is decent ~30% and perfect as high as the bots allow. Saboteurs are deliberately tough (60 HP, a hack takes
4.5 seconds but its progress fades slowly, allies only intercept them when close, and a third saboteur joins each wave
late in a run): a player who ignores them loses the objective in about 80-100% of runs (check with an idle, immortal
player: it loses the Brain/Lungs/Heart/Stomach levels almost every time and Bloodstream about three runs in four), so
the general pressure (spawn / swarm / damage) was eased to keep the levels winnable for a player who does hunt them. The
bots are weakest in the Bloodstream canals (they steer through the wall gaps, but not as well as a person would), so
the perfect bot barely beats the decent one there.

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
