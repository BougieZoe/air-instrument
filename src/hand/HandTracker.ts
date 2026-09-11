import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from "@mediapipe/tasks-vision";
import { GestureRecognizer } from "./GestureRecognizer";
import { HandSmoothing } from "./HandSmoothing";
import type { HandInput, Point3 } from "./types";

export type HandTrackerStatus = "idle" | "loading" | "ready" | "error";

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private recognizer = new GestureRecognizer();
  private smoothing = new HandSmoothing();
  status: HandTrackerStatus = "idle";
  error: string | null = null;

  async init() {
    if (this.landmarker || this.status === "loading") {
      return;
    }

    this.status = "loading";

    // Try GPU first, fall back to CPU if it fails
    for (const delegate of ["GPU", "CPU"] as const) {
      try {
        const resolver = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
        this.landmarker = await HandLandmarker.createFromOptions(resolver, {
          baseOptions: {
            modelAssetPath: "/mediapipe/models/hand_landmarker.task",
            delegate,
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.4,
          minHandPresenceConfidence: 0.4,
          minTrackingConfidence: 0.4,
        });
        this.status = "ready";
        console.log(`[HandTracker] ready with delegate: ${delegate}`);
        return;
      } catch (err) {
        console.warn(`[HandTracker] ${delegate} delegate failed:`, err);
        this.landmarker = null;
      }
    }

    this.status = "error";
    this.error = "Hand tracking failed to initialize (GPU and CPU both failed).";
    console.error("[HandTracker]", this.error);
  }

  detect(video: HTMLVideoElement, now = performance.now()): HandInput[] {
    if (!this.landmarker || video.readyState < 2) {
      return [];
    }

    try {
      const result = this.landmarker.detectForVideo(video, now);
      return this.smoothing.smooth(this.toHands(result, now));
    } catch (err) {
      console.warn("[HandTracker] detection error:", err);
      return [];
    }
  }

  private toHands(result: HandLandmarkerResult, timestamp: number): HandInput[] {
    return result.landmarks.map((landmarks, index) => {
      const handed = result.handedness[index]?.[0];
      const handedness =
        handed?.categoryName === "Left" || handed?.categoryName === "Right"
          ? handed.categoryName
          : "Unknown";
      const base: Omit<HandInput, "gesture" | "pinchStrength" | "speed"> = {
        id: `${handed?.categoryName ?? "Hand"}-${index}`,
        handedness,
        confidence: handed?.score ?? 0,
        indexTip: landmarks[8] as Point3,
        thumbTip: landmarks[4] as Point3,
        wrist: landmarks[0] as Point3,
        palm: {
          x: (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3,
          y: (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3,
          z: (landmarks[0].z + landmarks[5].z + landmarks[17].z) / 3,
        },
        timestamp,
      };
      const gesture = this.recognizer.recognize(base);
      return { ...base, ...gesture, speed: 0, timestamp };
    });
  }

  dispose() {
    this.landmarker?.close();
    this.landmarker = null;
    this.status = "idle";
  }
}
