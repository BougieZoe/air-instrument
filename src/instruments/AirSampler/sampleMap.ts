import type { SampleDefinition } from "../../audio/SamplePlayer";

export const sampleMap: SampleDefinition[] = [
  { id: "kick", label: "KICK", src: "/samples/kick.wav", gain: 1.0 },
  { id: "snare", label: "SNARE", src: "/samples/snare.wav", gain: 0.82 },
  { id: "clap", label: "CLAP", src: "/samples/clap.wav", gain: 0.76 },
  { id: "closed-hat", label: "HAT", src: "/samples/closed-hat.wav", gain: 0.56, chokeGroup: "hat" },
  { id: "open-hat", label: "OPEN HAT", src: "/samples/open-hat.wav", gain: 0.58, chokeGroup: "hat" },
  { id: "808", label: "808", src: "/samples/808.wav", gain: 0.94 },
  { id: "sub-bass", label: "SUB BASS", src: "/samples/sub-bass.wav", gain: 0.9 },
  { id: "perc", label: "PERC", src: "/samples/perc.wav", gain: 0.7 },
  { id: "rim", label: "RIM", src: "/samples/rim.wav", gain: 0.7 },
  { id: "impact", label: "IMPACT", src: "/samples/impact.wav", gain: 0.82 },
  { id: "riser", label: "RISER", src: "/samples/riser.wav", gain: 0.64 },
  { id: "fx", label: "FX", src: "/samples/fx.wav", gain: 0.72 },
  { id: "vocal", label: "VOCAL", src: "/samples/vocal-texture.wav", gain: 0.62 },
  { id: "chop", label: "CHOP", src: "/samples/chop.wav", gain: 0.68 },
  { id: "loop", label: "LOOP", src: "/samples/loop.wav", gain: 0.66 },
  { id: "air", label: "AIR", src: "/samples/air.wav", gain: 0.74 }
];
