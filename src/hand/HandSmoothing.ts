import type { HandInput, Point3 } from "./types";

type SmoothedRecord = {
  hand: HandInput;
  last: Point3;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const smoothPoint = (previous: Point3, next: Point3, alpha: number): Point3 => ({
  x: lerp(previous.x, next.x, alpha),
  y: lerp(previous.y, next.y, alpha),
  z: lerp(previous.z, next.z, alpha)
});

export class HandSmoothing {
  private records = new Map<string, SmoothedRecord>();

  constructor(private readonly alpha = 0.42) {}

  smooth(hands: HandInput[]) {
    const liveIds = new Set(hands.map((hand) => hand.id));

    for (const id of this.records.keys()) {
      if (!liveIds.has(id)) {
        this.records.delete(id);
      }
    }

    return hands.map((hand) => {
      const previous = this.records.get(hand.id);
      if (!previous) {
        this.records.set(hand.id, { hand, last: hand.indexTip });
        return hand;
      }

      const indexTip = smoothPoint(previous.hand.indexTip, hand.indexTip, this.alpha);
      const thumbTip = smoothPoint(previous.hand.thumbTip, hand.thumbTip, this.alpha);
      const wrist = smoothPoint(previous.hand.wrist, hand.wrist, this.alpha);
      const palm = smoothPoint(previous.hand.palm, hand.palm, this.alpha);
      const dt = Math.max(12, hand.timestamp - previous.hand.timestamp);
      const dx = indexTip.x - previous.last.x;
      const dy = indexTip.y - previous.last.y;
      const speed = Math.min(1, Math.hypot(dx, dy) / (dt / 1000) / 2.4);
      const nextHand = { ...hand, indexTip, thumbTip, wrist, palm, speed };
      this.records.set(hand.id, { hand: nextHand, last: indexTip });
      return nextHand;
    });
  }
}
