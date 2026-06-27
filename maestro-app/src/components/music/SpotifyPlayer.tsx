import React, { useEffect, useRef, useState, useCallback } from 'react';
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
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useMoodTheme } from '../../theme/ThemeContext';
import { useMusicStore } from '../../store/musicStore';
import { useStore as useInferenceStore } from '../../store/inferenceStore';
import { MoodName, MOODS, moodThemes, defaultTheme } from '../../theme/moodThemes';
import { parseSignalCsv } from '../../services/csvParser';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DISC_SIZE = Math.min(SCREEN_WIDTH - 64, 280);

// ─── Icon primitives (no external icon lib needed) ─────────────────────────
function Icon({ name, size = 20, color }: { name: string; size?: number; color: string }) {
  const icons: Record<string, string> = {
    play: '▶',
    pause: '⏸',
    prev: '⏮',
    next: '⏭',
    shuffle: '⇄',
    repeat: '↻',
    heart: '♡',
    heartFilled: '♥',
    menu: '⋯',
    chevronDown: '⌄',
    check: '✓',
  };
  return (
    <Text style={{ fontSize: size, color, lineHeight: size * 1.3 }}>
      {icons[name] ?? '?'}
    </Text>
  );
}

// ─── Vinyl disc art ────────────────────────────────────────────────────────
function VinylDisc({
  accentColor,
  moodLabel,
  spinning,
}: {
  accentColor: string;
  moodLabel: string;
  spinning: boolean;
}) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (spinning) {
      animRef.current = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        })
      );
      animRef.current.start();
    } else {
      animRef.current?.stop();
    }
  }, [spinning, rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[styles.disc, { width: DISC_SIZE, height: DISC_SIZE, transform: [{ rotate }] }]}
    >
      {/* Outer vinyl ring */}
      <View
        style={[styles.discOuter, { borderColor: accentColor + '40', backgroundColor: '#111' }]}
      />
      {/* Groove rings */}
      {[0.85, 0.75, 0.65, 0.55].map((scale, i) => (
        <View
          key={i}
          style={[
            styles.discRing,
            {
              width: DISC_SIZE * scale,
              height: DISC_SIZE * scale,
              borderColor: accentColor + '20',
            },
          ]}
        />
      ))}
      {/* Center label */}
      <View style={[styles.discCenter, { backgroundColor: accentColor + '22', borderColor: accentColor }]}>
        <Text style={[styles.discLabel, { color: accentColor }]}>
          {moodLabel.slice(0, 3).toUpperCase()}
        </Text>
      </View>
      {/* Sheen */}
      <View style={[styles.discSheen, { backgroundColor: accentColor + '08' }]} />
    </Animated.View>
  );
}

// ─── Progress bar ──────────────────────────────────────────────────────────
function ProgressBar({ accentColor, tokenCount }: { accentColor: string; tokenCount: number }) {
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Animate progress gently forward in a loop
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, { toValue: 1, duration: 30000, useNativeDriver: false }),
        Animated.timing(progressAnim, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    ).start();
  }, [progressAnim]);

  const widthInterp = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.progressSection}>
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            { width: widthInterp, backgroundColor: accentColor },
          ]}
        />
      </View>
      <View style={styles.progressLabels}>
        <Text style={[styles.progressLabel, { color: '#aaa' }]}>{tokenCount} tokens</Text>
        <Text style={[styles.progressLabel, { color: '#aaa' }]}>LIVE ●</Text>
      </View>
    </View>
  );
}

