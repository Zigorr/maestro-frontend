import { useEffect, useRef, useCallback } from 'react';
import { useConnectionStore } from '../store/connectionStore';
import { useStore as useInferenceStore } from '../store/inferenceStore';
import { useMusicStore } from '../store/musicStore';
import { MoodName, MOOD_TO_ID } from '../theme/moodThemes';

const QUEUE_REPORT_INTERVAL_MS = 100;

type UseDirectMusicWSProps = {
  initialMood?: MoodName;
  onConnected?: (moods: string[]) => void;
  onError?: (msg: string) => void;
};

/**
 * Manages the /ws/direct_music WebSocket connection.
 * No physio inference — user picks mood directly.
 * Sends { type: "set_mood", mood: "happy" } to switch.
 */
export function useDirectMusicWS({ initialMood = 'happy', onConnected, onError }: UseDirectMusicWSProps) {
  const serverUrl = useConnectionStore((s) => s.serverUrl);
  const setStatus = useConnectionStore((s) => s.setStatus);
  const setCurrentMood = useInferenceStore((s) => s.setCurrentMood);
  const pushToken = useMusicStore((s) => s.pushToken);
  const setCurrentMoodMusic = useMusicStore((s) => s.setCurrentMood);
  const tokenQueueSize = useMusicStore((s) => s.tokenQueueSize);

  const wsRef = useRef<WebSocket | null>(null);
  const queueTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tokenQueueRef = useRef(0);

  useEffect(() => { tokenQueueRef.current = tokenQueueSize; }, [tokenQueueSize]);

  const stopTimers = useCallback(() => {
    if (queueTimerRef.current) clearInterval(queueTimerRef.current);
    queueTimerRef.current = null;
  }, []);

  const disconnect = useCallback(() => {
    stopTimers();
    wsRef.current?.close();
    wsRef.current = null;
    setStatus('disconnected');
  }, [stopTimers, setStatus]);

  const setMood = useCallback((mood: MoodName) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'set_mood', mood }));
      setCurrentMood(mood);
    }
  }, [setCurrentMood]);

  const connect = useCallback(() => {
    if (wsRef.current) disconnect();

    setStatus('connecting');
    const url = `${serverUrl}/ws/direct_music?mood=${initialMood}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      // Start queue reporter for back-pressure
      queueTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'queue_status', qsize: tokenQueueRef.current }));
        }
      }, QUEUE_REPORT_INTERVAL_MS);
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        const event = msg.event;

        if (event === 'connected') {
          setCurrentMood(msg.mood as MoodName);
          setCurrentMoodMusic(msg.mood_id, msg.mood as MoodName);
          onConnected?.(msg.moods ?? []);
        } else if (event === 'mood_set') {
          setCurrentMood(msg.mood as MoodName);
          setCurrentMoodMusic(msg.mood_id, msg.mood as MoodName);
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
      setStatus('error', 'Connection failed');
      onError?.('Connection failed');
    };

    ws.onclose = () => {
      stopTimers();
      setStatus('disconnected');
    };
  }, [serverUrl, initialMood, disconnect, setStatus, setCurrentMood,
      setCurrentMoodMusic, pushToken, stopTimers, onConnected, onError]);

  useEffect(() => { return () => { disconnect(); }; }, [disconnect]);

  return { connect, disconnect, setMood };
}
