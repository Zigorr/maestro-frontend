import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useMoodTheme } from '../../theme/ThemeContext';
import { useMusicStore } from '../../store/musicStore';
import { useStore as useInferenceStore } from '../../store/inferenceStore';

type GaugeProps = { value: number; min: number; max: number; label: string; color: string };

function MiniGauge({ value, min, max, label, color }: GaugeProps) {
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return (
    <View style={gaugeStyles.container}>
      <Text style={[gaugeStyles.label, { color: '#64748b' }]}>{label}</Text>
      <View style={[gaugeStyles.track, { backgroundColor: color + '22' }]}>
        <View style={[gaugeStyles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={[gaugeStyles.value, { color }]}>{typeof value === 'number' ? value.toFixed(2) : '—'}</Text>
    </View>
  );
}

const gaugeStyles = StyleSheet.create({
  container: { marginBottom: 10 },
  label: { fontSize: 10, fontWeight: '600', letterSpacing: 1, marginBottom: 4 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  value: { fontSize: 11, fontWeight: '700', marginTop: 3, textAlign: 'right' },
});

export function MusicParams() {
  const { theme } = useMoodTheme();
  const pred = useInferenceStore((s) => s.latestPrediction);
  const musicStore = useMusicStore((s) => s);

  const params = pred?.musicParams;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.header, { color: theme.textMuted }]}>MUSIC PARAMS</Text>

      {params ? (
        <>
          <View style={styles.tempoRow}>
            <Text style={[styles.bpm, { color: theme.accent }]}>{params.tempoBpm}</Text>
            <Text style={[styles.bpmLabel, { color: theme.textMuted }]}>BPM</Text>
          </View>
          <MiniGauge value={params.velocity} min={30} max={127} label="VELOCITY" color={theme.accent} />
          <MiniGauge value={params.noteDensity} min={0} max={1} label="DENSITY" color={theme.accent} />
          <MiniGauge value={params.brightness} min={0} max={1} label="BRIGHTNESS" color={theme.accent} />
          <MiniGauge value={1 - params.tension} min={0} max={1} label="CALM" color={theme.accent} />
        </>
      ) : (
        <Text style={[styles.empty, { color: theme.textMuted }]}>
          Waiting for first prediction…
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  header: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  tempoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 14,
  },
  bpm: { fontSize: 40, fontWeight: '800' },
  bpmLabel: { fontSize: 13, fontWeight: '600' },
  empty: { fontSize: 13, textAlign: 'center', paddingVertical: 16 },
});
