import { readFileSync } from 'node:fs';

type Manifest = { dependencies: Record<string, string> };

const media = JSON.parse(
  readFileSync(new URL('../../../packages/media/package.json', import.meta.url), 'utf8'),
) as Manifest;

// Pinned once, in @robes/media; the Lambda ships the same sharp the tests ran against.
export const SHARP_VERSION = media.dependencies.sharp ?? '';

// Native binaries must match Lambda (linux-arm64, glibc), not the machine running cdk.
export function linuxArm64Install(outputDir: string, modules: Record<string, string>): string {
  const specs = Object.entries(modules).map(([name, version]) => `${name}@${version}`);
  return [
    `npm install --prefix "${outputDir}"`,
    '--no-save --no-package-lock --no-audit --no-fund',
    '--os=linux --cpu=arm64 --libc=glibc',
    ...specs,
  ].join(' ');
}
