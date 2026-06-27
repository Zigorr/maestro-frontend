/**
 * webAudioSynth.ts
 *
 * A polyphonic piano synthesizer running entirely in the browser via Web Audio API.
 * Accepts NoteEvent objects decoded from REMI tokens.
 *
 * Sound design:
 *  - Sawtooth + triangle oscillators detuned for richness
 *  - Per-note ADSR envelope
 *  - Biquad LP filter (cutoff driven by velocity → brightness)
 *  - Convolution reverb via AudioContext.createConvolver() with synthetic IR
 *  - Master compressor to avoid clipping
 *
 * Only runs on web (AudioContext is a browser API). On native it no-ops.
 */

import { NoteEvent } from './remiDecoder';

// ─── Platform guard ────────────────────────────────────────────────────────
const IS_WEB = typeof window !== 'undefined' && typeof (window as any).AudioContext !== 'undefined';

// ─── MIDI pitch → frequency ────────────────────────────────────────────────
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// ─── Synthetic reverb impulse response ────────────────────────────────────
function buildReverbIR(ctx: AudioContext, durationSec = 1.8, decay = 3.5): AudioBuffer {
  const rate = ctx.sampleRate;
  const len = Math.ceil(rate * durationSec);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

// ─── Main synth class ──────────────────────────────────────────────────────
export class WebAudioSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private reverb: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private activeNotes = new Map<string, OscillatorNode[]>();
  private _volume = 0.7;

  constructor() {
    if (!IS_WEB) return;
    this._init();
  }

  private _init() {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioCtx() as AudioContext;

    // Master chain: dryGain + reverbGain → compressor → masterGain → dest
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this._volume;
    this.masterGain.connect(this.ctx.destination);

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 10;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
    this.compressor.connect(this.masterGain);

    this.dryGain = this.ctx.createGain();
    this.dryGain.gain.value = 0.72;
    this.dryGain.connect(this.compressor);

    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = buildReverbIR(this.ctx);
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 0.28;
    this.reverb.connect(this.reverbGain);
    this.reverbGain.connect(this.compressor);
  }

  /** Resume context (required after user gesture on Chrome). Returns a Promise. */
  resume(): Promise<void> {
    return this.ctx?.resume() ?? Promise.resolve();
  }

  get volume() { return this._volume; }
  set volume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this.masterGain) this.masterGain.gain.value = this._volume;
  }

  /**
   * Schedule a batch of NoteEvents.
   * @param notes   Decoded notes from remiDecoder.decodeREMI()
   * @param baseTime  AudioContext time to treat as t=0. Defaults to currentTime.
   */
  scheduleNotes(notes: NoteEvent[], baseTime?: number) {
    if (!IS_WEB || !this.ctx || !this.dryGain || !this.reverb) return;
    const ctx = this.ctx;
    const t0 = baseTime ?? ctx.currentTime + 0.05; // small look-ahead

    for (const note of notes) {
      const startTime = t0 + note.offsetSec;
      const endTime = startTime + note.durationSec;
      const freq = midiToFreq(note.pitch);
      const gain = note.velocity / 127;

      this._scheduleNote(ctx, freq, gain, startTime, endTime);
    }
  }

  private _scheduleNote(
    ctx: AudioContext,
    freq: number,
    gain: number,
    startTime: number,
    endTime: number,
  ) {
    if (!this.dryGain || !this.reverb) return;

    const noteGain = ctx.createGain();
    noteGain.connect(this.dryGain);
    noteGain.connect(this.reverb);

    // ADSR
    const attack = 0.008;
    const decay = 0.12;
    const sustain = gain * 0.6;
    const release = 0.35;

    noteGain.gain.setValueAtTime(0, startTime);
    noteGain.gain.linearRampToValueAtTime(gain, startTime + attack);
    noteGain.gain.linearRampToValueAtTime(sustain, startTime + attack + decay);
    noteGain.gain.setValueAtTime(sustain, endTime);
    noteGain.gain.linearRampToValueAtTime(0, endTime + release);

    // Biquad filter — brightness from velocity
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800 + gain * 6000;
    filter.Q.value = 0.8;
    filter.connect(noteGain);

    // Two slightly detuned oscillators for richness
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = freq;
    osc1.detune.value = -5;
    osc1.connect(filter);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = freq;
    osc2.detune.value = +5;

    // Softer high-gain on triangle
    const triGain = ctx.createGain();
    triGain.gain.value = 0.4;
    osc2.connect(triGain);
    triGain.connect(filter);

    osc1.start(startTime);
    osc2.start(startTime);

    const stopTime = endTime + release + 0.05;
    osc1.stop(stopTime);
    osc2.stop(stopTime);

    // Cleanup
    osc1.onended = () => {
      try { osc1.disconnect(); osc2.disconnect(); triGain.disconnect(); filter.disconnect(); noteGain.disconnect(); } catch {}
    };
  }

  /** Play a single note immediately (for testing / preview) */
  playNoteNow(pitch: number, velocity = 80, durationSec = 0.5) {
    if (!IS_WEB || !this.ctx) return;
    this.resume();
    this._scheduleNote(this.ctx, midiToFreq(pitch), velocity / 127, this.ctx.currentTime + 0.01, this.ctx.currentTime + 0.01 + durationSec);
  }

  destroy() {
    this.ctx?.close();
    this.ctx = null;
  }
}

// Singleton — one synth for the whole app
export const globalSynth = IS_WEB ? new WebAudioSynth() : null;
