import { JOB_KINDS, LEGACY_CATEGORIES } from '@robes/core';
import { ADD_DESTINATIONS } from '@robes/core/add-flow';
import { HOME_STEPS } from '@robes/core/home';
import { BALANCES, LOOK_STATUSES } from '@robes/core/looks';
import { z } from 'zod';

// One catalogue for web, native and server (infrastructure.md §9). Props are ids, counts, booleans
// and enums only (SEC-83): never names, labels, brands, emails, free text, prompts or photo URLs —
// beta's `out`/`in`/`label` piece names are dropped on purpose. Names are beta's (legacy
// `_rbTrack`, legacy-app-history.md) so the funnels read the same; keep their keys where the
// platform has the same act. Both clients call `track` from the twin of each surface.
const none = z.object({}).strict();
const count = z.number().int().min(0);
const status = z.enum(LOOK_STATUSES);
const category = z.enum(LEGACY_CATEGORIES);
// Where a look prompt sits (a look in each state, a day page), and where a new-look box sits:
// home, or the create box (the Lookbook, Create, a piece page).
const askSurface = z.enum(['suggested', 'draft', 'saved', 'day']);
const boxSurface = z.enum(['home', 'create']);
const askIntent = z.enum(['swap', 'back', 'rule', 'styled', 'clarify', 'draft', 'none']);

export const EVENTS = {
  // A page is shown (web, after consent).
  $pageview: none,
  // Server: onboarding is finished (me.onboarding.complete).
  onboarding_completed: none,
  // Server: a generation job is queued.
  job_started: z.object({ kind: z.enum(JOB_KINDS) }).strict(),

  // Onboarding: a step is shown, answered, or skipped (Skip anyway).
  onboarding_step: z
    .object({
      step: z.enum(['name', 'piece']),
      outcome: z.enum(['shown', 'answered', 'skipped']),
    })
    .strict(),

  // Add pieces: the in-app camera opens.
  camera_opened: none,
  // Add pieces: the camera hands its shots to Review.
  camera_filed: z.object({ n: count }).strict(),
  // Review: she answers one piece Robes read (Add or Skip; `edited` when she changed a field).
  piece_answered: z.object({ state: z.enum(['add', 'skip']), edited: z.boolean() }).strict(),
  // Review: a photo's (or a link's) answered pieces are filed.
  pieces_filed: z
    .object({
      source: z.enum(['photo', 'link']),
      n: count,
      skipped: count,
      to: z.enum(ADD_DESTINATIONS),
    })
    .strict(),
  // A piece lands in her wardrobe or wishlist, one event per piece.
  wardrobe_added: z
    .object({
      source: z.enum(['photo', 'link', 'hand', 'onboarding']),
      batch_n: count,
      batch_i: count,
    })
    .strict(),

  // The wardrobe sheet opens to swap a piece or add one.
  swap_drawer_opened: z.object({ mode: z.enum(['swap', 'add']) }).strict(),
  // The look editor: a piece is swapped in (`surface` is the look's state).
  piece_swapped: z.object({ surface: status, cat: category }).strict(),
  // The look editor: a piece is added to the rack.
  look_piece_added: z.object({ surface: status, cat: category }).strict(),
  // The look editor: a row is taken off the rack.
  look_piece_removed: z.object({ surface: status }).strict(),
  // The look editor: Update commits a saved look's edits.
  look_updated: z.object({ pieces: count }).strict(),
  // Save: a suggestion or a draft becomes a saved look.
  look_created: z
    .object({
      from: z.enum(['suggested', 'draft']),
      pieces: count,
      proposed: count,
      anchored: z.boolean(),
    })
    .strict(),
  // The diary sheet: a look is pinned to a day (0 today, negative never — that is a wear).
  look_pinned: z.object({ offset_from_today: z.number().int() }).strict(),
  // The diary sheet: a wear is recorded (today or a day gone by).
  wear_confirmed: z
    .object({ source: z.enum(['diary']), pieces: count, offset_from_today: z.number().int() })
    .strict(),
  // A look's record of wears: one wear is deleted.
  wear_undone: none,

  // The look prompt opens on a look.
  look_prompt_opened: z.object({ surface: askSurface }).strict(),
  // The look prompt: she sends an ask (`chars` counts her words; `from_draft` sends Robes' wording).
  look_prompt_sent: z
    .object({ surface: askSurface, chars: count, from_draft: z.boolean() })
    .strict(),
  // The look prompt: Robes' answer changed rows on the rack.
  look_prompt_applied: z.object({ surface: askSurface, intent: askIntent, slots: count }).strict(),
  // The look prompt folds (×), after `turns` asks.
  look_prompt_closed: z.object({ surface: askSurface, turns: count }).strict(),

  // The new-look box: a look is asked for (a piece, or her words), and whether the ask was taken.
  prompt_submitted: z
    .object({
      surface: boxSurface,
      intent: z.enum(['piece', 'words']),
      scope: z.enum(['day', 'none']),
      ok: z.boolean(),
    })
    .strict(),
  // The box holds her ask to ask where its pieces come from.
  balance_asked: z.object({ surface: boxSurface, piece: z.boolean() }).strict(),
  // She answers it (`words` when she wrote her own answer).
  balance_answered: z
    .object({ surface: boxSurface, balance: z.enum([...BALANCES, 'words']) })
    .strict(),

  // Home: a step card (O1–O4) is shown.
  home_module_view: z.object({ id: z.enum(HOME_STEPS) }).strict(),
  // Home: Later on a step card.
  home_module_later: z.object({ id: z.enum(HOME_STEPS) }).strict(),
  // Home: a row on the map of steps is tapped.
  home_row_tapped: z.object({ step: z.enum(HOME_STEPS), done: z.boolean() }).strict(),
  // Home O3: one of the wardrobe's bulk routes is taken.
  catalogue_route: z.object({ route: z.enum(['snap', 'receipt']) }).strict(),
  // Home O4: the first look is started from the picked piece.
  first_look_started: z.object({ piece_id: z.uuid() }).strict(),
  // Home: her first look composed from her own pieces is saved (seen on home).
  first_look_saved: none,
  // Home: the wardrobe and first-look steps are both done (seen on home).
  home_activated: none,
} as const;

export type EventName = keyof typeof EVENTS;
export type EventProps<E extends EventName> = z.input<(typeof EVENTS)[E]>;
// Events without props may omit the argument.
export type PropsArg<E extends EventName> =
  Record<string, never> extends EventProps<E> ? [props?: EventProps<E>] : [props: EventProps<E>];

export type ParsedEvent =
  | { ok: true; event: EventName; properties: Record<string, unknown> }
  | { ok: false; reason: 'unknown_event' | 'invalid_props' };

function isEventName(event: string): event is EventName {
  return Object.hasOwn(EVENTS, event);
}

// Runtime twin of the types, for untyped callers (native bridges, tests, casts).
export function parseEvent(event: string, props: unknown = {}): ParsedEvent {
  if (!isEventName(event)) return { ok: false, reason: 'unknown_event' };
  const parsed = EVENTS[event].safeParse(props);
  if (!parsed.success) return { ok: false, reason: 'invalid_props' };
  return { ok: true, event, properties: parsed.data };
}
