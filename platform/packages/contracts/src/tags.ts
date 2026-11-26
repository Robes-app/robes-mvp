import { z } from 'zod';

// Her tags (tags cleanup, 26 Nov): one list shared by her looks and her pieces. The eight
// defaults are hers like any she typed (`isSeed` marks them, for the drawer's order); `looks` and
// `pieces` count what carries each, which the delete names before she confirms.
export const HerTag = z.object({
  id: z.uuid(),
  label: z.string(),
  isSeed: z.boolean(),
  createdAt: z.iso.datetime(),
  looks: z.number().int().min(0),
  pieces: z.number().int().min(0),
});
export type HerTag = z.infer<typeof HerTag>;

export const TagList = z.object({ items: z.array(HerTag) });
export type TagList = z.infer<typeof TagList>;

export const TagParams = z.object({ id: z.uuid() });
