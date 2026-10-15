// @vitest-environment happy-dom
import type { Me } from '@robes/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type ApiClientError, createApiClient, IDEMPOTENCY_HEADER } from './index';
import {
  ApiClientProvider,
  queryKeys,
  type UndoHandle,
  useApi,
  useApiMutation,
  useUndoableMutation,
} from './react';

const me: Me = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'niall@test.dev',
  firstName: 'Niall',
  lastName: null,
  instagramHandle: null,
  locale: 'en-IE',
  timezone: 'Europe/Dublin',
  currency: 'EUR',
  homeCity: null,
  onboarded: false,
  notifications: { looksReady: true, morningCue: true, nudges: false, receipts: true },
};
const JOB_ID = '6f1d7e38-5a55-4f43-9d6b-6f0c4d7f2a10';
const failure = { error: { code: 'internal', message: 'nope', requestId: 'r1' } };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

function setup(handler: Handler) {
  const fetch = vi.fn<typeof globalThis.fetch>(async (url, init) =>
    handler(String(url), init ?? {}),
  );
  const client = createApiClient({ baseUrl: '', fetch, retries: 0 });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={client}>{children}</ApiClientProvider>
    </QueryClientProvider>
  );
  return { fetch, client, queryClient, wrapper };
}

const meKey = queryKeys.call('me.get');
const renameTo = (firstName: string) => ({ input: { firstName } });
const optimisticRename = (args: { input?: { firstName?: string } }) => [
  {
    queryKey: queryKeys.route('me.get'),
    update: (old: unknown) =>
      old ? { ...(old as Me), firstName: args.input?.firstName ?? null } : old,
  },
];

afterEach(() => {
  vi.useRealTimers();
});

describe('queryKeys', () => {
  it('nests call keys under their route', () => {
    expect(queryKeys.route('jobs.get')).toEqual(['api', 'jobs.get']);
    expect(queryKeys.call('jobs.get', { params: { id: JOB_ID } })).toEqual([
      'api',
      'jobs.get',
      { id: JOB_ID },
      {},
    ]);
    expect(queryKeys.call('me.get').slice(0, 2)).toEqual(queryKeys.route('me.get'));
  });
});

