import type { Me } from '@robes/contracts';
import { QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Providers } from './providers';

export const ME: Me = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'ann@test.dev',
  firstName: 'Ann',
  lastName: null,
  instagramHandle: null,
  locale: 'en-IE',
  timezone: 'Europe/Dublin',
  currency: 'EUR',
  homeCity: null,
  onboarded: true,
  notifications: { looksReady: true, morningCue: true, nudges: false, receipts: true },
};

type Reply = unknown | ((init: RequestInit, url: string) => unknown);
// "METHOD /path" (no query string) → JSON body; unmatched calls fail the test loudly.
export type Routes = Record<string, Reply>;

export interface Call {
  method: string;
  path: string;
  url: string;
  body: unknown;
  headers: Record<string, string>;
}

function respond(status: number, body: unknown): Response {
  return {
    ok: status < 400,
    status,
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

export function mockFetch(routes: Routes): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = jest.fn(async (input: unknown, init: RequestInit = {}) => {
    const url = String(input);
    const method = (init.method ?? 'GET').toUpperCase();
    const path = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0] ?? '';
    const key = `${method} ${path.replace(/^\/api\/v1/, '')}`;
    calls.push({
      method,
      path,
      url,
      body: typeof init.body === 'string' ? JSON.parse(init.body) : init.body,
      headers: (init.headers ?? {}) as Record<string, string>,
    });
    if (!(key in routes)) return respond(500, { error: { code: 'internal', message: key } });
    const reply = routes[key];
    const body = typeof reply === 'function' ? reply(init, url) : reply;
    if (body instanceof ErrorReply) return respond(body.status, body.body);
    return respond(200, body);
  }) as unknown as typeof fetch;
  return calls;
}

class ErrorReply {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {}
}

export function errorReply(status: number, code: string): ErrorReply {
  return new ErrorReply(status, { error: { code, message: code } });
}

export function newQueryClient(): QueryClient {
  // Infinity gcTime schedules no garbage-collection timers, so Jest can exit cleanly.
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
      mutations: { retry: false, gcTime: Number.POSITIVE_INFINITY },
    },
  });
}

export async function renderWithApi(ui: ReactElement, queryClient = newQueryClient()) {
  const result = await render(<Providers queryClient={queryClient}>{ui}</Providers>);
  return { ...result, queryClient };
}
