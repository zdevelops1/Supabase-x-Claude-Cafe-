/**
 * Classical background music — J.S. Bach, Prelude in C major, BWV 846 (1722, public domain).
 * Performed live in the browser by a soft synthesized piano (WebAudio), so there is no
 * recording or audio file to license. Loops seamlessly; starts only after a user gesture.
 */

// Each bar of the prelude is one 5-note chord broken as: n1 n2 n3 n4 n5 n3 n4 n5, played twice.
// MIDI note numbers (60 = middle C).
const BARS: number[][] = [
  [60, 64, 67, 72, 76], [60, 62, 69, 74, 77], [59, 62, 67, 74, 77], [60, 64, 67, 72, 76],
  [60, 64, 69, 76, 81], [60, 62, 66, 69, 74], [59, 62, 67, 74, 79], [59, 60, 64, 67, 72],
  [57, 60, 64, 67, 72], [50, 57, 62, 66, 72], [55, 59, 62, 67, 71], [55, 58, 64, 67, 73],
  [53, 57, 62, 69, 74], [53, 56, 62, 65, 71], [52, 55, 60, 67, 72], [52, 53, 57, 60, 65],
  [50, 53, 57, 60, 65], [43, 50, 55, 59, 65], [48, 52, 55, 60, 64], [48, 55, 58, 60, 64],
  [41, 53, 57, 60, 64], [42, 48, 57, 60, 63], [44, 53, 59, 60, 62], [43, 53, 55, 59, 62],
  [43, 52, 55, 60, 64], [43, 50, 55, 60, 65], [43, 50, 55, 59, 65], [43, 51, 57, 60, 66],
  [43, 52, 55, 60, 67], [43, 50, 55, 60, 65], [43, 50, 55, 59, 65], [36, 48, 55, 58, 64],
  [36, 48, 53, 57, 60], [36, 47, 55, 62, 65],
];
const FINAL = [36, 48, 52, 55, 60, 64]; // closing C-major chord

const STEP = 0.2; // seconds per sixteenth (~75 bpm) — calm café tempo
const VOLUME = 0.05;
const KEY = 'sxc-music';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer: number | null = null;
let nextTime = 0;
let pos = 0; // sixteenth index within the piece
let playing = false;
const listeners = new Set<(on: boolean) => void>();

const freq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function setupGraph() {
  if (ctx) return;
  ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0;
  // soft room reverb: generated impulse response (decaying noise)
  const len = Math.floor(ctx.sampleRate * 2.4);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  const verb = ctx.createConvolver();
  verb.buffer = ir;
  const wet = ctx.createGain();
  wet.gain.value = 0.35;
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 2600;
  master.connect(tone);
  tone.connect(ctx.destination);
  tone.connect(verb);
  verb.connect(wet);
  wet.connect(ctx.destination);
}

/** One soft piano note: sine + quiet triangle partial, fast attack, long exponential decay. */
function note(m: number, t: number, len: number, vel: number) {
  if (!ctx || !master) return;
  const f = freq(m);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vel, t + 0.012);
  g.gain.exponentialRampToValueAtTime(vel * 0.45, t + 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  g.connect(master);
  const o1 = ctx.createOscillator();
  o1.type = 'sine';
  o1.frequency.value = f;
  const o2 = ctx.createOscillator();
  o2.type = 'triangle';
  o2.frequency.value = f * 2;
  o2.detune.value = 3;
  const g2 = ctx.createGain();
  g2.gain.value = 0.18;
  o1.connect(g);
  o2.connect(g2).connect(g);
  o1.start(t);
  o2.start(t);
  o1.stop(t + len + 0.05);
  o2.stop(t + len + 0.05);
}

const TOTAL = BARS.length * 16 + 32; // + final chord and a breath before looping

function schedule() {
  if (!ctx) return;
  while (nextTime < ctx.currentTime + 0.4) {
    const bar = Math.floor(pos / 16);
    const k = pos % 16;
    if (bar < BARS.length) {
      const c = BARS[bar];
      const pattern = [0, 1, 2, 3, 4, 2, 3, 4];
      const idx = pattern[k % 8];
      // bass (n1) and n2 ring for the half bar, the rest are short broken-chord notes
      const len = idx === 0 ? STEP * 8 : idx === 1 ? STEP * 7 : STEP * 3.2;
      const vel = idx === 0 ? 0.55 : idx === 1 ? 0.4 : 0.32 + (k % 8 === 2 ? 0.05 : 0);
      note(c[idx], nextTime, len, vel);
    } else if (pos === BARS.length * 16) {
      FINAL.forEach((m, i) => note(m, nextTime + i * 0.06, STEP * 20, 0.38));
    }
    nextTime += STEP;
    pos = (pos + 1) % TOTAL;
  }
}

function emit() {
  listeners.forEach((l) => l(playing));
}

export const music = {
  /** Saved preference (default on — but sound only begins after the first user gesture). */
  wanted(): boolean {
    try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; }
  },
  isPlaying: () => playing,
  subscribe(fn: (on: boolean) => void) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
  async start() {
    try {
      setupGraph();
      if (!ctx || !master) return;
      if (ctx.state === 'suspended') await ctx.resume();
      if (playing) return;
      playing = true;
      nextTime = ctx.currentTime + 0.1;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(VOLUME, ctx.currentTime + 2.5); // gentle fade-in
      timer = window.setInterval(schedule, 100);
      schedule();
      emit();
    } catch {
      /* audio unavailable */
    }
  },
  stop() {
    if (!ctx || !master) return;
    playing = false;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
    if (timer) window.clearInterval(timer);
    timer = null;
    emit();
  },
  toggle() {
    if (playing) {
      this.stop();
      try { localStorage.setItem(KEY, 'off'); } catch { /* ignore */ }
    } else {
      try { localStorage.setItem(KEY, 'on'); } catch { /* ignore */ }
      this.start();
    }
    return playing;
  },
  /** Browsers block autoplay: begin on the first click/tap/key if the player wants music. */
  armAutostart() {
    const go = () => {
      window.removeEventListener('pointerdown', go);
      window.removeEventListener('keydown', go);
      if (music.wanted()) music.start();
    };
    window.addEventListener('pointerdown', go, { once: false });
    window.addEventListener('keydown', go, { once: false });
  },
};
