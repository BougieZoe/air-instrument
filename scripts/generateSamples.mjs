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
function save(dir, name, data) {
  writeFileSync(join(dir, `${name}.wav`), wav(data));
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
const base = join(process.cwd(), "public", "samples");
const packs = [
  { name: "trap-pro", fn: trap },
  { name: "boom-bap", fn: boomBap },
  { name: "drill", fn: drill },
];
for (const p of packs) {
  const dir = join(base, p.name);
  mkdirSync(dir, { recursive: true });
  process.stdout.write(`${p.name}:\n`);
  p.fn(dir);
}
console.log(`Generated ${packs.length * 32} samples`);
