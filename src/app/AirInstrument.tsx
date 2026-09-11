import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioEngine } from "../audio/AudioEngine";
import { AudioImport } from "../components/AudioImport";
import { CameraView } from "../components/CameraView";
import { DebugOverlay } from "../components/DebugOverlay";
import { ModeSwitcher } from "../components/ModeSwitcher";
import { StartScreen } from "../components/StartScreen";
import { TrackingIndicator } from "../components/TrackingIndicator";
import { CoordinateMapper } from "../hand/CoordinateMapper";
import { HandTracker } from "../hand/HandTracker";
import { InteractionController } from "../hand/InteractionController";
import type { InteractionPoint } from "../hand/types";
import { AirPiano } from "../instruments/AirPiano/AirPiano";
import { AirSampler, type InstrumentHandle } from "../instruments/AirSampler/AirSampler";
import { sampleMap } from "../instruments/AirSampler/sampleMap";
import { AudioReactive } from "../visuals/AudioReactive";
import { InteractionFeedback } from "../visuals/InteractionFeedback";

export type InstrumentMode = "sampler" | "piano";

type AccompanimentViewState = {
  fileName: string | null;
  isPlaying: boolean;
  volume: number;
};

const emptyAccompanimentState: AccompanimentViewState = {
  fileName: null,
  isPlaying: false,
  volume: 0.62
};

