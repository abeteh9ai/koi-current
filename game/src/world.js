// The river's rules and state, with no drawing and no browser in it: the
// koi, the drifting pearls, the falling hooks, the heron shadows, the waves,
// the collisions, the score, the combo, the lives and the Moon Gate.
// step() advances one fixed step and returns what happened as bit flags,
// so the caller can react (sound, announcements) without the world knowing
// about screens or sound. Nothing here allocates after createWorld returns.

import { FIELD, GATE, HERON, HOOK, KOI, LIVES, PEARL, POOL, WAVE } from './config.js';

export const EVENT_PEARL = 1;
export const EVENT_HIT = 2;
export const EVENT_OVER = 4;
export const EVENT_WIN = 8;

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function createWorld(random) {
  const koi = {
    x: FIELD.width / 2, y: FIELD.height - 190, vx: 0, vy: 0,
    angle: -Math.PI / 2, tail: 0, invulnerable: 0,
  };

  function makePool(size, fill) {
    const pool = [];
    for (let i = 0; i < size; i += 1) pool.push(fill());
    return pool;
  }

  const pearls = makePool(POOL.pearls, () => ({ active: false, x: 0, y: 0, r: PEARL.radius, phase: 0, drift: PEARL.drift }));
  const hooks = makePool(POOL.hooks, () => ({ active: false, x: 0, y: 0, r: HOOK.radius, speed: 0, sway: 0, swayPhase: 0 }));
  const herons = makePool(POOL.herons, () => ({ active: false, x: 0, y: 0, r: HERON.radius, vx: 0, vy: 0, phase: 0 }));
  const bubbles = makePool(POOL.bubbles, () => ({ active: false, x: 0, y: 0, r: 3, speed: 0, wobble: 0 }));
  const particles = makePool(POOL.particles, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 3 }));
  const ripples = makePool(POOL.ripples, () => ({ active: false, x: 0, y: 0, r: 0, life: 0 }));

  const state = {
    koi, pearls, hooks, herons, bubbles, particles, ripples,
    score: 0, lives: LIVES, wave: 1, elapsed: 0, progress: 0,
    combo: 0, bestCombo: 0, pearlsCaught: 0,
    pearlTimer: 0, hookTimer: 0, heronTimer: 0, bubbleTimer: 0,
    shake: 0, gateGlow: 0,
  };
  let distanceFloat = 0;

  function reset() {
    koi.x = FIELD.width / 2;
    koi.y = FIELD.height - 190;
    koi.vx = 0;
    koi.vy = 0;
    koi.angle = -Math.PI / 2;
    koi.tail = 0;
    koi.invulnerable = 0;
    for (const p of pearls) p.active = false;
    for (const h of hooks) h.active = false;
    for (const h of herons) h.active = false;
    for (const b of bubbles) b.active = false;
    for (const p of particles) p.active = false;
    for (const r of ripples) r.active = false;
    state.score = 0;
    state.lives = LIVES;
    state.wave = 1;
    state.elapsed = 0;
    state.progress = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.pearlsCaught = 0;
    state.pearlTimer = 0.6;
    state.hookTimer = 2.2;
    state.heronTimer = 7;
    state.bubbleTimer = 0;
    state.shake = 0;
    state.gateGlow = 0;
    distanceFloat = 0;
    // A few pearls already in the water so the first seconds feel alive.
    for (let i = 0; i < 4; i += 1) spawnPearlAt(random() * FIELD.width, 120 + random() * 380);
  }

  function free(pool) {
    for (let i = 0; i < pool.length; i += 1) if (!pool[i].active) return pool[i];
    return null;
  }

  function spawnPearlAt(x, y) {
    const p = free(pearls);
    if (!p) return;
    p.active = true;
    p.x = Math.min(FIELD.width - 30, Math.max(30, x));
    p.y = y;
    p.phase = random() * Math.PI * 2;
    p.drift = PEARL.drift * (0.8 + random() * 0.5);
  }

  function spawnHook() {
    const h = free(hooks);
    if (!h) return;
    h.active = true;
    h.x = 60 + random() * (FIELD.width - 120);
    h.y = -30;
    h.speed = HOOK.speed + HOOK.speedPerWave * (state.wave - 1) + random() * HOOK.speedJitter;
    h.sway = HOOK.sway * (0.5 + random());
    h.swayPhase = random() * Math.PI * 2;
  }

  function spawnHeron() {
    const h = free(herons);
    if (!h) return;
    const fromLeft = random() < 0.5;
    h.active = true;
    h.x = fromLeft ? -60 : FIELD.width + 60;
    h.y = 140 + random() * 360;
    const speed = HERON.speed + HERON.speedPerWave * (state.wave - 1);
    h.vx = fromLeft ? speed : -speed;
    h.vy = 0;
    h.phase = random() * Math.PI * 2;
  }

  function spawnBubble() {
    const b = free(bubbles);
    if (!b) return;
    b.active = true;
    b.x = 40 + random() * (FIELD.width - 80);
    b.y = FIELD.height + 10;
    b.r = 2 + random() * 5;
    b.speed = 26 + random() * 42;
    b.wobble = random() * Math.PI * 2;
  }

  function burst(x, y) {
    for (let i = 0; i < 12; i += 1) {
      const p = free(particles);
      if (!p) return;
      const a = random() * Math.PI * 2;
      const s = 60 + random() * 160;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s;
      p.max = 0.5 + random() * 0.4;
      p.life = p.max;
      p.size = 2 + random() * 4;
    }
    const r = free(ripples);
    if (r) {
      r.active = true;
      r.x = x;
      r.y = y;
      r.r = 6;
      r.life = 0.6;
    }
  }

  /** The combo multiplier: every 4 pearls in a row without a hit adds one, up to x5. */
  function multiplier() {
    return Math.min(5, 1 + Math.floor(state.combo / 4));
  }

  function hookInterval() {
    return Math.max(HOOK.minInterval, HOOK.interval * HOOK.intervalScale ** (state.wave - 1));
  }

  function heronInterval() {
    return Math.max(HERON.minInterval, HERON.interval * HERON.intervalScale ** (state.wave - 1));
  }

  /**
   * One fixed step. `control` is { dx, dy } from held keys (-1..1 each) and
   * { px, py } — the pointer's field position, or null when it never moved.
   * With `harmless` set (the title screen's living river) things drift and
   * spawn but nothing can be caught or hit and nothing scores.
   */
  function step(dt, control, harmless) {
    let events = 0;
    state.elapsed += dt;
    state.wave = Math.min(WAVE.max, 1 + Math.floor(state.elapsed / WAVE.seconds));
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);
    state.gateGlow = Math.min(1, state.progress / 100 + 0.15);

    // --- the koi ---
    let mx = control.dx;
    let my = control.dy;
    if (mx === 0 && my === 0 && control.px !== null && control.py !== null) {
      const dx = control.px - koi.x;
      const dy = control.py - koi.y;
      const d = Math.hypot(dx, dy);
      if (d > 14) {
        mx = dx / d;
        my = dy / d;
        koi.vx = mx * KOI.pointerSpeed;
        koi.vy = my * KOI.pointerSpeed;
      } else {
        koi.vx *= 0.85;
        koi.vy *= 0.85;
      }
    } else {
      const len = Math.hypot(mx, my) || 1;
      koi.vx = (mx / len) * KOI.speed;
      koi.vy = (my / len) * KOI.speed;
    }
    // The current always tugs the koi downstream a little.
    koi.vy += 26 * dt;
    koi.x = Math.min(FIELD.width - 34, Math.max(34, koi.x + koi.vx * dt));
    koi.y = Math.min(FIELD.height - 30, Math.max(96, koi.y + koi.vy * dt));
    if (Math.hypot(koi.vx, koi.vy) > 20) {
      koi.angle = Math.atan2(koi.vy, koi.vx);
    }
    koi.tail += dt * (6 + Math.hypot(koi.vx, koi.vy) / 60);
    if (koi.invulnerable > 0) koi.invulnerable = Math.max(0, koi.invulnerable - dt);

    // --- progress toward the Moon Gate and distance points ---
    if (!harmless) {
      state.progress += GATE.progressPerSecond * dt;
      distanceFloat += GATE.distancePointsPerSecond * dt;
      if (distanceFloat >= 1) {
        state.score += Math.floor(distanceFloat);
        distanceFloat -= Math.floor(distanceFloat);
      }
      if (state.progress >= 100) {
        state.progress = 100;
        return EVENT_WIN;
      }
    }

    // --- spawning ---
    state.pearlTimer -= dt;
    if (state.pearlTimer <= 0) {
      spawnPearlAt(random() * FIELD.width, -20);
      state.pearlTimer += PEARL.interval + random() * PEARL.intervalJitter;
    }
    state.hookTimer -= dt;
    if (state.hookTimer <= 0) {
      spawnHook();
      state.hookTimer += hookInterval();
    }
    state.heronTimer -= dt;
    if (state.heronTimer <= 0) {
      spawnHeron();
      state.heronTimer += heronInterval();
    }
    state.bubbleTimer -= dt;
    if (state.bubbleTimer <= 0) {
      spawnBubble();
      state.bubbleTimer += 0.25 + random() * 0.4;
    }

    // --- pearls: drift down, bob, get caught ---
    for (const p of pearls) {
      if (!p.active) continue;
      p.y += p.drift * dt;
      p.phase += dt * 2.4;
      if (p.y > FIELD.height + 30) {
        p.active = false;
        continue;
      }
      if (harmless) continue;
      const rr = KOI.radius + p.r;
      if (dist2(koi.x, koi.y, p.x + Math.sin(p.phase) * 8, p.y) < rr * rr) {
        p.active = false;
        state.combo += 1;
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        state.pearlsCaught += 1;
        state.score += PEARL.points * multiplier();
        state.progress = Math.min(100, state.progress + GATE.progressPerPearl);
        burst(p.x, p.y);
        events |= EVENT_PEARL;
      }
    }

    // --- hooks: sink and sway; a touch costs a life ---
    for (const h of hooks) {
      if (!h.active) continue;
      h.y += h.speed * dt;
      h.swayPhase += dt * 1.8;
      const hx = h.x + Math.sin(h.swayPhase) * h.sway * 0.4;
      if (h.y > FIELD.height + 40) {
        h.active = false;
        continue;
      }
      if (harmless || koi.invulnerable > 0) continue;
      const rr = KOI.radius * 0.8 + h.r;
      if (dist2(koi.x, koi.y, hx, h.y) < rr * rr) {
        h.active = false;
        events |= hurt();
        if (events & EVENT_OVER) return events;
      }
    }

    // --- heron shadows: glide across; a touch costs a life ---
    for (const h of herons) {
      if (!h.active) continue;
      h.x += h.vx * dt;
      h.phase += dt * 1.4;
      h.y += Math.sin(h.phase) * 18 * dt;
      if (h.x < -90 || h.x > FIELD.width + 90) {
        h.active = false;
        continue;
      }
      if (harmless || koi.invulnerable > 0) continue;
      const rr = KOI.radius * 0.75 + h.r * 0.8;
      if (dist2(koi.x, koi.y, h.x, h.y) < rr * rr) {
        h.active = false;
        events |= hurt();
        if (events & EVENT_OVER) return events;
      }
    }

    // --- ambient water: bubbles rise, sparks fade, ripples spread ---
    for (const b of bubbles) {
      if (!b.active) continue;
      b.y -= b.speed * dt;
      b.wobble += dt * 3;
      b.x += Math.sin(b.wobble) * 12 * dt;
      if (b.y < -12) b.active = false;
    }
    for (const p of particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }
    for (const r of ripples) {
      if (!r.active) continue;
      r.life -= dt;
      r.r += 90 * dt;
      if (r.life <= 0) r.active = false;
    }

    return events;
  }

  function hurt() {
    state.lives -= 1;
    state.combo = 0;
    koi.invulnerable = KOI.invulnerable;
    state.shake = 0.45;
    burst(koi.x, koi.y);
    if (state.lives <= 0) return EVENT_HIT | EVENT_OVER;
    return EVENT_HIT;
  }

  reset();
  return { state, reset, step, multiplier };
}
