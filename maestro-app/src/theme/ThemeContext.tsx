import React, { createContext, useContext, useRef } from 'react';
import { Animated } from 'react-native';
import { MoodName, MoodTheme, defaultTheme, moodThemes } from './moodThemes';
import { useStore } from '../store/inferenceStore';

type ThemeContextValue = {
  theme: MoodTheme;
  mood: MoodName | null;
  opacity: Animated.Value;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: defaultTheme,
  mood: null,
  opacity: new Animated.Value(1),
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mood = useStore((s) => s.currentMood);
  const theme = mood ? moodThemes[mood] : defaultTheme;
  const opacity = useRef(new Animated.Value(1)).current;

  // Pulse animation on mood change
  React.useEffect(() => {
    opacity.setValue(0.5);
    Animated.spring(opacity, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  }, [mood]);

  return (
    <ThemeContext.Provider value={{ theme, mood, opacity }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useMoodTheme() {
  return useContext(ThemeContext);
}
