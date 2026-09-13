/**
 * scripts/generateSamples.mjs
 *
 * Genre-authentic drum synthesis. Each pack uses completely different
 * synthesis techniques to match real music production characteristics.
 *
 * TRAP  → 808-dominant, rapid metallic hats, sharp layered snares
 * BOOM BAP → sample-based warmth, round kicks, vinyl saturation, swing
 * DRILL → aggressive 808 slides, dark atmosphere, metallic textures
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SR = 44100;
const clamp = (v) => Math.max(-1, Math.min(1, v));
const env = (t, dur, atk = 0.005, dec = 0.18) => {
  if (t < atk) return t / atk;
  if (t > dur) return 0;
  return Math.exp(-((t - atk) / Math.max(0.001, dec))) * (1 - t / dur);
};
const noise = () => Math.random() * 2 - 1;

// ─── DSP ────────────────────────────────────────────────────────────────────
function lowpass(d, f, Q = 0.7) {
  const w = 2 * Math.PI * f / SR, a = Math.sin(w) / (2 * Q);
  const b0 = (1 - Math.cos(w)) / 2, b1 = 1 - Math.cos(w), b2 = b0;
  const a0 = 1 + a, a1 = -2 * Math.cos(w), a2 = 1 - a;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < d.length; i++) {
    const y = (b0 * d[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = d[i]; y2 = y1; y1 = y; d[i] = y;
  }
  return d;
}
function highpass(d, f, Q = 0.7) {
  const lp = new Float32Array(d); lowpass(lp, f, Q);
  for (let i = 0; i < d.length; i++) d[i] -= lp[i];
  return d;
}
function bandpass(d, lo, hi) { lowpass(d, hi); highpass(d, lo); return d; }
function saturate(d, drive = 3) { for (let i = 0; i < d.length; i++) d[i] = Math.tanh(d[i] * drive) / Math.tanh(drive); return d; }
function eq(d, f, db, Q = 1) {
  const A = Math.pow(10, db / 40), w = 2 * Math.PI * f / SR, a = Math.sin(w) / (2 * Q);
  const b0 = 1 + a * A, b1 = -2 * Math.cos(w), b2 = 1 - a * A;
  const a0 = 1 + a / A, a1 = -2 * Math.cos(w), a2 = 1 - a / A;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < d.length; i++) {
    const y = (b0 * d[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = d[i]; y2 = y1; y1 = y; d[i] = y;
  }
  return d;
}
function compress(d, thr = -12, ratio = 4) {
  const tl = Math.pow(10, thr / 20); let e = 0;
  for (let i = 0; i < d.length; i++) {
    const a = Math.abs(d[i]); e += (a - e) * (a > e ? 0.003 : 0.01);
    const o = (e - tl) / tl;
    d[i] *= o > 0 ? 1 + (1 / ratio - 1) * Math.min(1, o) : 1;
  }
  return d;
}
function render(dur, fn) {
  const len = Math.floor(dur * SR), d = new Float32Array(len);
  for (let i = 0; i < len; i++) d[i] = clamp(fn(i / SR, i, len));
  return d;
}

// ─── ANALOG MODELING DSP ─────────────────────────────────────────────────────
// Models real hardware characteristics: tube saturation, tape compression,
// circuit noise, AD/DA quantization, and S/N ratio.

/** Tube/valve saturation — asymmetric warm harmonic distortion */
function tubeSat(d, drive = 1.5) {
  for (let i = 0; i < d.length; i++) {
    const x = d[i] * drive;
    // Asymmetric soft clip: positive side saturates harder (like real tubes)
    const pos = Math.tanh(x * 1.1);
    const neg = Math.tanh(x * 0.9);
    d[i] = x > 0 ? pos : neg;
  }
  return d;
}

/** Tape compression — soft knee with auto-makeup gain */
function tapeCompress(d, threshold = 0.6, ratio = 3, attack = 0.003, release = 0.08) {
  const atkCoeff = 1 - Math.exp(-1 / (attack * SR));
  const relCoeff = 1 - Math.exp(-1 / (release * SR));
  let env = 0;
  for (let i = 0; i < d.length; i++) {
    const abs = Math.abs(d[i]);
    const coeff = abs > env ? atkCoeff : relCoeff;
    env += (abs - env) * coeff;
    if (env > threshold) {
      const over = (env - threshold) / threshold;
      const gainReduction = 1 - over * (1 - 1 / ratio) * 0.5;
      d[i] *= Math.max(0.4, gainReduction);
    }
  }
  return d;
}

/** Analog circuit noise — brownian noise (low-frequency dominant, like real circuits) */
function circuitNoise(d, amount = 0.008) {
  let brown = 0;
  for (let i = 0; i < d.length; i++) {
    brown += (Math.random() * 2 - 1) * 0.02;
    brown *= 0.998; // Brownian drift
    d[i] += brown * amount;
  }
  return d;
}

/** AD/DA quantization — simulate 12-bit or 16-bit conversion */
function quantize(d, bits = 12) {
  const levels = 2 ** bits;
  const step = 1 / (levels / 2);
  for (let i = 0; i < d.length; i++) {
    d[i] = Math.round(d[i] / step) * step;
  }
  return d;
}

/** Sample rate reduction — simulate low sample rate AD converters */
function sampleRateReduce(d, targetSR = 22050) {
  const ratio = Math.round(SR / targetSR);
  if (ratio <= 1) return d;
  for (let i = 0; i < d.length; i += ratio) {
    const val = d[i];
    for (let j = 1; j < ratio && i + j < d.length; j++) {
      d[i + j] = val; // zero-order hold
    }
  }
  return d;
}

/** Tape hiss — high-frequency noise floor */
function tapeHiss(d, amount = 0.005) {
  for (let i = 0; i < d.length; i++) {
    d[i] += (Math.random() * 2 - 1) * amount;
  }
  return d;
}

/** Wow & flutter — pitch modulation from tape transport instability */
function wowFlutter(d, depth = 0.003, rate = 0.5) {
  const out = new Float32Array(d.length);
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    const mod = Math.sin(2 * Math.PI * rate * t) * depth
              + Math.sin(2 * Math.PI * rate * 3.17 * t) * depth * 0.3
              + Math.sin(2 * Math.PI * rate * 7.13 * t) * depth * 0.1;
    const srcIdx = i * (1 + mod);
    const idx = Math.floor(srcIdx);
    const frac = srcIdx - idx;
    if (idx + 1 < d.length) out[i] = d[idx] * (1 - frac) + d[idx + 1] * frac;
    else if (idx < d.length) out[i] = d[idx];
  }
  return out;
}

/** S/N ratio — add noise floor proportional to signal level */
function signalToNoise(d, snrDB = 60) {
  const noiseFloor = Math.pow(10, -snrDB / 20);
  for (let i = 0; i < d.length; i++) {
    d[i] += (Math.random() * 2 - 1) * noiseFloor * 0.3;
  }
  return d;
}

/** Velocity-dependent filtering — soft hits are darker, like real instruments */
function velocityFilter(d, velocity = 0.8) {
  const cutoff = 2000 + velocity * 8000; // 2-10 kHz based on velocity
  lowpass(d, cutoff);
  return d;
}

/** Global analog modeling chain — applies all hardware emulation */
function analogize(d, profile = "warm") {
  const profiles = {
    warm:   { tube: 1.8, tape: 0.7, noise: 0.010, bits: 14, srr: 32000, hiss: 0.006, wf: 0.002, snr: 58 },
    hot:    { tube: 2.5, tape: 0.8, noise: 0.012, bits: 12, srr: 24000, hiss: 0.008, wf: 0.003, snr: 54 },
    clean:  { tube: 1.2, tape: 0.5, noise: 0.006, bits: 16, srr: 40000, hiss: 0.003, wf: 0.001, snr: 64 },
    dirty:  { tube: 3.0, tape: 0.9, noise: 0.015, bits: 10, srr: 18000, hiss: 0.010, wf: 0.004, snr: 50 },
    vintage:{ tube: 2.0, tape: 0.75,noise: 0.012, bits: 12, srr: 22050, hiss: 0.008, wf: 0.005, snr: 52 },
  };
  const p = profiles[profile] ?? profiles.warm;

  tubeSat(d, p.tube);
  tapeCompress(d, 0.6, p.tape * 4);
  circuitNoise(d, p.noise);
  quantize(d, p.bits);
  sampleRateReduce(d, p.srr);
  tapeHiss(d, p.hiss);
  const out = wowFlutter(d, p.wf);
  signalToNoise(out, p.snr);
  return out;
}
function wav(samples) {
  const len = Math.min(samples.length, SR * 4);
  const b = Buffer.alloc(44 + len * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + len * 2, 4); b.write("WAVE", 8);
  b.write("fmt ", 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36); b.writeUInt32LE(len * 2, 40);
  for (let i = 0; i < len; i++) b.writeInt16LE(Math.round(clamp(samples[i]) * 32767), 44 + i * 2);
  return b;
}
const ANALOG_PROFILES = {
  "trap-pro":  "hot",
  "boom-bap":  "vintage",
  "drill":     "dirty",
  "lofi":      "vintage",
  "reggaeton": "clean",
  "house":     "clean",
  "glitch":    "dirty",
  "8bit":      "clean",
  "beatbox":   "warm",
  "funk":      "warm",
};
let _currentPack = "warm";

