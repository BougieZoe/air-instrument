export type PianoKeyDefinition = {
  id: string;
  note: string;
  label: string;
  type: "white" | "black";
  left: number;
  width: number;
};

const whiteNotes = ["C", "D", "E", "F", "G", "A", "B", "C", "D", "E", "F", "G", "A", "B", "C"];
const blackAfter: Record<string, string> = {
  C: "C#",
  D: "D#",
  F: "F#",
  G: "G#",
  A: "A#"
};

export const pianoLayout: PianoKeyDefinition[] = (() => {
  const keys: PianoKeyDefinition[] = [];
  const whiteWidth = 100 / whiteNotes.length;
  let octave = 3;

  whiteNotes.forEach((name, index) => {
    if (name === "C" && index > 0) {
      octave += 1;
    }
    const note = `${name}${octave}`;
    keys.push({
      id: note,
      note,
      label: index % 7 === 0 ? note : name,
      type: "white",
      left: index * whiteWidth,
      width: whiteWidth
    });
  });

  whiteNotes.slice(0, -1).forEach((name, index) => {
    const sharp = blackAfter[name];
    if (!sharp) {
      return;
    }
    const currentOctave = index >= 7 ? 4 : 3;
    keys.push({
      id: `${sharp}${currentOctave}`,
      note: `${sharp}${currentOctave}`,
      label: sharp,
      type: "black",
      left: (index + 0.68) * whiteWidth,
      width: whiteWidth * 0.62
    });
  });

  return keys;
})();
