import 'server-only';
import { ApiError } from '@robes/api';
import type { Consents, UpdateConsentsInput } from '@robes/contracts';
import { CONSENT_KINDS } from '@robes/core';
import type { ConsentAnswers, Repositories, UserId } from '@robes/db';

export interface ConsentDeps {
  consents: Pick<Repositories['consents'], 'record' | 'current'>;
}

export function toConsents(answers: ConsentAnswers): Consents {
  return Object.fromEntries(CONSENT_KINDS.map((k) => [k, answers[k] ?? null])) as Consents;
}

export async function getConsents(deps: ConsentDeps, userId: UserId): Promise<Consents> {
  return toConsents(await deps.consents.current(userId));
}

// Recordings ride on analytics: they can't be granted without it and go when analytics goes.
// The older kinds ('replay', 'recordings'), still sent by older phone builds, keep the same rule.
const RECORDING_KINDS = ['full_recordings', 'recordings', 'replay'] as const;

export async function updateConsents(
  deps: ConsentDeps,
  userId: UserId,
  input: UpdateConsentsInput,
): Promise<Consents> {
  const current = await deps.consents.current(userId);
  const answers: ConsentAnswers = { ...input.consents };
  const analytics = answers.analytics ?? current.analytics;
  for (const kind of RECORDING_KINDS) {
    if (answers[kind] === true && analytics !== true) {
      throw new ApiError('invalid_input', {
        details: [{ path: `consents.${kind}`, message: 'needs analytics consent' }],
      });
    }
    if (answers.analytics === false && answers[kind] === undefined && current[kind] === true) {
      answers[kind] = false;
    }
  }
  await deps.consents.record(userId, answers, input.source);
  return toConsents({ ...current, ...answers });
}

export async function hasAnalyticsConsent(deps: ConsentDeps, userId: UserId): Promise<boolean> {
  return (await deps.consents.current(userId)).analytics === true;
}
