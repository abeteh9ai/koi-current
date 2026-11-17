// Synthesised sound: no audio files, no network. A tiny WebAudio synth
// plays a pentatonic pluck when a pearl is caught (higher with the combo),
// a low thud when the koi is hit, and a rising arpeggio on the win.
// The context is created lazily on the first user gesture, and every call
// is a no-op until then, so the title screen stays silent.

const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];

export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, at, dur, type, gain) {
    if (!context || muted) return;
    const osc = context.createOscillator();
    const amp = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.exponentialRampToValueAtTime(gain, at + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(amp).connect(context.destination);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  function unlock() {
    const ctx = ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  return {
    unlock,
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    /** A bright pluck; the step climbs the pentatonic scale with the combo. */
    pearl(combo) {
      const ctx = ensure();
      if (!ctx || muted) return;
      unlock();
      const step = Math.min(combo, PENTATONIC.length - 1);
      const now = ctx.currentTime;
      tone(PENTATONIC[step], now, 0.35, 'triangle', 0.22);
      tone(PENTATONIC[step] * 2, now, 0.18, 'sine', 0.08);
    },
    /** A low drop: the koi got hooked or the heron caught it. */
    hit() {
      const ctx = ensure();
      if (!ctx || muted) return;
      unlock();
      const now = ctx.currentTime;
      const osc = context.createOscillator();
      const amp = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.28);
      amp.gain.setValueAtTime(0.3, now);
      amp.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      osc.connect(amp).connect(context.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    },
    /** A rising arpeggio under the full moon. */
    win() {
      const ctx = ensure();
      if (!ctx || muted) return;
      unlock();
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
      notes.forEach((freq, i) => tone(freq, now + i * 0.11, 0.6, 'triangle', 0.2));
    },
    /** A soft click for starting and resuming. */
    click() {
      const ctx = ensure();
      if (!ctx || muted) return;
      unlock();
      tone(880, ctx.currentTime, 0.09, 'sine', 0.12);
    },
  };
}
