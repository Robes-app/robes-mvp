import { describe, expect, it, vi } from 'vitest';
import { type AnalyticsSink, createAnalytics, EVENTS, parseEvent, trackFiled } from './index';

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
        const { type, format } = (prop as { def: { type: string; format?: string } }).def;
        // A string is only ever an id: free text can't be catalogued.
        expect(type === 'string' ? `string:${format}` : type).toMatch(
          /^(enum|number|boolean|string:uuid)$/,
        );
      }
    }
  });

  it('types and checks the product events the clients send', () => {
    const s = sink();
    const analytics = createAnalytics(s);
    analytics.track('look_created', { from: 'draft', pieces: 4, proposed: 1, anchored: true });
    analytics.track('camera_opened');
    analytics.track('piece_swapped', { surface: 'saved', cat: 'Tops' });
    // @ts-expect-error a piece's name is never sent (beta's `out`/`in`)
    analytics.track('piece_swapped', { surface: 'saved', cat: 'Tops', out: 'Silk shirt' });
    analytics.track('look_prompt_sent', {
      surface: 'draft',
      chars: 3,
      from_draft: false,
      // @ts-expect-error her words are never sent, only how many characters
      text: 'hi',
    });
    // @ts-expect-error categories are the catalogue's
    analytics.track('look_piece_added', { surface: 'draft', cat: 'Knitwear' });
    // An id is a uuid, never a name; counts are whole and never negative (checked at runtime).
    analytics.track('first_look_started', { piece_id: 'Silk shirt' });
    analytics.track('camera_filed', { n: -1 });
    analytics.track('camera_filed', { n: 1.5 });
    expect(s.capture.mock.calls).toEqual([
      ['look_created', { from: 'draft', pieces: 4, proposed: 1, anchored: true }],
      ['camera_opened', {}],
      ['piece_swapped', { surface: 'saved', cat: 'Tops' }],
    ]);
  });

  it('keeps the dropped legacy acts out of the catalogue', () => {
    for (const legacy of [
      'travel_generated',
      'intake_opened',
      'weekly_generated',
      'avatar_render',
    ]) {
      expect(parseEvent(legacy)).toEqual({ ok: false, reason: 'unknown_event' });
    }
  });

  it('files a review as one pieces_filed and a wardrobe_added per piece kept', () => {
    const s = sink();
    const { track } = createAnalytics(s);
    trackFiled(track, 'photo', [{ state: 'add' }, { state: 'skip' }, { state: 'add' }], 'wardrobe');
    trackFiled(track, 'link', [{ state: 'add' }], 'wishlist');
    expect(s.capture.mock.calls).toEqual([
      ['pieces_filed', { source: 'photo', n: 2, skipped: 1, to: 'wardrobe' }],
      ['wardrobe_added', { source: 'photo', batch_n: 2, batch_i: 1 }],
      ['wardrobe_added', { source: 'photo', batch_n: 2, batch_i: 2 }],
      ['pieces_filed', { source: 'link', n: 1, skipped: 0, to: 'wishlist' }],
    ]);
  });
});
