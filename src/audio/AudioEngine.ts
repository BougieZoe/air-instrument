import { ANALYSER_FFT_SIZE, ANALYSER_SMOOTHING, COMPRESSOR_ATTACK, COMPRESSOR_KNEE, COMPRESSOR_RATIO, COMPRESSOR_RELEASE, COMPRESSOR_THRESHOLD, GAIN_ACCOMPANIMENT_BUS, GAIN_MASTER, GAIN_PIANO_BUS, GAIN_SAMPLE_BUS } from "../config";
import { AudioAnalyser } from "./analyser";
import { AccompanimentPlayer } from "./AccompanimentPlayer";
import { createGain } from "./mixer";
import { PianoEngine } from "./PianoEngine";
import { SamplePlayer, type SampleDefinition } from "./SamplePlayer";
import type { IPianoEngine, SamplePack } from "./types";

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
  /** Swappable piano implementation — synth today, sampled/SF2 tomorrow. */
  piano: IPianoEngine;
  readonly accompaniment: AccompanimentPlayer;

  constructor() {
    this.context          = new AudioContext({ latencyHint: "interactive" });
    this.sampleBus        = createGain(this.context, GAIN_SAMPLE_BUS);
    this.pianoBus         = createGain(this.context, GAIN_PIANO_BUS);
    this.accompanimentBus = createGain(this.context, GAIN_ACCOMPANIMENT_BUS);
    this.master           = createGain(this.context, GAIN_MASTER);
    this.compressor       = this.context.createDynamicsCompressor();
    this.analyserNode     = this.context.createAnalyser();
    this.compressor.threshold.value = COMPRESSOR_THRESHOLD;
    this.compressor.knee.value      = COMPRESSOR_KNEE;
    this.compressor.ratio.value     = COMPRESSOR_RATIO;
    this.compressor.attack.value    = COMPRESSOR_ATTACK;
    this.compressor.release.value   = COMPRESSOR_RELEASE;
    this.sampleBus.connect(this.master);
    this.pianoBus.connect(this.master);
    this.accompanimentBus.connect(this.master);
    this.master.connect(this.compressor);
    this.compressor.connect(this.analyserNode);
    this.analyserNode.connect(this.context.destination);
    this.analyser      = new AudioAnalyser(this.analyserNode);
    this.samples       = new SamplePlayer(this.context, this.sampleBus);
    this.piano         = new PianoEngine(this.context, this.pianoBus);
    this.accompaniment = new AccompanimentPlayer(this.context, this.accompanimentBus);
  }

  async resume() { if (this.context.state !== "running") await this.context.resume(); }
  async loadSamples(samples: SampleDefinition[]) { await this.resume(); await this.samples.load(samples); }
  async loadSamplePack(pack: SamplePack) { await this.resume(); await this.samples.loadPack(pack); }
  /** Swap the piano engine at runtime (e.g. synth → sampled). Releases old voices first. */
  setPianoEngine(engine: IPianoEngine) { this.piano.releaseAll(); this.piano = engine; }
  getLevel() { return this.analyser.getLevel(); }
}
