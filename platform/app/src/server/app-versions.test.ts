import { AppVersions, compareVersions } from '@robes/contracts';
import { expect, it } from 'vitest';
import { APP_VERSIONS } from './app-versions';

it('the minimum never passes the latest, and both are plain dotted versions', () => {
  expect(AppVersions.parse(APP_VERSIONS)).toEqual(APP_VERSIONS);
  expect(APP_VERSIONS.minimum).toMatch(/^\d+(\.\d+)*$/);
  expect(APP_VERSIONS.latest).toMatch(/^\d+(\.\d+)*$/);
  expect(compareVersions(APP_VERSIONS.minimum, APP_VERSIONS.latest)).toBeLessThanOrEqual(0);
});
