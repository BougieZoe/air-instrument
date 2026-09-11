import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import type { AudioEngine } from "../../audio/AudioEngine";
import type { InteractionPoint } from "../../hand/types";
import { SamplePad } from "./SamplePad";
import { sampleMap } from "./sampleMap";

export type InstrumentHandle = {
  hitTest: (x: number, y: number) => string | null;
  handleInteraction: (point: InteractionPoint, targetId: string | null) => boolean;
  reset: () => void;
};

type AirSamplerProps = {
  audioRef: MutableRefObject<AudioEngine | null>;
  onFirstInteraction: () => void;
};

export const AirSampler = forwardRef<InstrumentHandle, AirSamplerProps>(({ audioRef, onFirstInteraction }, ref) => {
  const padRefs = useRef(new Map<string, HTMLButtonElement>());
  const lastTargetByPointer = useRef(new Map<string, string | null>());
  const samples = useMemo(() => sampleMap, []);

  useImperativeHandle(ref, () => ({
    hitTest(x, y) {
      for (const sample of samples) {
        const node = padRefs.current.get(sample.id);
        if (!node) {
          continue;
        }
        const rect = node.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          return sample.id;
        }
      }
      return null;
    },
    handleInteraction(point, targetId) {
      if (lastTargetByPointer.current.get(point.id) !== targetId) {
        clearHover(point.id);
      }
      lastTargetByPointer.current.set(point.id, targetId);

      if (!targetId) {
        return false;
      }

      const node = padRefs.current.get(targetId);
      if (!node) {
        return false;
      }
      node.dataset.state = point.state === "PRESS" ? "press" : "hover";

      if (point.state === "PRESS") {
        const sample = samples.find((item) => item.id === targetId);
        if (sample) {
          audioRef.current?.samples.trigger(sample, 0.52 + point.speed * 0.46);
          node.animate(
            [
              { transform: "translate3d(0, 0, 18px) scale(0.985)", filter: "brightness(1.2)" },
              { transform: "translate3d(0, 0, 0) scale(1)", filter: "brightness(1)" }
            ],
            { duration: 280, easing: "cubic-bezier(.2,.8,.2,1)" }
          );
          onFirstInteraction();
          return true;
        }
      }

      return false;
    },
    reset() {
      clearHover();
    }
  }));

  const clearHover = (pointerId?: string) => {
    if (pointerId) {
      const target = lastTargetByPointer.current.get(pointerId);
      if (target) {
        const node = padRefs.current.get(target);
        if (node) {
          node.dataset.state = "idle";
        }
      }
      return;
    }
    padRefs.current.forEach((node) => {
      node.dataset.state = "idle";
    });
  };

  const triggerMouse = (sampleId: string) => {
    const sample = samples.find((item) => item.id === sampleId);
    const node = padRefs.current.get(sampleId);
    if (!sample || !node) {
      return;
    }
    audioRef.current?.samples.trigger(sample, 0.86);
    node.dataset.state = "press";
    window.setTimeout(() => {
      node.dataset.state = "idle";
    }, 150);
    onFirstInteraction();
  };

  return (
    <section className="instrument-shell sampler-shell" aria-label="Air Sampler">
      <div className="instrument-title">
        <span>AIR SAMPLER</span>
        <small>16 PAD DEMO PACK</small>
      </div>
      <div className="sampler-grid">
        {samples.map((sample) => (
          <SamplePad
            key={sample.id}
            id={sample.id}
            label={sample.label}
            onPointerDownCapture={() => triggerMouse(sample.id)}
            ref={(node) => {
              if (node) {
                padRefs.current.set(sample.id, node);
              } else {
                padRefs.current.delete(sample.id);
              }
            }}
          />
        ))}
      </div>
      <div className="instrument-footer">
        <span>LOCAL DEMO PACK</span>
        <span>INDEX / PINCH / MOUSE</span>
      </div>
    </section>
  );
});

AirSampler.displayName = "AirSampler";
