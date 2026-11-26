import { ApiError } from '@robes/api';
import { type ConsentAnswers, type UserId, verifiedUserId } from '@robes/db';
import { describe, expect, it } from 'vitest';
import { type ConsentDeps, getConsents, hasAnalyticsConsent, updateConsents } from './consents';

const ALICE = verifiedUserId('11111111-1111-4111-8111-111111111111');
const BOB = verifiedUserId('22222222-2222-4222-8222-222222222222');

// In-memory stand-in for the append-only table: rows per user, latest wins.
function fakes() {
  const rows: Array<{ userId: UserId; answers: ConsentAnswers; source: string }> = [];
  const deps: ConsentDeps = {
    consents: {
      async record(userId, answers, source) {
        rows.push({ userId, answers, source });
        return answers;
      },
      async current(userId) {
        return Object.assign({}, ...rows.filter((r) => r.userId === userId).map((r) => r.answers));
      },
    },
  };
  return { deps, rows };
}

describe('consents', () => {
  it('reports unanswered kinds as null', async () => {
    const { deps } = fakes();
    expect(await getConsents(deps, ALICE)).toEqual({
      analytics: null,
      replay: null,
      marketing_email: null,
      photo_analysis: null,
      look_sharing: null,
      recordings: null,
      full_recordings: null,
    });
  });

  it('records an answer for the caller only and returns the merged state', async () => {
    const { deps, rows } = fakes();
    const out = await updateConsents(deps, ALICE, { source: 'web', consents: { analytics: true } });
    expect(out.analytics).toBe(true);
    expect(rows).toEqual([{ userId: ALICE, answers: { analytics: true }, source: 'web' }]);
    expect((await getConsents(deps, BOB)).analytics).toBeNull();
    expect(await hasAnalyticsConsent(deps, ALICE)).toBe(true);
    expect(await hasAnalyticsConsent(deps, BOB)).toBe(false);
  });

  it('refuses replay without analytics', async () => {
    const { deps, rows } = fakes();
    const err = await updateConsents(deps, ALICE, {
      source: 'web',
      consents: { replay: true },
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('invalid_input');
    expect(rows).toEqual([]);
    const both = await updateConsents(deps, ALICE, {
      source: 'ios',
      consents: { analytics: true, replay: true },
    });
    expect(both).toMatchObject({ analytics: true, replay: true });
  });

  it('refuses recordings without analytics, and keeps an older replay yes apart', async () => {
    const { deps, rows } = fakes();
    const err = await updateConsents(deps, ALICE, {
      source: 'web',
      consents: { recordings: true },
    }).catch((e: unknown) => e);
    expect((err as ApiError).code).toBe('invalid_input');
    expect(rows).toEqual([]);
    // A yes to masked recordings (an older phone build) never reads as a yes to her words.
    await updateConsents(deps, ALICE, {
      source: 'ios',
      consents: { analytics: true, replay: true },
    });
    expect(await getConsents(deps, ALICE)).toMatchObject({ replay: true, recordings: null });
    const out = await updateConsents(deps, ALICE, {
      source: 'web',
      consents: { recordings: true },
    });
    expect(out).toMatchObject({ analytics: true, replay: true, recordings: true });
  });

  it('keeps a yes to recordings with photos hidden apart from one with her photos', async () => {
    const { deps, rows } = fakes();
    const err = await updateConsents(deps, ALICE, {
      source: 'web',
      consents: { full_recordings: true },
    }).catch((e: unknown) => e);
    expect((err as ApiError).code).toBe('invalid_input');
    expect(rows).toEqual([]);
    // A yes to the earlier wording (an older phone build) never reads as a yes to her photos.
    await updateConsents(deps, ALICE, {
      source: 'ios',
      consents: { analytics: true, recordings: true },
    });
    expect(await getConsents(deps, ALICE)).toMatchObject({
      recordings: true,
      full_recordings: null,
    });
    const out = await updateConsents(deps, ALICE, {
      source: 'ios',
      consents: { full_recordings: true },
    });
    expect(out).toMatchObject({ analytics: true, recordings: true, full_recordings: true });
  });

  it('withdraws every recording answer when analytics is withdrawn', async () => {
    const { deps, rows } = fakes();
    await updateConsents(deps, ALICE, {
      source: 'web',
      consents: { analytics: true, recordings: true, full_recordings: true },
    });
    await updateConsents(deps, ALICE, { source: 'web', consents: { analytics: false } });
    expect(rows.at(-1)?.answers).toEqual({
      analytics: false,
      recordings: false,
      full_recordings: false,
    });
  });

  it('withdraws both recording answers when analytics is withdrawn', async () => {
    const { deps, rows } = fakes();
    await updateConsents(deps, ALICE, {
      source: 'web',
      consents: { analytics: true, replay: true, recordings: true },
    });
    const out = await updateConsents(deps, ALICE, {
      source: 'android',
      consents: { analytics: false },
    });
    expect(out).toMatchObject({ analytics: false, replay: false, recordings: false });
    expect(rows.at(-1)?.answers).toEqual({ analytics: false, replay: false, recordings: false });
  });

  it('withdraws replay when analytics is withdrawn', async () => {
    const { deps, rows } = fakes();
    await updateConsents(deps, ALICE, {
      source: 'web',
      consents: { analytics: true, replay: true },
    });
    const out = await updateConsents(deps, ALICE, {
      source: 'web',
      consents: { analytics: false },
    });
    expect(out).toMatchObject({ analytics: false, replay: false });
    expect(rows.at(-1)?.answers).toEqual({ analytics: false, replay: false });
    expect(await hasAnalyticsConsent(deps, ALICE)).toBe(false);
  });
});
