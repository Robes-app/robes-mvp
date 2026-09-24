import {
  API_BASE_PATH,
  ErrorBody,
  type ErrorCode,
  type JsonRouteDef,
  type JsonRouteKey,
  type RouteKey,
  type Routes,
  routes,
} from '@robes/contracts';
import { errors } from '@robes/copy';
import type { z } from 'zod';

export const APP_VERSION_HEADER = 'x-robes-app-version';
export const IDEMPOTENCY_HEADER = 'idempotency-key';

type Def<K extends RouteKey> = Routes[K];

export type ParamsOf<K extends RouteKey> =
  Def<K> extends { params: infer P extends z.ZodType } ? z.input<P> : undefined;
export type InputOf<K extends JsonRouteKey> = z.input<Def<K>['input']>;
export type OutputOf<K extends JsonRouteKey> = z.output<Def<K>['output']>;

type ParamsArg<K extends RouteKey> =
  Def<K> extends { params: z.ZodType } ? { params: ParamsOf<K> } : { params?: undefined };
type InputArg<K extends JsonRouteKey> =
  Record<string, never> extends InputOf<K> ? { input?: InputOf<K> } : { input: InputOf<K> };

export type CallArgs<K extends JsonRouteKey> = ParamsArg<K> &
  InputArg<K> & {
    // Defaults to a fresh UUID per call on idempotent routes; retries of the call reuse it.
    idempotencyKey?: string;
    signal?: AbortSignal;
  };

// Optional when the route needs neither params nor required input.
export type CallRest<K extends JsonRouteKey> =
  object extends CallArgs<K> ? [args?: CallArgs<K>] : [args: CallArgs<K>];

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly requestId: string | null;
  // Seconds, from Retry-After (rate_limited).
  readonly retryAfter: number | null;
  readonly details: unknown;

  constructor(init: {
    status: number;
    code: ErrorCode;
    message?: string;
    requestId?: string | null;
    retryAfter?: number | null;
    details?: unknown;
    cause?: unknown;
  }) {
    super(init.message ?? errors[init.code], { cause: init.cause });
    this.name = 'ApiClientError';
    this.status = init.status;
    this.code = init.code;
    this.requestId = init.requestId ?? null;
    this.retryAfter = init.retryAfter ?? null;
    this.details = init.details;
  }

  // status 0: the request never got an HTTP answer (offline, DNS, CORS, aborted).
  get isNetwork(): boolean {
    return this.status === 0;
  }
}

export function isApiClientError(err: unknown): err is ApiClientError {
  return err instanceof ApiClientError;
}

type HeaderSource =
  | Record<string, string>
  | (() => Record<string, string> | Promise<Record<string, string>>);

export interface ApiClientOptions {
  // Origin of the API ('' for same-origin web); API_BASE_PATH is appended.
  baseUrl: string;
  fetch?: typeof fetch;
  // Extra headers per request, e.g. the Better Auth cookie on native.
  headers?: HeaderSource;
  appVersion?: string;
  credentials?: RequestCredentials;
  // Automatic retries of network failures and 502/503/504, for GETs and idempotent routes only.
  retries?: number;
  retryDelayMs?: (attempt: number) => number;
  sleep?: (ms: number) => Promise<void>;
  randomUUID?: () => string;
}

export interface ApiClient {
  call<K extends JsonRouteKey>(key: K, ...rest: CallRest<K>): Promise<OutputOf<K>>;
  url(key: RouteKey, params?: Record<string, string | number>, query?: unknown): string;
  headers(): Promise<Record<string, string>>;
  readonly baseUrl: string;
}

const QUERY_METHODS = new Set(['GET', 'HEAD', 'DELETE']);
const RETRYABLE_STATUS = new Set([502, 503, 504]);

export function buildPath(template: string, params: Record<string, unknown> = {}): string {
  return template.replace(/:([A-Za-z]+)/g, (_, name: string) => {
    const value = params[name];
    if (value === undefined || value === null || value === '') {
      throw new TypeError(`Missing route param "${name}" for ${template}`);
    }
    return encodeURIComponent(String(value));
  });
}

