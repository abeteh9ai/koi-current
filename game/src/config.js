// Koi Current — all tuning numbers and colours in one place.
// The river is a fixed 1280x720 logical field; the renderer scales it to
// the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

export const KOI = {
  radius: 26,
  speed: 340,
  pointerSpeed: 420,
  invulnerable: 1.6,
};

export const LIVES = 3;

/** Pearls drift down with the current; catching one feeds the combo. */
export const PEARL = {
  radius: 13,
  points: 10,
  drift: 46,
  interval: 1.1,
  intervalJitter: 0.7,
  progressBonus: 0.9,
};

/** Fishing hooks drop from the surface, swaying as they sink. */
export const HOOK = {
  radius: 15,
  speed: 210,
  speedPerWave: 26,
  speedJitter: 70,
  interval: 1.9,
  intervalScale: 0.86,
  minInterval: 0.55,
  sway: 42,
};

/** A heron shadow glides across the water; touching it costs a life. */
export const HERON = {
  radius: 44,
  speed: 150,
  speedPerWave: 12,
  interval: 9,
  intervalScale: 0.9,
  minInterval: 4.5,
};

/** How fast the koi closes on the Moon Gate, in percent per second. */
export const GATE = {
  progressPerSecond: 1.15,
  progressPerPearl: 0.9,
  distancePointsPerSecond: 2,
};

/** Seconds of play per wave; speeds and spawn rates stop growing there. */
export const WAVE = { seconds: 20, max: 8 };

/** How many of each thing can exist at once; pools are allocated once. */
export const POOL = { pearls: 24, hooks: 24, herons: 4, bubbles: 40, particles: 90, ripples: 16 };

export const PALETTE = {
  backdrop: '#060b1a',
  deep: '#0a1f3d',
  mid: '#0e3a4d',
  shallow: '#14606b',
  moon: '#f5e9c8',
  moonGlow: '#ffe9a8',
  pearl: '#eaf6ff',
  pearlCore: '#bfe9ff',
  koiOrange: '#ff7a3c',
  koiWhite: '#fff3e2',
  koiRed: '#e5484d',
  hook: '#c8d2dc',
  line: '#9aa7b5',
  heron: '#05070f',
  leaf: '#1e7d4f',
  leafDark: '#145c39',
  reed: '#2f8f5b',
  text: '#f4f1e4',
  muted: '#a8c8d8',
  gold: '#ffd166',
  panel: '#0a2036',
  danger: '#ff5d5d',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'koi-current.best';
