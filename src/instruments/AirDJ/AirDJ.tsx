import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ScratchEngine, type ScratchSample } from "../../audio/ScratchEngine";
import type { InstrumentHandle, InstrumentProps } from "../types";

const SCRATCH_SAMPLES: ScratchSample[] = [
  { id: "ah",        label: "AAAH",  src: "/samples/scratch/ah.wav" },
  { id: "fresh",     label: "FRESH", src: "/samples/scratch/fresh.wav" },
  { id: "oh",        label: "OH",    src: "/samples/scratch/oh.wav" },
  { id: "horn",      label: "HORN",  src: "/samples/scratch/horn.wav" },
  { id: "orch",      label: "ORCH",  src: "/samples/scratch/orch.wav" },
  { id: "siren",     label: "SIREN", src: "/samples/scratch/siren.wav" },
  { id: "tone",      label: "TONE",  src: "/samples/scratch/tone.wav" },
  { id: "crystal",   label: "BELL",  src: "/samples/scratch/crystal.wav" },
  { id: "baby",      label: "BABY",  src: "/samples/scratch/baby.wav" },
  { id: "chirp",     label: "CHIRP", src: "/samples/scratch/chirp.wav" },
  { id: "transform", label: "TRANS", src: "/samples/scratch/transform.wav" },
  { id: "flare",     label: "FLARE", src: "/samples/scratch/flare.wav" },
  { id: "beat",      label: "BEAT",  src: "/samples/scratch/beat.wav" },
  { id: "bell",      label: "BELL2", src: "/samples/scratch/bell.wav" },
  { id: "sweep",     label: "SWEEP", src: "/samples/scratch/sweep.wav" },
  { id: "scratch",   label: "SCR",   src: "/samples/scratch/tone.wav" },
];

type AirDJProps = InstrumentProps;

