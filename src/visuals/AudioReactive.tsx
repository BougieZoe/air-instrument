import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import type { AudioEngine } from "../audio/AudioEngine";

type AudioReactiveProps = {
  audioRef: MutableRefObject<AudioEngine | null>;
};

export function AudioReactive({ audioRef }: AudioReactiveProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const level = audioRef.current?.getLevel() ?? 0;
      if (ref.current) {
        ref.current.style.opacity = String(0.16 + level * 0.38);
        ref.current.style.transform = `scaleX(${0.12 + level * 0.88})`;
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [audioRef]);

  return <div className="audio-reactive-line" ref={ref} aria-hidden="true" />;
}
