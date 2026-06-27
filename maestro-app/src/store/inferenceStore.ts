import { create } from 'zustand';
import { MoodName } from '../theme/moodThemes';

export type CalibrationStatus = 'idle' | 'calibrating' | 'calibrated' | 'error';

export type MoodPrediction = {
  sequence: number;
  valence: number;
  arousal: number;
  valenceNorm: number;
  arousalNorm: number;
  mood: {
    id: number;
    name: MoodName;
    distance: number;
    circumplexValence: number;
    circumplexArousal: number;
  };
  musicParams: {
    tempoBpm: number;
    mode: number;
    velocity: number;
    pitchRegister: number;
    noteDensity: number;
    brightness: number;
    tension: number;
  };
  timestamp: number;
};

type InferenceStore = {
  calibrationStatus: CalibrationStatus;
  calibrationSamples: number;
  currentMood: MoodName | null;
  latestPrediction: MoodPrediction | null;
  predictionHistory: MoodPrediction[];
  setCalibrationStatus: (status: CalibrationStatus, samples?: number) => void;
  setPrediction: (p: MoodPrediction) => void;
  setCurrentMood: (mood: MoodName) => void;
  reset: () => void;
};

export const useStore = create<InferenceStore>((set) => ({
  calibrationStatus: 'idle',
  calibrationSamples: 0,
  currentMood: null,
  latestPrediction: null,
  predictionHistory: [],
  setCalibrationStatus: (status, samples = 0) =>
    set({ calibrationStatus: status, calibrationSamples: samples }),
  setPrediction: (p) =>
    set((state) => ({
      latestPrediction: p,
      currentMood: p.mood.name,
      predictionHistory: [p, ...state.predictionHistory].slice(0, 50),
    })),
  setCurrentMood: (mood) => set({ currentMood: mood }),
  reset: () =>
    set({
      calibrationStatus: 'idle',
      calibrationSamples: 0,
      currentMood: null,
      latestPrediction: null,
      predictionHistory: [],
    }),
}));
