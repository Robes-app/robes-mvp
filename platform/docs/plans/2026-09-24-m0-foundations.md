# M0 Foundations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stand up the `platform/` monorepo with toolchain, shared tokens, a secure-by-default API route wrapper, Next.js and Expo skeletons, a Supabase baseline schema with RLS tests, and CI — so every later milestone builds on enforced security and shared design.

**Architecture:** pnpm workspace + Turborepo in `platform/`. Internal packages are "just-in-time" TypeScript (exports point at `src/*.ts`, consumed by Next's bundler, Metro and Vitest) except `@robes/tokens`, which has a build step that generates CSS. The API wrapper `route()` in `@robes/api` enforces auth (Supabase JWT via JWKS), zod validation, body limits, rate limiting and safe errors for every route. Supabase schema is migration-managed with pgTAP tests proving the legacy admin-escalation bug cannot exist.

**Tech Stack:** Node 24, pnpm 11.27.1, Turborepo 2.11.3, TypeScript 6.0.3, Biome 2.5.14, zod 4.6.5, Vitest 5.0.1, jose 6.2.12, Next.js 16.3.6 + React 19.3, Tailwind 4.3.3, Expo SDK 57 + Uniwind 1.12.0, Supabase CLI 2.117.0, Playwright 1.63.0, fast-check 4.10.2.

**Read before starting:** `platform/docs/SPEC.md` (§0, §3, §4), `platform/docs/security.md` (SEC-01, 10–15, 30–32, 50, 70–74), `platform/docs/design-system.md` §3–4, `platform/docs/reference/stack-versions.md`.

**Working directory:** repo root `/Users/niallmaher/Projects/robes-mvp`, branch `platform`. All paths below are relative to `platform/` unless they start with `/` or `.github/`. Never modify files outside `platform/` and `.github/workflows/platform-*.yml`.

**Conventions:** single quotes, 2-space indent, no comments unless the why is non-obvious (matches repo CLAUDE.md). Commit after each task with the message given (append the attribution trailer required by the session).

---

### Task 1: Toolchain prerequisites

**Files:** none

**Step 1: Install Node 24 and enable pnpm 11**

Run:
```bash
fnm install 24 && fnm use 24 || (nvm install 24 && nvm use 24)
corepack enable
corepack prepare pnpm@11.27.1 --activate
node -v && pnpm -v && docker info --format '{{.ServerVersion}}'
```
Expected: `v24.x.x`, `11.27.1`, a Docker server version (Docker must be running for Supabase local).

If neither `fnm` nor `nvm` is installed: `brew install fnm` first, add `eval "$(fnm env --use-on-cd)"` to `~/.zshrc`.

---

### Task 2: Workspace root

**Files:**
- Create: `platform/package.json`
- Create: `platform/pnpm-workspace.yaml`
- Create: `platform/.nvmrc`
- Create: `platform/turbo.json`
- Create: `platform/tsconfig.base.json`
- Create: `platform/biome.json`
- Create: `platform/.gitignore`

**Step 1: Create the files**

`platform/package.json`
```json
{
  "name": "robes-platform",
  "private": true,
  "packageManager": "pnpm@11.27.1",
  "engines": { "node": ">=24 <25" },
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "lint": "biome check .",
    "format": "biome check --write .",
    "db:start": "supabase start",
    "db:reset": "supabase db reset",
    "db:test": "supabase test db",
    "db:types": "supabase gen types typescript --local > packages/db/src/database.types.ts"
  },
  "devDependencies": {
    "@biomejs/biome": "2.5.14",
    "@types/node": "24.13.6",
    "supabase": "2.117.0",
    "turbo": "2.11.3",
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
```

`platform/pnpm-workspace.yaml`
```yaml
packages:
  - app
  - mobile
  - workers
  - infra
  - packages/*

catalog:
  typescript: 6.0.3
  vitest: 5.0.1
  zod: 4.6.5
  jose: 6.2.12
  fast-check: 4.10.2
  tsx: 4.23.15

onlyBuiltDependencies:
  - supabase
  - esbuild
  - sharp
```

`platform/.nvmrc`
```
24
```

`platform/turbo.json`
```json
{
  "$schema": "https://turborepo.com/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**", "!.next/cache/**"] },
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

`platform/tsconfig.base.json`
```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": false,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["node"]
  }
}
```

`platform/biome.json`
```json
{
  "$schema": "https://biomejs.dev/schemas/2.5.14/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": {
    "includes": ["**", "!**/dist", "!**/.next", "!**/.expo", "!**/node_modules", "!**/supabase/.temp", "!**/*.types.ts", "!docs/reference/tokens.draft.json"]
  },
  "formatter": { "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "javascript": { "formatter": { "quoteStyle": "single" } },
  "linter": {
    "rules": {
      "recommended": true,
      "security": { "noDangerouslySetInnerHtml": "error" },
      "style": { "noNonNullAssertion": "error" }
    }
  }
}
```

`platform/.gitignore`
```
node_modules/
dist/
.next/
.expo/
.turbo/
coverage/
playwright-report/
test-results/
.env
.env.*
!.env.example
supabase/.temp/
supabase/.branches/
*.log
.DS_Store
```

**Step 2: Install and verify**

Run (from `platform/`): `pnpm install && pnpm lint`
Expected: install completes; `biome check` reports `Checked N files` with no errors. If pnpm reports ignored build scripts, run `pnpm approve-builds` and approve `supabase`.

**Step 3: Commit**
```bash
git add platform/package.json platform/pnpm-workspace.yaml platform/.nvmrc platform/turbo.json platform/tsconfig.base.json platform/biome.json platform/.gitignore platform/pnpm-lock.yaml
git commit -m "platform: workspace root (pnpm, turbo, biome, tsconfig)"
```

---

### Task 3: `@robes/config` — validated environment (SEC-71)

**Files:**
- Create: `packages/config/package.json`, `packages/config/tsconfig.json`
- Create: `packages/config/src/index.ts`
- Test: `packages/config/src/index.test.ts`

**Step 1: Package scaffolding**

`packages/config/package.json`
```json
{
  "name": "@robes/config",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "test": "vitest run", "typecheck": "tsc -p tsconfig.json" },
  "dependencies": { "zod": "catalog:" },
  "devDependencies": { "typescript": "catalog:", "vitest": "catalog:" }
}
```

`packages/config/tsconfig.json`
```json
{ "extends": "../../tsconfig.base.json", "include": ["src"] }
```

Run: `pnpm install`

**Step 2: Write the failing test**

`packages/config/src/index.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { appServerEnv, parseEnv } from './index';

const base = {
  NODE_ENV: 'production',
  APP_ENV: 'staging',
  SUPABASE_URL: 'https://abc.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_xxxxxxxxxxxxxxxxxxxx',
  UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'token-value',
};

describe('parseEnv(appServerEnv)', () => {
  it('parses a valid environment and derives auth endpoints', () => {
    const env = parseEnv(appServerEnv, base);
    expect(env.SUPABASE_JWKS_URL).toBe('https://abc.supabase.co/auth/v1/.well-known/jwks.json');
    expect(env.SUPABASE_JWT_ISSUER).toBe('https://abc.supabase.co/auth/v1');
  });

  it('requires Upstash outside dev', () => {
    const { UPSTASH_REDIS_REST_URL: _u, UPSTASH_REDIS_REST_TOKEN: _t, ...rest } = base;
    expect(() => parseEnv(appServerEnv, rest)).toThrow(/UPSTASH_REDIS_REST_URL/);
  });

  it('allows missing Upstash in dev', () => {
    const { UPSTASH_REDIS_REST_URL: _u, UPSTASH_REDIS_REST_TOKEN: _t, ...rest } = base;
    expect(() => parseEnv(appServerEnv, { ...rest, APP_ENV: 'dev' })).not.toThrow();
  });

  it('refuses dev-only flags in production', () => {
    expect(() =>
      parseEnv(appServerEnv, { ...base, APP_ENV: 'production', ALLOW_PRIVATE_FETCH: '1' }),
    ).toThrow(/ALLOW_PRIVATE_FETCH/);
  });

  it('never echoes secret values in errors', () => {
    try {
      parseEnv(appServerEnv, { ...base, SUPABASE_URL: 'not-a-url-SECRET123' });
      expect.unreachable();
    } catch (e) {
      expect(String(e)).toContain('SUPABASE_URL');
      expect(String(e)).not.toContain('SECRET123');
    }
  });
});
```

**Step 3: Run test to verify it fails**

Run: `pnpm --filter @robes/config test`
Expected: FAIL — `Failed to resolve import "./index"` or `appServerEnv is not exported`.

**Step 4: Write minimal implementation**

`packages/config/src/index.ts`
```ts
import { z } from 'zod';

const DEV_ONLY_FLAGS = ['ALLOW_PRIVATE_FETCH', 'NOTIFY_DEBUG', 'JOBS_TRANSPORT_INLINE'] as const;

