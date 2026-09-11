import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import type { InteractionPoint } from "../hand/types";

type InteractionFeedbackProps = {
  pointsRef: MutableRefObject<InteractionPoint[]>;
};

export function InteractionFeedback({ pointsRef }: InteractionFeedbackProps) {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const layer = layerRef.current;
      if (layer) {
        const points = pointsRef.current;
        layer.replaceChildren(
          ...points.map((point) => {
            const node = document.createElement("i");
            node.className = point.state === "PRESS" ? "finger-cursor pressing" : "finger-cursor";
            node.style.left = `${point.x}px`;
            node.style.top = `${point.y}px`;
            node.style.opacity = String(Math.max(0.18, point.confidence));
            return node;
          })
        );
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [pointsRef]);

  return <div className="interaction-feedback" ref={layerRef} aria-hidden="true" />;
}
