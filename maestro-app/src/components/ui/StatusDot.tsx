import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useMoodTheme } from '../../theme/ThemeContext';
import { ConnectionStatus } from '../../store/connectionStore';

const STATUS_COLORS: Record<ConnectionStatus, string> = {
  disconnected: '#475569',
  connecting: '#f59e0b',
  connected: '#10b981',
  error: '#ef4444',
};

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting…',
  connected: 'Connected',
  error: 'Error',
};

type Props = { status: ConnectionStatus };

export function StatusDot({ status }: Props) {
  const { theme } = useMoodTheme();
  const color = STATUS_COLORS[status];
  const pulse = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (status === 'connecting') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.setValue(1);
    }
  }, [status, pulse]);

  return (
    <View style={styles.row}>
      <Animated.View style={[styles.dot, { backgroundColor: color, opacity: pulse }]} />
      <Text style={[styles.label, { color: theme.textMuted }]}>
        {STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 12, fontWeight: '500' },
});
