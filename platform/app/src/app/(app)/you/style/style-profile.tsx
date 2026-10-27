'use client';

import { queryKeys, useApiClient } from '@robes/api-client/react';
import type { StyleProfile } from '@robes/contracts';
import { you } from '@robes/copy';
import { isTerminalJobStatus } from '@robes/core/jobs';
import { Card, Text } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, useEffect, useState } from 'react';
import { errorCopy } from '@/lib/error-copy';
import { uploadPhoto } from '@/lib/upload';
import { useJob } from '@/lib/use-job';
import { Swatches } from './swatches';

const copy = you.style;
type Kind = 'colour' | 'silhouette';

// Upload the right photo and run the analysis job; the profile refetches when it lands. The
// close-up card (Colouring) is the one door — the photo and its re-take circle carry it.
export function useAnalyse(kind: Kind) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { job, connection } = useJob(jobId);
  const colour = kind === 'colour';

  useEffect(() => {
    if (!job || !isTerminalJobStatus(job.status)) return;
    if (job.output.noSubject) setError(colour ? copy.noFace : copy.noPerson);
    else if (job.status !== 'succeeded') setError(copy.failed);
    setJobId(null);
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('me.style.get') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('me.model.get') });
  }, [job, colour, queryClient]);

  useEffect(() => {
    if (connection === 'unavailable') {
      setError(copy.failed);
      setJobId(null);
    }
  }, [connection]);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const asset = await uploadPhoto(api, file, colour ? 'headshot' : 'full_length');
      const started = await api.call('me.style.analyse', {
        input: { kind, assetId: asset.id },
      });
      setJobId(started.jobId);
    } catch (err) {
      setError(errorCopy(err));
    } finally {
      setUploading(false);
    }
  };

  return { onFile, busy: uploading || jobId !== null, error };
}

export function ColourResult({ colour }: { colour: NonNullable<StyleProfile['colour']> }) {
  return (
    <Card as="article" title={colour.season} meta={colour.summary} className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 pt-2">
        <Text size="small" tone="muted">
          {colour.undertone_note}
        </Text>
        <Swatches label={copy.best} swatches={colour.best_colours} />
        <Swatches label={copy.neutrals} swatches={colour.neutrals} />
        <Swatches label={copy.avoid} swatches={colour.avoid_colours} />
        <Swatches
          label={copy.metals}
          swatches={colour.metals.map((m) => ({
            name: m.name,
            hex: m.hexes[1] ?? m.hexes[0] ?? '',
          }))}
        />
      </div>
    </Card>
  );
}
