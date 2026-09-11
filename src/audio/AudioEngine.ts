import { AudioAnalyser } from "./analyser";
import { AccompanimentPlayer } from "./AccompanimentPlayer";
import { createGain } from "./mixer";
import { PianoEngine } from "./PianoEngine";
import { SamplePlayer, type SampleDefinition } from "./SamplePlayer";

export class AudioEngine {
  readonly context: AudioContext;
  readonly sampleBus: GainNode;
  readonly pianoBus: GainNode;
  readonly accompanimentBus: GainNode;
  readonly master: GainNode;
  readonly compressor: DynamicsCompressorNode;
  readonly analyserNode: AnalyserNode;
  readonly analyser: AudioAnalyser;
  readonly samples: SamplePlayer;
  readonly piano: PianoEngine;
  readonly accompaniment: AccompanimentPlayer;

  constructor() {
    this.context = new AudioContext({ latencyHint: "interactive" });
    this.sampleBus = createGain(this.context, 0.88);
    this.pianoBus = createGain(this.context, 0.74);
    this.accompanimentBus = createGain(this.context, 0.66);
    this.master = createGain(this.context, 0.84);
    this.compressor = this.context.createDynamicsCompressor();
    this.analyserNode = this.context.createAnalyser();

    this.compressor.threshold.value = -16;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.004;
    this.compressor.release.value = 0.18;

    this.sampleBus.connect(this.master);
    this.pianoBus.connect(this.master);
    this.accompanimentBus.connect(this.master);
    this.master.connect(this.compressor);
    this.compressor.connect(this.analyserNode);
    this.analyserNode.connect(this.context.destination);

    this.analyser = new AudioAnalyser(this.analyserNode);
    this.samples = new SamplePlayer(this.context, this.sampleBus);
    this.piano = new PianoEngine(this.context, this.pianoBus);
    this.accompaniment = new AccompanimentPlayer(this.context, this.accompanimentBus);
  }

  async resume() {
    if (this.context.state !== "running") {
      await this.context.resume();
    }
  }

  async loadSamples(samples: SampleDefinition[]) {
    await this.resume();
    await this.samples.load(samples);
  }

  getLevel() {
    return this.analyser.getLevel();
  }
}
