import { DAILY_STEPS, IdeaWay } from '@robes/contracts';
import { z } from 'zod';

// Legacy lookbook rows → artifacts in today's shapes (reference/legacy-data-model.md §6.10 and the
// shapes table above it). Pure; transform.ts does the I/O.
export interface LegacyLookbookRow {
  id: string; // bigint as text
  user_id: string;
  type: string;
  title: string | null;
  subtitle: string | null;
  data: unknown;
  created_at: string | Date;
  share_id: string | null;
  is_public: boolean | null;
}

export type ArtifactType =
  | 'idea'
  | 'key_piece'
  | 'daily_look'
  | 'travel_edit'
  | 'moodboard'
  | 'weekly_plan_archived';

export interface Reshaped {
  type: ArtifactType;
  title: string;
  subtitle: string;
  // Frames/images by index; urls become cloudinary_legacy assets.
  images: { idx: number; url: string }[];
  // `images` entries inside data are filled with asset ids by the caller via `withAssets`.
  data: Record<string, unknown>;
}

export const LEGACY_TYPE_MAP: Record<string, ArtifactType | null> = {
  'key-piece': 'key_piece',
  'daily-look': 'daily_look',
  'travel-edit': 'travel_edit',
  moodboard: 'moodboard',
  'weekly-plan': 'weekly_plan_archived',
  'weekly-plan-archived': 'weekly_plan_archived',
  look: null, // empty client stubs: dropped
};

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isHttp = (v: unknown): v is string =>
  typeof v === 'string' && /^https?:\/\//.test(v) && v.length <= 2048;

// Drops inline base64 payloads and client job ids anywhere in the blob.
export function scrub(value: unknown): unknown {
  if (typeof value === 'string') return value.startsWith('data:') ? null : value;
  if (Array.isArray(value)) return value.map(scrub);
  if (isObj(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => k !== 'jobId' && k !== 'genId')
        .map(([k, v]) => [k, scrub(v)]),
    );
  }
  return value;
}

function frames(generated: unknown): { idx: number; url: string }[] {
  if (!Array.isArray(generated)) return [];
  return generated.flatMap((u, idx) => (isHttp(u) ? [{ idx, url: u }] : []));
}

const Ways = z.array(IdeaWay).length(3);

// A saved key piece whose three ways parse becomes a saved Idea the app shows; anything else is
// kept as an archived key_piece blob.
function keyPiece(row: LegacyLookbookRow, wearer: 'woman' | 'man'): Reshaped {
  const kp = isObj(row.data) && isObj(row.data.kpData) ? row.data.kpData : {};
  const ways = Ways.safeParse(kp.ways);
  const title = (row.title ?? '').trim() || 'Your piece';
  const images = frames(kp.generatedImages);
  if (!ways.success) {
    return {
      type: 'key_piece',
      title,
      subtitle: row.subtitle ?? '',
      images,
      data: scrub(kp) as Record<string, unknown>,
    };
  }
  return {
    type: 'idea',
    title,
    subtitle: ways.data.map((w) => w.title).join(' · '),
    images,
    data: {
      anchor: { type: 'text', label: title },
      fallback: kp.fallback === true,
      wearer,
      ways: ways.data,
      images: [],
      promptVersion: 0,
      legacy: true,
    },
  };
}

const HEX = /^#[0-9A-Fa-f]{6}$/;
const str = (v: unknown, max = 2000): string => (typeof v === 'string' ? v.slice(0, max) : '');

