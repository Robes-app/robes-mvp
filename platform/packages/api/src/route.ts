import { z } from 'zod';
import { type AuthUser, bearerToken, type TokenVerifier } from './auth';
import { ApiError, MESSAGES, STATUS } from './errors';
import type { RateLimiter } from './rate-limit';

export type AuthMode = 'public' | 'user' | 'admin';

export const MAX_BODY_BYTES = 32 * 1024;
export const AUTH_FAILURE_LIMIT = { limit: 30, windowSeconds: 60 } as const;

export interface RouteDeps {
  verifier: TokenVerifier;
  isAdmin(userId: string): Promise<boolean>;
  rateLimiter: RateLimiter;
  clientIp(req: Request): string;
  logger: { error(obj: Record<string, unknown>, msg: string): void };
}

type UserFor<A extends AuthMode> = A extends 'public' ? AuthUser | null : AuthUser;

const RawParams = z.record(z.string(), z.union([z.string(), z.array(z.string())]));
type RawParams = z.infer<typeof RawParams>;

export interface RateLimitRule {
  key: string;
  limit: number;
  windowSeconds: number;
}

export interface RouteOptions<
  A extends AuthMode,
  I extends z.ZodType,
  O extends z.ZodType,
  P extends z.ZodType = typeof RawParams,
> {
  auth: A;
  // GET/HEAD/DELETE read the query string: values are strings (use z.coerce), repeated keys are arrays.
  input: I;
  output: O;
  params?: P;
  status?: number;
  rateLimit?: RateLimitRule;
  handler(args: {
    input: z.infer<I>;
    user: UserFor<A>;
    req: Request;
    params: z.infer<P>;
    requestId: string;
  }): Promise<z.input<O>>;
}

type RouteContext = { params?: Promise<RawParams> };

export type RouteHandler = ((req: Request, ctx?: RouteContext) => Promise<Response>) & {
  auth: AuthMode;
};

function json(
  body: unknown,
  status: number,
  requestId: string,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'private, no-store',
      'x-request-id': requestId,
      ...extra,
    },
  });
}

function readQuery(url: string): Record<string, string | string[]> {
  const params = new URL(url).searchParams;
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    out[key] = values.length > 1 ? values : (values[0] ?? '');
  }
  return out;
}

// Streams with a byte counter so chunked bodies without content-length can't be buffered unbounded.
async function readBodyText(req: Request): Promise<string> {
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    throw new ApiError('payload_too_large');
  }
  if (!req.body) return '';
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new ApiError('payload_too_large');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function readInput(req: Request): Promise<unknown> {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'DELETE') {
    return readQuery(req.url);
  }
  const text = await readBodyText(req);
  if (text.length === 0) return {};
  if (!(req.headers.get('content-type') ?? '').includes('application/json')) {
    throw new ApiError('invalid_input');
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError('invalid_input');
  }
}

function parseOrThrow<S extends z.ZodType>(schema: S, value: unknown): z.infer<S> {
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new ApiError('invalid_input', {
    details: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  });
}

function errorResponse(err: ApiError, requestId: string): Response {
  const headers: Record<string, string> = {};
  if (err.extra.retryAfterSeconds) headers['retry-after'] = String(err.extra.retryAfterSeconds);
  const details = err.extra.details ? { details: err.extra.details } : {};
  return json(
    { error: { code: err.code, message: MESSAGES[err.code], requestId, ...details } },
    STATUS[err.code],
    requestId,
    headers,
  );
}

export function createRouteFactory(deps: RouteDeps) {
  async function enforceRateLimit(key: string, rule: Omit<RateLimitRule, 'key'>): Promise<void> {
    const r = await deps.rateLimiter.limit(key, rule.limit, rule.windowSeconds);
    if (!r.success) throw new ApiError('rate_limited', { retryAfterSeconds: r.retryAfterSeconds });
  }

  async function authenticate(req: Request, mode: AuthMode): Promise<AuthUser | null> {
    if (mode === 'public') return null;
    const token = bearerToken(req);
    const user = token ? await deps.verifier.verify(token) : null;
    if (!user) {
      // Bad-token floods never reach per-user limits, so throttle failures per IP.
      await enforceRateLimit(`auth-fail:ip:${deps.clientIp(req)}`, AUTH_FAILURE_LIMIT);
      throw new ApiError('unauthenticated');
    }
    if (mode === 'admin' && !(await deps.isAdmin(user.id))) throw new ApiError('forbidden');
    return user;
  }

  return function route<
    A extends AuthMode,
    I extends z.ZodType,
    O extends z.ZodType,
    P extends z.ZodType = typeof RawParams,
  >(opts: RouteOptions<A, I, O, P>): RouteHandler {
    const paramsSchema = opts.params ?? RawParams;
    const handler = async (req: Request, ctx?: RouteContext): Promise<Response> => {
      const requestId = crypto.randomUUID();
      try {
        const user = await authenticate(req, opts.auth);
        if (opts.rateLimit) {
          const who = user?.id ?? `ip:${deps.clientIp(req)}`;
          await enforceRateLimit(`${opts.rateLimit.key}:${who}`, opts.rateLimit);
        }
        const params = parseOrThrow(paramsSchema, (await ctx?.params) ?? {}) as z.infer<P>;
        const input = parseOrThrow(opts.input, await readInput(req));
        const out = await opts.handler({
          input,
          user: user as UserFor<A>,
          req,
          params,
          requestId,
        });
        // Always parse: zod strips undeclared fields, so a whole DB row can never leak.
        return json(opts.output.parse(out), opts.status ?? 200, requestId);
      } catch (err) {
        if (err instanceof ApiError) return errorResponse(err, requestId);
        deps.logger.error(
          { requestId, err: err instanceof Error ? err.message : String(err) },
          'route_error',
        );
        return errorResponse(new ApiError('internal'), requestId);
      }
    };
    return Object.assign(handler, { auth: opts.auth });
  };
}
