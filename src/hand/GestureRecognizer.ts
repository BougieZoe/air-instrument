import {
  FINGER_EXTEND_MARGIN,
  FIST_FOLD_MARGIN,
  INDEX_RAISE_DELTA,
  OPEN_HAND_INDEX_DIST,
  OPEN_HAND_THUMB_DIST,
  PINCH_MIN_DIST,
  PINCH_RANGE,
  PINCH_THRESHOLD,
} from "../config";
import type { GestureName, HandInput, Point3 } from "./types";
import { FINGER_TIP_INDICES } from "./types";

const distance = (a: Point3, b: Point3) =>
  Math.hypot(a.x - b.x, a.y - b.y, (a.z - b.z) * 0.6);

/**
 * Rule-based gesture classifier with adaptive thresholds.
 * All distance-based thresholds scale by handSizeRatio so small/large hands
 * trigger the same gestures.
 */
export class GestureRecognizer {
  private extendMargin = FINGER_EXTEND_MARGIN;
  private foldMargin   = FIST_FOLD_MARGIN;

  /** Re-calibrate thresholds after hand size is measured. */
  calibrate(handSizeRatio: number) {
    const s = handSizeRatio;
    this.extendMargin = FINGER_EXTEND_MARGIN * s;
    this.foldMargin   = FIST_FOLD_MARGIN * s;
  }

  recognize(
    input: Omit<HandInput, "gesture" | "pinchStrength" | "speed">
  ): { gesture: GestureName; pinchStrength: number } {
    const s = input.handSize || 1;
    const pinchDistance = distance(input.indexTip, input.thumbTip);
    const pinchStrength = Math.max(
      0,
      Math.min(1, 1 - (pinchDistance - PINCH_MIN_DIST * s) / (PINCH_RANGE * s))
    );

    const indexRaised =
      input.indexTip.y < input.palm.y - INDEX_RAISE_DELTA * s;
    const handOpen =
      distance(input.indexTip, input.wrist) > OPEN_HAND_INDEX_DIST * s &&
      distance(input.thumbTip, input.wrist) > OPEN_HAND_THUMB_DIST * s;

    // Per-finger extended/folded classification (fingers 1-4: index..pinky)
    const tips  = input.fingertips;
    const extended = [false, false, false, false]; // index, middle, ring, pinky
    for (let i = 1; i <= 4; i++) {
      const tip = tips[i];
      // A finger is extended if its tip is below (higher y = lower on screen)
      // the corresponding MCP joint by a margin.
      // We approximate MCP from adjacent landmarks: MCP[i] ≈ landmarks[FINGER_MCP[i]]
      // Since we don't have MCPs in input, use a heuristic: tip.y < palm.y - margin
      // for index/middle, and tip.y < palm.y + margin for ring/pinky (they're shorter)
      const m = i <= 2 ? this.extendMargin : this.extendMargin * 0.6;
      extended[i - 1] = tip.y < input.palm.y - m;
    }

    // Fist: all 4 fingers folded (tips above palm)
    const allFolded = extended.every((e) => !e);
    // Peace: index + middle extended, ring + pinky folded
    const peace = extended[0] && extended[1] && !extended[2] && !extended[3];
    // Thumbs up: thumb tip is well above wrist, all others folded
    const thumbUp =
      input.thumbTip.y < input.wrist.y - this.extendMargin * 1.5 &&
      allFolded;

    if (pinchStrength > PINCH_THRESHOLD) return { gesture: "PINCH", pinchStrength };
    if (thumbUp) return { gesture: "THUMBS_UP", pinchStrength };
    if (peace) return { gesture: "PEACE", pinchStrength };
    if (allFolded && !thumbUp) return { gesture: "FIST", pinchStrength };
    if (indexRaised) return { gesture: "INDEX_POINT", pinchStrength };
    if (handOpen) return { gesture: "OPEN_HAND", pinchStrength };
    return { gesture: "UNKNOWN", pinchStrength };
  }
}
