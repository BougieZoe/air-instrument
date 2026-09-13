# Air Instrument

> Play music with your hands in the air.

A local-first interactive music instrument that runs in your browser. Hold your hand up to the camera — your finger becomes the controller.

**[Live Demo](https://air-instrument.vercel.app)**

![Air Instrument](https://raw.githubusercontent.com/BougieZoe/air-instrument/main/public/favicon.svg)

---

## Two instruments. No hardware required.

### Air Sampler
A floating 8×4 pad grid with 10 genre packs (320 sounds total). Point your finger at a pad and hold — it triggers. Each pack uses completely different synthesis techniques.

### Air Piano
A 3-octave polyphonic piano keyboard (C3–C6, 22 keys). Move your finger across the keys to play melodies. Import any local audio file and play along while it loops.

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
Camera → MediaPipe Hand Landmarker → Adaptive Smoothing → Coordinate Mapping
  → Hit Testing → Interaction State (HOVER / PRESS)
    → Web Audio API (samples / synth / accompaniment)
```

- **Hand tracking** — MediaPipe Tasks Vision, runs entirely on your device
- **All 5 fingertips** — every finger is an independent interaction point (own hover / press / velocity), so chords and multi-finger drumming work out of the box
- **Calibration** — automatic hand-size measurement at startup for accurate gesture recognition
- **6 gestures** — pinch, point, open hand, fist, peace sign, thumbs up
- **Analog modeling** — tube saturation, tape compression, circuit noise, bit quantization applied to every sample
- **Audio** — Web Audio API, low-latency sample playback + 8-harmonic piano synth
- **Web MIDI** — send note data to DAWs (Ableton, FL Studio, Logic) via Web MIDI API
- **No backend** — everything is local, no data leaves your machine
- **Mouse fallback** — works without a camera for testing

---

## 10 Genre Packs

| Pack | Character |
|------|-----------|
| **Trap Pro** | 808 slides, crispy hats, punchy drums |
| **Boom Bap** | Dusty lo-fi, warm saturation, vinyl grit |
| **Drill** | Sliding 808, rapid hats, dark textures |
| **Lo-Fi** | Tape saturation, vinyl crackle, wow & flutter |
| **Reggaeton** | Dembow rhythm, Latin percussion, tropical punch |
| **House** | Four-on-the-floor, 909 drums, electronic stabs |
| **Glitch** | Bitcrushed, granular, FM synthesis, artifacts |
| **8-Bit** | Chiptune, square waves, arpeggios, NES |
| **Beatbox** | Vocal percussion, formant synthesis, breath |
| **Funk** | Slap bass, wah guitar, brass stabs, clavinet |

---

## Stack

- React 19 + TypeScript
- Vite
- MediaPipe Tasks Vision (Hand Land Marker)
- Web Audio API

---

## Import your own music

Click **IMPORT AUDIO** to load any `.mp3`, `.wav`, or `.m4a` file. The track plays as accompaniment while you play the instruments.

---

## Debug mode

Click **◎ DEBUG** in the top-right corner to see live tracking data: FPS, detected gesture, fingertip coordinates, confidence score, and current interaction state.

---

## License

MIT
