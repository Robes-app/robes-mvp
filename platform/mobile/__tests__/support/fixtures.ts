import type { Idea, Look, Piece, StyleDna } from '@robes/contracts';
import { HAIR_SWATCHES, SKIN_SWATCHES } from '@robes/core/avatar';

export const PIECE_ID = '33333333-3333-4333-8333-333333333333';
export const ASSET_ID = '44444444-4444-4444-8444-444444444444';
export const IDEA_ID = '55555555-5555-4555-8555-555555555555';
export const LOOK_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const JOB_ID = '66666666-6666-4666-8666-666666666666';

const NOW = '2026-09-24T10:00:00.000Z';

export function piece(overrides: Partial<Piece> = {}): Piece {
  return {
    id: PIECE_ID,
    label: 'Camel wool coat',
    category: 'Outerwear',
    categoryL2: 'Coats',
    categoryL3: null,
    color: 'Camel',
    colourShade: 'camel',
    colourExtra: [],
    print: null,
    material: null,
    colourCheck: false,
    materialCheck: false,
    brand: null,
    notes: null,
    status: 'ready',
    heroPosition: null,
    seasonBand: 'autumn_winter',
    wearFor: ['Everyday'],
    price: null,
    currency: null,
    size: null,
    wearCount: 0,
    image: {
      assetId: ASSET_ID,
      status: 'ready',
      width: 1080,
      height: 1350,
      blurhash: null,
      renditions: [
        { width: 320, avif: 'http://m.test/320.avif', webp: 'http://m.test/320.webp' },
        { width: 640, avif: 'http://m.test/640.avif', webp: 'http://m.test/640.webp' },
      ],
    },
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

const way = (n: number) => ({
  eyebrow: `Way ${n}`,
  title: `Look ${n}`,
  outfit: `Outfit ${n}`,
  details: `Details ${n}`,
  accessories: `Accessories ${n}`,
  tags: [],
  pieces: [],
  scene: '',
});

export function idea(overrides: Partial<Idea> = {}): Idea {
  return {
    id: IDEA_ID,
    title: 'Camel wool coat',
    subtitle: 'Look 1 · Look 2 · Look 3',
    anchor: { type: 'piece', pieceId: PIECE_ID, label: 'Camel wool coat' },
    fallback: false,
    wearer: 'woman',
    ways: [way(1), way(2), way(3)],
    frames: [0, 1, 2].map((idx) => ({
      idx,
      status: 'ready' as const,
      image: piece().image,
    })),
    jobId: JOB_ID,
    savedAt: null,
    expiresAt: '2026-10-24T10:00:00.000Z',
    createdAt: NOW,
    ...overrides,
  };
}

export function look(overrides: Partial<Look> = {}): Look {
  return {
    id: LOOK_ID,
    status: 'saved',
    name: 'Weekend navy',
    nameProvisional: false,
    note: null,
    source: 'composer',
    originLookId: null,
    climateBand: 'year_round',
    image: null,
    photo: null,
    model: null,
    record: 'model',
    frame: false,
    framePending: false,
    composedByRobes: false,
    pieces: [{ piece: piece(), slot: null, role: null }],
    proposals: [],
    styling: {},
    edits: {},
    anchor: null,
    setId: null,
    setIndex: null,
    dateHint: null,
    timesWorn: 2,
    lastWornOn: '2026-09-01',
    pinnedOn: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export const LINE_ID = '77777777-7777-4777-8777-777777777777';
export const NOTICE_ID = '88888888-8888-4888-8888-888888888888';

// You › Style DNA as the API returns it; nothing answered unless overridden.
export function styleDna(overrides: Partial<StyleDna> = {}): StyleDna {
  return {
    types: [],
    brands: [],
    icons: [],
    investment: null,
    facts: {
      heightCm: null,
      sizeUk: null,
      shoeUk: null,
      ageBand: null,
      bustBand: null,
      bustCup: null,
      bustCm: null,
      waistCm: null,
    },
    gender: 'woman',
    pieces: [],
    brief: { loves: [], avoids: [], rules: [], notes: '', colours: { loved: [], rejected: [] } },
    observations: [],
    readAt: NOW,
    readDue: false,
    ...overrides,
  };
}

// Her model as me.model.get answers it (shared by the twin and look tests).
export const modelData = (over: object = {}) => ({
  filed: false,
  presence: 'woman',
  skin: 3,
  hair: 1,
  line: null,
  frame: null,
  source: 'hand',
  reads: { colour: false, silhouette: false },
  cellId: 'w-s3-h1-nt',
  cell: { status: 'none', imageUrl: null },
  swatches: { skin: [...SKIN_SWATCHES], hair: [...HAIR_SWATCHES] },
  skinSet: false,
  hairSet: false,
  adj: { shoulders: null, bust: null, hips: null },
  closeUpUrl: null,
  twin: { status: 'none', current: false, imageUrl: null },
  ...over,
});