export const appServerEnv = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    APP_ENV: z.enum(['dev', 'staging', 'production']),
    SUPABASE_URL: z.url(),
    SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
    UPSTASH_REDIS_REST_URL: z.url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
    ALLOW_PRIVATE_FETCH: z.string().optional(),
    NOTIFY_DEBUG: z.string().optional(),
    JOBS_TRANSPORT_INLINE: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.APP_ENV !== 'dev' && !(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN)) {
      ctx.addIssue({ code: 'custom', path: ['UPSTASH_REDIS_REST_URL'], message: 'required outside dev' });
    }
    if (env.APP_ENV === 'production') {
      for (const flag of DEV_ONLY_FLAGS) {
        if (env[flag] !== undefined) {
          ctx.addIssue({ code: 'custom', path: [flag], message: 'not allowed in production' });
        }
      }
    }
  })
  .transform((env) => {
    const origin = new URL(env.SUPABASE_URL).origin;
    return {
      ...env,
      SUPABASE_JWT_ISSUER: `${origin}/auth/v1`,
      SUPABASE_JWKS_URL: `${origin}/auth/v1/.well-known/jwks.json`,
    };
  });

export type AppServerEnv = z.infer<typeof appServerEnv>;

export function parseEnv<T extends z.ZodType>(
  schema: T,
  source: Record<string, string | undefined>,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join('.')} (${i.message})`);
    throw new Error(`Invalid environment: ${problems.join(', ')}`);
  }
  return result.data;
}
```

Note: zod 4 issue messages for `z.url()` do not include the input value; the test guards that.

**Step 5: Run tests to verify they pass**

Run: `pnpm --filter @robes/config test`
Expected: PASS (5 tests).

**Step 6: Commit**
```bash
git add platform/packages/config platform/pnpm-lock.yaml
git commit -m "platform: @robes/config env validation (SEC-71)"
```

---

### Task 4: `@robes/tokens` — contrast math (TDD)

**Files:**
- Create: `packages/tokens/package.json`, `packages/tokens/tsconfig.json`
- Create: `packages/tokens/src/contrast.ts`
- Test: `packages/tokens/src/contrast.test.ts`

**Step 1: Scaffolding**

`packages/tokens/package.json`
```json
{
  "name": "@robes/tokens",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/tokens.ts",
    "./theme.css": "./dist/theme.css",
    "./web.css": "./dist/web.css",
    "./native.css": "./dist/native.css",
    "./tokens.json": "./dist/tokens.json"
  },
  "scripts": {
    "build": "tsx scripts/build.ts",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json"
  },
  "devDependencies": { "tsx": "catalog:", "typescript": "catalog:", "vitest": "catalog:" }
}
```

`packages/tokens/tsconfig.json`
```json
{ "extends": "../../tsconfig.base.json", "include": ["src", "scripts"] }
```

**Step 2: Failing test**

`packages/tokens/src/contrast.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { blend, contrastRatio, hexToRgb } from './contrast';

describe('contrast', () => {
  it('parses hex', () => {
    expect(hexToRgb('#202021')).toEqual([32, 32, 33]);
    expect(() => hexToRgb('red')).toThrow();
  });
  it('computes WCAG ratios', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 1);
    expect(contrastRatio(hexToRgb('#202021'), hexToRgb('#FAF8F5'))).toBeCloseTo(15.36, 1);
  });
  it('blends alpha colours over a background', () => {
    const border = blend(hexToRgb('#202021'), 0.5, hexToRgb('#FAF8F5'));
    expect(contrastRatio(border, hexToRgb('#FAF8F5'))).toBeCloseTo(3.17, 1);
  });
});
```

Run: `pnpm install && pnpm --filter @robes/tokens test`
Expected: FAIL — cannot resolve `./contrast`.

**Step 3: Implement**

`packages/tokens/src/contrast.ts`
```ts
export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match?.[1]) throw new Error(`Invalid hex colour: ${hex}`);
  const n = Number.parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function blend(fg: Rgb, alpha: number, bg: Rgb): Rgb {
  return [0, 1, 2].map((i) => (fg[i] ?? 0) * alpha + (bg[i] ?? 0) * (1 - alpha)) as Rgb;
}

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance([r, g, b]: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
```

Run: `pnpm --filter @robes/tokens test` → Expected: PASS (3 tests).

**Step 4: Commit**
```bash
git add platform/packages/tokens platform/pnpm-lock.yaml
git commit -m "platform: tokens contrast math"
```

---

### Task 5: `@robes/tokens` — token source + contrast gate

**Files:**
- Create: `packages/tokens/src/tokens.ts`
- Test: `packages/tokens/src/tokens.test.ts`

Values come from `docs/reference/tokens.draft.json` and `docs/design-system.md` §4, adjusted so every declared pair passes (ink-faint darkened to `#74664A`, success darkened to `#3F6B4C`, control border alpha 0.5 light / 0.4 dark).

**Step 1: Failing test**

`packages/tokens/src/tokens.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { blend, contrastRatio, hexToRgb, type Rgb } from './contrast';
import { type ColorRef, dark, light, palette, pairs, semanticNames } from './tokens';

function resolve(ref: ColorRef, bg: Rgb): Rgb {
  if (typeof ref === 'string') return hexToRgb(palette[ref]);
  return blend(hexToRgb(palette[ref.base]), ref.alpha, bg);
}

describe.each([
  ['light', light],
  ['dark', dark],
] as const)('%s mode', (_mode, map) => {
  it('defines every semantic token', () => {
    for (const name of semanticNames) expect(map[name]).toBeDefined();
  });

  it.each(pairs)('$fg on $bg meets $min:1', ({ fg, bg, min }) => {
    const bgRef = map[bg];
    if (typeof bgRef !== 'string') throw new Error(`background ${bg} must be opaque`);
    const bgRgb = hexToRgb(palette[bgRef]);
    expect(contrastRatio(resolve(map[fg], bgRgb), bgRgb)).toBeGreaterThanOrEqual(min);
  });
});
```

Run: `pnpm --filter @robes/tokens test` → Expected: FAIL — cannot resolve `./tokens`.

**Step 2: Implement**

`packages/tokens/src/tokens.ts`
```ts
export const palette = {
  cream50: '#FAF8F5',
  cream100: '#F5F0E8',
  cream200: '#EFE9DC',
  cream300: '#E7E0CF',
  cream400: '#D8CFC0',
  white: '#FFFFFF',
  ink: '#202021',
  ink800: '#2A2A2B',
  ink900: '#252526',
  inkSoft: '#6E6A64',
  inkFaint: '#74664A',
  rose: '#8E7077',
  roseLight: '#B8969D',
  sage: '#7E7C5A',
  sageLight: '#A9A67E',
  mauve: '#D4C8C4',
  success: '#3F6B4C',
  successLight: '#7FB08E',
  danger: '#8B3A30',
  dangerLight: '#E08A7E',
  mutedDark: '#B9B3A8',
  faintDark: '#A89E8C',
} as const;

export type PaletteKey = keyof typeof palette;
export type ColorRef = PaletteKey | { base: PaletteKey; alpha: number };

export const semanticNames = [
  'bg',
  'surface',
  'surface-sunk',
  'ink',
  'ink-muted',
  'ink-faint',
  'accent-inspire',
  'accent-plan',
  'accent-decor',
  'success',
  'danger',
  'focus-ring',
  'hairline',
  'border-control',
] as const;

export type Semantic = (typeof semanticNames)[number];

export const light: Record<Semantic, ColorRef> = {
  bg: 'cream50',
  surface: 'cream100',
  'surface-sunk': 'cream200',
  ink: 'ink',
  'ink-muted': 'inkSoft',
  'ink-faint': 'inkFaint',
  'accent-inspire': 'rose',
  'accent-plan': 'sage',
  'accent-decor': 'mauve',
  success: 'success',
  danger: 'danger',
  'focus-ring': 'ink',
  hairline: { base: 'ink', alpha: 0.075 },
  'border-control': { base: 'ink', alpha: 0.5 },
};

export const dark: Record<Semantic, ColorRef> = {
  bg: 'ink',
  surface: 'ink800',
  'surface-sunk': 'ink900',
  ink: 'cream50',
  'ink-muted': 'mutedDark',
  'ink-faint': 'faintDark',
  'accent-inspire': 'roseLight',
  'accent-plan': 'sageLight',
  'accent-decor': 'mauve',
  success: 'successLight',
  danger: 'dangerLight',
  'focus-ring': 'cream50',
  hairline: { base: 'cream50', alpha: 0.1 },
  'border-control': { base: 'cream50', alpha: 0.4 },
};

// Accent colours are declared at 3:1 (large text, icons, fills only) per the brand guideline.
export const pairs: Array<{ fg: Semantic; bg: Semantic; min: number }> = [
  { fg: 'ink', bg: 'bg', min: 4.5 },
  { fg: 'ink', bg: 'surface', min: 4.5 },
  { fg: 'ink', bg: 'surface-sunk', min: 4.5 },
  { fg: 'ink-muted', bg: 'bg', min: 4.5 },
  { fg: 'ink-muted', bg: 'surface', min: 4.5 },
  { fg: 'ink-faint', bg: 'bg', min: 4.5 },
  { fg: 'ink-faint', bg: 'surface', min: 4.5 },
  { fg: 'ink-faint', bg: 'surface-sunk', min: 4.5 },
  { fg: 'accent-inspire', bg: 'bg', min: 3 },
  { fg: 'accent-inspire', bg: 'surface', min: 3 },
  { fg: 'accent-plan', bg: 'bg', min: 3 },
  { fg: 'accent-plan', bg: 'surface', min: 3 },
  { fg: 'success', bg: 'bg', min: 4.5 },
  { fg: 'success', bg: 'surface', min: 4.5 },
  { fg: 'danger', bg: 'bg', min: 4.5 },
  { fg: 'danger', bg: 'surface', min: 4.5 },
  { fg: 'border-control', bg: 'bg', min: 3 },
  { fg: 'border-control', bg: 'surface', min: 3 },
  { fg: 'focus-ring', bg: 'bg', min: 3 },
];

export const font = {
  display: "var(--font-cormorant), 'Cormorant', Georgia, 'Times New Roman', serif",
  sans: "var(--font-inter), 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
} as const;

export const radius = { crisp: '4px', soft: '12px', pill: '999px' } as const;
```

