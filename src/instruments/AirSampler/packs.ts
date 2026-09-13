import type { SamplePadDefinition } from "../../audio/types";

export type GenrePack = {
  id: string;
  name: string;
  subtitle: string;
  pads: SamplePadDefinition[];
};

type PadTemplate = { id: string; label: string; gain: number; chokeGroup?: string };

function row(templates: PadTemplate[], srcPrefix: string): SamplePadDefinition[] {
  return templates.map((t) => ({
    id: t.id,
    label: t.label,
    gain: t.gain,
    src: `/samples/${srcPrefix}/${t.id}.wav`,
    ...(t.chokeGroup ? { chokeGroup: t.chokeGroup } : {}),
  }));
}

const ROW1 = [
  { id: "kick1",  label: "KICK 1",  gain: 1.0 },
  { id: "kick2",  label: "KICK 2",  gain: 0.95 },
  { id: "snare1", label: "SNARE 1", gain: 0.88 },
  { id: "snare2", label: "SNARE 2", gain: 0.85 },
  { id: "clap",   label: "CLAP",    gain: 0.82 },
  { id: "rim",    label: "RIM",     gain: 0.7 },
  { id: "hat-c1", label: "HAT C1",  gain: 0.58, chokeGroup: "hat" },
  { id: "hat-c2", label: "HAT C2",  gain: 0.55, chokeGroup: "hat" },
];

const ROW2 = [
  { id: "hat-o1",  label: "HAT O1",   gain: 0.6, chokeGroup: "hat" },
  { id: "hat-o2",  label: "HAT O2",   gain: 0.62, chokeGroup: "hat" },
  { id: "tom-lo",  label: "TOM LO",   gain: 0.75 },
  { id: "tom-mid", label: "TOM MID",  gain: 0.72 },
  { id: "tom-hi",  label: "TOM HI",   gain: 0.7 },
  { id: "crash",   label: "CRASH",    gain: 0.72 },
  { id: "ride",    label: "RIDE",     gain: 0.65 },
  { id: "tambo",   label: "TAMBO",    gain: 0.55 },
];

const ROW3 = [
  { id: "808",   label: "808",    gain: 0.94 },
  { id: "sub",   label: "SUB",    gain: 0.9 },
  { id: "bass",  label: "BASS",   gain: 0.85 },
  { id: "chord", label: "CHORD",  gain: 0.55 },
  { id: "pad",   label: "PAD",    gain: 0.45 },
  { id: "bell",  label: "BELL",   gain: 0.55 },
  { id: "keys",  label: "KEYS",   gain: 0.5 },
  { id: "organ", label: "ORGAN",  gain: 0.48 },
];

const ROW4 = [
  { id: "vox1",   label: "VOX 1",   gain: 0.6 },
  { id: "vox2",   label: "VOX 2",   gain: 0.58 },
  { id: "riser",  label: "RISER",   gain: 0.62 },
  { id: "impact", label: "IMPACT",  gain: 0.82 },
  { id: "sweep",  label: "SWEEP",   gain: 0.55 },
  { id: "brass",  label: "BRASS",   gain: 0.58 },
  { id: "synth",  label: "SYNTH",   gain: 0.55 },
  { id: "loop",   label: "LOOP",    gain: 0.6 },
];

// ─── TRAP PRO ───────────────────────────────────────────────────────────────
export const trapProPack: GenrePack = {
  id: "trap-pro",
  name: "TRAP PRO",
  subtitle: "808 SLIDES / CRISPY HATS / PUNCHY DRUMS",
  pads: [...row(ROW1, "trap-pro"), ...row(ROW2, "trap-pro"), ...row(ROW3, "trap-pro"), ...row(ROW4, "trap-pro")],
};

// ─── BOOM BAP ───────────────────────────────────────────────────────────────
export const boomBapPack: GenrePack = {
  id: "boom-bap",
  name: "BOOM BAP",
  subtitle: "DUSTY LO-FI / WARM SATURATION / VINYL GRIT",
  pads: [...row(ROW1, "boom-bap"), ...row(ROW2, "boom-bap"), ...row(ROW3, "boom-bap"), ...row(ROW4, "boom-bap")],
};

// ─── DRILL ──────────────────────────────────────────────────────────────────
export const drillPack: GenrePack = {
  id: "drill",
  name: "DRILL",
  subtitle: "SLIDING 808 / RAPID HATS / DARK TEXTURES",
  pads: [...row(ROW1, "drill"), ...row(ROW2, "drill"), ...row(ROW3, "drill"), ...row(ROW4, "drill")],
};

export const allPacks: GenrePack[] = [trapProPack, boomBapPack, drillPack];
export const defaultPack = trapProPack;
