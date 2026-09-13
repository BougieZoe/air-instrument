import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import type { InteractionPoint } from "../../hand/types";
import { ThereminEngine } from "../../audio/ThereminEngine";
import type { InstrumentHandle, InstrumentProps } from "../types";

type AirThereminProps = InstrumentProps;

/** Pitch span: D3 → D5 (real theremins glide freely across a wide range). */
const FREQ_MIN = 146.83;
const FREQ_MAX = 587.33;
/** D major pentatonic semitone classes (relative to C): D E F# A B. */
const D_PENTA = [2, 4, 6, 9, 11];

const midiFloat = (freq: number) => 69 + 12 * Math.log2(freq / 440);
const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** Snap to the nearest D-pentatonic tone (falls back to nearest below). */
const quantize = (freq: number) => {
  let m = Math.round(midiFloat(freq));
  for (let d = 0; d <= 12; d++) {
    if (D_PENTA.includes(((m - d) % 12 + 12) % 12)) return midiToFreq(m - d);
  }
  return freq;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const AirTheremin = forwardRef<InstrumentHandle, AirThereminProps>(({ audioRef, onFirstInteraction }, ref) => {
  const shellRef    = useRef<HTMLElement | null>(null);
  const engineRef   = useRef<ThereminEngine | null>(null);
  const cursorRef   = useRef<HTMLDivElement | null>(null);
  const volumeRef   = useRef<HTMLDivElement | null>(null);
  const mouseDown   = useRef(false);
  const [freeMode,  setFreeMode]  = useState(false);
  const [sounding,  setSounding]  = useState(false);

  const ensureEngine = useCallback(() => {
    if (!engineRef.current && audioRef.current) {
      engineRef.current = new ThereminEngine(audioRef.current.context, audioRef.current.auxBus, audioRef.current.reverbSend);
    }
    return engineRef.current;
  }, [audioRef]);

  /** Map a screen point → (freq, volume) against the shell rect. */
  const toTone = useCallback((x: number, y: number) => {
    const shell = shellRef.current;
    if (!shell) return null;
    const rect  = shell.getBoundingClientRect();
    const xN    = clamp01((x - rect.left) / rect.width);
    const yN    = clamp01((y - rect.top) / rect.height);
    const raw   = FREQ_MIN + xN * (FREQ_MAX - FREQ_MIN);
    const freq  = freeMode ? raw : quantize(raw);
    // Top of the stage = full volume; expressive curve favors control up top
    const volume = Math.pow(clamp01(1 - yN), 1.3);
    return { freq, volume };
  }, [freeMode]);

  const drive = useCallback((x: number, y: number, gesture: string) => {
    const engine = ensureEngine();
    if (!engine) return;
    const tone = toTone(x, y);
    if (cursorRef.current) {
      const shell = shellRef.current;
      if (shell) {
        const rect = shell.getBoundingClientRect();
        cursorRef.current.style.left = `${clamp01((x - rect.left) / rect.width) * 100}%`;
      }
    }
    if (volumeRef.current) volumeRef.current.style.height = `${tone ? tone.volume * 100 : 0}%`;
    const on = tone && gesture !== "FIST" && tone.volume > 0.02;
    if (on && tone) {
      engine.setTone(tone.freq, tone.volume);
      if (!sounding) setSounding(true);
      onFirstInteraction();
    } else {
      engine.silence();
      if (sounding) setSounding(false);
    }
  }, [ensureEngine, freeMode, onFirstInteraction, sounding, toTone]);

  useImperativeHandle(ref, () => ({
    hitTest() { return null; }, // continuous instrument — no discrete targets
    handleInteraction(point: InteractionPoint) {
      // Index finger drives the pitch rod, like a theremin player's right hand
      if (point.finger !== 1) return false;
      drive(point.x, point.y, point.gesture);
      return sounding;
    },
    reset() { engineRef.current?.silence(); setSounding(false); },
    onTrackingLost() { engineRef.current?.silence(); if (sounding) setSounding(false); },
  }));

  const mouseMove = (e: React.PointerEvent) => {
    if (!mouseDown.current) return;
    drive(e.clientX, e.clientY, "INDEX_POINT");
  };

  return (
    <section className="instrument-shell theremin-shell" aria-label="Air Theremin" ref={shellRef}>
      <div className="instrument-title"><span>AIR THEREMIN</span><small>左手音量 · 右手音高</small></div>
      <div
        className="theremin-stage"
        onPointerDown={(e) => { mouseDown.current = true; e.currentTarget.setPointerCapture(e.pointerId); drive(e.clientX, e.clientY, "INDEX_POINT"); }}
        onPointerMove={mouseMove}
        onPointerUp={() => { mouseDown.current = false; engineRef.current?.silence(); setSounding(false); }}
        onPointerLeave={() => { if (mouseDown.current) { mouseDown.current = false; engineRef.current?.silence(); setSounding(false); } }}
      >
        <div className="theremin-ruler">
          {["D5", "B4", "A4", "F#4", "E4", "D4", "D3"].map((n) => <span key={n}>{n}</span>)}
        </div>
        <div className="theremin-cursor" ref={cursorRef} />
        <div className="theremin-volumeter"><div className="theremin-vol-fill" ref={volumeRef} /></div>
        <div className={`theremin-glow ${sounding ? "on" : ""}`} />
      </div>
      <div className="instrument-footer">
        <button type="button" className="theremin-toggle" onClick={() => setFreeMode((v) => !v)}>
          {freeMode ? "PITCH: FREE" : "PITCH: D PENTA"}
        </button>
        <span>{sounding ? "♪ SOUNDING" : "INDEX FINGER OUT · FIST = MUTE"}</span>
      </div>
    </section>
  );
});
AirTheremin.displayName = "AirTheremin";