function save(dir, name, data) {
  const out = analogize(new Float32Array(data), _currentPack in ANALOG_PROFILES ? ANALOG_PROFILES[_currentPack] : "warm");
  writeFileSync(join(dir, `${name}.wav`), wav(out));
  process.stdout.write(`  ${name} `);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRAP PRO — 808-driven, sharp transients, rapid hats
// ═══════════════════════════════════════════════════════════════════════════════
function trap(dir) {
  let d;
  // KICK: very short punchy transient (the 808 handles the body)
  d = render(0.12, (t) => {
    const f = 150 * Math.exp(-t * 40);
    return Math.sin(2 * Math.PI * f * t) * env(t, 0.12, 0.001, 0.03) * 0.9;
  });
  saturate(d, 2); save(dir, "kick1", d);

  // KICK2: slightly longer with more click
  d = render(0.18, (t) => {
    const click = t < 0.004 ? noise() * (1 - t / 0.004) * 0.6 : 0;
    const f = 120 * Math.exp(-t * 30);
    return (Math.sin(2 * Math.PI * f * t) * env(t, 0.18, 0.001, 0.04) + click) * 0.85;
  });
  save(dir, "kick2", d);

  // SNARE1: classic trap snare — tight body + bright snap + noise tail
  d = render(0.22, (t) => {
    const body = Math.sin(2 * Math.PI * 210 * t) * Math.exp(-t * 25) * 0.5;
    const snap = Math.sin(2 * Math.PI * 4200 * t) * Math.exp(-t * 90) * 0.4;
    const rattle = noise() * env(t, 0.22, 0.001, 0.04) * 0.55;
    return body + snap + rattle;
  });
  highpass(d, 200); saturate(d, 1.8); save(dir, "snare1", d);

  // SNARE2: layered, fatter
  d = render(0.28, (t) => {
    const body = Math.sin(2 * Math.PI * 185 * t) * Math.exp(-t * 20) * 0.45;
    const body2 = Math.sin(2 * Math.PI * 370 * t) * Math.exp(-t * 30) * 0.25;
    const snap = Math.sin(2 * Math.PI * 5500 * t) * Math.exp(-t * 110) * 0.3;
    const rattle = noise() * env(t, 0.28, 0.001, 0.05) * 0.6;
    return body + body2 + snap + rattle;
  });
  highpass(d, 180); saturate(d, 2); save(dir, "snare2", d);

  // CLAP: multi-transient noise burst (classic TR-808 style)
  d = render(0.25, (t) => {
    let v = 0;
    for (const h of [0, 0.01, 0.02, 0.032]) if (t > h) v += noise() * Math.exp(-((t - h) * 50)) * 0.4;
    return v;
  });
  bandpass(d, 800, 5000); saturate(d, 2); save(dir, "clap", d);

  // RIM: sharp metallic click
  d = render(0.1, (t) => (Math.sin(2 * Math.PI * 1100 * t) + Math.sin(2 * Math.PI * 2200 * t) * 0.4) * env(t, 0.1, 0.0003, 0.02));
  save(dir, "rim", d);

  // HAT-C1: tight metallic (trap signature = very short, very bright)
  d = render(0.04, (t) => (noise() * 0.65 + Math.sin(2 * Math.PI * 9500 * t) * 0.18 + Math.sin(2 * Math.PI * 13000 * t) * 0.1) * env(t, 0.04, 0.0002, 0.008));
  highpass(d, 6000); save(dir, "hat-c1", d);

  // HAT-C2: even tighter, different timbre
  d = render(0.035, (t) => (noise() * 0.6 + Math.sin(2 * Math.PI * 11000 * t) * 0.15) * env(t, 0.035, 0.0002, 0.007));
  highpass(d, 7000); save(dir, "hat-c2", d);

  // HAT-O1: longer, bright
  d = render(0.4, (t) => (noise() * 0.45 + Math.sin(2 * Math.PI * 8000 * t) * 0.2 + Math.sin(2 * Math.PI / 2 * (6000 + t * 3000) * t) * 0.1) * env(t, 0.4, 0.001, 0.16));
  highpass(d, 5000); save(dir, "hat-o1", d);

  // HAT-O2: brighter, more sizzle
  d = render(0.5, (t) => (noise() * 0.5 + Math.sin(2 * Math.PI * 9500 * t) * 0.18) * env(t, 0.5, 0.001, 0.2));
  highpass(d, 5500); save(dir, "hat-o2", d);

  // TOM: pitch-dropped sine (trap toms are synthetic)
  d = render(0.3, (t) => { const f = 250 * Math.exp(-t * 10); return Math.sin(2 * Math.PI * f * t) * env(t, 0.3, 0.002, 0.08) * 0.65; });
  save(dir, "tom-lo", d);
  d = render(0.25, (t) => { const f = 350 * Math.exp(-t * 12); return Math.sin(2 * Math.PI * f * t) * env(t, 0.25, 0.002, 0.065) * 0.6; });
  save(dir, "tom-mid", d);
  d = render(0.2, (t) => { const f = 500 * Math.exp(-t * 14); return Math.sin(2 * Math.PI * f * t) * env(t, 0.2, 0.002, 0.05) * 0.55; });
  save(dir, "tom-hi", d);

  // CRASH: noise splash
  d = render(1.2, (t) => noise() * env(t, 1.2, 0.001, 0.45) * 0.45);
  highpass(d, 3000); save(dir, "crash", d);

  // RIDE: metallic ping
  d = render(0.5, (t) => (Math.sin(2 * Math.PI * 3500 * t) * 0.3 + Math.sin(2 * Math.PI * 5500 * t) * 0.18 + noise() * 0.1) * env(t, 0.5, 0.001, 0.18));
  highpass(d, 2500); save(dir, "ride", d);

  // TAMBO: jingle
  d = render(0.2, (t) => (noise() * 0.5 + Math.sin(2 * Math.PI * 4800 * t) * 0.25) * env(t, 0.2, 0.001, 0.05));
  highpass(d, 3000); save(dir, "tambo", d);

  // 808: THE defining trap sound — long sub with pitch envelope
  d = render(3.0, (t) => {
    // Pitch drops from ~150Hz to 45Hz in first 200ms, then holds
    const pitchEnv = t < 0.2 ? 150 - (150 - 45) * (t / 0.2) : 45;
    const sub = Math.sin(2 * Math.PI * pitchEnv * t);
    // Add harmonics via saturation simulation
    const harmonics = Math.sin(2 * Math.PI * pitchEnv * 2 * t) * 0.15 + Math.sin(2 * Math.PI * pitchEnv * 3 * t) * 0.06;
    return (sub + harmonics) * env(t, 3.0, 0.005, 1.2) * 0.88;
  });
  saturate(d, 3.5); compress(d, -10, 3); save(dir, "808", d);

  // SUB: clean sub bass
  d = render(1.2, (t) => Math.sin(2 * Math.PI * 45 * t) * env(t, 1.2, 0.02, 0.5) * 0.85);
  save(dir, "sub", d);

  // BASS: mid-bass pluck
  d = render(0.4, (t) => Math.sin(2 * Math.PI * 75 * t) * env(t, 0.4, 0.003, 0.1) * 0.8);
  saturate(d, 2); save(dir, "bass", d);

  // CHORD: trap synth chord stab
  d = render(0.3, (t) => {
    const f = 220;
    return (Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * f * 1.26 * t) * 0.5 + Math.sin(2 * Math.PI * f * 1.5 * t) * 0.3) * env(t, 0.3, 0.003, 0.08) * 0.45;
  });
  saturate(d, 1.5); save(dir, "chord", d);

  // PAD: atmospheric trap pad
  d = render(1.5, (t) => (Math.sin(2 * Math.PI * 220 * t) * 0.25 + Math.sin(2 * Math.PI * 330 * t) * 0.18 + Math.sin(2 * Math.PI * 440 * t) * 0.1 + noise() * 0.04) * env(t, 1.5, 0.06, 0.6) * 0.35);
  save(dir, "pad", d);

  // BELL: trap bell
  d = render(0.8, (t) => (Math.sin(2 * Math.PI * 880 * t) * 0.4 + Math.sin(2 * Math.PI * 1760 * t) * 0.2 + Math.sin(2 * Math.PI * 2640 * t) * 0.08) * env(t, 0.8, 0.001, 0.3) * 0.5);
  save(dir, "bell", d);

  // KEYS: bright synth keys
  d = render(0.4, (t) => (Math.sin(2 * Math.PI * 330 * t) * 0.35 + Math.sin(2 * Math.PI * 660 * t) * 0.18 + Math.sin(2 * Math.PI * 990 * t) * 0.08) * env(t, 0.4, 0.003, 0.12) * 0.45);
  saturate(d, 1.5); save(dir, "keys", d);

  // ORGAN: trap organ stab
  d = render(0.5, (t) => (Math.sin(2 * Math.PI * 262 * t) * 0.3 + Math.sin(2 * Math.PI * 330 * t) * 0.2 + Math.sin(2 * Math.PI * 392 * t) * 0.12) * env(t, 0.5, 0.006, 0.16) * 0.4);
  save(dir, "organ", d);

  // VOX1: vocal chop (pitched up)
  d = render(0.5, (t) => (Math.sin(2 * Math.PI * 280 * t) * 0.35 + Math.sin(2 * Math.PI * 420 * t) * 0.2 + Math.sin(2 * Math.PI * 560 * t) * 0.1) * (1 + Math.sin(t * 7) * 0.01) * env(t, 0.5, 0.02, 0.18) * 0.5);
  save(dir, "vox1", d);

  // VOX2: vocal chant
  d = render(0.45, (t) => (Math.sin(2 * Math.PI * 200 * t) * 0.3 + Math.sin(2 * Math.PI * 300 * t) * 0.18 + noise() * 0.06) * env(t, 0.45, 0.018, 0.15));
  save(dir, "vox2", d);

  // RISER: tension builder
  d = render(2.0, (t) => { const lift = t / 2; return (Math.sin(2 * Math.PI * (300 + lift * lift * 2500) * t) * 0.22 + noise() * 0.12) * lift * lift * env(t, 2, 0.05, 1.5); });
  save(dir, "riser", d);

  // IMPACT: sub drop
  d = render(1.5, (t) => { const f = 100 - t * 50; return (Math.sin(2 * Math.PI * f * t) * 0.6 + noise() * 0.1) * env(t, 1.5, 0.002, 0.5); });
  saturate(d, 2); save(dir, "impact", d);

  // SWEEP: filtered noise rise
  d = render(2.0, (t) => noise() * env(t, 2, 0.06, 0.8) * 0.4);
  const sweepF = 500 + (t => t * 4000);
  lowpass(d, 3000); save(dir, "sweep", d);

  // BRASS: synth brass hit
  d = render(0.5, (t) => (Math.sin(2 * Math.PI * 280 * t) * 0.35 + Math.sin(2 * Math.PI * 560 * t) * 0.22 + Math.sin(2 * Math.PI * 840 * t) * 0.1) * env(t, 0.5, 0.005, 0.16) * 0.45);
  saturate(d, 2.5); save(dir, "brass", d);

  // SYNTH: arp pluck
  d = render(0.35, (t) => (Math.sin(2 * Math.PI * (440 + Math.sin(t * 20) * 200) * t) + noise() * 0.15) * env(t, 0.35, 0.005, 0.1) * 0.45);
  save(dir, "synth", d);

  // LOOP: trap beat pattern
  d = render(1.6, (t) => {
    const step = Math.floor(t * 8) % 8;
    const f = [110, 146.83, 164.81, 196, 220, 196, 164.81, 146.83][step];
    const local = (t * 8) % 1;
    return (Math.sin(2 * Math.PI * f * t) * 0.28 + Math.sin(2 * Math.PI * f * 2 * t) * 0.08) * env(local, 1, 0.01, 0.18);
  });
  save(dir, "loop", d);
  process.stdout.write("\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOOM BAP — sample-based warmth, vinyl character, swing
// ═══════════════════════════════════════════════════════════════════════════════
function boomBap(dir) {
  let d;
  // KICK: round, warm, punchy — sampled from a real kick-ish synthesis
  d = render(0.35, (t) => {
    const f = 55 + 90 * Math.exp(-t * 15);
    const body = Math.sin(2 * Math.PI * f * t) * env(t, 0.35, 0.003, 0.14);
    const click = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 60) * 0.3;
    const beater = t < 0.008 ? noise() * (1 - t / 0.008) * 0.25 : 0;
    return (body + click + beater) * 0.9;
  });
  lowpass(d, 2500); saturate(d, 4); compress(d, -8, 5); save(dir, "kick1", d);

  // KICK2: deeper, more boom
  d = render(0.45, (t) => {
    const f = 50 + 70 * Math.exp(-t * 12);
    return Math.sin(2 * Math.PI * f * t) * env(t, 0.45, 0.004, 0.18) * 0.95;
  });
  lowpass(d, 2000); saturate(d, 4.5); save(dir, "kick2", d);

  // SNARE1: boom bap snare — warm body + filtered noise, compressed
  d = render(0.3, (t) => {
    const body = Math.sin(2 * Math.PI * 175 * t) * Math.exp(-t * 18) * 0.5;
    const rattle = noise() * env(t, 0.3, 0.002, 0.055) * 0.6;
    return body + rattle;
  });
  lowpass(d, 5500); saturate(d, 3.5); compress(d, -6, 6); save(dir, "snare1", d);

  // SNARE2: fatter, more body
  d = render(0.35, (t) => {
    const body = Math.sin(2 * Math.PI * 160 * t) * Math.exp(-t * 15) * 0.55;
    const body2 = Math.sin(2 * Math.PI * 320 * t) * Math.exp(-t * 22) * 0.25;
    const rattle = noise() * env(t, 0.35, 0.002, 0.065) * 0.55;
    return body + body2 + rattle;
  });
  lowpass(d, 4800); saturate(d, 4); compress(d, -6, 6); save(dir, "snare2", d);

  // CLAP: lo-fi, filtered
  d = render(0.22, (t) => {
    let v = 0; for (const h of [0, 0.012, 0.024, 0.038]) if (t > h) v += noise() * Math.exp(-((t - h) * 35)) * 0.35;
    return v;
  });
  bandpass(d, 600, 3500); saturate(d, 3); save(dir, "clap", d);

  // RIM: woody, dry
  d = render(0.08, (t) => (Math.sin(2 * Math.PI * 800 * t) + Math.sin(2 * Math.PI * 1500 * t) * 0.3) * env(t, 0.08, 0.0003, 0.015));
  lowpass(d, 3000); save(dir, "rim", d);

  // HAT-C1: lo-fi, crunchy — filtered noise
  d = render(0.08, (t) => noise() * env(t, 0.08, 0.001, 0.018) * 0.65);
  bandpass(d, 3000, 7000); saturate(d, 2.5); save(dir, "hat-c1", d);

  // HAT-C2: different character
  d = render(0.07, (t) => (noise() * 0.6 + Math.sin(2 * Math.PI * 6500 * t) * 0.1) * env(t, 0.07, 0.001, 0.015));
  bandpass(d, 2500, 6000); save(dir, "hat-c2", d);

  // HAT-O1: dusty, warm
  d = render(0.35, (t) => (noise() * 0.4 + Math.sin(2 * Math.PI * 5500 * t) * 0.12) * env(t, 0.35, 0.002, 0.14));
  bandpass(d, 2500, 5500); save(dir, "hat-o1", d);

  // HAT-O2: longer, grittier
  d = render(0.42, (t) => (noise() * 0.45 + Math.sin(2 * Math.PI * 4800 * t) * 0.1) * env(t, 0.42, 0.002, 0.17));
  bandpass(d, 2000, 5000); saturate(d, 2); save(dir, "hat-o2", d);

  // TOM: warm, round
  d = render(0.35, (t) => { const f = 100 + 60 * Math.exp(-t * 7); return Math.sin(2 * Math.PI * f * t) * env(t, 0.35, 0.003, 0.1) * 0.65; });
  lowpass(d, 1800); saturate(d, 2.5); save(dir, "tom-lo", d);
  d = render(0.3, (t) => { const f = 160 + 70 * Math.exp(-t * 8); return Math.sin(2 * Math.PI * f * t) * env(t, 0.3, 0.003, 0.085) * 0.6; });
  lowpass(d, 2200); save(dir, "tom-mid", d);
  d = render(0.25, (t) => { const f = 240 + 80 * Math.exp(-t * 9); return Math.sin(2 * Math.PI * f * t) * env(t, 0.25, 0.003, 0.07) * 0.55; });
  lowpass(d, 2800); save(dir, "tom-hi", d);

  // CRASH: big, washy
  d = render(1.8, (t) => noise() * env(t, 1.8, 0.001, 0.6) * 0.45);
  lowpass(d, 6000); save(dir, "crash", d);

  // RIDE: warm ping
  d = render(0.6, (t) => (Math.sin(2 * Math.PI * 2800 * t) * 0.28 + Math.sin(2 * Math.PI * 4200 * t) * 0.14 + noise() * 0.08) * env(t, 0.6, 0.001, 0.22));
  lowpass(d, 4500); save(dir, "ride", d);

  // TAMBO: soft jingle
  d = render(0.2, (t) => (noise() * 0.4 + Math.sin(2 * Math.PI * 3800 * t) * 0.18) * env(t, 0.2, 0.001, 0.05));
  lowpass(d, 4000); save(dir, "tambo", d);

  // 808: warm boom bap bass (shorter, rounder than trap)
  d = render(0.8, (t) => Math.sin(2 * Math.PI * (55 - t * 5) * t) * env(t, 0.8, 0.006, 0.3) * 0.85);
  lowpass(d, 200); saturate(d, 3); save(dir, "808", d);

  // SUB: sub bass
  d = render(0.7, (t) => Math.sin(2 * Math.PI * 50 * t) * env(t, 0.7, 0.025, 0.35) * 0.8);
  lowpass(d, 120); save(dir, "sub", d);

  // BASS: upright-ish bass pluck
  d = render(0.6, (t) => {
    const f = 73.42;
    return (Math.sin(2 * Math.PI * f * t) * 0.7 + Math.sin(2 * Math.PI * f * 2 * t) * 0.2) * env(t, 0.6, 0.004, 0.15) * 0.75;
  });
  lowpass(d, 1200); saturate(d, 2.5); save(dir, "bass", d);

  // CHORD: Rhodes-style chord
  d = render(0.5, (t) => {
    const f = 220;
    return (Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * f * 1.26 * t) * 0.5 + Math.sin(2 * Math.PI * f * 1.5 * t) * 0.3) * env(t, 0.5, 0.005, 0.15) * 0.4;
  });
  lowpass(d, 3500); saturate(d, 2); save(dir, "chord", d);

  // PAD: warm analog pad
  d = render(1.8, (t) => (Math.sin(2 * Math.PI * 220 * t) * 0.22 + Math.sin(2 * Math.PI * 277 * t) * 0.18 + Math.sin(2 * Math.PI * 330 * t) * 0.12 + noise() * 0.03) * env(t, 1.8, 0.08, 0.7) * 0.3);
  lowpass(d, 3000); save(dir, "pad", d);

  // BELL: tine bell
  d = render(1.2, (t) => (Math.sin(2 * Math.PI * 880 * t) * 0.35 + Math.sin(2 * Math.PI * 1760 * t) * 0.18 + Math.sin(2 * Math.PI * 2640 * t) * 0.06) * env(t, 1.2, 0.001, 0.45) * 0.45);
  save(dir, "bell", d);

  // KEYS: Rhodes electric piano
  d = render(0.6, (t) => (Math.sin(2 * Math.PI * 330 * t) * 0.32 + Math.sin(2 * Math.PI * 660 * t) * 0.16 + Math.sin(2 * Math.PI * 990 * t) * 0.06) * env(t, 0.6, 0.004, 0.18) * 0.4);
  lowpass(d, 3200); saturate(d, 2); save(dir, "keys", d);

  // ORGAN: Hammond-style
  d = render(0.7, (t) => (Math.sin(2 * Math.PI * 262 * t) * 0.28 + Math.sin(2 * Math.PI * 330 * t) * 0.18 + Math.sin(2 * Math.PI * 392 * t) * 0.1 + Math.sin(2 * Math.PI * 524 * t) * 0.06) * env(t, 0.7, 0.008, 0.22) * 0.35);
  save(dir, "organ", d);

  // VOX1: soul vocal chop
  d = render(0.6, (t) => (Math.sin(2 * Math.PI * 240 * t) * 0.32 + Math.sin(2 * Math.PI * 360 * t) * 0.18 + Math.sin(2 * Math.PI * 480 * t) * 0.08) * env(t, 0.6, 0.025, 0.22) * 0.45);
  lowpass(d, 3500); save(dir, "vox1", d);

  // VOX2: spoken word stab
  d = render(0.4, (t) => (Math.sin(2 * Math.PI * 180 * t) * 0.28 + Math.sin(2 * Math.PI * 270 * t) * 0.15 + noise() * 0.05) * env(t, 0.4, 0.015, 0.12));
  lowpass(d, 2800); save(dir, "vox2", d);

  // RISER: tape speed-up effect
  d = render(1.5, (t) => { const lift = t / 1.5; return (Math.sin(2 * Math.PI * (200 + lift * lift * 1500) * t) * 0.2 + noise() * 0.1) * lift * lift * env(t, 1.5, 0.05, 1); });
  lowpass(d, 4000); save(dir, "riser", d);

  // IMPACT: vinyl thud
  d = render(0.8, (t) => (Math.sin(2 * Math.PI * 65 * t) * 0.5 + noise() * 0.15) * env(t, 0.8, 0.002, 0.3));
  lowpass(d, 300); saturate(d, 3); save(dir, "impact", d);

  // SWEEP: tape hiss swell
  d = render(2.0, (t) => noise() * env(t, 2, 0.08, 0.9) * 0.35);
  lowpass(d, 2500); save(dir, "sweep", d);

  // BRASS: sampled horn stab
  d = render(0.45, (t) => (Math.sin(2 * Math.PI * 280 * t) * 0.32 + Math.sin(2 * Math.PI * 560 * t) * 0.18 + Math.sin(2 * Math.PI * 840 * t) * 0.08) * env(t, 0.45, 0.006, 0.15) * 0.4);
  lowpass(d, 3500); saturate(d, 2.5); save(dir, "brass", d);

  // SYNTH: lo-fi synth
  d = render(0.4, (t) => (Math.sin(2 * Math.PI * (380 + Math.sin(t * 15) * 150) * t) + noise() * 0.12) * env(t, 0.4, 0.006, 0.12) * 0.4);
  lowpass(d, 3000); save(dir, "synth", d);

  // LOOP: boom bap beat
  d = render(1.8, (t) => {
    const step = Math.floor(t * 8) % 8;
    const f = [110, 130.81, 146.83, 174.61, 196, 174.61, 146.83, 130.81][step];
    const local = (t * 8) % 1;
    return (Math.sin(2 * Math.PI * f * t) * 0.25 + Math.sin(2 * Math.PI * f * 2 * t) * 0.06) * env(local, 1, 0.01, 0.2);
  });
  lowpass(d, 3500); save(dir, "loop", d);
  process.stdout.write("\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRILL — dark, aggressive, sliding 808s, metallic textures
// ═══════════════════════════════════════════════════════════════════════════════
function drill(dir) {
  let d;
  // KICK: punchy, dark, with sub weight
  d = render(0.25, (t) => {
    const f = 80 * Math.exp(-t * 25);
    const click = t < 0.003 ? noise() * (1 - t / 0.003) * 0.6 : 0;
    return (Math.sin(2 * Math.PI * f * t) * env(t, 0.25, 0.001, 0.06) + click) * 1.05;
  });
  lowpass(d, 4000); saturate(d, 2.5); compress(d, -8, 4); save(dir, "kick1", d);

  // KICK2: heavier sub kick
  d = render(0.35, (t) => {
    const f = 65 * Math.exp(-t * 18);
    return Math.sin(2 * Math.PI * f * t) * env(t, 0.35, 0.001, 0.1) * 1.0;
  });
  lowpass(d, 3000); saturate(d, 3); save(dir, "kick2", d);

  // SNARE1: drill snare — sharp, short, aggressive
  d = render(0.18, (t) => {
    const body = Math.sin(2 * Math.PI * 240 * t) * Math.exp(-t * 35) * 0.45;
    const snap = Math.sin(2 * Math.PI * 5000 * t) * Math.exp(-t * 120) * 0.35;
    const noise_layer = noise() * env(t, 0.18, 0.001, 0.03) * 0.65;
    return body + snap + noise_layer;
  });
  highpass(d, 250); saturate(d, 2.5); save(dir, "snare1", d);

  // SNARE2: layered, slightly longer
  d = render(0.22, (t) => {
    const body = Math.sin(2 * Math.PI * 220 * t) * Math.exp(-t * 30) * 0.4;
    const snap = Math.sin(2 * Math.PI * 4500 * t) * Math.exp(-t * 100) * 0.3;
    const rattle = noise() * env(t, 0.22, 0.001, 0.035) * 0.6;
    return body + snap + rattle;
  });
  highpass(d, 200); saturate(d, 2.8); save(dir, "snare2", d);

  // CLAP: tight, aggressive
  d = render(0.18, (t) => {
    let v = 0; for (const h of [0, 0.008, 0.017, 0.027]) if (t > h) v += noise() * Math.exp(-((t - h) * 60)) * 0.45;
    return v;
  });
  bandpass(d, 900, 6000); saturate(d, 2.5); save(dir, "clap", d);

  // RIM: sharp, metallic
  d = render(0.08, (t) => (Math.sin(2 * Math.PI * 1200 * t) + Math.sin(2 * Math.PI * 2400 * t) * 0.45) * env(t, 0.08, 0.0003, 0.015));
  save(dir, "rim", d);

  // HAT-C1: drill closed hat — metallic, sharp, tight
  d = render(0.035, (t) => (noise() * 0.6 + Math.sin(2 * Math.PI * 10000 * t) * 0.2 + Math.sin(2 * Math.PI * 14000 * t) * 0.1) * env(t, 0.035, 0.0002, 0.006));
  highpass(d, 6500); save(dir, "hat-c1", d);

  // HAT-C2: different texture
  d = render(0.03, (t) => (noise() * 0.55 + Math.sin(2 * Math.PI * 12000 * t) * 0.15) * env(t, 0.03, 0.0002, 0.005));
  highpass(d, 7500); save(dir, "hat-c2", d);

  // HAT-O1: bright, metallic
  d = render(0.35, (t) => (noise() * 0.45 + Math.sin(2 * Math.PI * 8500 * t) * 0.2 + Math.sin(2 * Math.PI / 2 * (7000 + t * 2000) * t) * 0.08) * env(t, 0.35, 0.001, 0.14));
  highpass(d, 5000); save(dir, "hat-o1", d);

  // HAT-O2: longer, more aggressive
  d = render(0.45, (t) => (noise() * 0.5 + Math.sin(2 * Math.PI * 9000 * t) * 0.18) * env(t, 0.45, 0.001, 0.18));
  highpass(d, 5500); save(dir, "hat-o2", d);

  // TOM: dark, low
  d = render(0.3, (t) => { const f = 85 + 45 * Math.exp(-t * 6); return Math.sin(2 * Math.PI * f * t) * env(t, 0.3, 0.002, 0.08) * 0.6; });
  lowpass(d, 1500); save(dir, "tom-lo", d);
  d = render(0.25, (t) => { const f = 130 + 55 * Math.exp(-t * 7); return Math.sin(2 * Math.PI * f * t) * env(t, 0.25, 0.002, 0.065) * 0.55; });
  lowpass(d, 1800); save(dir, "tom-mid", d);
  d = render(0.2, (t) => { const f = 190 + 65 * Math.exp(-t * 8); return Math.sin(2 * Math.PI * f * t) * env(t, 0.2, 0.002, 0.05) * 0.5; });
  lowpass(d, 2200); save(dir, "tom-hi", d);

  // CRASH: dark, trashy
  d = render(1.4, (t) => noise() * env(t, 1.4, 0.001, 0.5) * 0.45);
  bandpass(d, 2000, 6000); save(dir, "crash", d);

  // RIDE: dark, washy
  d = render(0.55, (t) => (Math.sin(2 * Math.PI * 3000 * t) * 0.25 + Math.sin(2 * Math.PI * 4500 * t) * 0.12 + noise() * 0.1) * env(t, 0.55, 0.001, 0.2));
  lowpass(d, 4000); save(dir, "ride", d);

  // TAMBO: metallic
  d = render(0.18, (t) => (noise() * 0.5 + Math.sin(2 * Math.PI * 5200 * t) * 0.22) * env(t, 0.18, 0.001, 0.04));
  highpass(d, 3500); save(dir, "tambo", d);

  // 808: THE drill signature — extremely deep with aggressive pitch slide
  d = render(3.5, (t) => {
    // Aggressive pitch slide: starts high, drops to very low
    const slidePhase = t < 0.4 ? t / 0.4 : 1;
    const pitch = 80 * (1 - slidePhase * 0.65) + Math.sin(t * 0.8) * 8; // slight vibrato
    const sub = Math.sin(2 * Math.PI * pitch * t);
    // Heavy harmonics for distortion feel
    const harm = Math.sin(2 * Math.PI * pitch * 2 * t) * 0.2 + Math.sin(2 * Math.PI * pitch * 3 * t) * 0.1;
    return (sub + harm) * env(t, 3.5, 0.004, 1.5) * 0.85;
  });
  saturate(d, 4); compress(d, -8, 4); save(dir, "808", d);

  // SUB: deep sub
  d = render(1.5, (t) => Math.sin(2 * Math.PI * 38 * t) * env(t, 1.5, 0.02, 0.6) * 0.85);
  lowpass(d, 80); save(dir, "sub", d);

  // BASS: dark bass
  d = render(0.5, (t) => Math.sin(2 * Math.PI * 65 * t) * env(t, 0.5, 0.003, 0.12) * 0.8);
  lowpass(d, 600); saturate(d, 2.5); save(dir, "bass", d);

  // CHORD: dark minor chord
  d = render(0.35, (t) => {
    const f = 185; // D# minor
    return (Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * f * 1.19 * t) * 0.5 + Math.sin(2 * Math.PI * f * 1.41 * t) * 0.3) * env(t, 0.35, 0.004, 0.1) * 0.4;
  });
  lowpass(d, 3000); save(dir, "chord", d);

  // PAD: dark atmospheric
  d = render(2.0, (t) => (Math.sin(2 * Math.PI * 185 * t) * 0.2 + Math.sin(2 * Math.PI * 220 * t) * 0.15 + Math.sin(2 * Math.PI * 277 * t) * 0.08 + noise() * 0.03) * env(t, 2, 0.1, 0.8) * 0.28);
  lowpass(d, 2200); save(dir, "pad", d);

  // BELL: dark bell
  d = render(1.0, (t) => (Math.sin(2 * Math.PI * 660 * t) * 0.35 + Math.sin(2 * Math.PI * 1320 * t) * 0.18 + Math.sin(2 * Math.PI * 1980 * t) * 0.06) * env(t, 1.0, 0.001, 0.35) * 0.45);
  save(dir, "bell", d);

  // KEYS: dark keys
  d = render(0.45, (t) => (Math.sin(2 * Math.PI * 294 * t) * 0.3 + Math.sin(2 * Math.PI * 588 * t) * 0.15 + Math.sin(2 * Math.PI * 882 * t) * 0.06) * env(t, 0.45, 0.004, 0.14) * 0.4);
  lowpass(d, 2800); save(dir, "keys", d);

  // ORGAN: dark organ
  d = render(0.6, (t) => (Math.sin(2 * Math.PI * 233 * t) * 0.25 + Math.sin(2 * Math.PI * 294 * t) * 0.15 + Math.sin(2 * Math.PI * 349 * t) * 0.08) * env(t, 0.6, 0.007, 0.2) * 0.35);
  save(dir, "organ", d);

  // VOX1: dark vocal chop
  d = render(0.5, (t) => (Math.sin(2 * Math.PI * 195 * t) * 0.3 + Math.sin(2 * Math.PI * 293 * t) * 0.16 + noise() * 0.05) * env(t, 0.5, 0.02, 0.18) * 0.45);
  save(dir, "vox1", d);

  // VOX2: pitched-down vocal
  d = render(0.4, (t) => (Math.sin(2 * Math.PI * 148 * t) * 0.28 + Math.sin(2 * Math.PI * 222 * t) * 0.14 + noise() * 0.04) * env(t, 0.4, 0.015, 0.12));
  save(dir, "vox2", d);

  // RISER: dark tension
  d = render(2.5, (t) => { const lift = t / 2.5; return (Math.sin(2 * Math.PI * (250 + lift * lift * 3000) * t) * 0.2 + noise() * 0.14) * lift * lift * env(t, 2.5, 0.05, 2); });
  lowpass(d, 5000); save(dir, "riser", d);

  // IMPACT: dark sub impact
  d = render(1.8, (t) => { const f = 55 - t * 25; return (Math.sin(2 * Math.PI * f * t) * 0.55 + noise() * 0.12) * env(t, 1.8, 0.003, 0.6); });
  lowpass(d, 2500); saturate(d, 2.5); save(dir, "impact", d);

  // SWEEP: dark noise sweep
  d = render(2.5, (t) => noise() * env(t, 2.5, 0.08, 1) * 0.38);
  lowpass(d, 2000); save(dir, "sweep", d);

  // BRASS: dark brass hit
  d = render(0.45, (t) => (Math.sin(2 * Math.PI * 247 * t) * 0.3 + Math.sin(2 * Math.PI * 494 * t) * 0.18 + Math.sin(2 * Math.PI * 741 * t) * 0.08) * env(t, 0.45, 0.005, 0.14) * 0.4);
  lowpass(d, 3000); saturate(d, 2.5); save(dir, "brass", d);

  // SYNTH: dark synth pluck
  d = render(0.35, (t) => (Math.sin(2 * Math.PI * (350 + Math.sin(t * 16) * 120) * t) + noise() * 0.12) * env(t, 0.35, 0.005, 0.1) * 0.4);
  lowpass(d, 2800); save(dir, "synth", d);

  // LOOP: drill pattern
  d = render(1.8, (t) => {
    const step = Math.floor(t * 8) % 8;
    const f = [98, 116.54, 130.81, 155.56, 174.61, 155.56, 130.81, 116.54][step];
    const local = (t * 8) % 1;
    return (Math.sin(2 * Math.PI * f * t) * 0.25 + Math.sin(2 * Math.PI * f * 2 * t) * 0.06) * env(local, 1, 0.01, 0.2);
  });
  lowpass(d, 3000); save(dir, "loop", d);
  process.stdout.write("\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
// LO-FI — tape saturation, vinyl crackle, heavy lowpass, wow/flutter
// ═══════════════════════════════════════════════════════════════════════════════
function lofi(dir) {
  let d;
  // Vinyl crackle helper: random tiny pops
  const crackle = (t) => Math.random() < 0.003 ? (Math.random() - 0.5) * 0.4 : 0;
  // Tape wow: slow pitch modulation
  const wow = (t, rate = 0.4) => 1 + Math.sin(2 * Math.PI * rate * t) * 0.008;

  // KICK: very round, warm, muffled — like a dusty MPC kick
  d = render(0.4, (t) => {
    const f = (50 + 60 * Math.exp(-t * 10)) * wow(t);
    return Math.sin(2 * Math.PI * f * t) * env(t, 0.4, 0.006, 0.18) * 0.9;
  });
  lowpass(d, 800); saturate(d, 4); save(dir, "kick1", d);

  // KICK2: deeper, boomier
  d = render(0.5, (t) => {
    const f = (42 + 50 * Math.exp(-t * 8)) * wow(t, 0.3);
    return Math.sin(2 * Math.PI * f * t) * env(t, 0.5, 0.008, 0.22) * 0.92;
  });
  lowpass(d, 600); saturate(d, 4.5); save(dir, "kick2", d);

  // SNARE1: lo-fi snare — round body, filtered noise, vinyl character
  d = render(0.35, (t) => {
    const body = Math.sin(2 * Math.PI * 170 * wow(t) * t) * Math.exp(-t * 14) * 0.5;
    const rattle = noise() * env(t, 0.35, 0.003, 0.06) * 0.55;
    return body + rattle + crackle(t);
  });
  lowpass(d, 3500); saturate(d, 3); save(dir, "snare1", d);

  // SNARE2: fatter, more body
  d = render(0.4, (t) => {
    const body = Math.sin(2 * Math.PI * 155 * wow(t) * t) * Math.exp(-t * 12) * 0.55;
    const body2 = Math.sin(2 * Math.PI * 310 * t) * Math.exp(-t * 18) * 0.2;
    const rattle = noise() * env(t, 0.4, 0.003, 0.07) * 0.5;
    return body + body2 + rattle;
  });
  lowpass(d, 3000); saturate(d, 3.5); save(dir, "snare2", d);

  // CLAP: soft, filtered
  d = render(0.25, (t) => {
    let v = 0; for (const h of [0, 0.014, 0.028, 0.044]) if (t > h) v += noise() * Math.exp(-((t - h) * 28)) * 0.3;
    return v + crackle(t);
  });
  lowpass(d, 2500); save(dir, "clap", d);

  // RIM: woody, soft
  d = render(0.1, (t) => (Math.sin(2 * Math.PI * 700 * wow(t) * t) + Math.sin(2 * Math.PI * 1400 * t) * 0.25) * env(t, 0.1, 0.0005, 0.02));
  lowpass(d, 2000); save(dir, "rim", d);

  // HAT-C1: dusty, crunchy — heavy bandpass
  d = render(0.08, (t) => (noise() * 0.55 + Math.sin(2 * Math.PI * 5000 * t) * 0.08) * env(t, 0.08, 0.002, 0.018));
  bandpass(d, 2000, 5000); saturate(d, 2); save(dir, "hat-c1", d);

  // HAT-C2: different dust
  d = render(0.07, (t) => (noise() * 0.5 + Math.sin(2 * Math.PI * 4500 * t) * 0.06) * env(t, 0.07, 0.002, 0.015));
  bandpass(d, 1800, 4500); save(dir, "hat-c2", d);

  // HAT-O1: warm, washy
  d = render(0.4, (t) => (noise() * 0.35 + Math.sin(2 * Math.PI * 4000 * t) * 0.08) * env(t, 0.4, 0.003, 0.16));
  bandpass(d, 1500, 4000); save(dir, "hat-o1", d);

  // HAT-O2: longer, grittier
  d = render(0.5, (t) => (noise() * 0.4 + Math.sin(2 * Math.PI * 3500 * t) * 0.06) * env(t, 0.5, 0.003, 0.2));
  bandpass(d, 1200, 3500); save(dir, "hat-o2", d);

  // TOM: warm, round
  d = render(0.4, (t) => { const f = (90 + 50 * Math.exp(-t * 6)) * wow(t); return Math.sin(2 * Math.PI * f * t) * env(t, 0.4, 0.004, 0.12) * 0.6; });
  lowpass(d, 1200); save(dir, "tom-lo", d);
  d = render(0.35, (t) => { const f = (140 + 60 * Math.exp(-t * 7)) * wow(t); return Math.sin(2 * Math.PI * f * t) * env(t, 0.35, 0.004, 0.1) * 0.55; });
  lowpass(d, 1500); save(dir, "tom-mid", d);
  d = render(0.3, (t) => { const f = (200 + 70 * Math.exp(-t * 8)) * wow(t); return Math.sin(2 * Math.PI * f * t) * env(t, 0.3, 0.004, 0.08) * 0.5; });
  lowpass(d, 1800); save(dir, "tom-hi", d);

  // CRASH: washy, filtered
  d = render(2.0, (t) => noise() * env(t, 2.0, 0.002, 0.7) * 0.4);
  lowpass(d, 4000); save(dir, "crash", d);

  // RIDE: warm ping
  d = render(0.7, (t) => (Math.sin(2 * Math.PI * 2200 * wow(t) * t) * 0.25 + Math.sin(2 * Math.PI * 3300 * t) * 0.1 + noise() * 0.06) * env(t, 0.7, 0.002, 0.25));
  lowpass(d, 3500); save(dir, "ride", d);

  // TAMBO: soft jingle
  d = render(0.25, (t) => (noise() * 0.35 + Math.sin(2 * Math.PI * 3200 * t) * 0.12) * env(t, 0.25, 0.002, 0.06));
  lowpass(d, 3000); save(dir, "tambo", d);

  // 808: lo-fi bass — warm, round, short
  d = render(1.0, (t) => Math.sin(2 * Math.PI * (48 - t * 3) * wow(t, 0.25) * t) * env(t, 1.0, 0.008, 0.35) * 0.88);
  lowpass(d, 250); saturate(d, 3.5); save(dir, "808", d);

  // SUB: sub bass
  d = render(0.8, (t) => Math.sin(2 * Math.PI * 42 * t) * env(t, 0.8, 0.03, 0.35) * 0.82);
  lowpass(d, 100); save(dir, "sub", d);

  // BASS: upright-ish, warm
  d = render(0.7, (t) => {
    const f = 65.41 * wow(t, 0.3);
    return (Math.sin(2 * Math.PI * f * t) * 0.65 + Math.sin(2 * Math.PI * f * 2 * t) * 0.15) * env(t, 0.7, 0.006, 0.18) * 0.75;
  });
  lowpass(d, 900); saturate(d, 2.5); save(dir, "bass", d);

  // CHORD: Rhodes electric piano — warm, tine-like
  d = render(0.7, (t) => {
    const f = 220 * wow(t, 0.35);
    return (Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * f * 1.26 * t) * 0.45 + Math.sin(2 * Math.PI * f * 1.5 * t) * 0.25) * env(t, 0.7, 0.006, 0.2) * 0.38;
  });
  lowpass(d, 2800); saturate(d, 2); save(dir, "chord", d);

  // PAD: warm tape-saturated pad
  d = render(2.5, (t) => (Math.sin(2 * Math.PI * 220 * wow(t, 0.2) * t) * 0.2 + Math.sin(2 * Math.PI * 277 * t) * 0.15 + Math.sin(2 * Math.PI * 330 * t) * 0.1 + noise() * 0.025) * env(t, 2.5, 0.12, 0.9) * 0.28);
  lowpass(d, 2200); save(dir, "pad", d);

  // BELL: music box bell
  d = render(1.5, (t) => (Math.sin(2 * Math.PI * 880 * wow(t) * t) * 0.3 + Math.sin(2 * Math.PI * 1760 * t) * 0.15 + Math.sin(2 * Math.PI * 2640 * t) * 0.05) * env(t, 1.5, 0.001, 0.55) * 0.42);
  lowpass(d, 4000); save(dir, "bell", d);

  // KEYS: lo-fi electric piano
  d = render(0.6, (t) => (Math.sin(2 * Math.PI * 330 * wow(t) * t) * 0.3 + Math.sin(2 * Math.PI * 660 * t) * 0.12 + Math.sin(2 * Math.PI * 990 * t) * 0.04) * env(t, 0.6, 0.005, 0.18) * 0.38);
  lowpass(d, 2500); saturate(d, 2); save(dir, "keys", d);

  // ORGAN: soft church organ
  d = render(0.8, (t) => (Math.sin(2 * Math.PI * 262 * wow(t) * t) * 0.25 + Math.sin(2 * Math.PI * 330 * t) * 0.15 + Math.sin(2 * Math.PI * 392 * t) * 0.08 + Math.sin(2 * Math.PI * 524 * t) * 0.04) * env(t, 0.8, 0.01, 0.25) * 0.32);
  lowpass(d, 2800); save(dir, "organ", d);

  // VOX1: lo-fi vocal chop
  d = render(0.6, (t) => (Math.sin(2 * Math.PI * 230 * wow(t) * t) * 0.3 + Math.sin(2 * Math.PI * 345 * t) * 0.15 + noise() * 0.04) * env(t, 0.6, 0.03, 0.22) * 0.42);
  lowpass(d, 2500); save(dir, "vox1", d);

  // VOX2: whispered vocal
  d = render(0.5, (t) => (noise() * 0.3 + Math.sin(2 * Math.PI * 180 * t) * 0.12) * env(t, 0.5, 0.02, 0.15));
  bandpass(d, 800, 3000); save(dir, "vox2", d);

  // RISER: tape speed-up
  d = render(2.0, (t) => { const lift = t / 2; return (Math.sin(2 * Math.PI * (180 + lift * lift * 1200) * wow(t) * t) * 0.18 + noise() * 0.08) * lift * lift * env(t, 2, 0.06, 1.2); });
  lowpass(d, 3000); save(dir, "riser", d);

  // IMPACT: vinyl thud
  d = render(1.0, (t) => (Math.sin(2 * Math.PI * 55 * t) * 0.5 + noise() * 0.12) * env(t, 1.0, 0.003, 0.35));
  lowpass(d, 200); saturate(d, 3); save(dir, "impact", d);

  // SWEEP: tape hiss
  d = render(2.5, (t) => noise() * env(t, 2.5, 0.1, 1.0) * 0.3);
  lowpass(d, 2000); save(dir, "sweep", d);

  // BRASS: lo-fi horn stab
  d = render(0.5, (t) => (Math.sin(2 * Math.PI * 262 * wow(t) * t) * 0.28 + Math.sin(2 * Math.PI * 524 * t) * 0.14 + Math.sin(2 * Math.PI * 786 * t) * 0.06) * env(t, 0.5, 0.008, 0.16) * 0.38);
  lowpass(d, 2800); save(dir, "brass", d);

  // SYNTH: wobbly lo-fi synth
  d = render(0.5, (t) => (Math.sin(2 * Math.PI * (350 + Math.sin(t * 3) * 80) * wow(t, 0.5) * t) + noise() * 0.08) * env(t, 0.5, 0.008, 0.14) * 0.38);
  lowpass(d, 2200); save(dir, "synth", d);

  // LOOP: lo-fi melodic loop
  d = render(2.0, (t) => {
    const step = Math.floor(t * 8) % 8;
    const f = [110, 130.81, 146.83, 164.81, 196, 164.81, 146.83, 130.81][step];
    const local = (t * 8) % 1;
    return (Math.sin(2 * Math.PI * f * wow(t) * t) * 0.22 + Math.sin(2 * Math.PI * f * 2 * t) * 0.05) * env(local, 1, 0.015, 0.22);
  });
  lowpass(d, 2500); save(dir, "loop", d);
  process.stdout.write("\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGGAETON — dembow rhythm, latin percussion, tropical punch
// ═══════════════════════════════════════════════════════════════════════════════
function reggaeton(dir) {
  let d;
  // KICK: punchy, sub-heavy — the dembow kick
  d = render(0.3, (t) => {
    const f = 70 * Math.exp(-t * 18);
    const click = t < 0.003 ? noise() * (1 - t / 0.003) * 0.5 : 0;
    return (Math.sin(2 * Math.PI * f * t) * env(t, 0.3, 0.001, 0.08) + click) * 0.95;
  });
  lowpass(d, 3500); saturate(d, 2.5); compress(d, -8, 4); save(dir, "kick1", d);

  // KICK2: deeper, more boom
  d = render(0.4, (t) => {
    const f = 55 * Math.exp(-t * 14);
    return Math.sin(2 * Math.PI * f * t) * env(t, 0.4, 0.002, 0.12) * 0.92;
  });
  lowpass(d, 2500); saturate(d, 3); save(dir, "kick2", d);

  // SNARE1: reggaeton snare — tight, punchy, with body
  d = render(0.2, (t) => {
    const body = Math.sin(2 * Math.PI * 200 * t) * Math.exp(-t * 28) * 0.5;
    const snap = Math.sin(2 * Math.PI * 3800 * t) * Math.exp(-t * 100) * 0.35;
    const rattle = noise() * env(t, 0.2, 0.001, 0.035) * 0.6;
    return body + snap + rattle;
  });
  highpass(d, 200); saturate(d, 2); save(dir, "snare1", d);

  // SNARE2: rim-shot style
  d = render(0.15, (t) => {
    const body = Math.sin(2 * Math.PI * 280 * t) * Math.exp(-t * 35) * 0.45;
    const click = Math.sin(2 * Math.PI * 5500 * t) * Math.exp(-t * 130) * 0.4;
    return body + click;
  });
  save(dir, "snare2", d);

  // CLAP: tight, punchy
  d = render(0.18, (t) => {
    let v = 0; for (const h of [0, 0.008, 0.016, 0.026]) if (t > h) v += noise() * Math.exp(-((t - h) * 55)) * 0.4;
    return v;
  });
  bandpass(d, 800, 5000); saturate(d, 2); save(dir, "clap", d);

  // RIM: timbale-style rim
  d = render(0.12, (t) => (Math.sin(2 * Math.PI * 1300 * t) + Math.sin(2 * Math.PI * 2600 * t) * 0.4) * env(t, 0.12, 0.0003, 0.025));
  save(dir, "rim", d);

  // HAT-C1: tight, bright
  d = render(0.045, (t) => (noise() * 0.6 + Math.sin(2 * Math.PI * 9000 * t) * 0.15) * env(t, 0.045, 0.0002, 0.009));
  highpass(d, 5500); save(dir, "hat-c1", d);

  // HAT-C2: slightly open
  d = render(0.06, (t) => (noise() * 0.55 + Math.sin(2 * Math.PI * 8000 * t) * 0.12) * env(t, 0.06, 0.0003, 0.012));
  highpass(d, 5000); save(dir, "hat-c2", d);

  // HAT-O1: bright, open
  d = render(0.35, (t) => (noise() * 0.45 + Math.sin(2 * Math.PI * 7500 * t) * 0.18) * env(t, 0.35, 0.001, 0.14));
  highpass(d, 4500); save(dir, "hat-o1", d);

  // HAT-O2: longer, sizzly
  d = render(0.45, (t) => (noise() * 0.5 + Math.sin(2 * Math.PI * 8500 * t) * 0.15) * env(t, 0.45, 0.001, 0.18));
  highpass(d, 5000); save(dir, "hat-o2", d);

  // CONGA: hand drum — tuned, resonant
  d = render(0.25, (t) => {
    const f = 280 * Math.exp(-t * 12);
    return Math.sin(2 * Math.PI * f * t) * env(t, 0.25, 0.002, 0.06) * 0.7;
  });
  bandpass(d, 200, 2000); save(dir, "tom-lo", d);

  // CONGA HIGH: tumba
  d = render(0.2, (t) => {
    const f = 380 * Math.exp(-t * 14);
    return Math.sin(2 * Math.PI * f * t) * env(t, 0.2, 0.002, 0.05) * 0.65;
  });
  bandpass(d, 250, 2500); save(dir, "tom-mid", d);

  // TIMBALE: metallic, bright
  d = render(0.18, (t) => {
    const f = 600 * Math.exp(-t * 16);
    return (Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * f * 2.4 * t) * 0.3) * env(t, 0.18, 0.001, 0.04) * 0.6;
  });
  highpass(d, 400); save(dir, "tom-hi", d);

  // CRASH: bright splash
  d = render(1.0, (t) => noise() * env(t, 1.0, 0.001, 0.35) * 0.45);
  highpass(d, 3500); save(dir, "crash", d);

  // RIDE: bright ping
  d = render(0.45, (t) => (Math.sin(2 * Math.PI * 3800 * t) * 0.3 + Math.sin(2 * Math.PI * 5800 * t) * 0.15 + noise() * 0.08) * env(t, 0.45, 0.001, 0.16));
  highpass(d, 2800); save(dir, "ride", d);

  // COWBELL: latin cowbell — two-tone
  d = render(0.15, (t) => (Math.sin(2 * Math.PI * 800 * t) * 0.4 + Math.sin(2 * Math.PI * 540 * t) * 0.3) * env(t, 0.15, 0.0005, 0.03) * 0.7);
  save(dir, "tambo", d);

  // 808: reggaeton sub — deep, punchy
  d = render(1.2, (t) => {
    const f = 50 * Math.exp(-t * 8);
    return Math.sin(2 * Math.PI * f * t) * env(t, 1.2, 0.005, 0.45) * 0.88;
  });
  lowpass(d, 300); saturate(d, 3); save(dir, "808", d);

  // SUB: clean sub
  d = render(0.8, (t) => Math.sin(2 * Math.PI * 45 * t) * env(t, 0.8, 0.02, 0.3) * 0.85);
  lowpass(d, 120); save(dir, "sub", d);

  // BASS: tropical bass pluck
  d = render(0.5, (t) => {
    const f = 82.41;
    return (Math.sin(2 * Math.PI * f * t) * 0.7 + Math.sin(2 * Math.PI * f * 2 * t) * 0.18) * env(t, 0.5, 0.003, 0.12) * 0.8;
  });
  lowpass(d, 1500); saturate(d, 2); save(dir, "bass", d);

  // CHORD: latin synth stab
  d = render(0.3, (t) => {
    const f = 262;
    return (Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * f * 1.26 * t) * 0.45 + Math.sin(2 * Math.PI * f * 1.5 * t) * 0.25) * env(t, 0.3, 0.003, 0.08) * 0.42;
  });
  saturate(d, 1.5); save(dir, "chord", d);

  // PAD: tropical pad
  d = render(1.8, (t) => (Math.sin(2 * Math.PI * 262 * t) * 0.2 + Math.sin(2 * Math.PI * 330 * t) * 0.15 + Math.sin(2 * Math.PI * 392 * t) * 0.1) * env(t, 1.8, 0.08, 0.7) * 0.3);
  save(dir, "pad", d);

  // BELL: tropical bell
  d = render(0.8, (t) => (Math.sin(2 * Math.PI * 1047 * t) * 0.35 + Math.sin(2 * Math.PI * 2093 * t) * 0.15) * env(t, 0.8, 0.001, 0.3) * 0.45);
  save(dir, "bell", d);

  // KEYS: bright synth keys
  d = render(0.35, (t) => (Math.sin(2 * Math.PI * 440 * t) * 0.32 + Math.sin(2 * Math.PI * 880 * t) * 0.14 + Math.sin(2 * Math.PI * 1320 * t) * 0.05) * env(t, 0.35, 0.003, 0.1) * 0.42);
  saturate(d, 1.5); save(dir, "keys", d);

  // ORGAN: latin organ stab
  d = render(0.4, (t) => (Math.sin(2 * Math.PI * 330 * t) * 0.28 + Math.sin(2 * Math.PI * 415 * t) * 0.16 + Math.sin(2 * Math.PI * 498 * t) * 0.08) * env(t, 0.4, 0.005, 0.12) * 0.38);
  save(dir, "organ", d);

  // VOX1: reggaeton vocal shout
  d = render(0.35, (t) => (Math.sin(2 * Math.PI * 350 * t) * 0.35 + Math.sin(2 * Math.PI * 525 * t) * 0.18 + noise() * 0.08) * env(t, 0.35, 0.015, 0.1) * 0.5);
  save(dir, "vox1", d);

  // VOX2: vocal chant
  d = render(0.3, (t) => (Math.sin(2 * Math.PI * 280 * t) * 0.3 + Math.sin(2 * Math.PI * 420 * t) * 0.15 + noise() * 0.06) * env(t, 0.3, 0.012, 0.08));
  save(dir, "vox2", d);

  // RISER: build-up
  d = render(1.5, (t) => { const lift = t / 1.5; return (Math.sin(2 * Math.PI * (400 + lift * lift * 2000) * t) * 0.2 + noise() * 0.1) * lift * lift * env(t, 1.5, 0.04, 1); });
  save(dir, "riser", d);

  // IMPACT: sub hit
  d = render(1.0, (t) => { const f = 80 - t * 40; return (Math.sin(2 * Math.PI * f * t) * 0.55 + noise() * 0.1) * env(t, 1.0, 0.002, 0.35); });
  saturate(d, 2); save(dir, "impact", d);

  // SWEEP: filter sweep
  d = render(1.5, (t) => noise() * env(t, 1.5, 0.06, 0.6) * 0.35);
  save(dir, "sweep", d);

  // BRASS: synth brass
  d = render(0.4, (t) => (Math.sin(2 * Math.PI * 330 * t) * 0.32 + Math.sin(2 * Math.PI * 660 * t) * 0.18 + Math.sin(2 * Math.PI * 990 * t) * 0.08) * env(t, 0.4, 0.005, 0.12) * 0.42);
  saturate(d, 2); save(dir, "brass", d);

  // SYNTH: pluck
  d = render(0.3, (t) => (Math.sin(2 * Math.PI * (520 + Math.sin(t * 18) * 200) * t) + noise() * 0.12) * env(t, 0.3, 0.004, 0.08) * 0.42);
  save(dir, "synth", d);

  // LOOP: dembow rhythm pattern
  d = render(1.6, (t) => {
    const step = Math.floor(t * 8) % 8;
    const f = [130.81, 146.83, 164.81, 196, 220, 196, 164.81, 146.83][step];
    const local = (t * 8) % 1;
    return (Math.sin(2 * Math.PI * f * t) * 0.25 + Math.sin(2 * Math.PI * f * 2 * t) * 0.06) * env(local, 1, 0.01, 0.18);
  });
  save(dir, "loop", d);
  process.stdout.write("\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOUSE — four-on-the-floor, crisp hats, electronic stabs, 909-style
// ═══════════════════════════════════════════════════════════════════════════════
function house(dir) {
  let d;
  // KICK: four-on-the-floor — punchy, tight, with beater click
  d = render(0.25, (t) => {
    const f = 55 * Math.exp(-t * 20);
    const click = t < 0.003 ? noise() * (1 - t / 0.003) * 0.7 : 0;
    return (Math.sin(2 * Math.PI * f * t) * env(t, 0.25, 0.001, 0.06) + click) * 0.95;
  });
  lowpass(d, 4000); saturate(d, 2); compress(d, -8, 4); save(dir, "kick1", d);

  // KICK2: deeper house kick
  d = render(0.35, (t) => {
    const f = 48 * Math.exp(-t * 15);
    return Math.sin(2 * Math.PI * f * t) * env(t, 0.35, 0.002, 0.1) * 0.9;
  });
  lowpass(d, 3000); saturate(d, 2.5); save(dir, "kick2", d);

  // SNARE1: 909-style — snappy, with tone
  d = render(0.22, (t) => {
    const body = Math.sin(2 * Math.PI * 220 * t) * Math.exp(-t * 30) * 0.45;
    const snap = Math.sin(2 * Math.PI * 4800 * t) * Math.exp(-t * 110) * 0.35;
    const noise_layer = noise() * env(t, 0.22, 0.001, 0.04) * 0.6;
    return body + snap + noise_layer;
  });
  highpass(d, 250); saturate(d, 2); save(dir, "snare1", d);

  // SNARE2: clap layered
  d = render(0.25, (t) => {
    const body = Math.sin(2 * Math.PI * 200 * t) * Math.exp(-t * 25) * 0.4;
    let clap = 0; for (const h of [0, 0.01, 0.02, 0.032]) if (t > h) clap += noise() * Math.exp(-((t - h) * 40)) * 0.3;
    return body + clap;
  });
  bandpass(d, 600, 4500); saturate(d, 2); save(dir, "snare2", d);

  // CLAP: classic 909 clap
  d = render(0.22, (t) => {
    let v = 0; for (const h of [0, 0.01, 0.02, 0.032]) if (t > h) v += noise() * Math.exp(-((t - h) * 45)) * 0.4;
    return v;
  });
  bandpass(d, 800, 5500); saturate(d, 2.5); save(dir, "clap", d);

  // RIM: tight rim
  d = render(0.08, (t) => (Math.sin(2 * Math.PI * 1400 * t) + Math.sin(2 * Math.PI * 2800 * t) * 0.4) * env(t, 0.08, 0.0003, 0.015));
  save(dir, "rim", d);

  // HAT-C1: 909 closed hat — tight, bright
  d = render(0.04, (t) => (noise() * 0.65 + Math.sin(2 * Math.PI * 10000 * t) * 0.18) * env(t, 0.04, 0.0002, 0.008));
  highpass(d, 6000); save(dir, "hat-c1", d);

  // HAT-C2: offbeat hat — slightly longer
  d = render(0.06, (t) => (noise() * 0.6 + Math.sin(2 * Math.PI * 9000 * t) * 0.15) * env(t, 0.06, 0.0003, 0.012));
  highpass(d, 5500); save(dir, "hat-c2", d);

  // HAT-O1: 909 open hat — bright, sizzly
  d = render(0.4, (t) => (noise() * 0.5 + Math.sin(2 * Math.PI * 8000 * t) * 0.2 + Math.sin(2 * Math.PI * 12000 * t) * 0.08) * env(t, 0.4, 0.001, 0.16));
  highpass(d, 5000); save(dir, "hat-o1", d);

  // HAT-O2: longer, more sustain
  d = render(0.55, (t) => (noise() * 0.55 + Math.sin(2 * Math.PI * 7500 * t) * 0.18) * env(t, 0.55, 0.001, 0.22));
  highpass(d, 4500); save(dir, "hat-o2", d);

  // TOM: 909 tom
  d = render(0.3, (t) => { const f = 120 * Math.exp(-t * 8); return Math.sin(2 * Math.PI * f * t) * env(t, 0.3, 0.002, 0.08) * 0.65; });
  lowpass(d, 2000); save(dir, "tom-lo", d);
  d = render(0.25, (t) => { const f = 180 * Math.exp(-t * 9); return Math.sin(2 * Math.PI * f * t) * env(t, 0.25, 0.002, 0.065) * 0.6; });
  lowpass(d, 2500); save(dir, "tom-mid", d);
  d = render(0.2, (t) => { const f = 260 * Math.exp(-t * 10); return Math.sin(2 * Math.PI * f * t) * env(t, 0.2, 0.002, 0.05) * 0.55; });
  lowpass(d, 3000); save(dir, "tom-hi", d);

  // CRASH: 909 crash
  d = render(1.5, (t) => noise() * env(t, 1.5, 0.001, 0.5) * 0.45);
  highpass(d, 3000); save(dir, "crash", d);

  // RIDE: 909 ride
  d = render(0.6, (t) => (Math.sin(2 * Math.PI * 3200 * t) * 0.28 + Math.sin(2 * Math.PI * 4800 * t) * 0.14 + noise() * 0.1) * env(t, 0.6, 0.001, 0.22));
  highpass(d, 2500); save(dir, "ride", d);

  // TAMBO: 909 tambourine
  d = render(0.2, (t) => (noise() * 0.5 + Math.sin(2 * Math.PI * 5000 * t) * 0.2) * env(t, 0.2, 0.001, 0.05));
  highpass(d, 3000); save(dir, "tambo", d);

  // 808: house bass — round, bouncy
  d = render(0.6, (t) => Math.sin(2 * Math.PI * (55 - t * 8) * t) * env(t, 0.6, 0.005, 0.2) * 0.85);
  lowpass(d, 400); saturate(d, 2.5); save(dir, "808", d);

  // SUB: sub bass
  d = render(0.7, (t) => Math.sin(2 * Math.PI * 48 * t) * env(t, 0.7, 0.02, 0.28) * 0.82);
  lowpass(d, 150); save(dir, "sub", d);

  // BASS: house bass — plucky, round
  d = render(0.4, (t) => {
    const f = 73.42;
    return (Math.sin(2 * Math.PI * f * t) * 0.7 + Math.sin(2 * Math.PI * f * 2 * t) * 0.2) * env(t, 0.4, 0.003, 0.1) * 0.8;
  });
  lowpass(d, 1200); saturate(d, 2); save(dir, "bass", d);

  // CHORD: house chord stab
  d = render(0.25, (t) => {
    const f = 293.66; // D major
    return (Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * f * 1.26 * t) * 0.45 + Math.sin(2 * Math.PI * f * 1.5 * t) * 0.25) * env(t, 0.25, 0.002, 0.06) * 0.42;
  });
  saturate(d, 1.5); save(dir, "chord", d);

  // PAD: house pad — warm, filtered
  d = render(2.0, (t) => (Math.sin(2 * Math.PI * 220 * t) * 0.2 + Math.sin(2 * Math.PI * 277 * t) * 0.16 + Math.sin(2 * Math.PI * 330 * t) * 0.1 + noise() * 0.02) * env(t, 2.0, 0.1, 0.8) * 0.3);
  lowpass(d, 3000); save(dir, "pad", d);

  // BELL: house bell
  d = render(0.6, (t) => (Math.sin(2 * Math.PI * 1047 * t) * 0.32 + Math.sin(2 * Math.PI * 2093 * t) * 0.14) * env(t, 0.6, 0.001, 0.22) * 0.42);
  save(dir, "bell", d);

  // KEYS: organ keys
  d = render(0.35, (t) => (Math.sin(2 * Math.PI * 440 * t) * 0.3 + Math.sin(2 * Math.PI * 554 * t) * 0.16 + Math.sin(2 * Math.PI * 659 * t) * 0.08) * env(t, 0.35, 0.003, 0.1) * 0.4);
  save(dir, "keys", d);

  // ORGAN: house organ
  d = render(0.5, (t) => (Math.sin(2 * Math.PI * 262 * t) * 0.28 + Math.sin(2 * Math.PI * 330 * t) * 0.16 + Math.sin(2 * Math.PI * 392 * t) * 0.08 + Math.sin(2 * Math.PI * 524 * t) * 0.04) * env(t, 0.5, 0.006, 0.15) * 0.35);
  save(dir, "organ", d);

  // VOX1: house vocal stab
  d = render(0.35, (t) => (Math.sin(2 * Math.PI * 330 * t) * 0.32 + Math.sin(2 * Math.PI * 495 * t) * 0.16 + noise() * 0.06) * env(t, 0.35, 0.015, 0.1) * 0.45);
  save(dir, "vox1", d);

  // VOX2: vocal shout
  d = render(0.3, (t) => (Math.sin(2 * Math.PI * 260 * t) * 0.28 + Math.sin(2 * Math.PI * 390 * t) * 0.14 + noise() * 0.05) * env(t, 0.3, 0.012, 0.08));
  save(dir, "vox2", d);

  // RISER: synth riser
  d = render(2.0, (t) => { const lift = t / 2; return (Math.sin(2 * Math.PI * (300 + lift * lift * 3000) * t) * 0.2 + noise() * 0.1) * lift * lift * env(t, 2, 0.05, 1.5); });
  save(dir, "riser", d);

  // IMPACT: sub hit
  d = render(1.2, (t) => { const f = 60 - t * 30; return (Math.sin(2 * Math.PI * f * t) * 0.55 + noise() * 0.1) * env(t, 1.2, 0.002, 0.4); });
  saturate(d, 2); save(dir, "impact", d);

  // SWEEP: white noise sweep
  d = render(2.0, (t) => noise() * env(t, 2.0, 0.06, 0.8) * 0.35);
  save(dir, "sweep", d);

  // BRASS: synth brass stab
  d = render(0.4, (t) => (Math.sin(2 * Math.PI * 330 * t) * 0.32 + Math.sin(2 * Math.PI * 660 * t) * 0.18 + Math.sin(2 * Math.PI * 990 * t) * 0.08) * env(t, 0.4, 0.004, 0.12) * 0.42);
  saturate(d, 2); save(dir, "brass", d);

  // SYNTH: acid synth pluck
  d = render(0.3, (t) => (Math.sin(2 * Math.PI * (440 + Math.sin(t * 22) * 300) * t) + noise() * 0.12) * env(t, 0.3, 0.003, 0.08) * 0.42);
  save(dir, "synth", d);

  // LOOP: house melodic loop
  d = render(1.6, (t) => {
    const step = Math.floor(t * 8) % 8;
    const f = [146.83, 164.81, 196, 220, 246.94, 220, 196, 164.81][step];
    const local = (t * 8) % 1;
    return (Math.sin(2 * Math.PI * f * t) * 0.24 + Math.sin(2 * Math.PI * f * 2 * t) * 0.06) * env(local, 1, 0.01, 0.18);
  });
  save(dir, "loop", d);
  process.stdout.write("\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
// GLITCH — bitcrushed, granular, metallic FM, randomized artifacts
// ═══════════════════════════════════════════════════════════════════════════════
function glitch(dir) {
  let d;
  // Bitcrush helper: reduce bit depth
  const crush = (d, bits = 4) => { const q = 1 / (2 ** (bits - 1)); for (let i = 0; i < d.length; i++) d[i] = Math.round(d[i] / q) * q; return d; };
  // Granular: random tiny slices
  const grain = (t, density = 20) => Math.random() < 1 / (density * SR / 1000) ? (Math.random() - 0.5) * 0.8 : 0;

  // KICK: distorted, crushed
  d = render(0.2, (t) => {
    const f = 60 * Math.exp(-t * 25);
    return Math.sin(2 * Math.PI * f * t) * env(t, 0.2, 0.001, 0.05) * 0.9;
  });
  crush(d, 5); saturate(d, 4); save(dir, "kick1", d);

  // KICK2: granular kick
  d = render(0.25, (t) => {
    const f = 50 * Math.exp(-t * 20);
    return (Math.sin(2 * Math.PI * f * t) + grain(t, 8)) * env(t, 0.25, 0.001, 0.06) * 0.85;
  });
  crush(d, 6); save(dir, "kick2", d);

  // SNARE1: metallic crushed snare
  d = render(0.15, (t) => {
    const body = Math.sin(2 * Math.PI * 200 * t) * Math.exp(-t * 35) * 0.45;
    const metallic = Math.sin(2 * Math.PI * 3500 * t) * Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 40) * 0.4;
    const rattle = noise() * env(t, 0.15, 0.001, 0.025) * 0.6;
    return body + metallic + rattle;
  });
  crush(d, 4); save(dir, "snare1", d);

  // SNARE2: granular snare
  d = render(0.18, (t) => {
    const body = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 30) * 0.4;
    return body + grain(t, 6) * env(t, 0.18, 0.001, 0.03);
  });
  crush(d, 5); save(dir, "snare2", d);

  // CLAP: digital clap — multiple micro-transients
  d = render(0.15, (t) => {
    let v = 0; for (const h of [0, 0.005, 0.011, 0.018, 0.026]) if (t > h) v += noise() * Math.exp(-((t - h) * 70)) * 0.35;
    return v;
  });
  crush(d, 4); save(dir, "clap", d);

  // RIM: digital click
  d = render(0.06, (t) => {
    const f = 1800 + Math.sin(t * 500) * 600;
    return Math.sin(2 * Math.PI * f * t) * env(t, 0.06, 0.0002, 0.01) * 0.7;
  });
  crush(d, 3); save(dir, "rim", d);

  // HAT-C1: crushed hat — metallic
  d = render(0.03, (t) => (noise() * 0.6 + Math.sin(2 * Math.PI * 11000 * t) * 0.2) * env(t, 0.03, 0.0001, 0.005));
  crush(d, 3); highpass(d, 6000); save(dir, "hat-c1", d);

  // HAT-C2: bit-reduced hat
  d = render(0.025, (t) => (noise() * 0.55 + Math.sin(2 * Math.PI * 13000 * t) * 0.15) * env(t, 0.025, 0.0001, 0.004));
  crush(d, 4); save(dir, "hat-c2", d);

  // HAT-O1: granular hat
  d = render(0.3, (t) => (noise() * 0.45 + grain(t, 12) + Math.sin(2 * Math.PI * 9000 * t) * 0.12) * env(t, 0.3, 0.001, 0.12));
  crush(d, 5); highpass(d, 4000); save(dir, "hat-o1", d);

  // HAT-O2: time-stretched artifact
  d = render(0.4, (t) => {
    const stretch = Math.sin(2 * Math.PI * 0.5 * t) * 0.5 + 0.5;
    return (noise() * 0.5 * stretch + Math.sin(2 * Math.PI * (7000 + stretch * 3000) * t) * 0.1) * env(t, 0.4, 0.001, 0.16);
  });
  crush(d, 4); save(dir, "hat-o2", d);

  // TOM: FM tom — metallic
  d = render(0.2, (t) => {
    const f = 200 * Math.exp(-t * 10);
    return Math.sin(2 * Math.PI * f * t + Math.sin(2 * Math.PI * f * 3 * t) * 2) * env(t, 0.2, 0.002, 0.05) * 0.6;
  });
  crush(d, 5); save(dir, "tom-lo", d);
  d = render(0.18, (t) => {
    const f = 300 * Math.exp(-t * 12);
    return Math.sin(2 * Math.PI * f * t + Math.sin(2 * Math.PI * f * 2.5 * t) * 1.8) * env(t, 0.18, 0.002, 0.04) * 0.55;
  });
  crush(d, 4); save(dir, "tom-mid", d);
  d = render(0.15, (t) => {
    const f = 450 * Math.exp(-t * 14);
    return Math.sin(2 * Math.PI * f * t + Math.sin(2 * Math.PI * f * 2 * t) * 2.5) * env(t, 0.15, 0.001, 0.03) * 0.5;
  });
  crush(d, 3); save(dir, "tom-hi", d);

  // CRASH: digital crash
  d = render(0.8, (t) => (noise() + grain(t, 4)) * env(t, 0.8, 0.001, 0.3) * 0.4);
  crush(d, 5); highpass(d, 2000); save(dir, "crash", d);

  // RIDE: FM ride
  d = render(0.4, (t) => Math.sin(2 * Math.PI * 3000 * t + Math.sin(2 * Math.PI * 7000 * t) * 3) * env(t, 0.4, 0.001, 0.15) * 0.3);
  crush(d, 4); save(dir, "ride", d);

  // TAMBO: crushed tambourine
  d = render(0.12, (t) => (noise() * 0.5 + Math.sin(2 * Math.PI * 6000 * t) * 0.2) * env(t, 0.12, 0.001, 0.025));
  crush(d, 4); save(dir, "tambo", d);

  // 808: crushed sub
  d = render(0.8, (t) => Math.sin(2 * Math.PI * 45 * t) * env(t, 0.8, 0.004, 0.3) * 0.88);
  crush(d, 6); saturate(d, 3); save(dir, "808", d);

  // SUB: glitch sub
  d = render(0.6, (t) => Math.sin(2 * Math.PI * 40 * t) * env(t, 0.6, 0.015, 0.25) * 0.82);
  crush(d, 7); save(dir, "sub", d);

  // BASS: crushed bass
  d = render(0.35, (t) => {
    const f = 60;
    return Math.sin(2 * Math.PI * f * t) * env(t, 0.35, 0.002, 0.08) * 0.8;
  });
  crush(d, 5); saturate(d, 2); save(dir, "bass", d);

  // CHORD: detuned digital chord
  d = render(0.2, (t) => {
    const f = 220;
    return (Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * f * 1.005 * t) * 0.5 + Math.sin(2 * Math.PI * f * 1.498 * t) * 0.3) * env(t, 0.2, 0.002, 0.05) * 0.4;
  });
  crush(d, 5); save(dir, "chord", d);

  // PAD: granular pad
  d = render(2.0, (t) => (Math.sin(2 * Math.PI * 220 * t) * 0.18 + grain(t, 3) + noise() * 0.04) * env(t, 2.0, 0.1, 0.8) * 0.25);
  crush(d, 6); save(dir, "pad", d);

  // BELL: metallic FM bell
  d = render(0.8, (t) => Math.sin(2 * Math.PI * 880 * t + Math.sin(2 * Math.PI * 2640 * t) * 4) * env(t, 0.8, 0.001, 0.3) * 0.4);
  crush(d, 4); save(dir, "bell", d);

  // KEYS: crushed keys
  d = render(0.3, (t) => (Math.sin(2 * Math.PI * 440 * t) * 0.3 + Math.sin(2 * Math.PI * 880 * t) * 0.12) * env(t, 0.3, 0.003, 0.08) * 0.38);
  crush(d, 5); save(dir, "keys", d);

  // ORGAN: digital organ
  d = render(0.4, (t) => (Math.sin(2 * Math.PI * 262 * t) * 0.25 + Math.sin(2 * Math.PI * 524 * t) * 0.12 + Math.sin(2 * Math.PI * 786 * t) * 0.06) * env(t, 0.4, 0.005, 0.12) * 0.35);
  crush(d, 5); save(dir, "organ", d);

  // VOX1: granular vocal
  d = render(0.3, (t) => (Math.sin(2 * Math.PI * 300 * t) * 0.3 + grain(t, 10) * 0.5 + noise() * 0.06) * env(t, 0.3, 0.015, 0.08) * 0.42);
  crush(d, 5); save(dir, "vox1", d);

  // VOX2: stretched vocal artifact
  d = render(0.4, (t) => {
    const stretch = 1 + Math.sin(t * 2) * 0.3;
    return (Math.sin(2 * Math.PI * 200 * stretch * t) * 0.28 + noise() * 0.08) * env(t, 0.4, 0.02, 0.12);
  });
  crush(d, 4); save(dir, "vox2", d);

  // RISER: granular riser
  d = render(1.5, (t) => { const lift = t / 1.5; return (Math.sin(2 * Math.PI * (200 + lift * lift * 4000) * t) * 0.18 + grain(t, 3) * lift + noise() * 0.1) * lift * lift * env(t, 1.5, 0.04, 1); });
  crush(d, 5); save(dir, "riser", d);

  // IMPACT: crushed impact
  d = render(0.8, (t) => (Math.sin(2 * Math.PI * 50 * t) * 0.5 + grain(t, 5) * 0.6 + noise() * 0.12) * env(t, 0.8, 0.002, 0.3));
  crush(d, 4); save(dir, "impact", d);

  // SWEEP: digital noise
  d = render(1.5, (t) => (noise() + grain(t, 6)) * env(t, 1.5, 0.05, 0.6) * 0.32);
  crush(d, 5); save(dir, "sweep", d);

  // BRASS: crushed brass
  d = render(0.3, (t) => (Math.sin(2 * Math.PI * 330 * t) * 0.3 + Math.sin(2 * Math.PI * 660 * t) * 0.15 + Math.sin(2 * Math.PI * 990 * t) * 0.06) * env(t, 0.3, 0.004, 0.08) * 0.38);
  crush(d, 4); save(dir, "brass", d);

  // SYNTH: FM glitch synth
  d = render(0.25, (t) => Math.sin(2 * Math.PI * (400 + Math.sin(t * 30) * 400) * t + Math.sin(2 * Math.PI * 200 * t) * 3) * env(t, 0.25, 0.003, 0.06) * 0.38);
  crush(d, 4); save(dir, "synth", d);

  // LOOP: glitch pattern
  d = render(1.2, (t) => {
    const step = Math.floor(t * 12) % 12;
    const f = [110, 130.81, 146.83, 164.81, 185, 207.65, 185, 164.81, 146.83, 130.81, 110, 98][step];
    const local = (t * 12) % 1;
    return (Math.sin(2 * Math.PI * f * t) * 0.22 + grain(t, 8) * 0.3) * env(local, 1, 0.008, 0.15);
  });
  crush(d, 5); save(dir, "loop", d);
  process.stdout.write("\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8-BIT — chiptune, square/triangle waves, noise channel, arpeggios
// ═══════════════════════════════════════════════════════════════════════════════
function eightBit(dir) {
  let d;
  // Square wave (pulse) — classic NES sound
  const sq = (t, f, duty = 0.5) => ((t * f) % 1) < duty ? 1 : -1;
  // Triangle wave — NES DPCM / bass channel
  const tri = (t, f) => { const p = (t * f) % 1; return p < 0.5 ? p * 4 - 1 : 3 - p * 4; };
  // Noise channel — NES noise
  const nch = (decay = 0.1) => (t) => noise() * Math.exp(-t / decay);

  // KICK: triangle wave pitch drop
  d = render(0.15, (t) => {
    const f = 150 * Math.exp(-t * 35);
    return tri(t, f) * env(t, 0.15, 0.001, 0.04) * 0.9;
  });
  save(dir, "kick1", d);

  // KICK2: square wave kick
  d = render(0.18, (t) => {
    const f = 120 * Math.exp(-t * 30);
    return sq(t, f, 0.25) * env(t, 0.18, 0.001, 0.05) * 0.85;
  });
  save(dir, "kick2", d);

  // SNARE1: noise burst + triangle body
  d = render(0.12, (t) => {
    const body = tri(t, 200) * Math.exp(-t * 30) * 0.4;
    return body + nch(0.025)(t) * env(t, 0.12, 0.001, 0.02) * 0.7;
  });
  save(dir, "snare1", d);

  // SNARE2: square + noise
  d = render(0.15, (t) => {
    const body = sq(t, 180, 0.25) * Math.exp(-t * 25) * 0.35;
    return body + nch(0.03)(t) * env(t, 0.15, 0.001, 0.025) * 0.65;
  });
  save(dir, "snare2", d);

  // CLAP: noise channel
  d = render(0.1, (t) => nch(0.02)(t) * env(t, 0.1, 0.001, 0.015) * 0.65);
  save(dir, "clap", d);

  // RIM: high square click
  d = render(0.05, (t) => sq(t, 1200, 0.1) * env(t, 0.05, 0.0002, 0.008) * 0.7);
  save(dir, "rim", d);

  // HAT-C1: noise channel — short
  d = render(0.03, (t) => nch(0.008)(t) * env(t, 0.03, 0.0002, 0.006) * 0.6);
  save(dir, "hat-c1", d);

  // HAT-C2: noise — different decay
  d = render(0.025, (t) => nch(0.006)(t) * env(t, 0.025, 0.0002, 0.005) * 0.55);
  save(dir, "hat-c2", d);

  // HAT-O1: noise — longer
  d = render(0.2, (t) => nch(0.06)(t) * env(t, 0.2, 0.001, 0.06) * 0.5);
  save(dir, "hat-o1", d);

  // HAT-O2: noise — sizzly
  d = render(0.3, (t) => nch(0.08)(t) * env(t, 0.3, 0.001, 0.1) * 0.45);
  save(dir, "hat-o2", d);

  // TOM: triangle wave pitch drop
  d = render(0.2, (t) => { const f = 300 * Math.exp(-t * 12); return tri(t, f) * env(t, 0.2, 0.002, 0.05) * 0.65; });
  save(dir, "tom-lo", d);
  d = render(0.18, (t) => { const f = 450 * Math.exp(-t * 14); return tri(t, f) * env(t, 0.18, 0.002, 0.04) * 0.6; });
  save(dir, "tom-mid", d);
  d = render(0.15, (t) => { const f = 650 * Math.exp(-t * 16); return tri(t, f) * env(t, 0.15, 0.001, 0.03) * 0.55; });
  save(dir, "tom-hi", d);

  // CRASH: noise explosion
  d = render(0.6, (t) => nch(0.2)(t) * env(t, 0.6, 0.001, 0.2) * 0.5);
  save(dir, "crash", d);

  // RIDE: square ping
  d = render(0.3, (t) => sq(t, 2400, 0.1) * env(t, 0.3, 0.001, 0.1) * 0.3);
  save(dir, "ride", d);

  // TAMBO: noise jingle
  d = render(0.1, (t) => nch(0.025)(t) * env(t, 0.1, 0.001, 0.02) * 0.5);
  save(dir, "tambo", d);

  // 808: triangle wave bass
  d = render(0.5, (t) => tri(t, 55) * env(t, 0.5, 0.005, 0.18) * 0.88);
  save(dir, "808", d);

  // SUB: triangle sub
  d = render(0.4, (t) => tri(t, 40) * env(t, 0.4, 0.015, 0.15) * 0.82);
  save(dir, "sub", d);

  // BASS: square wave bass
  d = render(0.3, (t) => sq(t, 73.42, 0.25) * env(t, 0.3, 0.002, 0.08) * 0.8);
  save(dir, "bass", d);

  // CHORD: square wave chord (duty cycle modulation)
  d = render(0.3, (t) => {
    const f = 262;
    return (sq(t, f, 0.5) * 0.3 + sq(t, f * 1.26, 0.4) * 0.18 + sq(t, f * 1.5, 0.35) * 0.1) * env(t, 0.3, 0.003, 0.08) * 0.4;
  });
  save(dir, "chord", d);

  // PAD: triangle pad
  d = render(1.5, (t) => (tri(t, 220) * 0.2 + tri(t, 277) * 0.15 + tri(t, 330) * 0.1) * env(t, 1.5, 0.08, 0.6) * 0.28);
  save(dir, "pad", d);

  // BELL: square bell with detune
  d = render(0.6, (t) => (sq(t, 880, 0.1) * 0.3 + sq(t, 1760, 0.08) * 0.15) * env(t, 0.6, 0.001, 0.22) * 0.4);
  save(dir, "bell", d);

  // KEYS: arpeggio (rapid note sequence)
  d = render(0.5, (t) => {
    const notes = [262, 330, 392, 524, 392, 330, 262, 196];
    const note = notes[Math.floor(t * 16) % notes.length];
    return sq(t, note, 0.5) * env((t * 16) % 1, 1, 0.01, 0.2) * 0.35;
  });
  save(dir, "keys", d);

  // ORGAN: square organ
  d = render(0.4, (t) => (sq(t, 262, 0.5) * 0.25 + sq(t, 330, 0.4) * 0.15 + sq(t, 392, 0.35) * 0.08) * env(t, 0.4, 0.005, 0.12) * 0.35);
  save(dir, "organ", d);

  // VOX1: vocal arpeggio
  d = render(0.4, (t) => {
    const notes = [330, 392, 440, 524, 440, 392];
    const note = notes[Math.floor(t * 12) % notes.length];
    return tri(t, note) * env((t * 12) % 1, 1, 0.01, 0.18) * 0.4;
  });
  save(dir, "vox1", d);

  // VOX2: noise voice
  d = render(0.3, (t) => (sq(t, 200, 0.3) * 0.2 + nch(0.08)(t) * 0.15) * env(t, 0.3, 0.012, 0.08));
  save(dir, "vox2", d);

  // RISER: pitch sweep
  d = render(1.5, (t) => { const f = 200 + t * t * 2000; return sq(t, f, 0.5) * env(t, 1.5, 0.04, 1) * 0.35; });
  save(dir, "riser", d);

  // IMPACT: triangle drop
  d = render(0.6, (t) => { const f = 100 - t * 120; return tri(t, Math.max(20, f)) * env(t, 0.6, 0.002, 0.2) * 0.6; });
  save(dir, "impact", d);

  // SWEEP: noise sweep
  d = render(1.5, (t) => nch(0.4)(t) * env(t, 1.5, 0.05, 0.6) * 0.3);
  save(dir, "sweep", d);

  // BRASS: square brass stab
  d = render(0.3, (t) => (sq(t, 330, 0.45) * 0.3 + sq(t, 660, 0.35) * 0.15 + sq(t, 990, 0.25) * 0.06) * env(t, 0.3, 0.004, 0.08) * 0.38);
  save(dir, "brass", d);

  // SYNTH: arpeggio synth
  d = render(0.4, (t) => {
    const notes = [440, 554, 659, 880, 659, 554];
    const note = notes[Math.floor(t * 14) % notes.length];
    return sq(t, note, 0.5) * env((t * 14) % 1, 1, 0.01, 0.15) * 0.35;
  });
  save(dir, "synth", d);

  // LOOP: chiptune loop
  d = render(1.6, (t) => {
    const step = Math.floor(t * 8) % 8;
    const f = [262, 294, 330, 349, 392, 349, 330, 294][step];
    const local = (t * 8) % 1;
    return (sq(t, f, 0.5) * 0.25 + tri(t, f / 2) * 0.1) * env(local, 1, 0.01, 0.18);
  });
  save(dir, "loop", d);
  process.stdout.write("\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
// BEATBOX — vocal percussion, formant synthesis, breath noise
// ═══════════════════════════════════════════════════════════════════════════════
function beatbox(dir) {
  let d;
  // Formant helper: simulate vocal tract resonances
  const formant = (t, f1, f2, f3, bw1 = 80, bw2 = 120, bw3 = 150) => {
    const r1 = Math.sin(2 * Math.PI * f1 * t) * Math.exp(-bw1 * t);
    const r2 = Math.sin(2 * Math.PI * f2 * t) * Math.exp(-bw2 * t);
    const r3 = Math.sin(2 * Math.PI * f3 * t) * Math.exp(-bw3 * t);
    return (r1 + r2 * 0.6 + r3 * 0.3);
  };

  // KICK: voiced lip buzz — "b" or "p" sound
  d = render(0.18, (t) => {
    const f = 80 * Math.exp(-t * 20);
    const lip = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 15) * 0.7;
    const breath = t < 0.005 ? noise() * (1 - t / 0.005) * 0.5 : 0;
    return lip + breath;
  });
  lowpass(d, 2000); saturate(d, 2); save(dir, "kick1", d);

  // KICK2: deeper, more sub — "doom"
  d = render(0.22, (t) => {
    const f = 60 * Math.exp(-t * 15);
    return Math.sin(2 * Math.PI * f * t) * env(t, 0.22, 0.003, 0.06) * 0.85;
  });
  lowpass(d, 1500); save(dir, "kick2", d);

  // SNARE1: "pf" snare — breathy noise + tone
  d = render(0.15, (t) => {
    const tone = Math.sin(2 * Math.PI * 200 * t) * Math.exp(-t * 30) * 0.35;
    const breath = noise() * env(t, 0.15, 0.001, 0.025) * 0.65;
    return tone + breath;
  });
  bandpass(d, 400, 6000); save(dir, "snare1", d);

  // SNARE2: "ksh" snare — sharper
  d = render(0.18, (t) => {
    const tone = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 28) * 0.3;
    const ksh = noise() * env(t, 0.18, 0.001, 0.03) * 0.7;
    return tone + ksh;
  });
  bandpass(d, 500, 7000); save(dir, "snare2", d);

  // CLAP: "pff" — breath burst
  d = render(0.12, (t) => noise() * env(t, 0.12, 0.001, 0.02) * 0.7);
  bandpass(d, 600, 5000); save(dir, "clap", d);

  // RIM: "t" click — tongue click
  d = render(0.04, (t) => {
    const click = Math.sin(2 * Math.PI * 2500 * t) * Math.exp(-t * 200) * 0.6;
    const air = noise() * Math.exp(-t * 150) * 0.3;
    return click + air;
  });
  save(dir, "rim", d);

  // HAT-C1: "ts" — tongue + breath
  d = render(0.04, (t) => noise() * env(t, 0.04, 0.0002, 0.008) * 0.6);
  highpass(d, 5000); save(dir, "hat-c1", d);

  // HAT-C2: "t" — tighter
  d = render(0.03, (t) => noise() * env(t, 0.03, 0.0002, 0.006) * 0.55);
  highpass(d, 6000); save(dir, "hat-c2", d);

  // HAT-O1: "shh" — sustained breath
  d = render(0.25, (t) => noise() * env(t, 0.25, 0.002, 0.08) * 0.5);
  highpass(d, 4000); save(dir, "hat-o1", d);

  // HAT-O2: "tssss" — longer
  d = render(0.35, (t) => noise() * env(t, 0.35, 0.002, 0.12) * 0.45);
  highpass(d, 4500); save(dir, "hat-o2", d);

  // TOM: "doom" — vocal tom
  d = render(0.25, (t) => {
    const f = 180 * Math.exp(-t * 10);
    return Math.sin(2 * Math.PI * f * t) * env(t, 0.25, 0.003, 0.06) * 0.6;
  });
  lowpass(d, 2000); save(dir, "tom-lo", d);
  d = render(0.2, (t) => {
    const f = 280 * Math.exp(-t * 12);
    return Math.sin(2 * Math.PI * f * t) * env(t, 0.2, 0.003, 0.05) * 0.55;
  });
  lowpass(d, 2500); save(dir, "tom-mid", d);
  d = render(0.18, (t) => {
    const f = 400 * Math.exp(-t * 14);
    return Math.sin(2 * Math.PI * f * t) * env(t, 0.18, 0.002, 0.04) * 0.5;
  });
  lowpass(d, 3000); save(dir, "tom-hi", d);

  // CRASH: "kshhh" — big breath
  d = render(0.8, (t) => noise() * env(t, 0.8, 0.001, 0.3) * 0.5);
  highpass(d, 3000); save(dir, "crash", d);

  // RIDE: "ting" — metallic tongue
  d = render(0.35, (t) => (Math.sin(2 * Math.PI * 3200 * t) * 0.3 + noise() * 0.15) * env(t, 0.35, 0.001, 0.12));
  highpass(d, 2500); save(dir, "ride", d);

  // TAMBO: "ch" — breathy
  d = render(0.1, (t) => noise() * env(t, 0.1, 0.001, 0.02) * 0.5);
  highpass(d, 3500); save(dir, "tambo", d);

  // 808: vocal bass — "dm" bass
  d = render(0.6, (t) => {
    const f = 55 * Math.exp(-t * 6);
    return Math.sin(2 * Math.PI * f * t) * env(t, 0.6, 0.006, 0.22) * 0.85;
  });
  lowpass(d, 400); save(dir, "808", d);

  // SUB: sub bass
  d = render(0.5, (t) => Math.sin(2 * Math.PI * 42 * t) * env(t, 0.5, 0.02, 0.2) * 0.8);
  lowpass(d, 150); save(dir, "sub", d);

  // BASS: vocal bass — "dm dm dm"
  d = render(0.35, (t) => {
    const f = 73.42 * Math.exp(-t * 5);
    return (Math.sin(2 * Math.PI * f * t) * 0.6 + Math.sin(2 * Math.PI * f * 2 * t) * 0.15) * env(t, 0.35, 0.004, 0.1) * 0.75;
  });
  lowpass(d, 1200); save(dir, "bass", d);

  // CHORD: vocal chord — "aah"
  d = render(0.4, (t) => {
    return formant(t, 730, 1090, 2440) * env(t, 0.4, 0.02, 0.12) * 0.35;
  });
  save(dir, "chord", d);

  // PAD: vocal pad — "ooh"
  d = render(1.5, (t) => {
    return formant(t, 300, 870, 2240, 40, 60, 80) * env(t, 1.5, 0.1, 0.6) * 0.25;
  });
  save(dir, "pad", d);

  // BELL: vocal "ding"
  d = render(0.5, (t) => (Math.sin(2 * Math.PI * 1200 * t) * 0.3 + Math.sin(2 * Math.PI * 2400 * t) * 0.12) * env(t, 0.5, 0.001, 0.18) * 0.4);
  save(dir, "bell", d);

  // KEYS: vocal "la la"
  d = render(0.3, (t) => {
    const f = 440;
    return formant(t, 730 + Math.sin(t * 5) * 100, 1090, 2440) * env(t, 0.3, 0.01, 0.08) * 0.35;
  });
  save(dir, "keys", d);

  // ORGAN: vocal "oh"
  d = render(0.45, (t) => formant(t, 300, 870, 2240, 50, 70, 90) * env(t, 0.45, 0.008, 0.15) * 0.3);
  save(dir, "organ", d);

  // VOX1: beatbox vocal "ah"
  d = render(0.3, (t) => formant(t, 730, 1090, 2440) * env(t, 0.3, 0.015, 0.08) * 0.4);
  save(dir, "vox1", d);

  // VOX2: vocal scratch — "wicka wicka"
  d = render(0.25, (t) => {
    const scratch = Math.sin(2 * Math.PI * (600 + Math.sin(t * 40) * 400) * t);
    return scratch * env(t, 0.25, 0.005, 0.06) * 0.35;
  });
  save(dir, "vox2", d);

  // RISER: vocal build — "ahhhh"
  d = render(1.5, (t) => {
    const lift = t / 1.5;
    const f = 200 + lift * 400;
    return formant(t, 730, 1090 + lift * 500, 2440) * lift * env(t, 1.5, 0.05, 1) * 0.3;
  });
  save(dir, "riser", d);

  // IMPACT: vocal "boom"
  d = render(0.8, (t) => {
    const f = 70 * Math.exp(-t * 8);
    return Math.sin(2 * Math.PI * f * t) * env(t, 0.8, 0.003, 0.25) * 0.6;
  });
  lowpass(d, 800); save(dir, "impact", d);

  // SWEEP: breath sweep
  d = render(1.5, (t) => noise() * env(t, 1.5, 0.05, 0.6) * 0.3);
  bandpass(d, 800, 6000); save(dir, "sweep", d);

  // BRASS: vocal brass — "bah"
  d = render(0.35, (t) => formant(t, 730, 1090, 2440) * env(t, 0.35, 0.005, 0.1) * 0.38);
  save(dir, "brass", d);

  // SYNTH: vocal synth — "wee"
  d = render(0.3, (t) => {
    const f = 500 + Math.sin(t * 15) * 200;
    return formant(t, f, f * 1.5, f * 3) * env(t, 0.3, 0.004, 0.08) * 0.35;
  });
  save(dir, "synth", d);

  // LOOP: beatbox loop
  d = render(1.6, (t) => {
    const step = Math.floor(t * 8) % 8;
    const types = ["kick1", "hat-c1", "snare1", "hat-c1", "kick2", "hat-c2", "snare2", "hat-c1"];
    const local = (t * 8) % 1;
    // Simple representation: alternating kick/snare with hat
    const isKick = step === 0 || step === 4;
    const isSnare = step === 2 || step === 6;
    if (isKick) return Math.sin(2 * Math.PI * 70 * Math.exp(-local * 15) * local) * env(local, 1, 0.01, 0.2) * 0.5;
    if (isSnare) return noise() * env(local, 1, 0.01, 0.15) * 0.4;
    return noise() * env(local, 1, 0.005, 0.08) * 0.25;
  });
  save(dir, "loop", d);
  process.stdout.write("\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNK — slap bass, wah guitar, tight drums, brass stabs, clavinet
// ═══════════════════════════════════════════════════════════════════════════════
function funk(dir) {
  let d;
  // Wah effect: sweeping bandpass
  const wah = (d, center = 1200, width = 800, rate = 4) => {
    for (let i = 0; i < d.length; i++) {
      const t = i / SR;
      const f = center + Math.sin(2 * Math.PI * rate * t) * width * 0.5;
      // Simple resonant filter approximation
      const w = 2 * Math.PI * f / SR;
      d[i] *= 0.5 + 0.5 * Math.cos(w * (i % Math.floor(SR / f)));
    }
    return d;
  };

  // KICK: tight, punchy funk kick
  d = render(0.2, (t) => {
    const f = 65 * Math.exp(-t * 22);
    const click = t < 0.003 ? noise() * (1 - t / 0.003) * 0.5 : 0;
    return (Math.sin(2 * Math.PI * f * t) * env(t, 0.2, 0.001, 0.05) + click) * 0.92;
  });
  lowpass(d, 3500); saturate(d, 2); compress(d, -8, 4); save(dir, "kick1", d);

  // KICK2: deeper funk kick
  d = render(0.3, (t) => {
    const f = 50 * Math.exp(-t * 16);
    return Math.sin(2 * Math.PI * f * t) * env(t, 0.3, 0.002, 0.08) * 0.88;
  });
  lowpass(d, 2500); saturate(d, 2.5); save(dir, "kick2", d);

  // SNARE1: tight funk snare — snap + body
  d = render(0.18, (t) => {
    const body = Math.sin(2 * Math.PI * 210 * t) * Math.exp(-t * 32) * 0.5;
    const snap = Math.sin(2 * Math.PI * 4500 * t) * Math.exp(-t * 120) * 0.35;
    const rattle = noise() * env(t, 0.18, 0.001, 0.03) * 0.6;
    return body + snap + rattle;
  });
  highpass(d, 200); saturate(d, 2); save(dir, "snare1", d);

  // SNARE2: ghost note snare
  d = render(0.12, (t) => {
    const body = Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 35) * 0.4;
    return body + noise() * env(t, 0.12, 0.001, 0.02) * 0.5;
  });
  highpass(d, 250); save(dir, "snare2", d);

  // CLAP: tight funk clap
  d = render(0.15, (t) => {
    let v = 0; for (const h of [0, 0.008, 0.017, 0.027]) if (t > h) v += noise() * Math.exp(-((t - h) * 55)) * 0.4;
    return v;
  });
  bandpass(d, 700, 5000); saturate(d, 2); save(dir, "clap", d);

  // RIM: woody rim
  d = render(0.07, (t) => (Math.sin(2 * Math.PI * 1100 * t) + Math.sin(2 * Math.PI * 2200 * t) * 0.35) * env(t, 0.07, 0.0003, 0.012));
  save(dir, "rim", d);

  // HAT-C1: tight, crisp
  d = render(0.04, (t) => (noise() * 0.65 + Math.sin(2 * Math.PI * 9500 * t) * 0.18) * env(t, 0.04, 0.0002, 0.008));
  highpass(d, 6000); save(dir, "hat-c1", d);

  // HAT-C2: slightly different
  d = render(0.035, (t) => (noise() * 0.6 + Math.sin(2 * Math.PI * 10500 * t) * 0.15) * env(t, 0.035, 0.0002, 0.007));
  highpass(d, 5500); save(dir, "hat-c2", d);

  // HAT-O1: open, bright
  d = render(0.3, (t) => (noise() * 0.5 + Math.sin(2 * Math.PI * 8000 * t) * 0.18) * env(t, 0.3, 0.001, 0.12));
  highpass(d, 4500); save(dir, "hat-o1", d);

  // HAT-O2: longer, sizzly
  d = render(0.4, (t) => (noise() * 0.55 + Math.sin(2 * Math.PI * 7000 * t) * 0.15) * env(t, 0.4, 0.001, 0.16));
  highpass(d, 4000); save(dir, "hat-o2", d);

  // TOM: tight funk tom
  d = render(0.22, (t) => { const f = 130 * Math.exp(-t * 10); return Math.sin(2 * Math.PI * f * t) * env(t, 0.22, 0.002, 0.055) * 0.6; });
  lowpass(d, 2000); save(dir, "tom-lo", d);
  d = render(0.18, (t) => { const f = 200 * Math.exp(-t * 12); return Math.sin(2 * Math.PI * f * t) * env(t, 0.18, 0.002, 0.045) * 0.55; });
  lowpass(d, 2500); save(dir, "tom-mid", d);
  d = render(0.15, (t) => { const f = 300 * Math.exp(-t * 14); return Math.sin(2 * Math.PI * f * t) * env(t, 0.15, 0.001, 0.035) * 0.5; });
  lowpass(d, 3000); save(dir, "tom-hi", d);

  // CRASH: bright crash
  d = render(1.0, (t) => noise() * env(t, 1.0, 0.001, 0.35) * 0.45);
  highpass(d, 3000); save(dir, "crash", d);

  // RIDE: bright ride ping
  d = render(0.5, (t) => (Math.sin(2 * Math.PI * 3500 * t) * 0.3 + Math.sin(2 * Math.PI * 5500 * t) * 0.15 + noise() * 0.08) * env(t, 0.5, 0.001, 0.18));
  highpass(d, 2500); save(dir, "ride", d);

  // TAMBO: funk tambourine
  d = render(0.15, (t) => (noise() * 0.5 + Math.sin(2 * Math.PI * 5000 * t) * 0.2) * env(t, 0.15, 0.001, 0.035));
  highpass(d, 3000); save(dir, "tambo", d);

  // 808: funk bass — slap-style
  d = render(0.5, (t) => {
    const f = 55;
    const slap = t < 0.008 ? Math.sin(2 * Math.PI * 200 * t) * (1 - t / 0.008) * 0.4 : 0;
    return (Math.sin(2 * Math.PI * f * t) * 0.7 + slap) * env(t, 0.5, 0.004, 0.15) * 0.85;
  });
  lowpass(d, 800); saturate(d, 3); save(dir, "808", d);

  // SUB: sub bass
  d = render(0.5, (t) => Math.sin(2 * Math.PI * 45 * t) * env(t, 0.5, 0.018, 0.2) * 0.82);
  lowpass(d, 120); save(dir, "sub", d);

  // BASS: SLAP BASS — the signature funk sound
  d = render(0.4, (t) => {
    const f = 73.42;
    const slap = t < 0.01 ? Math.sin(2 * Math.PI * f * 4 * t) * (1 - t / 0.01) * 0.5 : 0;
    const body = Math.sin(2 * Math.PI * f * t) * 0.65;
    const pop = Math.sin(2 * Math.PI * f * 2 * t) * Math.exp(-t * 20) * 0.2;
    return (slap + body + pop) * env(t, 0.4, 0.003, 0.1) * 0.82;
  });
  lowpass(d, 1500); saturate(d, 2.5); save(dir, "bass", d);

  // CHORD: funk chord stab — bright
  d = render(0.2, (t) => {
    const f = 293.66; // D major
    return (Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * f * 1.26 * t) * 0.4 + Math.sin(2 * Math.PI * f * 1.5 * t) * 0.22) * env(t, 0.2, 0.002, 0.05) * 0.42;
  });
  saturate(d, 1.5); save(dir, "chord", d);

  // PAD: funk pad — warm
  d = render(1.5, (t) => (Math.sin(2 * Math.PI * 220 * t) * 0.2 + Math.sin(2 * Math.PI * 277 * t) * 0.15 + Math.sin(2 * Math.PI * 330 * t) * 0.1) * env(t, 1.5, 0.08, 0.6) * 0.3);
  save(dir, "pad", d);

  // BELL: clavinet bell
  d = render(0.5, (t) => (Math.sin(2 * Math.PI * 1047 * t) * 0.32 + Math.sin(2 * Math.PI * 2093 * t) * 0.14) * env(t, 0.5, 0.001, 0.18) * 0.4);
  save(dir, "bell", d);

  // KEYS: clavinet — bright, plucky
  d = render(0.3, (t) => {
    const f = 440;
    return (Math.sin(2 * Math.PI * f * t) * 0.35 + Math.sin(2 * Math.PI * f * 2 * t) * 0.15 + Math.sin(2 * Math.PI * f * 3 * t) * 0.06) * env(t, 0.3, 0.002, 0.07) * 0.4;
  });
  saturate(d, 1.5); save(dir, "keys", d);

  // ORGAN: Hammond-style
  d = render(0.5, (t) => (Math.sin(2 * Math.PI * 262 * t) * 0.28 + Math.sin(2 * Math.PI * 330 * t) * 0.16 + Math.sin(2 * Math.PI * 392 * t) * 0.08 + Math.sin(2 * Math.PI * 524 * t) * 0.04) * env(t, 0.5, 0.006, 0.15) * 0.35);
  save(dir, "organ", d);

  // VOX1: funk vocal — "hey"
  d = render(0.3, (t) => (Math.sin(2 * Math.PI * 350 * t) * 0.32 + Math.sin(2 * Math.PI * 525 * t) * 0.16 + noise() * 0.06) * env(t, 0.3, 0.012, 0.08) * 0.45);
  save(dir, "vox1", d);

  // VOX2: funk shout
  d = render(0.25, (t) => (Math.sin(2 * Math.PI * 280 * t) * 0.28 + Math.sin(2 * Math.PI * 420 * t) * 0.14 + noise() * 0.05) * env(t, 0.25, 0.01, 0.06));
  save(dir, "vox2", d);

  // RISER: brass riser
  d = render(1.5, (t) => { const lift = t / 1.5; return (Math.sin(2 * Math.PI * (300 + lift * lift * 2500) * t) * 0.2 + noise() * 0.1) * lift * lift * env(t, 1.5, 0.04, 1); });
  save(dir, "riser", d);

  // IMPACT: funk impact
  d = render(0.8, (t) => (Math.sin(2 * Math.PI * 60 * t) * 0.5 + noise() * 0.1) * env(t, 0.8, 0.002, 0.25));
  saturate(d, 2); save(dir, "impact", d);

  // SWEEP: wah sweep
  d = render(1.5, (t) => noise() * env(t, 1.5, 0.05, 0.6) * 0.35);
  save(dir, "sweep", d);

  // BRASS: funk brass stab — tight, bright
  d = render(0.35, (t) => (Math.sin(2 * Math.PI * 330 * t) * 0.35 + Math.sin(2 * Math.PI * 660 * t) * 0.2 + Math.sin(2 * Math.PI * 990 * t) * 0.08) * env(t, 0.35, 0.004, 0.1) * 0.45);
  saturate(d, 2); save(dir, "brass", d);

  // SYNTH: wah synth
  d = render(0.3, (t) => {
    const f = 440 + Math.sin(t * 8) * 200;
    return (Math.sin(2 * Math.PI * f * t) + noise() * 0.1) * env(t, 0.3, 0.003, 0.08) * 0.4;
  });
  wah(d, 1200, 800, 4); save(dir, "synth", d);

  // LOOP: funk groove
  d = render(1.6, (t) => {
    const step = Math.floor(t * 8) % 8;
    const f = [146.83, 164.81, 196, 220, 246.94, 220, 196, 164.81][step];
    const local = (t * 8) % 1;
    return (Math.sin(2 * Math.PI * f * t) * 0.25 + Math.sin(2 * Math.PI * f * 2 * t) * 0.06) * env(local, 1, 0.01, 0.18);
  });
  save(dir, "loop", d);
  process.stdout.write("\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
const base = join(process.cwd(), "public", "samples");
const packs = [
  { name: "trap-pro", fn: trap },
  { name: "boom-bap", fn: boomBap },
  { name: "drill", fn: drill },
  { name: "lofi", fn: lofi },
  { name: "reggaeton", fn: reggaeton },
  { name: "house", fn: house },
  { name: "glitch", fn: glitch },
  { name: "8bit", fn: eightBit },
  { name: "beatbox", fn: beatbox },
  { name: "funk", fn: funk },
];
for (const p of packs) {
  const dir = join(base, p.name);
  mkdirSync(dir, { recursive: true });
  _currentPack = p.name;
  process.stdout.write(`${p.name}:\n`);
  p.fn(dir);
}
console.log(`Generated ${packs.length * 32} samples`);
