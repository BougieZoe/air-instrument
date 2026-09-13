import type { ForwardRefExoticComponent, MutableRefObject, RefAttributes } from "react";
import type { AudioEngine } from "../audio/AudioEngine";
import type { InteractionPoint } from "../hand/types";

/**
 * Instrument id. A plain string — the instrument registry (registry.ts) is the
 * source of truth, not this type. Registering a new instrument needs no type edits.
 */
export type InstrumentMode = string;

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

/** Props every instrument component receives. Keep in sync — one shape for all. */
export type InstrumentProps = {
  audioRef: MutableRefObject<AudioEngine | null>;
  onFirstInteraction: () => void;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export type InstrumentComponent = ForwardRefExoticComponent<any & RefAttributes<InstrumentHandle>>;

/**
 * Plugin descriptor. Adding an instrument = implementing InstrumentHandle +
 * calling registerInstrument() — no edits to AirInstrument or ModeSwitcher.
 */
export type InstrumentPlugin = {
  /** Unique id, e.g. "sampler". Used as InstrumentMode and data-mode. */
  mode: string;
  /** Uppercase label shown in the mode switcher, e.g. "SAMPLER". */
  label: string;
  component: InstrumentComponent;
};
