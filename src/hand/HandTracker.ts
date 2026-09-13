import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from "@mediapipe/tasks-vision";
import {
  CALIBRATION_FRAMES,
  CALIBRATION_REFERENCE_SIZE,
  CALIBRATION_TIMEOUT_MS,
} from "../config";
import { GestureRecognizer } from "./GestureRecognizer";
import { HandSmoothing } from "./HandSmoothing";
import type { HandInput, Point3 } from "./types";
import { FINGER_TIP_INDICES } from "./types";

/** Raw output from MediaPipe before smoothing - speed is not yet computed */
type RawHandInput = Omit<HandInput, "speed">;

export type HandTrackerStatus = "idle" | "loading" | "ready" | "calibrating" | "error";

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private recognizer = new GestureRecognizer();
  private smoothing  = new HandSmoothing();

  status: HandTrackerStatus = "idle";
  error: string | null = null;

  // Calibration state
  private calibrationSamples: number[] = [];
  private calibrationStartedAt = 0;
  handSizeRatio = 1;  // multiplier: 1.0 = reference hand size
  onCalibrationComplete?: (ratio: number) => void;

  async init() {
    if (this.landmarker || this.status === "loading") return;
    this.status = "loading";

    let resolver: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>;
    try {
      resolver = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
    } catch (err) {
      this.status = "error";
      this.error  = "Failed to load MediaPipe WASM runtime.";
      console.error("[HandTracker]", this.error, err);
      return;
    }

    for (const delegate of ["GPU", "CPU"] as const) {
      try {
        this.landmarker = await HandLandmarker.createFromOptions(resolver, {
          baseOptions: { modelAssetPath: "/mediapipe/models/hand_landmarker.task", delegate },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.4,
          minHandPresenceConfidence:  0.4,
          minTrackingConfidence:      0.4,
        });
        this.status = "ready";
        console.log(`[HandTracker] ready - delegate: ${delegate}`);
        return;
      } catch (err) {
        console.warn(`[HandTracker] ${delegate} failed:`, err);
        this.landmarker = null;
      }
    }

    this.status = "error";
    this.error  = "Hand tracking failed (GPU and CPU both failed).";
    console.error("[HandTracker]", this.error);
  }

  /** Start calibration: collect hand-size samples over CALIBRATION_FRAMES. */
  startCalibration() {
    this.calibrationSamples = [];
    this.calibrationStartedAt = performance.now();
    this.status = "calibrating";
    console.log("[HandTracker] calibration started — show your hand");
  }

  /** Force-finish calibration with whatever samples we have (or defaults). */
  skipCalibration() {
    if (this.status !== "calibrating") return;
    console.warn("[HandTracker] calibration skipped/timed out — using default hand size");
    this.finishCalibration();
  }

  /** 0-1 progress for the calibration UI. */
  get calibrationProgress(): number {
    return Math.min(1, this.calibrationSamples.length / CALIBRATION_FRAMES);
  }

  private finishCalibration() {
    const avg = this.calibrationSamples.length > 0
      ? this.calibrationSamples.reduce((a, b) => a + b, 0) / this.calibrationSamples.length
      : CALIBRATION_REFERENCE_SIZE;
    this.handSizeRatio = avg / CALIBRATION_REFERENCE_SIZE;
    this.recognizer.calibrate(this.handSizeRatio);
    this.status = "ready";
    console.log(
      `[HandTracker] calibration done — avg size: ${avg.toFixed(4)}, ratio: ${this.handSizeRatio.toFixed(2)}x`
    );
    this.onCalibrationComplete?.(this.handSizeRatio);
  }

  detect(video: HTMLVideoElement, now = performance.now()): HandInput[] {
    if (!this.landmarker || video.readyState < 2) return [];
    try {
      const result = this.landmarker.detectForVideo(video, now);
      const rawHands = this.toHands(result, now);

      // During calibration, accumulate hand size and skip smoothing/output
      if (this.status === "calibrating") {
        for (const hand of rawHands) {
          this.calibrationSamples.push(hand.handSize);
        }
        // Finish on enough samples, or bail out after the timeout so the UI
        // never gets stuck (no hand visible, camera covered, dark room, ...).
        const timedOut =
          performance.now() - this.calibrationStartedAt >= CALIBRATION_TIMEOUT_MS;
        if (this.calibrationSamples.length >= CALIBRATION_FRAMES || timedOut) {
          this.finishCalibration();
        }
        return [];
      }

      return this.smoothing.smooth(rawHands);
    } catch (err) {
      console.warn("[HandTracker] detection error:", err);
      return [];
    }
  }

  private toHands(result: HandLandmarkerResult, timestamp: number): HandInput[] {
    return result.landmarks.map((landmarks, index): HandInput => {
      const handed = result.handedness[index]?.[0];
      const handedness =
        handed?.categoryName === "Left" || handed?.categoryName === "Right"
          ? handed.categoryName : "Unknown";

      // Hand size: distance from wrist (0) to middle finger MCP (9)
      const wrist = landmarks[0] as Point3;
      const middleMcp = landmarks[9] as Point3;
      const handSize = Math.hypot(
        wrist.x - middleMcp.x,
        wrist.y - middleMcp.y,
        (wrist.z - middleMcp.z) * 0.6
      );

      const raw: RawHandInput = {
        id: `${handed?.categoryName ?? "Hand"}-${index}`,
        handedness,
        confidence:  handed?.score ?? 0,
        indexTip:    landmarks[8]  as Point3,
        thumbTip:    landmarks[4]  as Point3,
        wrist,
        fingertips:  FINGER_TIP_INDICES.map((tip) => ({ ...(landmarks[tip] as Point3) })),
        fingerSpeeds: FINGER_TIP_INDICES.map(() => 0),
        palm: {
          x: (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3,
          y: (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3,
          z: (landmarks[0].z + landmarks[5].z + landmarks[17].z) / 3,
        },
        gesture: "UNKNOWN",
        pinchStrength: 0,
        timestamp,
        handSize,
      };
      const gesture = this.recognizer.recognize(raw);
      return { ...raw, ...gesture, speed: 0 };
    });
  }

  dispose() {
    this.landmarker?.close();
    this.landmarker = null;
    this.status = "idle";
  }
}
