import { z } from 'zod';

// The draft route's address (/looks/draft/:id): a look, or `new` before the first piece; the
// piece it starts from, the day it is for, and image mode to open with.
export const DraftParams = z.object({ id: z.union([z.literal('new'), z.uuid()]) });
export const DraftSearch = z
  .object({
    pieceId: z.uuid().optional(),
    day: z.iso.date().optional(),
    // Home's image stack (3k): the drawer opens in image mode on Add a photo (D19).
    images: z.literal('add').optional(),
    // New Look › From pieces (Front Door PRD rev 3 §5.5): a new draft with the piece picker up.
    pick: z.literal('1').optional(),
  })
  .catch({});