Run: `pnpm --filter @robes/tokens test` → Expected: PASS (all pairs, both modes). If any pair fails, adjust the palette value — never lower `min`.

**Step 3: Commit**
```bash
git add platform/packages/tokens
git commit -m "platform: token source with contrast gate"
```

---

### Task 6: `@robes/tokens` — CSS generation (Tailwind v4 web + Uniwind native)

**Files:**
- Create: `packages/tokens/src/css.ts`
- Create: `packages/tokens/scripts/build.ts`
- Test: `packages/tokens/src/css.test.ts`

**Step 1: Failing test**

`packages/tokens/src/css.test.ts`
```ts
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
```

Run: `pnpm --filter @robes/tokens test` → Expected: FAIL — cannot resolve `./css`.

**Step 2: Implement**

`packages/tokens/src/css.ts`
```ts
import { hexToRgb } from './contrast';
import { type ColorRef, dark, font, light, palette, radius, type Semantic, semanticNames } from './tokens';

function value(ref: ColorRef): string {
  if (typeof ref === 'string') return palette[ref];
  const [r, g, b] = hexToRgb(palette[ref.base]);
  return `rgba(${r}, ${g}, ${b}, ${ref.alpha})`;
}

function modeVars(map: Record<Semantic, ColorRef>, indent: string): string {
  return semanticNames.map((name) => `${indent}--${name}: ${value(map[name])};`).join('\n');
}

export function buildThemeCss(): string {
  const lines = ['@theme {'];
  for (const [key, hex] of Object.entries(palette)) lines.push(`  --color-${key}: ${hex};`);
  for (const name of semanticNames) lines.push(`  --color-${name}: var(--${name});`);
  lines.push(`  --font-display: ${font.display};`, `  --font-sans: ${font.sans};`);
  for (const [key, v] of Object.entries(radius)) lines.push(`  --radius-${key}: ${v};`);
  lines.push('}');
  return `${lines.join('\n')}\n`;
}

export function buildWebCss(): string {
  return [
    `:root {\n${modeVars(light, '  ')}\n}`,
    `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n    color-scheme: dark;\n${modeVars(dark, '    ')}\n  }\n}`,
    `:root[data-theme="dark"] {\n  color-scheme: dark;\n${modeVars(dark, '  ')}\n}`,
  ].join('\n\n').concat('\n');
}

export function buildNativeCss(): string {
  return `@layer theme {\n  :root {\n    @variant light {\n${modeVars(light, '      ')}\n    }\n    @variant dark {\n${modeVars(dark, '      ')}\n    }\n  }\n}\n`;
}
```

`packages/tokens/scripts/build.ts`
```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildNativeCss, buildThemeCss, buildWebCss } from '../src/css';
import { dark, font, light, palette, radius } from '../src/tokens';

const out = new URL('../dist/', import.meta.url);
mkdirSync(out, { recursive: true });
writeFileSync(new URL('theme.css', out), buildThemeCss());
writeFileSync(new URL('web.css', out), buildWebCss());
writeFileSync(new URL('native.css', out), buildNativeCss());
writeFileSync(
  new URL('tokens.json', out),
  `${JSON.stringify({ palette, light, dark, font, radius }, null, 2)}\n`,
);
console.log('tokens: wrote dist/theme.css, web.css, native.css, tokens.json');
```

**Step 3: Verify**

Run: `pnpm --filter @robes/tokens test && pnpm --filter @robes/tokens build && head -5 packages/tokens/dist/theme.css`
Expected: tests PASS; build prints `tokens: wrote …`; file starts with `@theme {`.

Note: the Uniwind `@variant` syntax is from https://docs.uniwind.dev/theming — if Uniwind's docs differ at install time, update `buildNativeCss` and its test together.

**Step 4: Commit**
```bash
git add platform/packages/tokens
git commit -m "platform: generate Tailwind v4 and Uniwind theme CSS from tokens"
```

---

### Task 7: `@robes/contracts` — error and health contracts

**Files:**
- Create: `packages/contracts/package.json`, `packages/contracts/tsconfig.json`
- Create: `packages/contracts/src/index.ts`
- Test: `packages/contracts/src/index.test.ts`

**Step 1: Scaffolding** — same shape as `@robes/config` (name `@robes/contracts`, dependency `zod: catalog:`).

**Step 2: Failing test**

`packages/contracts/src/index.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { ErrorBody, ErrorCode, HealthOutput } from './index';

describe('contracts', () => {
  it('accepts a well-formed error body', () => {
    expect(
      ErrorBody.parse({ error: { code: 'invalid_input', message: 'Check the highlighted fields.', requestId: 'r1' } }),
    ).toBeTruthy();
  });
  it('has the codes the API spec lists', () => {
    expect(ErrorCode.options).toEqual([
      'unauthenticated', 'forbidden', 'not_found', 'invalid_input', 'conflict', 'payload_too_large',
      'rate_limited', 'quota_exceeded', 'capacity', 'disabled', 'upgrade_required', 'internal',
    ]);
  });
  it('health is literally ok', () => {
    expect(() => HealthOutput.parse({ ok: false })).toThrow();
  });
});
```

Run: `pnpm install && pnpm --filter @robes/contracts test` → Expected: FAIL (cannot resolve).

**Step 3: Implement**

`packages/contracts/src/index.ts`
```ts
import { z } from 'zod';

export const ErrorCode = z.enum([
  'unauthenticated',
  'forbidden',
  'not_found',
  'invalid_input',
  'conflict',
  'payload_too_large',
  'rate_limited',
  'quota_exceeded',
  'capacity',
  'disabled',
  'upgrade_required',
  'internal',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ErrorBody = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
    requestId: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ErrorBody = z.infer<typeof ErrorBody>;

export const EmptyInput = z.object({});
export const HealthOutput = z.object({ ok: z.literal(true) });
```

Run tests → PASS.

**Step 4: Commit**
```bash
git add platform/packages/contracts platform/pnpm-lock.yaml
git commit -m "platform: @robes/contracts error + health"
```

---

### Task 8: `@robes/api` — JWT verifier (SEC-01)

**Files:**
- Create: `packages/api/package.json`, `packages/api/tsconfig.json`
- Create: `packages/api/src/auth.ts`
- Create: `packages/api/test/keys.ts` (test helper)
- Test: `packages/api/src/auth.test.ts`

**Step 1: Scaffolding**

`packages/api/package.json`
```json
{
  "name": "@robes/api",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "test": "vitest run", "typecheck": "tsc -p tsconfig.json" },
  "dependencies": {
    "@robes/contracts": "workspace:*",
    "@upstash/ratelimit": "2.2.0",
    "@upstash/redis": "1.39.0",
    "jose": "catalog:",
    "zod": "catalog:"
  },
  "devDependencies": { "fast-check": "catalog:", "typescript": "catalog:", "vitest": "catalog:" }
}
```
`packages/api/tsconfig.json`: `{ "extends": "../../tsconfig.base.json", "include": ["src", "test"] }`

Run: `pnpm install`

**Step 2: Test helper**

`packages/api/test/keys.ts`
```ts
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';

export const ISSUER = 'https://test.supabase.co/auth/v1';

export async function makeKeys() {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'test', alg: 'ES256' };
  const getKey = createLocalJWKSet({ keys: [jwk] });
  const sign = (
    sub: string,
    opts: { issuer?: string; audience?: string; exp?: string | number; extra?: Record<string, unknown> } = {},
  ) =>
    new SignJWT({ role: 'authenticated', ...opts.extra })
      .setProtectedHeader({ alg: 'ES256', kid: 'test' })
      .setSubject(sub)
      .setIssuer(opts.issuer ?? ISSUER)
      .setAudience(opts.audience ?? 'authenticated')
      .setIssuedAt()
      .setExpirationTime(opts.exp ?? '5m')
      .sign(privateKey);
  return { getKey, sign };
}
```

