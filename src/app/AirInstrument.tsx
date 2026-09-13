import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CALIBRATION_TIMEOUT_MS, GAIN_ACCOMPANIMENT_DEFAULT } from "../config";
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
import { FINGER_COUNT } from "../hand/types";
import { getInstrument, getInstruments } from "../instruments/registry";
import { type GenrePack, defaultPack, allPacks } from "../instruments/AirSampler/packs";
import type { InstrumentHandle, InstrumentMode } from "../instruments/types";
import { AudioReactive } from "../visuals/AudioReactive";
import { InteractionFeedback } from "../visuals/InteractionFeedback";

type AccompanimentViewState = { fileName: string | null; isPlaying: boolean; volume: number; };
const emptyAccompanimentState: AccompanimentViewState = { fileName: null, isPlaying: false, volume: GAIN_ACCOMPANIMENT_DEFAULT };

type DebugInfo = { target: string | null; gesture: string; confidence: number; speed: number; z: number; state: string; };
const emptyDebugInfo: DebugInfo = { target: null, gesture: "UNKNOWN", confidence: 0, speed: 0, z: 0, state: "IDLE" };

export default function AirInstrument() {
  const [started,       setStarted]       = useState(false);
  const [starting,      setStarting]      = useState(false);
  const [mode,          setMode]          = useState<InstrumentMode>("sampler");
  const [cameraReady,   setCameraReady]   = useState(false);
  const [tracking,      setTracking]      = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [debug,         setDebug]         = useState(() => new URLSearchParams(window.location.search).has("debug"));
  const [fps,           setFps]           = useState(0);
  const [debugInfo,     setDebugInfo]     = useState<DebugInfo>(emptyDebugInfo);
  const [accompaniment, setAccompaniment] = useState<AccompanimentViewState>(emptyAccompanimentState);
  const [currentPack,   setCurrentPack]   = useState<GenrePack>(defaultPack);
  const [calibrating,   setCalibrating]   = useState(false);

  const videoRef      = useRef<HTMLVideoElement>(null);
  const stageRef      = useRef<HTMLDivElement>(null);
  const instrumentRef = useRef<InstrumentHandle>(null);
  const pointsRef     = useRef<InteractionPoint[]>([]);
  const audioRef      = useRef<AudioEngine | null>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const frameRef      = useRef(0);
  const frameCountRef = useRef(0);
  const lastFpsAtRef  = useRef(performance.now());

  const tracker      = useMemo(() => new HandTracker(), []);
  const mapper       = useMemo(() => new CoordinateMapper(), []);
  const interactions = useMemo(() => new InteractionController(), []);

  useEffect(() => {
    tracker.init().then(() => console.log("[HandTracker] pre-init done, status:", tracker.status));
    tracker.onCalibrationComplete = () => setCalibrating(false);
  }, [tracker]);

  // Safety net: never let the calibration overlay block the app. The tracker
  // enforces its own timeout inside detect(), but detect() stops running when
  // rAF is throttled (background tab / throttled iframe), so time it out here.
  useEffect(() => {
    if (!calibrating) return;
    const t = setTimeout(() => {
      tracker.skipCalibration();
      setCalibrating(false);
    }, CALIBRATION_TIMEOUT_MS + 1500);
    return () => clearTimeout(t);
  }, [calibrating, tracker]);

  const skipCalibration = useCallback(() => {
    tracker.skipCalibration();
    setCalibrating(false);
  }, [tracker]);

  const ensureAudio = useCallback(async () => {
    if (!audioRef.current) { audioRef.current = new AudioEngine(); await audioRef.current.loadSamplePack(currentPack); }
    else await audioRef.current.resume();
    return audioRef.current;
  }, [currentPack]);

  const loadPack = useCallback(async (pack: GenrePack) => {
    setCurrentPack(pack);
    if (audioRef.current) await audioRef.current.loadSamplePack(pack);
  }, []);

  const start = useCallback(async () => {
    setStarting(true);
    setError(null);
    try {
      const engine = await ensureAudio();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 800 } }, audio: false });
      streamRef.current = stream;
      setStarted(true);
      setCameraReady(true);
      await engine.resume();
      // If MediaPipe failed to load (WASM blocked / unsupported webview),
      // skip calibration entirely and fall back to mouse control instead of
      // waiting on a callback that can never fire.
      if (tracker.status === "error") {
        setError(tracker.error ?? "Hand tracking unavailable. Mouse fallback is active.");
      } else {
        tracker.startCalibration();
        setCalibrating(true);
      }
      requestAnimationFrame(() => {
        const video = videoRef.current;
        if (video) { video.srcObject = stream; video.play().catch(console.warn); console.log("[Camera] stream attached"); }
        else console.error("[Camera] videoRef.current is null after mount");
      });
    } catch (startError) {
      setStarted(true);
      setCameraReady(false);
      setError(startError instanceof Error ? startError.message : "Camera unavailable. Mouse fallback is active.");
    } finally {
      setStarting(false);
    }
  }, [ensureAudio, tracker]);

  const handleModeChange = (nextMode: InstrumentMode) => { instrumentRef.current?.reset(); setMode(nextMode); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key.toLowerCase() === "d" && e.shiftKey && e.metaKey) setDebug((v) => !v); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!started || !cameraReady) return;
    const tick = () => {
      const video = videoRef.current, stage = stageRef.current, instrument = instrumentRef.current;
      const liveIds = new Set<string>();
      if (video && stage && instrument) {
        const rect  = stage.getBoundingClientRect();
        const hands = tracker.detect(video);
        const points: InteractionPoint[] = [];
        setTracking((prev) => { const next = hands.length > 0; return prev === next ? prev : next; });
        for (const hand of hands) {
          for (let finger = 0; finger < FINGER_COUNT; finger++) {
            const base     = mapper.mapFinger(hand, finger, rect, "IDLE");
            liveIds.add(base.id);
            const targetId = instrument.hitTest(base.x, base.y);
            const point    = interactions.update(base, targetId);
            instrument.handleInteraction(point, targetId);
            points.push(point);
            if (debug && finger === 1) setDebugInfo({ target: targetId, gesture: hand.gesture, confidence: hand.confidence, speed: point.speed, z: point.z, state: point.state });
          }
        }
        interactions.resetMissing(liveIds);
        pointsRef.current = points;
      }
      frameCountRef.current += 1;
      const now = performance.now();
      if (now - lastFpsAtRef.current > 600) { setFps((frameCountRef.current * 1000) / (now - lastFpsAtRef.current)); frameCountRef.current = 0; lastFpsAtRef.current = now; }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [cameraReady, debug, interactions, mapper, started, tracker]);

  useEffect(() => {
    return () => { cancelAnimationFrame(frameRef.current); streamRef.current?.getTracks().forEach((t) => t.stop()); tracker.dispose(); audioRef.current?.piano.releaseAll(); };
  }, [tracker]);

  const importAudio = async (file: File) => {
    const engine = await ensureAudio();
    await engine.accompaniment.load(file);
    engine.accompaniment.play();
    setAccompaniment({ ...engine.accompaniment.state });
  };

  const updateAccompaniment = (action: "play" | "pause" | "restart", volume?: number) => {
    const engine = audioRef.current;
    if (!engine) return;
    if (action === "play") engine.accompaniment.play();
    else if (action === "pause") engine.accompaniment.pause();
    else engine.accompaniment.restart();
    if (typeof volume === "number") engine.accompaniment.setVolume(volume);
    setAccompaniment({ ...engine.accompaniment.state });
  };

  if (!started) return <StartScreen onStart={start} error={error} starting={starting} />;

  const instruction = !cameraReady ? "Mouse fallback is active." : !tracking ? "Raise your hand." : hasInteracted ? "" : "Touch the air.";

  const activePlugin = getInstrument(mode) ?? getInstruments()[0];

  const samplerProps = mode === "sampler" ? { pack: currentPack, onPackChange: loadPack } : {};

  return (
    <main className="air-instrument" ref={stageRef}>
      <CameraView ref={videoRef} hasCamera={cameraReady} />
      <header className="top-bar">
        <div className="brand">AIR INSTRUMENT</div>
        <ModeSwitcher mode={mode} onModeChange={handleModeChange} />
        <div className="top-right">
          <TrackingIndicator tracking={tracking} cameraReady={cameraReady} />
          <button type="button" className="debug-toggle" onClick={() => setDebug((v) => !v)} title="Toggle debug overlay">{debug ? "◉ DEBUG" : "◎ DEBUG"}</button>
        </div>
      </header>
      <div className="instrument-space" data-mode={activePlugin.mode}>
        <activePlugin.component ref={instrumentRef} audioRef={audioRef} onFirstInteraction={() => setHasInteracted(true)} {...samplerProps} />
      </div>
      <AudioImport state={accompaniment} onImport={importAudio} onPlay={() => updateAccompaniment("play")} onPause={() => updateAccompaniment("pause")} onRestart={() => updateAccompaniment("restart")}
        onVolume={(volume) => { audioRef.current?.accompaniment.setVolume(volume); if (audioRef.current) setAccompaniment({ ...audioRef.current.accompaniment.state }); }} />
      <InteractionFeedback pointsRef={pointsRef} />
      <AudioReactive audioRef={audioRef} />
      {instruction && <div className="gesture-instruction">{instruction}</div>}
      {calibrating && (
        <div className="calibration-overlay">
          <div className="calibration-box">
            <div className="calibration-icon">✋</div>
            <div className="calibration-title">校准手型</div>
            <div className="calibration-hint">张开手掌，保持不动…（检测不到手会自动跳过）</div>
            <div className="calibration-progress"><div className="calibration-progress-fill" /></div>
            <button type="button" className="calibration-skip" onClick={skipCalibration}>跳过</button>
          </div>
        </div>
      )}
      <DebugOverlay visible={debug} fps={fps} target={debugInfo.target} gesture={debugInfo.gesture} confidence={debugInfo.confidence} speed={debugInfo.speed} z={debugInfo.z} state={debugInfo.state} />
    </main>
  );
}
