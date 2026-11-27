import { createNativeAnalytics, SESSION_REPLAY_CONFIG } from '../src/lib/analytics';

jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

function fakeClient() {
  return {
    capture: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    optIn: jest.fn(async () => {}),
    optOut: jest.fn(async () => {}),
    register: jest.fn(),
    captureException: jest.fn(),
    startSessionRecording: jest.fn(async () => {}),
    stopSessionRecording: jest.fn(async () => {}),
  };
}

const CONFIG = { key: 'phc_test', host: 'https://eu.i.posthog.com', environment: 'staging' };

test('PostHog loads only after consent and sends only catalogue events', async () => {
  const client = fakeClient();
  const load = jest.fn(async () => client);
  const analytics = createNativeAnalytics(CONFIG, load);
  analytics.track('onboarding_completed');
  analytics.track('camera_opened');
  analytics.track('look_created', {
    from: 'draft',
    pieces: 3,
    proposed: 0,
    anchored: false,
    changes: 0,
  });
  expect(load).not.toHaveBeenCalled();

  await analytics.start('u1');
  expect(client.register).toHaveBeenCalledWith({ environment: 'staging' });
  expect(client.identify).toHaveBeenCalledWith('u1');
  analytics.track('job_started', { kind: 'key_piece' });
  analytics.track('not_an_event' as never, {} as never);
  expect(client.capture.mock.calls).toEqual([['job_started', { kind: 'key_piece' }]]);
  analytics.track('look_created', {
    from: 'suggested',
    pieces: 2,
    proposed: 1,
    anchored: true,
    changes: 0,
  });
  expect(client.capture).toHaveBeenLastCalledWith('look_created', {
    from: 'suggested',
    pieces: 2,
    proposed: 1,
    anchored: true,
    changes: 0,
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

test('screen recordings run only with her yes to them, and stop with analytics', async () => {
  const client = fakeClient();
  const analytics = createNativeAnalytics(CONFIG, async () => client);
  await analytics.start('u1');
  expect(client.startSessionRecording).not.toHaveBeenCalled();
  expect(client.stopSessionRecording).toHaveBeenCalled();
  await analytics.start('u1', { recordings: true });
  expect(client.startSessionRecording).toHaveBeenCalledTimes(1);
  await analytics.start('u1', { recordings: false });
  expect(client.stopSessionRecording).toHaveBeenCalledTimes(2);
  analytics.stop();
  expect(client.stopSessionRecording).toHaveBeenCalledTimes(3);
  expect(client.optOut).toHaveBeenCalled();
});

// The app as she sees it, her photos included (Annie, 26 Nov 2026); her email and the sign-in code
// stay in Unrecorded, the system photo picker stays masked, no console lines or network calls.
test('screen recordings show her text and photos, and nothing from the console or network', () => {
  expect(SESSION_REPLAY_CONFIG).toEqual({
    maskAllTextInputs: false,
    maskAllImages: false,
    maskAllSandboxedViews: true,
    captureLog: false,
    captureNetworkTelemetry: false,
  });
});

test('without a key analytics never loads', async () => {
  const load = jest.fn();
  await createNativeAnalytics(null, load).start('u1');
  expect(load).not.toHaveBeenCalled();
});

test('a caught failure reaches PostHog once, and only while analytics run', async () => {
  const client = fakeClient();
  const analytics = createNativeAnalytics(CONFIG, async () => client);
  const before = new Error('before start');
  analytics.reportError(before);
  expect(client.captureException).not.toHaveBeenCalled();
  await analytics.start('u1');
  const err = new Error('upload failed: empty photo');
  analytics.reportError(err);
  expect(client.captureException).toHaveBeenCalledWith(err);
  analytics.stop();
  analytics.reportError(new Error('after stop'));
  expect(client.captureException).toHaveBeenCalledTimes(1);
});
