import { create } from 'zustand';

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

type ConnectionStore = {
  serverUrl: string;
  status: ConnectionStatus;
  error: string | undefined;
  setServerUrl: (url: string) => void;
  setStatus: (status: ConnectionStatus, error?: string) => void;
  reset: () => void;
};

export const useConnectionStore = create<ConnectionStore>((set) => ({
  serverUrl: 'ws://192.168.1.6:8000', // Your local IP — device must be on the same WiFi as the PC
  status: 'disconnected',
  error: undefined,
  setServerUrl: (url) => set({ serverUrl: url }),
  setStatus: (status, error = undefined) => set({ status, error }),
  reset: () => set({ status: 'disconnected', error: undefined }),
}));
