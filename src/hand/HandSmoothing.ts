import { MIN_FRAME_DT_MS, SMOOTHING_ALPHA, SPEED_NORM_FACTOR } from "../config";
import type { HandInput, Point3 } from "./types";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const smoothPoint = (prev: Point3, next: Point3, alpha: number): Point3 => ({
  x: lerp(prev.x, next.x, alpha),
  y: lerp(prev.y, next.y, alpha),
  z: lerp(prev.z, next.z, alpha),
});

export class HandSmoothing {
  private prev = new Map<string, HandInput>();

  constructor(private readonly alpha = SMOOTHING_ALPHA) {}

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

      const indexTip = smoothPoint(previous.indexTip, hand.indexTip, this.alpha);
      const thumbTip = smoothPoint(previous.thumbTip, hand.thumbTip, this.alpha);
      const wrist    = smoothPoint(previous.wrist,    hand.wrist,    this.alpha);
      const palm     = smoothPoint(previous.palm,     hand.palm,     this.alpha);

      const dt = Math.max(MIN_FRAME_DT_MS, hand.timestamp - previous.timestamp);
      const dx = indexTip.x - previous.indexTip.x;
      const dy = indexTip.y - previous.indexTip.y;
      const speed = Math.min(1, Math.hypot(dx, dy) / (dt / 1000) / SPEED_NORM_FACTOR);

      const smoothed = { ...hand, indexTip, thumbTip, wrist, palm, speed };
      this.prev.set(hand.id, smoothed);
      return smoothed;
    });
  }
}
