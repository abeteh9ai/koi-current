// The screenshot scenes behind ?shot=start|play|gate|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered
// by a simple autopilot: it looks ahead at where the hooks, heron shadows
// and pearls will be, keeps clear of danger and swims toward the nearest
// pearl when that is safe. The same seed always gives the same frame.

import { FIELD, KOI, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const LIMIT_SECONDS = 600;
const SAMPLES = [0.15, 0.35, 0.6, 0.85];

/** The nine ways the koi can swim: still, and the eight compass directions. */
const DIRECTIONS = [
  { dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
  { dx: 0.707, dy: 0.707 }, { dx: -0.707, dy: 0.707 }, { dx: 0.707, dy: -0.707 }, { dx: -0.707, dy: -0.707 },
];

/**
 * Score one direction: heavy penalty for drifting into a hook or a heron
 * shadow, a pull toward the nearest pearl, and a small pull upstream so
 * the koi keeps making progress. `careful` scales the danger penalty: the
 * play pilot is careful, the end pilot barely looks.
 */
function scoreDirection(state, dir, horizon, careful) {
  const koi = state.koi;
  let score = 0;
  for (const t of SAMPLES) {
    if (t > horizon) break;
    const x = Math.min(FIELD.width - 34, Math.max(34, koi.x + dir.dx * KOI.speed * t));
    const y = Math.min(FIELD.height - 30, Math.max(96, koi.y + dir.dy * KOI.speed * t));
    for (const h of state.hooks) {
      if (!h.active) continue;
      const hx = h.x + Math.sin(h.swayPhase + t * 1.8) * h.sway * 0.4;
      const hy = h.y + h.speed * t;
      const d = Math.hypot(x - hx, y - hy);
      if (d < 95) score -= careful * (95 - d) * (1.6 - t);
    }
    for (const h of state.herons) {
      if (!h.active) continue;
      const d = Math.hypot(x - (h.x + h.vx * t), y - h.y);
      if (d < 110) score -= careful * (110 - d) * (1.6 - t);
    }
    score -= y * 0.004;
  }
  // Chase the nearest pearl, but only if the direction heads roughly at it.
  let pearl = null;
  let bestD = Infinity;
  for (const p of state.pearls) {
    if (!p.active) continue;
    const d = Math.hypot(p.x - koi.x, p.y - koi.y);
    if (d < bestD) {
      bestD = d;
      pearl = p;
    }
  }
  if (pearl) {
    const tx = pearl.x - koi.x;
    const ty = pearl.y - koi.y;
    const len = Math.hypot(tx, ty) || 1;
    score += (dir.dx * (tx / len) + dir.dy * (ty / len)) * 60;
    score -= bestD * 0.02;
  }
  return score;
}

function autopilot(state, horizon, careful) {
  let best = DIRECTIONS[0];
  let bestScore = -Infinity;
  for (const dir of DIRECTIONS) {
    const s = scoreDirection(state, dir, horizon, careful);
    if (s > bestScore) {
      bestScore = s;
      best = dir;
    }
  }
  return best;
}

function runSteps(world, seconds, horizon, careful) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const dir = autopilot(world.state, horizon, careful);
    const events = world.step(STEP, { dx: dir.dx, dy: dir.dy, px: null, py: null }, false);
    if (events & (EVENT_OVER | EVENT_WIN)) break;
  }
}

/**
 * Set `world` to the named scene (start, play, gate or end; any other name
 * is start) and return the screen to draw over it and the best score.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    runSteps(world, PLAY_SECONDS, 0.85, 3);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'gate') {
    // Start almost at the gate, then swim the last stretch for real.
    world.state.progress = 93;
    runSteps(world, LIMIT_SECONDS, 0.85, 3);
    const won = world.state.progress >= 100;
    return { screen: won ? SCREEN_WIN : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'end') {
    // A reckless pilot: it chases pearls and swims straight at the hooks,
    // so the real rules catch it out — as a hurried player is caught.
    runSteps(world, LIMIT_SECONDS, 0.2, -2.5);
    const over = world.state.lives === 0;
    return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  for (let i = 0; i < START_SECONDS / STEP; i += 1) {
    world.step(STEP, { dx: 0, dy: 0, px: null, py: null }, true);
  }
  return { screen: SCREEN_TITLE, best: 0 };
}
