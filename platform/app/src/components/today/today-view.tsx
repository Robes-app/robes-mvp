'use client';

import { useApi } from '@robes/api-client/react';
import type { Today } from '@robes/contracts';
import { today as copy, looks, nav } from '@robes/copy';
import { isTerminalJobStatus } from '@robes/core/jobs';
import { buttonClasses, Eyebrow, Heading, Text } from '@robes/ui';
import Link from 'next/link';
import { IdeaFrame } from '@/components/looks/idea-frame';
import { LookImage } from '@/components/looks/look-image';
import { dayLabel } from '@/lib/dates';
import { nextStepCopy } from './next-step';

const isRunning = (t: Today | undefined) =>
  t?.tray.some((j) => !isTerminalJobStatus(j.status)) ?? false;

function trayHref(job: Today['tray'][number]): string {
  if (job.kind === 'stylenotes_analyse') return '/you/style';
  if (job.kind === 'daily') {
    return job.output.dailyLookId
      ? `/today/looks/${job.output.dailyLookId}`
      : `/today/style/${job.id}`;
  }
  return job.output.ideaId ? `/looks/ideas/${job.output.ideaId}` : `/looks/style/${job.id}`;
}

// Today (IA §3.2): greeting, one next step, today's looks, the week, the tray, recent ideas.
export function TodayView({ initial }: { initial: Today }) {
  // Refreshes only while something in the tray is still running.
  const { data = initial } = useApi('today.get', undefined, {
    initialData: initial,
    refetchInterval: (q) => (isRunning(q.state.data) ? 2_000 : false),
  });
  const next = nextStepCopy(data);

  return (
    <div className="flex max-w-3xl flex-col gap-10 py-8">
      <header className="flex flex-col gap-3">
        <Eyebrow>{nav.today}</Eyebrow>
        <Heading level={1} size="2xl">
          {copy.greeting(data.firstName, data.hour)}
        </Heading>
        <Text tone="muted">
          {next.text}{' '}
          {next.door ? (
            <Link href={next.door.href} className="underline underline-offset-4">
              {next.door.label} →
            </Link>
          ) : null}
        </Text>
        <div className="flex flex-wrap gap-3">
          <Link href="/looks/style" className={buttonClasses({ variant: 'primary' })}>
            {looks.stylePiece.eyebrow}
          </Link>
          <Link href="/today/style" className={buttonClasses({ variant: 'secondary' })}>
            {copy.daily.action}
          </Link>
        </div>
      </header>

      {data.today.length > 0 ? (
        <section aria-labelledby="today-looks" className="flex flex-col gap-3">
          <Heading id="today-looks" level={2} size="md">
            {copy.todayLooks}
          </Heading>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {data.today.map(({ entry, worn }) => (
              <li key={entry.id}>
                <Link href={`/look/${entry.look.id}`} className="flex flex-col gap-2">
                  <LookImage look={entry.look} sizes="(min-width: 640px) 240px, 50vw" />
                  <Text>{entry.activity ?? entry.look.name}</Text>
                  {worn ? (
                    <Text size="small" tone="muted">
                      {copy.worn}
                    </Text>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="week" className="flex flex-col gap-3">
        <Heading id="week" level={2} size="md">
          {copy.week}
        </Heading>
        <ol className="grid grid-cols-7 gap-1">
          {data.week.map((d) => {
            const label = dayLabel(d.date, data.date);
            return (
              <li key={d.date}>
                <Link
                  href="/plan"
                  aria-label={copy.weekDay(label, d.looks)}
                  className="flex flex-col items-center gap-1 rounded-crisp border border-hairline px-1 py-2 text-center"
                >
                  <Text size="caption">{label}</Text>
                  <span aria-hidden className="text-sm">
                    {d.looks > 0 ? '●'.repeat(Math.min(d.looks, 3)) : '·'}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      {data.tray.length > 0 ? (
        <section aria-labelledby="tray" className="flex flex-col gap-3">
          <Heading id="tray" level={2} size="md">
            {copy.tray.title}
          </Heading>
          <ul className="flex flex-col gap-2">
            {data.tray.map((job) => {
              const state = !isTerminalJobStatus(job.status)
                ? copy.tray.running
                : job.status === 'failed' || job.status === 'cancelled'
                  ? copy.tray.failed
                  : copy.tray.ready;
              const title =
                job.kind === 'stylenotes_analyse'
                  ? copy.tray.styleColour
                  : job.kind === 'daily'
                    ? copy.daily.trayTitle
                    : copy.tray.stylePiece;
              return (
                <li key={job.id}>
                  <Link
                    href={trayHref(job)}
                    className="flex justify-between gap-4 underline-offset-4 hover:underline"
                  >
                    <Text>{title}</Text>
                    <Text tone="muted" role="status">
                      {state}
                    </Text>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {data.ideas.length > 0 ? (
        <section aria-labelledby="ideas" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <Heading id="ideas" level={2} size="md">
              {copy.ideas}
            </Heading>
            <Link href="/looks/ideas" className="underline underline-offset-4">
              {copy.seeAll}
            </Link>
          </div>
          <ul className="grid grid-cols-3 gap-3">
            {data.ideas.map((idea) => (
              <li key={idea.id}>
                <Link href={`/looks/ideas/${idea.id}`} className="flex flex-col gap-2">
                  <IdeaFrame
                    frame={idea.frames[0]}
                    alt={looks.result.frameAlt(idea.ways[0]?.title ?? idea.title)}
                    sizes="(min-width: 768px) 240px, 33vw"
                  />
                  <Text size="small">{idea.title}</Text>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
