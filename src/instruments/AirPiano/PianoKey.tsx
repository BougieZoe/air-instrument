import { forwardRef } from "react";
import type { PianoKeyDefinition } from "./pianoLayout";

type PianoKeyProps = {
  item: PianoKeyDefinition;
};

export const PianoKey = forwardRef<HTMLButtonElement, PianoKeyProps>(({ item }, ref) => (
  <button
    ref={ref}
    className={`piano-key piano-key--${item.type}`}
    style={{ left: `${item.left}%`, width: `${item.width}%` }}
    data-note={item.note}
    type="button"
    aria-label={item.note}
  >
    <span>{item.label}</span>
    <i />
  </button>
));

PianoKey.displayName = "PianoKey";
