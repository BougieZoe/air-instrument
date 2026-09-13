/**
 * scripts/generateSamples.mjs
 *
 * High-quality procedural drum synthesis. Generates 48 WAV files across 3 genre
 * packs: trap-pro, boom-bap, drill. All sounds are original — no samples needed.
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

/** Simple 3-tap algorithmic reverb (pre-delay + short + long tail) */
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

/** Soft-clip saturation */
function saturate(data, drive = 3) {
  for (let i = 0; i < data.length; i++) {
    const x = data[i] * drive;
    data[i] = Math.tanh(x) / Math.tanh(drive);
  }
  return data;
}

/** Simple 2-pole lowpass filter */
function lowpass(data, freq, Q = 0.7) {
  const w0 = 2 * Math.PI * freq / SR;
  const alpha = Math.sin(w0) / (2 * Q);
  const b0 = (1 - Math.cos(w0)) / 2;
  const b1 = 1 - Math.cos(w0);
  const b2 = (1 - Math.cos(w0)) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < data.length; i++) {
    const x0 = data[i];
    const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    data[i] = y0;
  }
  return data;
}

/** Simple highpass via subtraction of lowpass */
function highpass(data, freq, Q = 0.7) {
  const lp = new Float32Array(data);
  lowpass(lp, freq, Q);
  for (let i = 0; i < data.length; i++) data[i] -= lp[i];
  return data;
}

/** Bandpass = lowpass then highpass */
function bandpass(data, lowFreq, highFreq, Q = 0.7) {
  lowpass(data, highFreq, Q);
  highpass(data, lowFreq, Q);
  return data;
}

/** Compressor: threshold in dB, ratio:1, knee in dB */
function compress(data, { threshold = -12, ratio = 4, knee = 6, attack = 0.003, release = 0.1 } = {}) {
  const threshLin = Math.pow(10, threshold / 20);
  const kneeLin = Math.pow(10, knee / 20);
  const attCoeff = 1 - Math.exp(-1 / (attack * SR));
  const relCoeff = 1 - Math.exp(-1 / (release * SR));
  let envelope = 0;
  for (let i = 0; i < data.length; i++) {
    const abs = Math.abs(data[i]);
    const coeff = abs > envelope ? attCoeff : relCoeff;
    envelope += (abs - envelope) * coeff;
    const overThreshold = (envelope - threshLin) / threshLin;
    const gain = overThreshold > 0
      ? 1 + (1 / ratio - 1) * Math.min(1, overThreshold / (kneeLin - 1))
      : 1;
    data[i] *= gain;
  }
  return data;
}

function render(name, duration, fn) {
  const len = Math.floor(duration * SR);
  const data = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    data[i] = clamp(fn(i / SR, i, len));
  }
  return data;
}

