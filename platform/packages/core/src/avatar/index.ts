// Her model (legacy stylenotes.html mapper + server parseAvatarId): a deterministic cell id from
// presence, skin, hair, figure and two optional nudges. The id is the contract the cell catalog,
// renders and the notifier share; the swatches are data for the pickers, not design tokens.
export const SKIN_SWATCHES = [
  '#3B2A22',
  '#5A3B2A',
  '#7A5238',
  '#95664A',
  '#B78A63',
  '#D0A47F',
  '#E3BE9C',
  '#F0D6BE',
] as const;
export const HAIR_SWATCHES = ['#1B1614', '#3A2A20', '#6B4A2E', '#A9793F', '#CBAE87'] as const;
export const FIGURES = ['hg', 'pe', 're', 'it', 'ap', 'nt'] as const;
export type Figure = (typeof FIGURES)[number];
export type Presence = 'woman' | 'man' | 'unspecified';
export type LineNudge = 'soft' | 'straight';
export type FrameNudge = 'fuller' | 'narrower';

// Legacy fallbacks when nothing has been read: skin s3, hair h1, neutral figure.
export const DEFAULT_SKIN = 3;
export const DEFAULT_HAIR = 1;

// Bumping this re-generates every cell (the art direction is versioned in the storage key only).
export const CELL_STYLE = 'v2';

const BODY_TO_FIGURE: Record<string, Figure> = {
  Hourglass: 'hg',
  Pear: 'pe',
  Rectangle: 're',
  'Inverted Triangle': 'it',
  Apple: 'ap',
};

export function figureFromBodyType(bodyType: string | null | undefined): Figure {
  return (bodyType && BODY_TO_FIGURE[bodyType]) || 'nt';
}

function rgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  return m
    ? [
        Number.parseInt(m[1] ?? '0', 16),
        Number.parseInt(m[2] ?? '0', 16),
        Number.parseInt(m[3] ?? '0', 16),
      ]
    : null;
}

// The swatch nearest a read colour (legacy nearestIdx), or the fallback when there's no read.
export function nearestIndex(hex: unknown, swatches: readonly string[], fallback: number): number {
  const target = typeof hex === 'string' ? rgb(hex) : null;
  if (!target) return fallback;
  let best = fallback;
  let bestDistance = Number.POSITIVE_INFINITY;
  swatches.forEach((s, i) => {
    const c = rgb(s);
    if (!c) return;
    const d = (c[0] - target[0]) ** 2 + (c[1] - target[1]) ** 2 + (c[2] - target[2]) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  });
  return best;
}

export interface ModelPicks {
  skin?: number | undefined;
  hair?: number | undefined;
  line?: LineNudge | null | undefined;
  frame?: FrameNudge | null | undefined;
}

export interface ModelReads {
  skinHex?: string | null | undefined;
  hairHex?: string | null | undefined;
  bodyType?: string | null | undefined;
}

export interface ResolvedModel {
  presence: Presence;
  skin: number;
  hair: number;
  figure: Figure;
  line: LineNudge | null;
  frame: FrameNudge | null;
  // Legacy stage eyebrow: read from photographs, part read part chosen, or chosen by hand.
  source: 'read' | 'mixed' | 'hand';
  cellId: string;
}

// Hand picks win over reads; reads win over the fallbacks.
export function resolveModel(
  presence: Presence,
  picks: ModelPicks,
  reads: ModelReads,
): ResolvedModel {
  const skin = picks.skin ?? nearestIndex(reads.skinHex, SKIN_SWATCHES, DEFAULT_SKIN);
  const hair = picks.hair ?? nearestIndex(reads.hairHex, HAIR_SWATCHES, DEFAULT_HAIR);
  const figure = figureFromBodyType(reads.bodyType);
  const line = picks.line ?? null;
  const frame = picks.frame ?? null;
  const anyRead = Boolean(reads.skinHex || reads.hairHex || reads.bodyType);
  const anyPick =
    picks.skin !== undefined || picks.hair !== undefined || line !== null || frame !== null;
  const source = anyRead && anyPick ? 'mixed' : anyRead ? 'read' : 'hand';
  return {
    presence,
    skin,
    hair,
    figure,
    line,
    frame,
    source,
    cellId: formatCellId({ presence, skin, hair, figure, line, frame }),
  };
}

// `{w|m}-s{0-7}-h{0-4}-{fig}[-l{l|r}][-f{l|r}]`; 'unspecified' rides the woman catalog (legacy).
export function formatCellId(m: {
  presence: Presence;
  skin: number;
  hair: number;
  figure: Figure;
  line: LineNudge | null;
  frame: FrameNudge | null;
}): string {
  const nudges = [
    m.line === 'soft' ? 'll' : m.line === 'straight' ? 'lr' : null,
    m.frame === 'fuller' ? 'fl' : m.frame === 'narrower' ? 'fr' : null,
  ].filter(Boolean);
  return [
    `${m.presence === 'man' ? 'm' : 'w'}`,
    `s${m.skin}`,
    `h${m.hair}`,
    m.figure,
    ...nudges,
  ].join('-');
}

const CELL_ID = /^([wm])-s([0-7])-h([0-4])-(hg|pe|re|it|ap|nt)((?:-(?:ll|lr|fl|fr))*)$/;

export interface ParsedCell {
  gender: 'woman' | 'man';
  skin: number;
  hair: number;
  figure: Figure;
  nudges: ('ll' | 'lr' | 'fl' | 'fr')[];
}

export function parseCellId(id: string): ParsedCell | null {
  const m = CELL_ID.exec(id);
  if (!m) return null;
  return {
    gender: m[1] === 'm' ? 'man' : 'woman',
    skin: Number(m[2]),
    hair: Number(m[3]),
    figure: m[4] as Figure,
    nudges: (m[5] ?? '').split('-').filter(Boolean) as ParsedCell['nudges'],
  };
}

// The catalog row key: the cell id plus the art direction it was drawn in.
export const cellKey = (cellId: string): string => `${cellId}@${CELL_STYLE}`;

// Three Robes models for an account with no model of her own (legacy GENERIC_CELLS, 2026-10-17):
// the k-th look of a set stands on the k-th, so the three ways read as three people; `m-` for a man.
const GENERIC_CELLS = ['s4-h1-nt', 's1-h0-nt', 's7-h3-nt'] as const;
export function genericCellIds(wearer: 'woman' | 'man'): string[] {
  return GENERIC_CELLS.map((c) => `${wearer === 'man' ? 'm' : 'w'}-${c}`);
}
export function genericCellId(wearer: 'woman' | 'man', index: number): string {
  const ids = genericCellIds(wearer);
  return ids[((index % ids.length) + ids.length) % ids.length] ?? ids[0] ?? '';
}
