/**
 * ScratchEngine — turntable-style audio playback.
 *
 * Loads AudioBuffers and scrubs them with variable playbackRate.
 * Negative rate = reverse playback. Two independent decks with crossfader.
 */

export type ScratchSample = {
  id: string;
  label: string;
  src: string;
};

type DeckState = {
  buffer: AudioBuffer | null;
  source: AudioBufferSourceNode | null;
  gain: GainNode;
  filter: BiquadFilterNode;
  sampleId: string | null;
  playing: boolean;
  playbackRate: number;
  startOffset: number;    // where in the buffer playback started
  startContextTime: number; // context time when playback started
};

export class ScratchEngine {
  private decks: [DeckState, DeckState];
  private crossfade: GainNode;
  private crossfadeValue = 0.5; // 0 = deck A, 1 = deck B
  readonly output: GainNode;
  private buffers = new Map<string, AudioBuffer>();
  private loading = new Map<string, Promise<AudioBuffer>>();

  constructor(private readonly context: AudioContext) {
    this.output = context.createGain();
    this.crossfade = context.createGain();

    const deckA = this.createDeck();
    const deckB = this.createDeck();

    // Deck A → crossfade (1 - value)
    // Deck B → crossfade (value)
    deckA.gain.connect(this.crossfade);
    deckB.gain.connect(this.crossfade);
    this.crossfade.connect(this.output);

    this.decks = [deckA, deckB];
    this.updateCrossfade();
  }

  private createDeck(): DeckState {
    return {
      buffer: null,
      source: null,
      gain: this.context.createGain(),
      filter: this.context.createBiquadFilter(),
      sampleId: null,
      playing: false,
      playbackRate: 1,
      startOffset: 0,
      startContextTime: 0,
    };
  }

  get outputNode(): GainNode {
    return this.output;
  }

  // ─── Sample loading ────────────────────────────────────────────────────────

  async loadSample(sample: ScratchSample): Promise<void> {
    if (this.buffers.has(sample.id) || this.loading.has(sample.id)) return;
    const p = fetch(sample.src)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
      .then((ab) => this.context.decodeAudioData(ab));
    this.loading.set(sample.id, p);
    const buf = await p;
    this.buffers.set(sample.id, buf);
    this.loading.delete(sample.id);
  }

  getBuffer(sampleId: string): AudioBuffer | null {
    return this.buffers.get(sampleId) ?? null;
  }

  isLoaded(sampleId: string): boolean {
    return this.buffers.has(sampleId);
  }

  // ─── Deck control ──────────────────────────────────────────────────────────

  /** Load a sample into a deck and optionally auto-play from the start. */
  loadDeck(deckIndex: 0 | 1, sampleId: string, autoPlay = true): void {
    const deck = this.decks[deckIndex];
    const buffer = this.buffers.get(sampleId);
    if (!buffer) return;

    this.stopDeck(deckIndex);
    deck.buffer = buffer;
    deck.sampleId = sampleId;

    if (autoPlay) this.playDeck(deckIndex, 0, 1);
  }

  /** Start playback from a buffer offset at the given rate. */
  playDeck(deckIndex: 0 | 1, offset = 0, rate = 1): void {
    const deck = this.decks[deckIndex];
    if (!deck.buffer) return;
    this.stopDeck(deckIndex);

    const source = this.context.createBufferSource();
    source.buffer = deck.buffer;
    source.playbackRate.value = rate;
    source.connect(deck.filter);
    deck.filter.connect(deck.gain);
    deck.filter.type = "lowpass";
    deck.filter.frequency.value = 18000;
    deck.filter.Q.value = 0.5;

    source.start(0, offset);
    deck.source = source;
    deck.playing = true;
    deck.playbackRate = rate;
    deck.startOffset = offset;
    deck.startContextTime = this.context.currentTime;

    source.onended = () => {
      if (deck.source === source) {
        deck.playing = false;
        deck.source = null;
      }
    };
  }

  stopDeck(deckIndex: 0 | 1): void {
    const deck = this.decks[deckIndex];
    if (deck.source) {
      try { deck.source.stop(); } catch { /* already stopped */ }
      deck.source.disconnect();
      deck.source = null;
    }
    deck.playing = false;
  }

  /** Get current playback position in the buffer (accounts for rate and time elapsed). */
  getPlaybackPosition(deckIndex: 0 | 1): number {
    const deck = this.decks[deckIndex];
    if (!deck.playing || !deck.buffer) return deck.startOffset;
    const elapsed = this.context.currentTime - deck.startContextTime;
    return Math.max(0, Math.min(
      deck.buffer.duration,
      deck.startOffset + elapsed * deck.playbackRate
    ));
  }

  /** Scrub: instantly jump to a normalized position (0–1) in the buffer. */
  scrubTo(deckIndex: 0 | 1, normalizedPosition: number): void {
    const deck = this.decks[deckIndex];
    if (!deck.buffer) return;
    const offset = normalizedPosition * deck.buffer.duration;
    this.playDeck(deckIndex, offset, deck.playbackRate);
  }

  /** Set playback rate (positive = forward, negative = reverse). */
  setRate(deckIndex: 0 | 1, rate: number): void {
    const deck = this.decks[deckIndex];
    if (!deck.source) return;
    deck.playbackRate = rate;
    deck.source.playbackRate.value = rate;
  }

  /** Set deck filter frequency (for crossfader-style filtering). */
  setFilter(deckIndex: 0 | 1, frequency: number): void {
    const deck = this.decks[deckIndex];
    deck.filter.frequency.value = frequency;
  }

  /** Set deck gain. */
  setGain(deckIndex: 0 | 1, gain: number): void {
    this.decks[deckIndex].gain.gain.value = gain;
  }

  // ─── Crossfader ────────────────────────────────────────────────────────────

  /** Set crossfade position: 0 = full A, 1 = full B. */
  setCrossfade(value: number): void {
    this.crossfadeValue = Math.max(0, Math.min(1, value));
    this.updateCrossfade();
  }

  private updateCrossfade(): void {
    // Equal-power crossfade
    const angle = this.crossfadeValue * Math.PI / 2;
    const gainA = Math.cos(angle);
    const gainB = Math.sin(angle);
    this.decks[0].gain.gain.value = gainA * gainA;
    this.decks[1].gain.gain.value = gainB * gainB;
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────────

  dispose(): void {
    this.stopDeck(0);
    this.stopDeck(1);
    this.output.disconnect();
    this.crossfade.disconnect();
  }
}
