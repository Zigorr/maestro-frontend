import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useMoodTheme } from '../../theme/ThemeContext';
import { MoodName, MOODS, moodThemes } from '../../theme/moodThemes';

type Props = {
  currentMood: MoodName | null;
  onSelect: (mood: MoodName) => void;
};

export function MoodPicker({ currentMood, onSelect }: Props) {
  const { theme } = useMoodTheme();

  const handlePress = (mood: MoodName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(mood);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textMuted }]}>
        SELECT MOOD
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {MOODS.map((mood) => {
          const mt = moodThemes[mood];
          const isActive = mood === currentMood;
          return (
            <TouchableOpacity
              key={mood}
              onPress={() => handlePress(mood)}
              activeOpacity={0.7}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? mt.accent : mt.surfaceElevated,
                  borderColor: isActive ? mt.accent : mt.border,
                  shadowColor: isActive ? mt.accent : 'transparent',
                },
              ]}
            >
              <View style={[styles.chipDot, {
                  backgroundColor: isActive ? '#000' : mt.accent,
                }]} />
              <Text
                style={[
                  styles.chipLabel,
                  { color: isActive ? '#000' : mt.text },
                ]}
              >
                {mt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 12 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  scroll: { paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipLabel: { fontSize: 13, fontWeight: '600' },
});