**Step 3: Failing test**

`packages/api/src/auth.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { ISSUER, makeKeys } from '../test/keys';
import { createJwtVerifier } from './auth';

const USER = '11111111-1111-4111-8111-111111111111';

describe('createJwtVerifier', async () => {
  const { getKey, sign } = await makeKeys();
  const verifier = createJwtVerifier({ getKey, issuer: ISSUER });

  it('accepts a valid token and returns the subject', async () => {
    expect(await verifier.verify(await sign(USER, { extra: { email: 'a@b.co' } }))).toEqual({
      id: USER,
      role: 'authenticated',
      email: 'a@b.co',
    });
  });
  it('rejects wrong issuer', async () => {
    expect(await verifier.verify(await sign(USER, { issuer: 'https://evil/auth/v1' }))).toBeNull();
  });
  it('rejects wrong audience', async () => {
    expect(await verifier.verify(await sign(USER, { audience: 'anon' }))).toBeNull();
  });
  it('rejects expired tokens', async () => {
    expect(await verifier.verify(await sign(USER, { exp: Math.floor(Date.now() / 1000) - 60 }))).toBeNull();
  });
  it('rejects garbage and unsigned tokens', async () => {
    expect(await verifier.verify('not.a.jwt')).toBeNull();
    const unsigned = `${btoa('{"alg":"none"}')}.${btoa(`{"sub":"${USER}"}`)}.`;
    expect(await verifier.verify(unsigned)).toBeNull();
  });
  it('rejects a non-uuid subject', async () => {
    expect(await verifier.verify(await sign('admin'))).toBeNull();
  });
});
```

Run: `pnpm --filter @robes/api test` → Expected: FAIL (cannot resolve `./auth`).

**Step 4: Implement**

`packages/api/src/auth.ts`
```ts
import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from 'jose';

export interface AuthUser {
  id: string;
  role: string;
  email?: string;
}

export interface TokenVerifier {
  verify(token: string): Promise<AuthUser | null>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createJwtVerifier(opts: {
  getKey: JWTVerifyGetKey;
  issuer: string;
  audience?: string;
}): TokenVerifier {
  return {
    async verify(token) {
      try {
        const { payload } = await jwtVerify(token, opts.getKey, {
          issuer: opts.issuer,
          audience: opts.audience ?? 'authenticated',
          algorithms: ['ES256', 'RS256'],
        });
        if (typeof payload.sub !== 'string' || !UUID.test(payload.sub)) return null;
        return {
          id: payload.sub,
          role: typeof payload.role === 'string' ? payload.role : 'authenticated',
          ...(typeof payload.email === 'string' ? { email: payload.email } : {}),
        };
      } catch {
        return null;
      }
    },
  };
}

export function remoteJwks(url: string): JWTVerifyGetKey {
  return createRemoteJWKSet(new URL(url));
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.get('authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}
```

Run tests → Expected: PASS (6 tests).

**Step 5: Commit**
```bash
git add platform/packages/api platform/pnpm-lock.yaml
git commit -m "platform: JWKS-based Supabase JWT verifier (SEC-01)"
```

---

### Task 9: `@robes/api` — errors and rate limiter

**Files:**
- Create: `packages/api/src/errors.ts`
- Create: `packages/api/src/rate-limit.ts`
- Test: `packages/api/src/rate-limit.test.ts`

**Step 1: Failing test**

`packages/api/src/rate-limit.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { createMemoryRateLimiter } from './rate-limit';

describe('memory rate limiter', () => {
  it('allows up to the limit then blocks with retry-after', async () => {
    let now = 1_000_000;
    const rl = createMemoryRateLimiter(() => now);
    for (let i = 0; i < 3; i++) expect((await rl.limit('k', 3, 60)).success).toBe(true);
    const blocked = await rl.limit('k', 3, 60);
    expect(blocked.success).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);
    now += 61_000;
    expect((await rl.limit('k', 3, 60)).success).toBe(true);
  });
  it('keys are independent', async () => {
    const rl = createMemoryRateLimiter();
    expect((await rl.limit('a', 1, 60)).success).toBe(true);
    expect((await rl.limit('b', 1, 60)).success).toBe(true);
  });
});
```

Run → FAIL (cannot resolve).

**Step 2: Implement**

`packages/api/src/errors.ts`
```ts
import type { ErrorCode } from '@robes/contracts';

export const STATUS: Record<ErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  invalid_input: 400,
  conflict: 409,
  payload_too_large: 413,
  rate_limited: 429,
  quota_exceeded: 429,
  capacity: 503,
  disabled: 503,
  upgrade_required: 426,
  internal: 500,
};

// Moves to @robes/copy in M2; product voice, never provider text (SEC-31).
export const MESSAGES: Record<ErrorCode, string> = {
  unauthenticated: 'Please sign in again.',
  forbidden: 'That isn’t available on your account.',
  not_found: 'We couldn’t find that.',
  invalid_input: 'Something in that request wasn’t quite right.',
  conflict: 'That changed while you were working. Refresh and try again.',
  payload_too_large: 'That was too large to send.',
  rate_limited: 'You’re going quickly. Give it a moment.',
  quota_exceeded: 'You’ve reached today’s limit for this.',
  capacity: 'Robes is busy right now. Try again shortly.',
  disabled: 'This is paused for a moment.',
  upgrade_required: 'Update Robes to keep going.',
  internal: 'Something went wrong on our side.',
};

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly extra: { details?: unknown; retryAfterSeconds?: number } = {},
  ) {
    super(code);
  }
}
```

`packages/api/src/rate-limit.ts`
```ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitResult {
  success: boolean;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  limit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult>;
}

// Dev/test only: per-process state is exactly what SEC-33 forbids in deployed environments.
export function createMemoryRateLimiter(now: () => number = Date.now): RateLimiter {
  const windows = new Map<string, { start: number; count: number }>();
  return {
    async limit(key, limit, windowSeconds) {
      const t = now();
      const windowMs = windowSeconds * 1000;
      const w = windows.get(key);
      if (!w || t - w.start >= windowMs) {
        windows.set(key, { start: t, count: 1 });
        return { success: true, retryAfterSeconds: 0 };
      }
      w.count += 1;
      if (w.count <= limit) return { success: true, retryAfterSeconds: 0 };
      return { success: false, retryAfterSeconds: Math.ceil((w.start + windowMs - t) / 1000) };
    },
  };
}

export function createUpstashRateLimiter(url: string, token: string): RateLimiter {
  const redis = new Redis({ url, token });
  const limiters = new Map<string, Ratelimit>();
  return {
    async limit(key, limit, windowSeconds) {
      const id = `${limit}/${windowSeconds}`;
      let rl = limiters.get(id);
      if (!rl) {
        rl = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`), prefix: 'rl' });
        limiters.set(id, rl);
      }
      const res = await rl.limit(key);
      return {
        success: res.success,
        retryAfterSeconds: res.success ? 0 : Math.max(1, Math.ceil((res.reset - Date.now()) / 1000)),
      };
    },
  };
}
```

Run → PASS.

**Step 3: Commit**
```bash
git add platform/packages/api
git commit -m "platform: api error model and rate limiters"
```

---

### Task 10: `@robes/api` — the `route()` wrapper (SEC-01, 04, 30, 31, 32)

**Files:**
- Create: `packages/api/src/route.ts`
- Create: `packages/api/src/index.ts`
- Test: `packages/api/src/route.test.ts`

**Step 1: Failing tests**

`packages/api/src/route.test.ts`
```ts
import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ISSUER, makeKeys } from '../test/keys';
import { createJwtVerifier } from './auth';
import { createMemoryRateLimiter } from './rate-limit';
import { createRouteFactory } from './route';

const USER = '11111111-1111-4111-8111-111111111111';

async function setup(opts: { admins?: string[] } = {}) {
  const { getKey, sign } = await makeKeys();
  const logger = { error: vi.fn() };
  const route = createRouteFactory({
    verifier: createJwtVerifier({ getKey, issuer: ISSUER }),
    isAdmin: async (id) => (opts.admins ?? []).includes(id),
    rateLimiter: createMemoryRateLimiter(),
    clientIp: () => '203.0.113.9',
    logger,
    validateOutput: true,
  });
  return { route, sign, logger };
}

const post = (body: unknown, token?: string, raw?: string) =>
  new Request('http://x/api/v1/t', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: raw ?? JSON.stringify(body),
  });

