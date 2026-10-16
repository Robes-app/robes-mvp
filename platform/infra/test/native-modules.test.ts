import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { linuxArm64Install, SHARP_VERSION } from '../src/lib/native-modules';
import { functionNamed, synth } from './synth';

describe('RenditionFn sharp packaging', () => {
  it('pins the exact sharp version @robes/media is tested with', () => {
    const media = JSON.parse(
      readFileSync(new URL('../../packages/media/package.json', import.meta.url), 'utf8'),
    ) as { dependencies: Record<string, string> };
    expect(SHARP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(SHARP_VERSION).toBe(media.dependencies.sharp);
  });

  it('installs linux-arm64 binaries into the asset, whatever machine runs cdk', () => {
    expect(linuxArm64Install('/tmp/out', { sharp: '1.2.3' })).toBe(
      'npm install --prefix "/tmp/out" --no-save --no-package-lock --no-audit --no-fund --os=linux --cpu=arm64 --libc=glibc sharp@1.2.3',
    );
  });

  it.each(['staging', 'production'] as const)('%s bundles sharp instead of a layer', (stage) => {
    expect(functionNamed(synth(stage), 'rendition').properties.Layers).toBeUndefined();
  });
});
