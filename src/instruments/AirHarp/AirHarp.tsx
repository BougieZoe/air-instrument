import { forwardRef, useImperativeHandle, useRef } from "react";
import { HARP_REFRACTORY_MS } from "../../config";
import { HARP_PRESET, PluckEngine } from "../../audio/PluckEngine";
import { noteToFrequency } from "../../audio/PianoEngine";
import type { InteractionPoint } from "../../hand/types";
import type { InstrumentHandle, InstrumentProps } from "../types";

type AirHarpProps = InstrumentProps;

/** Guzheng tuning: D major pentatonic across two octaves (top string = highest). */
const STRINGS = ["D6", "B5", "A5", "F#5", "E5", "D5", "B4", "A4", "F#4", "E4", "D4"];

export const AirHarp = forwardRef<InstrumentHandle, AirHarpProps>(({ audioRef, onFirstInteraction }, ref) => {
  const stringRefs  = useRef(new Map<string, HTMLButtonElement>());
  const engineRef   = useRef<PluckEngine | null>(null);
  const lastY       = useRef(new Map<string, number>());       // per-pointer previous y
  const lastPluckAt = useRef(new Map<string, number>());       // per-string refractory
  const rectCache   = useRef<{ rects: Map<string, DOMRect>; at: number }>({ rects: new Map(), at: 0 });

  const ensureEngine = () => {
    if (!engineRef.current && audioRef.current) {
      engineRef.current = new PluckEngine(audioRef.current.context, audioRef.current.auxBus, audioRef.current.reverbSend);
    }
    return engineRef.current;
  };

  /** Rect cache — reading 11 rects per pointer per frame would thrash layout. */
  const getRects = () => {
    const now = performance.now();
    if (now - rectCache.current.at > 250) {
      const rects = new Map<string, DOMRect>();
      for (const [id, node] of stringRefs.current) rects.set(id, node.getBoundingClientRect());
      rectCache.current = { rects, at: now };
    }
    return rectCache.current.rects;
  };

  const pluck = (id: string, velocity: number) => {
    const engine = ensureEngine();
    const node   = stringRefs.current.get(id);
    if (!engine || !node) return false;
    engine.pluck(noteToFrequency(id), velocity, HARP_PRESET);
    node.animate(
      [{ transform: "translateY(6px) scaleY(1.15)", filter: "brightness(1.7)" }, { transform: "translateY(0) scaleY(1)", filter: "brightness(1)" }],
      { duration: 340, easing: "cubic-bezier(.2,.85,.25,1)" },
    );
    onFirstInteraction();
    return true;
  };

  useImperativeHandle(ref, () => ({
    hitTest(x: number, y: number) {
      for (const [id, rect] of getRects()) {
        const band = rect.height * 3;
        if (y >= rect.top - band && y <= rect.bottom + band) return id;
      }
      return null;
    },
    handleInteraction(point: InteractionPoint, targetId: string | null) {
      const prevY = lastY.current.get(point.id);
      lastY.current.set(point.id, point.y);

      const node = targetId ? stringRefs.current.get(targetId) : null;
      if (node) node.dataset.state = point.state === "PRESS" ? "press" : "hover";

      if (prevY == null) return false;
      const now = performance.now();
      let triggered = false;
      // Strum = a fingertip CROSSED a string since last frame (either direction)
      for (const [id, rect] of getRects()) {
        const centerY = rect.top + rect.height / 2;
        const crossed = (prevY - centerY) * (point.y - centerY) <= 0 && prevY !== point.y;
        if (!crossed) continue;
        const last = lastPluckAt.current.get(id) ?? -1;
        if (now - last < HARP_REFRACTORY_MS) continue;
        lastPluckAt.current.set(id, now);
        const vel = 0.42 + Math.min(0.58, point.speed * 0.6);
        triggered = pluck(id, vel) || triggered;
      }
      return triggered;
    },
    reset() {
      lastY.current.clear(); lastPluckAt.current.clear();
      stringRefs.current.forEach((node) => { node.dataset.state = "idle"; });
    },
  }));

  return (
    <section className="instrument-shell harp-shell" aria-label="Air Harp">
      <div className="instrument-title"><span>AIR HARP</span><small>D 宫五声 · 扫弦演奏</small></div>
      <div className="harp-frame">
        {STRINGS.map((note, i) => (
          <button key={note} type="button" className="harp-string" aria-label={`Pluck ${note}`}
            style={{ top: `${(i / STRINGS.length) * 100}%`, height: `${100 / STRINGS.length}%` }}
            onPointerDown={(e) => { pluck(note, 0.85); e.preventDefault(); }}
            ref={(node) => { if (node) stringRefs.current.set(note, node); else stringRefs.current.delete(note); }}
          >
            <i className="harp-wire" /><span className="harp-note">{note}</span>
          </button>
        ))}
      </div>
      <div className="instrument-footer"><span>D6 — D4</span><span>STRUM THROUGH THE STRINGS</span></div>
    </section>
  );
});
AirHarp.displayName = "AirHarp";
