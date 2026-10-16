import {
  type JsonRouteDef,
  type JsonRouteKey,
  type MutationRouteKey,
  type QueryRouteKey,
  routes,
} from '@robes/contracts';
import {
  type QueryClient,
  type QueryKey,
  queryOptions,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { createContext, type ReactNode, useContext, useRef } from 'react';
import {
  type ApiClient,
  ApiClientError,
  type CallArgs,
  type CallRest,
  isApiClientError,
  type OutputOf,
} from './index';

const ApiClientContext = createContext<ApiClient | null>(null);

export function ApiClientProvider({
  client,
  children,
}: {
  client: ApiClient;
  children: ReactNode;
}) {
  return <ApiClientContext.Provider value={client}>{children}</ApiClientContext.Provider>;
}

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) throw new Error('useApiClient needs an <ApiClientProvider>');
  return client;
}

// ['api', key, params, input]: invalidate a whole route with queryKeys.route(key).
export const queryKeys = {
  all: ['api'] as const,
  route: <K extends QueryRouteKey>(key: K) => ['api', key] as const,
  call: <K extends QueryRouteKey>(key: K, ...rest: CallRest<K>) => {
    const args = (rest[0] ?? {}) as { params?: unknown; input?: unknown };
    return ['api', key, args.params ?? {}, args.input ?? {}] as const;
  },
};

type QueryOpts<K extends QueryRouteKey> = Omit<
  UseQueryOptions<OutputOf<K>, ApiClientError, OutputOf<K>, QueryKey>,
  'queryKey' | 'queryFn'
>;

// For useSuspenseQuery, prefetchQuery and ensureQueryData.
export function apiQueryOptions<K extends QueryRouteKey>(
  client: ApiClient,
  key: K,
  ...rest: CallRest<K>
) {
  const args = (rest[0] ?? {}) as CallArgs<K>;
  return queryOptions<OutputOf<K>, ApiClientError, OutputOf<K>, QueryKey>({
    queryKey: queryKeys.call(key, ...rest),
    queryFn: ({ signal }) => client.call(key, ...([{ ...args, signal }] as CallRest<K>)),
  });
}

export function useApi<K extends QueryRouteKey>(
  key: K,
  ...rest: object extends CallArgs<K>
    ? [args?: CallArgs<K>, options?: QueryOpts<K>]
    : [args: CallArgs<K>, options?: QueryOpts<K>]
): UseQueryResult<OutputOf<K>, ApiClientError> {
  const client = useApiClient();
  const [args, options] = rest;
  return useQuery({
    ...apiQueryOptions(client, key, ...([args] as CallRest<K>)),
    ...options,
  });
}

// Carries one idempotency key per mutate() so TanStack retries replay rather than duplicate.
interface Invocation<K extends JsonRouteKey> {
  args: CallArgs<K>;
  idempotencyKey: string | undefined;
}

function invoke<K extends JsonRouteKey>(
  client: ApiClient,
  key: K,
  invocation: Invocation<K>,
): Promise<OutputOf<K>> {
  const args = invocation.idempotencyKey
    ? { ...invocation.args, idempotencyKey: invocation.idempotencyKey }
    : invocation.args;
  return client.call(key, ...([args] as CallRest<K>));
}

function newInvocation<K extends JsonRouteKey>(
  key: K,
  args: CallArgs<K> | undefined,
): Invocation<K> {
  const a = (args ?? {}) as CallArgs<K>;
  const idempotent = (routes[key] as JsonRouteDef).idempotent === true;
  return {
    args: a,
    idempotencyKey: idempotent ? (a.idempotencyKey ?? crypto.randomUUID()) : a.idempotencyKey,
  };
}

type MutateFn<K extends MutationRouteKey, R> = (
  ...args: object extends CallArgs<K> ? [args?: CallArgs<K>] : [args: CallArgs<K>]
) => R;

export type ApiMutationResult<K extends MutationRouteKey> = Omit<
  UseMutationResult<OutputOf<K>, ApiClientError, Invocation<K>>,
  'mutate' | 'mutateAsync' | 'variables'
