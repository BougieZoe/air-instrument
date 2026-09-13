import { ANALYSER_FFT_SIZE, ANALYSER_SMOOTHING, COMPRESSOR_ATTACK, COMPRESSOR_KNEE, COMPRESSOR_RATIO, COMPRESSOR_RELEASE, COMPRESSOR_THRESHOLD, GAIN_ACCOMPANIMENT_BUS, GAIN_AUX_BUS, GAIN_MASTER, GAIN_PIANO_BUS, GAIN_REVERB_RETURN, GAIN_REVERB_SEND, GAIN_SAMPLE_BUS } from "../config";
import { AudioAnalyser } from "./analyser";
import { AccompanimentPlayer } from "./AccompanimentPlayer";
import { createGain } from "./mixer";
import { MidiOutput } from "./MidiOutput";
import { PianoEngine } from "./PianoEngine";
import { SamplePlayer, type SampleDefinition } from "./SamplePlayer";
import type { IPianoEngine, SamplePack } from "./types";

export class AudioEngine {
  readonly context: AudioContext;
  readonly sampleBus: GainNode;
  readonly pianoBus: GainNode;
  readonly auxBus: GainNode;
  /** Shared reverb: instruments send here for room ambience (realism). */
  readonly reverbSend: GainNode;
  readonly accompanimentBus: GainNode;
  readonly master: GainNode;
  readonly compressor: DynamicsCompressorNode;
  readonly analyserNode: AnalyserNode;
  readonly analyser: AudioAnalyser;
  readonly samples: SamplePlayer;
  readonly midi: MidiOutput;
  /** Swappable piano implementation — synth today, sampled/SF2 tomorrow. */
  piano: IPianoEngine;
  readonly accompaniment: AccompanimentPlayer;

  constructor() {
    this.context          = new AudioContext({ latencyHint: "interactive" });
    this.sampleBus        = createGain(this.context, GAIN_SAMPLE_BUS);
    this.pianoBus         = createGain(this.context, GAIN_PIANO_BUS);
    this.auxBus           = createGain(this.context, GAIN_AUX_BUS);
    this.reverbSend       = createGain(this.context, GAIN_REVERB_SEND);
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
    this.auxBus.connect(this.master);
    this.accompanimentBus.connect(this.master);
    // Reverb tail: synthesized instruments send a portion here → sounds like
    // they live in a real room instead of a dry closet.
    const reverb      = this.context.createConvolver();
    reverb.buffer     = this.createImpulseResponse(2.4, 2.9);
    const reverbReturn = createGain(this.context, GAIN_REVERB_RETURN);
    this.reverbSend.connect(reverb);
    reverb.connect(reverbReturn);
    reverbReturn.connect(this.master);
    this.master.connect(this.compressor);
    this.compressor.connect(this.analyserNode);
    this.analyserNode.connect(this.context.destination);
    this.analyser      = new AudioAnalyser(this.analyserNode);
    this.samples       = new SamplePlayer(this.context, this.sampleBus);
    this.piano         = new PianoEngine(this.context, this.pianoBus);
    this.midi          = new MidiOutput();
    this.accompaniment = new AccompanimentPlayer(this.context, this.accompanimentBus);
  }

  /** Stereo exponential-decay noise impulse — a believable small hall. */
  private createImpulseResponse(seconds: number, decay: number): AudioBuffer {
    const rate   = this.context.sampleRate;
    const length = Math.floor(rate * seconds);
    const impulse = this.context.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        // Exponential decay + slight early-reflection density taper
        const t = i / length;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
      }
      // A few discrete early reflections for spatial definition
      for (const [ms, amp] of [[23, 0.4], [41, 0.3], [67, 0.22], [89, 0.16]]) {
        const idx = Math.floor((ms / 1000) * rate) + ch * 7;
        if (idx < length) data[idx] += amp;
      }
    }
    return impulse;
  }

  async resume() { if (this.context.state !== "running") await this.context.resume(); }
  async loadSamples(samples: SampleDefinition[]) { await this.resume(); await this.samples.load(samples); }
  async loadSamplePack(pack: SamplePack) { await this.resume(); await this.samples.loadPack(pack); }
  /** Swap the piano engine at runtime (e.g. synth → sampled). Releases old voices first. */
  setPianoEngine(engine: IPianoEngine) { this.piano.releaseAll(); this.piano = engine; }
  getLevel() { return this.analyser.getLevel(); }
}
