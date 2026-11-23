import 'server-only';
import type { SeedDrop } from '@robes/contracts';
import { frameKey, newProposalKey } from '@robes/core/looks';
import { seedPricePoint, seedStates } from '@robes/core/seeds';
import type { SeedLanding, UserId } from '@robes/db';
import { repos } from '../db';
import { todayIn } from '../plan';
import { XMAS_2026 } from './xmas-2026';

// Every drop there has been. A drop's file stays after it ends: it is what retires its looks.
export const DROPS: readonly SeedDrop[] = [XMAS_2026];

// A drop's looks as her account holds them: each piece a proposal priced in her currency.
export function landingsOf(drop: SeedDrop, currency: string): SeedLanding[] {
  return drop.looks.map((look) => {
    const proposals = look.pieces.map((p) => ({
      key: newProposalKey(),
      name: p.name,
      category: p.category,
      color: '',
      brand: p.brand,
      retailerHint: '',
      pricePoint: seedPricePoint(p.prices, currency),
      role: p.role,
      wishlisted: false,
      wishlistItemId: null,
      capture: null,
      url: p.url,
    }));
    return {
      lookId: look.lookId,
      name: look.name,
      tags: look.tags,
      seasons: look.seasons,
      image: look.image
        ? {
            catalogBase: `catalog/seeds/${drop.seedId}/${look.lookId}`,
            width: look.image.width,
            height: look.image.height,
            blurhash: look.image.blurhash,
            renditions: {
              v: 1,
              master: { width: look.image.width, height: look.image.height },
              widths: look.image.widths,
            },
          }
        : null,
      // The picture was made for exactly these pieces: a change she makes later marks it stale.
      frameKey: frameKey([], proposals, {}),
      proposals,
    };
  });
}

// Run before her looks are read: lands each live drop she has not had, and takes away the unsaved
// looks of every drop that has ended (in her calendar). Quiet when there is nothing to do.
export async function landSeeds(
  userId: UserId,
  now = new Date(),
  drops: readonly SeedDrop[] = DROPS,
): Promise<void> {
  const profile = await repos.profiles.get(userId);
  if (!profile) return;
  const { live, ended } = seedStates(drops, todayIn(profile.timezone, now));
  if (ended.length) await repos.seeds.retire(userId, ended);
  if (!live.length) return;
  const had = await repos.seeds.had(userId);
  for (const drop of drops) {
    if (!live.includes(drop.seedId) || had.has(drop.seedId)) continue;
    await repos.seeds.land(userId, drop.seedId, landingsOf(drop, profile.currency));
  }
}
