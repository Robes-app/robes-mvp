import { createNativeAnalytics } from '../src/lib/analytics';

jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

function fakeClient() {
  return {
    capture: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    optIn: jest.fn(async () => {}),
    optOut: jest.fn(async () => {}),
    register: jest.fn(),
  };
}

const CONFIG = { key: 'phc_test', host: 'https://eu.i.posthog.com', environment: 'staging' };

test('PostHog loads only after consent and sends only catalogue events', async () => {
  const client = fakeClient();
  const load = jest.fn(async () => client);
  const analytics = createNativeAnalytics(CONFIG, load);
  analytics.track('onboarding_completed');
  analytics.track('camera_opened');
  analytics.track('look_created', { from: 'draft', pieces: 3, proposed: 0, anchored: false });
  expect(load).not.toHaveBeenCalled();

  await analytics.start('u1');
  expect(client.register).toHaveBeenCalledWith({ environment: 'staging' });
  expect(client.identify).toHaveBeenCalledWith('u1');
  analytics.track('job_started', { kind: 'key_piece' });
  analytics.track('not_an_event' as never, {} as never);
  expect(client.capture.mock.calls).toEqual([['job_started', { kind: 'key_piece' }]]);
  analytics.track('look_created', { from: 'suggested', pieces: 2, proposed: 1, anchored: true });
  expect(client.capture).toHaveBeenLastCalledWith('look_created', {
    from: 'suggested',
    pieces: 2,
    proposed: 1,
    anchored: true,
  });
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