describe('route()', async () => {
  it('serves a public route and sets x-request-id', async () => {
    const { route } = await setup();
    const GET = route({ auth: 'public', input: z.object({}), output: z.object({ ok: z.literal(true) }), handler: async () => ({ ok: true as const }) });
    const res = await GET(new Request('http://x/api/v1/health'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get('x-request-id')).toBeTruthy();
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });

  it('exposes its auth mode for the route-manifest test', async () => {
    const { route } = await setup();
    const h = route({ auth: 'user', input: z.object({}), output: z.object({}), handler: async () => ({}) });
    expect(h.auth).toBe('user');
  });

  it('401s a user route without a token or with a bad token', async () => {
    const { route } = await setup();
    const POST = route({ auth: 'user', input: z.object({}), output: z.object({}), handler: async () => ({}) });
    expect((await POST(post({}))).status).toBe(401);
    const bad = await POST(post({}, 'nope'));
    expect(bad.status).toBe(401);
    expect((await bad.json()).error.code).toBe('unauthenticated');
  });

  it('passes the verified user to the handler and ignores body userId', async () => {
    const { route, sign } = await setup();
    const POST = route({
      auth: 'user',
      input: z.object({ note: z.string().max(10) }),
      output: z.object({ userId: z.string() }),
      handler: async ({ user }) => ({ userId: user.id }),
    });
    const res = await POST(post({ note: 'hi', userId: 'someone-else' }, await sign(USER)));
    expect(await res.json()).toEqual({ userId: USER });
  });

  it('403s admin routes for non-admins and allows admins', async () => {
    const { route, sign } = await setup({ admins: [USER] });
    const GET = route({ auth: 'admin', input: z.object({}), output: z.object({}), handler: async () => ({}) });
    const other = '22222222-2222-4222-8222-222222222222';
    const req = async (sub: string) =>
      GET(new Request('http://x', { headers: { authorization: `Bearer ${await sign(sub)}` } }));
    expect((await req(other)).status).toBe(403);
    expect((await req(USER)).status).toBe(200);
  });

  it('returns 400 (never 500) for any JSON body that fails validation', async () => {
    const { route, sign } = await setup();
    const token = await sign(USER);
    const POST = route({
      auth: 'user',
      input: z.object({ prompt: z.string().min(1).max(300), ids: z.array(z.uuid()).max(3) }),
      output: z.object({}),
      handler: async () => ({}),
    });
    await fc.assert(
      fc.asyncProperty(fc.jsonValue(), async (body) => {
        const res = await POST(post(body, token));
        expect([200, 400, 413]).toContain(res.status);
      }),
      { numRuns: 200 },
    );
    expect((await POST(post(null, token, '{not json'))).status).toBe(400);
  });

  it('413s bodies over 32KB', async () => {
    const { route, sign } = await setup();
    const POST = route({ auth: 'user', input: z.object({}).passthrough(), output: z.object({}), handler: async () => ({}) });
    const res = await POST(post({ big: 'x'.repeat(33 * 1024) }, await sign(USER)));
    expect(res.status).toBe(413);
  });

  it('hides internal errors behind a generic message and logs them', async () => {
    const { route, logger } = await setup();
    const GET = route({
      auth: 'public',
      input: z.object({}),
      output: z.object({}),
      handler: async () => {
        throw new Error('db password is hunter2');
      },
    });
    const res = await GET(new Request('http://x'));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('hunter2');
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('rate limits per user and sets Retry-After', async () => {
    const { route, sign } = await setup();
    const token = await sign(USER);
    const POST = route({
      auth: 'user',
      input: z.object({}),
      output: z.object({}),
      rateLimit: { key: 't', limit: 2, windowSeconds: 60 },
      handler: async () => ({}),
    });
    await POST(post({}, token));
    await POST(post({}, token));
    const res = await POST(post({}, token));
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('60');
  });
});
```

Run: `pnpm --filter @robes/api test` → Expected: FAIL (cannot resolve `./route`).

**Step 2: Implement**

`packages/api/src/route.ts`
```ts
import type { z } from 'zod';
import { type AuthUser, bearerToken, type TokenVerifier } from './auth';
import { ApiError, MESSAGES, STATUS } from './errors';
import type { RateLimiter } from './rate-limit';

export type AuthMode = 'public' | 'user' | 'admin';

const MAX_BODY_BYTES = 32 * 1024;

export interface RouteDeps {
  verifier: TokenVerifier;
  isAdmin(userId: string): Promise<boolean>;
  rateLimiter: RateLimiter;
  clientIp(req: Request): string;
  logger: { error(obj: Record<string, unknown>, msg: string): void };
  validateOutput?: boolean;
}

type UserFor<A extends AuthMode> = A extends 'public' ? AuthUser | null : AuthUser;

export interface RouteOptions<A extends AuthMode, I extends z.ZodType, O extends z.ZodType> {
  auth: A;
  input: I;
  output: O;
  status?: number;
  rateLimit?: { key: string; limit: number; windowSeconds: number };
  handler(args: {
    input: z.infer<I>;
    user: UserFor<A>;
    req: Request;
    params: Record<string, string>;
    requestId: string;
  }): Promise<z.infer<O>>;
}

export type RouteHandler = ((
  req: Request,
  ctx?: { params?: Promise<Record<string, string>> },
) => Promise<Response>) & { auth: AuthMode };

function json(body: unknown, status: number, requestId: string, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'private, no-store',
      'x-request-id': requestId,
      ...extra,
    },
  });
}

async function readInput(req: Request): Promise<unknown> {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'DELETE') {
    return Object.fromEntries(new URL(req.url).searchParams);
  }
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) throw new ApiError('payload_too_large');
  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw new ApiError('payload_too_large');
  if (text.length === 0) return {};
  if (!(req.headers.get('content-type') ?? '').includes('application/json')) {
    throw new ApiError('invalid_input');
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError('invalid_input');
  }
}

