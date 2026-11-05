// Dynamic Type caps (mobile.md §3): text scales with the OS setting up to these multipliers.
export const maxFontSizeMultiplier = {
  body: 2,
  label: 1.6,
  control: 1.5,
  heading: 1.4,
} as const;

// Families loaded by the app with expo-font (@expo-google-fonts/*).
export const fonts = {
  sans: 'Inter_300Light',
  sansRegular: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  display: 'Cormorant_300Light',
  displayRegular: 'Cormorant_400Regular',
  displayItalic: 'Cormorant_300Light_Italic',
  displayRegularItalic: 'Cormorant_400Regular_Italic',
} as const;

export const HEADING_MIN_SIZE = 17;
export const MIN_TOUCH = 44;
// A toast with an action (Undo) stays at least this long; a plain one leaves after the default.
// Twin of web toast.tsx ACTION_MIN_DURATION / DEFAULT_DURATION.
export const TOAST_MIN_DURATION = 6000;
export const TOAST_DEFAULT_DURATION = 4000;

// Draft (digital twin redlines, 2026-11-05): the smallest caps line — an eyebrow at 9/500, 0.2em
// (1.8pt), in the faint ink (`text-ink-faint` on the element). Web twin: `app-caps` in globals.css.
export const appCaps = { fontFamily: fonts.sansMedium, fontSize: 9, letterSpacing: 1.8 } as const;
