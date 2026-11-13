import { type TypeName, type TypeStyle as TypeStyleToken, typeScale } from '@robes/tokens';
import type { TextStyle } from 'react-native';

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
  // Only home's Create disc label (Felix ActionDisc primary).
  sansSemiBold: 'Inter_600SemiBold',
  display: 'Cormorant_300Light',
  displayRegular: 'Cormorant_400Regular',
  displayItalic: 'Cormorant_300Light_Italic',
  displayRegularItalic: 'Cormorant_400Regular_Italic',
} as const;

export const HEADING_MIN_SIZE = 17;
// Felix's fine edge: 0.5pt `rule-mid` on cards, lists, outline buttons and unselected pills. As a
// style prop, since a 0.5pt width is not a class Uniwind is sure to draw.
export const FINE_EDGE = 0.5;
export const MIN_TOUCH = 44;
// A toast with an action (Undo) stays at least this long; a plain one leaves after the default.
// Twin of web toast.tsx ACTION_MIN_DURATION / DEFAULT_DURATION.
export const TOAST_MIN_DURATION = 6000;
export const TOAST_DEFAULT_DURATION = 4000;

// A Felix type style (@robes/tokens typeScale) as style props: the loaded face for its weight, the
// line height in points and the tracking in points. Web twin: the `type-<name>` utilities.
const face = {
  display: { 300: fonts.display, 400: fonts.displayRegular, 500: fonts.displayRegular },
  sans: { 300: fonts.sans, 400: fonts.sansRegular, 500: fonts.sansMedium },
} as const;

export function typeStyle(name: TypeName): TextStyle {
  const s: TypeStyleToken = typeScale[name];
  const fontFamily = s.italic
    ? s.weight === 300
      ? fonts.displayItalic
      : fonts.displayRegularItalic
    : face[s.family][s.weight];
  return {
    fontFamily,
    fontSize: s.size,
    lineHeight: Math.round(s.size * s.lineHeight * 10) / 10,
    letterSpacing: s.tracking ? Math.round(s.size * s.tracking * 100) / 100 : 0,
    ...(s.caps ? { textTransform: 'uppercase' as const } : null),
  };
}

// Felix's `label`: the smallest caps line, 9/500 at 0.22em. The colour rides on the element.
// Web twin: `app-caps` in globals.css.
const label = typeStyle('label');
export const appCaps = {
  fontFamily: label.fontFamily,
  fontSize: label.fontSize,
  letterSpacing: label.letterSpacing,
} as const;
