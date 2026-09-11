import { SAMPLE_DEBOUNCE_S } from "../config";

export type SampleDefinition = { id: string; label: string; src: string; gain?: number; chokeGroup?: string; };

export class SamplePlayer {
  private buffers      = new Map<string, AudioBuffer>();
  private lastTrigger  = new Map<string, number>();
  private activeChokes = new Map<string, AudioBufferSourceNode[]>();

  constructor(private readonly context: AudioContext, private readonly output: GainNode) {}

  async load(samples: SampleDefinition[]) {
    await Promise.all(samples.map(async (s) => {
      if (this.buffers.has(s.id)) return;
      const response = await fetch(s.src);
      const data = await response.arrayBuffer();
      this.buffers.set(s.id, await this.context.decodeAudioData(data));
    }));
  }

  trigger(sample: SampleDefinition, velocity = 0.85) {
    const now  = this.context.currentTime;
    const last = this.lastTrigger.get(sample.id) ?? -1;
    if (now - last < SAMPLE_DEBOUNCE_S) return;
    this.lastTrigger.set(sample.id, now);

    if (sample.chokeGroup) {
      for (const source of this.activeChokes.get(sample.chokeGroup) ?? []) {
        try { source.stop(now + 0.006); } catch { /* already ended */ }
      }
      this.activeChokes.set(sample.chokeGroup, []);
    }

    const buffer = this.buffers.get(sample.id);
    if (!buffer) return;

    const source = this.context.createBufferSource();
    const gain   = this.context.createGain();
    gain.gain.value = (sample.gain ?? 1) * Math.max(0.15, Math.min(1, velocity));
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(this.output);
    source.start(now);

    if (sample.chokeGroup) {
      const group  = sample.chokeGroup;
      const active = this.activeChokes.get(group) ?? [];
      active.push(source);
      source.onended = () => { this.activeChokes.set(group, (this.activeChokes.get(group) ?? []).filter((s) => s !== source)); };
      this.activeChokes.set(group, active);
    }
  }
}
