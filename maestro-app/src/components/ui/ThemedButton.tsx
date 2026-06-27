import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { useMoodTheme } from '../../theme/ThemeContext';

type Props = {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
};

export function ThemedButton({
  label, onPress, style, variant = 'primary', loading = false, disabled = false,
}: Props) {
  const { theme } = useMoodTheme();

  const bgColor =
    variant === 'primary' ? theme.accent
    : variant === 'secondary' ? theme.surfaceElevated
    : 'transparent';

  const textColor =
    variant === 'primary' ? '#000'
    : variant === 'ghost' ? theme.accent
    : theme.text;

  const borderColor = variant === 'ghost' ? theme.accent : 'transparent';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.btn,
        { backgroundColor: bgColor, borderColor },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
