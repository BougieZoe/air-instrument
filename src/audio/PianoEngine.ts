import type { IPianoEngine } from "./types";

// ─── Note → frequency ───────────────────────────────────────────────────────
const NOTE_BASE: Record<string, number> = {
  C: -9, "C#": -8, D: -7, "D#": -6, E: -5, F: -4,
  "F#": -3, G: -2, "G#": -1, A: 0, "A#": 1, B: 2,
};

export const noteToFrequency = (note: string) => {
  const match = note.match(/^([A-G]#?)(\d)$/);
  if (!match) return 440;
  const [, name, octaveText] = match;
  const octave = Number(octaveText);
  const semitone = NOTE_BASE[name] + (octave - 4) * 12;
  return 440 * Math.pow(2, semitone / 12);
};

// ─── Harmonic content per partial (amplitude relative to fundamental) ───────
// Tuned to approximate a Yamaha CFX concert grand
const HARMONICS = [
  { ratio: 1,   amp: 1.00 },   // fundamental
  { ratio: 2,   amp: 0.52 },   // octave
  { ratio: 3,   amp: 0.28 },   // 12th
  { ratio: 4,   amp: 0.14 },   // 2 octaves
  { ratio: 5,   amp: 0.08 },   // major 3rd above 2 oct
  { ratio: 6,   amp: 0.05 },   // 5th above 2 oct
  { ratio: 7,   amp: 0.03 },   // harmonic 7th
  { ratio: 8,   amp: 0.02 },   // 3 octaves
];

// ─── ADSR-ish envelope parameters scaled by velocity ───────────────────────
const envForVelocity = (v: number) => ({
  attack:   0.003 + v * 0.004,            // 3–7 ms strike transient
  decay:    0.18 + (1 - v) * 0.12,        // softer = longer decay
  sustain:  0.18 + v * 0.14,              // louder = more sustain
  release:  0.35 + (1 - v) * 0.25,        // softer = faster release
  peak:     0.22 * v,                     // peak gain
});

// ─── Per-voice node graph ───────────────────────────────────────────────────
type Voice = {
  oscs: OscillatorNode[];
  oscGains: GainNode[];
  bodyGain: GainNode;
  filter: BiquadFilterNode;
  sat: WaveShaperNode;
  env: GainNode;
  releaseTimeout: ReturnType<typeof setTimeout> | null;
};

function saturationCurve(k = 40): Float32Array {
  const n = 256;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

export class PianoEngine implements IPianoEngine {
  private voices = new Map<string, Voice>();
  private satCurve: Float32Array;

  constructor(
    private readonly context: AudioContext,
    private readonly output: GainNode,
  ) {
    this.satCurve = saturationCurve(28);
  }

  noteOn(note: string, velocity = 0.72, voiceId = note) {
    this.noteOff(voiceId);
    const now = this.context.currentTime;
    const freq = noteToFrequency(note);
    const octaves = Math.log2(freq / 27.5);     // distance from A0
    const env = envForVelocity(velocity);

    // Brightness scales with velocity + register (higher = brighter)
    const brightness = 0.3 + velocity * 0.5 + octaves * 0.06;

    // ── Build partials ──
    const oscs: OscillatorNode[] = [];
    const oscGains: GainNode[] = [];

    for (const h of HARMONICS) {
      const osc = this.context.createOscillator();
      osc.type = "sine";
      // Slight inharmonicity (stiff string model): partials stretch outward
      const inharmonicity = 1 + 0.0004 * h.ratio * h.ratio * (freq / 440);
      osc.frequency.value = freq * h.ratio * inharmonicity;

      // Velocity + register dampens or excites harmonics
      const hAmp = h.amp * (h.ratio <= 2 ? 1 : brightness) * velocity;

      const oscGain = this.context.createGain();
      oscGain.gain.value = hAmp;

      osc.connect(oscGain);
      oscs.push(osc);
      oscGains.push(oscGain);
    }

    // ── Body resonance (bandpass around fundamental) ──
    const bodyGain = this.context.createGain();
    bodyGain.gain.value = 1;
    for (const og of oscGains) og.connect(bodyGain);

    // ── Low-pass filter (velocity → brightness) ──
    const filter = this.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1800 + brightness * 3200;
    filter.Q.value = 0.7 - octaves * 0.04;
    bodyGain.connect(filter);

    // ── Soft saturation (warmth) ──
    const sat = this.context.createWaveShaper();
    sat.curve = this.satCurve as Float32Array<ArrayBuffer>;
    sat.oversample = "2x";
    filter.connect(sat);

    // ── ADSR envelope ──
    const envGain = this.context.createGain();
    envGain.gain.setValueAtTime(0.0001, now);
    envGain.gain.linearRampToValueAtTime(env.peak, now + env.attack);
    envGain.gain.exponentialRampToValueAtTime(env.sustain * env.peak + 0.001, now + env.attack + env.decay);
    sat.connect(envGain);
    envGain.connect(this.output);

    // ── Start all oscillators ──
    for (const osc of oscs) osc.start(now);

    this.voices.set(voiceId, {
      oscs, oscGains, bodyGain, filter, sat, env: envGain,
      releaseTimeout: null,
    });
  }

  noteOff(voiceId: string) {
    const voice = this.voices.get(voiceId);
    if (!voice) return;
    const now = this.context.currentTime;

    // Cancel attack/decay schedules
    voice.env.gain.cancelScheduledValues(now);
    voice.env.gain.setValueAtTime(voice.env.gain.value, now);

    // Release curve
    voice.env.gain.setTargetAtTime(0.0001, now, 0.18);

    // Stop oscillators after release tail
    const stopAt = now + 1.2;
    for (const osc of voice.oscs) {
      try { osc.stop(stopAt); } catch { /* already ended */ }
    }

    if (voice.releaseTimeout) clearTimeout(voice.releaseTimeout);
    this.voices.delete(voiceId);
  }

  releaseAll() {
    for (const id of Array.from(this.voices.keys())) this.noteOff(id);
  }
}