export const AirDJ = forwardRef<InstrumentHandle, AirDJProps>(({ audioRef, onFirstInteraction }, ref) => {
  const engineRef     = useRef<ScratchEngine | null>(null);
  const [loaded, setLoaded]         = useState(false);
  const [deckA, setDeckA]           = useState<string | null>(null);
  const [deckB, setDeckB]           = useState<string | null>(null);
  const [crossfade, setCrossfade]   = useState(0.5);
  const [scrubbing, setScrubbing]   = useState<0 | 1 | null>(null);

  const scrubRef = useRef({ deckIndex: 0 as 0 | 1, startY: 0, startRate: 1 });

  // Initialize engine + load all scratch samples
  useEffect(() => {
    const ctx = audioRef.current?.context;
    if (!ctx) return;
    const engine = new ScratchEngine(ctx);
    engineRef.current = engine;
    engine.output.connect(audioRef.current!.master);

    Promise.all(SCRATCH_SAMPLES.map((s) => engine.loadSample(s))).then(() => setLoaded(true));
    return () => { engine.dispose(); };
  }, [audioRef]);

  const ensureAudio = useCallback(async () => {
    if (!audioRef.current) return null;
    await audioRef.current.resume();
    return audioRef.current;
  }, [audioRef]);

  // ─── Scrub (drag on pad to scratch) ──────────────────────────────────────
  const handleScrubStart = useCallback((deckIndex: 0 | 1, e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const engine = engineRef.current;
    if (!engine) return;

    const sampleId = deckIndex === 0 ? deckA : deckB;
    if (!sampleId) return;

    engine.loadDeck(deckIndex, sampleId, false);
    engine.setRate(deckIndex, 1);
    engine.playDeck(deckIndex, 0, 1);
    setScrubbing(deckIndex);
    onFirstInteraction();

    scrubRef.current = { deckIndex, startY: e.clientY, startRate: 1 };

    const handleMove = (ev: PointerEvent) => {
      const dy = scrubRef.current.startY - ev.clientY;
      const rate = Math.max(-4, Math.min(4, dy * 0.02));
      engine.setRate(deckIndex, rate || 0.01);
    };

    const handleUp = () => {
      engine.stopDeck(deckIndex);
      setScrubbing(null);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }, [deckA, deckB, onFirstInteraction]);

  // ─── Tap pad (instant play) ──────────────────────────────────────────────
  const handleTap = useCallback(async (deckIndex: 0 | 1, sampleId: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    const ctx = await ensureAudio();
    if (!ctx) return;

    engine.loadDeck(deckIndex, sampleId, true);
    if (deckIndex === 0) setDeckA(sampleId);
    else setDeckB(sampleId);
    onFirstInteraction();
  }, [ensureAudio, onFirstInteraction]);

  // ─── Crossfader ──────────────────────────────────────────────────────────
  const handleCrossfade = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setCrossfade(v);
    engineRef.current?.setCrossfade(v);
  }, []);

  // ─── InstrumentHandle (for hand tracking) ────────────────────────────────
  const padRefs = useRef(new Map<string, HTMLButtonElement>());

  useImperativeHandle(ref, () => ({
    hitTest(x, y) {
      for (const s of SCRATCH_SAMPLES) {
        const node = padRefs.current.get(s.id);
        if (!node) continue;
        const rect = node.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return s.id;
      }
      return null;
    },
    handleInteraction(point, targetId) {
      if (!targetId) return false;
      if (point.state === "PRESS") {
        handleTap(0, targetId);
        return true;
      }
      return false;
    },
    reset() {
      engineRef.current?.stopDeck(0);
      engineRef.current?.stopDeck(1);
    },
  }));

  return (
    <section className="instrument-shell dj-shell" aria-label="Air DJ">
      <div className="instrument-title">
        <span>AIR DJ</span>
        <small>SCRATCH DECK</small>
      </div>

      {/* ── Deck selector + scrub pads ── */}
      <div className="dj-decks">
        {/* Deck A */}
        <div className="dj-deck">
          <div className="dj-deck-label">DECK A {deckA && <span className="dj-deck-sample">· {SCRATCH_SAMPLES.find((s) => s.id === deckA)?.label}</span>}</div>
          <div
            className={`dj-scrub-pad ${scrubbing === 0 ? "active" : ""}`}
            onPointerDown={(e) => deckA && handleScrubStart(0, e)}
          >
            <div className="dj-scrub-hint">↕ DRAG TO SCRATCH</div>
          </div>
        </div>

        {/* Crossfader */}
        <div className="dj-crossfader">
          <div className="dj-crossfader-label">A ← → B</div>
          <input
            type="range" min="0" max="1" step="0.01" value={crossfade}
            onChange={handleCrossfade}
            className="dj-crossfader-slider"
          />
          <div className="dj-crossfader-value">{Math.round(crossfade * 100)}%</div>
        </div>

        {/* Deck B */}
        <div className="dj-deck">
          <div className="dj-deck-label">DECK B {deckB && <span className="dj-deck-sample">· {SCRATCH_SAMPLES.find((s) => s.id === deckB)?.label}</span>}</div>
          <div
            className={`dj-scrub-pad ${scrubbing === 1 ? "active" : ""}`}
            onPointerDown={(e) => deckB && handleScrubStart(1, e)}
          >
            <div className="dj-scrub-hint">↕ DRAG TO SCRATCH</div>
          </div>
        </div>
      </div>

      {/* ── Sample pads ── */}
      <div className="dj-pad-grid">
        {SCRATCH_SAMPLES.map((sample) => (
          <button
            key={sample.id}
            type="button"
            className={`dj-pad ${deckA === sample.id ? "deck-a" : ""} ${deckB === sample.id ? "deck-b" : ""}`}
            ref={(node) => { if (node) padRefs.current.set(sample.id, node); else padRefs.current.delete(sample.id); }}
            onPointerDown={() => handleTap(deckA ? 1 : 0, sample.id)}
            title={`Load to ${deckA ? "B" : "A"}`}
          >
            {sample.label}
          </button>
        ))}
      </div>

      <div className="instrument-footer">
        <span>{loaded ? "SAMPLES LOADED" : "LOADING..."}</span>
        <span>TAP = LOAD / DRAG = SCRATCH</span>
      </div>
    </section>
  );
});
AirDJ.displayName = "AirDJ";
