// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Felix (plan 2026-11-06, PR 8): a switch between views is the underline Tabs, and a question
// that must be answered is AlertDialog (or a Sheet). The pill SegmentedControl and the system
// Alert.alert stay only where they already are; this list shrinks as each screen moves, and a
// stale entry fails so it can't hide a new caller.
const root = fileURLToPath(new URL('../../..', import.meta.url));

const SEGMENTED_CALLERS = [
  'app/src/app/(app)/plan/plan-view.tsx',
  'app/src/app/(app)/you/model/twin-parts.tsx',
  'app/src/components/route-segments.tsx',
  'app/src/components/wardrobe/add/add-flow.tsx',
  'app/src/components/wardrobe/wardrobe-header.tsx',
  'mobile/src/features/plan/PlanView.tsx',
  'mobile/src/features/wardrobe/WardrobeHeader.tsx',
  'mobile/src/features/wardrobe/add/AddPiecesPanel.tsx',
  'mobile/src/features/you/twin.tsx',
];

const ALERT_CALLERS = [
  'mobile/src/features/looks/look-editor.ts',
  'mobile/src/features/wardrobe/Camera.tsx',
];

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
  'e2e',
  '__tests__',
]);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP_DIRS.has(name)) return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(tsx?|jsx?)$/.test(name) && !/\.(test|stories)\.tsx?$/.test(name) ? [path] : [];
  });
}

const screens = ['app/src', 'mobile/src'].flatMap((dir) => files(join(root, dir)));
const callers = (pattern: RegExp) =>
  screens.filter((f) => pattern.test(readFileSync(f, 'utf8'))).map((f) => relative(root, f));

const SEGMENTED = /\bSegmentedControl\b/;
const ALERT = /\bAlert\.alert\(/;

describe('no new SegmentedControl or Alert.alert', () => {
  it('scans the web and native screens', () => {
    expect(screens.some((f) => f.includes('/app/src/app/'))).toBe(true);
    expect(screens.some((f) => f.includes('/mobile/src/features/'))).toBe(true);
  });

  it('a view switch is Tabs: SegmentedControl only where it already was', () => {
    expect(callers(SEGMENTED).sort()).toEqual([...SEGMENTED_CALLERS].sort());
  });

  it('a question is AlertDialog: Alert.alert only where it already was', () => {
    expect(callers(ALERT).sort()).toEqual([...ALERT_CALLERS].sort());
  });
});
