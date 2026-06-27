/**
 * remiDecoder.ts
 *
 * Decodes REMI token IDs (as produced by the MAESTRO backend) into
 * a list of NoteEvent objects that can be fed directly to the Web Audio synth.
 *
 * REMI vocabulary layout (from data/tokenizer.json):
 *   0        PAD_None
 *   1        BOS_None
 *   2        EOS_None
 *   3        MASK_None
 *   4        Bar_None      ← bar boundary
 *   5..93    Pitch_21..Pitch_109   (pitch = id - 16 + 21 = id + 5 - 16 => pitch = id - 16 + 21 easier: pitch = id + 16 - 1?)
 *            Actually: Pitch_21 = 5 → pitch = id + 16 = 5+16=21 ✓
 *   94..109  Velocity_7..Velocity_127  (16 levels, step 8: vel = (id - 94) * 8 + 7)
 *   110..173 Duration tokens
 *   174..205 Position_0..Position_31  (pos = id - 174)
 *   206..267 PitchDrum tokens (ignored for now)
 *   268..281 Chord tokens    (ignored)
 *   282+     Program tokens  (ignored for basic synth)
 */

export interface NoteEvent {
  /** MIDI pitch 21-109 */
  pitch: number;
  /** MIDI velocity 0-127 */
  velocity: number;
  /** Duration in seconds */
  durationSec: number;
  /** Offset in seconds from bar start */
  offsetSec: number;
}

// ─── REMI constants ────────────────────────────────────────────────────────
const BAR_TOKEN = 4;

// Pitch: token 5 → MIDI 21, token 93 → MIDI 109
const PITCH_START = 5;
const PITCH_OFFSET = 16; // pitch = token + 16

// Velocity: 16 levels, token 94..109, value 7,15,23,...,127
const VEL_START = 94;
const VEL_STEP = 8;
const VEL_BASE = 7;

// Position: token 174..205 → position 0..31 (in 32nd-note sub-steps within a bar)
const POS_START = 174;
const POS_END = 205;
// With beat_res {"0_4": 8, "4_12": 4} the total steps per bar = 4 beats × 8 = 32
const STEPS_PER_BAR = 32;

// Duration tokens 110..173 — parsed from the Duration_X.Y.Z format
// X = beats, Y = sub-beat numerator, Z = sub-beat denominator
// Duration in beats = X + Y/Z
const DUR_START = 110;
// Pre-computed duration table in beats (matches tokenizer.json order)
const DURATION_TABLE_BEATS: number[] = buildDurationTable();

function buildDurationTable(): number[] {
  // From tokenizer.json Duration tokens (in order, beats + fraction):
  // "0_4": 8  → 0.1/8, 0.2/8, 0.3/8, 0.4/8, 0.5/8, 0.6/8, 0.7/8
  // "0_4": 8  → 1.0/8, 1.1/8 ... 1.7/8
  // etc.
  // Format: Duration_beats.sub.denom
  const raw: [number, number, number][] = [
    [0,1,8],[0,2,8],[0,3,8],[0,4,8],[0,5,8],[0,6,8],[0,7,8],
    [1,0,8],[1,1,8],[1,2,8],[1,3,8],[1,4,8],[1,5,8],[1,6,8],[1,7,8],
    [2,0,8],[2,1,8],[2,2,8],[2,3,8],[2,4,8],[2,5,8],[2,6,8],[2,7,8],
    [3,0,8],[3,1,8],[3,2,8],[3,3,8],[3,4,8],[3,5,8],[3,6,8],[3,7,8],
    [4,0,4],[4,1,4],[4,2,4],[4,3,4],
    [5,0,4],[5,1,4],[5,2,4],[5,3,4],
    [6,0,4],[6,1,4],[6,2,4],[6,3,4],
    [7,0,4],[7,1,4],[7,2,4],[7,3,4],
    [8,0,4],[8,1,4],[8,2,4],[8,3,4],
    [9,0,4],[9,1,4],[9,2,4],[9,3,4],
    [10,0,4],[10,1,4],[10,2,4],[10,3,4],
    [11,0,4],[11,1,4],[11,2,4],[11,3,4],
    [12,0,4],
  ];
  return raw.map(([b, s, d]) => b + s / d);
}

function tokenToPitch(id: number): number | null {
  if (id >= PITCH_START && id <= 93) return id + PITCH_OFFSET;
  return null;
}

function tokenToVelocity(id: number): number | null {
  if (id >= VEL_START && id <= 109) return VEL_BASE + (id - VEL_START) * VEL_STEP;
  return null;
}

function tokenToPosition(id: number): number | null {
  if (id >= POS_START && id <= POS_END) return id - POS_START;
  return null;
}

function tokenToDurationBeats(id: number): number | null {
  const idx = id - DUR_START;
  if (idx >= 0 && idx < DURATION_TABLE_BEATS.length) return DURATION_TABLE_BEATS[idx];
  return null;
}

/**
 * Decode a buffer of REMI token IDs into NoteEvent[].
 *
 * @param tokens  Array of token IDs (may span multiple bars).
 * @param bpm     Tempo in BPM (from musicParams.tempoBpm). Defaults to 120.
 */
export function decodeREMI(tokens: number[], bpm = 120): NoteEvent[] {
  const secondsPerBeat = 60 / bpm;
  const secondsPerStep = secondsPerBeat / (STEPS_PER_BAR / 4); // 32 steps / 4 beats = 8 steps/beat
  const notes: NoteEvent[] = [];

  let barStartSec = 0;
  let currentPosition = 0; // step within bar
  let currentVelocity = 80;
  let pendingPitch: number | null = null;
  let pendingDuration: number | null = null;

  // REMI event order within a bar: Bar → [Position → [Velocity] → Pitch → Duration]*
  for (let i = 0; i < tokens.length; i++) {
    const id = tokens[i];

    if (id === BAR_TOKEN) {
      barStartSec += STEPS_PER_BAR * secondsPerStep;
      currentPosition = 0;
      continue;
    }

    const pos = tokenToPosition(id);
    if (pos !== null) {
      currentPosition = pos;
      continue;
    }

    const vel = tokenToVelocity(id);
    if (vel !== null) {
      currentVelocity = vel;
      continue;
    }

    const pitch = tokenToPitch(id);
    if (pitch !== null) {
      pendingPitch = pitch;
      continue;
    }

    const durBeats = tokenToDurationBeats(id);
    if (durBeats !== null) {
      pendingDuration = durBeats;

      // We have enough info to emit a note
      if (pendingPitch !== null) {
        notes.push({
          pitch: pendingPitch,
          velocity: currentVelocity,
          durationSec: pendingDuration * secondsPerBeat,
          offsetSec: barStartSec + currentPosition * secondsPerStep,
        });
        pendingPitch = null;
        pendingDuration = null;
      }
    }
  }

  return notes;
}
