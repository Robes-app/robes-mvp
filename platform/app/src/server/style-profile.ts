import 'server-only';
import { ApiError } from '@robes/api';
import {
  type AnalyseStyleInput,
  ColourProfile,
  SilhouetteProfile,
  type StartJobOutput,
  StyleProfile,
} from '@robes/contracts';
import type { UserId } from '@robes/db';
import { z } from 'zod';
import { repos } from './db';
import { startJob } from './jobs';

type Row = Awaited<ReturnType<typeof repos.styleProfile.get>>;

const Overrides = z.object({
  loved_colors: z.array(z.string()).catch([]).default([]),
  rejected_colors: z.array(z.string()).catch([]).default([]),
  measurements: z.record(z.string(), z.string()).catch({}).default({}),
});

// Stored renders that no longer match the contract read as "not analysed" rather than failing.
export function toStyleProfile(row: Row): StyleProfile {
  const overrides = Overrides.parse(row?.userOverrides ?? {});
  return StyleProfile.parse({
    colour: ColourProfile.safeParse(row?.colourRender).data ?? null,
    silhouette: SilhouetteProfile.safeParse(row?.silhouetteRender).data ?? null,
    overrides: {
      lovedColors: overrides.loved_colors,
      rejectedColors: overrides.rejected_colors,
      measurements: overrides.measurements,
    },
    updatedAt: row?.updatedAt.toISOString() ?? null,
  });
}

const PHOTO_KIND = { colour: 'headshot', silhouette: 'full_length' } as const;

export async function analyseStyle(
  userId: UserId,
  req: Request,
  input: AnalyseStyleInput,
): Promise<StartJobOutput> {
  if (await repos.capacity.isExhausted(['gemini-flash'])) throw new ApiError('capacity');
  const asset = await repos.assets.getForUser(userId, input.assetId);
  if (!asset || asset.kind !== PHOTO_KIND[input.kind] || asset.status === 'failed') {
    throw new ApiError('not_found');
  }
  return startJob(userId, req, {
    kind: 'stylenotes_analyse',
    input,
    quota: { metric: 'analyse.photo', cost: 1 },
  });
}
