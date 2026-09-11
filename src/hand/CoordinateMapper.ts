import { CAMERA_BOUNDS } from "../config";
import type { HandInput, InteractionPoint, InteractionState } from "./types";

export class CoordinateMapper {
  constructor(private readonly bounds = CAMERA_BOUNDS) {}

  /** Map one fingertip (0=thumb … 4=pinky) to a screen-space interaction point. */
  mapFinger(hand: HandInput, finger: number, container: DOMRect, state: InteractionState): InteractionPoint {
    const tip = hand.fingertips[finger] ?? hand.indexTip;
    const horizontal = 1 - tip.x;
    const vertical   = tip.y;
    const xNorm = (horizontal - this.bounds.left)  / (this.bounds.right  - this.bounds.left);
    const yNorm = (vertical   - this.bounds.top)   / (this.bounds.bottom - this.bounds.top);
    const x = container.left + Math.max(0, Math.min(1, xNorm)) * container.width;
    const y = container.top  + Math.max(0, Math.min(1, yNorm)) * container.height;
    return { id: `${hand.id}:f${finger}`, finger, x, y, z: tip.z, state, gesture: hand.gesture, confidence: hand.confidence, speed: hand.fingerSpeeds[finger] ?? hand.speed, timestamp: hand.timestamp };
  }

  /** Compat: index finger only. */
  map(hand: HandInput, container: DOMRect, state: InteractionState): InteractionPoint {
    return this.mapFinger(hand, 1, container, state);
  }
}
