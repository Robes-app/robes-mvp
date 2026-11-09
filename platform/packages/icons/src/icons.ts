// One source for every icon: 24×24 line drawings stroked with currentColor, rendered by
// web.tsx (DOM SVG) and native.tsx (react-native-svg). Add icons here only. Where the Felix Design
// System draws an icon (platform/design/felix/assets/Icons), its drawing is the one used here:
// lookbook is `book`, diary is `plan`, edit is `pencil`, and Felix's chevron is `forward`.
export const ICONS = {
  // The Home tab: Felix's open house, roof and walls. `sun` stays for the weather line.
  home: ['M3 10.5 12 3l9 7.5', 'M5 9.3V21h14V9.3'],
  wardrobe: [
    'M12 4.2a1.9 1.9 0 1 0 1.4 3.2',
    'M12 7.6 3.6 14.2a1.4 1.4 0 0 0 .9 2.5h15a1.4 1.4 0 0 0 .9-2.5L12 7.6z',
  ],
  looks: [
    'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z',
    'M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z',
  ],
  // The Lookbook tab: Felix's book, a spine down the middle. `looks` stays the sparkle.
  book: [
    'M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1 -1.5 1.5h-14a1.5 1.5 0 0 1 -1.5 -1.5v-12a1.5 1.5 0 0 1 1.5 -1.5z',
    'M12 4.5v15',
  ],
  plan: [
    'M5 5h14a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1 -1.5 1.5h-14a1.5 1.5 0 0 1 -1.5 -1.5v-12a1.5 1.5 0 0 1 1.5 -1.5z',
    'M3.5 10h17',
    'M8 3v4M16 3v4',
  ],
  plus: ['M12 5v14M5 12h14'],
  // The stepper's step down (the Size drawer), the plus's twin.
  minus: ['M5 12h14'],
  cloud: ['M7 18.5h10.5a3.75 3.75 0 0 0 .4-7.48A5.5 5.5 0 0 0 7.3 9.6 4.45 4.45 0 0 0 7 18.5z'],
  // The weather line's conditions (@robes/core/weather weatherIcon; beta's _rbWxSvg). `cloud` is overcast.
  sun: [
    'M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0',
    'M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4',
  ],
  partCloud: [
    'M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    'M8 3v1.5M3 9h1.5M4.5 5.5l1 1',
    'M9 19h8.5a3 3 0 0 0 .3-6 4.5 4.5 0 0 0-8.6-1.2A3.5 3.5 0 0 0 9 19z',
  ],
  fog: ['M4 10h16M4 14h16M6 18h12'],
  rain: ['M3 12a9 9 0 0 1 18 0z', 'M12 12v6.5a2 2 0 0 1-4 0'],
  snow: [
    'M7 14h9.5a3 3 0 0 0 .3-6 4.5 4.5 0 0 0-8.6-1.2A3.5 3.5 0 0 0 7 14z',
    'M9 18.5h.01M13 20h.01M16 18.5h.01',
  ],
  thunder: [
    'M7 14h9.5a3 3 0 0 0 .3-6 4.5 4.5 0 0 0-8.6-1.2A3.5 3.5 0 0 0 7 14z',
    'M12 14l-2 4h3l-1.5 3.5',
  ],
  close: ['M6 6l12 12M18 6L6 18'],
  back: ['M15 5l-7 7 7 7'],
  forward: ['M9 6l6 6-6 6'],
  down: ['M6 9l6 6 6-6'],
  check: ['M20 6 9 17 4 12'],
  search: ['M5 11a6 6 0 1 0 12 0a6 6 0 1 0 -12 0', 'M15.5 15.5 20 20'],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5'],
  camera: ['M3 8h4l2-3h6l2 3h4v11H3z', 'M8.5 13a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0'],
  image: [
    'M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13z',
    'M4 16l4.5-4.5 4 4 2.5-2.5L20 18',
    'M15.5 9.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  ],
  link: [
    'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1',
    'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  ],
  mail: [
    'M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-11z',
    'M4.5 6.5 12 12l7.5-5.5',
  ],
  ask: [
    'M5 5.5A1.5 1.5 0 0 1 6.5 4h11A1.5 1.5 0 0 1 19 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4 4v-4h-.5A1.5 1.5 0 0 1 4 14.5v-9',
  ],
  trip: [
    'M5 8.5A1.5 1.5 0 0 1 6.5 7h11A1.5 1.5 0 0 1 19 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5v-9z',
    'M9 7V5h6v2M9 11v4M15 11v4',
  ],
  trash: ['M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12'],
  undo: ['M9 14 4 9l5-5', 'M4 9h10a6 6 0 0 1 0 12h-3'],
  more: ['M6 12h.01M12 12h.01M18 12h.01'],
  alert: ['M12 3 2.5 20h19L12 3z', 'M12 10v4M12 17h.01'],
  star: ['M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.7l5.9-.9z'],
  filter: ['M4 7h16M7 12h10M10 17h4'],
  // The Front Door's Filter button (PRD rev 3 §2.5): two sliders with their knobs.
  sliders: [
    'M4 8h9M17 8h3',
    'M13 5.5a2.5 2.5 0 1 0 4 0a2.5 2.5 0 1 0 -4 0',
    'M4 16h3M11 16h9',
    'M7 13.5a2.5 2.5 0 1 0 4 0a2.5 2.5 0 1 0 -4 0',
  ],
  sort: ['M7 4v16', 'M3 8l4-4 4 4', 'M17 20V4', 'M21 16l-4 4-4-4'],
  grid: ['M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'],
  list: ['M4 6h16M4 12h16M4 18h16'],
  pencil: ['M4 20h4L19 9l-4-4L4 16z'],
  thumbsUp: [
    'M7 11v9H4v-9h3z',
    'M7 11l4-7a2 2 0 0 1 2 2.5L12.5 10H18a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16.8 20H7',
  ],
  thumbsDown: [
    'M7 13V4H4v9h3z',
    'M7 13l4 7a2 2 0 0 0 2-2.5L12.5 14H18a2 2 0 0 0 2-2.3l-1.2-6A2 2 0 0 0 16.8 4H7',
  ],
  // The look surfaces: ♡ a proposal to the wishlist, ↻ swap or re-style, the prompt's send arrow.
  // The palette's avoid verb (legacy .pf-ctl): a ringed slash, never a cross on its own.
  avoid: ['M20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0', 'M6 6l12 12'],
  heart: ['M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z'],
  swap: ['M20 12a8 8 0 1 1-2.35-5.65', 'M20 4v5h-5'],
  // A face in a frame: the selfie, as against the camera that logs a look (redlines 2026-11-05).
  selfie: [
    'M4 8V5a1 1 0 0 1 1-1h3',
    'M16 4h3a1 1 0 0 1 1 1v3',
    'M20 16v3a1 1 0 0 1-1 1h-3',
    'M8 20H5a1 1 0 0 1-1-1v-3',
    'M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    'M7.5 17.5a5 5 0 0 1 9 0',
  ],
  // Two arrows round: redraw (the twin's retake).
  refresh: [
    'M20 11a8 8 0 0 0-14.3-4.9L4 8',
    'M4 3.5V8h4.5',
    'M4 13a8 8 0 0 0 14.3 4.9L20 16',
    'M20 20.5V16h-4.5',
  ],
  send: ['M12 19V5', 'M6 11l6-6 6 6'],
  // A row that leaves the app ↗ (Privacy notice, terms).
  external: ['M7 17L17 7', 'M8 7h9v9'],
  // The diary home (Front Door design 3k): the bell, the prompt's place pin, a receipt to review.
  bell: ['M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z', 'M10 20.5a2 2 0 0 0 4 0'],
  pin: ['M12 21s-6-6-6-11a6 6 0 0 1 12 0c0 5-6 11-6 11z', 'M10 10a2 2 0 1 0 4 0a2 2 0 1 0 -4 0'],
  receipt: ['M6 3h12v18l-3-2-3 2-3-2-3 2z', 'M9 8h6M9 12h6'],
  // Felix Design System (2026-11-06): the Draft Look's actions, the Details rows' tag, the
  // season picker and the alerts' calendar.
  capture: [
    'M3.5 8.5A1.5 1.5 0 0 1 5 7h2.5l1.6-2.2h5.8L16.5 7H19a1.5 1.5 0 0 1 1.5 1.5V18A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18z',
    'M8.6 13a3.4 3.4 0 1 0 6.8 0a3.4 3.4 0 1 0 -6.8 0',
  ],
  describe: [
    'M10 3C10.6 7.6 12.4 9.4 17 10C12.4 10.6 10.6 12.4 10 17C9.4 12.4 7.6 10.6 3 10C7.6 9.4 9.4 7.6 10 3Z',
  ],
  tag: ['M3 12V4h8l10 10-8 8z', 'M6.2 8.5a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0'],
  calendar: [
    'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2z',
    'M3 10h18',
  ],
  spring: [
    'M12 21v-9',
    'M12 12C12 8 9 5 5 5c0 4 3 7 7 7z',
    'M12 10c0-3.3 2.7-6 6-6c0 3.3-2.7 6-6 6z',
  ],
  summer: [
    'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z',
    'M12 2v2M12 20v2M2 12h2M20 12h2',
    'M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  ],
  autumn: ['M5 19C5 11 10 5 20 4c-1 10-7 15-15 15z', 'M5 19l8-8'],
  winter: ['M12 2v20', 'M3.3 7l17.4 10M3.3 17l17.4-10', 'M9 4l3 2 3-2M9 20l3-2 3 2'],
} as const satisfies Record<string, readonly string[]>;

export type IconName = keyof typeof ICONS;
// Shapes drawn solid as well as stroked, by name (Felix's `describe`: the small sparkle is filled).
export const ICON_SOLID: Partial<Record<IconName, readonly string[]>> = {
  describe: [
    'M18 15C18.2 17.1 18.9 17.8 21 18C18.9 18.2 18.2 18.9 18 21C17.8 18.9 17.1 18.2 15 18C17.1 17.8 17.8 17.1 18 15Z',
  ],
};
export const ICON_NAMES = Object.keys(ICONS) as IconName[];
export const ICON_VIEWBOX = '0 0 24 24';
export const ICON_STROKE_WIDTH = 1.5;

// The four tab glyphs, in tab order. The native tab bar is the system's own, so these ship as
// template PNGs (mobile/assets/tabs): after changing one, run `pnpm --filter @robes/icons
// gen:tab-images` (mobile/__tests__/tab-icons.test.ts fails until you do).
export const TAB_ICONS = [
  'home',
  'book',
  'plan',
  'wardrobe',
] as const satisfies readonly IconName[];
