import { describe, expect, it, vi } from 'vitest';
import { createBrowserAnalytics, type LoadPostHog, posthogOptions } from './browser';

function fakePostHog() {
  const client = {
    init: vi.fn(),
    register: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    opt_in_capturing: vi.fn(),
    opt_out_capturing: vi.fn(),
    startSessionRecording: vi.fn(),
    stopSessionRecording: vi.fn(),
  };
  const load = vi.fn(async () => client) as unknown as LoadPostHog & ReturnType<typeof vi.fn>;
  return { client, load };
}

const config = { key: 'phc_test', host: 'https://eu.i.posthog.com', environment: 'staging' };

describe('browser analytics (SEC-84)', () => {
  it('loads nothing and sends nothing before consent', () => {
    const { client, load } = fakePostHog();
    const analytics = createBrowserAnalytics(config, load);
    analytics.track('$pageview');
    analytics.track('look_created', { from: 'draft', pieces: 3, proposed: 0, anchored: false });
    analytics.identify('u1');
    analytics.stop();
    expect(load).not.toHaveBeenCalled();
    expect(client.capture).not.toHaveBeenCalled();
  });

  it('starts on the EU host with replay off unless recordings are granted', async () => {
    const { client, load } = fakePostHog();
    const analytics = createBrowserAnalytics(config, load);
    await analytics.start({ userId: 'u1', replay: false });
    const [key, options] = client.init.mock.calls[0] ?? [];
    expect(key).toBe('phc_test');
    expect(options).toMatchObject({
      api_host: 'https://eu.i.posthog.com',
      autocapture: false,
      capture_exceptions: true,
      disable_external_dependency_loading: true,
      disable_session_recording: true,
    });
    expect(client.register).toHaveBeenCalledWith({ environment: 'staging' });
    expect(client.stopSessionRecording).toHaveBeenCalled();
    expect(client.identify).toHaveBeenCalledWith('u1');
    analytics.track('job_started', { kind: 'fake' });
    expect(client.capture).toHaveBeenCalledWith('job_started', { kind: 'fake' });
  });

  it('records her words but never photos, file names, her email or what is marked', async () => {
    const options = posthogOptions(config, true);
    expect(options.session_recording).toMatchObject({
      maskAllInputs: false,
      maskInputOptions: { password: true, email: true },
      blockClass: 'ph-no-capture',
      recordHeaders: false,
      recordBody: false,
    });
    expect(options.enable_recording_console_log).toBe(false);
    const blocked = options.session_recording.blockSelector.split(', ');
    for (const sel of [
      'img',
      'picture',
      'video',
      'canvas',
      'svg image',
      '[style*="background-image"]',
      'input[type="file"]',
    ]) {
      expect(blocked).toContain(sel);
    }
    expect(options.session_recording).not.toHaveProperty('maskTextSelector');
  });

  it('records replay only with replay consent', async () => {
    const { client, load } = fakePostHog();
    const analytics = createBrowserAnalytics(config, load);
    await analytics.start({ userId: 'u1', replay: true });
    expect(load).toHaveBeenCalledWith(true);
    expect(client.init.mock.calls[0]?.[1]).toMatchObject({ disable_session_recording: false });
    expect(client.startSessionRecording).toHaveBeenCalled();
  });

  it('tears down on withdrawal and resumes without re-initialising', async () => {
    const { client, load } = fakePostHog();
    const analytics = createBrowserAnalytics(config, load);
    await analytics.start({ userId: 'u1', replay: false });
    analytics.stop();
    expect(client.opt_out_capturing).toHaveBeenCalled();
    expect(client.reset).toHaveBeenCalled();
    analytics.track('$pageview');
    expect(client.capture).not.toHaveBeenCalled();

    await analytics.start({ userId: 'u1', replay: false });
    expect(client.init).toHaveBeenCalledTimes(1);
    expect(client.opt_in_capturing).toHaveBeenCalled();
    analytics.track('$pageview');
    expect(client.capture).toHaveBeenCalledWith('$pageview', {});
  });
});
