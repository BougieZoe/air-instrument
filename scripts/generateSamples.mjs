/**
 * scripts/generateSamples.mjs
 *
 * 32-pad MPC-style drum kits × 3 genre packs = 96 samples total.
 * Each pack has genre-specific style bus processing.
 *
 * Pad layout (per pack):
 *  Row 1: KICK1 KICK2 SNARE1 SNARE2 CLAP RIM HAT-C1 HAT-C2
 *  Row 2: HAT-O1 HAT-O2 TOM-LO TOM-MID TOM-HI CRASH RIDE TAMBO
 *  Row 3: 808 SUB BASS CHORD PAD BELL KEYS ORGAN
 *  Row 4: VOX1 VOX2 RISER IMPACT SWEEP BRASS SYNTH LOOP
 *
 * Usage:  node scripts/generateSamples.mjs
 * Output: public/samples/{trap-pro,boom-bap,drill}/
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SR = 44100;
const clamp = (v) => Math.max(-1, Math.min(1, v));

// ─── DSP ────────────────────────────────────────────────────────────────────
const env = (t, dur, atk = 0.005, dec = 0.18) => {
  if (t < atk) return t / atk;
  if (t > dur) return 0;
  return Math.exp(-((t - atk) / Math.max(0.001, dec))) * (1 - t / dur);
};
const noise = () => Math.random() * 2 - 1;

function reverb(data, { preMs = 15, shortMs = 40, shortGain = 0.2, longMs = 90, longGain = 0.1 } = {}) {
  const out = new Float32Array(data.length + longMs * SR / 1000 | 0);
  out.set(data);
  const pre = preMs * SR / 1000 | 0, s = shortMs * SR / 1000 | 0, l = longMs * SR / 1000 | 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] !== 0) {
      if (i + pre < out.length) out[i + pre] += data[i] * shortGain;
      if (i + s < out.length)   out[i + s]   += data[i] * longGain;
      if (i + l < out.length)   out[i + l]   += data[i] * longGain * 0.5;
    }
  }
  return out;
}

function saturate(data, drive = 3) { for (let i = 0; i < data.length; i++) data[i] = Math.tanh(data[i] * drive) / Math.tanh(drive); return data; }

function lowpass(data, freq, Q = 0.7) {
  const w0 = 2 * Math.PI * freq / SR, alpha = Math.sin(w0) / (2 * Q);
  const b0 = (1 - Math.cos(w0)) / 2, b1 = 1 - Math.cos(w0), b2 = b0;
  const a0 = 1 + alpha, a1 = -2 * Math.cos(w0), a2 = 1 - alpha;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < data.length; i++) {
    const y0 = (b0 * data[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = data[i]; y2 = y1; y1 = y0; data[i] = y0;
  }
  return data;
}

function highpass(data, freq, Q = 0.7) {
  const lp = new Float32Array(data); lowpass(lp, freq, Q);
  for (let i = 0; i < data.length; i++) data[i] -= lp[i];
  return data;
}

function bandpass(data, lo, hi, Q = 0.7) { lowpass(data, hi, Q); highpass(data, lo, Q); return data; }

function eq(data, freq, gainDB, Q = 1.0) {
  const A = Math.pow(10, gainDB / 40), w0 = 2 * Math.PI * freq / SR, alpha = Math.sin(w0) / (2 * Q);
  const b0 = 1 + alpha * A, b1 = -2 * Math.cos(w0), b2 = 1 - alpha * A;
  const a0 = 1 + alpha / A, a1 = -2 * Math.cos(w0), a2 = 1 - alpha / A;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < data.length; i++) {
    const y0 = (b0 * data[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = data[i]; y2 = y1; y1 = y0; data[i] = y0;
  }
  return data;
}

function compress(data, { threshold = -12, ratio = 4, attack = 0.003, release = 0.1 } = {}) {
  const tLin = Math.pow(10, threshold / 20), att = 1 - Math.exp(-1 / (attack * SR)), rel = 1 - Math.exp(-1 / (release * SR));
  let env = 0;
  for (let i = 0; i < data.length; i++) {
    const abs = Math.abs(data[i]); env += (abs - env) * (abs > env ? att : rel);
    const over = (env - tLin) / tLin;
    data[i] *= over > 0 ? 1 + (1 / ratio - 1) * Math.min(1, over) : 1;
  }
  return data;
}

function render(duration, fn) {
  const len = Math.floor(duration * SR), data = new Float32Array(len);
  for (let i = 0; i < len; i++) data[i] = clamp(fn(i / SR, i, len));
  return data;
}

function encodeWav(samples) {
  const len = Math.min(samples.length, SR * 4);
  const buf = Buffer.alloc(44 + len * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + len * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(len * 2, 40);
  for (let i = 0; i < len; i++) buf.writeInt16LE(Math.round(clamp(samples[i]) * 32767), 44 + i * 2);
  return buf;
}

function save(dir, name, data) {
  writeFileSync(join(dir, `${name}.wav`), encodeWav(data));
  process.stdout.write(`  ${name} (${(data.length / SR * 1000 | 0)}ms) `);
}

// ─── Style buses ────────────────────────────────────────────────────────────
function styleBus(d, s) {
  if (s === "trap") { eq(d, 3500, 4); eq(d, 80, 3); lowpass(d, 14000); compress(d, { threshold: -10, ratio: 3, attack: 0.001, release: 0.05 }); saturate(d, 1.8); }
  else if (s === "boom-bap") { lowpass(d, 4500); highpass(d, 40); eq(d, 220, 4); eq(d, 800, 2); saturate(d, 3.5); compress(d, { threshold: -6, ratio: 6, attack: 0.001, release: 0.04 }); for (let i = 0; i < d.length; i++) d[i] += Math.random() < 0.01 ? (Math.random() - 0.5) * 0.06 : 0; }
  else if (s === "drill") { lowpass(d, 8000); highpass(d, 30); eq(d, 60, 5); eq(d, 4000, -3); eq(d, 200, -2); saturate(d, 2.2); compress(d, { threshold: -8, ratio: 4, attack: 0.001, release: 0.06 }); }
  return d;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 32-pad kit generators
// ═══════════════════════════════════════════════════════════════════════════════

function genKit(dir, style) {
  const log = (n) => { process.stdout.write(`  ${n}`); };
  const end = () => process.stdout.write("\n");

  // ── Row 1: Core Drums ──

  let d;
  d = render(0.5, (t) => (Math.sin(2 * Math.PI * (55 + 150 * Math.exp(-t * 22)) * t) + (t < 0.006 ? noise() * (1 - t / 0.006) * 0.5 : 0)) * env(t, 0.5, 0.001, 0.15) * 1.1);
  save(dir, "kick1", styleBus(d, style)); log("kick1");

  d = render(0.55, (t) => Math.sin(2 * Math.PI * (45 + 80 * Math.exp(-t * 14)) * t) * env(t, 0.55, 0.002, 0.22) * 1.05);
  save(dir, "kick2", styleBus(d, style)); log("kick2");

  d = render(0.32, (t) => (Math.sin(2 * Math.PI * 200 * t) * env(t, 0.32, 0.001, 0.07) * 0.4 + Math.sin(2 * Math.PI * 3500 * t) * Math.exp(-t * 70) * 0.3 + noise() * env(t, 0.32, 0.001, 0.045) * 0.6));
  save(dir, "snare1", styleBus(d, style)); log("snare1");

  d = render(0.38, (t) => (Math.sin(2 * Math.PI * 175 * t) * env(t, 0.38, 0.001, 0.09) * 0.5 + noise() * env(t, 0.38, 0.001, 0.06) * 0.55 + Math.sin(2 * Math.PI * 2800 * t) * Math.exp(-t * 55) * 0.2));
  save(dir, "snare2", styleBus(d, style)); log("snare2");

  d = render(0.28, (t) => { let v = 0; for (const h of [0, 0.011, 0.022, 0.035]) if (t > h) v += noise() * Math.exp(-((t - h) * 45)) * 0.45; return v; });
  save(dir, "clap", styleBus(d, style)); log("clap");

  d = render(0.14, (t) => (Math.sin(2 * Math.PI * 950 * t) + Math.sin(2 * Math.PI * 1900 * t) * 0.45) * env(t, 0.14, 0.0005, 0.03));
  save(dir, "rim", styleBus(d, style)); log("rim");

  d = render(0.07, (t) => (noise() * 0.7 + Math.sin(2 * Math.PI * 9000 * t) * 0.15) * env(t, 0.07, 0.0005, 0.015));
  save(dir, "hat-c1", styleBus(d, style)); log("hat-c1");

  d = render(0.06, (t) => (noise() * 0.65 + Math.sin(2 * Math.PI * 11000 * t) * 0.12) * env(t, 0.06, 0.0003, 0.012));
  save(dir, "hat-c2", styleBus(d, style)); log("hat-c2");

  end();

  // ── Row 2: Hats + Percussion ──

  d = render(0.45, (t) => (noise() * 0.5 + Math.sin(2 * Math.PI * 7500 * t) * 0.18) * env(t, 0.45, 0.002, 0.18));
  save(dir, "hat-o1", styleBus(d, style)); log("hat-o1");

  d = render(0.55, (t) => (noise() * 0.55 + Math.sin(2 * Math.PI * 6200 * t) * 0.2) * env(t, 0.55, 0.002, 0.22));
  save(dir, "hat-o2", styleBus(d, style)); log("hat-o2");

  d = render(0.4, (t) => { const f = 95 + 50 * Math.exp(-t * 6); return (Math.sin(2 * Math.PI * f * t) * 0.6 + noise() * 0.06) * env(t, 0.4, 0.002, 0.12); });
  save(dir, "tom-lo", styleBus(d, style)); log("tom-lo");

  d = render(0.35, (t) => { const f = 150 + 60 * Math.exp(-t * 7); return (Math.sin(2 * Math.PI * f * t) * 0.6 + noise() * 0.06) * env(t, 0.35, 0.002, 0.1); });
  save(dir, "tom-mid", styleBus(d, style)); log("tom-mid");

  d = render(0.3, (t) => { const f = 220 + 80 * Math.exp(-t * 8); return (Math.sin(2 * Math.PI * f * t) * 0.55 + noise() * 0.05) * env(t, 0.3, 0.002, 0.08); });
  save(dir, "tom-hi", styleBus(d, style)); log("tom-hi");

  d = render(1.4, (t) => noise() * env(t, 1.4, 0.001, 0.5) * 0.5);
  save(dir, "crash", styleBus(d, style)); log("crash");

  d = render(0.6, (t) => (Math.sin(2 * Math.PI * 3200 * t) * 0.3 + Math.sin(2 * Math.PI * 5000 * t) * 0.18 + noise() * 0.12) * env(t, 0.6, 0.001, 0.2));
  save(dir, "ride", styleBus(d, style)); log("ride");

  d = render(0.25, (t) => (noise() * 0.5 + Math.sin(2 * Math.PI * 4200 * t) * 0.25) * env(t, 0.25, 0.001, 0.06));
  save(dir, "tambo", styleBus(d, style)); log("tambo");

  end();

  // ── Row 3: Bass + Melodic ──

  d = render(1.8, (t) => Math.tanh(Math.sin(2 * Math.PI * (50 - t * 10) * t) * 2.8) * env(t, 1.8, 0.005, 0.7) * 0.9);
  save(dir, "808", styleBus(d, style)); log("808");

  d = render(1.0, (t) => Math.sin(2 * Math.PI * 48 * t) * env(t, 1.0, 0.02, 0.45) * 0.85);
  save(dir, "sub", styleBus(d, style)); log("sub");

  d = render(0.5, (t) => Math.sin(2 * Math.PI * 73.42 * t) * env(t, 0.5, 0.003, 0.14) * 0.8);
  save(dir, "bass", styleBus(d, style)); log("bass");

  d = render(0.35, (t) => { const f = 220; return (Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * f * 1.26 * t) * 0.55 + Math.sin(2 * Math.PI * f * 1.5 * t) * 0.35) * env(t, 0.35, 0.005, 0.1) * 0.5; });
  save(dir, "chord", styleBus(d, style)); log("chord");

  d = render(1.2, (t) => (Math.sin(2 * Math.PI * 220 * t) * 0.3 + Math.sin(2 * Math.PI * 330 * t) * 0.2 + Math.sin(2 * Math.PI * 440 * t) * 0.1) * env(t, 1.2, 0.04, 0.5) * 0.4);
  save(dir, "pad", styleBus(d, style)); log("pad");

  d = render(1.0, (t) => (Math.sin(2 * Math.PI * 880 * t) * 0.4 + Math.sin(2 * Math.PI * 1760 * t) * 0.2 + Math.sin(2 * Math.PI * 2640 * t) * 0.1) * env(t, 1.0, 0.001, 0.4) * 0.55);
  save(dir, "bell", styleBus(d, style)); log("bell");

  d = render(0.5, (t) => (Math.sin(2 * Math.PI * 330 * t) * 0.35 + Math.sin(2 * Math.PI * 660 * t) * 0.2 + Math.sin(2 * Math.PI * 990 * t) * 0.1) * env(t, 0.5, 0.003, 0.15) * 0.5);
  save(dir, "keys", styleBus(d, style)); log("keys");

  d = render(0.6, (t) => (Math.sin(2 * Math.PI * 262 * t) * 0.3 + Math.sin(2 * Math.PI * 330 * t) * 0.2 + Math.sin(2 * Math.PI * 392 * t) * 0.15) * env(t, 0.6, 0.008, 0.2) * 0.45);
  save(dir, "organ", styleBus(d, style)); log("organ");

  end();

  // ── Row 4: FX + Vocal + Loop ──

  d = render(0.7, (t) => (Math.sin(2 * Math.PI * 230 * t) * 0.35 + Math.sin(2 * Math.PI * 350 * t) * 0.22 + Math.sin(2 * Math.PI * 500 * t) * 0.12) * (1 + Math.sin(t * 6) * 0.008) * env(t, 0.7, 0.025, 0.28));
  save(dir, "vox1", styleBus(d, style)); log("vox1");

  d = render(0.6, (t) => (Math.sin(2 * Math.PI * 175 * t) * 0.3 + Math.sin(2 * Math.PI * 262 * t) * 0.18 + noise() * 0.08) * env(t, 0.6, 0.02, 0.22));
  save(dir, "vox2", styleBus(d, style)); log("vox2");

  d = render(1.5, (t) => { const lift = t / 1.5; return (Math.sin(2 * Math.PI * (250 + lift * lift * 2200) * t) * 0.25 + noise() * 0.15) * lift * lift * env(t, 1.5, 0.05, 1.1); });
  save(dir, "riser", styleBus(d, style)); log("riser");

  d = render(1.2, (t) => { const f = 80 - t * 35; return (Math.sin(2 * Math.PI * f * t) * 0.6 + noise() * 0.12) * env(t, 1.2, 0.002, 0.45); });
  save(dir, "impact", styleBus(d, style)); log("impact");

  d = render(1.8, (t) => noise() * env(t, 1.8, 0.06, 0.7) * 0.45);
  save(dir, "sweep", styleBus(d, style)); log("sweep");

  d = render(0.55, (t) => (Math.sin(2 * Math.PI * 280 * t) * 0.38 + Math.sin(2 * Math.PI * 560 * t) * 0.22 + Math.sin(2 * Math.PI * 840 * t) * 0.1) * env(t, 0.55, 0.006, 0.18) * 0.5);
  save(dir, "brass", styleBus(d, style)); log("brass");

  d = render(0.5, (t) => (Math.sin(2 * Math.PI * (400 + Math.sin(t * 18) * 180) * t) + noise() * 0.18) * env(t, 0.5, 0.008, 0.16) * 0.5);
  save(dir, "synth", styleBus(d, style)); log("synth");

  d = render(1.4, (t) => {
    const step = Math.floor(t * 8) % 8;
    const f = [110, 146.83, 164.81, 196, 220, 196, 164.81, 146.83][step];
    const local = (t * 8) % 1;
    return (Math.sin(2 * Math.PI * f * t) * 0.3 + Math.sin(2 * Math.PI * f * 2 * t) * 0.1) * env(local, 1, 0.01, 0.18);
  });
  save(dir, "loop", styleBus(d, style)); log("loop");

  end();
}

// ═══════════════════════════════════════════════════════════════════════════════
const base = join(process.cwd(), "public", "samples");
const packs = [
  { name: "trap-pro", style: "trap" },
  { name: "boom-bap", style: "boom-bap" },
  { name: "drill", style: "drill" },
];

for (const pack of packs) {
  const dir = join(base, pack.name);
  mkdirSync(dir, { recursive: true });
  process.stdout.write(`${pack.name}:\n`);
  genKit(dir, pack.style);
}
console.log(`\nGenerated ${packs.length * 32} samples (32 per pack)`);
