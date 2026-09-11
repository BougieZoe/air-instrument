import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import { MIN_CURSOR_OPACITY } from "../config";
import type { InteractionPoint } from "../hand/types";

type InteractionFeedbackProps = { pointsRef: MutableRefObject<InteractionPoint[]>; };

export function InteractionFeedback({ pointsRef }: InteractionFeedbackProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const layer = layerRef.current;
      if (layer) {
        // Intentional imperative DOM - avoids React reconciliation overhead in rAF loop
        layer.replaceChildren(...pointsRef.current.map((point) => {
          const node = document.createElement("span");
          node.className = point.state === "PRESS" ? "finger-cursor pressing" : "finger-cursor";
          node.style.left    = `${point.x}px`;
          node.style.top     = `${point.y}px`;
          node.style.opacity = String(Math.max(MIN_CURSOR_OPACITY, Math.min(1, point.confidence)));
          // One hue per finger (thumb→pinky) so simultaneous presses stay distinguishable
          const hue = (point.finger * 72) % 360;
          node.style.borderColor = `hsla(${hue}, 70%, 82%, 0.9)`;
          if (point.state === "PRESS") node.style.background = `hsla(${hue}, 70%, 70%, 0.35)`;
          return node;
        }));
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [pointsRef]);
  return <div className="interaction-feedback" ref={layerRef} aria-hidden="true" />;
}
