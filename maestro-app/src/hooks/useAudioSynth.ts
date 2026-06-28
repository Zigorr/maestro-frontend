/**
 * useAudioSynth.ts
 *
 * React hook that listens to the Zustand music token store and drives
 * the WebAudioSynth in real-time.
 */

import { useEffect, useRef, useCallback } from "react";
import { useMusicStore } from "../store/musicStore";
import { useStore as useInferenceStore } from "../store/inferenceStore";
import { decodeREMI } from "../services/remiDecoder";
import { globalSynth } from "../services/webAudioSynth";

const BAR_TOKEN = 4; // REMI Bar_None
const DEFAULT_BPM = 120;
const LOOKAHEAD_SEC = 0.15;

export function useAudioSynth() {
  const tokens = useMusicStore((s) => s.tokens);
  const playbackStatus = useMusicStore((s) => s.playbackStatus);
  const latestPrediction = useInferenceStore((s) => s.latestPrediction);

  const bpmRef = useRef(DEFAULT_BPM);
  const lastProcessedTokenRef = useRef<any>(null);
  const tokenBufferRef = useRef<number[]>([]);
  const nextScheduleTimeRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (latestPrediction?.musicParams?.tempoBpm) {
      bpmRef.current = latestPrediction.musicParams.tempoBpm;
    }
  }, [latestPrediction]);

  // Instantly suspend or resume the audio engine when the play button is toggled
  useEffect(() => {
    if (playbackStatus === "playing") {
      globalSynth?.resume();
    } else {
      globalSynth?.pause();
    }
  }, [playbackStatus]);

  // Backpressure & Pause handler for the server
  useEffect(() => {
    const intervalId = setInterval(() => {
      const currentPlaybackStatus = useMusicStore.getState().playbackStatus;

      // If the user paused the player, tell the backend our queue is full (qsize = 2)
      // This stops the server from sending more tokens until we hit play again.
      if (currentPlaybackStatus !== "playing") {
        useMusicStore.getState().setQueueSize(2);
        return;
      }

      const synth = globalSynth;
      if (!synth) return;

      const ctx = (synth as any).ctx;
      if (!ctx || ctx.state !== "running") return;

      if (nextScheduleTimeRef.current !== undefined) {
        const lookahead = Math.max(
          0,
          nextScheduleTimeRef.current - ctx.currentTime,
        );
        const qsize = lookahead > 3.0 ? 2 : 0;
        useMusicStore.getState().setQueueSize(qsize);
      } else {
        useMusicStore.getState().setQueueSize(0);
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, []);

  // Removed the async/await race condition here
  const processNewTokens = useCallback(() => {
    if (playbackStatus !== "playing") return;

    const synth = globalSynth;
    if (!synth) return;

    // We no longer call `synth.resume()` here.
    // We let the useEffect above manage the engine's awake/sleep state.
    const ctx = (synth as any).ctx;
    if (!ctx) return;

    const allTokens = tokens;
    if (allTokens.length === 0) return;

    let startIndex = 0;
    if (lastProcessedTokenRef.current) {
      const idx = allTokens.indexOf(lastProcessedTokenRef.current);
      if (idx !== -1) {
        startIndex = idx + 1;
      }
    }

    if (startIndex >= allTokens.length) return;

    const newTokensObj = allTokens.slice(startIndex);
    lastProcessedTokenRef.current = newTokensObj[newTokensObj.length - 1];

    const newTokens = newTokensObj.map((t) => t.token);

    for (const tokenId of newTokens) {
      tokenBufferRef.current.push(tokenId);

      if (tokenId === BAR_TOKEN) {
        const buf = tokenBufferRef.current.slice();
        tokenBufferRef.current = [BAR_TOKEN];

        if (buf.length <= 1) continue;

        const bpm = bpmRef.current;
        const notes = decodeREMI(buf, bpm);
        if (notes.length === 0) continue;

        const now = ctx.currentTime;
        if (
          nextScheduleTimeRef.current === undefined ||
          nextScheduleTimeRef.current < now
        ) {
          nextScheduleTimeRef.current = now + LOOKAHEAD_SEC;
        }

        synth.scheduleNotes(notes, nextScheduleTimeRef.current);

        const secondsPerBeat = 60 / bpm;
        const barDurationSec = secondsPerBeat * 4;

        nextScheduleTimeRef.current =
          (nextScheduleTimeRef.current ?? 0) + barDurationSec;
      }
    }
  }, [tokens, playbackStatus]);

  useEffect(() => {
    processNewTokens();
  }, [processNewTokens]);

  useEffect(() => {
    if (tokens.length === 0) {
      lastProcessedTokenRef.current = null;
      tokenBufferRef.current = [];
      nextScheduleTimeRef.current = undefined;
    }
  }, [tokens.length]);

  return {
    unlockAudio: () => globalSynth?.resume(),
    setVolume: (v: number) => {
      if (globalSynth) globalSynth.volume = v;
    },
  };
}
