export type Point3 = {
  x: number;
  y: number;
  z: number;
};

export type GestureName = "INDEX_POINT" | "PINCH" | "OPEN_HAND" | "UNKNOWN";

export type HandInput = {
  id: string;
  handedness: "Left" | "Right" | "Unknown";
  confidence: number;
  indexTip: Point3;
  thumbTip: Point3;
  wrist: Point3;
  palm: Point3;
  gesture: GestureName;
  pinchStrength: number;
  speed: number;
  timestamp: number;
};

export type InteractionState = "IDLE" | "HOVER" | "PRESS" | "RELEASE";

export type InteractionPoint = {
  id: string;
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
