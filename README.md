# Koi Current — Swim to the Moon Gate

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/abeteh9ai/koi-current/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/abeteh9ai/koi-current/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A koi swims upstream through a moonlit river to reach the Moon Gate. Catch glowing pearls to build a combo (up to x5), dodge fishing hooks dropping from the surface and the shadows of herons gliding overhead — three hits and the river takes you. The current pushes you downstream, the waves get faster as you climb, and every pearl pulls the gate a little closer. A complete 2D canvas arcade game: title, play, pause, win and game-over screens, a big readable HUD (score, three koi lives, Moon Gate progress bar, wave and combo), synthesised WebAudio sound, and a best score kept in localStorage. All art is drawn from code and all sound is synthesised — no images, no audio files, no network requests.

## How to play

- **Goal:** fill the Moon Gate progress bar to 100% and swim through the gate.
- **Pearls:** +10 points each, chained without a hit to raise the combo multiplier (up to x5); each pearl also adds progress toward the gate.
- **Hazards:** fishing hooks sink from above, heron shadows glide across the water — either one costs a life. You have 3 lives.
- **Controls:** WASD or arrow keys to swim, or move the mouse and the koi follows the pointer. `Space` or click starts and restarts, `P` pauses, `M` toggles sound.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. No build step, no install: `game/index.html` and its ES modules load offline from `game/`. The entry point is `main.ts` (Node 22, standard library only), which copies `game/` and `screenshots/` to the output directory and writes `dossier.json`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `game/index.html` — the page: one canvas, one module script.
- `game/src/config.js` — every tuning number and colour (field, koi, pearls, hooks, herons, waves, palette).
- `game/src/random.js` — the seeded RNG (mulberry32) that makes `?shot=` scenes deterministic.
- `game/src/input.js` — keyboard steering plus pointer-follow, with one-shot start/pause/mute actions.
- `game/src/audio.js` — the WebAudio synth: pentatonic pearl plucks, a low hit thud, a win arpeggio.
- `game/src/world.js` — the simulation: koi, pearls, hooks, heron shadows, waves, collisions, combo, win and loss.
- `game/src/render.js` — all canvas drawing: water, moonlight, lotus leaves, reeds, the koi, the Moon Gate, HUD and screens.
- `game/src/shots.js` — the `?shot=` staging scenes, played by an autopilot through the real rules.
- `game/src/main.js` — boot, the 60 Hz fixed-step loop, the screen state machine, shot mode.
- `shots.json` — the four screenshots: play, start, gate (win) and end (game over).
- `main.ts` — hands the entry in; `serve.ts` — the local static server; `vendor/makefun-game.ts` — the kit's library, unchanged.

---

<sub>Entered on [make.fun](https://make.fun/?ref=18yfz1fh&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