export function createRouteFactory(deps: RouteDeps) {
  return function route<A extends AuthMode, I extends z.ZodType, O extends z.ZodType>(
    opts: RouteOptions<A, I, O>,
  ): RouteHandler {
    const handler = async (req: Request, ctx?: { params?: Promise<Record<string, string>> }) => {
      const requestId = crypto.randomUUID();
      try {
        let user: AuthUser | null = null;
        if (opts.auth !== 'public') {
          const token = bearerToken(req);
          user = token ? await deps.verifier.verify(token) : null;
          if (!user) throw new ApiError('unauthenticated');
          if (opts.auth === 'admin' && !(await deps.isAdmin(user.id))) throw new ApiError('forbidden');
        }
        if (opts.rateLimit) {
          const who = user?.id ?? `ip:${deps.clientIp(req)}`;
          const r = await deps.rateLimiter.limit(
            `${opts.rateLimit.key}:${who}`,
            opts.rateLimit.limit,
            opts.rateLimit.windowSeconds,
          );
          if (!r.success) throw new ApiError('rate_limited', { retryAfterSeconds: r.retryAfterSeconds });
        }
        const parsed = opts.input.safeParse(await readInput(req));
        if (!parsed.success) {
          throw new ApiError('invalid_input', {
            details: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
          });
        }
        const params = (await ctx?.params) ?? {};
        const out = await opts.handler({
          input: parsed.data,
          user: user as UserFor<A>,
          req,
          params,
          requestId,
        });
        return json(deps.validateOutput ? opts.output.parse(out) : out, opts.status ?? 200, requestId);
      } catch (err) {
        if (err instanceof ApiError) {
          const extra: Record<string, string> = {};
          if (err.extra.retryAfterSeconds) extra['retry-after'] = String(err.extra.retryAfterSeconds);
          return json(
            {
              error: {
                code: err.code,
                message: MESSAGES[err.code],
                requestId,
                ...(err.extra.details ? { details: err.extra.details } : {}),
              },
            },
            STATUS[err.code],
            requestId,
            extra,
          );
        }
        deps.logger.error({ requestId, err: err instanceof Error ? err.message : String(err) }, 'route_error');
        return json(
          { error: { code: 'internal', message: MESSAGES.internal, requestId } },
          500,
          requestId,
        );
      }
    };
    return Object.assign(handler, { auth: opts.auth });
  };
}
```

`packages/api/src/index.ts`
```ts
export * from './auth';
export * from './errors';
export * from './rate-limit';
export * from './route';
```

**Step 3: Run tests**

Run: `pnpm --filter @robes/api test && pnpm --filter @robes/api typecheck`
Expected: PASS (all route, auth and rate-limit tests); typecheck exits 0.

**Step 4: Commit**
```bash
git add platform/packages/api
git commit -m "platform: route() wrapper enforcing auth, validation, limits and safe errors"
```

---

### Task 11: `platform/app` — Next.js 16 skeleton with tokens

**Files:**
- Create: `app/package.json`, `app/tsconfig.json`, `app/next.config.ts`, `app/postcss.config.mjs`, `app/.env.example`
- Create: `app/src/app/layout.tsx`, `app/src/app/page.tsx`, `app/src/app/globals.css`

**Step 1: Files** (`app/` already exists with a `README.md`; keep it)

`app/package.json`
```json
{
  "name": "@robes/app",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@robes/api": "workspace:*",
    "@robes/config": "workspace:*",
    "@robes/contracts": "workspace:*",
    "@robes/tokens": "workspace:*",
    "next": "16.3.6",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "server-only": "0.0.1",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@playwright/test": "1.63.0",
    "@tailwindcss/postcss": "4.3.3",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "tailwindcss": "4.3.3",
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
```

`app/tsconfig.json`
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "src", ".next/types/**/*.ts", "e2e", "*.ts"],
  "exclude": ["node_modules"]
}
```

`app/next.config.ts`
```ts
import type { NextConfig } from 'next';

const staticSecurityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@robes/api', '@robes/config', '@robes/contracts', '@robes/tokens'],
  async headers() {
    return [{ source: '/:path*', headers: staticSecurityHeaders }];
  },
};

export default config;
```

`app/postcss.config.mjs`
```js
export default { plugins: { '@tailwindcss/postcss': {} } };
```

`app/.env.example`
```
NODE_ENV=development
APP_ENV=dev
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_PUBLISHABLE_KEY=sb_publishable_local_development_key
```

`app/src/app/globals.css`
```css
@import "tailwindcss";
@import "@robes/tokens/theme.css";
@import "@robes/tokens/web.css";

body {
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-sans);
}

:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
```

`app/src/app/layout.tsx`
```tsx
import type { Metadata } from 'next';
import { Cormorant, Inter } from 'next/font/google';
import './globals.css';

const cormorant = Cormorant({ subsets: ['latin'], weight: ['300', '400'], style: ['normal', 'italic'], variable: '--font-cormorant' });
const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--font-inter' });

export const metadata: Metadata = { title: 'Robes', description: 'Your wardrobe, styled.' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```
(`next/font/google` downloads fonts at build time and serves them from our origin — no runtime request to Google, compatible with the CSP.)

`app/src/app/page.tsx`
```tsx
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-6">
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-ink-muted">Robes</p>
      <h1 className="font-display text-5xl font-light text-ink">Your wardrobe, styled.</h1>
      <p className="text-ink-muted">Platform foundations are running.</p>
    </main>
  );
}
```

**Step 2: Verify**

Run (from `platform/`):
```bash
cp app/.env.example app/.env.local
pnpm install
pnpm --filter @robes/tokens build
pnpm --filter @robes/app build
```
Expected: `next build` completes; route `/` listed. Then `pnpm --filter @robes/app start` and open http://localhost:3000 — cream background, Cormorant headline. Stop the server.

**Step 3: Commit**
```bash
git add platform/app platform/pnpm-lock.yaml
git commit -m "platform: Next.js 16 app skeleton on shared tokens"
```

---

### Task 12: `platform/app` — CSP proxy, health route, route manifest test (SEC-01, SEC-50)

**Files:**
- Create: `app/src/server/env.ts`, `app/src/server/route.ts`, `app/src/server/security-headers.ts`
- Create: `app/src/proxy.ts`
- Create: `app/src/app/api/v1/health/route.ts`
- Create: `app/vitest.config.ts`, `app/vitest.setup.ts`
- Test: `app/src/server/security-headers.test.ts`, `app/src/app/api/v1/route-manifest.test.ts`

**Step 1: Failing unit test for CSP**

`app/src/server/security-headers.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { buildCsp } from './security-headers';

describe('buildCsp', () => {
  const csp = buildCsp({ nonce: 'abc', isDev: false, supabaseUrl: 'https://p.supabase.co' });
  it('locks scripts to self + nonce with strict-dynamic', () => {
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).not.toContain('unsafe-eval');
  });
  it('forbids framing, plugins and base hijack', () => {
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
  });
  it('allows Supabase https and websocket', () => {
    expect(csp).toContain('connect-src \'self\' https://p.supabase.co wss://p.supabase.co');
  });
  it('allows eval only in dev', () => {
    expect(buildCsp({ nonce: 'n', isDev: true, supabaseUrl: 'http://127.0.0.1:54321' })).toContain("'unsafe-eval'");
  });
});
```

`app/vitest.config.ts`
```ts
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { setupFiles: ['./vitest.setup.ts'], exclude: ['e2e/**', 'node_modules/**'] },
});
```

`app/vitest.setup.ts`
```ts
import { vi } from 'vitest';

vi.mock('server-only', () => ({}));
Object.assign(process.env, {
  APP_ENV: 'dev',
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local_development_key',
});
```

Run: `pnpm --filter @robes/app test` → Expected: FAIL (cannot resolve `./security-headers`).

**Step 2: Implement headers + proxy**

`app/src/server/security-headers.ts`
```ts
export function buildCsp(opts: { nonce: string; isDev: boolean; supabaseUrl: string }): string {
  const supabase = new URL(opts.supabaseUrl).origin;
  const supabaseWs = supabase.replace(/^http/, 'ws');
  const directives: Array<[string, string[]]> = [
    ['default-src', ["'self'"]],
    ['script-src', ["'self'", `'nonce-${opts.nonce}'`, "'strict-dynamic'", ...(opts.isDev ? ["'unsafe-eval'"] : [])]],
    ['style-src', ["'self'", "'unsafe-inline'"]],
    ['img-src', ["'self'", 'data:', 'blob:']],
    ['font-src', ["'self'"]],
    ['connect-src', ["'self'", supabase, supabaseWs]],
    ['frame-ancestors', ["'none'"]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
  ];
  const csp = directives.map(([k, v]) => `${k} ${v.join(' ')}`).join('; ');
  return opts.isDev ? csp : `${csp}; upgrade-insecure-requests`;
}
```
(`style-src 'unsafe-inline'` is deliberate: SSR style attributes can't carry nonces; script-src is the XSS control. Media origins are added in M1.)

`app/src/proxy.ts`
```ts
import { type NextRequest, NextResponse } from 'next/server';
import { buildCsp } from './server/security-headers';

export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp({
    nonce,
    isDev: process.env.NODE_ENV !== 'production',
    supabaseUrl: process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321',
  });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('content-security-policy', csp);
  return response;
}

export const config = {
  matcher: [{ source: '/((?!_next/static|_next/image|favicon.ico).*)' }],
};
```
Note: Next 16 renamed `middleware.ts` → `proxy.ts` (exported function `proxy`). If the build warns about the file name or export, check https://nextjs.org/docs/app/api-reference/file-conventions/proxy and follow it.

Run: `pnpm --filter @robes/app test` → CSP tests PASS.

**Step 3: Server env + route factory + health**

`app/src/server/env.ts`
```ts
import 'server-only';
import { appServerEnv, parseEnv } from '@robes/config';

export const env = parseEnv(appServerEnv, process.env);
```

`app/src/server/route.ts`
```ts
import 'server-only';
import {
  createJwtVerifier,
  createMemoryRateLimiter,
  createRouteFactory,
  createUpstashRateLimiter,
  remoteJwks,
} from '@robes/api';
import { env } from './env';

const rateLimiter =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? createUpstashRateLimiter(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN)
    : createMemoryRateLimiter();

export const route = createRouteFactory({
  verifier: createJwtVerifier({ getKey: remoteJwks(env.SUPABASE_JWKS_URL), issuer: env.SUPABASE_JWT_ISSUER }),
  // M1 replaces this with a service-role lookup of private.admin_users.
  isAdmin: async () => false,
  rateLimiter,
  clientIp: (req) => req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
  logger: { error: (obj, msg) => console.error(JSON.stringify({ level: 'error', msg, ...obj })) },
  validateOutput: env.APP_ENV !== 'production',
});
```

`app/src/app/api/v1/health/route.ts`
```ts
import { EmptyInput, HealthOutput } from '@robes/contracts';
import { route } from '@/server/route';

export const GET = route({
  auth: 'public',
  input: EmptyInput,
  output: HealthOutput,
  handler: async () => ({ ok: true as const }),
});
```

**Step 4: Route manifest test (SEC-01)**

`app/src/app/api/v1/route-manifest.test.ts`
```ts
import { globSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Every public route must be listed here AND in docs/api.md §3.
const PUBLIC_ROUTES = new Set(['/api/v1/health']);
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
const here = dirname(fileURLToPath(import.meta.url));
const files = globSync('**/route.ts', { cwd: here });

describe('API route manifest (SEC-01)', () => {
  it('finds routes', () => expect(files.length).toBeGreaterThan(0));

  it.each(files)('%s is built with route() and protected unless allow-listed', async (file) => {
    const path = `/api/v1/${dirname(relative('.', file))}`.replace(/\/\.$/, '');
    const mod = (await import(`./${file}`)) as Record<string, unknown>;
    for (const method of METHODS) {
      const handler = mod[method] as ((req: Request) => Promise<Response>) & { auth?: string };
      if (!handler) continue;
      expect(handler.auth, `${method} ${path} must use route()`).toBeDefined();
      if (handler.auth === 'public') {
        expect(PUBLIC_ROUTES.has(path), `${method} ${path} is public but not allow-listed`).toBe(true);
      } else {
        const res = await handler(new Request(`http://x${path}`, { method }));
        expect(res.status, `${method} ${path} without a token`).toBe(401);
      }
    }
  });
});
```

Run: `pnpm --filter @robes/app test` → Expected: PASS (CSP + manifest).

**Step 5: Playwright header + health e2e**

`app/playwright.config.ts`
```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:3100' },
  webServer: { command: 'pnpm build && pnpm start -p 3100', port: 3100, reuseExistingServer: !process.env.CI, timeout: 180_000 },
});
```

`app/e2e/security.spec.ts`
```ts
import { expect, test } from '@playwright/test';

