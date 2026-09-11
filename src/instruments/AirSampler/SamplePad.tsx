import { forwardRef } from "react";

type SamplePadProps = {
  id: string;
  label: string;
  onPointerDownCapture: () => void;
};

export const SamplePad = forwardRef<HTMLButtonElement, SamplePadProps>(({ id, label, onPointerDownCapture }, ref) => (
  <button ref={ref} className="air-pad" data-pad-id={id} type="button" aria-label={label} onPointerDownCapture={onPointerDownCapture}>
    <span>{label}</span>
    <i />
  </button>
));

SamplePad.displayName = "SamplePad";
