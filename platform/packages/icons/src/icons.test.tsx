import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ICON_NAMES, ICON_SOLID, ICONS } from './icons';
import { Icon } from './web';

describe('icons', () => {
  it('has the IA destinations and core actions', () => {
    for (const name of [
      'home',
      'book',
      'wardrobe',
      'looks',
      'plan',
      'plus',
      'user',
      'close',
      'undo',
    ]) {
      expect(ICON_NAMES).toContain(name);
    }
  });

  it('has a line icon for each weather condition (@robes/core/weather), never an emoji', () => {
    for (const name of ['sun', 'partCloud', 'cloud', 'fog', 'rain', 'snow', 'thunder']) {
      expect(ICON_NAMES).toContain(name);
    }
  });

  it('uses valid path data only', () => {
    for (const paths of Object.values(ICONS)) {
      for (const d of paths) expect(d).toMatch(/^[MmLlHhVvCcSsQqTtAaZz0-9 .,-]+$/);
    }
  });

  it('renders decorative icons hidden from assistive tech and labelled ones as images', () => {
    expect(renderToStaticMarkup(<Icon name="plus" />)).toContain('aria-hidden="true"');
    const labelled = renderToStaticMarkup(<Icon name="close" label="Close" />);
    expect(labelled).toContain('role="img"');
    expect(labelled).toContain('aria-label="Close"');
    expect(labelled).toContain('stroke="currentColor"');
  });
});

describe('filled icons', () => {
  it('fill with the current colour only when asked', () => {
    expect(renderToStaticMarkup(<Icon name="star" filled />)).toContain('fill="currentColor"');
    expect(renderToStaticMarkup(<Icon name="star" />)).toContain('fill="none"');
  });
});

describe('Felix icons', () => {
  it('has every glyph the Felix Design System draws', () => {
    for (const name of [
      'capture',
      'describe',
      'pencil',
      'tag',
      'calendar',
      'spring',
      'summer',
      'autumn',
      'winter',
      'bell',
      'pin',
      'receipt',
      'refresh',
    ]) {
      expect(ICON_NAMES).toContain(name);
    }
  });

  it('draws a solid shape filled with the current colour whatever the filled prop', () => {
    const markup = renderToStaticMarkup(<Icon name="describe" />);
    expect(markup).toContain('fill="none"');
    expect(markup.match(/<path/g)).toHaveLength(2);
    expect(markup).toMatch(/<path d="M18 15[^"]*" fill="currentColor"/);
  });

  it('keeps solid shapes to valid path data', () => {
    for (const paths of Object.values(ICON_SOLID)) {
      for (const d of paths ?? []) expect(d).toMatch(/^[MmLlHhVvCcSsQqTtAaZz0-9 .,-]+$/);
    }
  });
});
