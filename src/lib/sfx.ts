// Tiny WebAudio chiptune SFX — no assets.
let ctx: AudioContext | null = null;
let muted = (() => { try { return localStorage.getItem('sxc-muted') === '1'; } catch { return false; } })();

function tone(freq: number, dur: number, type: OscillatorType = 'square', when = 0, vol = 0.05) {
  if (muted) return;
  try {
    ctx = ctx || new (window.AudioContext || (window as any).webkitAudioContext)();
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur);
  } catch { /* audio unavailable */ }
}

export const sfx = {
  isMuted: () => muted,
  toggle() { muted = !muted; try { localStorage.setItem('sxc-muted', muted ? '1' : '0'); } catch {} return muted; },
  click: () => tone(660, 0.06),
  select: () => { tone(523, 0.07); tone(784, 0.09, 'square', 0.07); },
  think: () => tone(330, 0.05, 'triangle', 0, 0.03),
  reveal: () => { tone(392, 0.08); tone(523, 0.08, 'square', 0.08); tone(659, 0.14, 'square', 0.16); },
  cash: () => { tone(988, 0.07, 'square'); tone(1319, 0.18, 'square', 0.07); },
  lose: () => { tone(330, 0.12, 'sawtooth', 0, 0.04); tone(247, 0.2, 'sawtooth', 0.12, 0.04); },
  /** Cash-register "cha-ching": drawer clunk + two bright coin bells. */
  chaChing: (when = 0, vol = 0.05) => {
    tone(140, 0.05, 'square', when, vol * 0.8);
    tone(1568, 0.07, 'square', when + 0.05, vol);
    tone(2093, 0.26, 'triangle', when + 0.11, vol * 1.3);
    tone(2637, 0.2, 'triangle', when + 0.15, vol * 0.6);
  },
  /** Short low "loss" buzz. */
  loss: (when = 0, vol = 0.045) => {
    tone(196, 0.1, 'sawtooth', when, vol);
    tone(131, 0.24, 'sawtooth', when + 0.1, vol);
  },
  fanfare: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'square', i * 0.12)),
};
