// Generates landscapes.js (repo root) from the platform's place vocabulary, so beta and staging read
// Liberty's landscapes from ONE source: platform/packages/core/src/landscape/index.ts. Edit that
// file, then run `node scripts/gen_landscapes.mjs` (needs `pnpm install` in platform/ for esbuild).
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { createRequire } from 'module';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'platform/packages/core/src/landscape/index.ts');
const pnpmDir = join(root, 'platform/node_modules/.pnpm');
const pkg = readdirSync(pnpmDir).filter((d) => /^esbuild@/.test(d)).sort().pop();
if (!pkg) throw new Error('esbuild not found — run pnpm install in platform/ first');
const require = createRequire(join(pnpmDir, pkg, 'node_modules/esbuild/package.json'));
const esbuild = require('esbuild');
const { code } = esbuild.transformSync(readFileSync(src, 'utf8'), { loader: 'ts', format: 'esm', target: 'es2022' });
const header = `// GENERATED from platform/packages/core/src/landscape/index.ts by scripts/gen_landscapes.mjs.
// Do not edit here: edit the source and regenerate (scripts/landscape_test.mjs pins the copy).
`;
writeFileSync(join(root, 'landscapes.js'), header + code);
console.log('landscapes.js written');
