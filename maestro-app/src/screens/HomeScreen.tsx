import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMoodTheme } from '../theme/ThemeContext';
import { ThemedButton } from '../components/ui/ThemedButton';
import { StatusDot } from '../components/ui/StatusDot';
import { MoodCard } from '../components/mood/MoodCard';
import { CircumplexChart } from '../components/circumplex/CircumplexChart';
import { useConnectionStore } from '../store/connectionStore';
import { useStore as useInferenceStore } from '../store/inferenceStore';
import { moodThemes } from '../theme/moodThemes';

export function HomeScreen() {
  const { theme } = useMoodTheme();
  const navigation = useNavigation<any>();
  const { serverUrl, setServerUrl, status } = useConnectionStore();
  const { currentMood, predictionHistory } = useInferenceStore();
  const [urlInput, setUrlInput] = useState(serverUrl);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.appName, { color: theme.text }]}>MAESTRO</Text>
        <StatusDot status={status} />
      </View>

      {/* Server URL */}
      <View style={[styles.urlRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <TextInput
          value={urlInput}
          onChangeText={setUrlInput}
          onBlur={() => setServerUrl(urlInput.trim())}
          style={[styles.urlInput, { color: theme.text }]}
          placeholder="ws://10.0.2.2:8000"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Mood Card */}
      <MoodCard />

      {/* Circumplex */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <CircumplexChart />
      </View>

      {/* Recent moods */}
      {predictionHistory.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>RECENT MOODS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.historyRow}>
            {predictionHistory.slice(0, 10).map((p, i) => (
              <View
                key={i}
                style={[styles.historyChip, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
              >
                <View style={[styles.historyDot, { backgroundColor: moodThemes[p.mood.name]?.accent ?? '#888' }]} />
                <Text style={[styles.historyLabel, { color: theme.textMuted }]}>
                  {p.mood.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        <ThemedButton
          label="Upload CSV  ·  Stream"
          onPress={() => navigation.navigate('Calibrate', { mode: 'csv' })}
          style={styles.actionBtn}
        />
        <ThemedButton
          label="Pick Mood Manually"
          variant="secondary"
          onPress={() => navigation.navigate('Calibrate', { mode: 'manual' })}
          style={styles.actionBtn}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  appName: { fontSize: 22, fontWeight: '800', letterSpacing: 4 },
  urlRow: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  urlInput: { fontSize: 13, height: 44, fontFamily: 'monospace' },
  card: { borderRadius: 20, borderWidth: 1, padding: 12 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 1.5 },
  historyRow: { flexDirection: 'row' },
  historyChip: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    gap: 2,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  historyLabel: { fontSize: 10, fontWeight: '500' },
  actions: { gap: 10, marginTop: 8 },
  actionBtn: { width: '100%' },
});
