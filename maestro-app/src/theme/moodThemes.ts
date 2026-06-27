// Per-mood full color palettes for the MAESTRO app
// Each mood has: bg, surface, surfaceElevated, accent, accentSoft, glow, text, textMuted, emoji

export type MoodTheme = {
  bg: string;
  surface: string;
  surfaceElevated: string;
  accent: string;
  accentSoft: string;
  glow: string;
  text: string;
  textMuted: string;
  border: string;
  emoji: string;
  label: string;
  gradientColors: [string, string, string];
};

export type MoodName =
  | 'angry'
  | 'exciting'
  | 'fear'
  | 'funny'
  | 'happy'
  | 'lazy'
  | 'magnificent'
  | 'quiet'
  | 'romantic'
  | 'sad'
  | 'warm';

export const MOODS: MoodName[] = [
  'angry', 'exciting', 'fear', 'funny', 'happy',
  'lazy', 'magnificent', 'quiet', 'romantic', 'sad', 'warm',
];

export const MOOD_TO_ID: Record<MoodName, number> = {
  angry: 0, exciting: 1, fear: 2, funny: 3, happy: 4,
  lazy: 5, magnificent: 6, quiet: 7, romantic: 8, sad: 9, warm: 10,
};

export const ID_TO_MOOD: Record<number, MoodName> = Object.fromEntries(
  Object.entries(MOOD_TO_ID).map(([k, v]) => [v, k as MoodName])
);

// Mood prototype coordinates in circumplex space (mirrors affect_bridge.py)
export const MOOD_PROTOTYPES: Record<MoodName, { v: number; a: number }> = {
  angry:       { v: -0.90, a:  0.95 },
  exciting:    { v:  0.80, a:  0.95 },
  fear:        { v: -0.85, a:  0.85 },
  funny:       { v:  0.25, a:  0.55 },
  happy:       { v:  0.90, a:  0.70 },
  lazy:        { v: -0.35, a: -0.80 },
  magnificent: { v:  0.85, a:  0.10 },
  quiet:       { v: -0.10, a: -0.55 },
  romantic:    { v:  0.75, a:  0.05 },
  sad:         { v: -0.90, a: -0.70 },
  warm:        { v:  0.60, a:  0.25 },
};

