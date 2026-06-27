/**
 * Signal simulator — generates synthetic BVP, GSR, SKT data.
 * Mirrors backend simulate_inference.py generate_dummy_signals().
 * Produces RECOMMENDED_SIGNAL_SAMPLES (16000) once, then streams
 * in 1000-sample chunks.
 */

export const FS = 1000; // 1000 Hz
export const RECOMMENDED_SIGNAL_SAMPLES = 16_000;
export const CHUNK_SIZE = 1_000;

// Seeded pseudo-random (simple LCG, matches "seed=42" spirit)
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function generateDummySignals(
  nSamples: number = RECOMMENDED_SIGNAL_SAMPLES,
  seed: number = 42
): { bvp: number[]; gsr: number[]; skt: number[] } {
  const rand = seededRandom(seed);

  const bvp: number[] = [];
  const gsr: number[] = [];
  const skt: number[] = [];

  for (let i = 0; i < nSamples; i++) {
    const t = i / FS;
    bvp.push(0.5 * Math.sin(2 * Math.PI * 1.2 * t) + 0.05 * (rand() * 2 - 1));
    gsr.push(0.3 + 0.1 * Math.sin(2 * Math.PI * 0.05 * t) + 0.02 * (rand() * 2 - 1));
    skt.push(32.0 + 0.5 * Math.sin(2 * Math.PI * 0.02 * t) + 0.01 * (rand() * 2 - 1));
  }

  return { bvp, gsr, skt };
}
