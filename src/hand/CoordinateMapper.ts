import { CAMERA_BOUNDS } from "../config";
import type { HandInput, InteractionPoint, InteractionState } from "./types";

export class CoordinateMapper {
  constructor(private readonly bounds = CAMERA_BOUNDS) {}

  map(hand: HandInput, container: DOMRect, state: InteractionState): InteractionPoint {
    const horizontal = 1 - hand.indexTip.x;
    const vertical   = hand.indexTip.y;
    const xNorm = (horizontal - this.bounds.left)  / (this.bounds.right  - this.bounds.left);
    const yNorm = (vertical   - this.bounds.top)   / (this.bounds.bottom - this.bounds.top);
    const x = container.left + Math.max(0, Math.min(1, xNorm)) * container.width;
    const y = container.top  + Math.max(0, Math.min(1, yNorm)) * container.height;
    return { id: hand.id, x, y, z: hand.indexTip.z, state, gesture: hand.gesture, confidence: hand.confidence, speed: hand.speed, timestamp: hand.timestamp };
  }
}
