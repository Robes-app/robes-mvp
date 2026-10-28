import 'server-only';
import type { Home, HomePiece } from '@robes/contracts';
import {
  firstLookCandidates,
  HOME_NOTICED_AFTER,
  HOME_STEPS,
  type HomeStep,
  styleConfirmed,
} from '@robes/core/home';
import type { UserId } from '@robes/db';
import { toImage } from './asset-urls';
import { repos } from './db';
import { loadInbox } from './inbox';
import { toLooks } from './looks-entity';
import { mediaDelivery } from './media';

type Profile = NonNullable<Awaited<ReturnType<typeof repos.profiles.get>>>;

const chips = (list: readonly string[] | null | undefined): string[] =>
  (list ?? []).filter((x) => x.trim()).slice(0, 3);

function snoozes(raw: unknown): Home['state']['snoozed'] {
  const out: Home['state']['snoozed'] = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const step of HOME_STEPS as readonly HomeStep[]) {
    const at = (raw as Record<string, unknown>)[step];
    if (typeof at === 'string' && Number.isFinite(Date.parse(at))) out[step] = at;
  }
  return out;
}

// Everything the modular home paints, read once with Today (legacy _rbHomeState + the modules).
export async function loadHome(userId: UserId, profile: Profile, savedCount: number) {
  const [pics, ownLook, hasModel, style, inbox, saved, suggested] = await Promise.all([
    repos.wardrobe.photographed(userId),
    repos.looks.hasOwnLook(userId),
    repos.model.hasModel(userId),
    repos.styleProfile.get(userId),
    loadInbox(userId),
    repos.looks.list(userId, { limit: 4, status: 'saved' }),
    repos.looks.list(userId, { limit: 4, status: 'suggested' }),
  ]);
  const rows = {
    brands: chips(profile.styleBrands),
    icons: chips(profile.styleIcons),
    styles: chips(profile.styleArchetypes),
  };

  const wears = await repos.wardrobe.wearCounts(
    userId,
    pics.rows.map((r) => r.id),
  );
  const ranked = firstLookCandidates(
    pics.rows.map((r) => ({
      ...r,
      wearCount: wears.get(r.id) ?? 0,
      createdAt: r.createdAt.toISOString(),
    })),
  );
  const shown = [...pics.rows.slice(0, 4), ...ranked];
  const assets = new Map(
    (
      await repos.assets.getManyForUser(
        userId,
        shown.flatMap((r) => (r.imageAssetId ? [r.imageAssetId] : [])),
      )
    ).map((a) => [a.id, a]),
  );
  const toPiece = async (r: (typeof shown)[number]): Promise<HomePiece> => {
    const asset = r.imageAssetId ? assets.get(r.imageAssetId) : undefined;
    return {
      id: r.id,
      label: r.label,
      brand: r.brand,
      image: asset ? await toImage(mediaDelivery, userId, asset) : null,
    };
  };

  // Robes noticed waits for three saved looks; the first line still waiting.
  let noticed: Home['noticed'] = null;
  if (savedCount >= HOME_NOTICED_AFTER) {
    const dna = await repos.styleDna.get(userId);
    const line = dna.lines.find((l) => l.state === 'pending');
    if (line) noticed = { id: line.id, text: line.text };
  }

  const held = inbox.items;
  const receipts: Home['receipts'] = held.length
    ? {
        receipts: held.length,
        pieces: held.reduce((n, r) => n + r.items.length, 0),
        retailer: held.length === 1 ? (held[0]?.retailer ?? null) : null,
      }
    : null;

  return {
    state: {
      styleConfirmed: styleConfirmed(rows, profile.styleConfirmedAt),
      // A model on file, or a colour or line read of her.
      twinOnFile: hasModel || Boolean(style?.season || style?.bodyType),
      pics: pics.total,
      ownLookSaved: ownLook,
      anyLook: savedCount > 0,
      snoozed: snoozes(profile.homeSnoozes),
    },
    rows,
    recent: await Promise.all(pics.rows.slice(0, 4).map(toPiece)),
    candidates: await Promise.all(ranked.map(toPiece)),
    receipts,
    noticed,
    saved: await toLooks(userId, saved.items),
    suggested: await toLooks(userId, suggested.items),
  } satisfies Home;
}
