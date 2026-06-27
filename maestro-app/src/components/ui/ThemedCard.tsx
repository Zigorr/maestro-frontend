import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useMoodTheme } from '../../theme/ThemeContext';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
};

export function ThemedCard({ children, style, elevated = false }: Props) {
  const { theme } = useMoodTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: elevated ? theme.surfaceElevated : theme.surface,
          borderColor: theme.border,
          shadowColor: theme.accent,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
});
