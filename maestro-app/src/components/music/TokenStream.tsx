import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useMoodTheme } from '../../theme/ThemeContext';
import { useMusicStore } from '../../store/musicStore';
import { moodThemes, ID_TO_MOOD } from '../../theme/moodThemes';

export function TokenStream() {
  const { theme } = useMoodTheme();
  const tokens = useMusicStore((s) => s.tokens);

  // Reverse once per render
  const reversedTokens = useMemo(() => [...tokens].reverse(), [tokens]);

  const renderToken = ({ item, index }: { item: { token: number; moodId: number; timestamp: number }; index: number }) => {
    const moodName = ID_TO_MOOD[item.moodId];
    const mt = moodName ? moodThemes[moodName] : null;
    const color = mt?.accent ?? theme.accent;

    // Visual sequence indicator
    const seqNum = index + 1;

    return (
      <View style={[styles.row, { borderBottomColor: theme.border }]}>
        <Text style={[styles.index, { color: theme.textMuted }]}>
          {String(seqNum).padStart(4, '0')}
        </Text>
        <View style={[styles.tokenBadge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
          <Text style={[styles.tokenVal, { color }]}>{item.token}</Text>
        </View>
        <Text style={[styles.moodLabel, { color }]}>
          {moodName ?? 'unknown'}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.header, { color: theme.textMuted }]}>TOKEN STREAM</Text>
      <FlatList
        data={reversedTokens}
        // STABLE KEY FIX: Uses the unique timestamp to prevent UI freezing
        keyExtractor={(item, i) => `${item.timestamp}-${i}`}
        renderItem={renderToken}
        showsVerticalScrollIndicator={false}
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    padding: 12,
    paddingBottom: 8,
  },
  list: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  index: { fontSize: 11, fontFamily: 'monospace', width: 36 },
  tokenBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 48,
    alignItems: 'center',
  },
  tokenVal: { fontSize: 12, fontWeight: '700', fontFamily: 'monospace' },
  moodLabel: { fontSize: 12, fontWeight: '500', flex: 1 },
});