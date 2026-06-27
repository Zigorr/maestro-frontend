import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMoodTheme } from '../theme/ThemeContext';
import { ThemedButton } from '../components/ui/ThemedButton';
import { ThemedCard } from '../components/ui/ThemedCard';
import { parseSignalCsv } from '../services/csvParser';
import { useMusicStore } from '../store/musicStore';
import { useStore as useInferenceStore } from '../store/inferenceStore';
import { MoodName, MOODS, moodThemes } from '../theme/moodThemes';

type RouteParams = { mode: 'csv' | 'manual' };

export function CalibrateScreen() {
  const { theme } = useMoodTheme();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { mode } = (route.params as RouteParams) ?? { mode: 'csv' };

  const setMode = useMusicStore((s) => s.setMode);
  const setCurrentMood = useInferenceStore((s) => s.setCurrentMood);

  const [loading, setLoading] = useState(false);
  const [csvInfo, setCsvInfo] = useState<{ name: string; samples: number; uri: string } | null>(null);
  const [selectedMood, setSelectedMood] = useState<MoodName>('happy');
  const [error, setError] = useState<string | null>(null);

  const pickCsv = async () => {
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setLoading(true);
      const data = await parseSignalCsv(asset.uri);
      setCsvInfo({ name: asset.name, samples: data.totalSamples, uri: asset.uri });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Manual Mood Mode ───────────────────────────────────────────────────────
  if (mode === 'manual') {
    return (
      <ScrollView
        style={[styles.root, { backgroundColor: theme.bg }]}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.title, { color: theme.text }]}>Pick a Mood</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Music will be generated directly for the mood you select.
          You can change it anytime during playback.
        </Text>

        <View style={styles.moodGrid}>
          {MOODS.map((mood) => {
            const mt = moodThemes[mood];
            const isSelected = mood === selectedMood;
            return (
              <TouchableOpacity
                key={mood}
                onPress={() => setSelectedMood(mood)}
                activeOpacity={0.75}
                style={[
                  styles.moodTile,
                  {
                    borderColor: isSelected ? mt.accent : theme.border,
                    backgroundColor: isSelected ? mt.accentSoft : theme.surface,
                    shadowColor: isSelected ? mt.accent : 'transparent',
                    shadowOpacity: 0.5,
                    shadowRadius: 10,
                    elevation: isSelected ? 8 : 0,
                  },
                ]}
              >
                <View style={[styles.tileDot, { backgroundColor: isSelected ? mt.accent : mt.accentSoft }]} />
                <Text style={[styles.tileName, { color: isSelected ? mt.accent : theme.textMuted }]}>
                  {mt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ThemedButton
          label={`Start  ·  ${moodThemes[selectedMood].label}`}
          onPress={() => {
            setMode('manual');
            setCurrentMood(selectedMood);
            navigation.navigate('Music', { mode: 'manual', initialMood: selectedMood });
          }}
          style={styles.startBtn}
        />
      </ScrollView>
    );
  }

  // ─── CSV / Demo Mode ────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: theme.text }]}>Load Signal Data</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Upload a CSV with BVP, GSR, and SKT columns at 1000 Hz.
        The first 16,000 samples will be used for baseline calibration.
      </Text>

      {/* CSV Upload */}
      <ThemedCard style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>FROM FILE</Text>
        <ThemedButton
          label={csvInfo ? `${csvInfo.name}` : 'Browse CSV / Excel'}
          variant="secondary"
          onPress={pickCsv}
          loading={loading}
        />
        {csvInfo && (
          <View style={styles.csvMeta}>
            <Text style={[styles.metaLine, { color: theme.text }]}>
              {csvInfo.samples.toLocaleString()} samples loaded
            </Text>
            <Text style={[styles.metaLine, { color: theme.textMuted }]}>
              {(csvInfo.samples / 1000).toFixed(0)} seconds at 1000 Hz
            </Text>
          </View>
        )}
        {csvInfo && (
          <ThemedButton
            label="Start Streaming"
            onPress={() => {
              setMode('csv');
              navigation.navigate('Music', { mode: 'csv', csvUri: csvInfo.uri });
            }}
            style={{ marginTop: 4 }}
          />
        )}
        {error && <Text style={styles.error}>{error}</Text>}
      </ThemedCard>

      {/* Divider */}
      <View style={styles.orRow}>
        <View style={[styles.orLine, { backgroundColor: theme.border }]} />
        <Text style={[styles.orText, { color: theme.textMuted }]}>OR</Text>
        <View style={[styles.orLine, { backgroundColor: theme.border }]} />
      </View>

      {/* Demo Mode */}
      <ThemedCard style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>DEMO MODE</Text>
        <Text style={[styles.demoDesc, { color: theme.text }]}>
          Uses synthetic BVP / GSR / SKT signals.
          The model will infer mood automatically from them.
        </Text>
        <ThemedButton
          label="Start Demo"
          variant="secondary"
          onPress={() => {
            setMode('csv');
            navigation.navigate('Music', { mode: 'csv', demo: true });
          }}
          style={{ marginTop: 4 }}
        />
      </ThemedCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, paddingBottom: 48, gap: 20 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: 1 },
  subtitle: { fontSize: 14, lineHeight: 22 },
  section: { gap: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.5 },
  csvMeta: { gap: 3 },
  metaLine: { fontSize: 13 },
  error: { fontSize: 12, color: '#ef4444', marginTop: 4, lineHeight: 18 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  orText: { fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  demoDesc: { fontSize: 14, lineHeight: 22 },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moodTile: {
    width: '29%',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 6,
  },
  tileDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginBottom: 4,
  },
  tileName: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  startBtn: { marginTop: 8 },
});
