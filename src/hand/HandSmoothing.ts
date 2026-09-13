import {
  MIN_FRAME_DT_MS,
  SMOOTHING_ALPHA,
  SMOOTHING_ALPHA_MAX,
  SMOOTHING_ALPHA_MIN,
  SMOOTHING_SPEED_CEIL,
  SMOOTHING_SPEED_FLOOR,
  SPEED_NORM_FACTOR,
} from "../config";
import type { HandInput, Point3 } from "./types";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const smoothPoint = (prev: Point3, next: Point3, alpha: number): Point3 => ({
  x: lerp(prev.x, next.x, alpha),
  y: lerp(prev.y, next.y, alpha),
  z: lerp(prev.z, next.z, alpha),
});

/**
 * Adaptive EMA smoothing: fast movement → high alpha (responsive),
 * slow movement → low alpha (stable). Uses per-finger speed to
 * compute a per-finger adaptive alpha.
 */
export class HandSmoothing {
  private prev = new Map<string, HandInput>();

  /** Compute adaptive alpha from raw speed (0-1). */
  private adaptiveAlpha(speed: number): number {
    if (speed <= SMOOTHING_SPEED_FLOOR) return SMOOTHING_ALPHA_MIN;
    if (speed >= SMOOTHING_SPEED_CEIL) return SMOOTHING_ALPHA_MAX;
    const t =
      (speed - SMOOTHING_SPEED_FLOOR) /
      (SMOOTHING_SPEED_CEIL - SMOOTHING_SPEED_FLOOR);
    return lerp(SMOOTHING_ALPHA_MIN, SMOOTHING_ALPHA_MAX, t);
  }

  smooth(hands: HandInput[]): HandInput[] {
    const liveIds = new Set(hands.map((h) => h.id));
    for (const id of this.prev.keys()) {
      if (!liveIds.has(id)) this.prev.delete(id);
    }

    return hands.map((hand) => {
      const previous = this.prev.get(hand.id);
      if (!previous) {
        this.prev.set(hand.id, hand);
        return hand;
      }

      const dt = Math.max(MIN_FRAME_DT_MS, hand.timestamp - previous.timestamp);

      // --- Per-finger adaptive smoothing ---
      const fingertips = hand.fingertips.map((tip, i) => {
        const prev = previous.fingertips[i] ?? tip;
        const rawSpeed = Math.min(
          1,
          Math.hypot(tip.x - prev.x, tip.y - prev.y) /
            (dt / 1000) /
            SPEED_NORM_FACTOR
        );
        const alpha = this.adaptiveAlpha(rawSpeed);
        return smoothPoint(prev, tip, alpha);
      });

      // Per-finger speeds from smoothed positions
      const fingerSpeeds = fingertips.map((tip, i) => {
        const prev = previous.fingertips[i] ?? tip;
        return Math.min(
          1,
          Math.hypot(tip.x - prev.x, tip.y - prev.y) /
            (dt / 1000) /
            SPEED_NORM_FACTOR
        );
      });

      // Index speed for gesture triggers (use index finger alpha)
      const indexAlpha = this.adaptiveAlpha(fingerSpeeds[1] ?? 0);
      const indexTip = smoothPoint(previous.indexTip, hand.indexTip, indexAlpha);
      const thumbTip = smoothPoint(previous.thumbTip, hand.thumbTip, indexAlpha);
      const wrist    = smoothPoint(previous.wrist,    hand.wrist,    indexAlpha);
      const palm     = smoothPoint(previous.palm,     hand.palm,     indexAlpha);

      const dx = indexTip.x - previous.indexTip.x;
      const dy = indexTip.y - previous.indexTip.y;
      const speed = Math.min(1, Math.hypot(dx, dy) / (dt / 1000) / SPEED_NORM_FACTOR);

      const smoothed = {
        ...hand,
        indexTip,
        thumbTip,
        wrist,
        palm,
        fingertips,
        fingerSpeeds,
        speed,
      };
      this.prev.set(hand.id, smoothed);
      return smoothed;
    });
  }
}
