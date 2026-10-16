import { describe, expect, it } from 'vitest';
import { buildNativeCss, buildThemeCss, buildWebCss } from './css';

describe('css generation', () => {
  it('emits a Tailwind v4 @theme with primitives and semantic indirections', () => {
    const css = buildThemeCss();
    expect(css).toMatch(/^@theme \{/);
    expect(css).toContain('--color-cream50: #FAF8F5;');
    expect(css).toContain('--color-surface: var(--surface);');
    expect(css).toContain('--radius-crisp: 4px;');
    expect(css).toContain('--font-display:');
  });

  it('emits light values on :root and dark for both media query and data-theme', () => {
    const css = buildWebCss();
    expect(css).toContain(':root {');
    expect(css).toContain('--surface: #F5F0E8;');
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(css).toContain(':root:not([data-theme="light"])');
    expect(css).toContain(':root[data-theme="dark"]');
    expect(css).toContain('--border-control: rgba(32, 32, 33, 0.5);');
  });

  it('emits Uniwind light/dark variants', () => {
    const css = buildNativeCss();
    expect(css).toContain('@variant light');
    expect(css).toContain('@variant dark');
    expect(css).toContain('--bg: #202021;');
  });
});
