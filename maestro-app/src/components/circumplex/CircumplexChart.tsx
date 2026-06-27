import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { useMoodTheme } from '../../theme/ThemeContext';
import { MOOD_PROTOTYPES, MOODS, moodThemes } from '../../theme/moodThemes';
import { useStore as useInferenceStore } from '../../store/inferenceStore';

const SIZE = 280;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 24;

function toXY(v: number, a: number) {
  // v in [-1,1], a in [-1,1] → screen coords
  return {
    x: CENTER + v * RADIUS,
    y: CENTER - a * RADIUS, // flip Y (higher arousal = up)
  };
}

export function CircumplexChart() {
  const { theme } = useMoodTheme();
  const pred = useInferenceStore((s) => s.latestPrediction);

  const dotV = pred?.mood.circumplexValence ?? null;
  const dotA = pred?.mood.circumplexArousal ?? null;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.textMuted }]}>VALENCE / AROUSAL</Text>
      <Svg width={SIZE} height={SIZE}>
        {/* Axes */}
        <Line x1={CENTER} y1={8} x2={CENTER} y2={SIZE - 8} stroke={theme.border} strokeWidth={1} />
        <Line x1={8} y1={CENTER} x2={SIZE - 8} y2={CENTER} stroke={theme.border} strokeWidth={1} />

        {/* Outer circle */}
        <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke={theme.border} strokeWidth={1} strokeDasharray="4 4" />

        {/* Axis labels */}
        <SvgText x={CENTER + 6} y={16} fill={theme.textMuted} fontSize={9} fontWeight="600">HIGH AROUSAL</SvgText>
        <SvgText x={CENTER + 6} y={SIZE - 8} fill={theme.textMuted} fontSize={9} fontWeight="600">LOW AROUSAL</SvgText>
        <SvgText x={8} y={CENTER - 6} fill={theme.textMuted} fontSize={9} fontWeight="600">NEG</SvgText>
        <SvgText x={SIZE - 30} y={CENTER - 6} fill={theme.textMuted} fontSize={9} fontWeight="600">POS</SvgText>

        {/* Mood prototype dots */}
        {MOODS.map((mood) => {
          const proto = MOOD_PROTOTYPES[mood];
          const mt = moodThemes[mood];
          const { x, y } = toXY(proto.v, proto.a);
          return (
            <G key={mood}>
              <Circle cx={x} cy={y} r={6} fill={mt.accent + '40'} stroke={mt.accent} strokeWidth={1} />
              <SvgText x={x + 8} y={y + 4} fill={mt.accent} fontSize={8} fontWeight="600">
                {mt.emoji}
              </SvgText>
            </G>
          );
        })}

        {/* Live prediction dot */}
        {dotV !== null && dotA !== null && (() => {
          const { x, y } = toXY(dotV, dotA);
          return (
            <>
              <Circle cx={x} cy={y} r={12} fill={theme.accent + '30'} />
              <Circle cx={x} cy={y} r={6} fill={theme.accent} />
            </>
          );
        })()}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 8 },
  title: { fontSize: 11, fontWeight: '600', letterSpacing: 1.5, marginBottom: 8 },
});
