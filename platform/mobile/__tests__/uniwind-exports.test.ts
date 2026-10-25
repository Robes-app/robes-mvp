import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// Uniwind's Metro plugin swaps every `import … from 'react-native'` for its own shim, which
// forwards a hard-coded list of names. A name missing from that list arrives as `undefined`:
// RN 0.88's AssetRegistry did, and expo-font failed every face (the app fell back to the
// system font). patches/uniwind@1.12.0.patch adds the gap; this keeps the next upgrade honest.
function getters(file: string, indent: string): Set<string> {
  const source = readFileSync(file, 'utf8');
  const pattern = new RegExp(`^${indent}get ([A-Za-z_][A-Za-z0-9_]*)\\(`, 'gm');
  return new Set(Array.from(source.matchAll(pattern), (m) => m[1] as string));
}

test('the Uniwind shim forwards every public React Native export', () => {
  const rnDir = dirname(require.resolve('react-native/package.json'));
  const uniwindDir = dirname(require.resolve('uniwind/package.json'));
  const rn = getters(join(rnDir, 'index.js'), '  ');
  const shim = getters(join(uniwindDir, 'src/components/index.ts'), '    ');

  expect(rn.has('AssetRegistry')).toBe(true);
  expect([...rn].filter((name) => !shim.has(name))).toEqual([]);
});
