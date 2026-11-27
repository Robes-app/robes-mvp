'use client';

import { isApiClientError } from '@robes/api-client';
import {
  queryKeys,
  useApi,
  useApiAll,
  useApiClient,
  useApiMutation,
} from '@robes/api-client/react';
import type {
  JobSnapshot,
  Look,
  LookAskInput,
  LookAskResult,
  LookPage,
  LookStatus,
} from '@robes/contracts';
import { lookbook as copy, wardrobe } from '@robes/copy';
import { isTerminalJobStatus } from '@robes/core/jobs';
import { pictureLanding } from '@robes/core/looks';
import { type ToastOptions, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAnalytics } from '@/components/analytics-provider';
import { errorCopy } from './error-copy';
import { useJob } from './use-job';

// The API's largest page of looks; the Lookbook reads every page (TestFlight, 16 Nov).
const LIMIT = 60;
// A frame lands after its job (renditions run on the upload event): check while one is coming.
export const FRAME_REFRESH_MS = 1500;

export function useLooksByStatus(status: LookStatus, opts: { anchorPieceId?: string } = {}) {
  return useApiAll(
    'looks.list',
    {
      input: {
        limit: LIMIT,
        status,
        ...(opts.anchorPieceId ? { anchorPieceId: opts.anchorPieceId } : {}),
      },
    },
    {
      // A frame lands after its job, her photograph's renditions after its upload (twin: mobile
      // look-states.ts).
      refetchInterval: (q) =>
        q.state.data?.items.some((l) => pictureLanding(l)) ? FRAME_REFRESH_MS : false,
    },
  );
}

export function useRefreshLooks() {
  const queryClient = useQueryClient();
  return (look?: Look) => {
    if (look) {
      queryClient.setQueryData(queryKeys.call('looks.get', { params: { id: look.id } }), look);
    }
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.sets.get') });
  };
}

// Every read that shows a look on a day: Home's week, the Diary and the day page. A look deleted
// or restored comes off or back on them too (TestFlight 20 Nov: a deleted look stayed on Home and
// opening it said "Robes couldn't find that"). Twin: mobile features/looks/look-states.ts.
const DAY_READS = ['plan.get', 'plan.day', 'today.get'] as const;

function useRefreshDayReads() {
  const queryClient = useQueryClient();
  return () => {
    for (const key of DAY_READS) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.route(key) });
    }
  };
}

function withoutLook(old: unknown, id: string): unknown {
  const page = old as LookPage | undefined;
  return page?.items ? { ...page, items: page.items.filter((l) => l.id !== id) } : old;
}

// ✕ / pass / Discard: the look goes at once behind "Removed · Undo" (a row deleted, not flagged).
export function useLetGo(label: string = copy.removed, onUndo?: (id: string) => void) {
  const api = useApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  const refresh = useRefreshLooks();
  const refreshDays = useRefreshDayReads();
  return (id: string) => {
    queryClient.setQueriesData({ queryKey: queryKeys.route('looks.list') }, (old) =>
      withoutLook(old, id),
    );
    void api
      .call('looks.delete', { params: { id } })
      .then(() => {
        queryClient.removeQueries({ queryKey: queryKeys.call('looks.get', { params: { id } }) });
        refreshDays();
        toast({
          message: label,
          action: {
            label: wardrobe.undo,
            onAction: () =>
              void api
                .call('looks.restore', { params: { id } })
                .then((look) => {
                  refresh(look);
                  refreshDays();
                  onUndo?.(id);
                })
                .catch((err) =>
                  toast({ message: isDraftsFull(err) ? copy.drafts.fullTitle : errorCopy(err) }),
                ),
          },
        });
      })
      .catch((err) => {
        refresh();
        refreshDays();
        toast({ message: errorCopy(err) });
      });
  };
}

const WISHLIST = '/wardrobe/wishlist';

// A suggestion saved (design "Suggested looks", 04): its pieces to find are on her wishlist now,
// and View opens it. Native twin: mobile/src/features/looks/look-states.ts.
export function savedSuggestionToast(look: Look, onView: () => void): ToastOptions {
  const wished = look.proposals.filter((p) => p.wishlistItemId).length;
  return {
    message: copy.savedSuggestion.title,
    ...(wished ? { body: copy.savedSuggestion.body(wished) } : {}),
    action: { label: copy.savedSuggestion.view, onAction: onView },
  };
}

// `from` picks beta's toast: a suggestion saved as it stands, or a look she worked on, by name.
// `changes`: how many changes she sent through the prompt before saving, for the event.
// `says`: `plain` for "Saved to your lookbook", a draft going back to where it began (a piece).
export function useSaveLook(
  onSaved?: (look: Look) => void,
  from: 'suggested' | 'draft' = 'draft',
  changes: () => number = () => 0,
  says: 'named' | 'plain' = 'named',
) {
  const toast = useToast();
  const refresh = useRefreshLooks();
  const router = useRouter();
  const { track } = useAnalytics().analytics;
  return useApiMutation('looks.save', {
    onSuccess: (look) => {
      track('look_created', {
        from,
        pieces: look.pieces.length,
        proposed: look.proposals.length,
        anchored: look.anchor !== null,
        changes: changes(),
      });
      refresh(look);
      onSaved?.(look);
      if (from === 'suggested') toast(savedSuggestionToast(look, () => router.push(WISHLIST)));
      else
        toast({ message: says === 'plain' ? copy.savedSuggestion.title : copy.savedAs(look.name) });
    },
    onError: (err) => toast({ message: errorCopy(err) }),
  });
}

// Calls back once when the job ends (SSE; a reconnect resumes from the row).
export function useJobDone(jobId: string | null, onDone: (job: JobSnapshot) => void) {
  const { job, connection } = useJob(jobId);
  const handled = useRef<string | null>(null);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (!jobId || handled.current === jobId) return;
    if (job && job.id === jobId && isTerminalJobStatus(job.status)) {
      handled.current = jobId;
      done.current(job);
    } else if (connection === 'unavailable') {
      handled.current = jobId;
      done.current({ ...(job ?? ({} as JobSnapshot)), id: jobId, status: 'failed' });
    }
  }, [job, jobId, connection]);
  return job;
}

// A saved look's pieces changed: her model wears the new rack (beta re-dressed it live). The
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
  const refresh = useRefreshLooks();
  return (id: string) =>
    void api
      .call('looks.frame', { params: { id } })
      .then(() => refresh())
      .catch(() => undefined);
}

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
          ? FRAME_REFRESH_MS
          : false,
    },
  );
}

// The look prompt: one ask in flight; the edit comes back as the job's output.
export function useLookAsk(lookId: string, onAnswer: (result: LookAskResult) => void) {
  const toast = useToast();
  const [jobId, setJobId] = useState<string | null>(null);
  const start = useApiMutation('looks.ask', {
    onSuccess: ({ jobId: id }) => setJobId(id),
    onError: () => toast({ message: copy.prompt.failed }),
  });
  useJobDone(jobId, (job) => {
    setJobId(null);
    if (job.status === 'succeeded' && job.output?.ask) onAnswer(job.output.ask);
    else toast({ message: copy.prompt.failed });
  });
  return {
    send: (input: LookAskInput) => start.mutate({ params: { id: lookId }, input }),
    reading: start.isPending || jobId !== null,
  };
}

// Five drafts wait: the server answers 409 drafts_full; she lets the oldest go, or keeps them.
export function isDraftsFull(err: unknown): boolean {
  return (
    isApiClientError(err) &&
    err.code === 'conflict' &&
    (err.details as { reason?: string } | undefined)?.reason === 'drafts_full'
  );
}
