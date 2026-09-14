import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { DRUM_FIST_BOOST, DRUM_GRACE_MS, DRUM_VELOCITY_MIN, DRUM_VELOCITY_RANGE } from "../../config";
import { SamplePlayer, type SampleDefinition } from "../../audio/SamplePlayer";
import type { InteractionPoint } from "../../hand/types";
import type { InstrumentHandle, InstrumentProps } from "../types";

type AirDrumKitProps = InstrumentProps;

/** Real MuldjordKit (CC BY 4.0) — velocity-layered acoustic drum kit.
 *
 * Every drum carries TWO real recordings (soft / hard hits from the same
 * 2010 session) and crossfades them by strike velocity: loud hits are not
 * just louder, they are brighter — exactly like striking a real kit.
 * FIST = heavy stick (single representative point + velocity boost). */
type DrumPad = {
  id: string;
  label: string;
  x: number; y: number; w: number; h: number;
  shape: "circle" | "ellipse" | "kick" | "hat";
  softSrc: string | null;
  hardSrc: string;
  chokeGroup?: string;
  rotate?: number;
};

const PADS: DrumPad[] = [
  // Top row — cymbals
  { id: "crash",      label: "CRASH",     x: 12, y: 8,  w: 21, h: 13, shape: "ellipse", softSrc: "/samples/drums/crash-soft.wav",     hardSrc: "/samples/drums/crash.wav" },
  { id: "china",      label: "CHINA",     x: 40, y: 6,  w: 18, h: 12, shape: "ellipse", softSrc: "/samples/drums/china-soft.wav",     hardSrc: "/samples/drums/china.wav",  rotate: -12 },
  { id: "ride",       label: "RIDE",      x: 74, y: 8,  w: 22, h: 13, shape: "ellipse", softSrc: "/samples/drums/ride-soft.wav",     hardSrc: "/samples/drums/ride.wav",   rotate: 8 },
  { id: "ride-bell",  label: "BELL",      x: 79, y: 12, w: 7,  h: 7,  shape: "circle",  softSrc: "/samples/drums/ride-bell-soft.wav", hardSrc: "/samples/drums/ride-bell.wav" },
  // Shelf — toms
  { id: "tom-hi",     label: "TOM HI",    x: 56, y: 26, w: 15, h: 11, shape: "circle",  softSrc: "/samples/drums/tom-hi-soft.wav",    hardSrc: "/samples/drums/tom-hi.wav" },
  { id: "tom-mid",    label: "TOM MID",   x: 74, y: 30, w: 15, h: 11, shape: "circle",  softSrc: "/samples/drums/tom-mid-soft.wav",   hardSrc: "/samples/drums/tom-mid.wav" },
  { id: "tom-lo",     label: "FLOOR TOM", x: 27, y: 44, w: 17, h: 12, shape: "circle",  softSrc: "/samples/drums/tom-lo-soft.wav",    hardSrc: "/samples/drums/tom-lo.wav" },
  // Groove center
  { id: "hat",        label: "HI-HAT",    x: 15, y: 55, w: 16, h: 12, shape: "hat",     softSrc: "/samples/drums/hat-c1-soft.wav",   hardSrc: "/samples/drums/hat-c1.wav",  chokeGroup: "hat" },
  { id: "hat-open",   label: "OPEN HAT",  x: 15, y: 70, w: 16, h: 9,  shape: "hat",     softSrc: "/samples/drums/hat-o1-soft.wav",   hardSrc: "/samples/drums/hat-o1.wav",  chokeGroup: "hat" },
  { id: "snare",      label: "SNARE",     x: 50, y: 56, w: 19, h: 13, shape: "circle",  softSrc: "/samples/drums/snare-soft.wav",    hardSrc: "/samples/drums/snare.wav" },
  { id: "rimshot",    label: "RIMSHOT",   x: 57, y: 60, w: 7,  h: 7,  shape: "circle",  softSrc: "/samples/drums/rim-soft.wav",      hardSrc: "/samples/drums/rim.wav" },
  // Bottom — kicks
  { id: "kick2",      label: "KICK 2",    x: 28, y: 82, w: 20, h: 12, shape: "kick",    softSrc: null,                              hardSrc: "/samples/drums/kick-2.wav", chokeGroup: "kick" },
  { id: "kick",       label: "KICK",      x: 54, y: 80, w: 26, h: 15, shape: "kick",    softSrc: "/samples/drums/kick-soft.wav",    hardSrc: "/samples/drums/kick.wav",    chokeGroup: "kick" },
];
export const AirDrumKit = forwardRef<InstrumentHandle, AirDrumKitProps>(({ audioRef, onFirstInteraction }, ref) => {
  const padRefs      = useRef(new Map<string, HTMLButtonElement>());
  const kitPlayerRef = useRef<SamplePlayer | null>(null);
  const loadedRef    = useRef(false);
  const lastHitAt    = useRef(new Map<string, number>());
  const [sticks, setSticks] = useState<"index" | "fingers">("index");

  const ensurePlayer = useCallback(() => {
    if (!kitPlayerRef.current && audioRef.current) {
      kitPlayerRef.current = new SamplePlayer(audioRef.current.context, audioRef.current.sampleBus);
    }
    return kitPlayerRef.current;
  }, [audioRef]);

  const loadLayers = useCallback(() => {
    const player = kitPlayerRef.current;
    if (!player || loadedRef.current) return;
    loadedRef.current = true;
    const all: SampleDefinition[] = [];
    for (const pad of PADS) {
      if (pad.softSrc) all.push({ id: `${pad.id}-soft`, label: pad.label, gain: 0.9, src: pad.softSrc, chokeGroup: pad.chokeGroup });
      all.push({ id: `${pad.id}-hard`, label: pad.label, gain: 0.85, src: pad.hardSrc, chokeGroup: pad.chokeGroup });
    }
    void player.load(all);
  }, []);

  const play = useCallback((pad: DrumPad, velocity: number) => {
    const player = kitPlayerRef.current;
    const node   = padRefs.current.get(pad.id);
    if (!player || !node) return;
    const now = performance.now();
    if (now - (lastHitAt.current.get(pad.id) ?? -1) < DRUM_GRACE_MS) return;
    lastHitAt.current.set(pad.id, now);

    const vel = Math.max(0.15, Math.min(1, velocity));
    // Velocity-layer crossfade: soft layer under, hard layer on top.
    if (pad.softSrc) {
      player.trigger({ id: `${pad.id}-soft`, label: pad.label, gain: 1 - vel * 0.45, src: pad.softSrc, chokeGroup: pad.chokeGroup }, 1 - vel);
    }
    player.trigger({ id: `${pad.id}-hard`, label: pad.label, gain: 0.35 + vel * 0.65, src: pad.hardSrc, chokeGroup: pad.chokeGroup }, vel);

    node.dataset.state = "press";
    node.animate(
      [{ transform: "translateY(4px) scale(0.97)", filter: `brightness(${1 + vel})` }, { transform: "translateY(0) scale(1)", filter: "brightness(1)" }],
      { duration: 230, easing: "cubic-bezier(.2,.85,.25,1)" },
    );
    window.setTimeout(() => { const n = padRefs.current.get(pad.id); if (n) n.dataset.state = "idle"; }, 180);
  }, []);

  useImperativeHandle(ref, () => ({
    hitTest(x: number, y: number) {
      for (const pad of PADS) {
        const node = padRefs.current.get(pad.id);
        if (!node) continue;
        const rect = node.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return pad.id;
      }
      return null;
    },
    handleInteraction(point: InteractionPoint, targetId: string | null) {
      const player = ensurePlayer();
      if (!player) return false;
      loadLayers();

      // "Index only" = one stick per hand — surgical, relaxed play.
      if (sticks === "index" && point.finger !== 1) return false;
      // Fist: one representative point per hand, not all five fingers.
      if (point.gesture === "FIST" && point.finger !== 1) return false;

      if (!targetId) return false;
      const pad = PADS.find((p) => p.id === targetId);
      const node = padRefs.current.get(targetId);
      if (!pad || !node) return false;

      if (point.state !== "PRESS") {
        node.dataset.state = "hover";
        return false;
      }

      // ── Strike velocity: speed of the blow ──
      let vel = DRUM_VELOCITY_MIN + Math.min(DRUM_VELOCITY_RANGE, point.speed);
      // Pushing toward the camera adds body
      if (point.zNorm < -0.38) vel += Math.min(0.4, -point.zNorm);
      // A fist is a heavy stick
      if (point.gesture === "FIST") vel = Math.max(0.85, Math.min(1.15, vel * DRUM_FIST_BOOST));

      play(pad, vel);
      onFirstInteraction();
      return true;
    },
    reset() {
      lastHitAt.current.clear();
      loadedRef.current = false;
      padRefs.current.forEach((node) => { node.dataset.state = "idle"; });
    },
  }));

  return (
    <section className="instrument-shell drumkit-shell" aria-label="Air Drum Kit">
      <div className="instrument-title drumkit-title">
        <span>DRUM KIT</span>
        <small>真实录音 · 力度分层 · 拳头=重击</small>
        <div className="drumkit-sticks">
          <button type="button" className={sticks === "index" ? "active" : ""} onClick={() => setSticks("index")}>食指=鼓棒</button>
          <button type="button" className={sticks === "fingers" ? "active" : ""} onClick={() => setSticks("fingers")}>五指全开</button>
        </div>
      </div>
      <div className="drumkit-stage">
        {PADS.map((pad) => (
          <button key={pad.id} type="button"
            className={`drum-pad drum-pad--${pad.shape}`}
            style={{
              left: `${pad.x}%`, top: `${pad.y}%`, width: `${pad.w}%`, height: `${pad.h}%`,
              transform: `translate(-50%, -50%)${pad.rotate ? ` rotate(${pad.rotate}deg)` : ""}`,
            }}
            aria-label={`Strike ${pad.label}`}
            onPointerDown={(e) => { play(pad, 0.95); onFirstInteraction(); e.preventDefault(); }}
            ref={(node) => { if (node) padRefs.current.set(pad.id, node); else padRefs.current.delete(pad.id); }}
          >
            <span className="drum-pad-label">{pad.label}</span>
          </button>
        ))}
        <div className="drumkit-stage-hint">食指 = 鼓棒 · 握拳 = 重击 · 挥速 = 力度</div>
      </div>
      <div className="instrument-footer">
        <span>MULDJORDKIT · CC BY 4.0</span>
        <span>SOFT / HARD VELOCITY LAYERS</span>
      </div>
    </section>
  );
});
AirDrumKit.displayName = "AirDrumKit";
