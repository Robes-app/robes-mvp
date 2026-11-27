import 'server-only';
import { Proposal } from '@robes/contracts';
import { z } from 'zod';

const Proposals = z.array(z.unknown()).catch([]);
// A proposal as legacy stored it (a shop row: the chosen option of a few, its role, saved = ♡).
const LegacyProposal = z.object({
  role: z.string().nullable().optional(),
  cats: z.array(z.string()).optional(),
  opts: z
    .array(
      z.looseObject({
        name: z.string(),
        brand: z.string().nullable().optional(),
        retailer_hint: z.string().nullable().optional(),
        price_point: z.string().nullable().optional(),
      }),
    )
    .min(1),
  oi: z.number().int().optional(),
  saved: z.boolean().optional(),
});
const LEGACY_ROLES: Record<string, Proposal['role']> = {
  'the canvas': 'canvas',
  'the anchor': 'anchor',
  'the texture': 'texture',
  'the exclamation point': 'exclamation',
};
// Stored rows are read leniently: a malformed one drops rather than failing the whole look.
export function proposalsOf(raw: unknown): Proposal[] {
  return Proposals.parse(raw ?? []).flatMap((p, i) => {
    const parsed = Proposal.safeParse(p);
    if (parsed.success) return [parsed.data];
    const legacy = LegacyProposal.safeParse(p);
    if (!legacy.success) return [];
    const opt = legacy.data.opts[legacy.data.oi ?? 0] ?? legacy.data.opts[0];
    const shaped = Proposal.safeParse({
      key: `p-legacy${i}`,
      name: opt?.name,
      category: legacy.data.cats?.[0] ?? 'Other',
      brand: opt?.brand ?? '',
      retailerHint: opt?.retailer_hint ?? '',
      pricePoint: opt?.price_point ?? '',
      role: LEGACY_ROLES[(legacy.data.role ?? '').toLowerCase()] ?? null,
      wishlisted: legacy.data.saved === true,
    });
    return shaped.success ? [shaped.data] : [];
  });
}
