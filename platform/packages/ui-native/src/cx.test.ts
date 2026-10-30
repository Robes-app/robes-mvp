import { cx } from './cx';

test('the last class of a conflicting pair wins', () => {
  expect(cx('text-base text-ink', 'text-lg')).toBe('text-ink text-lg');
  expect(cx('text-xs uppercase text-ink-faint', 'text-accent-warm')).toBe(
    'text-xs uppercase text-accent-warm',
  );
  expect(cx('text-[17px] uppercase text-ink', 'text-5xl text-bg')).toBe(
    'uppercase text-5xl text-bg',
  );
  expect(cx('p-4', 'px-2', 'p-3')).toBe('p-3');
});

test('classes that do not conflict all stay, and falsy parts drop out', () => {
  expect(cx('text-sm text-ink-muted', false, null, undefined, 'text-center uppercase')).toBe(
    'text-sm text-ink-muted text-center uppercase',
  );
  expect(cx('text-base', 'ios:text-lg')).toBe('text-base ios:text-lg');
});

test("a caller's size keeps the line height a component set", () => {
  expect(cx('text-base leading-relaxed', 'text-lg')).toBe('leading-relaxed text-lg');
});