// ─── Mini stats strip ──────────────────────────────────────────────────────
function StatsStrip({ accentColor }: { accentColor: string }) {
  const pred = useInferenceStore((s) => s.latestPrediction);
  const params = pred?.musicParams;

  if (!params) return null;

  const items = [
    { label: 'BPM', value: String(params.tempoBpm) },
    { label: 'VEL', value: params.velocity.toFixed(0) },
    { label: 'DNS', value: params.noteDensity.toFixed(2) },
    { label: 'BRT', value: params.brightness.toFixed(2) },
  ];

  return (
    <View style={styles.statsRow}>
      {items.map((it, i) => (
        <View key={it.label} style={styles.statItem}>
          <Text style={[styles.statValue, { color: accentColor }]}>{it.value}</Text>
          <Text style={styles.statLabel}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Mood Dropdown Modal ───────────────────────────────────────────────────
function MoodDropdown({
  visible,
  onClose,
  currentMood,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  currentMood: MoodName | null;
  onSelect: (m: MoodName) => void;
}) {
  const { theme } = useMoodTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={[styles.modalSheet, { backgroundColor: '#161616' }]}>
          {/* Handle */}
          <View style={[styles.sheetHandle, { backgroundColor: '#444' }]} />
          <Text style={[styles.sheetTitle, { color: '#fff' }]}>Select Mood</Text>
          <ScrollView contentContainerStyle={styles.moodGrid} showsVerticalScrollIndicator={false}>
            {MOODS.map((mood) => {
              const mt = moodThemes[mood];
              const isActive = mood === currentMood;
              return (
                <TouchableOpacity
                  key={mood}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onSelect(mood);
                    onClose();
                  }}
                  style={[
                    styles.moodChip,
                    {
                      backgroundColor: isActive ? mt.accent + '22' : '#222',
                      borderColor: isActive ? mt.accent : '#333',
                    },
                  ]}
                >
                  <View style={[styles.moodChipDot, { backgroundColor: mt.accent }]} />
                  <Text style={[styles.moodChipLabel, { color: isActive ? mt.accent : '#ddd' }]}>
                    {mt.label}
                  </Text>
                  {isActive && <Icon name="check" size={14} color={mt.accent} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── SpotifyPlayer ─────────────────────────────────────────────────────────
type Props = {
  mode: 'csv' | 'manual';
  isPlaying: boolean;
  onTogglePlay?: () => void;
  currentMood: MoodName | null;
  onMoodSelect?: (m: MoodName) => void;
  onCsvLoaded?: (uri: string) => void;
  onBack?: () => void;
  /** Web only: unlocks AudioContext after first user gesture */
  onUnlockAudio?: () => void;
  /** Web only: 0..1 master volume */
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
  const tokens = useMusicStore((s) => s.tokens);
  const playbackStatus = useMusicStore((s) => s.playbackStatus);

  const [moodOpen, setMoodOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [loadingCsv, setLoadingCsv] = useState(false);
  const [csvName, setCsvName] = useState<string | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [volume, setVolumeState] = useState(0.7);

  const isWeb = Platform.OS === 'web';

  const displayMood = currentMood;
  const displayTheme = displayMood ? moodThemes[displayMood] : defaultTheme;
  const accentColor = displayTheme.accent;
  const gradColors = displayTheme.gradientColors;

  const playing = playbackStatus === 'playing' || isPlaying;

  // Pulse animation for play button
  const playPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (playing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(playPulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
          Animated.timing(playPulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    } else {
      playPulse.stopAnimation();
      Animated.timing(playPulse, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [playing, playPulse]);

  const pickCsv = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      setLoadingCsv(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const data = await parseSignalCsv(asset.uri);
      setCsvName(asset.name);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onCsvLoaded?.(asset.uri);
    } catch (e: any) {
      Alert.alert('CSV Error', e.message);
    } finally {
      setLoadingCsv(false);
    }
  }, [onCsvLoaded]);

  return (
    <View style={styles.root}>
      {/* Gradient background that transitions with mood */}
      <LinearGradient
        colors={[gradColors[0], gradColors[1], gradColors[2], '#000']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />

      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.topBtn} activeOpacity={0.7}>
          <Icon name="chevronDown" size={22} color="#aaa" />
        </TouchableOpacity>
        <View style={styles.topCenter}>
          <Text style={styles.topContext}>
            {mode === 'csv' ? 'PHYSIOLOGICAL STREAM' : 'MANUAL MODE'}
          </Text>
          <Text style={styles.topTitle}>MAESTRO</Text>
        </View>
        <TouchableOpacity style={styles.topBtn} activeOpacity={0.7}>
          <Icon name="menu" size={18} color="#aaa" />
        </TouchableOpacity>
      </View>

      {/* ── Vinyl disc ── */}
      <View style={styles.discSection}>
        <View
          style={[
            styles.discShadow,
            {
              shadowColor: accentColor,
              shadowOpacity: playing ? 0.6 : 0.2,
              shadowRadius: playing ? 40 : 20,
            },
          ]}
        >
          <VinylDisc accentColor={accentColor} moodLabel={displayTheme.label} spinning={playing} />
        </View>
      </View>

      {/* ── Track info ── */}
      <View style={styles.trackInfo}>
        <View style={styles.trackLeft}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {displayTheme.label} — Generative
          </Text>
          <Text style={[styles.trackSub, { color: accentColor + 'cc' }]}>
            MAESTRO AI · Real-time
          </Text>
        </View>
        <TouchableOpacity onPress={() => setLiked((v) => !v)} activeOpacity={0.7}>
          <Icon name={liked ? 'heartFilled' : 'heart'} size={22} color={liked ? accentColor : '#888'} />
        </TouchableOpacity>
      </View>

      {/* ── Stats strip ── */}
      <StatsStrip accentColor={accentColor} />

      {/* ── Progress ── */}
      <ProgressBar accentColor={accentColor} tokenCount={tokens.length} />

      {/* ── Player controls ── */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.ctrlBtn} activeOpacity={0.7}>
          <Icon name="shuffle" size={20} color="#888" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} activeOpacity={0.7}>
          <Icon name="prev" size={24} color="#ddd" />
        </TouchableOpacity>

        {/* Play/Pause */}
        <Animated.View style={{ transform: [{ scale: playPulse }] }}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              // Unlock audio context on first play press (satisfies browser autoplay policy)
              if (!audioUnlocked) {
                onUnlockAudio?.();
                setAudioUnlocked(true);
              }
              onTogglePlay?.();
            }}
            style={[styles.playBtn, { backgroundColor: accentColor }]}
            activeOpacity={0.85}
          >
            <Icon name={playing ? 'pause' : 'play'} size={22} color="#000" />
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity style={styles.ctrlBtn} activeOpacity={0.7}>
          <Icon name="next" size={24} color="#ddd" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} activeOpacity={0.7}>
          <Icon name="repeat" size={20} color="#888" />
        </TouchableOpacity>
      </View>

      {/* ── Volume row (web only) ── */}
      {isWeb && (
        <View style={styles.volumeRow}>
          <Text style={styles.volumeText}>VOL</Text>
          {/* Native HTML range input — works perfectly in web Expo */}
          <View style={styles.volumeTrack}>
            <View style={[styles.volumeFill, { width: `${volume * 100}%` as any, backgroundColor: accentColor }]} />
            {/* Touchable steps as a simple discrete volume control */}
            <View style={styles.volumeTouchRow}>
              {[0, 0.25, 0.5, 0.75, 1.0].map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[
                    styles.volumeStep,
                    { backgroundColor: volume >= v ? accentColor : '#444' },
                  ]}
                  onPress={() => {
                    setVolumeState(v === 0 ? 0.05 : v);
                    onVolumeChange?.(v === 0 ? 0.05 : v);
                  }}
                  activeOpacity={0.7}
                />
              ))}
            </View>
          </View>
          <Text style={styles.volumeText}>MAX</Text>
        </View>
      )}

      {/* ── Bottom action bar — Mood + CSV ── */}
      <View style={[styles.bottomBar, { borderTopColor: accentColor + '20' }]}>
        {/* Mood dropdown button */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setMoodOpen(true);
          }}
          style={[
            styles.actionBarBtn,
            { borderColor: accentColor + '50', backgroundColor: accentColor + '15' },
          ]}
          activeOpacity={0.75}
        >
          <View style={[styles.actionBarDot, { backgroundColor: accentColor }]} />
          <View style={styles.actionBarBtnText}>
            <Text style={[styles.actionBarBtnLabel, { color: '#aaa' }]}>MOOD</Text>
            <Text style={[styles.actionBarBtnValue, { color: accentColor }]}>
              {displayTheme.label}
            </Text>
          </View>
          <Icon name="chevronDown" size={14} color={accentColor} />
        </TouchableOpacity>

        {/* Divider */}
        <View style={[styles.barDivider, { backgroundColor: accentColor + '30' }]} />

        {/* CSV selection button */}
        <TouchableOpacity
          onPress={pickCsv}
          style={[
            styles.actionBarBtn,
            { borderColor: '#ffffff20', backgroundColor: '#ffffff08' },
          ]}
          activeOpacity={0.75}
          disabled={loadingCsv}
        >
          <Text style={[styles.actionBarBtnIconText, { color: csvName ? accentColor : '#666' }]}>CSV</Text>
          <View style={styles.actionBarBtnText}>
            <Text style={[styles.actionBarBtnLabel, { color: '#aaa' }]}>
              {loadingCsv ? 'LOADING…' : 'SIGNAL FILE'}
            </Text>
            <Text
              style={[
                styles.actionBarBtnValue,
                { color: csvName ? accentColor : '#555' },
              ]}
              numberOfLines={1}
            >
              {csvName ?? 'Browse…'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Mood Dropdown Modal ── */}
      <MoodDropdown
        visible={moodOpen}
        onClose={() => setMoodOpen(false)}
        currentMood={currentMood}
        onSelect={(m) => onMoodSelect?.(m)}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingBottom: 0,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 8,
  },
  topBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCenter: { flex: 1, alignItems: 'center' },
  topContext: { fontSize: 10, color: '#888', letterSpacing: 1.5, fontWeight: '600' },
  topTitle: { fontSize: 14, color: '#fff', fontWeight: '800', letterSpacing: 3, marginTop: 2 },

  // Vinyl
  discSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  discShadow: {
    shadowOffset: { width: 0, height: 8 },
    elevation: 20,
    borderRadius: 999,
  },
  disc: {
    borderRadius: 999,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  discOuter: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: 2,
  },
  discRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
  },
  discCenter: {
    width: DISC_SIZE * 0.32,
    height: DISC_SIZE * 0.32,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  discLabel: {
    fontSize: DISC_SIZE * 0.09,
    fontWeight: '800',
    letterSpacing: 2,
  },
  discSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: '50%',
    bottom: 0,
    borderRadius: 999,
  },

  // Track info
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  trackLeft: { flex: 1 },
  trackTitle: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  trackSub: { fontSize: 13, fontWeight: '500', marginTop: 2 },

  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    paddingVertical: 8,
    marginBottom: 4,
  },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  statLabel: { fontSize: 9, color: '#666', fontWeight: '600', letterSpacing: 1.2 },

  // Progress
  progressSection: { paddingHorizontal: 24, marginBottom: 16 },
  progressTrack: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressLabel: { fontSize: 11, fontWeight: '500' },

  // Controls
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  ctrlBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },

  // Bottom action bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
    marginBottom: 8,
  },
  actionBarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionBarDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  actionBarBtnIconText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    width: 30,
    textAlign: 'center',
  },
  actionBarBtnText: { flex: 1 },
  actionBarBtnLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  actionBarBtnValue: { fontSize: 13, fontWeight: '700', marginTop: 1 },
  barDivider: { width: 1, height: 40, borderRadius: 1 },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    maxHeight: '75%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  moodGrid: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  moodChipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  moodChipLabel: { flex: 1, fontSize: 15, fontWeight: '600' },

  // Volume row
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 10,
    gap: 10,
  },
  volumeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#666',
    letterSpacing: 1,
    width: 28,
    textAlign: 'center',
  },
  volumeTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  volumeFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 2,
  },
  volumeTouchRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  volumeStep: {
    flex: 1,
    marginHorizontal: 1,
    borderRadius: 2,
  },
});
