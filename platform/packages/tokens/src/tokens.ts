export const palette = {
  cream50: '#FAF8F5',
  cream100: '#F5F0E8',
  cream200: '#EFE9DC',
  cream300: '#E7E0CF',
  cream400: '#D8CFC0',
  white: '#FFFFFF',
  ink: '#202021',
  ink800: '#2A2A2B',
  ink900: '#252526',
  inkSoft: '#6E6A64',
  inkFaint: '#74664A',
  rose: '#8E7077',
  roseLight: '#B8969D',
  // The rose darkened for small text (eyebrow brands, "Never worn"): 4.5:1 on every cream.
  roseDeep: '#7A5D64',
  sage: '#7E7C5A',
  sageLight: '#A9A67E',
  mauve: '#D4C8C4',
  // The warm end of the sign-in ground (legacy signup.html).
  blush: '#E8D5D2',
  // A selection is the warm fill with the warm edge, never white (Annie, 27 Oct — reverses 25 Oct).
  warmFill: '#F3EFE6',
  warmLine: '#C9BCA6',
  warmLineDark: '#8A7F6C',
  success: '#3F6B4C',
  successLight: '#7FB08E',
  danger: '#8B3A30',
  dangerLight: '#E08A7E',
  mutedDark: '#B9B3A8',
  faintDark: '#A89E8C',
} as const;

export type PaletteKey = keyof typeof palette;
export type ColorRef = PaletteKey | { base: PaletteKey; alpha: number };

export const semanticNames = [
  'bg',
  'surface',
  'surface-sunk',
  // Beta's white cards: cards, fields, the prompt box, a selected chip or segment.
  'surface-raised',
  'ink',
  'ink-muted',
  'ink-faint',
  'accent-inspire',
  'accent-warm',
  'accent-plan',
  'accent-decor',
  'success',
  'danger',
  'focus-ring',
  'hairline',
  'border-control',
  // The fine edge of a labelled control (pill, + button, segment, prompt box): the label is the cue.
  'rule-mid',
  'selected',
  'selected-line',
  // Draft tokens from the digital twin redlines (2026-11-05), to be ratified by the design-system
  // overhaul: a translucent ground for controls over a photograph, the firmer card edge, and the
  // warm edge by the name the designs use (the same value as `selected-line`).
  'glass',
  'hairline-strong',
  'border-warm',
  // Draft: the dim behind a floating sheet (ink at 0.28, redlines 2026-11-05).
  'scrim',
] as const;

export type Semantic = (typeof semanticNames)[number];

export const light: Record<Semantic, ColorRef> = {
  bg: 'cream50',
  surface: 'cream100',
  'surface-sunk': 'cream200',
  'surface-raised': 'white',
  ink: 'ink',
  'ink-muted': 'inkSoft',
  'ink-faint': 'inkFaint',
  'accent-inspire': 'rose',
  'accent-warm': 'roseDeep',
  'accent-plan': 'sage',
  'accent-decor': 'mauve',
  success: 'success',
  danger: 'danger',
  'focus-ring': 'ink',
  hairline: { base: 'ink', alpha: 0.075 },
  'border-control': { base: 'ink', alpha: 0.5 },
  'rule-mid': { base: 'ink', alpha: 0.12 },
  selected: 'warmFill',
  'selected-line': 'warmLine',
  glass: { base: 'cream50', alpha: 0.94 },
  'hairline-strong': { base: 'ink', alpha: 0.12 },
  'border-warm': 'warmLine',
  scrim: { base: 'ink', alpha: 0.28 },
};

export const dark: Record<Semantic, ColorRef> = {
  bg: 'ink',
  surface: 'ink800',
  'surface-sunk': 'ink900',
  'surface-raised': 'ink800',
  ink: 'cream50',
  'ink-muted': 'mutedDark',
  'ink-faint': 'faintDark',
  'accent-inspire': 'roseLight',
  'accent-warm': 'roseLight',
  'accent-plan': 'sageLight',
  'accent-decor': 'mauve',
  success: 'successLight',
  danger: 'dangerLight',
  'focus-ring': 'cream50',
  hairline: { base: 'cream50', alpha: 0.1 },
  'border-control': { base: 'cream50', alpha: 0.4 },
  'rule-mid': { base: 'cream50', alpha: 0.16 },
  selected: 'ink800',
  'selected-line': 'warmLineDark',
  glass: { base: 'ink800', alpha: 0.94 },
  'hairline-strong': { base: 'cream50', alpha: 0.16 },
  'border-warm': 'warmLineDark',
  scrim: { base: 'ink', alpha: 0.6 },
};

