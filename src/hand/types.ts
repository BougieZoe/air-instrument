export type Point3 = {
  x: number;
  y: number;
  z: number;
};

export type GestureName =
  | "INDEX_POINT"
  | "PINCH"
  | "OPEN_HAND"
  | "FIST"
  | "PEACE"
  | "THUMBS_UP"
  | "UNKNOWN";

/** MediaPipe landmark indices for the 5 fingertips: thumb, index, middle, ring, pinky. */
export const FINGER_TIP_INDICES = [4, 8, 12, 16, 20] as const;
/** MCP joints (base of each finger) for hand-size measurement. */
export const FINGER_MCP_INDICES = [2, 5, 9, 13, 17] as const;
export const FINGER_COUNT = FINGER_TIP_INDICES.length;

export type HandInput = {
  id: string;
  handedness: "Left" | "Right" | "Unknown";
  confidence: number;
  indexTip: Point3;
  thumbTip: Point3;
  wrist: Point3;
  palm: Point3;
  /** All 5 smoothed fingertips in FINGER_TIP_INDICES order. */
  fingertips: Point3[];
  /** Per-finger normalized speed (0-1), same order. Drives per-point velocity. */
  fingerSpeeds: number[];
  gesture: GestureName;
  pinchStrength: number;
  /** Index-finger speed, kept for gesture-level triggers and debug display. */
  speed: number;
  timestamp: number;
  /** Hand size ratio (wrist→middleMCP distance). Used for adaptive thresholds. */
  handSize: number;
};

export type InteractionState = "IDLE" | "HOVER" | "PRESS" | "RELEASE";

export type InteractionPoint = {
  id: string;
  /** Which finger of the hand (0=thumb … 4=pinky, FINGER_TIP_INDICES order). */
  finger: number;
  x: number;
  y: number;
  z: number;
  state: InteractionState;
  gesture: GestureName;
  confidence: number;
  speed: number;
  timestamp: number;
};

export type InteractionTarget = {
  id: string;
  label: string;
  rect: DOMRect;
};
