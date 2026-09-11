import type { IPianoEngine } from "./types";

const NOTE_BASE: Record<string, number> = {
  C: -9,
  "C#": -8,
  D: -7,
  "D#": -6,
  E: -5,
  F: -4,
  "F#": -3,
  G: -2,
  "G#": -1,
  A: 0,
  "A#": 1,
  B: 2
};

export const noteToFrequency = (note: string) => {
  const match = note.match(/^([A-G]#?)(\d)$/);
  if (!match) {
    return 440;
  }
  const [, name, octaveText] = match;
  const octave = Number(octaveText);
  const semitone = NOTE_BASE[name] + (octave - 4) * 12;
  return 440 * Math.pow(2, semitone / 12);
};

type Voice = {
  oscA: OscillatorNode;
  oscB: OscillatorNode;
  gain: GainNode;
  filter: BiquadFilterNode;
};

export class PianoEngine implements IPianoEngine {
  private voices = new Map<string, Voice>();

  constructor(
    private readonly context: AudioContext,
    private readonly output: GainNode
  ) {}

  noteOn(note: string, velocity = 0.72, voiceId = note) {
    this.noteOff(voiceId);
    const now = this.context.currentTime;
    const frequency = noteToFrequency(note);
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    const oscA = this.context.createOscillator();
    const oscB = this.context.createOscillator();

    oscA.type = "triangle";
    oscB.type = "sine";
    oscA.frequency.value = frequency;
    oscB.frequency.value = frequency * 2.002;
    filter.type = "lowpass";
    filter.frequency.value = 3600;
    filter.Q.value = 0.5;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2 * velocity, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.085 * velocity, now + 0.28);

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(gain);
    gain.connect(this.output);
    oscA.start(now);
    oscB.start(now);
    this.voices.set(voiceId, { oscA, oscB, gain, filter });
  }

  noteOff(voiceId: string) {
    const voice = this.voices.get(voiceId);
    if (!voice) {
      return;
    }
    const now = this.context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(0.0001, now, 0.16);
    voice.oscA.stop(now + 0.6);
    voice.oscB.stop(now + 0.6);
    this.voices.delete(voiceId);
  }

  releaseAll() {
    Array.from(this.voices.keys()).forEach((id) => this.noteOff(id));
  }
}
