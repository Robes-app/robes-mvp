// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// design-system.md §6 "No raw colours": components use token classes only. packages/tokens is the
// one place colour values live, so it's exempt. Biome can't match string contents, hence a test.
const root = fileURLToPath(new URL('../../..', import.meta.url));
const SELF = fileURLToPath(import.meta.url);

const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.expo',
  '.turbo',
  'dist',
  'storybook-static',
  'playwright-report',
  'test-results',
  'assets',
  'ios',
  'android',
]);
const EXTENSIONS = /\.(tsx?|jsx?|mjs|cjs|css)$/;

const RULES: Array<[RegExp, string]> = [
  [/(?<![\w&/-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/, 'hex colour literal'],
  [/\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(/, 'CSS colour function'],
  [/-\[(?:#|rgba?\(|hsla?\(|oklch\(|color:)/, 'Tailwind arbitrary colour value'],
];

function scanRoots(): string[] {
  const packages = readdirSync(join(root, 'packages'))
    .filter((name) => name.startsWith('ui'))
    .map((name) => join(root, 'packages', name));
  return [join(root, 'app'), join(root, 'mobile'), ...packages];
}

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP_DIRS.has(name)) return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return EXTENSIONS.test(name) && path !== SELF ? [path] : [];
  });
}

describe('no raw colours outside @robes/tokens', () => {
  const scanned = scanRoots().flatMap(files);

  it('scans app, mobile and packages/ui*', () => {
    expect(scanned.some((f) => f.includes('/app/src/'))).toBe(true);
    expect(scanned.some((f) => f.includes('/packages/ui/src/'))).toBe(true);
    expect(scanned.some((f) => f.includes('/packages/tokens/'))).toBe(false);
  });

  it.each(RULES.map(([pattern, name]) => ({ pattern, name })))('no $name', ({ pattern }) => {
    const offenders = scanned.flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .flatMap((line, i) =>
          pattern.test(line) ? [`${relative(root, file)}:${i + 1}: ${line.trim()}`] : [],
        ),
    );
    expect(offenders).toEqual([]);
  });

  it('catches the patterns it bans', () => {
    const samples = ['color: #202021;', 'bg-[#fff]', 'text-[rgb(0,0,0)]', 'rgba(32, 32, 33, .5)'];
    for (const sample of samples)
      expect(
        RULES.some(([p]) => p.test(sample)),
        sample,
      ).toBe(true);
    for (const ok of ['href="#main"', 'bg-ink/35', 'aspect-4/5', 'tracking-[0.2em]'])
      expect(
        RULES.some(([p]) => p.test(ok)),
        ok,
      ).toBe(false);
  });
});
