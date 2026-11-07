import { errors } from '@robes/copy';
import { nativeAnalytics } from '../src/lib/analytics';
import { errorMessage } from '../src/lib/errors';
import { report } from '../src/lib/report';
import { mockFetch } from './support/api';

jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

test('every failure she is shown is reported, once even when a screen re-renders it', () => {
  const report = jest.spyOn(nativeAnalytics, 'reportError').mockImplementation(() => undefined);
  const err = new Error('picker gave no photo');
  expect(errorMessage(err)).toBe(errors.internal);
  expect(errorMessage(err)).toBe(errors.internal);
  expect(report).toHaveBeenCalledTimes(1);
  expect(report).toHaveBeenCalledWith(err);
  errorMessage(new Error('another'));
  expect(report).toHaveBeenCalledTimes(2);
});

test('a failure also reaches the server log, with where it happened and the app version', async () => {
  jest.spyOn(nativeAnalytics, 'reportError').mockImplementation(() => undefined);
  const calls = mockFetch({ 'POST /me/client-errors': { ok: true } });
  report(new Error('upload failed: empty photo (exists false, scheme file)'), 'wardrobe.read');
  await new Promise((r) => setTimeout(r, 0));
  expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual(['POST /api/v1/me/client-errors']);
  expect(calls[0]?.body).toEqual({
    where: 'wardrobe.read',
    name: 'Error',
    message: 'upload failed: empty photo (exists false, scheme file)',
    appVersion: expect.stringMatching(/^\d+(\.\d+)*$/),
    analytics: false,
  });
});
