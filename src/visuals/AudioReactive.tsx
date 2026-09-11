import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import { REACTIVE_OPACITY_BASE, REACTIVE_OPACITY_RANGE, REACTIVE_SCALE_BASE, REACTIVE_SCALE_RANGE } from "../config";
import type { AudioEngine } from "../audio/AudioEngine";

type AudioReactiveProps = { audioRef: MutableRefObject<AudioEngine | null>; };

export function AudioReactive({ audioRef }: AudioReactiveProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const level = audioRef.current?.getLevel() ?? 0;
      if (ref.current) {
        ref.current.style.opacity   = String(REACTIVE_OPACITY_BASE + level * REACTIVE_OPACITY_RANGE);
        ref.current.style.transform = `scaleX(${REACTIVE_SCALE_BASE + level * REACTIVE_SCALE_RANGE})`;
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [audioRef]);
  return <div className="audio-reactive-line" ref={ref} aria-hidden="true" />;
}
