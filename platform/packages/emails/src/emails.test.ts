import { describe, expect, it } from 'vitest';
import { renderEmail, signToken, signUnsub, verifyToken, verifyUnsub } from './index';

const USER = '11111111-1111-4111-8111-111111111111';
const base = {
  heading: 'Your three looks are ready.',
  body: 'Camel coat, worn three ways.',
  notice: 'You asked Robes to keep in touch.',
  unsubUrl: 'https://app.test/unsubscribe?t=x',
  unsubLabel: 'Stop these emails',
  privacyUrl: 'https://app.test/legal/privacy',
  privacyLabel: 'Privacy',
};

describe('renderEmail', () => {
  it('escapes every piece of copy and data', () => {
    const { html } = renderEmail({ ...base, heading: '<script>x</script>', body: 'a & "b"' });
    expect(html).not.toContain('<script>x');
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
    expect(html).toContain('a &amp; &quot;b&quot;');
  });

  it('keeps only http(s) images, at most three', () => {
    const { html } = renderEmail({
      ...base,
      images: ['javascript:alert(1)', 'https://m/1', 'https://m/2', 'https://m/3', 'https://m/4'],
    });
    expect(html).not.toContain('javascript:');
    expect(html.match(/<img /g)).toHaveLength(3);
  });

  it('has a plain-text twin with the button and the unsubscribe link', () => {
    const { text } = renderEmail({ ...base, cta: { label: 'See the looks', url: 'https://a/b' } });
    expect(text).toContain('See the looks: https://a/b');
    expect(text.trim().endsWith('Stop these emails: https://app.test/unsubscribe?t=x')).toBe(true);
  });
});

describe('unsubscribe tokens', () => {
  it('round-trips and names exactly one preference', () => {
    const token = signUnsub('secret', USER, 'nudges');
    expect(verifyUnsub('secret', token)).toEqual({ userId: USER, pref: 'nudges' });
  });

  it('rejects another secret, another preference or another user', () => {
    const token = signUnsub('secret', USER, 'nudges');
    expect(verifyUnsub('other', token)).toBeNull();
    expect(verifyUnsub('secret', token.replace('nudges', 'receipts'))).toBeNull();
    expect(
      verifyUnsub('secret', token.replace(USER, '22222222-2222-4222-8222-222222222222')),
    ).toBeNull();
    expect(verifyUnsub('secret', `${token}.x`)).toBeNull();
    expect(verifyUnsub('secret', 'garbage')).toBeNull();
  });
});

describe('purpose tokens', () => {
  it('only verify for the purpose and secret they were minted with', () => {
    const token = signToken('secret', 'waitlist-confirm', USER);
    expect(verifyToken('secret', 'waitlist-confirm', token)).toBe(USER);
    expect(verifyToken('secret', 'something-else', token)).toBeNull();
    expect(verifyToken('other', 'waitlist-confirm', token)).toBeNull();
    expect(verifyToken('secret', 'waitlist-confirm', `${token}x`)).toBeNull();
  });

  it('renders transactional mail without an unsubscribe link', () => {
    const { html, text } = renderEmail({ ...base, unsubUrl: undefined, unsubLabel: undefined });
    expect(html).not.toContain('Stop these emails');
    expect(text).not.toContain('Stop these emails');
  });
});