function dailyLook(row: LegacyLookbookRow, ownedPieces: ReadonlySet<string>): Reshaped {
  const dl = isObj(row.data) && isObj(row.data.dlData) ? row.data.dlData : {};
  const tags = isObj(dl.look_tags) ? dl.look_tags : {};
  const list = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  const byTitle = new Map(
    (Array.isArray(dl.steps) ? dl.steps : []).filter(isObj).map((s) => [s.title, s] as const),
  );
  const steps = DAILY_STEPS.flatMap((title) => {
    const step = byTitle.get(title);
    if (!step) return [];
    const items = (Array.isArray(step.items) ? step.items : []).filter(isObj).slice(0, 2);
    return [
      {
        title,
        items: items.map((it, i) => {
          const match = isObj(it.wardrobe_match) ? it.wardrobe_match : null;
          const pieceId =
            typeof match?.id === 'string' && ownedPieces.has(match.id) ? match.id : null;
          return {
            name: str(it.name, 120),
            category: str(it.category, 40),
            brand: str(it.brand, 80),
            how: str(it.how, 160),
            pieceId,
            retailerHint: str(it.retailer_hint, 80),
            pricePoint: str(it.price_point, 40),
            alternates: (Array.isArray(it.alternates) ? it.alternates : [])
              .filter(isObj)
              .slice(0, 3)
              .map((a) => ({
                name: str(a.name, 120),
                brand: str(a.brand, 80),
                retailerHint: str(a.retailer_hint, 80),
                pricePoint: str(a.price_point, 40),
              })),
            imageIndex: Number.isInteger(it.image_index) ? (it.image_index as number) : i,
          };
        }),
      },
    ];
  });
  return {
    type: 'daily_look',
    title: (row.title ?? '').trim() || str(dl.headline, 160) || 'Daily look',
    subtitle: row.subtitle ?? '',
    images: frames(dl.generatedImages),
    data: {
      look: {
        fallback: dl.fallback === true,
        occasionLabel: str(dl.occasion_label, 120),
        headline: str(dl.headline, 160),
        stylistSummary: str(dl.stylist_summary),
        transitionTip: str(dl.transition_tip),
        palette: list(dl.palette)
          .filter((h) => HEX.test(h))
          .slice(0, 3),
        lookTags: {
          climate: str(tags.climate, 40),
          wearFor: list(tags.wear_for).slice(0, 8),
          vibe: list(tags.vibe)
            .map((v) =>
              v
                .toLowerCase()
                .replace(/^vibe:/, '')
                .slice(0, 28),
            )
            .slice(0, 4),
        },
        steps,
      },
      weather: null,
      images: [],
      legacy: true,
    },
  };
}

function unwrap(row: LegacyLookbookRow, type: ArtifactType, key: string | null): Reshaped {
  const inner = key && isObj(row.data) && isObj(row.data[key]) ? row.data[key] : row.data;
  const data = scrub(isObj(inner) ? inner : {}) as Record<string, unknown>;
  return {
    type,
    title: (row.title ?? '').trim(),
    subtitle: row.subtitle ?? '',
    images: frames(data.generatedImages),
    data,
  };
}

export function reshapeLookbook(
  row: LegacyLookbookRow,
  ctx: { ownedPieces: ReadonlySet<string>; wearer: 'woman' | 'man' },
): Reshaped | null {
  const mapped = LEGACY_TYPE_MAP[row.type];
  if (!mapped) return null;
  switch (mapped) {
    case 'key_piece':
      return keyPiece(row, ctx.wearer);
    case 'daily_look':
      return dailyLook(row, ctx.ownedPieces);
    case 'travel_edit':
      return unwrap(row, mapped, 'tvData');
    case 'weekly_plan_archived':
      return unwrap(row, mapped, 'wkData');
    default:
      return unwrap(row, mapped, null);
  }
}

// Frames as the app stores them once asset ids exist (ideas + daily looks read `data.images`).
export function withAssets(
  r: Reshaped,
  assetIds: ReadonlyMap<number, string>,
): Record<string, unknown> {
  if (r.type !== 'idea' && r.type !== 'daily_look') return r.data;
  return {
    ...r.data,
    images: r.images.flatMap((f) => {
      const assetId = assetIds.get(f.idx);
      return assetId ? [{ idx: f.idx, assetId, status: 'ready' }] : [];
    }),
  };
}

// The public snapshot a legacy /board/<id> link keeps showing (whitelisted fields only).
export function shareSnapshot(r: Reshaped): Record<string, unknown> {
  const base = { v: 1, legacy: true, type: r.type, title: r.title, subtitle: r.subtitle };
  if (r.type === 'idea') return { ...base, ways: r.data.ways };
  if (r.type === 'daily_look' && isObj(r.data.look)) {
    const look = r.data.look;
    return { ...base, headline: look.headline, steps: look.steps };
  }
  return base;
}
