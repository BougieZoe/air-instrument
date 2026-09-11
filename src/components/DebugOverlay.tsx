type DebugOverlayProps = {
  visible: boolean;
  fps: number;
  target: string | null;
  gesture: string;
  confidence: number;
  speed: number;
  z: number;
  state: string;
};

export function DebugOverlay({ visible, fps, target, gesture, confidence, speed, z, state }: DebugOverlayProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="debug-overlay">
      <span>FPS {fps.toFixed(0)}</span>
      <span>TARGET {target ?? "NONE"}</span>
      <span>STATE {state}</span>
      <span>GESTURE {gesture}</span>
      <span>SPEED {speed.toFixed(2)}</span>
      <span>Z {z.toFixed(3)}</span>
      <span>CONF {(confidence * 100).toFixed(0)}%</span>
    </div>
  );
}
