import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { FIXTURE_SQL, NIALL, W } from '../src/fixture-data';
import { legacyUuid } from '../src/ids';
import { type LegacyLookbookRow, reshapeLookbook, scrub, withAssets } from '../src/lookbook';

const ways = ['A', 'B', 'C'].map((title) => ({
  eyebrow: 'e',
  title,
  outfit: 'o',
  details: 'd',
  accessories: 'a',
  tags: [],
}));
const row = (type: string, data: unknown, title = 'navy blazer'): LegacyLookbookRow => ({
  id: '1720000000001',
  user_id: NIALL,
  type,
  title,
  subtitle: '',
  data,
  created_at: '2026-08-10T00:00:00Z',
  share_id: null,
  is_public: false,
});
const ctx = { ownedPieces: new Set([W.jeans]), wearer: 'woman' as const };

describe('lookbook reshaping', () => {
  it('turns a key piece with three ways into a saved idea the app reads', () => {
    const r = reshapeLookbook(
      row('key-piece', {
        kpData: { ways, generatedImages: ['https://c/0.jpg', null, 'data:image/png;base64,x'] },
      }),
      ctx,
    );
    if (!r) throw new Error('expected an idea');
    expect(r.type).toBe('idea');
    expect(r?.data).toMatchObject({ anchor: { type: 'text', label: 'navy blazer' }, ways });
    expect(r?.images).toEqual([{ idx: 0, url: 'https://c/0.jpg' }]);
    const data = withAssets(r, new Map([[0, legacyUuid('asset', NIALL, 'https://c/0.jpg')]]));
    expect(data.images).toEqual([{ idx: 0, assetId: expect.any(String), status: 'ready' }]);
  });

  it('keeps a malformed key piece as an archived blob instead of a broken idea', () => {
    expect(
      reshapeLookbook(row('key-piece', { kpData: { ways: [{ title: 'one' }] } }), ctx)?.type,
    ).toBe('key_piece');
  });

  it('normalises a daily look: step order, only her own pieces, valid palette, clean vibes', () => {
    const r = reshapeLookbook(
      row('daily-look', {
        dlData: {
          palette: ['#112233', 'red'],
          look_tags: { vibe: ['vibe:Polished'] },
          steps: [
            { title: 'The Canvas', items: [{ name: 'Tee', wardrobe_match: { id: W.coat } }] },
            { title: 'Bogus', items: [{ name: 'x' }] },
            {
              title: 'The Anchor',
              items: [{ name: 'Jeans', wardrobe_match: { id: W.jeans } }, {}, {}],
            },
          ],
        },
      }),
      ctx,
    );
    if (!r) throw new Error('expected a daily look');
    const look = (r.data as { look: Record<string, unknown> }).look as {
      steps: { title: string; items: { pieceId: string | null }[] }[];
      palette: string[];
      lookTags: { vibe: string[] };
    };
    expect(look.steps.map((s) => s.title)).toEqual(['The Anchor', 'The Canvas']);
    expect(look.steps[0]?.items).toHaveLength(2);
    expect(look.steps[0]?.items[0]?.pieceId).toBe(W.jeans);
    expect(look.steps[1]?.items[0]?.pieceId).toBeNull();
    expect(look.palette).toEqual(['#112233']);
    expect(look.lookTags.vibe).toEqual(['polished']);
  });

  it('drops look stubs and unknown types; unwraps and scrubs the rest', () => {
    expect(reshapeLookbook(row('look', {}), ctx)).toBeNull();
    expect(reshapeLookbook(row('mystery', {}), ctx)).toBeNull();
    const travel = reshapeLookbook(
      row('travel-edit', { tvData: { trip_label: 'Lisbon', jobId: 'j' } }),
      ctx,
    );
    expect(travel).toMatchObject({ type: 'travel_edit', data: { trip_label: 'Lisbon' } });
    expect(travel?.data).not.toHaveProperty('jobId');
    expect(scrub({ a: 'data:image/png;base64,AAA', b: ['ok'] })).toEqual({ a: null, b: ['ok'] });
  });

  it('derives stable ids the contracts accept', () => {
    const id = legacyUuid('artifact', NIALL, '1720000000001');
    expect(legacyUuid('artifact', NIALL, '1720000000001')).toBe(id);
    expect(z.uuid().safeParse(id).success).toBe(true);
    expect(FIXTURE_SQL).toContain(NIALL);
  });
});
