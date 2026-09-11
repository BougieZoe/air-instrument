export type SampleDefinition = {
  id: string;
  label: string;
  src: string;
  gain?: number;
  chokeGroup?: string;
};

export class SamplePlayer {
  private buffers = new Map<string, AudioBuffer>();
  private lastTrigger = new Map<string, number>();
  private activeChokes = new Map<string, AudioBufferSourceNode[]>();

  constructor(
    private readonly context: AudioContext,
    private readonly output: GainNode
  ) {}

  async load(samples: SampleDefinition[]) {
    await Promise.all(
      samples.map(async (sample) => {
        if (this.buffers.has(sample.id)) {
          return;
        }
        const response = await fetch(sample.src);
        const data = await response.arrayBuffer();
        const buffer = await this.context.decodeAudioData(data);
        this.buffers.set(sample.id, buffer);
      })
    );
  }

  trigger(sample: SampleDefinition, velocity = 0.85) {
    const now = this.context.currentTime;
    const last = this.lastTrigger.get(sample.id) ?? -1;
    if (now - last < 0.075) {
      return;
    }
    this.lastTrigger.set(sample.id, now);

    if (sample.chokeGroup) {
      this.activeChokes.get(sample.chokeGroup)?.forEach((source) => {
        try {
          source.stop(now + 0.006);
        } catch {
          return;
        }
      });
      this.activeChokes.set(sample.chokeGroup, []);
    }

    const buffer = this.buffers.get(sample.id);
    if (!buffer) {
      return;
    }

    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    gain.gain.value = (sample.gain ?? 1) * Math.max(0.15, Math.min(1, velocity));
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(this.output);
    source.start(now);

    if (sample.chokeGroup) {
      const active = this.activeChokes.get(sample.chokeGroup) ?? [];
      active.push(source);
      source.onended = () => {
        this.activeChokes.set(
          sample.chokeGroup!,
          (this.activeChokes.get(sample.chokeGroup!) ?? []).filter((item) => item !== source)
        );
      };
      this.activeChokes.set(sample.chokeGroup, active);
    }
  }
}
