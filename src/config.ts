/**
 * Central configuration constants for Air Instrument.
 * All magic numbers live here. Tune from one place.
 */

// ─── Audio mixer gains (linear 0-1) ────────────────────────────────────────
export const GAIN_SAMPLE_BUS       = 0.88;
export const GAIN_PIANO_BUS        = 0.74;
export const GAIN_ACCOMPANIMENT_BUS = 0.66;
export const GAIN_MASTER           = 0.84;
export const GAIN_ACCOMPANIMENT_DEFAULT = 0.62;

// ─── Compressor ─────────────────────────────────────────────────────────────
export const COMPRESSOR_THRESHOLD = -16; // dB
export const COMPRESSOR_KNEE      = 18;  // dB
export const COMPRESSOR_RATIO     = 4;
export const COMPRESSOR_ATTACK    = 0.004; // seconds
export const COMPRESSOR_RELEASE   = 0.18;  // seconds

// ─── Audio analyser ──────────────────────────────────────────────────────────
export const ANALYSER_FFT_SIZE    = 512;
export const ANALYSER_SMOOTHING   = 0.82;

// ─── Velocity (0-1 linear gain applied to triggered sounds) ─────────────────
export const VELOCITY_HAND_MIN    = 0.52; // min velocity for air-triggered sampler
export const VELOCITY_HAND_RANGE  = 0.46; // multiplied by speed: total max = 0.98
export const VELOCITY_MOUSE       = 0.86; // fixed velocity for mouse clicks
export const PIANO_VELOCITY_HAND_MIN   = 0.48;
export const PIANO_VELOCITY_HAND_RANGE = 0.44;
export const PIANO_VELOCITY_MOUSE      = 0.72;

// ─── Gesture recognition (MediaPipe normalized landmark space, 0-1) ─────────
export const PINCH_MIN_DIST    = 0.035; // below this = fully pinched
export const PINCH_RANGE       = 0.085; // distance range over which pinch 0→1
export const PINCH_THRESHOLD   = 0.64;  // pinch strength to register as PINCH gesture
export const INDEX_RAISE_DELTA = 0.03;  // how far tip.y must be above palm.y
export const OPEN_HAND_INDEX_DIST = 0.22; // min wrist→indexTip for open hand
export const OPEN_HAND_THUMB_DIST = 0.16; // min wrist→thumbTip for open hand

// ─── Interaction controller ──────────────────────────────────────────────────
export const DWELL_MS          = 420;  // ms hovering before auto-press
export const COOLDOWN_MS       = 600;  // ms between presses on same target
export const SPEED_THRESHOLD   = 0.22; // normalized speed to trigger press
export const Z_THRESHOLD       = -0.04; // depth push toward camera

// ─── Coordinate mapper (normalized 0-1 camera crop region) ──────────────────
export const CAMERA_BOUNDS = {
  left:   0.13,
  right:  0.87,
  top:    0.16,
  bottom: 0.84,
};

// ─── Hand smoothing ───────────────────────────────────────────────────────────
export const SMOOTHING_ALPHA     = 0.42; // exponential smoothing factor (0=frozen, 1=raw)
export const SPEED_NORM_FACTOR   = 2.4;  // m/s equivalent for normalizing to 0-1
export const MIN_FRAME_DT_MS     = 12;   // clamp dt to avoid division-by-zero

// ─── Piano hit-test insets (fraction of key width) ───────────────────────────
export const WHITE_KEY_INSET_RATIO = 0.08; // shrink white key hit area by this fraction
export const BLACK_KEY_INSET_RATIO = 0.03; // shrink black key hit area by this fraction

// ─── Audio reactive visuals ──────────────────────────────────────────────────
export const REACTIVE_OPACITY_BASE  = 0.16;
export const REACTIVE_OPACITY_RANGE = 0.38;
export const REACTIVE_SCALE_BASE    = 0.12;
export const REACTIVE_SCALE_RANGE   = 0.88;

// ─── Interaction feedback cursor ─────────────────────────────────────────────
export const MIN_CURSOR_OPACITY = 0.18;

// ─── Sample player debounce ───────────────────────────────────────────────────
export const SAMPLE_DEBOUNCE_S = 0.075; // seconds between re-triggers of same sample
