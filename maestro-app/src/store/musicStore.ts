import { create } from 'zustand';
import { MoodName } from '../theme/moodThemes';

export type MusicToken = {
  token: number;
  moodId: number;
  timestamp: number;
};

export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'stopped';

type MusicStore = {
  tokens: MusicToken[];
  tokenQueueSize: number;
  playbackStatus: PlaybackStatus;
  currentMoodId: number;
  currentMoodName: MoodName | null;
  mode: 'csv' | 'manual' | null;
  pushToken: (token: number, moodId: number) => void;
  setQueueSize: (size: number) => void;
  setPlaybackStatus: (s: PlaybackStatus) => void;
  setCurrentMood: (id: number, name: MoodName) => void;
  setMode: (mode: 'csv' | 'manual') => void;
  reset: () => void;
};

export const useMusicStore = create<MusicStore>((set) => ({
  tokens: [],
  tokenQueueSize: 0,
  playbackStatus: 'idle',
  currentMoodId: 4, // happy default
  currentMoodName: null,
  mode: null,
  pushToken: (token, moodId) =>
    set((state) => ({
      tokens: [...state.tokens, { token, moodId, timestamp: Date.now() }].slice(-500),
      tokenQueueSize: state.tokenQueueSize + 1,
    })),
  setQueueSize: (size) => set({ tokenQueueSize: size }),
  setPlaybackStatus: (s) => set({ playbackStatus: s }),
  setCurrentMood: (id, name) => set({ currentMoodId: id, currentMoodName: name }),
  setMode: (mode) => set({ mode }),
  reset: () =>
    set({
      tokens: [],
      tokenQueueSize: 0,
      playbackStatus: 'idle',
      currentMoodId: 4,
      currentMoodName: null,
      mode: null,
    }),
}));
