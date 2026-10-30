// The logo wall (onboarding handoff, 30 Oct): each house set in type close to its own wordmark —
// never a logo file. A house without a mark takes the quiet default. Sizes and tracking were
// measured in the browser so each fits its tile on one line (redline audit, 30 Oct).
export type BrandMark = {
  face: 'serif' | 'sans';
  // Point size on a 66pt tile. Cormorant never below 17 (brand-and-design §3.1); long names set
  // in Inter instead.
  size: number;
  // Only the loaded faces: Inter 300–500, Cormorant 300–400 (app layout, expo-font).
  weight: 300 | 400 | 500;
  // Letter spacing in em.
  tracking: number;
  upper: boolean;
  italic: boolean;
  // The few names too long for one line at the floor size, set as a deliberate stack.
  lines: readonly string[] | null;
};

type Row = [
  face: 'serif' | 'sans',
  size: number,
  weight: BrandMark['weight'],
  tracking: number,
  upper: boolean,
  italic?: boolean,
];

export const BRAND_MARK_ROWS: Readonly<Record<string, Row>> = {
  // The handoff's eighteen, as drawn.
  Totême: ['sans', 11, 500, 0.22, true],
  COS: ['sans', 15, 500, 0.04, true],
  Arket: ['sans', 11, 400, 0.3, true],
  Ganni: ['serif', 21, 400, 0, false],
  Zara: ['serif', 17, 400, 0.28, true],
  Khaite: ['sans', 11, 500, 0.32, true],
  'The Row': ['serif', 18, 400, 0.04, true],
  Reformation: ['serif', 17, 400, 0, false, true],
  Jacquemus: ['sans', 10, 400, 0.24, true],
  Prada: ['sans', 13, 500, 0.16, true],
  'Miu Miu': ['serif', 18, 400, 0.04, false],
  Sézane: ['serif', 19, 300, 0, false, true],
  Celine: ['sans', 12, 500, 0.28, true],
  Loewe: ['serif', 17, 400, 0.24, true],
  Uniqlo: ['sans', 12, 500, 0.06, true],
  'Max Mara': ['serif', 17, 400, 0.04, false],
  Nanushka: ['serif', 19, 400, 0, false, true],
  Vince: ['sans', 11, 400, 0.34, true],
  // The archetype houses (30 Oct).
  Lemaire: ['sans', 11, 400, 0.3, true],
  'Studio Nicholson': ['sans', 10, 500, 0, false],
  'Jil Sander': ['sans', 11, 400, 0.2, true],
  Auralee: ['sans', 11, 500, 0.28, true],
  'Our Legacy': ['sans', 11, 500, 0.06, true],
  'Rick Owens': ['sans', 12, 500, 0.06, true],
  'Aimé Leon Dore': ['sans', 11, 500, 0, false],
  'Universal Works': ['sans', 11, 500, 0, false],
  'M&S Autograph': ['sans', 11, 500, 0, false],
  'Ralph Lauren': ['sans', 11, 500, 0.02, true],
  'Brunello Cucinelli': ['sans', 10, 500, 0, false],
  Zegna: ['serif', 17, 400, 0.3, true],
  Reiss: ['serif', 17, 400, 0.32, true],
  SuitSupply: ['sans', 12, 500, 0.02, false],
  'Tom Ford': ['sans', 12, 500, 0.22, true],
  'J.Crew': ['serif', 18, 400, 0.02, true],
  'Margaret Howell': ['sans', 10, 500, 0, false],
  '& Other Stories': ['sans', 11, 500, 0, false],
  Dôen: ['serif', 20, 400, 0.04, false],
  'Wales Bonner': ['sans', 10, 500, 0.04, true],
  Zimmermann: ['sans', 10, 500, 0.14, true],
  'Story mfg.': ['serif', 17, 400, 0, false, true],
  Bode: ['serif', 20, 400, 0.1, true],
  Marni: ['sans', 14, 500, 0.02, false],
  'Dries Van Noten': ['sans', 11, 500, 0, false],
  'Collina Strada': ['sans', 11, 500, 0, false],
  'Sandy Liang': ['sans', 12, 500, 0.04, false],
  'Comme des Garçons': ['sans', 11, 500, 0, false],
  'Craig Green': ['sans', 11, 500, 0.08, true],
  Gucci: ['serif', 17, 400, 0.12, true],
  Supreme: ['sans', 14, 500, 0, false, true],
  Stüssy: ['serif', 20, 400, 0, false, true],
  'Charles Jeffrey Loverboy': ['sans', 11, 500, 0, false],
  Telfar: ['sans', 13, 500, 0.2, true],
  'Vivienne Westwood': ['sans', 11, 500, 0, false],
  'Dr. Martens': ['sans', 13, 500, 0.02, false],
  Joules: ['serif', 19, 400, 0, false, true],
  Barbour: ['serif', 17, 400, 0.06, true],
  "Drake's": ['serif', 18, 400, 0.02, false],
  Belstaff: ['sans', 12, 500, 0.28, true],
  'Carhartt WIP': ['sans', 10, 500, 0.06, true],
  'Stone Island': ['sans', 10, 500, 0.1, true],
  'A-Cold-Wall*': ['sans', 10, 500, 0.08, true],
  Orslow: ['serif', 18, 400, 0.04, false],
  Dickies: ['sans', 15, 500, 0, false],
  Filson: ['serif', 17, 400, 0.2, true],
  Patagonia: ['serif', 17, 400, 0, false, true],
  'The North Face': ['sans', 11, 500, 0, false],
  "Levi's": ['sans', 15, 500, 0.02, false],
  'Uniqlo U': ['sans', 12, 500, 0.06, true],
};

export const DEFAULT_BRAND_MARK: BrandMark = {
  face: 'serif',
  size: 17,
  weight: 400,
  tracking: 0.02,
  upper: false,
  italic: false,
  lines: null,
};

// One line, never wrapped, inside a 375pt phone's tile (~90px); these three can't be at 10px,
// so they stack on purpose (Charles Jeffrey Loverboy's own mark is stacked).
const STACKED: Readonly<Record<string, readonly string[]>> = {
  'comme des garçons': ['Comme des', 'Garçons'],
  'vivienne westwood': ['Vivienne', 'Westwood'],
  'charles jeffrey loverboy': ['Charles Jeffrey', 'Loverboy'],
};

const BY_NAME = new Map(
  Object.entries(BRAND_MARK_ROWS).map(([name, [face, size, weight, tracking, upper, italic]]) => [
    name.trim().toLowerCase(),
    {
      face,
      size,
      weight,
      tracking,
      upper,
      italic: italic ?? false,
      lines: STACKED[name.trim().toLowerCase()] ?? null,
    } satisfies BrandMark,
  ]),
);

export const brandMark = (name: string): BrandMark =>
  BY_NAME.get(name.trim().toLowerCase().replace(/\s+/g, ' ')) ?? DEFAULT_BRAND_MARK;

export const hasBrandMark = (name: string): boolean =>
  BY_NAME.has(name.trim().toLowerCase().replace(/\s+/g, ' '));
