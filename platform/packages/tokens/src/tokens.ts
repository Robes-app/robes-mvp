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
  // Felix's worn mark on a past day (#A0927A), darkened to reach 3:1 on cream and white.
  warmPast: '#968973',
  warmPastDark: '#A0927A',
  // Felix's dashed edge on a piece still to find.
  warmDash: '#D9CBB7',
  // The base of Felix's sage washes (avatar disc, sage chips).
  sageTint: '#E3E1CC',
  // Felix's unread dot: never text.
  alert: '#D0342C',
  success: '#3F6B4C',
  successLight: '#7FB08E',
  // Felix's danger: error text on cream and the swipe-to-delete reveal (white label 5.3:1).
  danger: '#B5483A',
  dangerLight: '#E08A7E',
  // The Front Door's Shop toggle (PRD rev 3 §4.6): its on-state wash and its off-state track.
  shopOn: '#F6EEF0',
  switchOff: '#E4DCCD',
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
  // Felix Design System (2026-11-06). The warm family: the edge of chips, the today cell and an add
  // slot (`warm-line`), a past day's worn mark, and the dashed edge of a piece still to find.
  'warm-line',
  'warm-past',
  'warm-dash',
  // The unread dot.
  'alert',
  // Dims: behind a drawer (`backdrop`), a drawer behind a confirm (`backdrop-strong`), and the dark
  // glass disc on a photograph (`scrim`, white glyph).
  'backdrop',
  'backdrop-strong',
  'scrim',
  // Cream glass on a photograph: discs (`veil`), the light back and adjust discs (`veil-soft`), the
  // image stack's add card (`veil-paper`), the remove-image disc (`veil-mid`) and its × (`ink-mute`).
  'veil',
  'veil-soft',
  'veil-paper',
  'veil-mid',
  'ink-mute',
  // The top bar and the dock: their glass and the dock's edge.
  'nav-glass',
  'dock-glass',
  'dock-line',
  // Washes behind a rose or sage chip; `sage-mid` is the avatar disc.
  'rose-bg',
  'rose-mid',
  'sage-bg',
  'sage-mid',
  // The Shop toggle: the pill's wash while on, the switch track while off.
  'shop-on',
  'switch-off',
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
  'warm-line': 'warmLine',
  'warm-past': 'warmPast',
  'warm-dash': 'warmDash',
  alert: 'alert',
  backdrop: { base: 'ink', alpha: 0.28 },
  'backdrop-strong': { base: 'ink', alpha: 0.35 },
  scrim: { base: 'ink', alpha: 0.55 },
  veil: { base: 'cream50', alpha: 0.94 },
  'veil-soft': { base: 'cream50', alpha: 0.55 },
  'veil-paper': { base: 'cream50', alpha: 0.8 },
  'veil-mid': { base: 'cream50', alpha: 0.5 },
  'ink-mute': { base: 'ink', alpha: 0.6 },
  'nav-glass': { base: 'cream50', alpha: 0.9 },
  'dock-glass': { base: 'white', alpha: 0.7 },
  'dock-line': { base: 'cream300', alpha: 0.85 },
  'rose-bg': { base: 'mauve', alpha: 0.26 },
  'rose-mid': { base: 'mauve', alpha: 0.6 },
  'sage-bg': { base: 'sageTint', alpha: 0.4 },
  'sage-mid': { base: 'sageTint', alpha: 0.72 },
  'shop-on': 'shopOn',
  'switch-off': 'switchOff',
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
  // Felix has no dark theme yet: these are proposed, like the rest of this map.
  'warm-line': 'warmLineDark',
  'warm-past': 'warmPastDark',
  'warm-dash': 'warmLineDark',
  alert: 'dangerLight',
  backdrop: { base: 'ink', alpha: 0.6 },
  'backdrop-strong': { base: 'ink', alpha: 0.7 },
  scrim: { base: 'ink', alpha: 0.7 },
  veil: { base: 'ink800', alpha: 0.94 },
  'veil-soft': { base: 'ink800', alpha: 0.55 },
  'veil-paper': { base: 'ink800', alpha: 0.8 },
  'veil-mid': { base: 'ink800', alpha: 0.5 },
  'ink-mute': { base: 'cream50', alpha: 0.6 },
  'nav-glass': { base: 'ink', alpha: 0.9 },
  'dock-glass': { base: 'ink800', alpha: 0.7 },
  'dock-line': { base: 'cream50', alpha: 0.12 },
  'rose-bg': { base: 'mauve', alpha: 0.12 },
  'rose-mid': { base: 'mauve', alpha: 0.24 },
  'sage-bg': { base: 'sageTint', alpha: 0.12 },
  'sage-mid': { base: 'sageTint', alpha: 0.24 },
  'shop-on': 'ink800',
  'switch-off': { base: 'cream50', alpha: 0.2 },
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
  { fg: 'warm-past', bg: 'bg', min: 3 },
  { fg: 'warm-past', bg: 'surface', min: 3 },
  { fg: 'warm-past', bg: 'surface-raised', min: 3 },
  { fg: 'alert', bg: 'bg', min: 3 },
  { fg: 'alert', bg: 'surface-raised', min: 3 },
  { fg: 'surface-raised', bg: 'danger', min: 4.5 },
  // An active quick chip: the cream label on the deep rose (the Front Door's rose chip, D1).
  { fg: 'surface-raised', bg: 'accent-warm', min: 4.5 },
  { fg: 'ink', bg: 'shop-on', min: 4.5 },
];