> & {
  mutate: MutateFn<K, void>;
  mutateAsync: MutateFn<K, Promise<OutputOf<K>>>;
  variables: CallArgs<K> | undefined;
};

export function useApiMutation<K extends MutationRouteKey>(
  key: K,
  options: Omit<
    UseMutationOptions<OutputOf<K>, ApiClientError, CallArgs<K>>,
    'mutationFn' | 'onMutate' | 'onSuccess' | 'onError' | 'onSettled'
  > & {
    onSuccess?: (data: OutputOf<K>, args: CallArgs<K>) => unknown;
    onError?: (error: ApiClientError, args: CallArgs<K>) => unknown;
  } = {},
): ApiMutationResult<K> {
  const client = useApiClient();
  const { onSuccess, onError, ...rest } = options;
  const mutation = useMutation<OutputOf<K>, ApiClientError, Invocation<K>>({
    ...rest,
    mutationFn: (invocation) => invoke(client, key, invocation),
    onSuccess: (data, invocation) => onSuccess?.(data, invocation.args),
    onError: (error, invocation) => onError?.(error, invocation.args),
  });
  return {
    ...mutation,
    variables: mutation.variables?.args,
    mutate: ((args?: CallArgs<K>) => mutation.mutate(newInvocation(key, args))) as MutateFn<
      K,
      void
    >,
    mutateAsync: ((args?: CallArgs<K>) =>
      mutation.mutateAsync(newInvocation(key, args))) as MutateFn<K, Promise<OutputOf<K>>>,
  };
}

export const MIN_UNDO_WINDOW_MS = 6000;

export interface OptimisticUpdate<T = unknown> {
  queryKey: QueryKey;
  update: (old: T | undefined) => T | undefined;
}

export interface UndoHandle {
  // Resolves true if the change was reversed, false if the window had closed or it already failed.
  undo(): Promise<boolean>;
  readonly expiresAt: number;
}

export interface UndoableOptions<K extends MutationRouteKey> {
  // Cache edits applied before the request (UX-13); rolled back on failure or undo.
  optimistic: (args: CallArgs<K>) => OptimisticUpdate[];
  // Defaults to the optimistic keys.
  invalidate?: (args: CallArgs<K>) => QueryKey[];
  onSuccess?: (data: OutputOf<K>, args: CallArgs<K>) => void;
  // Show the failure toast here; the cache is already rolled back.
  onError?: (error: ApiClientError, args: CallArgs<K>) => void;
  undo?: {
    // Clamped to ≥ 6 s (UX-15).
    windowMs?: number;
    // Called as soon as the change shows, so the toast can offer Undo straight away.
    onAvailable: (handle: UndoHandle, args: CallArgs<K>) => void;
    // Reverses a committed change (e.g. restore a soft delete). Without it the request is held
    // for the window and Undo simply cancels it.
    compensate?: (args: CallArgs<K>, data: OutputOf<K>) => Promise<unknown>;
  };
  now?: () => number;
}

// mutateAsync rejects with this when the change was undone inside a held window.
export class MutationUndoneError extends Error {
  constructor() {
    super('undone');
    this.name = 'MutationUndoneError';
  }
}

interface UndoInvocation<K extends MutationRouteKey> extends Invocation<K> {
  undone: boolean;
  snapshots: [QueryKey, unknown][];
  hold?: Promise<void>;
  cancelHold?: () => void;
  result?: Promise<OutputOf<K> | null>;
  settle?: (data: OutputOf<K> | null) => void;
}

function applyOptimistic(queryClient: QueryClient, updates: OptimisticUpdate[]) {
  const snapshots: [QueryKey, unknown][] = [];
  for (const { queryKey, update } of updates) {
    for (const entry of queryClient.getQueriesData({ queryKey })) snapshots.push(entry);
    queryClient.setQueriesData({ queryKey }, (old: unknown) => update(old));
  }
  return snapshots;
}

