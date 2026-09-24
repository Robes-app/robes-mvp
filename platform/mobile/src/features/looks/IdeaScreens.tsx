import { useApi } from '@robes/api-client/react';
import type { Idea, JobSnapshot } from '@robes/contracts';
import { looks as copy, jobs, ui } from '@robes/copy';
import { EmptyState, Progress, Skeleton, useToast } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { askForPushOnce } from '@/lib/push';
import { IdeaView } from './IdeaView';
import {
  framesSettled,
  JOB_REFRESH_MS,
  useJobIdea,
  useRemoveIdea,
  useSaveIdea,
  useSaveWay,
} from './ideas';

function stageLabel(job: JobSnapshot | undefined): string {
  if (!job || job.stage === 'queued' || job.stage === 'text') return ui.progress.styling;
  if (job.stage === 'images') return ui.progress.dressing;
  return ui.progress.finishing;
}

function WithActions({ idea, progress }: { idea: Idea; progress?: React.ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const save = useSaveIdea();
  const saveWay = useSaveWay((lookId) => {
    toast.show({ message: copy.savedWay });
    router.push(`/look/${lookId}`);
  });
  const remove = useRemoveIdea(() => {
    toast.show({ message: copy.result.removed });
    router.back();
  });
  return (
    <IdeaView
      idea={idea}
      progress={progress}
      onSave={() => save.mutate({ params: { id: idea.id } })}
      saving={save.isPending}
      onRemove={() => remove.mutate({ params: { id: idea.id } })}
      removing={remove.isPending}
      onSaveWay={(wayIdx) => saveWay.mutate({ params: { id: idea.id }, input: { wayIdx } })}
      savingWay={saveWay.isPending ? (saveWay.variables?.input.wayIdx ?? null) : null}
    />
  );
}

function Waiting({ stage }: { stage: string }) {
  return (
    <View className="gap-6 px-6">
      <Progress stage={stage} />
      <Skeleton shape="text" width="70%" height={32} />
      <Skeleton width="100%" aspectRatio={4 / 5} />
    </View>
  );
}

// The result of a styling job, filling in stage by stage (UX-02: text first, then frames).
export function JobIdeaScreen({ jobId }: { jobId: string }) {
  const { job, idea, waiting, failed } = useJobIdea(jobId);
  // Her first finished result is when "tell me when looks are ready" makes sense; asked once.
  const ready = Boolean(idea) && !waiting;
  useEffect(() => {
    if (ready) void askForPushOnce(api).catch(() => undefined);
  }, [ready]);
  if (job.isError) return <EmptyState title={errorMessage(job.error)} />;
  if (failed && !idea) return <EmptyState title={jobs.status.failed} />;
  if (!idea) return <Waiting stage={stageLabel(job.data)} />;
  const done = idea.frames.filter((f) => f.status !== 'pending').length;
  return (
    <WithActions
      idea={idea}
      progress={
        waiting ? (
          <Progress stage={stageLabel(job.data)} total={idea.ways.length} done={done} />
        ) : null
      }
    />
  );
}

export function IdeaScreen({ id }: { id: string }) {
  const {
    data: idea,
    isPending,
    isError,
    error,
  } = useApi(
    'looks.ideas.get',
    { params: { id } },
    {
      refetchInterval: (q) =>
        q.state.data && !framesSettled(q.state.data) ? JOB_REFRESH_MS : false,
    },
  );
  if (isPending) return <Waiting stage={ui.loading} />;
  if (isError || !idea) return <EmptyState title={errorMessage(error)} />;
  return <WithActions idea={idea} />;
}
