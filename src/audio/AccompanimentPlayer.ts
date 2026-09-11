import { GAIN_ACCOMPANIMENT_DEFAULT } from "../config";

export type AccompanimentState = {
  fileName: string | null;
  isPlaying: boolean;
  volume: number;
};

export class AccompanimentPlayer {
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private startedAt = 0;
  private pausedAt  = 0;
  readonly gain: GainNode;
  state: AccompanimentState = { fileName: null, isPlaying: false, volume: GAIN_ACCOMPANIMENT_DEFAULT };

  constructor(private readonly context: AudioContext, output: GainNode) {
    this.gain = context.createGain();
    this.gain.gain.value = this.state.volume;
    this.gain.connect(output);
  }

  async load(file: File) {
    this.stop();
    const data = await file.arrayBuffer();
    this.buffer = await this.context.decodeAudioData(data);
    this.pausedAt = 0;
    this.state = { ...this.state, fileName: file.name, isPlaying: false };
  }

  play() {
    if (!this.buffer || this.state.isPlaying) return;
    const source = this.context.createBufferSource();
    source.buffer = this.buffer;
    source.connect(this.gain);
    source.onended = () => {
      if (this.source === source) { this.source = null; this.pausedAt = 0; this.state = { ...this.state, isPlaying: false }; }
    };
    this.startedAt = this.context.currentTime - this.pausedAt;
    source.start(this.context.currentTime, this.pausedAt);
    this.source = source;
    this.state = { ...this.state, isPlaying: true };
  }

  pause() {
    if (!this.source || !this.state.isPlaying) return;
    this.pausedAt = Math.max(0, this.context.currentTime - this.startedAt);
    this.source.stop();
    this.source.disconnect();
    this.source = null;
    this.state = { ...this.state, isPlaying: false };
  }

  restart() { this.stop(); this.play(); }

  stop() {
    if (this.source) {
      try { this.source.stop(); } catch { /* already stopped */ }
      this.source.disconnect();
    }
    this.source = null;
    this.pausedAt = 0;
    this.state = { ...this.state, isPlaying: false };
  }

  setVolume(volume: number) {
    this.state = { ...this.state, volume };
    this.gain.gain.setTargetAtTime(volume, this.context.currentTime, 0.025);
  }
}
