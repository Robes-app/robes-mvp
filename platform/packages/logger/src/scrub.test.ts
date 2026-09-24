import { describe, expect, it } from 'vitest';
import { scrubBreadcrumb, scrubEvent } from './scrub';

describe('scrubEvent (Sentry beforeSend, SEC-83)', () => {
  const event = {
    message: 'lookup failed for niall@example.com',
    exception: { values: [{ type: 'Error', value: 'no row for niall@example.com' }] },
    extra: { prompt: 'a red dress for my wedding', jobId: 'j1' },
    tags: { email: 'niall@example.com', route: '/api/v1/me' },
    contexts: {
      os: { name: 'macOS', version: '15' },
      profile: { firstName: 'Niall', note: 'size 10' },
    },
    request: {
      method: 'POST',
      url: 'https://byrobes.com/api/v1/me?email=niall@example.com',
      query_string: 'email=niall@example.com',
      data: { firstName: 'Niall' },
      cookies: { robes_session: 'secret' },
      headers: { cookie: 'robes_session=secret', 'x-forwarded-for': '1.2.3.4', 'user-agent': 'UA' },
    },
    user: { id: 'u1', email: 'niall@example.com', ip_address: '1.2.3.4' },
    breadcrumbs: [
      { category: 'fetch', data: { url: '/api/v1/looks?q=niall@example.com', status_code: 500 } },
      { category: 'console', message: 'hi niall@example.com' },
    ],
  };

  it('removes emails, prompts, names, cookies and IPs but keeps what Sentry needs', () => {
    const out = scrubEvent(event);
    const json = JSON.stringify(out);
    for (const secret of [
      'niall@example.com',
      'red dress',
      'Niall',
      'size 10',
      'secret',
      '1.2.3.4',
    ]) {
      expect(json).not.toContain(secret);
    }
    expect(out.exception.values[0]?.type).toBe('Error');
    expect(out.contexts.os).toEqual({ name: 'macOS', version: '15' });
    expect(out.extra.jobId).toBe('j1');
    expect(out.user).toEqual({ id: 'u1' });
    expect(out.request).toEqual({
      method: 'POST',
      url: 'https://byrobes.com/api/v1/me',
      headers: { 'user-agent': 'UA' },
    });
    expect(out.breadcrumbs[0]?.data).toEqual({ url: '/api/v1/looks', status_code: 500 });
  });

  it('passes through events without the optional parts', () => {
    expect(scrubEvent({ level: 'error' })).toEqual({ level: 'error' });
    expect(scrubBreadcrumb({ category: 'ui.click' })).toEqual({ category: 'ui.click' });
  });
});
