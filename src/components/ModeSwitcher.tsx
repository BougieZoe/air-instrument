import type { InstrumentMode } from "../app/AirInstrument";

type ModeSwitcherProps = {
  mode: InstrumentMode;
  onModeChange: (mode: InstrumentMode) => void;
};

export function ModeSwitcher({ mode, onModeChange }: ModeSwitcherProps) {
  return (
    <div className="mode-switcher" role="tablist" aria-label="Instrument mode">
      <button
        type="button"
        className={mode === "sampler" ? "active" : ""}
        onClick={() => onModeChange("sampler")}
        role="tab"
        aria-selected={mode === "sampler"}
      >
        SAMPLER
      </button>
      <button
        type="button"
        className={mode === "piano" ? "active" : ""}
        onClick={() => onModeChange("piano")}
        role="tab"
        aria-selected={mode === "piano"}
      >
        PIANO
      </button>
    </div>
  );
}
