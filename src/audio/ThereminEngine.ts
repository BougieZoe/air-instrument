/**
 * ThereminEngine — continuous-pitch air synthesizer.
 *
 * A true theremin has no keys: hand position IS the pitch. This engine keeps
 * two slightly-detuned sines running continuously and morphs frequency with
 * exponential smoothing, so hand movement glides between pitches exactly like
 * the real instrument. A slow LFO adds vibrato whose depth grows with volume,
 * turning natural hand jitter into musical expression instead of error.
 */

export class ThereminEngine {
  private osc1: OscillatorNode;
  private osc2: OscillatorNode;
  private voiceGain: GainNode;
  private vibDepth: GainNode;
  private disposed = false;

  constructor(
    private readonly context: AudioContext,
    dry: GainNode,
    reverbSend: GainNode,
  ) {
    const ctx = this.context;

    this.osc1 = ctx.createOscillator();
    this.osc1.type = "sine";
    this.osc1.frequency.value = 293.66; // D4

    this.osc2 = ctx.createOscillator();
    this.osc2.type = "sine";
    this.osc2.frequency.value = 293.66;
    this.osc2.detune.value = 7; // gentle chorus shimmer

    this.voiceGain = ctx.createGain();
    this.voiceGain.gain.value = 0;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 4800;
    filter.Q.value = 0.6;

    // Vibrato LFO → both oscillators' frequency
    const vibLfo = ctx.createOscillator();
    vibLfo.type = "sine";
    vibLfo.frequency.value = 5.4;
    this.vibDepth = ctx.createGain();
    this.vibDepth.gain.value = 0;
    vibLfo.connect(this.vibDepth);
    this.vibDepth.connect(this.osc1.frequency);
    this.vibDepth.connect(this.osc2.frequency);

    this.osc1.connect(this.voiceGain);
    this.osc2.connect(this.voiceGain);
    this.voiceGain.connect(filter);
    filter.connect(dry);

    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    filter.connect(wet);
    wet.connect(reverbSend);

    const now = ctx.currentTime;
    this.osc1.start(now);
    this.osc2.start(now);
    vibLfo.start(now);
  }

  /** Glide to a frequency / volume. Called every frame while the hand moves. */
  setTone(freq: number, volume: number) {
    if (this.disposed) return;
    const now = this.context.currentTime;
    const f = Math.max(40, Math.min(2200, freq));
    const v = Math.max(0, Math.min(1, volume));
    this.osc1.frequency.setTargetAtTime(f, now, 0.03);
    this.osc2.frequency.setTargetAtTime(f, now, 0.03);
    // Vibrato depth scales with pitch + expressiveness (real players' vibrato
    // widens on louder notes)
    this.vibDepth.gain.setTargetAtTime(f * 0.006 * (0.35 + v * 0.65), now, 0.25);
    this.voiceGain.gain.setTargetAtTime(v * 0.5, now, 0.05);
  }

  /** Fade out — hand lost / fist / pointer up. Idempotent. */
  silence() {
    if (this.disposed) return;
    this.voiceGain.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.08);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    const now = this.context.currentTime;
    for (const osc of [this.osc1, this.osc2]) {
      try { osc.stop(now + 0.2); } catch { /* already stopped */ }
    }
    setTimeout(() => {
      try { this.voiceGain.disconnect(); this.vibDepth.disconnect(); } catch { /* noop */ }
    }, 300);
  }
}
