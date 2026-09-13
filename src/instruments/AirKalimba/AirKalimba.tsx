import { forwardRef, useImperativeHandle, useRef } from "react";
import { KALIMBA_PRESET, PluckEngine } from "../../audio/PluckEngine";
import { noteToFrequency } from "../../audio/PianoEngine";
import type { InteractionPoint } from "../../hand/types";
import type { InstrumentHandle, InstrumentProps } from "../types";

type AirKalimbaProps = InstrumentProps;

/** C major pentatonic, 15 tines, arranged like a real kalimba: lowest in the
 * middle (longest tine), pitch rises alternating right/left outward. */
const TINES = ["C5", "D5", "E5", "G5", "A5", "C6", "D6", "E6", "G6", "A6", "C7", "D7", "E7", "G7", "A7"];

/** Real-kalimba fan layout: index 0 = lowest = center-longest. */
const tineLayout = TINES.map((note, i) => {
  const side = i % 2 === 0 ? -1 : 1;
  const step = Math.ceil(i / 2);
  return {
    note,
    left: 50 + side * (2.5 + step * 5.2),
    height: 88 - step * 11,
    top: 100 - (88 - step * 11),
  };
});

export const AirKalimba = forwardRef<InstrumentHandle, AirKalimbaProps>(({ audioRef, onFirstInteraction }, ref) => {
  const tineRefs  = useRef(new Map<string, HTMLButtonElement>());
  const engineRef = useRef<PluckEngine | null>(null);

  const ensureEngine = () => {
    if (!engineRef.current && audioRef.current) {
      engineRef.current = new PluckEngine(audioRef.current.context, audioRef.current.auxBus, audioRef.current.reverbSend);
    }
    return engineRef.current;
  };

  const pluck = (note: string, velocity: number) => {
    const engine = ensureEngine();
    const node   = tineRefs.current.get(note);
    if (!engine || !node) return false;
    engine.pluck(noteToFrequency(note), velocity, KALIMBA_PRESET);
    node.animate(
      [{ transform: "translateX(-50%) scaleY(0.92)", filter: "brightness(1.4)" }, { transform: "translateX(-50%) scaleY(1)", filter: "brightness(1)" }],
      { duration: 260, easing: "cubic-bezier(.2,.85,.25,1)" },
    );
    onFirstInteraction();
    return true;
  };

  useImperativeHandle(ref, () => ({
    hitTest(x: number, y: number) {
      for (const [id, node] of tineRefs.current) {
        const rect = node.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return id;
      }
      return null;
    },
    handleInteraction(point: InteractionPoint, targetId: string | null) {
      if (!targetId) return false;
      const node = tineRefs.current.get(targetId);
      if (!node) return false;
      node.dataset.state = point.state === "PRESS" ? "press" : "hover";
      if (point.state !== "PRESS") return false;
      const vel = 0.42 + Math.min(0.58, point.speed * 0.6);
      return pluck(targetId, vel);
    },
    reset() { tineRefs.current.forEach((node) => { node.dataset.state = "idle"; }); },
  }));

  return (
    <section className="instrument-shell kalimba-shell" aria-label="Air Kalimba">
      <div className="instrument-title"><span>AIR KALIMBA</span><small>C 宫五声 · 拇指琴</small></div>
      <div className="kalimba-stage">
        <div className="kalimba-body">
          {tineLayout.map(({ note, left, height, top }) => (
            <button key={note} type="button" className="kalimba-tine" aria-label={`Pluck ${note}`}
              style={{ left: `${left}%`, top: `${top}%`, height: `${height}%`, transform: "translateX(-50%)" }}
              onPointerDown={(e) => { pluck(note, 0.85); e.preventDefault(); }}
              ref={(node) => { if (node) tineRefs.current.set(note, node); else tineRefs.current.delete(note); }}
            >
              <span>{note}</span>
            </button>
          ))}
          <div className="kalimba-hole" />
        </div>
      </div>
      <div className="instrument-footer"><span>C5 — A7</span><span>SHORT TINE · WOOD RESONANCE</span></div>
    </section>
  );
});
AirKalimba.displayName = "AirKalimba";
