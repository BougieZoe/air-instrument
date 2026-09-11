import { forwardRef, useImperativeHandle, useRef } from "react";
import { BLACK_KEY_INSET_RATIO, PIANO_VELOCITY_HAND_MIN, PIANO_VELOCITY_HAND_RANGE, PIANO_VELOCITY_MOUSE, WHITE_KEY_INSET_RATIO } from "../../config";
import type { InteractionPoint } from "../../hand/types";
import type { InstrumentHandle, InstrumentProps } from "../types";
import { PianoKey } from "./PianoKey";
import { pianoLayout } from "./pianoLayout";

type AirPianoProps = InstrumentProps;

export const AirPiano = forwardRef<InstrumentHandle, AirPianoProps>(({ audioRef, onFirstInteraction }, ref) => {
  const keyRefs             = useRef(new Map<string, HTMLButtonElement>());
  const activeNoteByPointer = useRef(new Map<string, string>());

  useImperativeHandle(ref, () => ({
    hitTest(x, y) {
      for (const collection of [pianoLayout.filter((k) => k.type === "black"), pianoLayout.filter((k) => k.type === "white")]) {
        for (const key of collection) {
          const node = keyRefs.current.get(key.id);
          if (!node) continue;
          const rect  = node.getBoundingClientRect();
          const inset = key.type === "white" ? rect.width * WHITE_KEY_INSET_RATIO : rect.width * BLACK_KEY_INSET_RATIO;
          if (x >= rect.left + inset && x <= rect.right - inset && y >= rect.top && y <= rect.bottom) return key.id;
        }
      }
      return null;
    },
    handleInteraction(point, targetId) {
      const previousNote = activeNoteByPointer.current.get(point.id);
      if (!targetId) { if (previousNote) release(point.id, previousNote); return false; }

      let effectiveTargetId = targetId;
      if (previousNote && previousNote !== targetId) {
        const prevRect = keyRefs.current.get(previousNote)?.getBoundingClientRect();
        if (prevRect && point.x > prevRect.left - 12 && point.x < prevRect.right + 12) {
          effectiveTargetId = previousNote;
        } else {
          release(point.id, previousNote);
        }
      }

      const target = pianoLayout.find((k) => k.id === effectiveTargetId);
      const node   = keyRefs.current.get(effectiveTargetId);
      if (!target || !node) return false;

      node.dataset.state = point.state === "PRESS" ? "press" : "hover";
      if (point.state === "PRESS" && activeNoteByPointer.current.get(point.id) !== effectiveTargetId) {
        activeNoteByPointer.current.set(point.id, effectiveTargetId);
        audioRef.current?.piano.noteOn(target.note, PIANO_VELOCITY_HAND_MIN + point.speed * PIANO_VELOCITY_HAND_RANGE, `${point.id}:${target.note}`);
        node.animate([{ transform: "translateY(7px)", filter: "brightness(1.16)" }, { transform: "translateY(0)", filter: "brightness(1)" }], { duration: 360, easing: "cubic-bezier(.18,.9,.18,1)" });
        onFirstInteraction();
        return true;
      }
      return false;
    },
    reset() {
      audioRef.current?.piano.releaseAll();
      activeNoteByPointer.current.clear();
      keyRefs.current.forEach((node) => { node.dataset.state = "idle"; });
    },
  }));

  const release = (pointerId: string, noteId: string) => {
    audioRef.current?.piano.noteOff(`${pointerId}:${noteId}`);
    activeNoteByPointer.current.delete(pointerId);
    const node = keyRefs.current.get(noteId);
    if (node) node.dataset.state = "idle";
  };

  const mouseNote = (noteId: string, down: boolean) => {
    const key = pianoLayout.find((k) => k.id === noteId);
    const node = keyRefs.current.get(noteId);
    if (!key || !node) return;
    if (down) { audioRef.current?.piano.noteOn(key.note, PIANO_VELOCITY_MOUSE, `mouse:${key.note}`); node.dataset.state = "press"; onFirstInteraction(); }
    else { audioRef.current?.piano.noteOff(`mouse:${key.note}`); node.dataset.state = "idle"; }
  };

  return (
    <section className="instrument-shell piano-shell" aria-label="Air Piano">
      <div className="instrument-title"><span>AIR PIANO</span><small>POLYPHONIC 2 OCTAVES</small></div>
      <div className="piano-frame">
        {pianoLayout.map((key) => (<PianoKey key={key.id} item={key} ref={(node) => { if (node) keyRefs.current.set(key.id, node); else keyRefs.current.delete(key.id); }} />))}
        <div className="piano-hit-layer">
          {pianoLayout.map((key) => (
            <button key={`${key.id}-hit`} className="piano-hit" style={{ left: `${key.left}%`, width: `${key.width}%` }} type="button"
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); mouseNote(key.id, true); }}
              onPointerUp={() => mouseNote(key.id, false)} onPointerLeave={() => mouseNote(key.id, false)}
              aria-label={`Play ${key.note}`} />
          ))}
        </div>
      </div>
      <div className="instrument-footer"><span>C3 - C5</span><span>SUSTAINED RELEASE</span></div>
    </section>
  );
});
AirPiano.displayName = "AirPiano";
