import { z } from 'zod';

// The draft route's address (/looks/draft/:id): a look, or `new` before the first piece; the
// piece it starts from, the day it is for, and the sheet to open with.
export const DraftParams = z.object({ id: z.union([z.literal('new'), z.uuid()]) });
export const DraftSearch = z
  .object({
    pieceId: z.uuid().optional(),
    day: z.iso.date().optional(),
    sheet: z.enum(['adjust', 'describe']).optional(),
  })
  .catch({});
