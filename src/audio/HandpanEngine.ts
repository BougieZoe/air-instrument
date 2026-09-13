/**
 * HandpanEngine — additive synthesis of a steel handpan ("hang drum").
 *
 * Real handpans are tuned shells whose vibration modes are decidedly
 * INharmonic (ratios like 1 : 1.51 : 2.52 : 3.36...). Reproducing exactly
 * those mode ratios — each with its own decay rate (low modes ring for
 * seconds, high modes vanish quickly) plus a broadband strike transient and a
 * long reverb tail — is what makes handpans instantly recognizable. Pure
 * harmonic synths sound like bells; this sounds like a handpan.
 */

// Measured-mode-inspired structure of a handpan tone field
const MODES = [
  { ratio: 0.50, amp: 0.50 },  // Helmholtz-type coupling — the deep "gu" hum
  { ratio: 1.00, amp: 1.00 },  // fundamental
  { ratio: 1.51, amp: 0.40 },  // quint-ish mode
  { ratio: 2.00, amp: 0.30 },
  { ratio: 2.52, amp: 0.20 },
  { ratio: 3.36, amp: 0.13 },
  { ratio: 4.65, amp: 0.07 },
];

const VOICE_DECAY_S = 3.4;   // fundamental ring-out
const MAX_VOICE_LIFE_S = 4.6;

export class HandpanEngine {
  private cleanups = new Set<ReturnType<typeof setTimeout>>();

  constructor(
    private readonly context: AudioContext,
    private readonly dry: GainNode,
    private readonly reverbSend: GainNode,
  ) {}

  trigger(freq: number, velocity = 0.8) {
    if (this.cleanups.size > 40) return; // polyphony guard
    const ctx = this.context;
    const now = ctx.currentTime;
    const vel = Math.max(0.15, Math.min(1, velocity));

    const out = ctx.createGain();
    out.gain.setValueAtTime(vel, now);
    out.gain.exponentialRampToValueAtTime(0.0008, now + VOICE_DECAY_S);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 3600 + vel * 3200;
    filter.Q.value = 0.5;
    out.connect(filter);

    const wet = ctx.createGain();
    wet.gain.value = 0.5; // handpans live in reverb
    filter.connect(this.dry);
    filter.connect(wet);
    wet.connect(this.reverbSend);

    for (const mode of MODES) {
      const decayS = Math.max(0.4, VOICE_DECAY_S / Math.pow(mode.ratio, 0.85));
      const amp = mode.amp * vel;
      const partial = ctx.createGain();
      partial.gain.setValueAtTime(amp, now);
      partial.gain.exponentialRampToValueAtTime(0.0002, now + decayS);
      partial.connect(out);

      // Two slightly detuned sines per mode → slow beating, like real shells
      for (const cents of [-2.5, 2.5]) {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq * mode.ratio;
        osc.detune.value = cents;
        osc.connect(partial);
        osc.start(now);
        osc.stop(now + decayS + 0.3);
      }
    }

    // Strike transient: soft mallet thump
    const strikeLen = Math.round(ctx.sampleRate * 0.012);
    const strikeBuffer = ctx.createBuffer(1, strikeLen, ctx.sampleRate);
    const strikeData = strikeBuffer.getChannelData(0);
    for (let i = 0; i < strikeLen; i++) strikeData[i] = (Math.random() * 2 - 1) * (1 - i / strikeLen);
    const strike = ctx.createBufferSource();
    strike.buffer = strikeBuffer;
    const strikeBp = ctx.createBiquadFilter();
    strikeBp.type = "bandpass";
    strikeBp.frequency.value = freq * 1.3;
    strikeBp.Q.value = 1.1;
    const strikeGain = ctx.createGain();
    strikeGain.gain.setValueAtTime(vel * 0.45, now);
    strikeGain.gain.exponentialRampToValueAtTime(0.0002, now + 0.03);
    strike.connect(strikeBp);
    strikeBp.connect(strikeGain);
    strikeGain.connect(filter);
    strike.start(now);

    const cleanup = setTimeout(() => {
      try { out.disconnect(); filter.disconnect(); wet.disconnect(); } catch { /* gone */ }
      this.cleanups.delete(cleanup);
    }, MAX_VOICE_LIFE_S * 1000);
    this.cleanups.add(cleanup);
  }

  releaseAll() { /* voices decay naturally */ }

  dispose() {
    for (const cleanup of this.cleanups) clearTimeout(cleanup);
    this.cleanups.clear();
  }
}