// Mirrors readQuery() in @robes/api: repeated keys for arrays, strings for everything else.
export function serializeQuery(input: unknown): string {
  if (input === undefined || input === null) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (value === undefined || value === null) continue;
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      if (v === undefined || v === null) continue;
      search.append(key, v instanceof Date ? v.toISOString() : String(v));
    }
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

function numberOrNull(value: string | null): number | null {
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (text.length === 0) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export async function toApiClientError(res: Response): Promise<ApiClientError> {
  const parsed = ErrorBody.safeParse(await readJson(res));
  const requestId = res.headers.get('x-request-id');
  const retryAfter = numberOrNull(res.headers.get('retry-after'));
  if (!parsed.success) {
    return new ApiClientError({ status: res.status, code: 'internal', requestId, retryAfter });
  }
  const { code, message, details } = parsed.data.error;
  return new ApiClientError({
    status: res.status,
    code,
    message,
    requestId: parsed.data.error.requestId || requestId,
    retryAfter,
    details,
  });
}

const defaultSleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export function createApiClient(options: ApiClientOptions): ApiClient {
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  const retries = options.retries ?? 2;
  const retryDelay = options.retryDelayMs ?? ((attempt: number) => 250 * 2 ** attempt);
  const sleep = options.sleep ?? defaultSleep;
  const uuid = options.randomUUID ?? (() => crypto.randomUUID());

  async function headers(): Promise<Record<string, string>> {
    const extra =
      typeof options.headers === 'function' ? await options.headers() : (options.headers ?? {});
    return {
      accept: 'application/json',
      ...(options.appVersion ? { [APP_VERSION_HEADER]: options.appVersion } : {}),
      ...extra,
    };
  }

  function url(key: RouteKey, params?: Record<string, string | number>, query?: unknown): string {
    return `${baseUrl}${API_BASE_PATH}${buildPath(routes[key].path, params)}${serializeQuery(query)}`;
  }

  async function call<K extends JsonRouteKey>(key: K, ...rest: CallRest<K>): Promise<OutputOf<K>> {
    const def = routes[key] as JsonRouteDef;
    const args = (rest[0] ?? {}) as {
      params?: Record<string, string | number>;
      input?: unknown;
      idempotencyKey?: string;
      signal?: AbortSignal;
    };
    const inQuery = QUERY_METHODS.has(def.method);
    const target = url(key, args.params, inQuery ? args.input : undefined);
    const idempotencyKey = def.idempotent ? (args.idempotencyKey ?? uuid()) : args.idempotencyKey;
    const safeToRetry = def.method === 'GET' || idempotencyKey !== undefined;

    const init: RequestInit = { method: def.method };
    if (options.credentials) init.credentials = options.credentials;
    if (args.signal) init.signal = args.signal;
    if (!inQuery) init.body = JSON.stringify(args.input ?? {});

    for (let attempt = 0; ; attempt++) {
      const reqHeaders = await headers();
      if (!inQuery) reqHeaders['content-type'] = 'application/json';
      if (idempotencyKey) reqHeaders[IDEMPOTENCY_HEADER] = idempotencyKey;
      const canRetry = safeToRetry && attempt < retries && !args.signal?.aborted;

      let res: Response;
      try {
        res = await doFetch(target, { ...init, headers: reqHeaders });
      } catch (cause) {
        if (canRetry) {
          await sleep(retryDelay(attempt));
          continue;
        }
        throw new ApiClientError({ status: 0, code: 'internal', cause });
      }

      if (res.ok) {
        const body = res.status === 204 ? undefined : await readJson(res);
        const parsed = def.output.safeParse(body);
        if (parsed.success) return parsed.data as OutputOf<K>;
        throw new ApiClientError({
          status: res.status,
          code: 'internal',
          requestId: res.headers.get('x-request-id'),
          cause: parsed.error,
        });
      }
      const error = await toApiClientError(res);
      // 503 `disabled` is a kill switch, so only `capacity` is worth retrying.
      const transient =
        RETRYABLE_STATUS.has(res.status) && !(res.status === 503 && error.code === 'disabled');
      if (canRetry && transient) {
        await sleep(retryDelay(attempt));
        continue;
      }
      throw error;
    }
  }

  return { call, url, headers, baseUrl };
}

export type {
  JsonRouteKey,
  MutationRouteKey,
  QueryRouteKey,
  RouteKey,
  SseRouteKey,
} from '@robes/contracts';
