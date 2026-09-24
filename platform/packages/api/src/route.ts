import type { z } from 'zod';
import { type AuthUser, bearerToken, type TokenVerifier } from './auth';
import { ApiError, MESSAGES, STATUS } from './errors';
import type { RateLimiter } from './rate-limit';

export type AuthMode = 'public' | 'user' | 'admin';

export const MAX_BODY_BYTES = 32 * 1024;

export interface RouteDeps {
  verifier: TokenVerifier;
  isAdmin(userId: string): Promise<boolean>;
  rateLimiter: RateLimiter;
  clientIp(req: Request): string;
  logger: { error(obj: Record<string, unknown>, msg: string): void };
  validateOutput?: boolean;
}

type UserFor<A extends AuthMode> = A extends 'public' ? AuthUser | null : AuthUser;

export interface RouteOptions<A extends AuthMode, I extends z.ZodType, O extends z.ZodType> {
  auth: A;
  input: I;
  output: O;
  status?: number;
  rateLimit?: { key: string; limit: number; windowSeconds: number };
  handler(args: {
    input: z.infer<I>;
    user: UserFor<A>;
    req: Request;
    params: Record<string, string>;
    requestId: string;
  }): Promise<z.infer<O>>;
}

type RouteContext = { params?: Promise<Record<string, string>> };

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

async function readInput(req: Request): Promise<unknown> {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'DELETE') {
    return Object.fromEntries(new URL(req.url).searchParams);
  }
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) throw new ApiError('payload_too_large');
  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new ApiError('payload_too_large');
  }
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
  async function authenticate(req: Request, mode: AuthMode): Promise<AuthUser | null> {
    if (mode === 'public') return null;
    const token = bearerToken(req);
    const user = token ? await deps.verifier.verify(token) : null;
    if (!user) throw new ApiError('unauthenticated');
    if (mode === 'admin' && !(await deps.isAdmin(user.id))) throw new ApiError('forbidden');
    return user;
  }

  async function enforceRateLimit(
    req: Request,
    user: AuthUser | null,
    rule: { key: string; limit: number; windowSeconds: number },
  ): Promise<void> {
    const who = user?.id ?? `ip:${deps.clientIp(req)}`;
    const r = await deps.rateLimiter.limit(`${rule.key}:${who}`, rule.limit, rule.windowSeconds);
    if (!r.success) throw new ApiError('rate_limited', { retryAfterSeconds: r.retryAfterSeconds });
  }

  return function route<A extends AuthMode, I extends z.ZodType, O extends z.ZodType>(
    opts: RouteOptions<A, I, O>,
  ): RouteHandler {
    const handler = async (req: Request, ctx?: RouteContext): Promise<Response> => {
      const requestId = crypto.randomUUID();
      try {
        const user = await authenticate(req, opts.auth);
        if (opts.rateLimit) await enforceRateLimit(req, user, opts.rateLimit);
        const parsed = opts.input.safeParse(await readInput(req));
        if (!parsed.success) {
          throw new ApiError('invalid_input', {
            details: parsed.error.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message,
            })),
          });
        }
        const out = await opts.handler({
          input: parsed.data,
          user: user as UserFor<A>,
          req,
          params: (await ctx?.params) ?? {},
          requestId,
        });
        return json(
          deps.validateOutput ? opts.output.parse(out) : out,
          opts.status ?? 200,
          requestId,
        );
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
