import { CONSENT_KINDS } from '@robes/core';
import { describe, expect, it } from 'vitest';
import { Consents, ErrorBody, ErrorCode, HealthOutput, UpdateConsentsInput } from './index';

describe('contracts', () => {
  it('accepts a well-formed error body', () => {
    expect(
      ErrorBody.parse({
        error: { code: 'invalid_input', message: 'Check the highlighted fields.', requestId: 'r1' },
      }),
    ).toBeTruthy();
  });
  it('has the codes the API spec lists', () => {
    expect(ErrorCode.options).toEqual([
      'unauthenticated',
      'forbidden',
      'not_found',
      'invalid_input',
      'conflict',
      'payload_too_large',
      'rate_limited',
      'quota_exceeded',
      'capacity',
      'disabled',
      'upgrade_required',
      'internal',
    ]);
  });
  it('health is literally ok', () => {
    expect(() => HealthOutput.parse({ ok: false })).toThrow();
  });
});

describe('me contracts', async () => {
  const { UpdateMeInput } = await import('./me');
  it('only accepts editable fields and trims names', () => {
    expect(UpdateMeInput.parse({ firstName: '  Niall ', onboardedAt: 'x' })).toEqual({
      firstName: 'Niall',
    });
    expect(() => UpdateMeInput.parse({ firstName: '' })).toThrow();
    expect(() => UpdateMeInput.parse({ instagramHandle: 'bad handle' })).toThrow();
  });
});

describe('job contracts', async () => {
  const { JobSnapshot } = await import('./jobs');
  const snapshot = {
    id: '6f1d7e38-5a55-4f43-9d6b-6f0c4d7f2a10',
    kind: 'fake',
    status: 'running',
    stage: 'text',
    output: { text: { title: 'T', lines: ['a'] }, prompt: 'never sent' },
    error: null,
    cancelRequested: false,
    createdAt: '2026-09-24T10:00:00.000Z',
    updatedAt: '2026-09-24T10:00:01.000Z',
    finishedAt: null,
    userId: '0b8f6a0e-3c1f-4d9b-8a57-2d2b6f9e4c11',
  };

  it('strips fields the client must not see', () => {
    const parsed = JobSnapshot.parse(snapshot);
    expect(parsed).not.toHaveProperty('userId');
    expect(parsed.output).toEqual({ text: { title: 'T', lines: ['a'] } });
  });

  it('keeps a partial key_piece result, including a frame that failed without an asset', () => {
    const way = {
      eyebrow: 'Day',
      title: 'Off duty',
      outfit: 'o',
      details: 'd',
      accessories: 'a',
      tags: [],
    };
    const output = {
      ideaId: '1b8f6a0e-3c1f-4d9b-8a57-2d2b6f9e4c11',
      fallback: false,
      wearer: 'woman',
      ways: [way, way, way],
      images: [
        { idx: 0, status: 'ready', assetId: '2b8f6a0e-3c1f-4d9b-8a57-2d2b6f9e4c11' },
        { idx: 1, status: 'failed', assetId: null },
      ],
    };
    const parsed = JobSnapshot.parse({ ...snapshot, kind: 'key_piece', status: 'partial', output });
    expect(parsed.output).toEqual({
      ...output,
      ways: output.ways.map((w) => ({ ...w, pieces: [] })),
    });
  });

  it('rejects unknown statuses and kinds', () => {
    expect(() => JobSnapshot.parse({ ...snapshot, status: 'paused' })).toThrow();
    expect(() => JobSnapshot.parse({ ...snapshot, kind: 'mystery' })).toThrow();
  });

  it('covers every consent kind and refuses empty, unknown or email-sourced updates', () => {
    expect(Object.keys(Consents.shape)).toEqual([...CONSENT_KINDS]);
    const ok = UpdateConsentsInput.safeParse({ source: 'web', consents: { analytics: true } });
    expect(ok.success).toBe(true);
    for (const bad of [
      { source: 'web', consents: {} },
      { source: 'web', consents: { tracking: true } },
      { source: 'email', consents: { marketing_email: false } },
      { source: 'web', consents: { analytics: 'yes' } },
    ]) {
      expect(UpdateConsentsInput.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
    }
  });
});