// Accent colours are declared at 3:1 (large text, icons, fills only) per the brand guideline.
export const pairs: Array<{ fg: Semantic; bg: Semantic; min: number }> = [
  { fg: 'ink', bg: 'bg', min: 4.5 },
  { fg: 'ink', bg: 'surface', min: 4.5 },
  { fg: 'ink', bg: 'surface-sunk', min: 4.5 },
  { fg: 'ink-muted', bg: 'bg', min: 4.5 },
  { fg: 'ink-muted', bg: 'surface', min: 4.5 },
  { fg: 'ink-faint', bg: 'bg', min: 4.5 },
  { fg: 'ink-faint', bg: 'surface', min: 4.5 },
  { fg: 'ink-faint', bg: 'surface-sunk', min: 4.5 },
  { fg: 'ink', bg: 'surface-raised', min: 4.5 },
  { fg: 'ink-muted', bg: 'surface-raised', min: 4.5 },
  { fg: 'ink-faint', bg: 'surface-raised', min: 4.5 },
  { fg: 'accent-warm', bg: 'surface-raised', min: 4.5 },
  { fg: 'accent-inspire', bg: 'surface-raised', min: 3 },
  { fg: 'border-control', bg: 'surface-raised', min: 3 },
  { fg: 'accent-inspire', bg: 'bg', min: 3 },
  { fg: 'accent-inspire', bg: 'surface', min: 3 },
  { fg: 'accent-warm', bg: 'bg', min: 4.5 },
  { fg: 'accent-warm', bg: 'surface', min: 4.5 },
  { fg: 'accent-warm', bg: 'surface-sunk', min: 4.5 },
  { fg: 'accent-plan', bg: 'bg', min: 3 },
  { fg: 'accent-plan', bg: 'surface', min: 3 },
  { fg: 'success', bg: 'bg', min: 4.5 },
  { fg: 'success', bg: 'surface', min: 4.5 },
  { fg: 'danger', bg: 'bg', min: 4.5 },
  { fg: 'danger', bg: 'surface', min: 4.5 },
  { fg: 'border-control', bg: 'bg', min: 3 },
  { fg: 'border-control', bg: 'surface', min: 3 },
  { fg: 'focus-ring', bg: 'bg', min: 3 },
  { fg: 'ink', bg: 'selected', min: 4.5 },
];

export const font = {
  display: "var(--font-cormorant), 'Cormorant', Georgia, 'Times New Roman', serif",
  sans: "var(--font-inter), 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
} as const;

// Beta's steps (public/css/tokens.css): fields 8, home and Settings cards 14 (--rad-card), the
// bottom sheet's top edge 18 (.sheet / .rb-ps-sheet / .kp-sheet).
export const radius = {
  crisp: '4px',
  input: '8px',
  // Draft (digital twin redlines, 2026-11-05): the small tile.
  sm: '8px',
  soft: '12px',
  card: '14px',
  sheet: '18px',
  pill: '999px',
} as const;

// Draft (digital twin redlines, 2026-11-05): the lift under a control floating over a photograph.
// The web reads the CSS shadow (`shadow-float`); native takes the same shadow as style props.
export const shadow = {
  float: '0 6px 16px -6px rgba(32, 32, 33, 0.30)',
  // The floating sheet's lift off the scrim (redlines 2026-11-05).
  callout: '0 12px 32px -12px rgba(32, 32, 33, 0.35)',
} as const;
export const shadowNative = {
  float: {
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    shadowOpacity: 0.3,
    elevation: 6,
  },
  callout: {
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 32,
    shadowOpacity: 0.35,
    elevation: 10,
  },
} as const;

export { colorValue, semanticColor } from './value';
