import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const sampleRate = 44100;
const outDir = join(process.cwd(), "public", "samples");
mkdirSync(outDir, { recursive: true });

const clamp = (value) => Math.max(-1, Math.min(1, value));
const env = (t, duration, attack = 0.005, decay = 0.18) => {
  if (t < attack) return t / attack;
  return Math.exp(-((t - attack) / Math.max(0.001, decay))) * (1 - t / duration);
};
const noise = () => Math.random() * 2 - 1;

function render(name, duration, fn) {
  const length = Math.floor(duration * sampleRate);
  const data = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    data[i] = clamp(fn(t, i, length));
  }
  writeFileSync(join(outDir, `${name}.wav`), encodeWav(data));
}

function encodeWav(samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i += 1) {
    buffer.writeInt16LE(Math.round(clamp(samples[i]) * 32767), 44 + i * 2);
  }
  return buffer;
}

render("kick", 0.62, (t) => {
  const f = 42 + 104 * Math.exp(-t * 15);
  return Math.sin(2 * Math.PI * f * t) * env(t, 0.62, 0.002, 0.22) * 1.05;
});

render("snare", 0.46, (t) => {
  const body = Math.sin(2 * Math.PI * 188 * t) * env(t, 0.46, 0.002, 0.13) * 0.35;
  const snap = noise() * env(t, 0.46, 0.001, 0.085) * 0.62;
  return body + snap;
});

render("clap", 0.38, (t) => {
  const cluster = [0.0, 0.018, 0.036].reduce((sum, offset) => sum + (t > offset ? noise() * env(t - offset, 0.18, 0.001, 0.035) : 0), 0);
  return cluster * 0.5;
});

render("closed-hat", 0.16, (t) => (noise() * 0.75 + Math.sin(2 * Math.PI * 8200 * t) * 0.2) * env(t, 0.16, 0.001, 0.032));
render("open-hat", 0.72, (t) => (noise() * 0.55 + Math.sin(2 * Math.PI * 6600 * t) * 0.22) * env(t, 0.72, 0.002, 0.28));
render("808", 1.25, (t) => Math.tanh(Math.sin(2 * Math.PI * (46 - t * 8) * t) * 2.2) * env(t, 1.25, 0.006, 0.65) * 0.85);
render("sub-bass", 1.0, (t) => Math.sin(2 * Math.PI * 55 * t) * env(t, 1.0, 0.02, 0.52) * 0.8);
render("perc", 0.28, (t) => (Math.sin(2 * Math.PI * 520 * t) + noise() * 0.25) * env(t, 0.28, 0.002, 0.08) * 0.72);
render("rim", 0.21, (t) => (Math.sin(2 * Math.PI * 980 * t) + Math.sin(2 * Math.PI * 1740 * t) * 0.45) * env(t, 0.21, 0.001, 0.05) * 0.74);
render("impact", 1.1, (t) => (Math.sin(2 * Math.PI * (92 - t * 48) * t) * 0.75 + noise() * 0.18) * env(t, 1.1, 0.003, 0.45));
render("riser", 1.4, (t) => {
  const lift = t / 1.4;
  return (Math.sin(2 * Math.PI * (260 + lift * 1500) * t) * 0.32 + noise() * 0.12) * lift * lift;
});
render("fx", 0.88, (t) => (Math.sin(2 * Math.PI * (420 + Math.sin(t * 18) * 160) * t) + noise() * 0.18) * env(t, 0.88, 0.01, 0.3) * 0.58);
render("vocal-texture", 0.95, (t) => (Math.sin(2 * Math.PI * 220 * t) * 0.35 + Math.sin(2 * Math.PI * 330 * t) * 0.24 + Math.sin(2 * Math.PI * 440 * t) * 0.18) * env(t, 0.95, 0.025, 0.42));
render("chop", 0.34, (t) => (Math.sin(2 * Math.PI * 392 * t) + Math.sin(2 * Math.PI * 523.25 * t) * 0.5) * env(t, 0.34, 0.004, 0.11) * 0.62);
render("loop", 1.4, (t) => {
  const step = Math.floor(t * 8) % 8;
  const f = [110, 146.83, 164.81, 196, 220, 196, 164.81, 146.83][step];
  const local = (t * 8) % 1;
  return (Math.sin(2 * Math.PI * f * t) * 0.32 + Math.sin(2 * Math.PI * f * 2 * t) * 0.12) * env(local, 1, 0.01, 0.2);
});
render("air", 1.05, (t) => (noise() * 0.17 + Math.sin(2 * Math.PI * 740 * t) * 0.18) * env(t, 1.05, 0.04, 0.5));

console.log("Generated 16 original WAV demo samples in public/samples");
