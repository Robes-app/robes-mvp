import { createNativeAnalytics } from '../src/lib/analytics';
import { sentryOptions } from '../src/lib/sentry-options';

jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

function fakeClient() {
  return {
    capture: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    optIn: jest.fn(async () => {}),
    optOut: jest.fn(async () => {}),
  };
}

const CONFIG = { key: 'phc_test', host: 'https://eu.i.posthog.com' };

test('PostHog loads only after consent and sends only catalogue events', async () => {
  const client = fakeClient();
  const load = jest.fn(async () => client);
  const analytics = createNativeAnalytics(CONFIG, load);
  analytics.track('onboarding_completed');
  expect(load).not.toHaveBeenCalled();

  await analytics.start('u1');
  expect(client.identify).toHaveBeenCalledWith('u1');
  analytics.track('job_started', { kind: 'key_piece' });
  analytics.track('not_an_event' as never, {} as never);
  expect(client.capture.mock.calls).toEqual([['job_started', { kind: 'key_piece' }]]);
});

test('withdrawing consent or signing out stops capture and forgets her', async () => {
  const client = fakeClient();
  const analytics = createNativeAnalytics(CONFIG, async () => client);
  await analytics.start('u1');
  analytics.stop();
  expect(client.optOut).toHaveBeenCalled();
  expect(client.reset).toHaveBeenCalled();
  analytics.track('onboarding_completed');
  expect(client.capture).not.toHaveBeenCalled();
  await analytics.start('u1');
  expect(client.optIn).toHaveBeenCalled();
});

test('without a key analytics never loads', async () => {
  const load = jest.fn();
  await createNativeAnalytics(null, load).start('u1');
  expect(load).not.toHaveBeenCalled();
});

test('Sentry sends no PII and runs JS-only in Expo Go', () => {
  const opts = sentryOptions({
    dsn: 'https://k@o.ingest.sentry.io/1',
    environment: 'dev',
    release: '1.0.0',
    expoGo: true,
  });
  expect(opts).toMatchObject({ enableNative: false, sendDefaultPii: false });
  expect(sentryOptions({ ...opts, expoGo: false }).enableNative).toBe(true);
  const event = opts.beforeSend({
    message: 'failed for ann@test.dev',
    extra: { email: 'ann@test.dev' },
  });
  expect(JSON.stringify(event)).not.toContain('ann@test.dev');
});
