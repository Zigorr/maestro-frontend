import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useMoodTheme } from "../theme/ThemeContext";
import { ThemedButton } from "../components/ui/ThemedButton";
import { ThemedCard } from "../components/ui/ThemedCard";
import { parseSignalCsv } from "../services/csvParser";
import { useMusicStore } from "../store/musicStore";
import { useStore as useInferenceStore } from "../store/inferenceStore";
import { MoodName, MOODS, moodThemes } from "../theme/moodThemes";

type RouteParams = { mode: "csv" | "manual" };

export function CalibrateScreen() {
  const { theme } = useMoodTheme();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { mode } = (route.params as RouteParams) ?? { mode: "csv" };

  const setMode = useMusicStore((s) => s.setMode);
  const setCurrentMood = useInferenceStore((s) => s.setCurrentMood);

  const [loading, setLoading] = useState(false);
  const [csvInfo, setCsvInfo] = useState<{
    name: string;
    samples: number;
    uri: string;
  } | null>(null);
  const [selectedMood, setSelectedMood] = useState<MoodName>("happy");
  const [error, setError] = useState<string | null>(null);

  const pickCsv = async () => {
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "text/csv",
          "text/comma-separated-values",
          "application/vnd.ms-excel",
          "*/*",
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setLoading(true);
      const data = await parseSignalCsv(asset.uri);
      setCsvInfo({
        name: asset.name,
        samples: data.totalSamples,
        uri: asset.uri,
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (mode === "manual") {
    return (
      <ScrollView
        style={[styles.root, { backgroundColor: theme.bg }]}
        contentContainerStyle={styles.content}
      >
        <View style={styles.headerBlock}>
          <Text style={[styles.title, { color: theme.text }]}>
            Initialize Mood
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Select a target emotion to begin real-time generative playback.
          </Text>
        </View>

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
                    shadowColor: isSelected ? mt.accent : "transparent",
                    shadowOpacity: isSelected ? 0.4 : 0,
                    shadowRadius: 12,
                    elevation: isSelected ? 8 : 0,
                  },
                ]}
              >
                <View
                  style={[
                    styles.tileDot,
                    { backgroundColor: isSelected ? mt.accent : mt.accentSoft },
                  ]}
                />
                <Text
                  style={[
                    styles.tileName,
                    { color: isSelected ? mt.accent : theme.textMuted },
                  ]}
                >
                  {mt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footerBlock}>
          <ThemedButton
            label={`Start Engine · ${moodThemes[selectedMood].label}`}
            onPress={() => {
              setMode("manual");
              setCurrentMood(selectedMood);
              navigation.navigate("Music", {
                mode: "manual",
                initialMood: selectedMood,
              });
            }}
            style={styles.startBtn}
          />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.headerBlock}>
        <Text style={[styles.title, { color: theme.text }]}>
          Physiological Input
        </Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Upload a signal CSV (BVP, GSR, SKT @ 1000Hz) to infer real-time
          emotions.
        </Text>
      </View>

      <ThemedCard style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
          DATA SOURCE
        </Text>
        <ThemedButton
          label={csvInfo ? `${csvInfo.name}` : "Browse Files"}
          variant="secondary"
          onPress={pickCsv}
          loading={loading}
        />
        {csvInfo && (
          <View style={styles.csvMeta}>
            <Text
              style={[
                styles.metaLine,
                { color: theme.text, fontWeight: "700" },
              ]}
            >
              {csvInfo.samples.toLocaleString()} Samples Loaded
            </Text>
            <Text style={[styles.metaLine, { color: theme.textMuted }]}>
              ~{(csvInfo.samples / 1000).toFixed(1)} seconds of playback
            </Text>
          </View>
        )}
        {csvInfo && (
          <ThemedButton
            label="Start Inference Stream"
            onPress={() => {
              setMode("csv");
              navigation.navigate("Music", {
                mode: "csv",
                csvUri: csvInfo.uri,
              });
            }}
            style={{ marginTop: 12 }}
          />
        )}
        {error && <Text style={styles.error}>{error}</Text>}
      </ThemedCard>

      <View style={styles.orRow}>
        <View style={[styles.orLine, { backgroundColor: theme.border }]} />
        <Text style={[styles.orText, { color: theme.textMuted }]}>OR</Text>
        <View style={[styles.orLine, { backgroundColor: theme.border }]} />
      </View>

      <ThemedCard style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
          DEMO MODE
        </Text>
        <Text style={[styles.demoDesc, { color: theme.textMuted }]}>
          Synthesize dummy physiological signals to test the pipeline without a
          file.
        </Text>
        <ThemedButton
          label="Initialize Demo Generator"
          variant="secondary"
          onPress={() => {
            setMode("csv");
            navigation.navigate("Music", { mode: "csv", demo: true });
          }}
          style={{ marginTop: 12 }}
        />
      </ThemedCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    padding: 24,
    paddingBottom: 48,
    minHeight: "100%",
    alignItems: "center",
  },
  headerBlock: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  section: { width: "100%", gap: 12, padding: 20, borderRadius: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 8,
  },
  csvMeta: { alignItems: "center", gap: 6, marginVertical: 12 },
  metaLine: { fontSize: 13, letterSpacing: 0.5 },
  error: {
    fontSize: 13,
    color: "#ef4444",
    marginTop: 8,
    textAlign: "center",
    fontWeight: "500",
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 40,
    marginVertical: 32,
  },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  orText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginHorizontal: 16,
  },
  demoDesc: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 8,
  },
  moodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginBottom: 40,
  },
  moodTile: {
    width: "30%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 8,
  },
  tileDot: { width: 14, height: 14, borderRadius: 7, marginBottom: 10 },
  tileName: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  footerBlock: { width: "100%", marginTop: "auto" },
  startBtn: { paddingVertical: 18, borderRadius: 16 },
});