function rollback(queryClient: QueryClient, snapshots: [QueryKey, unknown][]) {
  for (const [queryKey, data] of snapshots) queryClient.setQueryData(queryKey, data);
}

function asClientError(err: unknown): ApiClientError {
  return isApiClientError(err)
    ? err
    : new ApiClientError({ status: 0, code: 'internal', cause: err });
}

export function useUndoableMutation<K extends MutationRouteKey>(
  key: K,
  options: UndoableOptions<K>,
): ApiMutationResult<K> {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const invalidate = (args: CallArgs<K>) => {
    const opts = optionsRef.current;
    const keys = opts.invalidate?.(args) ?? opts.optimistic(args).map((u) => u.queryKey);
    return Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  };

  function undoHandle(inv: UndoInvocation<K>, windowMs: number): UndoHandle {
    const opts = optionsRef.current;
    const expiresAt = (opts.now ?? Date.now)() + windowMs;
    const compensate = opts.undo?.compensate;
    return {
      expiresAt,
      async undo() {
        if (inv.undone || (opts.now ?? Date.now)() > expiresAt) return false;
        if (!compensate) {
          if (!inv.cancelHold) return false;
          inv.undone = true;
          rollback(queryClient, inv.snapshots);
          inv.cancelHold();
          return true;
        }
        const data = await inv.result;
        if (data === null || data === undefined || inv.undone) return false;
        inv.undone = true;
        rollback(queryClient, inv.snapshots);
        try {
          await compensate(inv.args, data);
          return true;
        } catch (err) {
          optionsRef.current.onError?.(asClientError(err), inv.args);
          return false;
        } finally {
          await invalidate(inv.args);
        }
      },
    };
  }

  const mutation = useMutation<OutputOf<K>, ApiClientError, UndoInvocation<K>>({
    onMutate: async (inv) => {
      const opts = optionsRef.current;
      const updates = opts.optimistic(inv.args);
      await Promise.all(updates.map((u) => queryClient.cancelQueries({ queryKey: u.queryKey })));
      inv.snapshots = applyOptimistic(queryClient, updates);
      inv.result = new Promise((resolve) => {
        inv.settle = resolve;
      });
      if (!opts.undo) return;
      const windowMs = Math.max(opts.undo.windowMs ?? MIN_UNDO_WINDOW_MS, MIN_UNDO_WINDOW_MS);
      if (!opts.undo.compensate) {
        // Held: the request goes out when the window closes, unless undone first.
        inv.hold = new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, windowMs);
          inv.cancelHold = () => {
            clearTimeout(timer);
            reject(new MutationUndoneError());
          };
        });
      }
      opts.undo.onAvailable(undoHandle(inv, windowMs), inv.args);
    },
    mutationFn: async (inv) => {
      if (inv.hold) {
        await inv.hold;
        inv.cancelHold = undefined;
      }
      return invoke(client, key, inv);
    },
    onSuccess: (data, inv) => {
      inv.settle?.(data);
      optionsRef.current.onSuccess?.(data, inv.args);
    },
    onError: (error, inv) => {
      inv.settle?.(null);
      rollback(queryClient, inv.snapshots);
      if (!(error instanceof MutationUndoneError)) {
        optionsRef.current.onError?.(asClientError(error), inv.args);
      }
    },
    onSettled: (_data, _error, inv) => {
      if (inv.undone) return;
      return invalidate(inv.args);
    },
  });

  const start = (args?: CallArgs<K>): UndoInvocation<K> => ({
    ...newInvocation(key, args),
    undone: false,
    snapshots: [],
  });

  return {
    ...mutation,
    variables: mutation.variables?.args,
    mutate: ((args?: CallArgs<K>) => mutation.mutate(start(args))) as MutateFn<K, void>,
    mutateAsync: ((args?: CallArgs<K>) => mutation.mutateAsync(start(args))) as MutateFn<
      K,
      Promise<OutputOf<K>>
    >,
  };
}
