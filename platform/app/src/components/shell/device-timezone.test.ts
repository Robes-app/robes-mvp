import type { ApiClient } from '@robes/api-client';
import { queryKeys } from '@robes/api-client/react';
import { DATED_ROUTES } from '@robes/contracts';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { timeZoneSender } from './device-timezone';

const me = (timezone: string) => ({ id: 'u1', timezone });

describe('device timezone (web)', () => {
  it('sends a new zone, keeps the profile back and refetches every dated read', async () => {
    const call = vi.fn(async () => me('Australia/Sydney'));
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const sync = timeZoneSender({ call } as unknown as ApiClient, queryClient);

    expect(await sync('Europe/Dublin', 'Australia/Sydney')).toBe('sent');
    expect(call).toHaveBeenCalledWith('me.update', { input: { timezone: 'Australia/Sydney' } });
    expect(queryClient.getQueryData(queryKeys.call('me.get'))).toEqual(me('Australia/Sydney'));
    const keys = invalidate.mock.calls.map(([f]) => f?.queryKey);
    for (const key of ['today.get', 'plan.get'] as const)
      expect(keys).toContainEqual(queryKeys.route(key));
    expect(keys).toHaveLength(DATED_ROUTES.length);
  });

  it('sends nothing when the zone already matches', async () => {
    const call = vi.fn();
    const sync = timeZoneSender({ call } as unknown as ApiClient, new QueryClient());
    expect(await sync('Australia/Sydney', 'Australia/Sydney')).toBe('skipped');
    expect(call).not.toHaveBeenCalled();
  });

  it('leaves her profile and reads alone when the update fails', async () => {
    const call = vi.fn(async () => {
      throw new Error('429');
    });
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const sync = timeZoneSender({ call } as unknown as ApiClient, queryClient);
    expect(await sync('Europe/Dublin', 'Australia/Sydney')).toBe('failed');
    expect(invalidate).not.toHaveBeenCalled();
  });
});
