import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useMoodTheme } from '../theme/ThemeContext';
import { SpotifyPlayer } from '../components/music/SpotifyPlayer';
import { useMoodMusicWS } from '../hooks/useMoodMusicWS';
import { useDirectMusicWS } from '../hooks/useDirectMusicWS';
import { useMusicStore } from '../store/musicStore';
import { useStore as useInferenceStore } from '../store/inferenceStore';
import { useAudioSynth } from '../hooks/useAudioSynth';
import { MoodName } from '../theme/moodThemes';
import { parseSignalCsv } from '../services/csvParser';
import { generateDummySignals, RECOMMENDED_SIGNAL_SAMPLES } from '../services/signalSimulator';

type RouteParams = {
  mode: 'csv' | 'manual';
  csvUri?: string;
  demo?: boolean;
  initialMood?: MoodName;
};

export function MusicScreen() {
  const { theme } = useMoodTheme();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { mode, csvUri, demo, initialMood = 'happy' } = (route.params as RouteParams) ?? {};

  const currentMood = useInferenceStore((s) => s.currentMood);
  const resetInference = useInferenceStore((s) => s.reset);
  const resetMusic = useMusicStore((s) => s.reset);
  const playbackStatus = useMusicStore((s) => s.playbackStatus);
  const setPlaybackStatus = useMusicStore((s) => s.setPlaybackStatus);

  // 🔊 Audio synthesis — decodes REMI tokens → Web Audio API
  const { unlockAudio, setVolume } = useAudioSynth();

  const [signals, setSignals] = useState<{ bvp: number[]; gsr: number[]; skt: number[] } | null>(null);
  const [activeCsvUri, setActiveCsvUri] = useState<string | undefined>(csvUri);

  // Load signals (CSV or demo) for CSV mode
  useEffect(() => {
    if (mode !== 'csv') return;
    const load = async () => {
      try {
        if (demo) {
          const s = generateDummySignals(RECOMMENDED_SIGNAL_SAMPLES * 2);
          setSignals(s);
        } else if (activeCsvUri) {
          const data = await parseSignalCsv(activeCsvUri);
          setSignals(data);
        }
      } catch (e: any) {
        Alert.alert('Load Error', e.message);
      }
    };
    load();
  }, [mode, activeCsvUri, demo]);

  // CSV mode WS
  const { connect: connectCsv, disconnect: disconnectCsv } = useMoodMusicWS({
    signals: mode === 'csv' ? signals : null,
    onCalibrated: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    onError: (msg) => Alert.alert('Error', msg),
  });

  // Manual mode WS
  const { connect: connectManual, disconnect: disconnectManual, setMood } = useDirectMusicWS({
    initialMood,
    onConnected: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    onError: (msg) => Alert.alert('Error', msg),
  });

  // Connect once signals ready
  useEffect(() => {
    if (mode === 'csv' && signals) {
      connectCsv();
      setPlaybackStatus('playing');
    } else if (mode === 'manual') {
      connectManual();
      setPlaybackStatus('playing');
    }
  }, [mode, signals]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (mode === 'csv') disconnectCsv();
    else disconnectManual();
    resetInference();
    resetMusic();
    navigation.navigate('Home');
  }, [mode, disconnectCsv, disconnectManual, resetInference, resetMusic, navigation]);

  const handleTogglePlay = useCallback(() => {
    setPlaybackStatus(playbackStatus === 'playing' ? 'paused' : 'playing');
  }, [playbackStatus, setPlaybackStatus]);

  const handleMoodSelect = useCallback((mood: MoodName) => {
    if (mode === 'manual') {
      setMood(mood);
    }
  }, [mode, setMood]);

  const handleCsvLoaded = useCallback((uri: string) => {
    if (mode === 'csv') {
      // Reconnect with new CSV
      disconnectCsv();
      resetMusic();
      setActiveCsvUri(uri);
    }
  }, [mode, disconnectCsv, resetMusic]);

  return (
    <View style={[styles.root, { backgroundColor: '#000' }]}>
      <SpotifyPlayer
        mode={mode}
        isPlaying={playbackStatus === 'playing'}
        currentMood={currentMood}
        onTogglePlay={handleTogglePlay}
        onMoodSelect={handleMoodSelect}
        onCsvLoaded={handleCsvLoaded}
        onBack={handleBack}
        onUnlockAudio={unlockAudio}
        onVolumeChange={setVolume}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
