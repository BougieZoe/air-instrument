import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from "@mediapipe/tasks-vision";
import { GestureRecognizer } from "./GestureRecognizer";
import { HandSmoothing } from "./HandSmoothing";
import type { HandInput, Point3 } from "./types";
import { FINGER_TIP_INDICES } from "./types";

/** Raw output from MediaPipe before smoothing - speed is not yet computed */
type RawHandInput = Omit<HandInput, "speed">;

export type HandTrackerStatus = "idle" | "loading" | "ready" | "error";

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private recognizer = new GestureRecognizer();
  private smoothing  = new HandSmoothing();
  status: HandTrackerStatus = "idle";
  error: string | null = null;

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

  detect(video: HTMLVideoElement, now = performance.now()): HandInput[] {
    if (!this.landmarker || video.readyState < 2) return [];
    try {
      const result = this.landmarker.detectForVideo(video, now);
      return this.smoothing.smooth(this.toHands(result, now));
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
      const raw: RawHandInput = {
        id: `${handed?.categoryName ?? "Hand"}-${index}`,
        handedness,
        confidence:  handed?.score ?? 0,
        indexTip:    landmarks[8]  as Point3,
        thumbTip:    landmarks[4]  as Point3,
        wrist:       landmarks[0]  as Point3,
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
      };
      const gesture = this.recognizer.recognize(raw);
      // speed is 0 here intentionally - HandSmoothing computes it from frame delta
      return { ...raw, ...gesture, speed: 0 };
    });
  }

  dispose() {
    this.landmarker?.close();
    this.landmarker = null;
    this.status = "idle";
  }
}
