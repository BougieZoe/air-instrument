/**
 * scripts/generateScratchSamples.mjs
 *
 * Generates scratch-specific samples for the DJ deck: vocal stabs, horn stabs,
 * siren, beat loop, scratch tone. All procedural — no external samples needed.
 *
 * Usage:  node scripts/generateScratchSamples.mjs
 * Output: public/samples/scratch/
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

function reverb(data, { preMs = 15, shortMs = 40, shortGain = 0.22, longMs = 100, longGain = 0.12 } = {}) {
  const out = new Float32Array(data.length + longMs * SR / 1000 | 0);
  out.set(data);
  const pre = preMs * SR / 1000 | 0;
  const s = shortMs * SR / 1000 | 0;
  const l = longMs * SR / 1000 | 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] !== 0) {
      if (i + pre < out.length) out[i + pre] += data[i] * shortGain;
      if (i + s < out.length)   out[i + s]   += data[i] * longGain;
      if (i + l < out.length)   out[i + l]   += data[i] * longGain * 0.5;
    }
  }
  return out;
}

function saturate(data, drive = 3) {
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.tanh(data[i] * drive) / Math.tanh(drive);
  }
  return data;
}

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

function highpass(data, freq, Q = 0.7) {
  const lp = new Float32Array(data);
  lowpass(lp, freq, Q);
  for (let i = 0; i < data.length; i++) data[i] -= lp[i];
  return data;
}

function render(name, duration, fn) {
  const len = Math.floor(duration * SR);
  const data = new Float32Array(len);
  for (let i = 0; i < len; i++) data[i] = clamp(fn(i / SR, i, len));
  return data;
}

function encodeWav(samples) {
  const len = Math.min(samples.length, SR * 5);
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
// Scratch samples — designed to sound good when scrubbed at variable playbackRate
// ═══════════════════════════════════════════════════════════════════════════════
const dir = join(process.cwd(), "public", "samples", "scratch");
mkdirSync(dir, { recursive: true });
process.stdout.write("scratch:\n");

// "AAAH" — classic scratch vocal formant (the most iconic scratch sound)
let d = render("ah", 1.2, (t) => {
  const vibrato = 1 + Math.sin(2 * Math.PI * 6 * t) * 0.012;
  const f1 = 620 * vibrato;
  const f2 = 1080 * vibrato;
  const f3 = 2250 * vibrato;
  return (Math.sin(2 * Math.PI * f1 * t) * 0.4 +
          Math.sin(2 * Math.PI * f2 * t) * 0.28 +
          Math.sin(2 * Math.PI * f3 * t) * 0.14 +
          noise() * 0.06) * env(t, 1.2, 0.015, 0.45) * 0.85;
});
saturate(d, 1.5);
d = reverb(d, { preMs: 8, shortMs: 30, shortGain: 0.15, longMs: 70, longGain: 0.08 });
save(dir, "ah", d);

// "FRESH" — second classic scratch vocal (brighter, more sibilant)
d = render("fresh", 1.0, (t) => {
  const vibrato = 1 + Math.sin(2 * Math.PI * 7 * t) * 0.01;
  const f1 = 550 * vibrato;
  const f2 = 1200 * vibrato;
  const f3 = 2800 * vibrato;
  const fricative = t < 0.15 ? noise() * 0.3 * (1 - t / 0.15) : 0;
  return (Math.sin(2 * Math.PI * f1 * t) * 0.35 +
          Math.sin(2 * Math.PI * f2 * t) * 0.3 +
          Math.sin(2 * Math.PI * f3 * t) * 0.18 +
          fricative) * env(t, 1.0, 0.012, 0.35) * 0.82;
});
saturate(d, 1.5);
save(dir, "fresh", d);

// "OH" — open vowel stab
d = render("oh", 0.85, (t) => {
  const vibrato = 1 + Math.sin(2 * Math.PI * 5.5 * t) * 0.015;
  return (Math.sin(2 * Math.PI * 440 * vibrato * t) * 0.4 +
          Math.sin(2 * Math.PI * 880 * vibrato * t) * 0.25 +
          Math.sin(2 * Math.PI * 1320 * vibrato * t) * 0.12 +
          noise() * 0.04) * env(t, 0.85, 0.01, 0.3) * 0.8;
});
saturate(d, 1.3);
save(dir, "oh", d);

// HORN STAB — brassy, punchy, great for scratching
d = render("horn", 0.7, (t) => {
  return (Math.sin(2 * Math.PI * 350 * t) * 0.38 +
          Math.sin(2 * Math.PI * 700 * t) * 0.28 +
          Math.sin(2 * Math.PI * 1050 * t) * 0.16 +
          Math.sin(2 * Math.PI * 1400 * t) * 0.08 +
          noise() * 0.06) * env(t, 0.7, 0.005, 0.22) * 0.75;
});
saturate(d, 2.5);
d = reverb(d, { preMs: 5, shortMs: 25, shortGain: 0.18, longMs: 60, longGain: 0.1 });
save(dir, "horn", d);

// ORCHESTRA HIT — dramatic stab
d = render("orch", 0.9, (t) => {
  const f = 220;
  return (Math.sin(2 * Math.PI * f * t) * 0.3 +
          Math.sin(2 * Math.PI * f * 1.26 * t) * 0.22 +
          Math.sin(2 * Math.PI * f * 1.5 * t) * 0.18 +
          Math.sin(2 * Math.PI * f * 2 * t) * 0.1 +
          noise() * 0.08) * env(t, 0.9, 0.003, 0.3) * 0.7;
});
saturate(d, 2);
save(dir, "orch", d);

// SIREN — rising pitch, great for slow scratches
d = render("siren", 2.0, (t) => {
  const f = 400 + Math.sin(2 * Math.PI * 2.5 * t) * 250;
  return (Math.sin(2 * Math.PI * f * t) * 0.45 + noise() * 0.04) * env(t, 2.0, 0.02, 0.8) * 0.65;
});
lowpass(d, 3500);
saturate(d, 1.8);
save(dir, "siren", d);

// BEAT LOOP — 2-bar boom bap beat at 95 BPM (scratched over this)
const bpm = 95;
const beatDur = 60 / bpm; // seconds per beat
d = render("beat", beatDur * 8, (t) => {
  const beat = t % beatDur;
  const bar = Math.floor(t / (beatDur * 4)) % 2;
  const step = Math.floor(t / (beatDur / 2)) % 8;

  // Kick on 1, 3.5 (boom bap swing)
  let kick = 0;
  if (step === 0 || step === 7) {
    const kf = 58 + 80 * Math.exp(-beat * 16);
    kick = Math.sin(2 * Math.PI * kf * beat) * env(beat, beatDur * 0.5, 0.001, 0.15) * 0.6;
  }

  // Snare on 2, 4
  let snare = 0;
  if (step === 2 || step === 4) {
    const st = beat;
    snare = (Math.sin(2 * Math.PI * 185 * st) * 0.3 + noise() * env(st, 0.3, 0.001, 0.05) * 0.5) * env(st, beatDur * 0.4, 0.001, 0.06);
  }

  // Hi-hat on every 8th
  let hat = 0;
  hat = noise() * env(beat, beatDur * 0.15, 0.001, 0.025) * 0.35;

  // Bass line
  const bassNotes = [55, 55, 65.41, 55, 73.42, 73.42, 65.41, 55];
  const bassF = bassNotes[step];
  const bass = Math.sin(2 * Math.PI * bassF * t) * env(beat, beatDur * 0.8, 0.005, 0.2) * 0.28;

  return (kick + snare + hat + bass) * 0.7;
});
lowpass(d, 7500);
saturate(d, 1.5);
save(dir, "beat", d);

// SCRATCH TONE — pure sine, the classic "scratch" sound when manipulated
d = render("tone", 0.5, (t) => {
  return Math.sin(2 * Math.PI * 440 * t) * env(t, 0.5, 0.002, 0.15) * 0.7;
});
save(dir, "tone", d);

// CRYSTAL — high-pitched bell, sparkly scratches
d = render("crystal", 1.0, (t) => {
  return (Math.sin(2 * Math.PI * 1760 * t) * 0.35 +
          Math.sin(2 * Math.PI * 2640 * t) * 0.2 +
          Math.sin(2 * Math.PI * 3520 * t) * 0.1) * env(t, 1.0, 0.001, 0.4) * 0.6;
});
saturate(d, 1.2);
save(dir, "crystal", d);

// BABY — short "ah" stab for baby scratches
d = render("baby", 0.35, (t) => {
  return (Math.sin(2 * Math.PI * 580 * t) * 0.4 +
          Math.sin(2 * Math.PI * 1100 * t) * 0.25) * env(t, 0.35, 0.005, 0.1) * 0.8;
});
save(dir, "baby", d);

// CHIRP — sharp, high transient for chirp scratches
d = render("chirp", 0.15, (t) => {
  return (Math.sin(2 * Math.PI * 2200 * t) * 0.5 +
          noise() * 0.3) * env(t, 0.15, 0.001, 0.025) * 0.7;
});
save(dir, "chirp", d);

// TRANSFORM — filtered noise burst for transformer scratches
d = render("transform", 0.12, (t) => {
  return noise() * env(t, 0.12, 0.0005, 0.018) * 0.6;
});
highpass(d, 2000);
saturate(d, 2);
save(dir, "transform", d);

// FLARE — sustained tone for flare scratches
d = render("flare", 0.8, (t) => {
  return (Math.sin(2 * Math.PI * 660 * t) * 0.4 +
          Math.sin(2 * Math.PI * 990 * t) * 0.2 +
          noise() * 0.08) * env(t, 0.8, 0.008, 0.3) * 0.7;
});
saturate(d, 1.5);
save(dir, "flare", d);

// BELL — resonant bell hit
d = render("bell", 1.5, (t) => {
  return (Math.sin(2 * Math.PI * 880 * t) * 0.4 +
          Math.sin(2 * Math.PI * 1760 * t) * 0.2 +
          Math.sin(2 * Math.PI * 2640 * t) * 0.1 +
          Math.sin(2 * Math.PI * 3520 * t) * 0.05) * env(t, 1.5, 0.001, 0.6) * 0.55;
});
save(dir, "bell", d);

// NOISE SWEEP — filtered noise, great for slow drags
d = render("sweep", 2.0, (t) => {
  return noise() * env(t, 2.0, 0.05, 0.8) * 0.5;
});
const sweepFilter = new Float32Array(d);
for (let i = 0; i < sweepFilter.length; i++) {
  const progress = i / sweepFilter.length;
  sweepFilter[i] = d[i] * (0.3 + progress * 0.7);
}
d = sweepFilter;
lowpass(d, 2000 + Math.sin(2 * Math.PI * 0.5 * (d.length / SR)) * 1500);
saturate(d, 1.5);
save(dir, "sweep", d);

process.stdout.write(`\nGenerated 16 scratch samples\n`);
