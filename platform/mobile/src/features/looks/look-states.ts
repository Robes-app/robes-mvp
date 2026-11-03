import { ApiClientError } from '@robes/api-client';
import { queryKeys, useApi, useApiClient, useApiMutation } from '@robes/api-client/react';
import type {
  JobSnapshot,
  Look,
  LookAskInput,
  LookAskResult,
  LookPage,
  LookSet,
  LookStatus,
} from '@robes/contracts';
import { lookbook as copy, errors, ui } from '@robes/copy';
import { useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { nativeAnalytics } from '@/lib/analytics';
import { api as appApi } from '@/lib/api';
import { askForPushOnce } from '@/lib/push';
import { isTerminal, JOB_REFRESH_MS } from './ideas';

const LIMIT = 60;

export function useLooksByStatus(status: LookStatus, opts: { refetch?: boolean } = {}) {
  return useApi(
    'looks.list',
    { input: { limit: LIMIT, status } },
    {
      // A suggestion's frame lands after its job; keep looking while one is coming.
      refetchInterval: (q) =>
        opts.refetch && q.state.data?.items.some((l) => l.framePending) ? JOB_REFRESH_MS : false,
    },
  );
}

export function useInvalidateLooks() {
  const queryClient = useQueryClient();
  return (look?: Look) => {
    if (look) {
      queryClient.setQueryData(queryKeys.call('looks.get', { params: { id: look.id } }), look);
    }
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.sets.get') });
  };
}

function withoutLook(old: unknown, id: string): unknown {
  const page = old as LookPage | undefined;
  return page?.items ? { ...page, items: page.items.filter((l) => l.id !== id) } : old;
}

// ✕ / pass / Discard: the look goes at once, behind "Removed · Undo" (legacy 6 s hold).
export function useLetGo(label: string = copy.removed, onUndo?: (id: string) => void) {
  const api = useApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  const refresh = useInvalidateLooks();
  return (id: string) => {
    queryClient.setQueriesData({ queryKey: queryKeys.route('looks.list') }, (old) =>
      withoutLook(old, id),
    );
    void api
      .call('looks.delete', { params: { id } })
      .then(() =>
        toast.show({
          message: label,
          action: {
            label: ui.undo,
            onPress: () =>
              void api
                .call('looks.restore', { params: { id } })
                .then((look) => {
                  refresh(look);
                  onUndo?.(id);
                })
                .catch((err) =>
                  toast.show({
                    message: isDraftsFull(err) ? copy.drafts.fullTitle : errors.internal,
                  }),
                ),
          },
        }),
      )
      .catch(() => {
        refresh();
        toast.show({ message: errors.internal });
      });
  };
}

// `from` picks beta's toast: a suggestion saved as it stands, or a look she worked on, by name.
// The web twin is app/src/lib/look-states.ts.
export function useSaveLook(onSaved?: (look: Look) => void, from: 'suggested' | 'draft' = 'draft') {
  const toast = useToast();
  const refresh = useInvalidateLooks();
  return useApiMutation('looks.save', {
    onSuccess: (look) => {
      nativeAnalytics.track('look_created', {
        from,
        pieces: look.pieces.length,
        proposed: look.proposals.length,
        anchored: look.anchor !== null,
      });
      refresh(look);
      onSaved?.(look);
      toast.show({ message: from === 'suggested' ? copy.saved : copy.savedAs(look.name) });
      // Push is asked for after her first saved look, never on launch (7-day brief).
      void askForPushOnce(appApi).catch(() => undefined);
    },
    onError: () => toast.show({ message: errors.internal }),
  });
}

// Follows a job to its end by polling the row (native has no SSE yet); calls back once.
export function useJobResult(
  jobId: string | null,
  onDone: (job: JobSnapshot) => void,
): JobSnapshot | undefined {
  const job = useApi(
    'jobs.get',
    { params: { id: jobId ?? '' } },
    {
      enabled: jobId !== null,
      refetchInterval: (q) => (isTerminal(q.state.data) ? false : JOB_REFRESH_MS),
    },
  );
  const handled = useRef<string | null>(null);
  const data = jobId && job.data?.id === jobId ? job.data : undefined;
  useEffect(() => {
    if (data && isTerminal(data) && handled.current !== data.id) {
      handled.current = data.id;
      onDone(data);
    }
  }, [data, onDone]);
  return data;
}

// ↻ on a suggestion: the look re-writes in place; the tile shows it changing meanwhile.
export function useRestyle() {
  const toast = useToast();
  const refresh = useInvalidateLooks();
  const [busy, setBusy] = useState<{ lookId: string; jobId: string } | null>(null);
  const start = useApiMutation('looks.restyle', {
    onSuccess: ({ jobId }, { params }) => setBusy({ lookId: params.id, jobId }),
    onError: () => toast.show({ message: copy.swapFailed }),
  });
  useJobResult(busy?.jobId ?? null, (job) => {
    setBusy(null);
    refresh();
    if (job.status === 'failed' || job.status === 'cancelled')
      toast.show({ message: copy.swapFailed });
  });
  return {
    restyle: (id: string) => start.mutate({ params: { id } }),
    busyId: busy?.lookId ?? (start.isPending ? (start.variables?.params.id ?? null) : null),
  };
}

// Robes' frame for the rack as it stands; the look refreshes until it lands.
// A saved look's pieces changed: her model wears the new rack (beta re-dressed it live). Twin of web lib/look-states.ts. The
// render is keyed by model and rack, so an unchanged rack costs nothing; a model not drawn yet
// (conflict) waits for the next open.
export function useRedress() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return (look: Look) => {
    if (look.status !== 'saved' || look.frame || look.setId || look.pieces.length === 0) return;
    void api
      .call('looks.renderOnModel', { params: { id: look.id } })
      .then(() =>
        queryClient.invalidateQueries({
          queryKey: queryKeys.call('looks.get', { params: { id: look.id } }),
        }),
      )
      .catch(() => undefined);
  };
}

