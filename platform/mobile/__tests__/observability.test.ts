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

// A loader that resolves (or fails) only when the test says so: the window while PostHog loads.
function slowClient() {
  const client = fakeClient();
  const waiting: { resolve: (c: typeof client) => void; reject: (err: Error) => void }[] = [];
  const load = jest.fn(
    () => new Promise<typeof client>((resolve, reject) => waiting.push({ resolve, reject })),
  );
  const finish = () => {
    for (const w of waiting.splice(0)) w.resolve(client);
  };
  const fail = (err: Error) => {
    for (const w of waiting.splice(0)) w.reject(err);
  };
  return { client, load, finish, fail };
}

test('what she does while PostHog loads is sent, in order, once she is identified', async () => {
  const { client, load, finish } = slowClient();
  const analytics = createNativeAnalytics(CONFIG, load);
  const started = analytics.start('u1');
  analytics.track('camera_opened');
  const err = new Error('upload failed');
  analytics.reportError(err);
  analytics.track('onboarding_completed');
  expect(client.capture).not.toHaveBeenCalled();
  finish();
  await started;
  expect(client.capture.mock.calls).toEqual([
    ['camera_opened', {}],
    ['onboarding_completed', {}],
  ]);
  expect(client.captureException).toHaveBeenCalledWith(err);
  expect(client.identify.mock.invocationCallOrder[0]).toBeLessThan(
    client.capture.mock.invocationCallOrder[0] ?? 0,
  );
});

test('nothing tracked before start is ever held', async () => {
  const client = fakeClient();
  const analytics = createNativeAnalytics(CONFIG, async () => client);
  analytics.track('camera_opened');
  analytics.reportError(new Error('before'));
  await analytics.start('u1');
  expect(client.capture).not.toHaveBeenCalled();
  expect(client.captureException).not.toHaveBeenCalled();
});

test('withdrawing while PostHog loads drops what was held and silences it', async () => {
  const { client, load, finish } = slowClient();
  const analytics = createNativeAnalytics(CONFIG, load);
  const started = analytics.start('u1', { recordings: true });
  analytics.track('camera_opened');
  analytics.stop();
  finish();
  await started;
  expect(client.identify).not.toHaveBeenCalled();
  expect(client.startSessionRecording).not.toHaveBeenCalled();
  expect(client.optOut).toHaveBeenCalled();
  analytics.track('onboarding_completed');
  expect(client.capture).not.toHaveBeenCalled();
  expect(analytics.isActive()).toBe(false);
});

test('a failed load drops what was held', async () => {
  const { client, load, fail } = slowClient();
  const analytics = createNativeAnalytics(CONFIG, load);
  const started = analytics.start('u1');
  analytics.track('camera_opened');
  fail(new Error('no module'));
  await expect(started).rejects.toThrow('no module');
  load.mockResolvedValueOnce(client);
  await analytics.start('u1');
  expect(load).toHaveBeenCalledTimes(2);
  expect(client.capture).not.toHaveBeenCalled();
});

test('at most 50 events are held while PostHog loads', async () => {
  const { client, load, finish } = slowClient();
  const analytics = createNativeAnalytics(CONFIG, load);
  const started = analytics.start('u1');
  for (let n = 0; n < 60; n++) analytics.track('onboarding_captured', { step: 'looks', n });
  finish();
  await started;
  expect(client.capture).toHaveBeenCalledTimes(50);
  expect(client.capture).toHaveBeenLastCalledWith('onboarding_captured', { step: 'looks', n: 49 });
});

test('overlapping starts load one PostHog', async () => {
  const { client, load, finish } = slowClient();
  const analytics = createNativeAnalytics(CONFIG, load);
  const first = analytics.start('u1');
  const second = analytics.start('u1', { recordings: true });
  analytics.track('camera_opened');
  finish();
  await Promise.all([first, second]);
  expect(load).toHaveBeenCalledTimes(1);
  expect(client.register).toHaveBeenCalledTimes(1);
  expect(client.startSessionRecording).toHaveBeenCalledTimes(1);
  expect(client.capture).toHaveBeenCalledTimes(1);
});
