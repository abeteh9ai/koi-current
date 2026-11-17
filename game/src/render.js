// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x720 river is scaled to fit the window and centred, the margin
// filled with the backdrop colour. Everything is drawn from code — water,
// light, leaves, the koi, the Moon Gate — no image is ever loaded.

import { FIELD, LIVES, PALETTE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';

/** Lotus leaves sit in fixed spots so the river reads the same every visit. */
const LEAVES = [
  { x: 96, y: 612, r: 46, a: 0.6 },
  { x: 210, y: 668, r: 34, a: 2.1 },
  { x: 1130, y: 640, r: 52, a: 4.0 },
  { x: 1210, y: 560, r: 30, a: 1.2 },
  { x: 60, y: 300, r: 28, a: 3.4 },
  { x: 1226, y: 250, r: 32, a: 5.1 },
];

const RAYS = [
  { x: 180, w: 90, a: 0.10 },
  { x: 520, w: 60, a: 0.07 },
  { x: 860, w: 110, a: 0.09 },
  { x: 1150, w: 70, a: 0.06 },
];

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0, dpr: 1 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    canvas.width = Math.round(cssW * ratio);
    canvas.height = Math.round(cssH * ratio);
    view.dpr = ratio;
    view.scale = Math.min(cssW / FIELD.width, cssH / FIELD.height);
    view.x = (cssW - FIELD.width * view.scale) / 2;
    view.y = (cssH - FIELD.height * view.scale) / 2;
  }

  /** Map a pointer's client pixels onto the logical river. */
  function toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.x) / view.scale,
      y: (clientY - rect.top - view.y) / view.scale,
    };
  }

  function font(size, bold) {
    const key = size + (bold ? 'b' : '');
    if (!fonts.has(key)) fonts.set(key, `${bold ? '700 ' : ''}${size}px "Trebuchet MS", "Segoe UI", system-ui, sans-serif`);
    return fonts.get(key);
  }

  function text(value, x, y, size, color, align, bold) {
    context.font = font(size, bold);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function roundRect(x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  function drawWater(state) {
    const g = context.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, PALETTE.shallow);
    g.addColorStop(0.45, PALETTE.mid);
    g.addColorStop(1, PALETTE.deep);
    context.fillStyle = g;
    context.fillRect(0, 0, FIELD.width, FIELD.height);

    // Shafts of moonlight drifting slowly across the water.
    for (const ray of RAYS) {
      const sway = Math.sin(state.elapsed * 0.25 + ray.x) * 26;
      const rg = context.createLinearGradient(ray.x + sway, 0, ray.x + sway + ray.w, 0);
      rg.addColorStop(0, 'rgba(245,233,200,0)');
      rg.addColorStop(0.5, `rgba(245,233,200,${ray.a})`);
      rg.addColorStop(1, 'rgba(245,233,200,0)');
      context.fillStyle = rg;
      context.beginPath();
      context.moveTo(ray.x + sway - ray.w / 2, 0);
      context.lineTo(ray.x + sway + ray.w / 2, 0);
      context.lineTo(ray.x + sway + ray.w, FIELD.height);
      context.lineTo(ray.x + sway - ray.w, FIELD.height);
      context.closePath();
      context.fill();
    }

    // Reeds along both banks.
    context.strokeStyle = PALETTE.reed;
    context.lineWidth = 5;
    context.lineCap = 'round';
    for (let i = 0; i < 7; i += 1) {
      const x = 18 + i * 22;
      const sway = Math.sin(state.elapsed * 0.8 + i * 1.7) * 7;
      context.beginPath();
      context.moveTo(x, FIELD.height);
      context.quadraticCurveTo(x + sway, FIELD.height - 70, x + sway * 2, FIELD.height - 120 - (i % 3) * 18);
      context.stroke();
      const xr = FIELD.width - 18 - i * 22;
      context.beginPath();
      context.moveTo(xr, FIELD.height);
      context.quadraticCurveTo(xr - sway, FIELD.height - 70, xr - sway * 2, FIELD.height - 110 - (i % 3) * 20);
      context.stroke();
    }

    // Lotus leaves, gently bobbing.
    for (const leaf of LEAVES) {
      const bob = Math.sin(state.elapsed * 0.9 + leaf.a) * 3;
      context.fillStyle = PALETTE.leaf;
      context.beginPath();
      context.arc(leaf.x, leaf.y + bob, leaf.r, leaf.a, leaf.a + Math.PI * 1.65);
      context.lineTo(leaf.x, leaf.y + bob);
      context.closePath();
      context.fill();
      context.fillStyle = PALETTE.leafDark;
      context.beginPath();
      context.arc(leaf.x - leaf.r * 0.25, leaf.y + bob - leaf.r * 0.2, leaf.r * 0.45, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawGate(state) {
    const cx = FIELD.width / 2;
    // The moon hangs low enough to clear the top HUD row (bar ends ~56, wave/combo at 86):
    // its disc spans 108–196, so no HUD text ever sits on the pale disc.
    const cy = 152;
    const glow = 0.35 + state.gateGlow * 0.65;
    // Moon disc with a halo that brightens as the koi nears it.
    const halo = context.createRadialGradient(cx, cy, 8, cx, cy, 150);
    halo.addColorStop(0, `rgba(255,233,168,${0.55 * glow})`);
    halo.addColorStop(1, 'rgba(255,233,168,0)');
    context.fillStyle = halo;
    context.beginPath();
    context.arc(cx, cy, 150, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.moon;
    context.beginPath();
    context.arc(cx, cy, 44, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(190,170,120,0.5)';
    context.beginPath();
    context.arc(cx - 14, cy - 8, 9, 0, Math.PI * 2);
    context.arc(cx + 12, cy + 12, 6, 0, Math.PI * 2);
    context.fill();
    // The gate arch framing the moon.
    context.strokeStyle = '#d8b25e';
    context.lineWidth = 10;
    context.beginPath();
    context.arc(cx, cy + 26, 78, Math.PI * 1.08, Math.PI * 1.92);
    context.stroke();
    context.lineWidth = 8;
    context.beginPath();
    context.moveTo(cx - 78, cy + 26);
    context.lineTo(cx - 78, cy + 96);
    context.moveTo(cx + 78, cy + 26);
    context.lineTo(cx + 78, cy + 96);
    context.stroke();
  }

  function drawPearls(state) {
    for (const p of state.pearls) {
      if (!p.active) continue;
      const x = p.x + Math.sin(p.phase) * 8;
      const pulse = 1 + Math.sin(p.phase * 1.6) * 0.12;
      const halo = context.createRadialGradient(x, p.y, 2, x, p.y, p.r * 2.6 * pulse);
      halo.addColorStop(0, 'rgba(191,233,255,0.75)');
      halo.addColorStop(1, 'rgba(191,233,255,0)');
      context.fillStyle = halo;
      context.beginPath();
      context.arc(x, p.y, p.r * 2.6 * pulse, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.pearl;
      context.beginPath();
      context.arc(x, p.y, p.r * pulse, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.pearlCore;
      context.beginPath();
      context.arc(x - 3, p.y - 3, p.r * 0.45, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawHooks(state) {
    for (const h of state.hooks) {
      if (!h.active) continue;
      const hx = h.x + Math.sin(h.swayPhase) * h.sway * 0.4;
      // The line, from the surface down to the hook.
      context.strokeStyle = PALETTE.line;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(h.x, 0);
      context.lineTo(hx, h.y);
      context.stroke();
      // The hook itself: a curved barb.
      context.strokeStyle = PALETTE.hook;
      context.lineWidth = 5;
      context.lineCap = 'round';
      context.beginPath();
      context.arc(hx, h.y, 11, Math.PI * 0.15, Math.PI * 1.35);
      context.stroke();
      context.beginPath();
      context.moveTo(hx + 10, h.y + 4);
      context.lineTo(hx + 4, h.y - 6);
      context.stroke();
      context.fillStyle = '#ff8a5c';
      context.beginPath();
      context.arc(hx, h.y - 2, 4, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawHerons(state) {
    for (const h of state.herons) {
      if (!h.active) continue;
      const flap = Math.sin(h.phase * 2) * 0.35;
      context.fillStyle = PALETTE.heron;
      context.globalAlpha = 0.55;
      // Shadow on the water: an ellipse with two slow wings.
      context.beginPath();
      context.ellipse(h.x, h.y, h.r, h.r * 0.42, 0, 0, Math.PI * 2);
      context.fill();
      context.save();
      context.translate(h.x, h.y);
      context.rotate(h.vx > 0 ? 0.15 : -0.15);
      context.beginPath();
      context.ellipse(-h.r * 0.7, -h.r * 0.5 - flap * 20, h.r * 0.55, h.r * 0.16, -0.5 - flap, 0, Math.PI * 2);
      context.ellipse(h.r * 0.7, -h.r * 0.5 - flap * 20, h.r * 0.55, h.r * 0.16, 0.5 + flap, 0, Math.PI * 2);
      context.fill();
      context.restore();
      context.globalAlpha = 1;
    }
  }

  function drawKoi(state) {
    const koi = state.koi;
    // Blink while invulnerable after a hit.
    if (koi.invulnerable > 0 && Math.floor(koi.invulnerable * 10) % 2 === 0) return;
    context.save();
    context.translate(koi.x, koi.y);
    context.rotate(koi.angle);
    // Flowing tail: two bezier ribbons trailing behind the body.
    const wag = Math.sin(koi.tail) * 10;
    const tailGrad = context.createLinearGradient(-58, 0, 0, 0);
    tailGrad.addColorStop(0, 'rgba(255,122,60,0)');
    tailGrad.addColorStop(1, 'rgba(255,122,60,0.9)');
    context.fillStyle = tailGrad;
    context.beginPath();
    context.moveTo(-6, -7);
    context.bezierCurveTo(-30, -22 + wag, -48, -14 + wag, -62, -4 + wag);
    context.bezierCurveTo(-48, 2 + wag, -30, 12 + wag, -6, 8);
    context.closePath();
    context.fill();
    context.fillStyle = 'rgba(255,243,226,0.85)';
    context.beginPath();
    context.moveTo(-4, -4);
    context.bezierCurveTo(-24, -12 + wag * 0.6, -40, -8 + wag * 0.6, -50, -2 + wag * 0.6);
    context.bezierCurveTo(-38, 3 + wag * 0.6, -22, 7 + wag * 0.6, -4, 4);
    context.closePath();
    context.fill();
    // Body: a white-to-orange gradient ellipse.
    const body = context.createLinearGradient(0, -16, 0, 16);
    body.addColorStop(0, PALETTE.koiWhite);
    body.addColorStop(0.55, PALETTE.koiOrange);
    body.addColorStop(1, '#d94f1e');
    context.fillStyle = body;
    context.beginPath();
    context.ellipse(0, 0, 30, 15, 0, 0, Math.PI * 2);
    context.fill();
    // Orange patches and a dorsal fin.
    context.fillStyle = PALETTE.koiRed;
    context.beginPath();
    context.ellipse(-8, -6, 10, 6, 0.4, 0, Math.PI * 2);
    context.ellipse(8, 5, 8, 5, -0.3, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(229,72,77,0.8)';
    context.beginPath();
    context.moveTo(-4, -13);
    context.quadraticCurveTo(2, -24, 10, -13);
    context.closePath();
    context.fill();
    // Eye, looking where the koi swims.
    context.fillStyle = '#1a1a1a';
    context.beginPath();
    context.arc(19, -5, 3.4, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(20, -6, 1.2, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawMiniKoi(x, y, size, filled) {
    context.save();
    context.translate(x, y);
    context.scale(size / 30, size / 30);
    context.fillStyle = filled ? PALETTE.koiOrange : 'rgba(120,140,160,0.35)';
    context.beginPath();
    context.ellipse(0, 0, 16, 8, 0, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(-14, 0);
    context.lineTo(-24, -7);
    context.lineTo(-24, 7);
    context.closePath();
    context.fill();
    context.fillStyle = filled ? '#1a1a1a' : 'rgba(120,140,160,0.5)';
    context.beginPath();
    context.arc(9, -2, 2, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawAmbient(state) {
    // Bubbles rising.
    context.strokeStyle = 'rgba(191,233,255,0.55)';
    context.lineWidth = 1.5;
    for (const b of state.bubbles) {
      if (!b.active) continue;
      context.beginPath();
      context.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      context.stroke();
    }
    // Ripples left behind by caught pearls.
    for (const r of state.ripples) {
      if (!r.active) continue;
      context.strokeStyle = `rgba(191,233,255,${Math.max(0, r.life * 1.2)})`;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      context.stroke();
    }
    // Spark particles from a catch or a hit.
    for (const p of state.particles) {
      if (!p.active) continue;
      context.fillStyle = `rgba(255,209,102,${Math.max(0, p.life / p.max)})`;
      context.beginPath();
      context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawHud(state, best, comboMult) {
    // Score, top left — big enough to read when the shot is shrunk.
    text('SCORE', 28, 52, 20, PALETTE.muted, 'left', true);
    text(String(state.score), 28, 96, 44, PALETTE.text, 'left', true);
    text(`BEST ${Math.max(best, state.score)}`, 28, 126, 18, PALETTE.muted, 'left');

    // Progress to the Moon Gate, centred on top.
    const barW = 430;
    const barX = (FIELD.width - barW) / 2;
    const barY = 30;
    text('MOON GATE', FIELD.width / 2, 22, 18, PALETTE.muted, 'center', true);
    context.fillStyle = 'rgba(6,11,26,0.7)';
    roundRect(barX - 6, barY - 4, barW + 12, 30, 15);
    context.fill();
    context.fillStyle = '#1d3a55';
    roundRect(barX, barY, barW, 22, 11);
    context.fill();
    const fillW = Math.max(22, (barW * state.progress) / 100);
    const fg = context.createLinearGradient(barX, 0, barX + barW, 0);
    fg.addColorStop(0, '#ffd166');
    fg.addColorStop(1, '#f5e9c8');
    context.fillStyle = fg;
    roundRect(barX, barY, fillW, 22, 11);
    context.fill();
    // The percent sits on the fill once progress passes halfway, else on the dark
    // empty bar: pick the ink that reads on whichever half it lands on.
    const pctColor = state.progress >= 50 ? '#20242a' : PALETTE.text;
    text(`${Math.floor(state.progress)}%`, FIELD.width / 2, barY + 17, 15, pctColor, 'center', true);
    // Wave and combo under the bar.
    text(`WAVE ${state.wave}`, FIELD.width / 2 - 90, 86, 20, PALETTE.text, 'center', true);
    if (state.combo >= 2) {
      text(`COMBO x${comboMult}  (${state.combo})`, FIELD.width / 2 + 100, 86, 20, PALETTE.gold, 'center', true);
    }

    // Lives, top right — three little koi.
    text('LIVES', FIELD.width - 28, 52, 20, PALETTE.muted, 'right', true);
    for (let i = 0; i < LIVES; i += 1) {
      drawMiniKoi(FIELD.width - 44 - i * 52, 78, 30, i < state.lives);
    }
  }

  function drawPanel(title, lines, prompt) {
    const width = 640;
    const lineH = 34;
    const height = 150 + lines.length * lineH + 84;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(6,14,28,0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    roundRect(x, y, width, height, 18);
    context.fill();
    context.strokeStyle = '#d8b25e';
    context.lineWidth = 2;
    roundRect(x, y, width, height, 18);
    context.stroke();
    // Shrink a long title so it stays inside the panel with room to spare.
    let titleSize = 46;
    context.font = font(titleSize, true);
    const titleWidth = context.measureText(title).width;
    if (titleWidth > width - 48) titleSize = Math.max(24, Math.floor((titleSize * (width - 48)) / titleWidth));
    text(title, FIELD.width / 2, y + 72, titleSize, PALETTE.moon, 'center', true);
    lines.forEach((line, i) => {
      text(line, FIELD.width / 2, y + 132 + i * lineH, 22, line.startsWith('★') ? PALETTE.gold : PALETTE.text, 'center');
    });
    text(prompt, FIELD.width / 2, y + height - 36, 24, PALETTE.gold, 'center', true);
  }

  function drawRiver(state) {
    drawWater(state);
    drawGate(state);
    drawPearls(state);
    drawHooks(state);
    drawHerons(state);
    drawAmbient(state);
    drawKoi(state);
  }

  /** Paint one frame: the river, then the HUD or a panel for the screen. */
  function draw(state, screen, best, comboMult) {
    context.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, window.innerWidth, window.innerHeight);
    const shakeX = state.shake > 0 ? Math.sin(state.elapsed * 91) * state.shake * 14 : 0;
    const shakeY = state.shake > 0 ? Math.cos(state.elapsed * 83) * state.shake * 10 : 0;
    context.setTransform(
      view.dpr * view.scale, 0, 0, view.dpr * view.scale,
      view.dpr * (view.x + shakeX * view.scale),
      view.dpr * (view.y + shakeY * view.scale),
    );
    drawRiver(state);
    if (screen === SCREEN_TITLE) {
      drawPanel('KOI CURRENT', [
        'Swim upstream to the Moon Gate.',
        'Catch glowing pearls: +10 points each,',
        'chain them for a combo up to x5.',
        'Dodge the hooks and the heron shadows —',
        'three hits and the river takes you.',
        '',
        `BEST SCORE  ${Math.max(best, 0)}`,
      ], 'Press SPACE or click to start');
      return;
    }
    drawHud(state, best, comboMult);
    if (screen === SCREEN_PLAY && state.elapsed < 6) {
      text('Follow the pearls upstream — WASD / arrows or move the mouse', FIELD.width / 2, FIELD.height - 40, 20, PALETTE.muted, 'center');
    }
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The river waits for you.', 'M toggles sound.'], 'Press P or SPACE to resume');
    } else if (screen === SCREEN_WIN) {
      drawPanel('You reached the Moon Gate!', [
        `★  SCORE  ${state.score}  ★`,
        `BEST  ${Math.max(best, state.score)}`,
        `Pearls caught: ${state.pearlsCaught}   Best combo: ${state.bestCombo}`,
        'The koi swims on beneath the full moon.',
      ], 'Press SPACE or click to swim again');
    } else if (screen === SCREEN_OVER) {
      drawPanel('The river took you…', [
        `SCORE  ${state.score}`,
        `BEST  ${Math.max(best, state.score)}`,
        `Pearls caught: ${state.pearlsCaught}   Best combo: ${state.bestCombo}`,
        `You reached ${Math.floor(state.progress)}% of the way to the Moon Gate.`,
      ], 'Press SPACE or click to try again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toField };
}
