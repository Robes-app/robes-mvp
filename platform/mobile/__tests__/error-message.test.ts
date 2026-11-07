import { errors } from '@robes/copy';
import { nativeAnalytics } from '../src/lib/analytics';
import { errorMessage } from '../src/lib/errors';

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
