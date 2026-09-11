# Air Instrument

> Play music with your hands in the air.

A local-first interactive music instrument that runs in your browser. Hold your hand up to the camera — your finger becomes the controller.

![Air Instrument](https://raw.githubusercontent.com/BougieZoe/air-instrument/main/public/favicon.svg)

---

## Two instruments. No hardware required.

### Air Sampler
A floating 4×4 pad grid with a built-in trap/hip-hop demo pack. Point your index finger at a pad and hold — it triggers. 16 original synthesized sounds included out of the box.

### Air Piano
A floating 2-octave piano keyboard (C3–C5). Polyphonic. Move your finger across the keys to play melodies. Import any local audio file and play along while it loops.

---

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, click **START**, allow camera access.

> Hand tracking requires Chrome or a Chromium-based browser for best results.

---

## How it works

```
Camera → MediaPipe Hand Landmarker → Smoothing → Coordinate Mapping
  → Hit Testing → Interaction State (HOVER / PRESS)
    → Web Audio API (samples / synth / accompaniment)
```

- **Hand tracking** — MediaPipe Tasks Vision, runs entirely on your device
- **All 5 fingertips** — every finger is an independent interaction point
  (own hover / press / velocity), so chords and multi-finger drumming work
  out of the box; cursors are color-coded per finger
- **Audio** — Web Audio API, low-latency sample playback + dual-oscillator piano synth
- **No backend** — everything is local, no data leaves your machine
- **Mouse fallback** — works without a camera for testing

---

## Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS
- MediaPipe Tasks Vision (Hand Landmarker)
- Web Audio API

---

## Import your own music

In Piano mode, click **IMPORT AUDIO** to load any `.mp3`, `.wav`, or `.m4a` file from your computer. The track plays as accompaniment while you play the floating piano keys.

---

## Debug mode

Click **◎ DEBUG** in the top-right corner to see live tracking data: FPS, detected gesture, fingertip coordinates, confidence score, and current interaction state.

---

## Demo sounds

All 16 included sounds are original synthesized samples generated locally — no copyrighted audio bundled. To regenerate them:

```bash
node scripts/generateSamples.mjs
```

---

## Extending: realistic piano & new sample packs

Audio code depends on interfaces in `src/audio/types.ts`, never on concrete
classes — new sounds plug in without touching instrument logic.

### Add a sample pack (e.g. Jazz Kit, 808 Mafia)

1. Drop WAV files into `public/samples/<pack-name>/`
2. Define a pack (see `src/instruments/AirSampler/sampleMap.ts`):
   ```ts
   export const jazzPack: SamplePack = {
     id: "jazz-kit", name: "Jazz Kit",
     pads: [{ id: "ride", label: "RIDE", src: "/samples/jazz/ride.wav", gain: 0.7 }],
   };
   ```
3. Load it at runtime — cached buffers are reused, no reload of old packs:
   ```ts
   await engine.loadSamplePack(jazzPack);
   ```

### Swap in a realistic piano (sampled / SF2)

1. Create a class implementing `IPianoEngine` (`noteOn` / `noteOff` / `releaseAll`),
   e.g. `SampledPianoEngine` loading one `AudioBuffer` per note
   (Salamander, MIDI.js, or any piano sample set)
2. Swap it live — old voices are released automatically:
   ```ts
   engine.setPianoEngine(new SampledPianoEngine(engine.context, engine.pianoBus));
   ```
   `AirPiano` and cleanup code keep working unchanged.

### Tune feel without code changes

All magic numbers (gains, gesture thresholds, dwell/cooldown, smoothing)
live in `src/config.ts`.

### Add a whole new instrument (e.g. Air Drums, Air Guitar)

Instruments are plugins. The registry (`src/instruments/registry.ts`) is the
single source of truth — the mode switcher and stage render from it:

1. Build a component satisfying `InstrumentHandle` (`hitTest` /
   `handleInteraction` / `reset`) and receiving `InstrumentProps`
   (see `AirSampler` for the reference implementation)
2. Register it in one line:
   ```ts
   registerInstrument({ mode: "drums", label: "DRUMS", component: AirDrums });
   ```
3. Done — it appears in the switcher, hit-testing and cleanup work unchanged.

---

## License

MIT
