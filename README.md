<div align="center">

# 🎵 Air Instrument

**Play music with your hands in the air**

A local-first browser music synthesizer — hold your hand up, your fingers become the controller

<img width="1215" height="1295" alt="Air Instrument" src="https://github.com/user-attachments/assets/829ee4c8-f173-476b-acd6-abe30c3489dd" />

</div>

---

## ✨ Features

| | |
|---|---|
| 🖐️ **Full Hand Tracking** | 5 independent fingertips — chords and multi-finger drumming work out of the box |
| 🎹 **10 Genre Packs** | 320 samples — Trap, Boom Bap, Drill, Lo-Fi, Reggaeton, House, Glitch, 8-Bit, Beatbox, Funk |
| 🔊 **Analog Modeling** | Tube saturation, tape compression, circuit noise — every sample has analog warmth |
| 🎹 **Piano Synth** | 8-harmonic partials + velocity-sensitive ADSR — real-time synthesis, not samples |
| 🎛️ **Web MIDI** | Send note data directly to Ableton, FL Studio, Logic Pro |
| 📦 **Zero Backend** | Nothing leaves your device — fully local, no server |

---

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` → click **START** → allow camera access.

> Best with Chrome or any Chromium-based browser.

---

## 🎮 Two Modes

### Air Sampler
A floating 8×4 pad grid with 10 genre packs (320 sounds total). Point your finger at a pad and hold — it triggers. Each pack uses completely different synthesis techniques.

### Air Piano
A 3-octave polyphonic piano keyboard (C3–C6, 22 keys). Move your finger across the keys to play melodies. Import any local audio file and play along while it loops.

---

## 🧠 How It Works

```
Camera → MediaPipe Hand Landmarker → Adaptive Smoothing → Coordinate Mapping
  → Hit Testing → Interaction State Machine (HOVER / PRESS)
    → Web Audio API (samples / synth / accompaniment)
```

**Key Tech:**

- **Hand tracking** — MediaPipe Tasks Vision, runs entirely on-device
- **Adaptive calibration** — auto-measures hand size for accurate gesture recognition
- **6 gestures** — pinch, point, open hand, fist, peace sign, thumbs up
- **Per-finger state machine** — independent hover / press / release per finger
- **Analog modeling** — 5 profiles (warm / hot / clean / dirty / vintage), auto-matched per genre
- **Audio engine** — Web Audio API, low-latency sample playback + real-time synth

---

## 🎵 10 Genre Packs

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

## 🛠️ Stack

```
React 19 + TypeScript + Vite
MediaPipe Tasks Vision (Hand Landmarker)
Web Audio API + Web MIDI API
```

---

## 📦 Import Your Own Music

Click **IMPORT AUDIO** to load any `.mp3`, `.wav`, or `.m4a` file. The track plays as accompaniment while you play the instruments.

---

## 🔍 Debug Mode

Click **◎ DEBUG** in the top-right corner to see live tracking data: FPS, detected gesture, fingertip coordinates, confidence score, and current interaction state.

---

## 📄 License

MIT