export const font = {
  display: "var(--font-cormorant), 'Cormorant', Georgia, 'Times New Roman', serif",
  sans: "var(--font-inter), 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
} as const;

// Beta's steps (public/css/tokens.css): fields 8, home and Settings cards 14 (--rad-card), the
// bottom sheet's top edge 18 (.sheet / .rb-ps-sheet / .kp-sheet).
// Felix's names: rad-xs `xs`, rad-row `crisp`, rad-tile `tile`, rad-sm `sm`, rad-thumb `thumb`,
// rad `soft`, rad-card `card`, rad-lg `sheet`, rad-dock `dock`, rad-pill `pill`.
export const radius = {
  xs: '2px',
  crisp: '4px',
  tile: '6px',
  input: '8px',
  sm: '8px',
  thumb: '10px',
  soft: '12px',
  card: '14px',
  sheet: '18px',
  dock: '24px',
  pill: '999px',
} as const;

// Felix's shadows: things that float over the page or a photograph cast one; nothing else does.
// The web reads the CSS shadow (`shadow-float`); native takes the same shadow as style props.
export const shadow = {
  // A garment row on a look's rack (Front Door canvas, PRD §6.1): each row its own lifted card.
  row: '0 1px 2px rgba(32, 32, 33, 0.08), 0 4px 10px -4px rgba(32, 32, 33, 0.16)',
  // Action discs on the photo's edge: a soft lift, never a dark pool (Felix, 12 Nov).
  disc: '0 4px 10px -4px rgba(32, 32, 33, 0.18), 0 1px 2px rgba(32, 32, 33, 0.08)',
  // Home's ink Create disc stands a little further off the photo than its cream neighbours.
  'disc-primary': '0 8px 18px -6px rgba(32, 32, 33, 0.38), 0 2px 4px rgba(32, 32, 33, 0.12)',
  // White + discs and small floating buttons.
  float: '0 6px 16px -6px rgba(32, 32, 33, 0.30)',
  // Floating sheets and popovers.
  sheet: '0 18px 40px -14px rgba(32, 32, 33, 0.35)',
  modal: '0 18px 48px -18px rgba(32, 32, 33, 0.28)',
  // Centred confirm dialogs.
  dialog: '0 30px 60px -30px rgba(32, 32, 33, 0.5)',
} as const;
// Native can't spread a shadow inward, so each takes its offset, blur and opacity alone.
function nativeShadow(y: number, radius: number, opacity: number, elevation: number) {
  return {
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: y },
    shadowRadius: radius,
    shadowOpacity: opacity,
    elevation,
  };
}
export const shadowNative = {
  row: nativeShadow(2, 5, 0.12, 2),
  // Native has no negative spread, so the disc's lift is lighter still than the web's.
  disc: nativeShadow(2, 6, 0.12, 3),
  'disc-primary': nativeShadow(5, 12, 0.24, 6),
  float: nativeShadow(6, 16, 0.3, 6),
  sheet: nativeShadow(18, 40, 0.35, 10),
  modal: nativeShadow(18, 48, 0.28, 12),
  dialog: nativeShadow(30, 60, 0.5, 16),
} as const;

// Backdrop blur under glass: the top bar, the dock, and a scrim disc on a photograph.
export const blur = {
  nav: '16px',
  dock: '22px',
  disc: '8px',
} as const;

export { colorValue, semanticColor } from './value';

// Felix's type scale (platform/design/felix/tokens.json): Cormorant speaks, Inter labels. Sizes in
// px/pt, line heights as multiples, tracking in em. Caps styles are authored in sentence case.
// Cormorant never sets below 17, except `piece-name` at 15 (400, which holds at that size).
export type TypeStyle = {
  family: 'display' | 'sans';
  size: number;
  lineHeight: number;
  weight: 300 | 400 | 500;
  tracking?: number;
  italic?: boolean;
  caps?: boolean;
};

export const typeScale = {
  display: { family: 'display', size: 48, lineHeight: 1.05, weight: 300 },
  greeting: { family: 'display', size: 32, lineHeight: 1.05, weight: 300 },
  title: { family: 'display', size: 24, lineHeight: 1.15, weight: 300 },
  heading: { family: 'display', size: 22, lineHeight: 1.1, weight: 400 },
  'day-number': { family: 'display', size: 20, lineHeight: 1, weight: 400 },
  'italic-aside': { family: 'display', size: 17, lineHeight: 1.2, weight: 300, italic: true },
  'piece-name': { family: 'display', size: 15, lineHeight: 1.3, weight: 400, tracking: 0.01 },
  body: { family: 'sans', size: 13, lineHeight: 1.65, weight: 400 },
  meta: { family: 'sans', size: 11, lineHeight: 1.4, weight: 400 },
  eyebrow: { family: 'sans', size: 10, lineHeight: 1, weight: 500, tracking: 0.24, caps: true },
  label: { family: 'sans', size: 9, lineHeight: 1, weight: 500, tracking: 0.22, caps: true },
  category: { family: 'sans', size: 8.5, lineHeight: 1.3, weight: 500, tracking: 0.18, caps: true },
} as const satisfies Record<string, TypeStyle>;

export type TypeName = keyof typeof typeScale;
export const SERIF_FLOOR = 17;
