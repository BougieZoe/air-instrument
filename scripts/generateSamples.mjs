/**
 * scripts/generateSamples.mjs
 *
 * High-quality procedural drum synthesis with strong genre differentiation.
 * Each pack gets a unique "style bus" that shapes the final sound.
 *
 * TRAP PRO  → bright transients, crispy highs, aggressive punch
 * BOOM BAP  → warm/muddy lows, rolled-off highs, vinyl saturation
 * DRILL     → dark/menacing, deep 808s, sharp metallic hats
 *
 * Usage:  node scripts/generateSamples.mjs
 * Output: public/samples/{trap-pro,boom-bap,drill}/
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SR = 44100;
const clamp = (v) => Math.max(-1, Math.min(1, v));

// ─── DSP helpers ────────────────────────────────────────────────────────────
const env = (t, dur, atk = 0.005, dec = 0.18) => {
  if (t < atk) return t / atk;
  if (t > dur) return 0;
  return Math.exp(-((t - atk) / Math.max(0.001, dec))) * (1 - t / dur);
};
const noise = () => Math.random() * 2 - 1;

function reverb(data, { preMs = 18, shortMs = 45, shortGain = 0.28, longMs = 120, longGain = 0.14 } = {}) {
  const out = new Float32Array(data.length + longMs * SR / 1000 | 0);
  out.set(data);
  const pre = preMs * SR / 1000 | 0;
  const s = shortMs * SR / 1000 | 0;
  const l = longMs * SR / 1000 | 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] !== 0) {
      if (i + pre < out.length) out[i + pre] += data[i] * shortGain;
      if (i + s < out.length)   out[i + s]   += data[i] * longGain;
      if (i + l < out.length)   out[i + l]   += data[i] * longGain * 0.6;
    }
  }
  return out;
}

function saturate(data, drive = 3) {
  for (let i = 0; i < data.length; i++) data[i] = Math.tanh(data[i] * drive) / Math.tanh(drive);
  return data;
}

function lowpass(data, freq, Q = 0.7) {
  const w0 = 2 * Math.PI * freq / SR;
  const alpha = Math.sin(w0) / (2 * Q);
  const b0 = (1 - Math.cos(w0)) / 2, b1 = 1 - Math.cos(w0), b2 = b0;
  const a0 = 1 + alpha, a1 = -2 * Math.cos(w0), a2 = 1 - alpha;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < data.length; i++) {
    const y0 = (b0 * data[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = data[i]; y2 = y1; y1 = y0;
    data[i] = y0;
  }
  return data;
}

function highpass(data, freq, Q = 0.7) {
  const lp = new Float32Array(data);
  lowpass(lp, freq, Q);
  for (let i = 0; i < data.length; i++) data[i] -= lp[i];
  return data;
}

function bandpass(data, low, high, Q = 0.7) {
  lowpass(data, high, Q);
  highpass(data, low, Q);
  return data;
}

function compress(data, { threshold = -12, ratio = 4, knee = 6, attack = 0.003, release = 0.1 } = {}) {
  const threshLin = Math.pow(10, threshold / 20);
  const kneeLin = Math.pow(10, knee / 20);
  const attCoeff = 1 - Math.exp(-1 / (attack * SR));
  const relCoeff = 1 - Math.exp(-1 / (release * SR));
  let envelope = 0;
  for (let i = 0; i < data.length; i++) {
    const abs = Math.abs(data[i]);
    envelope += (abs - envelope) * (abs > envelope ? attCoeff : relCoeff);
    const overThreshold = (envelope - threshLin) / threshLin;
    data[i] *= overThreshold > 0 ? 1 + (1 / ratio - 1) * Math.min(1, overThreshold / (kneeLin - 1)) : 1;
  }
  return data;
}

/** Parametric EQ boost/cut at a frequency */
function eq(data, freq, gainDB, Q = 1.0) {
  const A = Math.pow(10, gainDB / 40);
  const w0 = 2 * Math.PI * freq / SR;
  const alpha = Math.sin(w0) / (2 * Q);
  const b0 = 1 + alpha * A;
  const b1 = -2 * Math.cos(w0);
  const b2 = 1 - alpha * A;
  const a0 = 1 + alpha / A;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha / A;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < data.length; i++) {
    const y0 = (b0 * data[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = data[i]; y2 = y1; y1 = y0;
    data[i] = y0;
  }
  return data;
}

function render(name, duration, fn) {
  const len = Math.floor(duration * SR);
  const data = new Float32Array(len);
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
  process.stdout.write(`  ${name} (${(data.length / SR * 1000 | 0)}ms)\n`);
}

/** Apply a genre-specific "style bus" to every sample in a pack */
function applyStyleBus(data, style) {
  if (style === "trap") {
    // TRAP: bright, aggressive, punchy
    eq(data, 3500, 4);        // boost highs for crispy hats
    eq(data, 80, 3);          // boost sub for 808 weight
    lowpass(data, 14000);     // slight top roll
    compress(data, { threshold: -10, ratio: 3, attack: 0.001, release: 0.05 });
    saturate(data, 1.8);
  } else if (style === "boom-bap") {
    // BOOM BAP: warm, dusty, lo-fi, vinyl character
    lowpass(data, 4500);      // heavy high cut = muffled/lo-fi
    highpass(data, 40);       // remove sub rumble
    eq(data, 220, 4);         // boost warm mids
    eq(data, 800, 2);         // body
    saturate(data, 3.5);      // heavy saturation = grit
    compress(data, { threshold: -6, ratio: 6, attack: 0.001, release: 0.04 }); // squash it
    // vinyl noise texture
    for (let i = 0; i < data.length; i++) {
      data[i] += (Math.random() < 0.01 ? (Math.random() - 0.5) * 0.06 : 0);
    }
  } else if (style === "drill") {
    // DRILL: dark, menacing, deep sub, metallic
    lowpass(data, 8000);      // cut highs for darkness
    highpass(data, 30);       // keep deep sub
    eq(data, 60, 5);          // massive sub boost
    eq(data, 4000, -3);       // cut presence = dark
    eq(data, 200, -2);        // cut warmth = cold
    saturate(data, 2.2);
    compress(data, { threshold: -8, ratio: 4, attack: 0.001, release: 0.06 });
  }
  return data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRAP PRO — bright transients, crispy hats, aggressive 808
// ═══════════════════════════════════════════════════════════════════════════════
function generateTrapPro(dir) {
  process.stdout.write("trap-pro:\n");

  let d;
  d = render("kick", 0.5, (t) => {
    const f = 55 + 150 * Math.exp(-t * 22);
    return (Math.sin(2 * Math.PI * f * t) * env(t, 0.5, 0.001, 0.15) +
            (t < 0.006 ? noise() * (1 - t / 0.006) * 0.5 : 0)) * 1.1;
  });
  save(dir, "kick", applyStyleBus(d, "trap"));

  d = render("snare", 0.35, (t) => {
    return (Math.sin(2 * Math.PI * 200 * t) * env(t, 0.35, 0.001, 0.08) * 0.4 +
            Math.sin(2 * Math.PI * 3500 * t) * Math.exp(-t * 70) * 0.35 +
            noise() * env(t, 0.35, 0.001, 0.05) * 0.6);
  });
  save(dir, "snare", applyStyleBus(d, "trap"));

  d = render("clap", 0.3, (t) => {
    let v = 0; for (const h of [0, 0.011, 0.022, 0.035]) if (t > h) v += noise() * Math.exp(-((t - h) * 45)) * 0.45;
    return v;
  });
  save(dir, "clap", applyStyleBus(d, "trap"));

  d = render("closed-hat", 0.07, (t) => (noise() * 0.7 + Math.sin(2 * Math.PI * 9000 * t) * 0.15) * env(t, 0.07, 0.0005, 0.015));
  save(dir, "closed-hat", applyStyleBus(d, "trap"));

  d = render("open-hat", 0.5, (t) => (noise() * 0.5 + Math.sin(2 * Math.PI * 7500 * t) * 0.18) * env(t, 0.5, 0.002, 0.2));
  save(dir, "open-hat", applyStyleBus(d, "trap"));

  d = render("808", 1.8, (t) => Math.tanh(Math.sin(2 * Math.PI * (50 - t * 10) * t) * 2.8) * env(t, 1.8, 0.005, 0.7) * 0.9);
  save(dir, "808", applyStyleBus(d, "trap"));

  d = render("sub-bass", 1.0, (t) => Math.sin(2 * Math.PI * 48 * t) * env(t, 1.0, 0.02, 0.45) * 0.85);
  save(dir, "sub-bass", applyStyleBus(d, "trap"));

  d = render("perc", 0.2, (t) => (Math.sin(2 * Math.PI * 600 * t) + Math.sin(2 * Math.PI * 1200 * t) * 0.35 + noise() * 0.2) * env(t, 0.2, 0.001, 0.05));
  save(dir, "perc", applyStyleBus(d, "trap"));

  d = render("rim", 0.14, (t) => (Math.sin(2 * Math.PI * 950 * t) + Math.sin(2 * Math.PI * 1900 * t) * 0.45) * env(t, 0.14, 0.0005, 0.03));
  save(dir, "rim", applyStyleBus(d, "trap"));

  d = render("impact", 1.3, (t) => {
    const f = 80 - t * 35;
    return (Math.sin(2 * Math.PI * f * t) * 0.65 + noise() * 0.12) * env(t, 1.3, 0.002, 0.5);
  });
  save(dir, "impact", applyStyleBus(d, "trap"));

  d = render("riser", 1.6, (t) => {
    const lift = t / 1.6;
    return (Math.sin(2 * Math.PI * (250 + lift * lift * 2200) * t) * 0.25 + noise() * 0.15) * lift * lift * env(t, 1.6, 0.05, 1.2);
  });
  save(dir, "riser", applyStyleBus(d, "trap"));

  d = render("fx", 0.6, (t) => (Math.sin(2 * Math.PI * (400 + Math.sin(t * 20) * 200) * t) + noise() * 0.2) * env(t, 0.6, 0.01, 0.22) * 0.5);
  save(dir, "fx", applyStyleBus(d, "trap"));

  d = render("vocal", 0.8, (t) => (Math.sin(2 * Math.PI * 230 * t) * 0.35 + Math.sin(2 * Math.PI * 350 * t) * 0.22 + Math.sin(2 * Math.PI * 500 * t) * 0.12) * (1 + Math.sin(t * 6) * 0.008) * env(t, 0.8, 0.03, 0.32));
  save(dir, "vocal", applyStyleBus(d, "trap"));

  d = render("chop", 0.25, (t) => (Math.sin(2 * Math.PI * 440 * t) + Math.sin(2 * Math.PI * 554 * t) * 0.5 + Math.sin(2 * Math.PI * 659 * t) * 0.3) * env(t, 0.25, 0.003, 0.07) * 0.55);
  save(dir, "chop", applyStyleBus(d, "trap"));

  d = render("loop", 1.4, (t) => {
    const step = Math.floor(t * 8) % 8;
    const f = [110, 146.83, 164.81, 196, 220, 196, 164.81, 146.83][step];
    const local = (t * 8) % 1;
    return (Math.sin(2 * Math.PI * f * t) * 0.3 + Math.sin(2 * Math.PI * f * 2 * t) * 0.1) * env(local, 1, 0.01, 0.18);
  });
  save(dir, "loop", applyStyleBus(d, "trap"));

  d = render("air", 1.0, (t) => (noise() * 0.12 + Math.sin(2 * Math.PI * 660 * t) * 0.1 + Math.sin(2 * Math.PI * 990 * t) * 0.05) * env(t, 1.0, 0.06, 0.45));
  save(dir, "air", applyStyleBus(d, "trap"));
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOOM BAP — warm, dusty, lo-fi, compressed, vinyl character
// ═══════════════════════════════════════════════════════════════════════════════
function generateBoomBap(dir) {
  process.stdout.write("boom-bap:\n");

  let d;
  d = render("kick", 0.45, (t) => {
    const f = 60 + 70 * Math.exp(-t * 12);
    return (Math.sin(2 * Math.PI * f * t) * env(t, 0.45, 0.002, 0.16) +
            Math.sin(2 * Math.PI * 150 * t) * Math.exp(-t * 45) * 0.35);
  });
  save(dir, "kick", applyStyleBus(d, "boom-bap"));

  d = render("snare", 0.3, (t) => {
    return (Math.sin(2 * Math.PI * 170 * t) * env(t, 0.3, 0.001, 0.07) * 0.45 +
            noise() * env(t, 0.3, 0.001, 0.04) * 0.65);
  });
  save(dir, "snare", applyStyleBus(d, "boom-bap"));

  d = render("clap", 0.25, (t) => {
    let v = 0; for (const h of [0, 0.013, 0.026, 0.04]) if (t > h) v += noise() * Math.exp(-((t - h) * 36)) * 0.4;
    return v;
  });
  save(dir, "clap", applyStyleBus(d, "boom-bap"));

  d = render("closed-hat", 0.09, (t) => noise() * env(t, 0.09, 0.001, 0.02) * 0.7);
  save(dir, "closed-hat", applyStyleBus(d, "boom-bap"));

  d = render("open-hat", 0.38, (t) => (noise() * 0.5 + Math.sin(2 * Math.PI * 5800 * t) * 0.12) * env(t, 0.38, 0.002, 0.16));
  save(dir, "open-hat", applyStyleBus(d, "boom-bap"));

  d = render("808", 1.2, (t) => Math.sin(2 * Math.PI * (54 - t * 7) * t) * env(t, 1.2, 0.006, 0.5) * 0.85);
  save(dir, "808", applyStyleBus(d, "boom-bap"));

  d = render("sub-bass", 0.9, (t) => Math.sin(2 * Math.PI * 50 * t) * env(t, 0.9, 0.025, 0.4) * 0.8);
  save(dir, "sub-bass", applyStyleBus(d, "boom-bap"));

  d = render("perc", 0.16, (t) => (Math.sin(2 * Math.PI * 460 * t) + noise() * 0.35) * env(t, 0.16, 0.001, 0.035));
  save(dir, "perc", applyStyleBus(d, "boom-bap"));

  d = render("rim", 0.11, (t) => (Math.sin(2 * Math.PI * 820 * t) + Math.sin(2 * Math.PI * 1550 * t) * 0.35) * env(t, 0.11, 0.0005, 0.022));
  save(dir, "rim", applyStyleBus(d, "boom-bap"));

  d = render("crash", 1.5, (t) => noise() * env(t, 1.5, 0.001, 0.55) * 0.5);
  save(dir, "crash", applyStyleBus(d, "boom-bap"));

  d = render("ride", 0.55, (t) => (Math.sin(2 * Math.PI * 3200 * t) * 0.3 + Math.sin(2 * Math.PI * 5000 * t) * 0.18 + noise() * 0.12) * env(t, 0.55, 0.001, 0.18));
  save(dir, "ride", applyStyleBus(d, "boom-bap"));

  d = render("tom", 0.38, (t) => {
    const f = 115 + 75 * Math.exp(-t * 7);
    return (Math.sin(2 * Math.PI * f * t) * 0.65 + noise() * 0.08) * env(t, 0.38, 0.002, 0.11);
  });
  save(dir, "tom", applyStyleBus(d, "boom-bap"));

  d = render("vinyl", 1.8, (t) => {
    return (Math.random() < 0.015 ? (Math.random() - 0.5) * 0.8 : 0) + noise() * 0.035 + Math.sin(2 * Math.PI * 28 * t) * 0.025;
  });
  save(dir, "vinyl", applyStyleBus(d, "boom-bap"));

  d = render("stab", 0.35, (t) => {
    const f = 215;
    return (Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * f * 1.26 * t) * 0.55 + Math.sin(2 * Math.PI * f * 1.5 * t) * 0.35) * env(t, 0.35, 0.005, 0.1) * 0.5;
  });
  save(dir, "stab", applyStyleBus(d, "boom-bap"));

  d = render("horn", 0.5, (t) => (Math.sin(2 * Math.PI * 275 * t) * 0.38 + Math.sin(2 * Math.PI * 550 * t) * 0.22 + Math.sin(2 * Math.PI * 825 * t) * 0.1) * env(t, 0.5, 0.008, 0.18) * 0.5);
  save(dir, "horn", applyStyleBus(d, "boom-bap"));

  d = render("bass", 0.55, (t) => Math.sin(2 * Math.PI * 73.42 * t) * env(t, 0.55, 0.003, 0.14) * 0.8);
  save(dir, "bass", applyStyleBus(d, "boom-bap"));
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRILL — dark, menacing, deep sub, metallic rapid hats
// ═══════════════════════════════════════════════════════════════════════════════
function generateDrill(dir) {
  process.stdout.write("drill:\n");

  let d;
  d = render("kick", 0.48, (t) => {
    const f = 52 + 160 * Math.exp(-t * 24);
    return (Math.sin(2 * Math.PI * f * t) * env(t, 0.48, 0.001, 0.14) +
            (t < 0.004 ? noise() * (1 - t / 0.004) * 0.55 : 0)) * 1.15;
  });
  save(dir, "kick", applyStyleBus(d, "drill"));

  d = render("snare", 0.28, (t) => {
    return (Math.sin(2 * Math.PI * 215 * t) * env(t, 0.28, 0.001, 0.06) * 0.35 +
            Math.sin(2 * Math.PI * 4500 * t) * Math.exp(-t * 85) * 0.35 +
            noise() * env(t, 0.28, 0.001, 0.035) * 0.7);
  });
  save(dir, "snare", applyStyleBus(d, "drill"));

  d = render("clap", 0.22, (t) => {
    let v = 0; for (const h of [0, 0.009, 0.019, 0.03]) if (t > h) v += noise() * Math.exp(-((t - h) * 55)) * 0.5;
    return v;
  });
  save(dir, "clap", applyStyleBus(d, "drill"));

  d = render("closed-hat", 0.05, (t) => (noise() * 0.72 + Math.sin(2 * Math.PI * 10500 * t) * 0.15) * env(t, 0.05, 0.0003, 0.01));
  save(dir, "closed-hat", applyStyleBus(d, "drill"));

  d = render("open-hat", 0.45, (t) => (noise() * 0.52 + Math.sin(2 * Math.PI * 8800 * t) * 0.18) * env(t, 0.45, 0.001, 0.19));
  save(dir, "open-hat", applyStyleBus(d, "drill"));

  d = render("808-slide", 2.2, (t) => Math.tanh(Math.sin(2 * Math.PI * (68 - t * 30) * t) * 2.8) * env(t, 2.2, 0.004, 0.9) * 0.85);
  save(dir, "808-slide", applyStyleBus(d, "drill"));

  d = render("808", 2.0, (t) => Math.tanh(Math.sin(2 * Math.PI * (48 - t * 5) * t) * 2.5) * env(t, 2.0, 0.005, 0.8) * 0.82);
  save(dir, "808", applyStyleBus(d, "drill"));

  d = render("sub-bass", 1.2, (t) => Math.sin(2 * Math.PI * 42 * t) * env(t, 1.2, 0.02, 0.5) * 0.85);
  save(dir, "sub-bass", applyStyleBus(d, "drill"));

  d = render("perc", 0.18, (t) => (Math.sin(2 * Math.PI * 650 * t) + Math.sin(2 * Math.PI * 1400 * t) * 0.3 + noise() * 0.22) * env(t, 0.18, 0.001, 0.04));
  save(dir, "perc", applyStyleBus(d, "drill"));

  d = render("rim", 0.12, (t) => (Math.sin(2 * Math.PI * 1150 * t) + Math.sin(2 * Math.PI * 2300 * t) * 0.42) * env(t, 0.12, 0.0005, 0.025));
  save(dir, "rim", applyStyleBus(d, "drill"));

  d = render("impact", 1.4, (t) => {
    const f = 65 - t * 32;
    return (Math.sin(2 * Math.PI * f * t) * 0.6 + noise() * 0.14) * env(t, 1.4, 0.003, 0.5);
  });
  save(dir, "impact", applyStyleBus(d, "drill"));

  d = render("riser", 2.0, (t) => {
    const lift = t / 2.0;
    return (Math.sin(2 * Math.PI * (280 + lift * lift * 3000) * t) * 0.22 + noise() * 0.16) * lift * lift * env(t, 2.0, 0.05, 1.6);
  });
  save(dir, "riser", applyStyleBus(d, "drill"));

  d = render("fx", 0.9, (t) => (Math.sin(2 * Math.PI * (260 + Math.sin(t * 14) * 110) * t) + noise() * 0.18) * env(t, 0.9, 0.015, 0.32) * 0.42);
  save(dir, "fx", applyStyleBus(d, "drill"));

  d = render("vocal", 0.7, (t) => (Math.sin(2 * Math.PI * 158 * t) * 0.32 + Math.sin(2 * Math.PI * 237 * t) * 0.18 + Math.sin(2 * Math.PI * 316 * t) * 0.1) * env(t, 0.7, 0.025, 0.28));
  save(dir, "vocal", applyStyleBus(d, "drill"));

  d = render("chop", 0.28, (t) => (Math.sin(2 * Math.PI * 330 * t) + Math.sin(2 * Math.PI * 495 * t) * 0.48) * env(t, 0.28, 0.003, 0.085) * 0.52);
  save(dir, "chop", applyStyleBus(d, "drill"));

  d = render("loop", 1.6, (t) => {
    const step = Math.floor(t * 8) % 8;
    const f = [98, 130.81, 146.83, 174.61, 196, 174.61, 146.83, 130.81][step];
    const local = (t * 8) % 1;
    return (Math.sin(2 * Math.PI * f * t) * 0.28 + Math.sin(2 * Math.PI * f * 2 * t) * 0.08) * env(local, 1, 0.01, 0.2);
  });
  save(dir, "loop", applyStyleBus(d, "drill"));

  d = render("air", 1.3, (t) => (noise() * 0.1 + Math.sin(2 * Math.PI * 420 * t) * 0.08 + Math.sin(2 * Math.PI * 630 * t) * 0.04) * env(t, 1.3, 0.08, 0.55));
  save(dir, "air", applyStyleBus(d, "drill"));
}

// ═══════════════════════════════════════════════════════════════════════════════
const baseDir = join(process.cwd(), "public", "samples");
const packs = [
  { name: "trap-pro", fn: generateTrapPro },
  { name: "boom-bap", fn: generateBoomBap },
  { name: "drill", fn: generateDrill },
];

for (const pack of packs) {
  const dir = join(baseDir, pack.name);
  mkdirSync(dir, { recursive: true });
  pack.fn(dir);
}
console.log(`\nGenerated ${packs.length * 16} samples with genre-specific style buses`);
