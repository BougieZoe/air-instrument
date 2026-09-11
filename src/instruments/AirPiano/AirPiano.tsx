import { forwardRef, useImperativeHandle, useRef } from "react";
import type { MutableRefObject } from "react";
import type { AudioEngine } from "../../audio/AudioEngine";
import type { InteractionPoint } from "../../hand/types";
import type { InstrumentHandle } from "../AirSampler/AirSampler";
import { PianoKey } from "./PianoKey";
import { pianoLayout } from "./pianoLayout";

type AirPianoProps = {
  audioRef: MutableRefObject<AudioEngine | null>;
  onFirstInteraction: () => void;
};

export const AirPiano = forwardRef<InstrumentHandle, AirPianoProps>(({ audioRef, onFirstInteraction }, ref) => {
  const keyRefs = useRef(new Map<string, HTMLButtonElement>());
  const activeNoteByPointer = useRef(new Map<string, string>());

  useImperativeHandle(ref, () => ({
    hitTest(x, y) {
      const blackKeys = pianoLayout.filter((key) => key.type === "black");
      const whiteKeys = pianoLayout.filter((key) => key.type === "white");
      for (const collection of [blackKeys, whiteKeys]) {
        for (const key of collection) {
          const node = keyRefs.current.get(key.id);
          if (!node) {
            continue;
          }
          const rect = node.getBoundingClientRect();
          const inset = key.type === "white" ? 6 : 2;
          if (x >= rect.left + inset && x <= rect.right - inset && y >= rect.top && y <= rect.bottom) {
            return key.id;
          }
        }
      }
      return null;
    },
    handleInteraction(point, targetId) {
      const previousNote = activeNoteByPointer.current.get(point.id);

      if (!targetId) {
        if (previousNote) {
          release(point.id, previousNote);
        }
        return false;
      }

      const target = pianoLayout.find((key) => key.id === targetId);
      const node = keyRefs.current.get(targetId);
      if (!target || !node) {
        return false;
      }

      if (previousNote && previousNote !== targetId) {
        const previousNode = keyRefs.current.get(previousNote);
        const previousRect = previousNode?.getBoundingClientRect();
        if (previousRect && point.x > previousRect.left - 12 && point.x < previousRect.right + 12) {
          targetId = previousNote;
        } else {
          release(point.id, previousNote);
        }
      }

      node.dataset.state = point.state === "PRESS" ? "press" : "hover";
      if (point.state === "PRESS" && activeNoteByPointer.current.get(point.id) !== targetId) {
        activeNoteByPointer.current.set(point.id, targetId);
        audioRef.current?.piano.noteOn(target.note, 0.48 + point.speed * 0.44, `${point.id}:${target.note}`);
        node.animate(
          [
            { transform: "translateY(7px)", filter: "brightness(1.16)" },
            { transform: "translateY(0)", filter: "brightness(1)" }
          ],
          { duration: 360, easing: "cubic-bezier(.18,.9,.18,1)" }
        );
        onFirstInteraction();
        return true;
      }
      return false;
    },
    reset() {
      audioRef.current?.piano.releaseAll();
      activeNoteByPointer.current.clear();
      keyRefs.current.forEach((node) => {
        node.dataset.state = "idle";
      });
    }
  }));

  const release = (pointerId: string, noteId: string) => {
    audioRef.current?.piano.noteOff(`${pointerId}:${noteId}`);
    activeNoteByPointer.current.delete(pointerId);
    const node = keyRefs.current.get(noteId);
    if (node) {
      node.dataset.state = "idle";
    }
  };

  const mouseNote = (noteId: string, down: boolean) => {
    const key = pianoLayout.find((item) => item.id === noteId);
    const node = keyRefs.current.get(noteId);
    if (!key || !node) {
      return;
    }
    if (down) {
      audioRef.current?.piano.noteOn(key.note, 0.72, `mouse:${key.note}`);
      node.dataset.state = "press";
      onFirstInteraction();
    } else {
      audioRef.current?.piano.noteOff(`mouse:${key.note}`);
      node.dataset.state = "idle";
    }
  };

  return (
    <section className="instrument-shell piano-shell" aria-label="Air Piano">
      <div className="instrument-title">
        <span>AIR PIANO</span>
        <small>POLYPHONIC 2 OCTAVES</small>
      </div>
      <div className="piano-frame">
        {pianoLayout.map((key) => (
          <PianoKey
            key={key.id}
            item={key}
            ref={(node) => {
              if (node) {
                keyRefs.current.set(key.id, node);
              } else {
                keyRefs.current.delete(key.id);
              }
            }}
          />
        ))}
        <div className="piano-hit-layer">
          {pianoLayout.map((key) => (
            <button
              key={`${key.id}-hit`}
              className="piano-hit"
              style={{ left: `${key.left}%`, width: `${key.width}%` }}
              type="button"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                mouseNote(key.id, true);
              }}
              onPointerUp={() => mouseNote(key.id, false)}
              onPointerLeave={() => mouseNote(key.id, false)}
              aria-label={`Play ${key.note}`}
            />
          ))}
        </div>
      </div>
      <div className="instrument-footer">
        <span>C3 - C5</span>
        <span>SUSTAINED RELEASE</span>
      </div>
    </section>
  );
});

AirPiano.displayName = "AirPiano";
