/**
 * scripts/generateDrums.mjs
 *
 * Acoustic drum-kit synthesis — a rock/pop band kit (jazz-tuned shells),
 * not an electronic pack. Techniques:
 *
 *  KICK   → pitched sine sweep 150→45Hz + beater click + shell resonance
 *  SNARE  → two-tone shell (185/333Hz) + wire rattle (bandpassed noise with
 *           decay-based tightness) + stick attack
 *  HATS   → 6 inharmonic square-ish oscillators (metallic partials) +
 *           bandpassed air; open hat = longer decay
 *  TOMS   → pitched membrane sweep, wide tuning, long ring
 *  CRASH  → inharmonic metal partial cloud, noise-dominant wash
 *  RIDE   → tone-dominant ping (1481Hz partial emphasized) + light wash
 *
 * Everything runs through a subtle warm saturation for naturalness.
 * Usage: node scripts/generateDrums.mjs   (writes public/samples/drums/)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SR = 44100;
const clamp = (v) => Math.max(-1, Math.min(1, v));
const noise = () => Math.random() * 2 - 1;

function lowpass(d, f, Q = 0.7) {
  const w = 2 * Math.PI * f / SR, a = Math.sin(w) / (2 * Q);
  const b0 = (1 - Math.cos(w)) / 2, b1 = 1 - Math.cos(w), b2 = b0;
  const a0 = 1 + a, a1 = -2 * Math.cos(w), a2 = 1 - a;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < d.length; i++) {
    const y = (b0 * d[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = d[i]; y2 = y1; y1 = d[i] = y;
  }
  return d;
}
function highpass(d, f, Q = 0.7) {
  const lp = new Float32Array(d); lowpass(lp, f, Q);
  for (let i = 0; i < d.length; i++) d[i] -= lp[i];
  return d;
}
function bandpass1(d, lo, hi) { lowpass(d, hi); highpass(d, lo); return d; }

/** Subtle asymmetric warmth — keeps the kit natural, not clinical */
function warm(d) {
  for (let i = 0; i < d.length; i++) {
    const x = d[i] * 1.35;
    d[i] = x > 0 ? Math.tanh(x * 1.05) : Math.tanh(x * 0.95);
  }
  return d;
}

function render(dur, fn) {
  const len = Math.floor(dur * SR), d = new Float32Array(len);
  for (let i = 0; i < len; i++) d[i] = clamp(fn(i / SR, i));
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

const dir = join(process.cwd(), "public", "samples", "drums");
mkdirSync(dir, { recursive: true });
let count = 0;
function save(name, data) {
  writeFileSync(join(dir, `${name}.wav`), wav(warm(new Float32Array(data))));
  count++;
  process.stdout.write(`${name} `);
}

/** Single-sample helper for inline bandpassed noise in render fns */
const bpNoise = (lo, hi) => bandpass1(new Float32Array([noise()]), lo, hi)[0];

// ─── KICK: pitched membrane 150→45Hz, beater click, shell thump ─────────────
function kick(tuning = 1) {
  return render(0.5, (t) => {
    const f = 45 * tuning + 105 * tuning * Math.exp(-t / 0.018);
    const body = Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.16);
    const click = t < 0.002 ? noise() * (1 - t / 0.002) * 0.5 : 0;
    const shell = Math.sin(2 * Math.PI * 190 * tuning * t) * Math.exp(-t / 0.05) * 0.22;
    return (body * 1.05 + click + shell) * 0.95;
  });
}

// ─── SNARE: two-tone shell + wire rattle (tightness = rattle decay) ─────────
function snare(tight = 0.8) {
  return render(0.28, (t) => {
    const drop = 1 - 0.35 * Math.exp(-t / 0.04);
    const shell = (Math.sin(2 * Math.PI * 185 * drop * t) * 0.6 + Math.sin(2 * Math.PI * 333 * drop * t) * 0.4)
      * Math.exp(-t / 0.085);
    const wireEnv = Math.exp(-t / (0.05 + 0.05 * (1 - tight)));
    const wire = noise() * wireEnv * 0.55;
    const stick = t < 0.0015 ? noise() * (1 - t / 0.0015) * 0.4 : 0;
    return (shell * 0.9 + wire + stick) * 0.92;
  });
}

// ─── HATS: 6 inharmonic metal partials + bandpassed air ─────────────────────
const HAT_PARTIALS = [3881, 5219, 6847, 8275, 10423, 12406];
function hat(open) {
  const dur = open ? 0.42 : 0.07;
  return render(dur, (t) => {
    const decay = Math.exp(-t / (open ? 0.13 : 0.017));
    let tone = 0;
    for (const f of HAT_PARTIALS) {
      tone += Math.sign(Math.sin(2 * Math.PI * f * t)) * 0.55 + Math.sin(2 * Math.PI * f * t) * 0.45;
    }
    tone /= HAT_PARTIALS.length * 1.4;
    const strike = t < 0.0012 ? noise() * (1 - t / 0.0012) * 0.6 : 0;
    return (tone * decay + bpNoise(6000, 14000) * decay * 0.4 + strike) * 0.85;
  });
}

// ─── TOM: pitched membrane sweep + 1.51 overtone, long ring ─────────────────
function tom(baseHz, dur = 0.42) {
  return render(dur, (t) => {
    const f = baseHz * (1 + 0.32 * Math.exp(-t / 0.022));
    const body = Math.sin(2 * Math.PI * f * t) * Math.exp(-t / (dur * 0.4));
    const stick = t < 0.0018 ? noise() * (1 - t / 0.0018) * 0.3 : 0;
    const overtone = Math.sin(2 * Math.PI * f * 1.51 * t) * Math.exp(-t / (dur * 0.2)) * 0.18;
    return (body * 0.95 + overtone + stick) * 0.9;
  });
}

// ─── CRASH / RIDE: inharmonic metal cloud ───────────────────────────────────
function cymbal(kind) {
  const partials = kind === "crash"
    ? [2841, 3719, 4627, 5841, 7106, 8309, 9725, 11403]
    : [1481, 2106, 2841, 3944, 5117, 6308];
  const dur = kind === "crash" ? 1.9 : 1.1;
  const noiseDom = kind === "crash" ? 0.75 : 0.35;
  return render(dur, (t) => {
    const decay = Math.exp(-t / (kind === "crash" ? 0.55 : 0.32));
    let tone = 0;
    for (const f of partials) {
      const w = kind === "ride" && f === 1481 ? 1.8 : 1;
      tone += Math.sin(2 * Math.PI * f * t + Math.sin(2 * Math.PI * f * 0.61 * t) * 0.7) * w;
    }
    tone /= partials.length;
    const strike = t < 0.002 ? noise() * (1 - t / 0.002) * 0.45 : 0;
    return (tone * decay + bpNoise(kind === "crash" ? 3800 : 6200, 15000) * decay + strike)
      * (kind === "crash" ? 0.72 : 0.6);
  });
}

process.stdout.write("Acoustic drums: ");
save("kick",    kick(1));
save("kick-2",  kick(0.92));
save("snare",   snare(0.8));
save("snare-2", snare(1));
save("hat-c1",  hat(false));
save("hat-c2",  hat(false));
save("hat-o1",  hat(true));
save("hat-o2",  hat(true));
save("tom-lo",  tom(105, 0.5));
save("tom-mid", tom(160, 0.45));
save("tom-hi",  tom(225, 0.4));
save("crash",   cymbal("crash"));
save("ride",    cymbal("ride"));
process.stdout.write(`\n${count} files -> ${dir}\n`);
