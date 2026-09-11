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

## License

MIT
