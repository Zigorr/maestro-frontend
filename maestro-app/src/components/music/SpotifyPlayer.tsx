import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  ScrollView,
  Alert,
  Dimensions,
  Pressable,
  Platform,
  Easing,
  Image,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useMoodTheme } from "../../theme/ThemeContext";
import { useStore as useInferenceStore } from "../../store/inferenceStore";
import {
  MoodName,
  MOODS,
  moodThemes,
  defaultTheme,
} from "../../theme/moodThemes";
import { parseSignalCsv } from "../../services/csvParser";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DISC_SIZE = Math.min(SCREEN_WIDTH - 64, 280);

function Icon({
  name,
  size = 20,
  color,
}: {
  name: string;
  size?: number;
  color: string;
}) {
  // Use image assets for specific icons
  if (name === "play") {
    return (
      <Image
        source={require("../../../assets/play.png")}
        style={{ width: size, height: size, tintColor: color, marginLeft: 3 }}
        resizeMode="contain"
      />
    );
  }
  if (name === "pause") {
    return (
      <Image
        source={require("../../../assets/pause.png")}
        style={{ width: size, height: size, tintColor: color }}
        resizeMode="contain"
      />
    );
  }
  if (name === "back") {
    return (
      <Image
        source={require("../../../assets/back.png")}
        style={{ width: size, height: size, tintColor: color }}
        resizeMode="contain"
      />
    );
  }
  if (name === "chevronDown") {
    return (
      <Image
        source={require("../../../assets/back.png")}
        style={{
          width: size,
          height: size,
          tintColor: color,
          transform: [{ rotate: "-90deg" }], // Rotates the `<` to point down
        }}
        resizeMode="contain"
      />
    );
  }

  // Fallback text icons for the remaining controls
  const icons: Record<string, string> = {
    prev: "⏮",
    next: "⏭",
    shuffle: "⇄",
    repeat: "↻",
    menu: "⋯",
    chevronDown: "⌄",
    check: "✓",
  };

  return (
    <Text
      style={{
        fontSize: size,
        color,
        lineHeight: size * 1.3,
        textAlign: "center",
      }}
    >
      {icons[name] ?? "?"}
    </Text>
  );
}

function VinylDisc({
  accentColor,
  moodLabel,
}: {
  accentColor: string;
  moodLabel: string;
  spinning: boolean;
}) {
  return (
    <Animated.View
      style={[styles.disc, { width: DISC_SIZE, height: DISC_SIZE }]}
    >
      <View
        style={[
          styles.discOuter,
          { borderColor: accentColor + "40", backgroundColor: "#111" },
        ]}
      />
      {[0.85, 0.75, 0.65, 0.55].map((scale, i) => (
        <View
          key={i}
          style={[
            styles.discRing,
            {
              width: DISC_SIZE * scale,
              height: DISC_SIZE * scale,
              borderColor: accentColor + "20",
            },
          ]}
        />
      ))}
      <View
        style={[
          styles.discCenter,
          { backgroundColor: accentColor + "22", borderColor: accentColor },
        ]}
      >
        <Text style={[styles.discLabel, { color: accentColor }]}>
          {moodLabel.slice(0, 3).toUpperCase()}
        </Text>
      </View>
      <View
        style={[styles.discSheen, { backgroundColor: accentColor + "08" }]}
      />
    </Animated.View>
  );
}

// Progress Bar - Always filled, with a sweeping pulse
function ProgressBar({
  accentColor,
  playing,
}: {
  accentColor: string;
  playing: boolean;
}) {
  const sweepAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (playing) {
      // Sweeping highlight animation across the filled bar
      Animated.loop(
        Animated.timing(sweepAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: false,
        }),
      ).start();

      // Text pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      sweepAnim.stopAnimation();
      pulseAnim.stopAnimation();
    }
  }, [playing, sweepAnim, pulseAnim]);

  const sweepInterp = sweepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["-50%", "100%"],
  });

  return (
    <View style={styles.progressSection}>
      <View style={styles.progressTrack}>
        {/* Main solid filled bar */}
        <View
          style={[
            styles.progressFill,
            { width: "100%", backgroundColor: accentColor },
          ]}
        />

        {/* Sweeping gradient pulse */}
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: "50%",
            left: sweepInterp,
          }}
        >
          <LinearGradient
            colors={["transparent", "rgba(255, 255, 255, 0.5)", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>

      <View style={styles.progressLabels}>
        <Text style={[styles.progressLabel, { color: "#aaa" }]}>
          MAESTRO ENGINE
        </Text>
        <Animated.Text
          style={[
            styles.progressLabel,
            { color: accentColor, opacity: pulseAnim },
          ]}
        >
          {playing ? "LIVE GENERATION ●" : "PAUSED"}
        </Animated.Text>
      </View>
    </View>
  );
}

