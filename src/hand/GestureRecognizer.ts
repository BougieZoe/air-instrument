import {
  INDEX_RAISE_DELTA,
  OPEN_HAND_INDEX_DIST,
  OPEN_HAND_THUMB_DIST,
  PINCH_MIN_DIST,
  PINCH_RANGE,
  PINCH_THRESHOLD,
} from "../config";
import type { GestureName, HandInput, Point3 } from "./types";

const distance = (a: Point3, b: Point3) =>
  Math.hypot(a.x - b.x, a.y - b.y, (a.z - b.z) * 0.6);

export class GestureRecognizer {
  recognize(input: Omit<HandInput, "gesture" | "pinchStrength" | "speed">): {
    gesture: GestureName;
    pinchStrength: number;
  } {
    const pinchDistance = distance(input.indexTip, input.thumbTip);
    const pinchStrength = Math.max(
      0,
      Math.min(1, 1 - (pinchDistance - PINCH_MIN_DIST) / PINCH_RANGE)
    );
    const indexRaised = input.indexTip.y < input.palm.y - INDEX_RAISE_DELTA;
    const handOpen =
      distance(input.indexTip, input.wrist) > OPEN_HAND_INDEX_DIST &&
      distance(input.thumbTip, input.wrist) > OPEN_HAND_THUMB_DIST;

    if (pinchStrength > PINCH_THRESHOLD) return { gesture: "PINCH", pinchStrength };
    if (indexRaised) return { gesture: "INDEX_POINT", pinchStrength };
    if (handOpen) return { gesture: "OPEN_HAND", pinchStrength };
    return { gesture: "UNKNOWN", pinchStrength };
  }
}
