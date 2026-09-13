/**
 * Instrument plugin registry — the "everything is a plugin" layer.
 *
 * Built-ins self-register below. Future instruments (Air Drums, Air Guitar,
 * …) register with one call and automatically appear in the ModeSwitcher
 * and the stage — no edits to AirInstrument or ModeSwitcher needed.
 *
 * Mirrors the harness philosophy: a runtime registry keyed by string id,
 * with register / get / list as the only API.
 */
import { AirPiano } from "./AirPiano/AirPiano";
import { AirSampler } from "./AirSampler/AirSampler";
import { AirDJ } from "./AirDJ/AirDJ";
import type { InstrumentPlugin } from "./types";

const registry = new Map<string, InstrumentPlugin>();

export function registerInstrument(plugin: InstrumentPlugin) {
  registry.set(plugin.mode, plugin);
}

export function getInstrument(mode: string): InstrumentPlugin | undefined {
  return registry.get(mode);
}

export function getInstruments(): InstrumentPlugin[] {
  return [...registry.values()];
}

// ─── Built-ins ──────────────────────────────────────────────────────────────
registerInstrument({ mode: "sampler", label: "SAMPLER", component: AirSampler });
registerInstrument({ mode: "piano", label: "PIANO", component: AirPiano });
registerInstrument({ mode: "dj", label: "DJ", component: AirDJ });