test('pages carry CSP and security headers', async ({ request }) => {
  const res = await request.get('/');
  const h = res.headers();
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['content-security-policy']).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(h['strict-transport-security']).toContain('max-age=63072000');
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['x-powered-by']).toBeUndefined();
});

test('health returns ok only', async ({ request }) => {
  const res = await request.get('/api/v1/health');
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});
```

Run:
```bash
pnpm --filter @robes/app exec playwright install chromium
pnpm --filter @robes/app test:e2e
```
Expected: 2 passed.

**Step 6: Commit**
```bash
git add platform/app
git commit -m "platform: CSP proxy, health route, route-manifest and header tests (SEC-01, SEC-50)"
```

---

### Task 13: Supabase local project + baseline migrations with pgTAP (SEC-10..15, closes C1)

**Files:**
- Create: `supabase/config.toml` (via CLI)
- Create: `supabase/migrations/20260924000100_baseline.sql`
- Create: `supabase/migrations/20260924000200_identity.sql`
- Test: `supabase/tests/database/000_meta.test.sql`, `supabase/tests/database/010_identity.test.sql`

**Step 1: Init**

Run (from `platform/`): `pnpm supabase init`
Expected: `Finished supabase init.` and `supabase/config.toml` exists. Edit `supabase/config.toml`: set `project_id = "robes-platform"`; under `[auth]` set `site_url = "http://localhost:3000"` and `additional_redirect_urls = ["http://localhost:3000/auth/callback"]`; under `[auth.email]` set `enable_confirmations = true`; set `minimum_password_length = 10`.

**Step 2: Write the failing pgTAP tests first**

`supabase/tests/database/000_meta.test.sql`
```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity),
  0, 'every public table has RLS enabled (SEC-14)');

select is(
  (select count(*)::int from information_schema.role_table_grants
    where grantee = 'anon' and table_schema = 'public'),
  0, 'anon has no table privileges in public (SEC-12)');

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and coalesce(obj_description(c.oid, 'pg_class'), '') not like 'ownership:%'),
  0, 'every public table declares its ownership class');

select * from finish();
rollback;
```

`supabase/tests/database/010_identity.test.sql`
```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email, raw_user_meta_data, aud, role)
values
  ('11111111-1111-4111-8111-111111111111', 'a@test.dev', '{"first_name":"Ann"}', 'authenticated', 'authenticated'),
  ('22222222-2222-4222-8222-222222222222', 'b@test.dev', '{}', 'authenticated', 'authenticated');

select is((select first_name from public.profiles where id = '11111111-1111-4111-8111-111111111111'),
  'Ann', 'signup trigger creates the profile');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select is((select count(*)::int from public.profiles), 1, 'a user sees only their own profile');
select lives_ok($$ update public.profiles set first_name = 'Annie'
  where id = '11111111-1111-4111-8111-111111111111' $$, 'a user can edit an editable column');
select throws_ok($$ update public.profiles set onboarded_at = now()
  where id = '11111111-1111-4111-8111-111111111111' $$, '42501', null,
  'a user cannot write a server-owned column (SEC-10)');
select throws_ok($$ update public.profiles set id = '22222222-2222-4222-8222-222222222222'
  where id = '11111111-1111-4111-8111-111111111111' $$, '42501', null, 'a user cannot change their id');
update public.profiles set first_name = 'Hacked' where id = '22222222-2222-4222-8222-222222222222';
select throws_ok($$ select * from private.admin_users $$, '42501', null, 'admin table is unreadable (SEC-11)');
select throws_ok($$ insert into private.admin_users (user_id, role)
  values ('11111111-1111-4111-8111-111111111111', 'admin') $$, '42501', null,
  'a user cannot make themselves admin (closes legacy C1)');
select is(private.is_admin(), false, 'a normal user is not admin');

reset role;
select is((select first_name from public.profiles where id = '22222222-2222-4222-8222-222222222222'),
  null, 'cross-user update changed nothing');

set local role anon;
select throws_ok($$ select * from public.profiles $$, '42501', null, 'anon cannot read profiles');
reset role;

insert into private.admin_users (user_id, role) values ('22222222-2222-4222-8222-222222222222', 'admin');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select is(private.is_admin(), true, 'admin_users grants admin');

select * from finish();
rollback;
```

Run: `pnpm db:start && pnpm db:test`
Expected: FAIL — `relation "public.profiles" does not exist` / `schema "private" does not exist`.

**Step 3: Migrations**

`supabase/migrations/20260924000100_baseline.sql`
```sql
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from public, anon;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
```

`supabase/migrations/20260924000200_identity.sql`
```sql
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text check (char_length(first_name) <= 60),
  last_name text check (char_length(last_name) <= 60),
  instagram_handle text check (instagram_handle ~ '^[A-Za-z0-9._]{1,30}$'),
  locale text not null default 'en-IE' check (char_length(locale) <= 20),
  timezone text not null default 'Europe/Dublin' check (char_length(timezone) <= 64),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'ownership: user-writable (column grants)';

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (first_name, last_name, instagram_handle, locale, timezone) on public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name)
  values (new.id, left(nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''), 60));
  return new;
end;
$$;
revoke execute on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

create table private.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'support', 'analyst')),
  granted_by uuid references auth.users (id),
  granted_at timestamptz not null default now()
);
revoke all on private.admin_users from public, anon, authenticated;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.admin_users a where a.user_id = (select auth.uid()));
$$;
revoke execute on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;
```

**Step 4: Verify**

Run: `pnpm db:reset && pnpm db:test`
Expected: `All tests successful.` (14 tests across 2 files). If `information_schema.role_table_grants` still shows anon grants, a Supabase default privilege for another role applied — add explicit `revoke all on public.<table> from anon` in the migration and re-run.

**Step 5: Commit**
```bash
git add platform/supabase
git commit -m "platform: supabase baseline + identity schema with pgTAP (closes legacy admin escalation)"
```

---

### Task 14: `platform/mobile` — Expo SDK 57 skeleton with Uniwind + shared tokens

**Files:**
- Create: `mobile/` via `create-expo-app`
- Modify: `mobile/package.json` (name), `mobile/metro.config.js`, `mobile/global.css`, `mobile/app/_layout.tsx`, `mobile/app/index.tsx`
- Test: `mobile/__tests__/home.test.tsx`

**Step 1: Scaffold**

`mobile/` already exists (it holds `README.md`), so scaffold into a temp folder and move the files in. Run (from `platform/`):
```bash
pnpm dlx create-expo-app@5.0.0 .mobile-tmp --template default@sdk-57 --no-install
rsync -a --exclude README.md .mobile-tmp/ mobile/ && rm -rf .mobile-tmp
```
Then in `mobile/package.json` set `"name": "@robes/mobile"` and `"private": true`. Remove any template example screens/components beyond `app/_layout.tsx` and `app/index.tsx` (delete `app/(tabs)`, `components/`, `constants/`, `hooks/`, `scripts/reset-project.js` if present).

Run: `pnpm install && pnpm --filter @robes/mobile exec expo --version && grep '"expo":' mobile/package.json`
Expected: expo CLI prints a version; `"expo": "~57.0.x"`.

If Metro later fails to resolve workspace packages under pnpm's isolated layout, follow https://docs.expo.dev/guides/monorepos/ (as a last resort add `node-linker=hoisted` in `platform/.npmrc` and reinstall).

**Step 2: Add Uniwind and shared packages**

Run:
```bash
pnpm --filter @robes/mobile add uniwind@1.12.0 tailwindcss@4.3.3 @robes/tokens@workspace:*
pnpm --filter @robes/mobile add -D jest-expo @testing-library/react-native
pnpm --filter @robes/mobile exec expo install jest-expo @expo-google-fonts/cormorant @expo-google-fonts/inter expo-font
```

`mobile/metro.config.js`
```js
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withUniwindConfig(config, { cssEntryFile: './global.css' });
```

`mobile/global.css`
```css
@import "tailwindcss";
@import "uniwind";
@import "@robes/tokens/theme.css";
@import "@robes/tokens/native.css";
```

(Confirm the metro import path and CSS entry against https://docs.uniwind.dev/quickstart at install time; adjust both files together if the API differs.)

**Step 3: Failing test**

In `mobile/package.json` add `"scripts": { ..., "test": "jest", "typecheck": "tsc --noEmit" }` and `"jest": { "preset": "jest-expo" }`.

`mobile/__tests__/home.test.tsx`
```tsx
import { render, screen } from '@testing-library/react-native';
import Home from '../app/index';

