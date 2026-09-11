type TrackingIndicatorProps = {
  tracking: boolean;
  cameraReady: boolean;
};

export function TrackingIndicator({ tracking, cameraReady }: TrackingIndicatorProps) {
  const label = tracking ? "TRACKING" : cameraReady ? "FINDING HAND" : "CAMERA";
  return (
    <div className="tracking-indicator" data-active={tracking}>
      <span aria-hidden="true">{tracking ? "●" : "○"}</span>
      {label}
    </div>
  );
}
