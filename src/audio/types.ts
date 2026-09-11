/**
 * src/audio/types.ts
 *
 * Shared audio interfaces. Concrete implementations (synth, sampled, SF2, etc.)
 * all satisfy these contracts — AudioEngine and instruments depend only on these,
 * never on a specific implementation class.
 */

/**
 * Piano engine interface. Any implementation (synth, sampled, SF2, MIDI) must
 * satisfy this. Swap implementations by replacing the instance in AudioEngine.
 *
 * Adding a realistic piano later:
 *   1. Create SampledPianoEngine implements IPianoEngine
 *   2. Load one AudioBuffer per sampled note (e.g. Salamander Piano, MIDI.js)
 *   3. Pass it to AudioEngine constructor or call engine.setPianoEngine(new SampledPianoEngine(...))
 */
export interface IPianoEngine {
  /** Start a note. voiceId allows multiple fingers on the same pitch. */
  noteOn(note: string, velocity?: number, voiceId?: string): void;
  /** Release a specific voice. */
  noteOff(voiceId: string): void;
  /** Release all active voices (called on mode switch / cleanup). */
  releaseAll(): void;
}

/**
 * Sample pack definition. Each pack is a named collection of SampleDefinitions.
 * Swap packs at runtime without touching instrument logic.
 *
 * Adding a new pack (e.g. "Jazz Kit", "808 Mafia"):
 *   1. Add WAV files to public/samples/<pack-name>/
 *   2. Create a new samplePack object satisfying this type
 *   3. Pass it to AudioEngine.loadSamplePack(pack) — the sampler reloads
 */
export type SamplePack = {
  /** Unique identifier, e.g. "trap-demo", "jazz-kit" */
  id: string;
  /** Display name shown in the UI */
  name: string;
  /** The 16 pad definitions, in grid order */
  pads: SamplePadDefinition[];
};

export type SamplePadDefinition = {
  /** Pad id, matches the HTML element's data-pad-id */
  id: string;
  /** Short label shown on the pad */
  label: string;
  /** Path to the audio file, relative to public/ */
  src: string;
  /** Linear gain multiplier (default 1.0) */
  gain?: number;
  /**
   * Choke group: pads sharing a group stop each other when triggered.
   * Classic use: open-hat and closed-hat share "hat".
   */
  chokeGroup?: string;
};
