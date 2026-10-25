// Uniwind's Metro plugin swaps every `import … from 'react-native'` for its own shim, which
// forwards a hard-coded list of names. A name missing from that list arrives as `undefined`:
// RN 0.88's AssetRegistry did, and expo-font failed every face (the app fell back to the
// system font). patches/uniwind@1.12.0.patch adds the gap; this keeps the next upgrade honest.
const fs: { readFileSync(file: string, encoding: 'utf8'): string } = jest.requireActual('fs');
const path: { dirname(file: string): string; join(...parts: string[]): string } =
  jest.requireActual('path');
const resolve = (id: string): string =>
  (require as unknown as { resolve(id: string): string }).resolve(id);

function getters(file: string, indent: string): Set<string> {
  const pattern = new RegExp(`^${indent}get ([A-Za-z_][A-Za-z0-9_]*)\\(`, 'gm');
  const source = fs.readFileSync(file, 'utf8');
  const names = new Set<string>();
  for (let m = pattern.exec(source); m; m = pattern.exec(source)) if (m[1]) names.add(m[1]);
  return names;
}

test('the Uniwind shim forwards every public React Native export', () => {
  const rn = getters(
    path.join(path.dirname(resolve('react-native/package.json')), 'index.js'),
    '  ',
  );
  const shim = getters(
    path.join(path.dirname(resolve('uniwind/package.json')), 'src/components/index.ts'),
    '    ',
  );
  expect(rn.has('AssetRegistry')).toBe(true);
  expect([...rn].filter((name) => !shim.has(name))).toEqual([]);
});
