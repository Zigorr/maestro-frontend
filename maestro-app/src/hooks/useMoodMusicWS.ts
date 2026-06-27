import { useEffect, useRef, useCallback } from 'react';
import { useConnectionStore } from '../store/connectionStore';
import { useStore as useInferenceStore } from '../store/inferenceStore';
import { useSignalStore } from '../store/signalStore';
import { useMusicStore } from '../store/musicStore';
import { MoodName } from '../theme/moodThemes';

const RECOMMENDED_SIGNAL_SAMPLES = 16_000;
const CHUNK_SIZE = 1_000;
const CHUNK_INTERVAL_MS = 1_000; // 1 second
const QUEUE_REPORT_INTERVAL_MS = 100; // every 100ms

type Signals = { bvp: number[]; gsr: number[]; skt: number[] };

type UseMoodMusicWSProps = {
  signals: Signals | null; // null = not ready yet
  onCalibrated?: () => void;
  onError?: (msg: string) => void;
};

/**
 * Manages the /ws/mood_music WebSocket connection.
 * Mirrors stream_mood_to_music.py exactly:
 *  1. Sends first 16k samples as calibration baseline
 *  2. Streams 1k-sample chunks every 1000ms
 *  3. Reports token queue size every 100ms for back-pressure
 *  4. Loops through data continuously
 */
export function useMoodMusicWS({ signals, onCalibrated, onError }: UseMoodMusicWSProps) {
  const serverUrl = useConnectionStore((s) => s.serverUrl);
  const setStatus = useConnectionStore((s) => s.setStatus);
  const setCalibrationStatus = useInferenceStore((s) => s.setCalibrationStatus);
  const setPrediction = useInferenceStore((s) => s.setPrediction);
  const setCurrentMood = useInferenceStore((s) => s.setCurrentMood);
  const pushSamples = useSignalStore((s) => s.pushSamples);
  const setStreaming = useSignalStore((s) => s.setStreaming);
  const pushToken = useMusicStore((s) => s.pushToken);
  const setCurrentMoodMusic = useMusicStore((s) => s.setCurrentMood);
  const tokenQueueSize = useMusicStore((s) => s.tokenQueueSize);

  const wsRef = useRef<WebSocket | null>(null);
  const chunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queueTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunkIndexRef = useRef(0);
  const calibratedRef = useRef(false);
  const tokenQueueRef = useRef(0);

  // Keep tokenQueueRef in sync with store
  useEffect(() => {
    tokenQueueRef.current = tokenQueueSize;
  }, [tokenQueueSize]);

  const stopTimers = useCallback(() => {
    if (chunkTimerRef.current) clearInterval(chunkTimerRef.current);
    if (queueTimerRef.current) clearInterval(queueTimerRef.current);
    chunkTimerRef.current = null;
    queueTimerRef.current = null;
    setStreaming(false);
  }, [setStreaming]);

  const disconnect = useCallback(() => {
    stopTimers();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    calibratedRef.current = false;
    chunkIndexRef.current = 0;
    setStatus('disconnected');
  }, [stopTimers, setStatus]);

  const startStreaming = useCallback((ws: WebSocket, sig: Signals) => {
    const streamBvp = sig.bvp.slice(RECOMMENDED_SIGNAL_SAMPLES);
    const streamGsr = sig.gsr.slice(RECOMMENDED_SIGNAL_SAMPLES);
    const streamSkt = sig.skt.slice(RECOMMENDED_SIGNAL_SAMPLES);
    const totalChunks = Math.ceil(streamBvp.length / CHUNK_SIZE);

    setStreaming(true);
    chunkIndexRef.current = 0;

    chunkTimerRef.current = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) return;

      const idx = chunkIndexRef.current;
      const start = (idx % totalChunks) * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, streamBvp.length);
      const isLastChunk = (idx % totalChunks) === totalChunks - 1;

      const chunk = {
        bvp: streamBvp.slice(start, end),
        gsr: streamGsr.slice(start, end),
        skt: streamSkt.slice(start, end),
      };

      pushSamples(chunk.bvp, chunk.gsr, chunk.skt, idx % totalChunks, totalChunks);

      ws.send(JSON.stringify({
        type: 'predict_chunk',
        signals: chunk,
        min_samples: RECOMMENDED_SIGNAL_SAMPLES,
        flush: false,
      }));

      // On loop end: flush to drain server buffer
      if (isLastChunk) {
        ws.send(JSON.stringify({
          type: 'predict_chunk',
          signals: { bvp: [], gsr: [], skt: [] },
          min_samples: RECOMMENDED_SIGNAL_SAMPLES,
          flush: true,
        }));
      }

      chunkIndexRef.current += 1;
    }, CHUNK_INTERVAL_MS);

    // Back-pressure reporter — every 100ms
    queueTimerRef.current = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({ type: 'queue_status', qsize: tokenQueueRef.current }));
    }, QUEUE_REPORT_INTERVAL_MS);
  }, [pushSamples, setStreaming]);

  const connect = useCallback(() => {
    if (!signals) return;
    if (wsRef.current) disconnect();

    setStatus('connecting');
    const url = `${serverUrl}/ws/mood_music`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      // Step 1: Send calibration baseline (first 16k samples)
      setCalibrationStatus('calibrating');
      ws.send(JSON.stringify({
        type: 'calibrate',
        signals: {
          bvp: signals.bvp.slice(0, RECOMMENDED_SIGNAL_SAMPLES),
          gsr: signals.gsr.slice(0, RECOMMENDED_SIGNAL_SAMPLES),
          skt: signals.skt.slice(0, RECOMMENDED_SIGNAL_SAMPLES),
        },
      }));
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        const event = msg.event;

        if (event === 'calibrated') {
          setCalibrationStatus('calibrated', msg.samples_per_channel);
          calibratedRef.current = true;
          onCalibrated?.();
          // Step 2: Begin streaming chunks
          startStreaming(ws, signals);
        } else if (event === 'prediction') {
          setPrediction({
            sequence: msg.sequence,
            valence: msg.valence,
            arousal: msg.arousal,
            valenceNorm: msg.valence_norm,
            arousalNorm: msg.arousal_norm,
            mood: {
              id: msg.mood.id,
              name: msg.mood.name as MoodName,
              distance: msg.mood.distance,
              circumplexValence: msg.mood.circumplex_valence,
              circumplexArousal: msg.mood.circumplex_arousal,
            },
            musicParams: {
              tempoBpm: msg.music_params.tempo_bpm,
              mode: msg.music_params.mode,
              velocity: msg.music_params.velocity,
              pitchRegister: msg.music_params.pitch_register,
              noteDensity: msg.music_params.note_density,
              brightness: msg.music_params.brightness,
              tension: msg.music_params.tension,
            },
            timestamp: Date.now(),
          });
          setCurrentMood(msg.mood.name as MoodName);
        } else if (event === 'music_token') {
          pushToken(msg.token, msg.mood_id);
          setCurrentMoodMusic(msg.mood_id, msg.mood_id as unknown as MoodName);
        } else if (msg.type === 'error') {
          onError?.(msg.message);
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      setStatus('error', 'WebSocket connection failed');
      onError?.('WebSocket connection failed');
    };

    ws.onclose = () => {
      stopTimers();
      setStatus('disconnected');
    };
  }, [signals, serverUrl, disconnect, setStatus, setCalibrationStatus,
      setPrediction, setCurrentMood, pushToken, setCurrentMoodMusic,
      startStreaming, stopTimers, onCalibrated, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { disconnect(); };
  }, [disconnect]);

  return { connect, disconnect };
}
