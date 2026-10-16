// Dynamic Type caps (mobile.md §3): text scales with the OS setting up to these multipliers.
export const maxFontSizeMultiplier = {
  body: 2,
  label: 1.6,
  control: 1.5,
  heading: 1.4,
} as const;

// Families loaded by the app with expo-font (@expo-google-fonts/*).
export const fonts = {
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  display: 'Cormorant_300Light',
  displayRegular: 'Cormorant_400Regular',
} as const;

export const HEADING_MIN_SIZE = 17;
export const MIN_TOUCH = 44;
export const TOAST_MIN_DURATION = 6000;
