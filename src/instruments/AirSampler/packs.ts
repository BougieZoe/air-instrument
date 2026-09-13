import type { SamplePadDefinition } from "../../audio/types";

export type GenrePack = {
  id: string;
  name: string;
  subtitle: string;
  pads: SamplePadDefinition[];
};

// ─── TRAP PRO ───────────────────────────────────────────────────────────────
export const trapProPack: GenrePack = {
  id: "trap-pro",
  name: "TRAP PRO",
  subtitle: "808 SLIDES / CRISPY HATS",
  pads: [
    { id: "kick", label: "KICK", src: "/samples/trap-pro/kick.wav", gain: 1.0 },
    { id: "snare", label: "SNARE", src: "/samples/trap-pro/snare.wav", gain: 0.88 },
    { id: "clap", label: "CLAP", src: "/samples/trap-pro/clap.wav", gain: 0.82 },
    { id: "closed-hat", label: "HAT", src: "/samples/trap-pro/closed-hat.wav", gain: 0.6, chokeGroup: "hat" },
    { id: "open-hat", label: "OPEN HAT", src: "/samples/trap-pro/open-hat.wav", gain: 0.62, chokeGroup: "hat" },
    { id: "808", label: "808", src: "/samples/trap-pro/808.wav", gain: 0.94 },
    { id: "sub-bass", label: "SUB BASS", src: "/samples/trap-pro/sub-bass.wav", gain: 0.9 },
    { id: "perc", label: "PERC", src: "/samples/trap-pro/perc.wav", gain: 0.72 },
    { id: "rim", label: "RIM", src: "/samples/trap-pro/rim.wav", gain: 0.7 },
    { id: "impact", label: "IMPACT", src: "/samples/trap-pro/impact.wav", gain: 0.85 },
    { id: "riser", label: "RISER", src: "/samples/trap-pro/riser.wav", gain: 0.65 },
    { id: "fx", label: "FX", src: "/samples/trap-pro/fx.wav", gain: 0.72 },
    { id: "vocal", label: "VOCAL", src: "/samples/trap-pro/vocal.wav", gain: 0.62 },
    { id: "chop", label: "CHOP", src: "/samples/trap-pro/chop.wav", gain: 0.68 },
    { id: "loop", label: "LOOP", src: "/samples/trap-pro/loop.wav", gain: 0.66 },
    { id: "air", label: "AIR", src: "/samples/trap-pro/air.wav", gain: 0.74 },
  ],
};

// ─── BOOM BAP ───────────────────────────────────────────────────────────────
export const boomBapPack: GenrePack = {
  id: "boom-bap",
  name: "BOOM BAP",
  subtitle: "DUSTY LO-FI DRUMS",
  pads: [
    { id: "kick", label: "KICK", src: "/samples/boom-bap/kick.wav", gain: 1.0 },
    { id: "snare", label: "SNARE", src: "/samples/boom-bap/snare.wav", gain: 0.85 },
    { id: "clap", label: "CLAP", src: "/samples/boom-bap/clap.wav", gain: 0.78 },
    { id: "closed-hat", label: "HAT", src: "/samples/boom-bap/closed-hat.wav", gain: 0.58, chokeGroup: "hat" },
    { id: "open-hat", label: "OPEN HAT", src: "/samples/boom-bap/open-hat.wav", gain: 0.6, chokeGroup: "hat" },
    { id: "808", label: "808", src: "/samples/boom-bap/808.wav", gain: 0.92 },
    { id: "sub-bass", label: "SUB BASS", src: "/samples/boom-bap/sub-bass.wav", gain: 0.88 },
    { id: "perc", label: "PERC", src: "/samples/boom-bap/perc.wav", gain: 0.7 },
    { id: "rim", label: "RIM", src: "/samples/boom-bap/rim.wav", gain: 0.68 },
    { id: "crash", label: "CRASH", src: "/samples/boom-bap/crash.wav", gain: 0.72 },
    { id: "ride", label: "RIDE", src: "/samples/boom-bap/ride.wav", gain: 0.65 },
    { id: "tom", label: "TOM", src: "/samples/boom-bap/tom.wav", gain: 0.75 },
    { id: "vinyl", label: "VINYL", src: "/samples/boom-bap/vinyl.wav", gain: 0.4 },
    { id: "stab", label: "STAB", src: "/samples/boom-bap/stab.wav", gain: 0.6 },
    { id: "horn", label: "HORN", src: "/samples/boom-bap/horn.wav", gain: 0.55 },
    { id: "bass", label: "BASS", src: "/samples/boom-bap/bass.wav", gain: 0.8 },
  ],
};

// ─── DRILL ──────────────────────────────────────────────────────────────────
export const drillPack: GenrePack = {
  id: "drill",
  name: "DRILL",
  subtitle: "SLIDING 808 / DARK TEXTURES",
  pads: [
    { id: "kick", label: "KICK", src: "/samples/drill/kick.wav", gain: 1.0 },
    { id: "snare", label: "SNARE", src: "/samples/drill/snare.wav", gain: 0.9 },
    { id: "clap", label: "CLAP", src: "/samples/drill/clap.wav", gain: 0.82 },
    { id: "closed-hat", label: "HAT", src: "/samples/drill/closed-hat.wav", gain: 0.55, chokeGroup: "hat" },
    { id: "open-hat", label: "OPEN HAT", src: "/samples/drill/open-hat.wav", gain: 0.58, chokeGroup: "hat" },
    { id: "808-slide", label: "808 SLIDE", src: "/samples/drill/808-slide.wav", gain: 0.95 },
    { id: "808", label: "808", src: "/samples/drill/808.wav", gain: 0.9 },
    { id: "sub-bass", label: "SUB", src: "/samples/drill/sub-bass.wav", gain: 0.88 },
    { id: "perc", label: "PERC", src: "/samples/drill/perc.wav", gain: 0.7 },
    { id: "rim", label: "RIM", src: "/samples/drill/rim.wav", gain: 0.7 },
    { id: "impact", label: "IMPACT", src: "/samples/drill/impact.wav", gain: 0.85 },
    { id: "riser", label: "RISER", src: "/samples/drill/riser.wav", gain: 0.65 },
    { id: "fx", label: "FX", src: "/samples/drill/fx.wav", gain: 0.72 },
    { id: "vocal", label: "VOCAL", src: "/samples/drill/vocal.wav", gain: 0.6 },
    { id: "chop", label: "CHOP", src: "/samples/drill/chop.wav", gain: 0.65 },
    { id: "loop", label: "LOOP", src: "/samples/drill/loop.wav", gain: 0.62 },
  ],
};

export const allPacks: GenrePack[] = [trapProPack, boomBapPack, drillPack];
export const defaultPack = trapProPack;
