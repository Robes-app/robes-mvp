import type { Idea, Look, Piece } from '@robes/contracts';

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
    brand: null,
    notes: null,
    status: 'ready',
    heroPosition: null,
    seasonBand: 'autumn_winter',
    price: null,
    currency: null,
    size: null,
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
    name: 'Weekend navy',
    nameProvisional: false,
    note: null,
    source: 'composer',
    originLookId: null,
    climateBand: 'year_round',
    pieces: [{ piece: piece(), slot: null, role: null }],
    timesWorn: 2,
    lastWornOn: '2026-09-01',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}
