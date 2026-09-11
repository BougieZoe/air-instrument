import type { GestureName, HandInput, Point3 } from "./types";

const distance = (a: Point3, b: Point3) =>
  Math.hypot(a.x - b.x, a.y - b.y, (a.z - b.z) * 0.6);

export class GestureRecognizer {
  recognize(input: Omit<HandInput, "gesture" | "pinchStrength" | "speed">): {
    gesture: GestureName;
    pinchStrength: number;
  } {
    const pinchDistance = distance(input.indexTip, input.thumbTip);
    const pinchStrength = Math.max(0, Math.min(1, 1 - (pinchDistance - 0.035) / 0.085));
    const indexRaised = input.indexTip.y < input.palm.y - 0.03;
    const handOpen = distance(input.indexTip, input.wrist) > 0.22 && distance(input.thumbTip, input.wrist) > 0.16;

    if (pinchStrength > 0.64) {
      return { gesture: "PINCH", pinchStrength };
    }

    if (indexRaised) {
      return { gesture: "INDEX_POINT", pinchStrength };
    }

    if (handOpen) {
      return { gesture: "OPEN_HAND", pinchStrength };
    }

    return { gesture: "UNKNOWN", pinchStrength };
  }
}
