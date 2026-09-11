import { forwardRef } from "react";

type CameraViewProps = {
  hasCamera: boolean;
};

export const CameraView = forwardRef<HTMLVideoElement, CameraViewProps>(({ hasCamera }, ref) => (
  <div className="camera-layer" aria-hidden="true">
    <video ref={ref} className="camera-video" autoPlay muted playsInline />
    {!hasCamera && <div className="camera-fallback" />}
    <div className="camera-treatment" />
  </div>
));

CameraView.displayName = "CameraView";
