import type { InteractionPoint, InteractionState } from "./types";

type ActivePoint = {
  targetId: string | null;
  state: InteractionState;
  pressed: boolean;
  lastPressAt: number;
  // dwell: how long the finger has been hovering over the same target
  dwellStart: number;
};

// How long (ms) to hover before auto-triggering a press
const DWELL_MS = 420;
// Cooldown between consecutive presses on the same pad
const COOLDOWN_MS = 600;
// Speed threshold (0-1) to trigger a press via fast movement
const SPEED_THRESHOLD = 0.22;
// Z depth threshold – finger pushed toward camera
const Z_THRESHOLD = -0.04;

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

    const fastMove = point.speed > SPEED_THRESHOLD;
    const pushIn = point.z < Z_THRESHOLD;
    const pinch = point.gesture === "PINCH";
    const dwell = dwellTime > DWELL_MS;

    const wantsPress =
      targetId !== null &&
      cooledDown &&
      (pinch || fastMove || pushIn || dwell);

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
    } else if (targetId) {
      // Already in cooldown or just hovering
      state = "HOVER";
      if (changedTarget) pressed = false;
    } else {
      state = "IDLE";
      pressed = false;
    }

    this.points.set(point.id, { targetId, state, pressed, lastPressAt, dwellStart });
    return { ...point, state };
  }

  resetMissing(liveIds: Set<string>) {
    for (const id of this.points.keys()) {
      if (!liveIds.has(id)) {
        this.points.delete(id);
      }
    }
  }
}
