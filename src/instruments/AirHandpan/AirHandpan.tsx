import { forwardRef, useImperativeHandle, useRef } from "react";
import { HandpanEngine } from "../../audio/HandpanEngine";
import { noteToFrequency } from "../../audio/PianoEngine";
import type { InteractionPoint } from "../../hand/types";
import type { InstrumentHandle, InstrumentProps } from "../types";

type AirHandpanProps = InstrumentProps;

/** D-mixolydian-ish handpan layout: central Ding + two rings of tone fields. */
const PADS = [
  { note: "D3", x: 50, y: 46, size: 27 },   // Ding (center)
  { note: "A3", x: 50, y: 17, size: 17 },
  { note: "C4", x: 74, y: 28, size: 17 },
  { note: "D4", x: 84, y: 52, size: 17 },
  { note: "E4", x: 74, y: 74, size: 17 },
  { note: "F4", x: 50, y: 84, size: 17 },
  { note: "G4", x: 26, y: 74, size: 17 },
  { note: "A4", x: 16, y: 52, size: 17 },
  { note: "C5", x: 26, y: 28, size: 17 },
  { note: "D5", x: 38, y: 66, size: 12 },
  { note: "E5", x: 62, y: 66, size: 12 },
];

export const AirHandpan = forwardRef<InstrumentHandle, AirHandpanProps>(({ audioRef, onFirstInteraction }, ref) => {
  const padRefs   = useRef(new Map<string, HTMLButtonElement>());
  const engineRef = useRef<HandpanEngine | null>(null);

  const ensureEngine = () => {
    if (!engineRef.current && audioRef.current) {
      engineRef.current = new HandpanEngine(audioRef.current.context, audioRef.current.auxBus, audioRef.current.reverbSend);
    }
    return engineRef.current;
  };

  const strike = (note: string, velocity: number) => {
    const engine = ensureEngine();
    const node   = padRefs.current.get(note);
    if (!engine || !node) return false;
    engine.trigger(noteToFrequency(note), velocity);
    node.animate(
      [{ transform: "translate(-50%, -50%) scale(0.94)", filter: "brightness(1.35)" }, { transform: "translate(-50%, -50%) scale(1)", filter: "brightness(1)" }],
      { duration: 420, easing: "cubic-bezier(.2,.85,.25,1)" },
    );
    onFirstInteraction();
    return true;
  };

  useImperativeHandle(ref, () => ({
    hitTest(x: number, y: number) {
      for (const [id, node] of padRefs.current) {
        const rect = node.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return id;
      }
      return null;
    },
    handleInteraction(point: InteractionPoint, targetId: string | null) {
      if (!targetId) return false;
      const node = padRefs.current.get(targetId);
      if (!node) return false;
      node.dataset.state = point.state === "PRESS" ? "press" : "hover";
      if (point.state !== "PRESS") return false;
      const vel = 0.45 + Math.min(0.55, point.speed * 0.55);
      return strike(targetId, vel);
    },
    reset() { padRefs.current.forEach((node) => { node.dataset.state = "idle"; }); },
  }));

  return (
    <section className="instrument-shell handpan-shell" aria-label="Air Handpan">
      <div className="instrument-title"><span>AIR HANDPAN</span><small>D 调手碟 · 双手连打</small></div>
      <div className="handpan-stage">
        {PADS.map(({ note, x, y, size }) => (
          <button key={note} type="button"
            className={`handpan-pad ${note === "D3" ? "handpan-ding" : ""}`}
            style={{ left: `${x}%`, top: `${y}%`, width: `${size}%`, aspectRatio: "1", transform: "translate(-50%, -50%)" }}
            aria-label={`Strike ${note}`}
            onPointerDown={(e) => { strike(note, 0.85); e.preventDefault(); }}
            ref={(node) => { if (node) padRefs.current.set(note, node); else padRefs.current.delete(note); }}
          >
            <span>{note}</span>
          </button>
        ))}
      </div>
      <div className="instrument-footer"><span>D3 — E5</span><span>SHELL MODES + HALL REVERB</span></div>
    </section>
  );
});
AirHandpan.displayName = "AirHandpan";
