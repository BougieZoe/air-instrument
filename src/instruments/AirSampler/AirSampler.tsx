import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { VELOCITY_HAND_MIN, VELOCITY_HAND_RANGE, VELOCITY_MOUSE } from "../../config";
import { MidiOutput } from "../../audio/MidiOutput";
import type { InteractionPoint } from "../../hand/types";
import type { InstrumentHandle, InstrumentProps } from "../types";
import { SamplePad } from "./SamplePad";
import { type GenrePack, allPacks } from "./packs";

type AirSamplerProps = InstrumentProps & {
  pack: GenrePack;
  onPackChange: (pack: GenrePack) => void;
};

export const AirSampler = forwardRef<InstrumentHandle, AirSamplerProps>(({ audioRef, onFirstInteraction, pack, onPackChange }, ref) => {
  const padRefs             = useRef(new Map<string, HTMLButtonElement>());
  const lastTargetByPointer = useRef(new Map<string, string | null>());
  const midiRef             = useRef(new MidiOutput());
  const [midiEnabled, setMidiEnabled] = useState(false);
  const [midiDevice, setMidiDevice]   = useState("None");

  const toggleMidi = useCallback(async () => {
    const midi = midiRef.current;
    if (midi.isEnabled()) {
      midi.toggle();
      setMidiEnabled(false);
      return;
    }
    const ok = await midi.request();
    if (ok) {
      midi.toggle();
      setMidiEnabled(true);
      setMidiDevice(midi.getOutputName());
    }
  }, []);

  useImperativeHandle(ref, () => ({
    hitTest(x, y) {
      for (const sample of pack.pads) {
        const node = padRefs.current.get(sample.id);
        if (!node) continue;
        const rect = node.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return sample.id;
      }
      return null;
    },
    handleInteraction(point, targetId) {
      if (lastTargetByPointer.current.get(point.id) !== targetId) clearHover(point.id);
      lastTargetByPointer.current.set(point.id, targetId);
      if (!targetId) return false;
      const node = padRefs.current.get(targetId);
      if (!node) return false;
      node.dataset.state = point.state === "PRESS" ? "press" : "hover";
      if (point.state === "PRESS") {
        const sample = pack.pads.find((s) => s.id === targetId);
        if (sample) {
          const vel = VELOCITY_HAND_MIN + point.speed * VELOCITY_HAND_RANGE;
          audioRef.current?.samples.trigger(sample, vel);
          midiRef.current.trigger(sample.id, Math.round(vel * 127));
          node.animate([{ transform: "translate3d(0,0,18px) scale(0.985)", filter: "brightness(1.2)" }, { transform: "translate3d(0,0,0) scale(1)", filter: "brightness(1)" }], { duration: 280, easing: "cubic-bezier(.2,.8,.2,1)" });
          onFirstInteraction();
          return true;
        }
      }
      return false;
    },
    reset() { clearHover(); },
  }));

  const clearHover = (pointerId?: string) => {
    if (pointerId) {
      const target = lastTargetByPointer.current.get(pointerId);
      if (target) { const node = padRefs.current.get(target); if (node) node.dataset.state = "idle"; }
      return;
    }
    padRefs.current.forEach((node) => { node.dataset.state = "idle"; });
  };

  const triggerMouse = (sampleId: string) => {
    const sample = pack.pads.find((s) => s.id === sampleId);
    const node   = padRefs.current.get(sampleId);
    if (!sample || !node) return;
    audioRef.current?.samples.trigger(sample, VELOCITY_MOUSE);
    midiRef.current.trigger(sampleId, Math.round(VELOCITY_MOUSE * 127));
    node.dataset.state = "press";
    window.setTimeout(() => { node.dataset.state = "idle"; }, 150);
    onFirstInteraction();
  };

  return (
    <section className="instrument-shell sampler-shell" aria-label="Air Sampler">
      <div className="instrument-title">
        <span>AIR SAMPLER</span>
        <small>{pack.subtitle}</small>
      </div>
      <div className="sampler-grid">
        {pack.pads.map((sample) => (
          <SamplePad key={sample.id} id={sample.id} label={sample.label}
            onPointerDownCapture={() => triggerMouse(sample.id)}
            ref={(node) => { if (node) padRefs.current.set(sample.id, node); else padRefs.current.delete(sample.id); }}
          />
        ))}
      </div>
      <div className="instrument-footer">
        <div className="pack-switcher">
          {allPacks.map((p) => (
            <button key={p.id} type="button" className={`pack-btn ${p.id === pack.id ? "active" : ""}`}
              onClick={() => onPackChange(p)}>{p.name}</button>
          ))}
        </div>
        <div className="midi-controls">
          <button type="button" className={`midi-btn ${midiEnabled ? "active" : ""}`} onClick={toggleMidi}>
            {midiEnabled ? "MIDI ON" : "MIDI OFF"}
          </button>
          {midiEnabled && <span className="midi-device">{midiDevice}</span>}
        </div>
      </div>
    </section>
  );
});
AirSampler.displayName = "AirSampler";