describe('useApi', () => {
  it('fetches, parses and caches under the key factory', async () => {
    const { wrapper, queryClient } = setup(() => json(me));
    const { result } = renderHook(() => useApi('me.get'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(me);
    expect(queryClient.getQueryData(meKey)).toEqual(me);
  });

  it('surfaces ApiClientError', async () => {
    const { wrapper } = setup(() =>
      json({ error: { code: 'not_found', message: 'gone', requestId: 'r' } }, 404),
    );
    const { result } = renderHook(() => useApi('jobs.get', { params: { id: JOB_ID } }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ code: 'not_found', status: 404 });
  });
});

describe('useApiMutation', () => {
  it('reuses one idempotency key across TanStack retries', async () => {
    let calls = 0;
    const { wrapper, fetch } = setup(() =>
      ++calls === 1 ? json(failure, 500) : json({ jobId: JOB_ID, status: 'queued' }, 202),
    );
    const { result } = renderHook(() => useApiMutation('jobs.fake', { retry: 1, retryDelay: 0 }), {
      wrapper,
    });
    await act(() => result.current.mutateAsync());
    const keys = fetch.mock.calls.map(
      ([, init]) => (init?.headers as Record<string, string> | undefined)?.[IDEMPOTENCY_HEADER],
    );
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
  });

  it('sends no idempotency key on non-idempotent routes', async () => {
    const { wrapper, fetch } = setup(() => json({ onboardedAt: '2026-09-24T10:00:00.000Z' }));
    const { result } = renderHook(() => useApiMutation('me.onboarding.complete'), { wrapper });
    await act(() => result.current.mutateAsync());
    const headers = fetch.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers[IDEMPOTENCY_HEADER]).toBeUndefined();
  });
});

describe('useUndoableMutation', () => {
  it('updates the cache optimistically, then rolls back and reports on failure', async () => {
    let fail: () => void = () => {};
    const { wrapper, queryClient } = setup(
      () => new Promise<Response>((resolve) => (fail = () => resolve(json(failure, 500)))),
    );
    queryClient.setQueryData(meKey, me);
    const onError = vi.fn<(error: ApiClientError) => void>();
    const { result } = renderHook(
      () => useUndoableMutation('me.update', { optimistic: optimisticRename, onError }),
      { wrapper },
    );

    act(() => result.current.mutate(renameTo('Bea')));
    await waitFor(() => expect(queryClient.getQueryData<Me>(meKey)?.firstName).toBe('Bea'));
    expect(onError).not.toHaveBeenCalled();

    await act(async () => fail());
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(queryClient.getQueryData<Me>(meKey)?.firstName).toBe('Niall');
    expect(onError.mock.calls[0]?.[0]).toMatchObject({ code: 'internal', status: 500 });
  });

  it('keeps the optimistic value and refetches on success', async () => {
    const { wrapper, queryClient, fetch } = setup(() => json({ ...me, firstName: 'Bea' }));
    queryClient.setQueryData(meKey, me);
    const onSuccess = vi.fn();
    const { result } = renderHook(
      () => useUndoableMutation('me.update', { optimistic: optimisticRename, onSuccess }),
      { wrapper },
    );
    await act(() => result.current.mutateAsync(renameTo('Bea')));
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Bea' }),
      renameTo('Bea'),
    );
    expect(queryClient.getQueryData<Me>(meKey)?.firstName).toBe('Bea');
    expect(queryClient.getQueryState(meKey)?.isInvalidated).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('offers a ≥6 s undo that rolls back and compensates a committed change', async () => {
    const { wrapper, queryClient } = setup(() => json({ ...me, firstName: 'Bea' }));
    queryClient.setQueryData(meKey, me);
    let handle: UndoHandle | undefined;
    const compensate = vi.fn(async () => {});
    const { result } = renderHook(
      () =>
        useUndoableMutation('me.update', {
          optimistic: optimisticRename,
          undo: { windowMs: 1000, onAvailable: (h) => (handle = h), compensate },
        }),
      { wrapper },
    );
    const before = Date.now();
    await act(() => result.current.mutateAsync(renameTo('Bea')));
    expect(handle?.expiresAt).toBeGreaterThanOrEqual(before + 6000);
    expect(queryClient.getQueryData<Me>(meKey)?.firstName).toBe('Bea');

    await act(async () => expect(await handle?.undo()).toBe(true));
    expect(queryClient.getQueryData<Me>(meKey)?.firstName).toBe('Niall');
    expect(compensate).toHaveBeenCalledWith(
      renameTo('Bea'),
      expect.objectContaining({ firstName: 'Bea' }),
    );
    await act(async () => expect(await handle?.undo()).toBe(false));
  });

  it('holds the request for the window when there is no compensation, and undo cancels it', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const { wrapper, queryClient, fetch } = setup(() => json({ ...me, firstName: 'Bea' }));
    queryClient.setQueryData(meKey, me);
    let handle: UndoHandle | undefined;
    const onError = vi.fn();
    const { result } = renderHook(
      () =>
        useUndoableMutation('me.update', {
          optimistic: optimisticRename,
          onError,
          undo: { onAvailable: (h) => (handle = h) },
        }),
      { wrapper },
    );

    act(() => result.current.mutate(renameTo('Bea')));
    await vi.waitFor(() => expect(handle).toBeDefined());
    expect(queryClient.getQueryData<Me>(meKey)?.firstName).toBe('Bea');
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(fetch).not.toHaveBeenCalled();

    await act(async () => expect(await handle?.undo()).toBe(true));
    expect(queryClient.getQueryData<Me>(meKey)?.firstName).toBe('Niall');
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(fetch).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();

    handle = undefined;
    act(() => result.current.mutate(renameTo('Cat')));
    await vi.waitFor(() => expect(handle).toBeDefined());
    await act(() => vi.advanceTimersByTimeAsync(6000));
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await act(async () => expect(await handle?.undo()).toBe(false));
  });
});