export function useRequestFrame() {
  const api = useApiClient();
  const refresh = useInvalidateLooks();
  return (id: string) =>
    void api
      .call('looks.frame', { params: { id } })
      .then(() => refresh())
      .catch(() => undefined);
}

// The deck's set: refreshed while its job runs or a frame is on its way.
// The deck's set: refreshed while a frame is on its way, or while its looks are still being
// written (`waiting`: an empty set whose job hasn't finished — never once everything is passed).
export function useLookSet(setId: string, opts: { waiting: boolean } = { waiting: true }) {
  return useApi(
    'looks.sets.get',
    { params: { id: setId } },
    {
      refetchInterval: (q) =>
        q.state.data?.looks.some((l) => l.framePending) ||
        (opts.waiting && (q.state.data?.looks.length ?? 0) === 0)
          ? JOB_REFRESH_MS
          : false,
    },
  );
}

export type SetLook = LookSet['looks'][number];

// The look prompt: one ask in flight; the edit comes back as the job's output.
export function useLookAsk(lookId: string, onAnswer: (result: LookAskResult) => void) {
  const toast = useToast();
  const [jobId, setJobId] = useState<string | null>(null);
  const start = useApiMutation('looks.ask', {
    onSuccess: ({ jobId: id }) => setJobId(id),
    onError: () => toast.show({ message: copy.prompt.failed }),
  });
  useJobResult(jobId, (job) => {
    setJobId(null);
    if (job.status === 'succeeded' && job.output.ask) onAnswer(job.output.ask);
    else toast.show({ message: copy.prompt.failed });
  });
  return {
    send: (input: LookAskInput) => start.mutate({ params: { id: lookId }, input }),
    reading: start.isPending || jobId !== null,
  };
}

// Five drafts wait: the server answers 409 drafts_full; she lets the oldest go, or keeps them.
export function isDraftsFull(err: unknown): boolean {
  return (
    err instanceof ApiClientError &&
    err.code === 'conflict' &&
    (err.details as { reason?: string } | undefined)?.reason === 'drafts_full'
  );
}
