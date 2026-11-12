import { describe, expect, it } from 'vitest';
import { buildNativeCss, buildThemeCss, buildWebCss } from './css';

describe('css generation', () => {
  it('emits a Tailwind v4 @theme with primitives and semantic indirections', () => {
    const css = buildThemeCss();
    expect(css).toMatch(/^@theme \{/);
    expect(css).toContain('--color-cream50: #FAF8F5;');
    expect(css).toContain('--color-surface: var(--surface);');
    expect(css).toContain('--radius-crisp: 4px;');
    expect(css).toContain('--radius-sheet: 18px;');
    expect(css).toContain('--radius-sm: 8px;');
    expect(css).toContain('--shadow-float: 0 6px 16px -6px rgba(32, 32, 33, 0.30);');
    expect(css).toContain('--shadow-sheet: 0 18px 40px -14px rgba(32, 32, 33, 0.35);');
    expect(css).toContain('--radius-dock: 24px;');
    expect(css).toContain('--blur-dock: 22px;');
    expect(css).toContain('--blur-band: 26px;');
    expect(css).toContain('--blur-sheet: 28px;');
    expect(css).toContain(
      '--shadow-card: 0 1px 2px rgba(32, 32, 33, 0.08), 0 4px 10px -4px rgba(32, 32, 33, 0.16);',
    );
    expect(css).toContain('--color-rose: #856970;');
    expect(css).toContain('--color-sage: #757354;');
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
    expect(css).toContain('--veil: rgba(250, 248, 245, 0.94);');
    expect(css).toContain('--backdrop: rgba(32, 32, 33, 0.28);');
    expect(css).toContain('--scrim: rgba(32, 32, 33, 0.55);');
    expect(css).toContain('--warm-line: #C9BCA6;');
    expect(css).toContain('--dock-glass: rgba(255, 255, 255, 0.7);');
    expect(css).toContain('--band-glass: rgba(244, 239, 229, 0.72);');
    expect(css).toContain('--sheet-glass: rgba(250, 248, 245, 0.68);');
  });

  it('emits a utility per Felix type style', () => {
    const css = buildWebCss();
    expect(css).toContain(
      '@utility type-eyebrow {\n  font-family: var(--font-sans);\n  font-size: 10px;\n  line-height: 1;\n  font-weight: 500;\n  letter-spacing: 0.24em;\n  text-transform: uppercase;\n}',
    );
    expect(css).toContain('@utility type-italic-aside {');
    expect(css).toContain('font-style: italic;');
  });

  it('emits Uniwind light/dark variants', () => {
    const css = buildNativeCss();
    expect(css).toContain('@variant light');
    expect(css).toContain('@variant dark');
    expect(css).toContain('--bg: #202021;');
  });
});
