import { create } from 'zustand';

export type SignalPoint = { t: number; value: number };
const MAX_POINTS = 200; // Keep last 200 points for charts

type SignalStore = {
  bvp: SignalPoint[];
  gsr: SignalPoint[];
  skt: SignalPoint[];
  chunkIndex: number;
  totalChunks: number;
  isStreaming: boolean;
  pushSamples: (bvp: number[], gsr: number[], skt: number[], chunkIdx: number, total: number) => void;
  setStreaming: (v: boolean) => void;
  reset: () => void;
};

let tick = 0;

export const useSignalStore = create<SignalStore>((set) => ({
  bvp: [],
  gsr: [],
  skt: [],
  chunkIndex: 0,
  totalChunks: 0,
  isStreaming: false,
  pushSamples: (bvp, gsr, skt, chunkIdx, total) => {
    const now = tick++;
    // Only keep last sample per chunk for charting (not all 1000)
    set((state) => ({
      bvp: [...state.bvp, { t: now, value: bvp[bvp.length - 1] ?? 0 }].slice(-MAX_POINTS),
      gsr: [...state.gsr, { t: now, value: gsr[gsr.length - 1] ?? 0 }].slice(-MAX_POINTS),
      skt: [...state.skt, { t: now, value: skt[skt.length - 1] ?? 0 }].slice(-MAX_POINTS),
      chunkIndex: chunkIdx,
      totalChunks: total,
    }));
  },
  setStreaming: (v) => set({ isStreaming: v }),
  reset: () => {
    tick = 0;
    set({ bvp: [], gsr: [], skt: [], chunkIndex: 0, totalChunks: 0, isStreaming: false });
  },
}));