function encodeWav(samples) {
  const len = Math.min(samples.length, 44100 * 4); // cap at 4s
  const buf = Buffer.alloc(44 + len * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + len * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(len * 2, 40);
  for (let i = 0; i < len; i++) {
    buf.writeInt16LE(Math.round(clamp(samples[i]) * 32767), 44 + i * 2);
  }
  return buf;
}

function save(dir, name, data) {
  writeFileSync(join(dir, `${name}.wav`), encodeWav(data));
  process.stdout.write(`  ${name} (${(data.length / SR * 1000 | 0)}ms)\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PACK 1: TRAP PRO — aggressive 808s, crispy hats, punchy snares
// ═══════════════════════════════════════════════════════════════════════════════
function generateTrapPro(dir) {
  process.stdout.write("trap-pro:\n");

  // Kick: deep sub + click transient
  let d = render("kick", 0.55, (t) => {
    const f = 50 + 120 * Math.exp(-t * 18);
    const sub = Math.sin(2 * Math.PI * f * t) * env(t, 0.55, 0.001, 0.2);
    const click = (t < 0.008 ? noise() * (1 - t / 0.008) : 0) * 0.4;
    return (sub + click) * 1.1;
  });
  saturate(d, 2.5);
  compress(d, { threshold: -10, ratio: 3, attack: 0.001, release: 0.08 });
  save(dir, "kick", d);

  // Snare: body + snap + noise, with reverb
  d = render("snare", 0.38, (t) => {
    const body = Math.sin(2 * Math.PI * 195 * t) * env(t, 0.38, 0.001, 0.1);
    const snap = Math.sin(2 * Math.PI * 3200 * t) * Math.exp(-t * 60) * 0.3;
    const n = noise() * env(t, 0.38, 0.001, 0.06) * 0.55;
    return body * 0.4 + snap + n;
  });
  bandpass(d, 200, 7000);
  saturate(d, 2);
  d = reverb(d, { preMs: 12, shortMs: 40, shortGain: 0.2, longMs: 95, longGain: 0.1 });
  compress(d, { threshold: -14, ratio: 3 });
  save(dir, "snare", d);

  // Clap: multi-transient + reverb
  d = render("clap", 0.32, (t) => {
    const hits = [0, 0.012, 0.024, 0.038];
    let v = 0;
    for (const h of hits) {
      if (t > h) v += noise() * Math.exp(-((t - h) * 42)) * 0.45;
    }
    return v;
  });
  bandpass(d, 800, 6000);
  saturate(d, 2.2);
  d = reverb(d, { preMs: 8, shortMs: 35, shortGain: 0.3, longMs: 85, longGain: 0.18 });
  save(dir, "clap", d);

  // Closed hat: tight metallic
  d = render("closed-hat", 0.08, (t) => {
    return (noise() * 0.75 + Math.sin(2 * Math.PI * 8200 * t) * 0.18 + Math.sin(2 * Math.PI * 12400 * t) * 0.1) * env(t, 0.08, 0.001, 0.018);
  });
  highpass(d, 5500);
  saturate(d, 1.8);
  save(dir, "closed-hat", d);

  // Open hat: longer, brighter
  d = render("open-hat", 0.55, (t) => {
    return (noise() * 0.55 + Math.sin(2 * Math.PI * 7200 * t) * 0.2 + Math.sin(2 * Math.PI / 2 * (500 + t * 4000) * t) * 0.12) * env(t, 0.55, 0.002, 0.22);
  });
  highpass(d, 4800);
  saturate(d, 1.6);
  save(dir, "open-hat", d);

  // 808: deep sub with saturation harmonics
  d = render("808", 1.6, (t) => {
    const f = 48 - t * 12;
    return Math.sin(2 * Math.PI * f * t) * env(t, 1.6, 0.008, 0.7) * 0.9;
  });
  saturate(d, 3.2);
  compress(d, { threshold: -16, ratio: 4, release: 0.3 });
  save(dir, "808", d);

  // Sub bass: clean, deep
  d = render("sub-bass", 1.2, (t) => Math.sin(2 * Math.PI * 52 * t) * env(t, 1.2, 0.02, 0.5) * 0.85);
  lowpass(d, 150);
  save(dir, "sub-bass", d);

  // Perc: metallic tonal hit
  d = render("perc", 0.22, (t) => {
    return (Math.sin(2 * Math.PI * 580 * t) + Math.sin(2 * Math.PI * 1100 * t) * 0.4 + noise() * 0.2) * env(t, 0.22, 0.001, 0.055);
  });
  saturate(d, 1.8);
  save(dir, "perc", d);

  // Rim: sharp, woody
  d = render("rim", 0.16, (t) => {
    return (Math.sin(2 * Math.PI * 920 * t) + Math.sin(2 * Math.PI * 1880 * t) * 0.5 + noise() * 0.15) * env(t, 0.16, 0.0005, 0.035);
  });
  save(dir, "rim", d);

  // Impact: cinematic low hit
  d = render("impact", 1.4, (t) => {
    const f = 85 - t * 40;
    return (Math.sin(2 * Math.PI * f * t) * 0.7 + noise() * 0.12) * env(t, 1.4, 0.002, 0.5);
  });
  saturate(d, 2);
  compress(d, { threshold: -12, ratio: 3 });
  save(dir, "impact", d);

  // Riser: upward sweep
  d = render("riser", 1.8, (t) => {
    const lift = t / 1.8;
    const f = 220 + lift * lift * 2000;
    return (Math.sin(2 * Math.PI * f * t) * 0.28 + noise() * 0.15) * lift * lift * env(t, 1.8, 0.05, 1.2);
  });
  save(dir, "riser", d);

  // FX: modulated hit
  d = render("fx", 0.7, (t) => {
    return (Math.sin(2 * Math.PI * (380 + Math.sin(t * 22) * 180) * t) + noise() * 0.2) * env(t, 0.7, 0.01, 0.25) * 0.55;
  });
  saturate(d, 1.5);
  save(dir, "fx", d);

  // Vocal texture: warm formant
  d = render("vocal", 0.85, (t) => {
    const formant1 = Math.sin(2 * Math.PI * 220 * t) * 0.32;
    const formant2 = Math.sin(2 * Math.PI * 340 * t) * 0.22;
    const formant3 = Math.sin(2 * Math.PI * 480 * t) * 0.14;
    const vibrato = 1 + Math.sin(2 * Math.PI * 5.5 * t) * 0.008;
    return (formant1 + formant2 + formant3) * vibrato * env(t, 0.85, 0.03, 0.35);
  });
  save(dir, "vocal", d);

  // Chop: melodic stab
  d = render("chop", 0.28, (t) => {
    return (Math.sin(2 * Math.PI * 440 * t) + Math.sin(2 * Math.PI * 554.37 * t) * 0.5 + Math.sin(2 * Math.PI * 659.25 * t) * 0.3) * env(t, 0.28, 0.003, 0.08) * 0.55;
  });
  saturate(d, 1.5);
  save(dir, "chop", d);

  // Loop: rhythmic pattern
  d = render("loop", 1.6, (t) => {
    const step = Math.floor(t * 8) % 8;
    const f = [110, 146.83, 164.81, 196, 220, 196, 164.81, 146.83][step];
    const local = (t * 8) % 1;
    return (Math.sin(2 * Math.PI * f * t) * 0.3 + Math.sin(2 * Math.PI * f * 2 * t) * 0.1) * env(local, 1, 0.01, 0.18);
  });
  save(dir, "loop", d);

  // Air: atmospheric
  d = render("air", 1.2, (t) => {
    return (noise() * 0.15 + Math.sin(2 * Math.PI * 660 * t) * 0.12 + Math.sin(2 * Math.PI * 990 * t) * 0.06) * env(t, 1.2, 0.06, 0.5);
  });
  save(dir, "air", d);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PACK 2: BOOM BAP — dusty, lo-fi, compressed, warm
// ═══════════════════════════════════════════════════════════════════════════════
function generateBoomBap(dir) {
  process.stdout.write("boom-bap:\n");

  // Kick: warm, compressed, boom-bap style
  let d = render("kick", 0.48, (t) => {
    const f = 58 + 90 * Math.exp(-t * 14);
    const sub = Math.sin(2 * Math.PI * f * t) * env(t, 0.48, 0.002, 0.18);
    const knock = Math.sin(2 * Math.PI * 160 * t) * Math.exp(-t * 50) * 0.35;
    return sub + knock;
  });
  lowpass(d, 3200);
  saturate(d, 3.5);
  compress(d, { threshold: -8, ratio: 6, attack: 0.001, release: 0.06 });
  save(dir, "kick", d);

  // Snare: dusty, filtered
  d = render("snare", 0.32, (t) => {
    const body = Math.sin(2 * Math.PI * 175 * t) * env(t, 0.32, 0.001, 0.08);
    const n = noise() * env(t, 0.32, 0.001, 0.05) * 0.6;
    return body * 0.45 + n;
  });
  lowpass(d, 6000);
  saturate(d, 3);
  compress(d, { threshold: -10, ratio: 4 });
  d = reverb(d, { preMs: 10, shortMs: 35, shortGain: 0.18, longMs: 80, longGain: 0.08 });
  save(dir, "snare", d);

  // Clap: filtered, gritty
  d = render("clap", 0.28, (t) => {
    const hits = [0, 0.014, 0.028, 0.042];
    let v = 0;
    for (const h of hits) { if (t > h) v += noise() * Math.exp(-((t - h) * 38)) * 0.4; }
    return v;
  });
  bandpass(d, 600, 4500);
  saturate(d, 3);
  save(dir, "clap", d);

  // Closed hat: lo-fi, crunchy
  d = render("closed-hat", 0.1, (t) => {
    return noise() * env(t, 0.1, 0.001, 0.022) * 0.7;
  });
  highpass(d, 4000);
  saturate(d, 2.5);
  save(dir, "closed-hat", d);

  // Open hat: dusty, longer
  d = render("open-hat", 0.42, (t) => {
    return (noise() * 0.5 + Math.sin(2 * Math.PI * 6200 * t) * 0.15) * env(t, 0.42, 0.002, 0.18);
  });
  highpass(d, 3500);
  saturate(d, 2);
  save(dir, "open-hat", d);

  // 808: warm, saturated boom
  d = render("808", 1.3, (t) => {
    return Math.sin(2 * Math.PI * (52 - t * 8) * t) * env(t, 1.3, 0.006, 0.55) * 0.85;
  });
  saturate(d, 4);
  compress(d, { threshold: -14, ratio: 4, release: 0.25 });
  save(dir, "808", d);

  // Sub bass
  d = render("sub-bass", 1.0, (t) => Math.sin(2 * Math.PI * 48 * t) * env(t, 1.0, 0.025, 0.45) * 0.8);
  lowpass(d, 120);
  save(dir, "sub-bass", d);

  // Perc: woodblock-ish
  d = render("perc", 0.18, (t) => {
    return (Math.sin(2 * Math.PI * 480 * t) + noise() * 0.3) * env(t, 0.18, 0.001, 0.04);
  });
  saturate(d, 2);
  save(dir, "perc", d);

  // Rim: dry click
  d = render("rim", 0.12, (t) => {
    return (Math.sin(2 * Math.PI * 860 * t) + Math.sin(2 * Math.PI * 1620 * t) * 0.4) * env(t, 0.12, 0.0005, 0.025);
  });
  save(dir, "rim", d);

  // Crash: big noise hit with reverb
  d = render("crash", 1.6, (t) => {
    return noise() * env(t, 1.6, 0.001, 0.6) * 0.5;
  });
  highpass(d, 3000);
  saturate(d, 1.5);
  d = reverb(d, { preMs: 5, shortMs: 55, shortGain: 0.25, longMs: 180, longGain: 0.15 });
  save(dir, "crash", d);

  // Ride: metallic ping
  d = render("ride", 0.6, (t) => {
    return (Math.sin(2 * Math.PI * 3400 * t) * 0.35 + Math.sin(2 * Math.PI * 5200 * t) * 0.2 + noise() * 0.15) * env(t, 0.6, 0.001, 0.2);
  });
  highpass(d, 2800);
  save(dir, "ride", d);

  // Tom: tonal body
  d = render("tom", 0.4, (t) => {
    const f = 120 + 80 * Math.exp(-t * 8);
    return (Math.sin(2 * Math.PI * f * t) * 0.7 + noise() * 0.08) * env(t, 0.4, 0.002, 0.12);
  });
  saturate(d, 2);
  save(dir, "tom", d);

  // Vinyl crackle texture
  d = render("vinyl", 2.0, (t) => {
    const crackle = (Math.random() < 0.02 ? (Math.random() - 0.5) * 0.8 : 0);
    const hiss = noise() * 0.04;
    const rumble = Math.sin(2 * Math.PI * 30 * t) * 0.03;
    return crackle + hiss + rumble;
  });
  save(dir, "vinyl", d);

  // Stab: filtered chord
  d = render("stab", 0.4, (t) => {
    const f = 220;
    return (Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * f * 1.26 * t) * 0.6 + Math.sin(2 * Math.PI * f * 1.5 * t) * 0.4) * env(t, 0.4, 0.005, 0.12) * 0.5;
  });
  lowpass(d, 2800);
  saturate(d, 2.5);
  save(dir, "stab", d);

  // Horn: brassy stab
  d = render("horn", 0.55, (t) => {
    return (Math.sin(2 * Math.PI * 280 * t) * 0.4 + Math.sin(2 * Math.PI * 560 * t) * 0.25 + Math.sin(2 * Math.PI * 840 * t) * 0.12) * env(t, 0.55, 0.008, 0.2) * 0.5;
  });
  saturate(d, 3);
  save(dir, "horn", d);

  // Bass pluck
  d = render("bass", 0.6, (t) => {
    return Math.sin(2 * Math.PI * 73.42 * t) * env(t, 0.6, 0.003, 0.15) * 0.8;
  });
  lowpass(d, 800);
  saturate(d, 2);
  save(dir, "bass", d);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PACK 3: DRILL — sliding 808s, rapid hats, dark textures
// ═══════════════════════════════════════════════════════════════════════════════
function generateDrill(dir) {
  process.stdout.write("drill:\n");

  // Kick: punchy, aggressive
  let d = render("kick", 0.5, (t) => {
    const f = 55 + 140 * Math.exp(-t * 20);
    const sub = Math.sin(2 * Math.PI * f * t) * env(t, 0.5, 0.001, 0.16);
    const click = (t < 0.005 ? noise() * (1 - t / 0.005) : 0) * 0.5;
    return (sub + click) * 1.15;
  });
  saturate(d, 3);
  compress(d, { threshold: -8, ratio: 5, attack: 0.001, release: 0.06 });
  save(dir, "kick", d);

  // Snare: sharp, aggressive
  d = render("snare", 0.3, (t) => {
    const body = Math.sin(2 * Math.PI * 210 * t) * env(t, 0.3, 0.001, 0.07);
    const snap = Math.sin(2 * Math.PI * 4200 * t) * Math.exp(-t * 80) * 0.35;
    const n = noise() * env(t, 0.3, 0.001, 0.04) * 0.65;
    return body * 0.35 + snap + n;
  });
  bandpass(d, 300, 8000);
  saturate(d, 2.5);
  compress(d, { threshold: -10, ratio: 4 });
  save(dir, "snare", d);

  // Clap: tight, filtered
  d = render("clap", 0.25, (t) => {
    const hits = [0, 0.01, 0.02, 0.032];
    let v = 0;
    for (const h of hits) { if (t > h) v += noise() * Math.exp(-((t - h) * 50)) * 0.5; }
    return v;
  });
  bandpass(d, 1000, 7000);
  saturate(d, 2.5);
  save(dir, "clap", d);

  // Closed hat: super tight, metallic
  d = render("closed-hat", 0.06, (t) => {
    return (noise() * 0.7 + Math.sin(2 * Math.PI * 9800 * t) * 0.15) * env(t, 0.06, 0.0005, 0.012);
  });
  highpass(d, 6500);
  saturate(d, 2);
  save(dir, "closed-hat", d);

  // Open hat: bright, longer
  d = render("open-hat", 0.48, (t) => {
    return (noise() * 0.5 + Math.sin(2 * Math.PI * 8200 * t) * 0.18) * env(t, 0.48, 0.001, 0.2);
  });
  highpass(d, 5000);
  saturate(d, 1.8);
  save(dir, "open-hat", d);

  // 808 SLIDE: pitch drops dramatically (drill signature)
  d = render("808-slide", 2.0, (t) => {
    const f = 65 - t * 28; // aggressive pitch slide
    return Math.tanh(Math.sin(2 * Math.PI * f * t) * 2.5) * env(t, 2.0, 0.005, 0.8) * 0.85;
  });
  saturate(d, 3.5);
  compress(d, { threshold: -12, ratio: 5, release: 0.4 });
  save(dir, "808-slide", d);

  // 808: sustained sub
  d = render("808", 1.8, (t) => {
    return Math.tanh(Math.sin(2 * Math.PI * (50 - t * 6) * t) * 2.2) * env(t, 1.8, 0.006, 0.7) * 0.8;
  });
  saturate(d, 3);
  compress(d, { threshold: -14, ratio: 4, release: 0.3 });
  save(dir, "808", d);

  // Sub bass
  d = render("sub-bass", 1.0, (t) => Math.sin(2 * Math.PI * 45 * t) * env(t, 1.0, 0.02, 0.4) * 0.85);
  lowpass(d, 120);
  save(dir, "sub-bass", d);

  // Perc: dark, metallic
  d = render("perc", 0.2, (t) => {
    return (Math.sin(2 * Math.PI * 620 * t) + Math.sin(2 * Math.PI * 1340 * t) * 0.3 + noise() * 0.2) * env(t, 0.2, 0.001, 0.045);
  });
  saturate(d, 2);
  save(dir, "perc", d);

  // Rim: sharp, high
  d = render("rim", 0.14, (t) => {
    return (Math.sin(2 * Math.PI * 1100 * t) + Math.sin(2 * Math.PI * 2200 * t) * 0.45) * env(t, 0.14, 0.0005, 0.028);
  });
  save(dir, "rim", d);

  // Impact: dark cinematic
  d = render("impact", 1.5, (t) => {
    const f = 70 - t * 35;
    return (Math.sin(2 * Math.PI * f * t) * 0.65 + noise() * 0.15) * env(t, 1.5, 0.003, 0.55);
  });
  saturate(d, 2.5);
  compress(d, { threshold: -10, ratio: 4 });
  save(dir, "impact", d);

  // Riser: tension builder
  d = render("riser", 2.2, (t) => {
    const lift = t / 2.2;
    const f = 300 + lift * lift * 2800;
    return (Math.sin(2 * Math.PI * f * t) * 0.25 + noise() * 0.18) * lift * lift * env(t, 2.2, 0.05, 1.8);
  });
  save(dir, "riser", d);

  // FX: dark atmosphere
  d = render("fx", 1.0, (t) => {
    return (Math.sin(2 * Math.PI * (280 + Math.sin(t * 16) * 120) * t) + noise() * 0.2) * env(t, 1.0, 0.015, 0.35) * 0.45;
  });
  saturate(d, 1.8);
  save(dir, "fx", d);

  // Vocal chop: dark, pitched down
  d = render("vocal", 0.75, (t) => {
    return (Math.sin(2 * Math.PI * 165 * t) * 0.35 + Math.sin(2 * Math.PI * 247.5 * t) * 0.2 + Math.sin(2 * Math.PI * 330 * t) * 0.12) * env(t, 0.75, 0.025, 0.3);
  });
  save(dir, "vocal", d);

  // Chop: dark stab
  d = render("chop", 0.3, (t) => {
    return (Math.sin(2 * Math.PI * 350 * t) + Math.sin(2 * Math.PI * 525 * t) * 0.5) * env(t, 0.3, 0.003, 0.09) * 0.55;
  });
  saturate(d, 1.8);
  save(dir, "chop", d);

  // Loop: drill rhythm
  d = render("loop", 1.8, (t) => {
    const step = Math.floor(t * 8) % 8;
    const f = [98, 130.81, 146.83, 174.61, 196, 174.61, 146.83, 130.81][step];
    const local = (t * 8) % 1;
    return (Math.sin(2 * Math.PI * f * t) * 0.3 + Math.sin(2 * Math.PI * f * 2 * t) * 0.1) * env(local, 1, 0.01, 0.2);
  });
  save(dir, "loop", d);

  // Air: dark ambient
  d = render("air", 1.5, (t) => {
    return (noise() * 0.12 + Math.sin(2 * Math.PI * 440 * t) * 0.1 + Math.sin(2 * Math.PI * 660 * t) * 0.05) * env(t, 1.5, 0.08, 0.6);
  });
  save(dir, "air", d);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main
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

console.log(`\nGenerated ${packs.length * 16} WAV samples in ${packs.map((p) => p.name).join(", ")}`);
