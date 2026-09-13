/**
 * PluckEngine — Karplus-Strong physical string modeling in Web Audio.
 *
 * A burst of noise circulates through a tuned delay loop, losing highs at
 * every cycle (string losses) and overall energy (feedback < 1). This is the
 * textbook physical model of a plucked string — the resulting tone has the
 * natural inharmonic attack and slow bright-to-dark decay of a real string,
 * which additive or sampled approximations struggle to match.
 *
 * Used by Air Harp (guzheng preset) and Air Kalimba (tine preset).
 */

export type PluckPreset = {
  /** Loop feedback 0-1: higher = longer ring. */
  feedback: number;
  /** Seconds until the voice is fully faded and torn down. */
  decay: number;
  /** Base low-pass ceiling of the damping filter (velocity adds on top). */
  brightness: number;
  /** Amplitude of the attack transient (nail / tine click). */
  click: number;
  /** Reverb send amount 0-1. */
  reverb: number;
};

export const HARP_PRESET: PluckPreset    = { feedback: 0.986, decay: 3.2,  brightness: 4200, click: 0.10, reverb: 0.38 };
export const KALIMBA_PRESET: PluckPreset = { feedback: 0.952, decay: 1.2,  brightness: 5600, click: 0.34, reverb: 0.26 };

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
    const period = 1 / Math.max(20, Math.min(4000, freq));

    // ── Karplus-Strong loop: delay → damper → feedback → delay ──
    const delay = ctx.createDelay(0.05);
    delay.delayTime.value = period;
    const damper = ctx.createBiquadFilter();
    damper.type = "lowpass";
    damper.frequency.value = 1500 + preset.brightness * (0.35 + vel * 0.9);
    damper.Q.value = 0.4;
    const feedback = ctx.createGain();
    feedback.gain.value = preset.feedback;
    delay.connect(damper);
    damper.connect(feedback);
    feedback.connect(delay);

    // Excitation: one period of tapered noise burst
    const burstLen = Math.max(2, Math.round(ctx.sampleRate * period));
    const burstBuffer = ctx.createBuffer(1, burstLen, ctx.sampleRate);
    const burstData = burstBuffer.getChannelData(0);
    for (let i = 0; i < burstLen; i++) burstData[i] = (Math.random() * 2 - 1) * (1 - i / burstLen);
    const burst = ctx.createBufferSource();
    burst.buffer = burstBuffer;
    burst.connect(delay);
    burst.start(now);

    // Micro detune drift so no two plucks are identical (real strings never are)
    delay.delayTime.setTargetAtTime(period * (1 + (Math.random() - 0.5) * 0.0022), now, 0.06);

    // ── Output tap + envelope ──
    const out = ctx.createGain();
    out.gain.setValueAtTime(vel, now);
    out.gain.exponentialRampToValueAtTime(0.0008, now + preset.decay);
    damper.connect(out);
    out.connect(this.dry);
    const wet = ctx.createGain();
    wet.gain.value = preset.reverb;
    out.connect(wet);
    wet.connect(this.reverbSend);

    // ── Attack transient (nail / tine click) ──
    if (preset.click > 0) {
      const clickLen = Math.max(16, Math.round(ctx.sampleRate * 0.004));
      const clickBuffer = ctx.createBuffer(1, clickLen, ctx.sampleRate);
      const clickData = clickBuffer.getChannelData(0);
      for (let i = 0; i < clickLen; i++) clickData[i] = (Math.random() * 2 - 1) * (1 - i / clickLen);
      const click = ctx.createBufferSource();
      click.buffer = clickBuffer;
      const clickHp = ctx.createBiquadFilter();
      clickHp.type = "highpass";
      clickHp.frequency.value = 1800;
      const clickGain = ctx.createGain();
      clickGain.gain.value = preset.click * vel;
      click.connect(clickHp);
      clickHp.connect(clickGain);
      clickGain.connect(this.dry);
      click.start(now);
      setTimeout(() => { try { clickGain.disconnect(); } catch { /* noop */ } }, 120);
    }

    // Tear the loop down after the tail — Web Audio has no "stop" for it
    const cleanup: Cleanup = setTimeout(() => {
      try {
        feedback.gain.value = 0;
        delay.disconnect(); damper.disconnect(); out.disconnect(); wet.disconnect();
      } catch { /* already gone */ }
      this.cleanups.delete(cleanup);
    }, (preset.decay + 0.4) * 1000);
    this.cleanups.add(cleanup);
  }

  /** Plucks ring out naturally — nothing is held, so release is a no-op. */
  releaseAll() { /* noop */ }

  dispose() {
    for (const cleanup of this.cleanups) clearTimeout(cleanup);
    this.cleanups.clear();
  }
}
