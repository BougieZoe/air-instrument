import { COOLDOWN_MS, DWELL_MS, SPEED_THRESHOLD, Z_THRESHOLD } from "../config";
import type { InteractionPoint, InteractionState } from "./types";

type ActivePoint = {
  targetId: string | null;
  state: InteractionState;
  pressed: boolean;
  lastPressAt: number;
  dwellStart: number;
};

export class InteractionController {
  private points = new Map<string, ActivePoint>();

  update(point: Omit<InteractionPoint, "state">, targetId: string | null): InteractionPoint {
    const now = point.timestamp;
    const previous = this.points.get(point.id) ?? {
      targetId: null,
      state: "IDLE" as InteractionState,
      pressed: false,
      lastPressAt: 0,
      dwellStart: now,
    };

    const changedTarget = previous.targetId !== targetId;
    const dwellStart = changedTarget ? now : previous.dwellStart;
    const dwellTime = now - dwellStart;
    const cooledDown = now - previous.lastPressAt > COOLDOWN_MS;

    // PINCH is a thumb+index gesture: only fingers 0/1 answer to it.
    // Dwell / fast-move / push-in work for all 5 fingers independently.
    const pinch = point.gesture === "PINCH" && point.finger <= 1;
    const wantsPress =
      targetId !== null &&
      cooledDown &&
      (pinch ||
        point.speed > SPEED_THRESHOLD ||
        point.z < Z_THRESHOLD ||
        dwellTime > DWELL_MS);

    let state: InteractionState;
    let pressed = previous.pressed;
    let lastPressAt = previous.lastPressAt;

    if (!targetId) {
      state = previous.pressed ? "RELEASE" : "IDLE";
      pressed = false;
    } else if (wantsPress && (!previous.pressed || changedTarget)) {
      state = "PRESS";
      pressed = true;
      lastPressAt = now;
    } else {
      state = "HOVER";
      if (changedTarget) pressed = false;
    }

    this.points.set(point.id, { targetId, state, pressed, lastPressAt, dwellStart });
    return { ...point, state };
  }

  resetMissing(liveIds: Set<string>) {
    for (const id of this.points.keys()) {
      if (!liveIds.has(id)) this.points.delete(id);
    }
  }
}
