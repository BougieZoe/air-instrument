/**
 * PluckEngine — Karplus-Strong physical string modeling, rendered in pure JS.
 *
 * A noise burst circulates through a tuned delay loop, losing highs at every
 * cycle (string stiffness losses) and overall energy (feedback < 1) — the
 * textbook physical model of a plucked string.
 *
 * IMPORTANT: the KS loop is executed in JavaScript over a Float32Array and
 * played back via an AudioBufferSourceNode, NOT with a Web Audio delay
 * feedback loop. A DelayNode loop is quantized to 128-sample render quanta
 * (≈2.9ms), which caps pitch at ≈344Hz and turns everything above into the
 * same low thud. Direct rendering is mathematically exact at any pitch.
 *
 * Used by Air Harp (guzheng preset) and Air Kalimba (tine preset).
 */

export type PluckPreset = {
  /** Loop feedback 0-1: higher = longer ring. */
  feedback: number;
  /** Seconds until the voice is fully faded and torn down. */
  decay: number;
  /** One-pole damping coefficient per pass (higher = darker faster). */
  damp: number;
  /** Amplitude of the attack transient (nail / tine click). */
  click: number;
  /** Reverb send amount 0-1. */
  reverb: number;
  /** Micro detune drift of the loop (real strings never hold pitch dead-on). */
  drift: number;
};

export const HARP_PRESET: PluckPreset    = { feedback: 0.996, decay: 3.4,  damp: 0.9965, click: 0.08, reverb: 0.38, drift: 0.0022 };
export const KALIMBA_PRESET: PluckPreset = { feedback: 0.978, decay: 1.3,  damp: 0.988,  click: 0.30, reverb: 0.26, drift: 0.0035 };

/** Render one exact Karplus-Strong pluck into a fresh buffer. */
function renderKS(
  sampleRate: number,
  freq: number,
  velocity: number,
  preset: PluckPreset,
): Float32Array {
  const period = sampleRate / Math.max(20, Math.min(4200, freq));
  const N = Math.max(2, Math.round(period));
  // The loop delay is N samples: one damping low-pass pass per period.
  const length = Math.floor(sampleRate * preset.decay);
  const out = new Float32Array(length);

  // Excitation: one period of tapered noise (pluck position asymmetry via
  // comb-ish taper offset) — richer than pure white.
  const burst = new Float32Array(N);
  for (let i = 0; i < N; i++) burst[i] = (Math.random() * 2 - 1) * (1 - i / N);

  // Pick-position comb filter: attenuates one harmonic series like a real
  // pluck point between bridge and nut (30% from the bridge).
  const pickPoint = 0.3;
  for (let i = N - 1; i >= Math.round(N * pickPoint); i--) burst[i] -= burst[i - Math.round(N * pickPoint)];

  let y1 = 0; // one-pole damper state
  const dampK = preset.damp;

  for (let i = 0; i < length; i++) {
    const idx = i % N;
    const current = burst[idx];
    out[i] = current;
    // One-pole low-pass pass + feedback: the KS update
    y1 += dampK * (current - y1);
    burst[idx] = (y1 + current * (1 - dampK) * 0.2) * preset.feedback;
  }
  // Velocity shapes level; keep peaks sane
  const gain = velocity * 0.9;
  for (let i = 0; i < length; i++) out[i] *= gain;
  return out;
}

/** Add a tine/nail attack transient at the head of the buffer. */
function addClick(samples: Float32Array, sampleRate: number, amount: number) {
  const clickLen = Math.max(16, Math.round(sampleRate * 0.004));
  for (let i = 0; i < Math.min(clickLen, samples.length); i++) {
    samples[i] += (Math.random() * 2 - 1) * (1 - i / clickLen) * amount;
  }
}

type Cleanup = ReturnType<typeof setTimeout>;

export class PluckEngine {
  private cleanups = new Set<Cleanup>();

  constructor(
    private readonly context: AudioContext,
    private readonly dry: GainNode,
    private readonly reverbSend: GainNode,
  ) {}

  /** Pluck one string/tine. Safe to call at audio rate — voices are independent. */
  pluck(freq: number, velocity = 0.8, preset: PluckPreset = HARP_PRESET) {
    const ctx = this.context;
    const now = ctx.currentTime;
    const vel = Math.max(0.15, Math.min(1, velocity));

    // Exact KS render (≈1-3ms of JS for a 3s buffer — well under one frame)
    const rendered = renderKS(ctx.sampleRate, freq, vel, preset);
    addClick(rendered, ctx.sampleRate, preset.click * vel);

    const buffer = ctx.createBuffer(1, rendered.length, ctx.sampleRate);
    buffer.copyToChannel(rendered as Float32Array<ArrayBuffer>, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    // Micro detune drift — no two plucks identical (real strings never are)
    source.playbackRate.value = 1 + (Math.random() - 0.5) * preset.drift;

    const out = ctx.createGain();
    out.gain.value = 1;
    source.connect(out);
    out.connect(this.dry);

    const wet = ctx.createGain();
    wet.gain.value = preset.reverb;
    out.connect(wet);
    wet.connect(this.reverbSend);

    source.start(now);

    const cleanup: Cleanup = setTimeout(() => {
      try { out.disconnect(); wet.disconnect(); } catch { /* already gone */ }
      this.cleanups.delete(cleanup);
    }, (preset.decay + 0.5) * 1000);
    this.cleanups.add(cleanup);
  }

  /** Plucks ring out naturally — nothing is held, so release is a no-op. */
  releaseAll() { /* noop */ }

  dispose() {
    for (const cleanup of this.cleanups) clearTimeout(cleanup);
    this.cleanups.clear();
  }
}
