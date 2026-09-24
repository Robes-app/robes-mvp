'use client';

import { useApiMutation } from '@robes/api-client/react';
import { isTerminalJobStatus } from '@robes/core/jobs';
import { useToast } from '@robes/ui';
import { useEffect, useState } from 'react';
import { errorCopy } from './error-copy';
import { useJob } from './use-job';

type RenderRoute = 'looks.ideas.render' | 'today.looks.render';

// "Show this look": starts one on-demand frame render (UX-09), follows its job over SSE and
// refreshes the page when it lands. `asked` lets the page keep polling for the rendition.
export function useFrameRender(route: RenderRoute, parentId: string, refresh: () => void) {
  const toast = useToast();
  const [asked, setAsked] = useState<number[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const { job } = useJob(jobId);
  const status = job?.status;
  // biome-ignore lint/correctness/useExhaustiveDependencies: refresh on each job status change only
  useEffect(() => {
    if (status && isTerminalJobStatus(status)) refresh();
  }, [status]);
  const render = useApiMutation(route as 'looks.ideas.render', {
    onSuccess: (out) => {
      setJobId(out.jobId);
      refresh();
    },
    onError: (err) => toast({ message: errorCopy(err) }),
  });
  return {
    asked,
    renderingIdx: render.isPending ? Number(render.variables?.params.idx) : null,
    start(idx: number) {
      setAsked((a) => (a.includes(idx) ? a : [...a, idx]));
      render.mutate({ params: { id: parentId, idx } });
    },
  };
}