test('home renders the brand line', () => {
  render(<Home />);
  expect(screen.getByText('Your wardrobe, styled.')).toBeTruthy();
});
```

Run: `pnpm --filter @robes/mobile test` → Expected: FAIL (text not found — template screen still present).

**Step 4: Implement screens**

`mobile/app/_layout.tsx`
```tsx
import '../global.css';
import { Cormorant_300Light } from '@expo-google-fonts/cormorant';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';

export default function RootLayout() {
  const [loaded] = useFonts({ Cormorant_300Light, Inter_400Regular, Inter_500Medium });
  if (!loaded) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

`mobile/app/index.tsx`
```tsx
import { Text, View } from 'react-native';

export default function Home() {
  return (
    <View className="flex-1 justify-center gap-4 bg-bg px-6">
      <Text className="text-xs uppercase tracking-widest text-ink-muted">Robes</Text>
      <Text className="text-5xl text-ink" style={{ fontFamily: 'Cormorant_300Light' }}>
        Your wardrobe, styled.
      </Text>
      <Text className="text-ink-muted" style={{ fontFamily: 'Inter_400Regular' }}>
        Platform foundations are running.
      </Text>
    </View>
  );
}
```
(Font family mapping into tokens for native is finalised in M2 `ui-native`.)

**Step 5: Verify**

Run: `pnpm --filter @robes/mobile test && pnpm --filter @robes/mobile typecheck`
Expected: PASS; typecheck exit 0.
Manual: `pnpm --filter @robes/mobile exec expo start` → open iOS simulator (press `i`) → cream background, serif headline. Toggle simulator dark mode (Cmd+Shift+A) → ink background, cream text.

**Step 6: Commit**
```bash
git add platform/mobile platform/pnpm-lock.yaml
git commit -m "platform: Expo SDK 57 app on Uniwind with shared tokens"
```

---

### Task 15: CI for the platform

**Files:**
- Create: `.github/workflows/platform-ci.yml` (repo root)

**Step 1: Workflow**

`.github/workflows/platform-ci.yml`
```yaml
name: platform-ci

on:
  pull_request:
    paths: ['platform/**', '.github/workflows/platform-*.yml']
  push:
    branches: [platform]
    paths: ['platform/**', '.github/workflows/platform-*.yml']

concurrency:
  group: platform-ci-${{ github.ref }}
  cancel-in-progress: true

defaults:
  run:
    working-directory: platform

env:
  APP_ENV: dev
  SUPABASE_URL: http://127.0.0.1:54321
  SUPABASE_PUBLISHABLE_KEY: sb_publishable_local_development_key

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
        with: { package_json_file: platform/package.json }
      - uses: actions/setup-node@v5
        with:
          node-version-file: platform/.nvmrc
          cache: pnpm
          cache-dependency-path: platform/pnpm-lock.yaml
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm --filter @robes/tokens build
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm --filter @robes/app build

  database:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
        with: { package_json_file: platform/package.json }
      - uses: actions/setup-node@v5
        with: { node-version-file: platform/.nvmrc, cache: pnpm, cache-dependency-path: platform/pnpm-lock.yaml }
      - run: pnpm install --frozen-lockfile
      - run: pnpm supabase start -x studio,imgproxy,inbucket,edge-runtime,logflare,vector,supavisor
      - run: pnpm supabase db lint --fail-on error
      - run: pnpm db:test

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
        with: { package_json_file: platform/package.json }
      - uses: actions/setup-node@v5
        with: { node-version-file: platform/.nvmrc, cache: pnpm, cache-dependency-path: platform/pnpm-lock.yaml }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @robes/tokens build
      - run: pnpm --filter @robes/app exec playwright install --with-deps chromium
      - run: pnpm --filter @robes/app test:e2e
        env: { NODE_ENV: production }

  secrets:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: . } }
    steps:
      - uses: actions/checkout@v5
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2
        env: { GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}' }
```

**Step 2: Verify locally what CI runs**

Run (from `platform/`): `pnpm lint && pnpm --filter @robes/tokens build && pnpm typecheck && pnpm test && pnpm db:test`
Expected: all succeed.

**Step 3: Commit and push the branch**
```bash
git add .github/workflows/platform-ci.yml
git commit -m "platform: CI (lint, typecheck, unit, pgTAP, e2e, gitleaks)"
git push -u origin platform
```
Expected: the `platform-ci` workflow runs on GitHub and all four jobs pass. Fix anything red before M1.

---

### Task 16: Close out M0

**Files:**
- Modify: `platform/CLAUDE.md` (status line), `platform/docs/plans/README.md` (tick M0)

**Step 1:** Update the status line at the top of `platform/CLAUDE.md` to `Current milestone: M1 (M0 complete <date>)` and tick M0 in `docs/plans/README.md`.

**Step 2: Final verification** — run @superpowers:verification-before-completion: `pnpm lint && pnpm typecheck && pnpm test && pnpm db:test && pnpm --filter @robes/app test:e2e` all green; CI green on GitHub.

**Step 3: Commit**
```bash
git add platform/CLAUDE.md platform/docs/plans/README.md
git commit -m "platform: M0 foundations complete"
```

**M0 exit criteria (SPEC §8):** CI green; `/api/v1/health` live locally; CSP/HSTS header test passes; route-manifest test guards SEC-01; pgTAP proves no user can grant themselves admin; web and native both render from `@robes/tokens`.

---

## Execution notes (2026-09-24)

Executed on branch `feat/m0-foundations`. Where reality differed from the plan:

| Task | Deviation | Why |
|---|---|---|
| 2 | `onlyBuiltDependencies` → `allowBuilds:` map; `biome migrate` changed `"recommended": true` → `"preset": "recommended"` | pnpm 11 ignores the old key (`ERR_PNPM_IGNORED_BUILDS`); Biome 2.5 config schema |
| 2 | pnpm added `minimumReleaseAgeExclude: ['@upstash/ratelimit@2.2.0']` | pnpm 11 supply-chain policy refuses packages published in the last day by default |
| 11 | `next-env.d.ts` gitignored | Generated by Next |
| 12 | Root layout awaits `connection()`; new e2e test asserts no CSP violations | A statically prerendered `/` can't carry the per-request nonce, so `'strict-dynamic'` blocked every Next script in production (verified: page never hydrated) |
| 12 | `test:e2e` = `next build && playwright test`; `webServer.command` = `next start -p 3100`; HTML reporter `open: 'never'` | With `pnpm build && pnpm start` Playwright could not stop `next-server` at teardown, and the HTML reporter blocked on failure |
| 14 | Screens live in `mobile/src/app` (not `mobile/app`); `metro.config.js` points at `./src/global.css` and generates `src/uniwind-types.d.ts` (committed) | SDK 57 template layout; Uniwind quickstart; typecheck without Metro running |
| 14 | Test awaits `render()`; `@types/jest` pinned by `expo install`; `types: ["jest"]` + `src/env.d.ts` for `.css` imports | RNTL 14 async render; TS 6 checks side-effect imports |
| 14 | Kept the template's `AGENTS.md`/`CLAUDE.md` (Expo guidance), prefixed with platform rules | Useful for agents working in `mobile/` |
| 15 | `gitleaks/gitleaks-action` → pinned `zricethezav/gitleaks:v8.30.1` CLI over the PR/push commit range | The action needs a paid licence for org repos; full-history scans flag 13 known legacy findings outside `platform/` |
| — | Added `pnpm bootstrap` / `dev:web` / `dev:mobile` / `verify`, `.editorconfig`, `.vscode`, README recipes; `turbo dev` depends on `^build` | Team handover (not in plan). Not `pnpm setup`: that's a pnpm built-in |
| review | Independent code review fixes: `route()` always parses output (strips undeclared fields in prod), streams bodies with a byte cap, throttles failed auth per IP (`AUTH_FAILURE_LIMIT`), accepts repeated query keys as arrays + optional `params` schema; verifier requires `exp`/`sub` and rejects `is_anonymous`; `is_admin()` requires `role = 'admin'`; EXECUTE-to-PUBLIC revoked globally (per-schema revoke is a Postgres no-op) with a meta test allow-listing `private` functions; manifest test covers all of `src/app`, HEAD/OPTIONS, forged tokens; `clientIp` falls back through forwarded headers; proxy fails closed without `SUPABASE_URL`; gitleaks range handles first pushes | Hardening M1 builds on |
| — | Mobile runs entirely through Expo, Expo Go by default (ADR 018); `expo-doctor` pinned and in CI | Easiest dev setup; dev client only when a module forces it |

Verified locally: `pnpm verify` green (lint, typecheck, 7 turbo test tasks, 17 pgTAP), `db lint` clean, 3/3 Playwright e2e, web dev server CSP-clean, iOS simulator (Expo Go via `pnpm dev:ios`) renders light + dark from `@robes/tokens`; `expo-doctor` 21/21. **Not yet done:** push + CI green on GitHub (awaiting review of the branch).
