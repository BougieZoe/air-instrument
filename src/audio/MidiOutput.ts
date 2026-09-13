/**
 * MidiOutput — Web MIDI API wrapper for sending note data to DAWs.
 *
 * Maps pad IDs to MIDI notes and sends noteOn/noteOff messages.
 * Works with Ableton Live, FL Studio, Logic, any MIDI-accepting DAW.
 */

// Web MIDI API types (not in default TS lib)
type MIDIOutput = { id: string; name: string | null; send: (data: number[]) => void; };

// Standard GM drum map for common pad sounds (channel 10 = drums)
const DRUM_MAP: Record<string, number> = {
  "kick1": 36, "kick2": 35, "snare1": 38, "snare2": 40,
  "clap": 39, "rim": 37, "hat-c1": 42, "hat-c2": 44,
  "hat-o1": 46, "hat-o2": 56, "tom-lo": 41, "tom-mid": 45,
  "tom-hi": 48, "crash": 49, "ride": 51, "tambo": 54,
  "808": 48, "sub": 36, "bass": 38, "chord": 40,
  "pad": 43, "bell": 45, "keys": 48, "organ": 50,
  "vox1": 52, "vox2": 53, "riser": 55, "impact": 57,
  "sweep": 59, "brass": 60, "synth": 62, "loop": 64,
};

export class MidiOutput {
  private output: MIDIOutput | null = null;
  private channel = 10;
  private enabled = false;
  private noteTimeouts = new Map<number, ReturnType<typeof setTimeout>>();

  static isAvailable(): boolean {
    return "navigator" in globalThis && "midi" in globalThis.navigator;
  }

  async request(): Promise<boolean> {
    if (!MidiOutput.isAvailable()) return false;
    try {
      const access = await navigator.requestMIDIAccess();
      const outputs = Array.from(access.outputs.values());
      if (outputs.length === 0) return false;
      this.output = outputs.find((o) =>
        /ableton|fl studio|logic|cubase|bitwig/i.test(o.name ?? "")
      ) ?? outputs[0];
      this.enabled = true;
      console.log(`[MIDI] Connected to: ${this.output.name}`);
      return true;
    } catch (e) {
      console.warn("[MIDI] Access denied:", e);
      return false;
    }
  }

  noteOn(padId: string, velocity = 100): void {
    if (!this.enabled || !this.output) return;
    const note = DRUM_MAP[padId] ?? 60;
    const vel = Math.max(1, Math.min(127, Math.round(velocity)));
    this.output.send([0x90 + (this.channel - 1), note, vel]);
  }

  noteOff(padId: string): void {
    if (!this.enabled || !this.output) return;
    const note = DRUM_MAP[padId] ?? 60;
    this.output.send([0x80 + (this.channel - 1), note, 0]);
  }

  trigger(padId: string, velocity = 100, durationMs = 150): void {
    const existing = this.noteTimeouts.get(DRUM_MAP[padId] ?? 60);
    if (existing) clearTimeout(existing);
    this.noteOn(padId, velocity);
    const note = DRUM_MAP[padId] ?? 60;
    const timeout = setTimeout(() => {
      this.noteOff(padId);
      this.noteTimeouts.delete(note);
    }, durationMs);
    this.noteTimeouts.set(note, timeout);
  }

  setChannel(ch: number): void {
    this.channel = Math.max(1, Math.min(16, ch));
  }

  toggle(): boolean {
    if (!this.output) return false;
    this.enabled = !this.enabled;
    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled && this.output !== null;
  }

  getOutputName(): string {
    return this.output?.name ?? "None";
  }

  dispose(): void {
    for (const t of this.noteTimeouts.values()) clearTimeout(t);
    this.noteTimeouts.clear();
    this.output = null;
    this.enabled = false;
  }
}