export default function AirInstrument() {
  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [mode, setMode] = useState<InstrumentMode>("sampler");
  const [cameraReady, setCameraReady] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [firstInteraction, setFirstInteraction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState(() => new URLSearchParams(window.location.search).has("debug"));
  const [fps, setFps] = useState(0);
  const [debugTarget, setDebugTarget] = useState<string | null>(null);
  const [debugGesture, setDebugGesture] = useState("UNKNOWN");
  const [debugConfidence, setDebugConfidence] = useState(0);
  const [debugSpeed, setDebugSpeed] = useState(0);
  const [debugZ, setDebugZ] = useState(0);
  const [debugState, setDebugState] = useState("IDLE");
  const [accompaniment, setAccompaniment] = useState<AccompanimentViewState>(emptyAccompanimentState);

  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const instrumentRef = useRef<InstrumentHandle>(null);
  const pointsRef = useRef<InteractionPoint[]>([]);
  const audioRef = useRef<AudioEngine | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastFpsAtRef = useRef(performance.now());

  const tracker = useMemo(() => new HandTracker(), []);
  const mapper = useMemo(() => new CoordinateMapper(), []);
  const interactions = useMemo(() => new InteractionController(), []);

  // Pre-init tracker in background as soon as app loads — don't block START
  useEffect(() => {
    tracker.init().then(() => {
      console.log("[HandTracker] pre-init done, status:", tracker.status);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensureAudio = useCallback(async () => {
    if (!audioRef.current) {
      audioRef.current = new AudioEngine();
      await audioRef.current.loadSamples(sampleMap);
    } else {
      await audioRef.current.resume();
    }
    return audioRef.current;
  }, []);

  const start = useCallback(async () => {
    setStarting(true);
    setError(null);
    try {
      const engine = await ensureAudio();

      // Request camera — tracker is already initing/inited in background
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 800 } },
        audio: false
      });
      streamRef.current = stream;

      // Mount the instrument UI first
      setStarted(true);
      setCameraReady(true);
      await engine.resume();

      // Attach stream after React renders the video element
      setTimeout(() => {
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.play().catch(console.warn);
          console.log("[Camera] stream attached");
        } else {
          console.error("[Camera] videoRef.current is null");
        }
      }, 80);

    } catch (startError) {
      setStarted(true);
      setCameraReady(false);
      setError(startError instanceof Error ? startError.message : "Camera unavailable. Mouse fallback is active.");
    } finally {
      setStarting(false);
    }
  }, [ensureAudio]);

  const handleModeChange = (nextMode: InstrumentMode) => {
    instrumentRef.current?.reset();
    setMode(nextMode);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "d" && event.shiftKey && event.metaKey) {
        setDebug((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!started || !cameraReady) {
      return;
    }

    const tick = () => {
      const video = videoRef.current;
      const stage = stageRef.current;
      const instrument = instrumentRef.current;
      const liveIds = new Set<string>();

      if (video && stage && instrument) {
        const rect = stage.getBoundingClientRect();
        const hands = tracker.detect(video);
        const points: InteractionPoint[] = [];
        setTracking((wasTracking) => {
          const isTracking = hands.length > 0;
          return wasTracking === isTracking ? wasTracking : isTracking;
        });

        for (const hand of hands) {
          liveIds.add(hand.id);
          const base = mapper.map(hand, rect, "IDLE");
          const targetId = instrument.hitTest(base.x, base.y);
          const point = interactions.update(base, targetId);
          instrument.handleInteraction(point, targetId);
          points.push(point);
          if (debug) {
            setDebugTarget(targetId);
            setDebugGesture(hand.gesture);
            setDebugConfidence(hand.confidence);
            setDebugSpeed(hand.speed);
            setDebugZ(hand.indexTip.z);
            setDebugState(point.state);
          }
        }

        interactions.resetMissing(liveIds);
        pointsRef.current = points;
      }

      frameCountRef.current += 1;
      const now = performance.now();
      if (now - lastFpsAtRef.current > 600) {
        setFps((frameCountRef.current * 1000) / (now - lastFpsAtRef.current));
        frameCountRef.current = 0;
        lastFpsAtRef.current = now;
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [cameraReady, debug, interactions, mapper, started, tracker]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      tracker.dispose();
      audioRef.current?.piano.releaseAll();
    };
  }, [tracker]);

  const importAudio = async (file: File) => {
    const engine = await ensureAudio();
    await engine.accompaniment.load(file);
    engine.accompaniment.play();
    setAccompaniment({ ...engine.accompaniment.state });
  };

  const updateAccompaniment = (action: "play" | "pause" | "restart", volume?: number) => {
    const engine = audioRef.current;
    if (!engine) {
      return;
    }
    if (action === "play") {
      engine.accompaniment.play();
    } else if (action === "pause") {
      engine.accompaniment.pause();
    } else {
      engine.accompaniment.restart();
    }
    if (typeof volume === "number") {
      engine.accompaniment.setVolume(volume);
    }
    setAccompaniment({ ...engine.accompaniment.state });
  };

  if (!started) {
    return <StartScreen onStart={start} error={error} starting={starting} />;
  }

  const instruction = !cameraReady
    ? "Mouse fallback is active."
    : !tracking
      ? "Raise your hand."
      : firstInteraction
        ? ""
        : "Touch the air.";

  return (
    <main className="air-instrument" ref={stageRef}>
      <CameraView ref={videoRef} hasCamera={cameraReady} />
      <header className="top-bar">
        <div className="brand">AIR INSTRUMENT</div>
        <ModeSwitcher mode={mode} onModeChange={handleModeChange} />
        <div className="top-right">
          <TrackingIndicator tracking={tracking} cameraReady={cameraReady} />
          <button
            type="button"
            className="debug-toggle"
            onClick={() => setDebug((v) => !v)}
            title="Toggle debug overlay"
          >
            {debug ? "◉ DEBUG" : "◎ DEBUG"}
          </button>
        </div>
      </header>

      <div className="instrument-space" data-mode={mode}>
        {mode === "sampler" ? (
          <AirSampler ref={instrumentRef} audioRef={audioRef} onFirstInteraction={() => setFirstInteraction(true)} />
        ) : (
          <AirPiano ref={instrumentRef} audioRef={audioRef} onFirstInteraction={() => setFirstInteraction(true)} />
        )}
      </div>

      <AudioImport
        state={accompaniment}
        onImport={importAudio}
        onPlay={() => updateAccompaniment("play")}
        onPause={() => updateAccompaniment("pause")}
        onRestart={() => updateAccompaniment("restart")}
        onVolume={(volume) => {
          const engine = audioRef.current;
          engine?.accompaniment.setVolume(volume);
          if (engine) {
            setAccompaniment({ ...engine.accompaniment.state });
          }
        }}
      />

      <InteractionFeedback pointsRef={pointsRef} />
      <AudioReactive audioRef={audioRef} />
      {instruction && <div className="gesture-instruction">{instruction}</div>}
      <DebugOverlay visible={debug} fps={fps} target={debugTarget} gesture={debugGesture} confidence={debugConfidence} speed={debugSpeed} z={debugZ} state={debugState} />
    </main>
  );
}
