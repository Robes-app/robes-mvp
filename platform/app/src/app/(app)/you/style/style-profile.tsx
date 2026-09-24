'use client';

import { queryKeys, useApi, useApiClient, useApiMutation } from '@robes/api-client/react';
import type { StyleProfile } from '@robes/contracts';
import { you } from '@robes/copy';
import { isTerminalJobStatus } from '@robes/core/jobs';
import { Button, Card, Field, Heading, Progress, Skeleton, Text, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import { errorCopy } from '@/lib/error-copy';
import { PHOTO_ACCEPT, uploadPhoto } from '@/lib/upload';
import { useJob } from '@/lib/use-job';
import { Swatches } from './swatches';

const copy = you.style;
type Kind = 'colour' | 'silhouette';

export function StyleProfileView() {
  const query = useApi('me.style.get');
  if (query.isError) {
    return (
      <Text role="alert" tone="danger">
        {errorCopy(query.error)}
      </Text>
    );
  }
  if (!query.data) return <Skeleton className="h-64" />;
  return (
    <div className="flex flex-col gap-8">
      <AnalyseCard kind="colour" profile={query.data} />
      <AnalyseCard kind="silhouette" profile={query.data} />
      <Overrides profile={query.data} />
    </div>
  );
}

// Upload the right photo, run the analysis job, and show the result when it lands.
function AnalyseCard({ kind, profile }: { kind: Kind; profile: StyleProfile }) {
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

  const busy = uploading || jobId !== null;
  const title = colour ? copy.colourTitle : copy.silhouetteTitle;
  const hasResult = colour ? profile.colour !== null : profile.silhouette !== null;
  const inputId = `style-photo-${kind}`;
  return (
    <section aria-labelledby={`${inputId}-title`} className="flex flex-col gap-4">
      <Heading level={2} size="md" id={`${inputId}-title`}>
        {title}
      </Heading>
      {colour && profile.colour ? <ColourResult colour={profile.colour} /> : null}
      {!colour && profile.silhouette ? <SilhouetteResult silhouette={profile.silhouette} /> : null}
      {busy ? (
        <div className="flex flex-col gap-2" aria-live="polite">
          <Progress stage="reading" />
          <Text size="small" tone="muted">
            {copy.reading}
          </Text>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {hasResult ? null : (
            <Text tone="muted">{colour ? copy.colourBody : copy.silhouetteBody}</Text>
          )}
          <label
            htmlFor={inputId}
            className="inline-flex min-h-11 cursor-pointer items-center self-start rounded-crisp border border-border-control px-4 font-sans text-sm text-ink hover:border-ink focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring"
          >
            {hasResult ? copy.retake : copy.choosePhoto}
            <input
              id={inputId}
              type="file"
              accept={PHOTO_ACCEPT}
              className="sr-only"
              onChange={(e) => void onFile(e)}
            />
          </label>
        </div>
      )}
      {error ? (
        <Text role="alert" tone="danger">
          {error}
        </Text>
      ) : null}
    </section>
  );
}

function ColourResult({ colour }: { colour: NonNullable<StyleProfile['colour']> }) {
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

function SilhouetteResult({ silhouette }: { silhouette: NonNullable<StyleProfile['silhouette']> }) {
  return (
    <Card as="article" title={silhouette.body_type} meta={silhouette.summary}>
      <dl className="flex flex-col gap-3 pt-2">
        <List term={copy.traits} items={silhouette.traits} />
        <List term={copy.silhouettes} items={silhouette.dress_silhouettes.map((d) => d.name)} />
        <List term={copy.necklines} items={silhouette.neckline_recommendations} />
        <List term={copy.tips} items={silhouette.styling_tips} />
      </dl>
    </Card>
  );
}

function List({ term, items }: { term: string; items: string[] }) {
  return (
    <div>
      <dt className="font-sans text-xs font-medium text-ink-muted">{term}</dt>
      <dd className="font-sans text-sm font-light text-ink">{items.join(' · ')}</dd>
    </div>
  );
}

const splitColours = (v: string): string[] =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);

// Her corrections outrank the photo read in every styling prompt.
function Overrides({ profile }: { profile: StyleProfile }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [loved, setLoved] = useState(profile.overrides.lovedColors.join(', '));
  const [rejected, setRejected] = useState(profile.overrides.rejectedColors.join(', '));
  const save = useApiMutation('me.style.overrides', {
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.call('me.style.get'), data);
      toast({ message: copy.savedColours });
    },
    onError: (err) => toast({ message: errorCopy(err) }),
  });
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate({
      input: { lovedColors: splitColours(loved), rejectedColors: splitColours(rejected) },
    });
  };
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field
        label={copy.lovedLabel}
        hint={copy.coloursHint}
        value={loved}
        onChange={(e) => setLoved(e.target.value)}
      />
      <Field
        label={copy.rejectedLabel}
        hint={copy.coloursHint}
        value={rejected}
        onChange={(e) => setRejected(e.target.value)}
      />
      <Button type="submit" variant="secondary" className="self-start" loading={save.isPending}>
        {copy.saveColours}
      </Button>
    </form>
  );
}
