import { JOB_KINDS } from '@robes/core';
import { z } from 'zod';

// One catalogue for web, native and server (infrastructure.md §9). Props are ids, counts and
// enums only (SEC-83): never names, emails, free text, prompts or photo URLs. Legacy names from
// legacy-features.md §5.3 are reused as each feature lands; keep their property keys identical.
const none = z.object({}).strict();

export const EVENTS = {
  $pageview: none,
  onboarding_completed: none,
  job_started: z.object({ kind: z.enum(JOB_KINDS) }).strict(),
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
