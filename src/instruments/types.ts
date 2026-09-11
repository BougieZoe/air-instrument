import type { InteractionPoint } from "../hand/types";

/** All available instrument modes. Add new modes here to extend. */
export type InstrumentMode = "sampler" | "piano";

/**
 * Shared contract between AirInstrument and every instrument surface.
 * Any new instrument must implement this interface.
 */
export type InstrumentHandle = {
  /** Return the id of the target element at screen coordinates (x, y), or null. */
  hitTest: (x: number, y: number) => string | null;
  /** Process an interaction point against a known target. Returns true if a sound was triggered. */
  handleInteraction: (point: InteractionPoint, targetId: string | null) => boolean;
  /** Reset all hover/press visual states (called on mode switch). */
  reset: () => void;
};
