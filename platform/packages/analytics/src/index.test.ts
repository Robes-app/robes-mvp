import { describe, expect, it, vi } from 'vitest';
import { type AnalyticsSink, createAnalytics, EVENTS, parseEvent } from './index';

function sink() {
  return { capture: vi.fn(), identify: vi.fn(), reset: vi.fn() } satisfies AnalyticsSink;
}

describe('event catalogue', () => {
  it('rejects unknown events and props at the type level', () => {
    const s = sink();
    const analytics = createAnalytics(s);
    analytics.track('$pageview');
    analytics.track('job_started', { kind: 'fake' });
    // @ts-expect-error unknown event
    analytics.track('look_shared_everywhere');
    // @ts-expect-error props outside the catalogue (PII) are a type error
    analytics.track('job_started', { kind: 'fake', email: 'niall@example.com' });
    // @ts-expect-error required props can't be omitted
    analytics.track('job_started');
    // @ts-expect-error enum values are checked
    analytics.track('job_started', { kind: 'anything' });
    expect(s.capture.mock.calls).toEqual([
      ['$pageview', {}],
      ['job_started', { kind: 'fake' }],
    ]);
  });

  it('rejects unknown events and props at runtime and reports why', () => {
    const onInvalid = vi.fn();
    const s = sink();
    const track = createAnalytics(s, onInvalid).track as (e: string, p?: unknown) => void;
    track('nope');
    track('job_started', { kind: 'fake', firstName: 'Niall' });
    track('onboarding_completed', { prompt: 'a red dress' });
    expect(s.capture).not.toHaveBeenCalled();
    expect(onInvalid.mock.calls).toEqual([
      ['nope', 'unknown_event'],
      ['job_started', 'invalid_props'],
      ['onboarding_completed', 'invalid_props'],
    ]);
  });

  it('does not treat prototype keys as events', () => {
    expect(parseEvent('toString')).toEqual({ ok: false, reason: 'unknown_event' });
    expect(parseEvent('constructor')).toEqual({ ok: false, reason: 'unknown_event' });
  });

  it('only allows id, count, boolean and enum props', () => {
    for (const schema of Object.values(EVENTS)) {
      for (const prop of Object.values(schema.shape)) {
        const kind = (prop as { def: { type: string } }).def.type;
        expect(['enum', 'number', 'boolean', 'uuid']).toContain(kind);
      }
    }
  });
});