function StatsStrip({ accentColor }: { accentColor: string }) {
  const pred = useInferenceStore((s) => s.latestPrediction);
  const params = pred?.musicParams;

  if (!params) return null;

  const items = [
    { label: "BPM", value: String(params.tempoBpm) },
    { label: "VEL", value: params.velocity.toFixed(0) },
    { label: "DNS", value: params.noteDensity.toFixed(2) },
    { label: "BRT", value: params.brightness.toFixed(2) },
  ];

  return (
    <View style={styles.statsRow}>
      {items.map((it) => (
        <View key={it.label} style={styles.statItem}>
          <Text style={[styles.statValue, { color: accentColor }]}>
            {it.value}
          </Text>
          <Text style={styles.statLabel}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

type Props = {
  mode: "csv" | "manual";
  isPlaying: boolean;
  onTogglePlay?: () => void;
  currentMood: MoodName | null;
  onMoodSelect?: (m: MoodName) => void;
  onCsvLoaded?: (uri: string) => void;
  onBack?: () => void;
  onUnlockAudio?: () => void;
  onVolumeChange?: (v: number) => void;
};

export function SpotifyPlayer({
  mode,
  isPlaying,
  currentMood,
  onTogglePlay,
  onMoodSelect,
  onCsvLoaded,
  onBack,
  onUnlockAudio,
  onVolumeChange,
}: Props) {
  const { theme } = useMoodTheme();
  const [moodOpen, setMoodOpen] = useState(false);
  const [loadingCsv, setLoadingCsv] = useState(false);
  const [csvName, setCsvName] = useState<string | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // Volume State
  const [volume, setVolumeState] = useState(0.7);
  const [trackWidth, setTrackWidth] = useState(1); // Default to 1 to prevent division by zero

  const isWeb = Platform.OS === "web";
  const displayMood = currentMood;
  const displayTheme = displayMood ? moodThemes[displayMood] : defaultTheme;
  const accentColor = displayTheme.accent;
  const gradColors = displayTheme.gradientColors;

  const pickCsv = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      setLoadingCsv(true);
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
      await parseSignalCsv(asset.uri);
      setCsvName(asset.name);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onCsvLoaded?.(asset.uri);
    } catch (e: any) {
      Alert.alert("CSV Error", e.message);
    } finally {
      setLoadingCsv(false);
    }
  }, [onCsvLoaded]);

  // Handler for custom volume slider
  const handleVolumePointer = (locationX: number) => {
    if (trackWidth === 0) return;
    let newVol = locationX / trackWidth;
    newVol = Math.max(0, Math.min(1, newVol)); // Clamp between 0 and 1

    // Prevent the volume from completely muting if intended just to be low
    if (newVol < 0.05 && newVol > 0) newVol = 0.05;

    setVolumeState(newVol);
    onVolumeChange?.(newVol);
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[gradColors[0], gradColors[1], gradColors[2], "#000"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />

      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.topBtn}
          activeOpacity={0.7}
        >
          {/* Using the new back image icon */}
          <Icon name="back" size={22} color="#aaa" />
        </TouchableOpacity>
        <View style={styles.topCenter}>
          <Text style={styles.topContext}>
            {mode === "csv" ? "PHYSIOLOGICAL STREAM" : "MANUAL MODE"}
          </Text>
          <Text style={styles.topTitle}>MAESTRO</Text>
        </View>
        <TouchableOpacity style={styles.topBtn} activeOpacity={0.7}>
          {/* <Icon name="menu" size={18} color="#aaa" /> */}
        </TouchableOpacity>
      </View>

      <View style={styles.discSection}>
        <View
          style={[
            styles.discShadow,
            {
              shadowColor: accentColor,
              shadowOpacity: isPlaying ? 0.6 : 0.2,
              shadowRadius: isPlaying ? 40 : 20,
            },
          ]}
        >
          <VinylDisc
            accentColor={accentColor}
            moodLabel={displayTheme.label}
            spinning={isPlaying}
          />
        </View>
      </View>

      <View style={styles.trackInfo}>
        <View style={styles.trackLeft}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {displayTheme.label} — Generative
          </Text>
          <Text style={[styles.trackSub, { color: accentColor + "cc" }]}>
            MAESTRO AI · Real-time
          </Text>
        </View>
      </View>

      <StatsStrip accentColor={accentColor} />

      <ProgressBar accentColor={accentColor} playing={isPlaying} />

      <View style={styles.controls}>
        <TouchableOpacity style={styles.ctrlBtn} activeOpacity={0.7}>
          <Icon name="shuffle" size={20} color="#888" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} activeOpacity={0.7}>
          <Icon name="prev" size={24} color="#ddd" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            if (!audioUnlocked) {
              onUnlockAudio?.();
              setAudioUnlocked(true);
            }
            onTogglePlay?.();
          }}
          style={[styles.playBtn, { backgroundColor: accentColor }]}
          activeOpacity={0.85}
        >
          {/* Using the image icons for play/pause */}
          <Icon name={isPlaying ? "pause" : "play"} size={22} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} activeOpacity={0.7}>
          <Icon name="next" size={24} color="#ddd" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} activeOpacity={0.7}>
          <Icon name="repeat" size={20} color="#888" />
        </TouchableOpacity>
      </View>

      {isWeb && (
        <View style={styles.volumeRow}>
          <Text style={styles.volumeText}>VOL</Text>

          {/* Custom Volume Slider */}
          <View
            style={styles.volumeTouchArea}
            onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onResponderGrant={(e) =>
              handleVolumePointer(e.nativeEvent.locationX)
            }
            onResponderMove={(e) =>
              handleVolumePointer(e.nativeEvent.locationX)
            }
          >
            <View style={styles.volumeTrackBg} pointerEvents="none">
              <View
                style={[
                  styles.volumeFill,
                  { width: `${volume * 100}%`, backgroundColor: accentColor },
                ]}
              />
            </View>
            <View
              style={[
                styles.volumeThumb,
                { left: `${volume * 100}%`, backgroundColor: accentColor },
              ]}
              pointerEvents="none"
            />
          </View>

          <Text style={styles.volumeText}>MAX</Text>
        </View>
      )}

      <View style={[styles.bottomBar, { borderTopColor: accentColor + "20" }]}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setMoodOpen(true);
          }}
          style={[
            styles.actionBarBtn,
            {
              borderColor: accentColor + "50",
              backgroundColor: accentColor + "15",
            },
          ]}
          activeOpacity={0.75}
        >
          <View
            style={[styles.actionBarDot, { backgroundColor: accentColor }]}
          />
          <View style={styles.actionBarBtnText}>
            <Text style={[styles.actionBarBtnLabel, { color: "#aaa" }]}>
              MOOD
            </Text>
            <Text style={[styles.actionBarBtnValue, { color: accentColor }]}>
              {displayTheme.label}
            </Text>
          </View>
          <Icon name="chevronDown" size={14} color={accentColor} />
        </TouchableOpacity>
        <View
          style={[styles.barDivider, { backgroundColor: accentColor + "30" }]}
        />
        <TouchableOpacity
          onPress={pickCsv}
          style={[
            styles.actionBarBtn,
            { borderColor: "#ffffff20", backgroundColor: "#ffffff08" },
          ]}
          activeOpacity={0.75}
          disabled={loadingCsv}
        >
          <Text
            style={[
              styles.actionBarBtnIconText,
              { color: csvName ? accentColor : "#666" },
            ]}
          >
            CSV
          </Text>
          <View style={styles.actionBarBtnText}>
            <Text style={[styles.actionBarBtnLabel, { color: "#aaa" }]}>
              {loadingCsv ? "LOADING…" : "SIGNAL FILE"}
            </Text>
            <Text
              style={[
                styles.actionBarBtnValue,
                { color: csvName ? accentColor : "#555" },
              ]}
              numberOfLines={1}
            >
              {csvName ?? "Browse…"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <Modal
        visible={moodOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setMoodOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setMoodOpen(false)}
        >
          <Pressable
            style={[styles.modalSheet, { backgroundColor: "#161616" }]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: "#444" }]} />
            <Text style={[styles.sheetTitle, { color: "#fff" }]}>
              Select Mood
            </Text>
            <ScrollView
              contentContainerStyle={styles.moodGrid}
              showsVerticalScrollIndicator={false}
            >
              {MOODS.map((mood) => {
                const mt = moodThemes[mood];
                const isActive = mood === currentMood;
                return (
                  <TouchableOpacity
                    key={mood}
                    activeOpacity={0.7}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      onMoodSelect?.(mood);
                      setMoodOpen(false);
                    }}
                    style={[
                      styles.moodChip,
                      {
                        backgroundColor: isActive ? mt.accent + "22" : "#222",
                        borderColor: isActive ? mt.accent : "#333",
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.moodChipDot,
                        { backgroundColor: mt.accent },
                      ]}
                    />
                    <Text
                      style={[
                        styles.moodChipLabel,
                        { color: isActive ? mt.accent : "#ddd" },
                      ]}
                    >
                      {mt.label}
                    </Text>
                    {isActive && (
                      <Icon name="check" size={14} color={mt.accent} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingBottom: 0 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 8,
  },
  topBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  topCenter: { flex: 1, alignItems: "center" },
  topContext: {
    fontSize: 10,
    color: "#888",
    letterSpacing: 1.5,
    fontWeight: "600",
  },
  topTitle: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "800",
    letterSpacing: 3,
    marginTop: 2,
  },
  discSection: { alignItems: "center", paddingVertical: 20 },
  discShadow: {
    shadowOffset: { width: 0, height: 8 },
    elevation: 20,
    borderRadius: 999,
  },
  disc: {
    borderRadius: 999,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  discOuter: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 999,
    borderWidth: 2,
  },
  discRing: { position: "absolute", borderRadius: 999, borderWidth: 1 },
  discCenter: {
    width: DISC_SIZE * 0.32,
    height: DISC_SIZE * 0.32,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  discLabel: {
    fontSize: DISC_SIZE * 0.09,
    fontWeight: "800",
    letterSpacing: 2,
  },
  discSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: "50%",
    bottom: 0,
    borderRadius: 999,
  },
  trackInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  trackLeft: { flex: 1 },
  trackTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.5,
  },
  trackSub: { fontSize: 13, fontWeight: "600", marginTop: 4 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 24,
    paddingVertical: 8,
    marginBottom: 4,
  },
  statItem: { alignItems: "center", gap: 2 },
  statValue: { fontSize: 15, fontWeight: "800", letterSpacing: 0.5 },
  statLabel: {
    fontSize: 9,
    color: "#666",
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  progressSection: { paddingHorizontal: 24, marginBottom: 24 },
  progressTrack: {
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
    overflow: "hidden",
    position: "relative",
  },
  progressFill: { height: 4, borderRadius: 2 },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  progressLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  ctrlBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
    marginBottom: 8,
  },
  actionBarBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionBarDot: { width: 12, height: 12, borderRadius: 6 },
  actionBarBtnIconText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    width: 30,
    textAlign: "center",
  },
  actionBarBtnText: { flex: 1 },
  actionBarBtnLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1.5 },
  actionBarBtnValue: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  barDivider: { width: 1, height: 40, borderRadius: 1 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    maxHeight: "75%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    paddingHorizontal: 20,
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  moodGrid: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  moodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  moodChipDot: { width: 10, height: 10, borderRadius: 5 },
  moodChipLabel: { flex: 1, fontSize: 15, fontWeight: "600" },

  // Custom Slider Styles
  volumeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 10,
  },
  volumeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#666",
    letterSpacing: 1,
    width: 28,
    textAlign: "center",
  },
  volumeTouchArea: {
    flex: 1,
    height: 24, // Made slightly taller so it's very easy to grab/touch
    justifyContent: "center",
    position: "relative",
  },
  volumeTrackBg: {
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
    overflow: "hidden",
    width: "100%",
  },
  volumeFill: {
    height: "100%",
    borderRadius: 2,
  },
  volumeThumb: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7, // Offset by half its width to perfectly center over the value
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
});
