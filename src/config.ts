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
export const VELOCITY_HAND_MIN    = 0.52;
export const VELOCITY_HAND_RANGE  = 0.46;
export const VELOCITY_MOUSE       = 0.86;
export const PIANO_VELOCITY_HAND_MIN   = 0.48;
export const PIANO_VELOCITY_HAND_RANGE = 0.44;
export const PIANO_VELOCITY_MOUSE      = 0.72;

// ─── Gesture recognition (MediaPipe normalized landmark space, 0-1) ─────────
// All thresholds are BASE values — scaled by handSizeRatio at runtime.
export const PINCH_MIN_DIST    = 0.035;
export const PINCH_RANGE       = 0.085;
export const PINCH_THRESHOLD   = 0.64;
export const INDEX_RAISE_DELTA = 0.03;
export const OPEN_HAND_INDEX_DIST = 0.22;
export const OPEN_HAND_THUMB_DIST = 0.16;

// ─── Adaptive gesture: per-finger extended/folded classification ─────────────
// A finger is "extended" if tip.y < mcp.y - FINGER_EXTEND_MARGIN (scaled by hand size)
export const FINGER_EXTEND_MARGIN = 0.025;
// Fist: all 4 non-thumb fingers folded (tip above mcp by margin)
export const FIST_FOLD_MARGIN = 0.01;
// Peace: index + middle extended, ring + pinky folded
// Thumbs up: thumb extended (tip.y < wrist.y - margin), all others folded

// ─── Interaction controller ──────────────────────────────────────────────────
export const DWELL_MS          = 420;
export const COOLDOWN_MS       = 600;
export const SPEED_THRESHOLD   = 0.22;
export const Z_THRESHOLD       = -0.04;

// ─── Coordinate mapper (normalized 0-1 camera crop region) ──────────────────
export const CAMERA_BOUNDS = {
  left:   0.13,
  right:  0.87,
  top:    0.16,
  bottom: 0.84,
};

// ─── Hand smoothing ───────────────────────────────────────────────────────────
export const SMOOTHING_ALPHA     = 0.42;
export const SPEED_NORM_FACTOR   = 2.4;
export const MIN_FRAME_DT_MS     = 12;
// Adaptive smoothing: alpha scales between MIN and MAX based on speed
export const SMOOTHING_ALPHA_MIN = 0.18;  // slow movement: heavy smoothing
export const SMOOTHING_ALPHA_MAX = 0.85;  // fast movement: low latency
export const SMOOTHING_SPEED_FLOOR = 0.08; // below this speed → use min alpha
export const SMOOTHING_SPEED_CEIL  = 0.55; // above this speed → use max alpha

// ─── Calibration ──────────────────────────────────────────────────────────────
export const CALIBRATION_FRAMES       = 30;  // frames to average for hand size
export const CALIBRATION_REFERENCE_SIZE = 0.22; // reference hand size (wrist→middleMCP distance)
export const CALIBRATION_TIMEOUT_MS   = 5000;  // max time to wait for calibration

// ─── Piano hit-test insets (fraction of key width) ───────────────────────────
export const WHITE_KEY_INSET_RATIO = 0.08;
export const BLACK_KEY_INSET_RATIO = 0.03;

// ─── Audio reactive visuals ──────────────────────────────────────────────────
export const REACTIVE_OPACITY_BASE  = 0.16;
export const REACTIVE_OPACITY_RANGE = 0.38;
export const REACTIVE_SCALE_BASE    = 0.12;
export const REACTIVE_SCALE_RANGE   = 0.88;

// ─── Interaction feedback cursor ─────────────────────────────────────────────
export const MIN_CURSOR_OPACITY = 0.18;

// ─── Sample player debounce ───────────────────────────────────────────────────
export const SAMPLE_DEBOUNCE_S = 0.075;