export const moodThemes: Record<MoodName, MoodTheme> = {
  angry: {
    bg: '#0f0404',
    surface: '#1a0606',
    surfaceElevated: '#2d0a0a',
    accent: '#ef4444',
    accentSoft: '#7f1d1d',
    glow: '#fca5a540',
    text: '#fef2f2',
    textMuted: '#fca5a5',
    border: '#7f1d1d60',
    emoji: '😡',
    label: 'Angry',
    gradientColors: ['#0f0404', '#2d0a0a', '#7f1d1d'],
  },
  exciting: {
    bg: '#0f0900',
    surface: '#1a1000',
    surfaceElevated: '#2d1c00',
    accent: '#f59e0b',
    accentSoft: '#78350f',
    glow: '#fde68a40',
    text: '#fffbeb',
    textMuted: '#fde68a',
    border: '#78350f60',
    emoji: '⚡',
    label: 'Exciting',
    gradientColors: ['#0f0900', '#2d1c00', '#78350f'],
  },
  fear: {
    bg: '#050008',
    surface: '#0a0012',
    surfaceElevated: '#16001f',
    accent: '#9333ea',
    accentSoft: '#3b0764',
    glow: '#d8b4fe40',
    text: '#faf5ff',
    textMuted: '#d8b4fe',
    border: '#3b076460',
    emoji: '😨',
    label: 'Fear',
    gradientColors: ['#050008', '#16001f', '#3b0764'],
  },
  funny: {
    bg: '#030800',
    surface: '#061200',
    surfaceElevated: '#0d2200',
    accent: '#84cc16',
    accentSoft: '#365314',
    glow: '#d9f99d40',
    text: '#f7fee7',
    textMuted: '#d9f99d',
    border: '#36531460',
    emoji: '😄',
    label: 'Funny',
    gradientColors: ['#030800', '#0d2200', '#365314'],
  },
  happy: {
    bg: '#0f0a00',
    surface: '#1a1100',
    surfaceElevated: '#2d1e00',
    accent: '#facc15',
    accentSoft: '#713f12',
    glow: '#fef08a40',
    text: '#fefce8',
    textMuted: '#fef08a',
    border: '#713f1260',
    emoji: '😊',
    label: 'Happy',
    gradientColors: ['#0f0a00', '#2d1e00', '#713f12'],
  },
  lazy: {
    bg: '#060809',
    surface: '#0c1217',
    surfaceElevated: '#1e2937',
    accent: '#94a3b8',
    accentSoft: '#1e293b',
    glow: '#cbd5e140',
    text: '#f1f5f9',
    textMuted: '#94a3b8',
    border: '#1e293b80',
    emoji: '😴',
    label: 'Lazy',
    gradientColors: ['#060809', '#0c1217', '#1e293b'],
  },
  magnificent: {
    bg: '#040012',
    surface: '#08001f',
    surfaceElevated: '#12003b',
    accent: '#8b5cf6',
    accentSoft: '#2e1065',
    glow: '#c4b5fd40',
    text: '#faf5ff',
    textMuted: '#c4b5fd',
    border: '#2e106560',
    emoji: '✨',
    label: 'Magnificent',
    gradientColors: ['#040012', '#12003b', '#2e1065'],
  },
  quiet: {
    bg: '#000810',
    surface: '#00101e',
    surfaceElevated: '#001d38',
    accent: '#60a5fa',
    accentSoft: '#1e3a5f',
    glow: '#bfdbfe40',
    text: '#eff6ff',
    textMuted: '#bfdbfe',
    border: '#1e3a5f60',
    emoji: '🌙',
    label: 'Quiet',
    gradientColors: ['#000810', '#001d38', '#1e3a5f'],
  },
  romantic: {
    bg: '#0f0009',
    surface: '#1a0012',
    surfaceElevated: '#2d0020',
    accent: '#f472b6',
    accentSoft: '#831843',
    glow: '#fbcfe840',
    text: '#fdf2f8',
    textMuted: '#fbcfe8',
    border: '#83184360',
    emoji: '💕',
    label: 'Romantic',
    gradientColors: ['#0f0009', '#2d0020', '#831843'],
  },
  sad: {
    bg: '#01010f',
    surface: '#02021a',
    surfaceElevated: '#05053b',
    accent: '#6366f1',
    accentSoft: '#1e1b4b',
    glow: '#c7d2fe40',
    text: '#eef2ff',
    textMuted: '#c7d2fe',
    border: '#1e1b4b60',
    emoji: '😔',
    label: 'Sad',
    gradientColors: ['#01010f', '#05053b', '#1e1b4b'],
  },
  warm: {
    bg: '#0f0500',
    surface: '#1a0a00',
    surfaceElevated: '#2d1200',
    accent: '#fb923c',
    accentSoft: '#7c2d12',
    glow: '#fed7aa40',
    text: '#fff7ed',
    textMuted: '#fed7aa',
    border: '#7c2d1260',
    emoji: '🌅',
    label: 'Warm',
    gradientColors: ['#0f0500', '#2d1200', '#7c2d12'],
  },
};

// Default theme when no mood detected yet
export const defaultTheme: MoodTheme = {
  bg: '#07070f',
  surface: '#0f0f1e',
  surfaceElevated: '#16162d',
  accent: '#7c3aed',
  accentSoft: '#2e1065',
  glow: '#7c3aed30',
  text: '#f1f5f9',
  textMuted: '#64748b',
  border: '#ffffff10',
  emoji: '🎵',
  label: 'MAESTRO',
  gradientColors: ['#07070f', '#0f0f1e', '#16162d'],
};
