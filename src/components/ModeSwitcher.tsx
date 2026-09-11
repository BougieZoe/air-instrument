import { getInstruments } from "../instruments/registry";
import type { InstrumentMode } from "../instruments/types";

type ModeSwitcherProps = { mode: InstrumentMode; onModeChange: (mode: InstrumentMode) => void; };

export function ModeSwitcher({ mode, onModeChange }: ModeSwitcherProps) {
  return (
    <div className="mode-switcher" role="tablist" aria-label="Instrument mode">
      {getInstruments().map((plugin) => (
        <button key={plugin.mode} type="button" className={mode === plugin.mode ? "active" : ""} onClick={() => onModeChange(plugin.mode)} role="tab" aria-selected={mode === plugin.mode}>{plugin.label}</button>
      ))}
    </div>
  );
}
