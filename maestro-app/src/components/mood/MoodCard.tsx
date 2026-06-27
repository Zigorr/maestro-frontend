import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useMoodTheme } from '../../theme/ThemeContext';
import { defaultTheme, MoodName, moodThemes } from '../../theme/moodThemes';

type Props = {
  compact?: boolean;
};

export function MoodCard({ compact = false }: Props) {
  const { theme, mood } = useMoodTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevMood = useRef<MoodName | null>(null);

  useEffect(() => {
    if (mood !== prevMood.current) {
      prevMood.current = mood;
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1.06, useNativeDriver: true, speed: 25 }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 15 }),
      ]).start();
    }
  }, [mood, scaleAnim]);

  const displayTheme = mood ? moodThemes[mood] : defaultTheme;

  return (
    <Animated.View
      style={[
        styles.card,
        compact ? styles.compact : styles.large,
        {
          backgroundColor: displayTheme.surfaceElevated,
          borderColor: displayTheme.accent + '50',
          shadowColor: displayTheme.accent,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Glow overlay */}
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.glow,
          { backgroundColor: displayTheme.glow },
        ]}
      />

      <View style={[styles.accentDot, { backgroundColor: displayTheme.accent }]} />
      <Text style={[styles.moodName, { color: displayTheme.accent }, compact && styles.moodNameCompact]}>
        {displayTheme.label.toUpperCase()}
      </Text>

      {!compact && (
        <Text style={[styles.subtitle, { color: displayTheme.textMuted }]}>
          {mood ? 'Current Emotional State' : 'Awaiting Detection'}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  large: {
    paddingVertical: 40,
    paddingHorizontal: 32,
    marginHorizontal: 0,
  },
  compact: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    gap: 10,
  },
  glow: {
    borderRadius: 24,
  },
  accentDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginBottom: 10,
  },
  moodName: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 3,
  },
  moodNameCompact: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 6,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
