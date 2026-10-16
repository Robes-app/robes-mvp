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

// Replay rides on analytics: it can't be granted without it and goes when analytics goes.
export async function updateConsents(
  deps: ConsentDeps,
  userId: UserId,
  input: UpdateConsentsInput,
): Promise<Consents> {
  const current = await deps.consents.current(userId);
  const answers: ConsentAnswers = { ...input.consents };
  if (answers.replay === true && (answers.analytics ?? current.analytics) !== true) {
    throw new ApiError('invalid_input', {
      details: [{ path: 'consents.replay', message: 'needs analytics consent' }],
    });
  }
  if (answers.analytics === false && answers.replay === undefined && current.replay === true) {
    answers.replay = false;
  }
  await deps.consents.record(userId, answers, input.source);
  return toConsents({ ...current, ...answers });
}

export async function hasAnalyticsConsent(deps: ConsentDeps, userId: UserId): Promise<boolean> {
  return (await deps.consents.current(userId)).analytics === true;
}
