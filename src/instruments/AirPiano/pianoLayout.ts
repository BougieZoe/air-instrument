export type PianoKeyDefinition = {
  id: string; note: string; label: string;
  type: "white" | "black"; left: number; width: number;
};

export const NOTES_PER_OCTAVE = 7;
const WHITE_NOTE_NAMES = ["C", "D", "E", "F", "G", "A", "B"] as const;
const BLACK_AFTER: Partial<Record<string, string>> = { C: "C#", D: "D#", F: "F#", G: "G#", A: "A#" };

export function generatePianoLayout(startOctave = 3, octaveCount = 2): PianoKeyDefinition[] {
  const whiteNotes: Array<{ name: string; octave: number }> = [];
  for (let o = 0; o < octaveCount; o++) {
    for (const name of WHITE_NOTE_NAMES) whiteNotes.push({ name, octave: startOctave + o });
  }
  whiteNotes.push({ name: "C", octave: startOctave + octaveCount });

  const totalWhite = whiteNotes.length;
  const whiteWidth = 100 / totalWhite;
  const keys: PianoKeyDefinition[] = [];

  whiteNotes.forEach(({ name, octave }, index) => {
    const note = `${name}${octave}`;
    keys.push({ id: note, note, label: index % NOTES_PER_OCTAVE === 0 ? note : name, type: "white", left: index * whiteWidth, width: whiteWidth });
  });

  whiteNotes.slice(0, -1).forEach(({ name, octave }, index) => {
    const sharp = BLACK_AFTER[name];
    if (!sharp) return;
    keys.push({ id: `${sharp}${octave}`, note: `${sharp}${octave}`, label: sharp, type: "black", left: (index + 0.68) * whiteWidth, width: whiteWidth * 0.62 });
  });

  return keys;
}

export const pianoLayout = generatePianoLayout(3, 2);
