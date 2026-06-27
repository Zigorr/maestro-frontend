/**
 * useAudioSynth.ts
 *
 * React hook that listens to the Zustand music token store and drives
 * the WebAudioSynth in real-time.
 *
 * Strategy:
 *  - Accumulate REMI tokens into a rolling buffer
 *  - When a Bar_None token (id=4) arrives, decode the completed bar and
 *    schedule its notes with a small look-ahead
 *  - Tempo is taken from the latest musicParams prediction
 */

import { useEffect, useRef, useCallback } from 'react';
import { useMusicStore } from '../store/musicStore';
import { useStore as useInferenceStore } from '../store/inferenceStore';
import { decodeREMI } from '../services/remiDecoder';
import { globalSynth } from '../services/webAudioSynth';

const BAR_TOKEN = 4; // REMI Bar_None
const DEFAULT_BPM = 120;
// Small audio look-ahead: schedule this many seconds ahead of now
const LOOKAHEAD_SEC = 0.15;

export function useAudioSynth() {
  const tokens = useMusicStore((s) => s.tokens);
  const playbackStatus = useMusicStore((s) => s.playbackStatus);
  const latestPrediction = useInferenceStore((s) => s.latestPrediction);

  const bpmRef = useRef(DEFAULT_BPM);
  const processedCountRef = useRef(0); // how many tokens we have already processed
  const tokenBufferRef = useRef<number[]>([]); // tokens for the current bar-in-progress
  const nextScheduleTimeRef = useRef<number | undefined>(undefined); // AudioContext time when next bar starts

  // Keep bpm ref in sync
  useEffect(() => {
    if (latestPrediction?.musicParams?.tempoBpm) {
      bpmRef.current = latestPrediction.musicParams.tempoBpm;
    }
  }, [latestPrediction]);

  const processNewTokens = useCallback(async () => {
    if (playbackStatus !== 'playing') return;

    const synth = globalSynth;
    if (!synth) return; // no-op on native

    // Resume AudioContext — MUST await so context is running before scheduling
    await synth.resume();

    const ctx = (synth as any).ctx;
    if (!ctx) return;

    // Double-check context is actually running after resume
    if (ctx.state !== 'running') return;

    const allTokens = tokens;
    const newCount = allTokens.length;
    if (newCount <= processedCountRef.current) return;

    const newTokens = allTokens
      .slice(processedCountRef.current)
      .map((t) => t.token);
    processedCountRef.current = newCount;

    // Decrement the queue size in the store
    const numProcessed = newTokens.length;
    useMusicStore.getState().setQueueSize(
      Math.max(0, useMusicStore.getState().tokenQueueSize - numProcessed)
    );

    for (const tokenId of newTokens) {
      tokenBufferRef.current.push(tokenId);

      // On Bar boundary — decode the accumulated buffer and schedule it
      if (tokenId === BAR_TOKEN) {
        const buf = tokenBufferRef.current.slice();
        tokenBufferRef.current = [BAR_TOKEN]; // keep bar token as start of next

        if (buf.length <= 1) continue; // empty bar

        const bpm = bpmRef.current;
        const notes = decodeREMI(buf, bpm);
        if (notes.length === 0) continue;

        // Determine the schedule base time
        const now = ctx.currentTime;
        if (nextScheduleTimeRef.current === undefined || nextScheduleTimeRef.current < now) {
          nextScheduleTimeRef.current = now + LOOKAHEAD_SEC;
        }

        synth.scheduleNotes(notes, nextScheduleTimeRef.current);

        // Advance the clock by one bar's worth of seconds
        const secondsPerBeat = 60 / bpm;
        const barDurationSec = secondsPerBeat * 4; // 4/4 time
        nextScheduleTimeRef.current = (nextScheduleTimeRef.current ?? 0) + barDurationSec;
      }
    }
  }, [tokens, playbackStatus]);

  useEffect(() => {
    processNewTokens();
  }, [processNewTokens]);

  // Reset when tokens store is cleared (navigation away)
  useEffect(() => {
    if (tokens.length === 0) {
      processedCountRef.current = 0;
      tokenBufferRef.current = [];
      nextScheduleTimeRef.current = undefined;
    }
  }, [tokens.length]);

  return {
    /** Call this on a user gesture (button press) to unlock AudioContext */
    unlockAudio: () => globalSynth?.resume(),
    setVolume: (v: number) => {
      if (globalSynth) globalSynth.volume = v;
    },
  };
}
