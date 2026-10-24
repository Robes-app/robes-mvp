'use client';

import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { Look, Today } from '@robes/contracts';
import { home as copy, lookbook, today as todayCopy } from '@robes/copy';
import { greetingName, type HomeStep, noticedLine, resolveHome } from '@robes/core/home';
import { isTerminalJobStatus } from '@robes/core/jobs';
import { anchorName } from '@robes/core/looks';
import { Icon } from '@robes/icons/web';
import { Eyebrow, Heading, Text, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { LookTile } from '@/components/looks/look-tile';
import { errorCopy } from '@/lib/error-copy';
import { HomeBox } from './home-box';
import { StepCard, StepMap } from './home-steps';
import { HomeWeek } from './home-week';

const WEATHER_STALE_MS = 30 * 60_000;

const isRunning = (t: Today | undefined) =>
  t?.tray.some((j) => !isTerminalJobStatus(j.status)) ?? false;

function trayHref(job: Today['tray'][number]): string {
  if (job.kind === 'stylenotes_analyse') return '/you/style';
  if (job.kind === 'travel') {
    return job.output.tripId ? `/trip/${job.output.tripId}` : `/trip/job/${job.id}`;
  }
  if (job.kind === 'daily' || job.output.dailyLookId) {
    return job.output.dailyLookId
      ? `/today/looks/${job.output.dailyLookId}`
      : `/today/style/${job.id}`;
  }
  return job.output.ideaId ? `/looks/ideas/${job.output.ideaId}` : `/looks/style/${job.id}`;
}

// The modular home (legacy 0478e63): H0 masthead · H1 alerts · H2 the box · the next step (O1–O4)
// and the map (G1) while onboarding · the week (H3) once activated · Saved then Suggested (H4).
export function HomeView({ initial, dress = null }: { initial: Today; dress?: string | null }) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  // The server's read is the freshest on every visit; a cached Today from an earlier visit
  // (before the deck minted suggestions) must not stand in for it.
  useState(() => queryClient.setQueryData(queryKeys.call('today.get'), initial));
  const { data = initial } = useApi('today.get', undefined, {
    initialData: initial,
    refetchInterval: (q) => (isRunning(q.state.data) ? 2_000 : false),
  });
  // The day's forecast changes slowly: no refetch on every focus or mount.
  const weather = useApi('today.weather', undefined, {
    staleTime: WEATHER_STALE_MS,
    refetchOnWindowFocus: false,
  });
  const [force, setForce] = useState<HomeStep | null>(null);
  // A day page's "Dress this day…" lands here with the box armed on its date.
  const [dressDate, setDressDate] = useState<string | null>(dress);
  const boxRef = useRef<HTMLDivElement>(null);
  const home = data.home;
  const resolved = resolveHome(home.state, { force });
  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.get') });

  const later = (step: HomeStep) => {
    if (force === step) setForce(null);
    void api
      .call('me.home.later', { input: { step } })
      .then(refresh)
      .catch((err) => toast({ message: errorCopy(err) }));
  };
  const answer = (id: string, keep: boolean) =>
    void api
      .call(keep ? 'me.dna.observations.keep' : 'me.dna.observations.dismiss', { params: { id } })
      .then(refresh)
      .catch((err) => toast({ message: errorCopy(err) }));

  const wx = weather.data;
  const weatherLine = wx ? copy.weather(wx.city, wx.tempRange, wx.condition) : null;
  const name = greetingName(data.firstName);

  return (
    <div
      className="mx-auto flex w-full max-w-[640px] flex-col gap-8 py-8"
      data-home={resolved.activated ? 'activated' : 'onboarding'}
      data-stage={resolved.stage}
    >
      <header className="flex flex-col gap-2">
        <Heading level={1} size="lg">
          {todayCopy.greeting(name, data.hour)}
        </Heading>
        <Text italic tone="faint">
          {copy.echo}
        </Text>
        {weatherLine ? (
          <Text
            size="caption"
            tone="muted"
            className="flex items-center gap-2 font-medium uppercase tracking-[0.16em]"
            aria-label={`${copy.weatherLabel}: ${weatherLine}`}
          >
            <Icon name={/clear|partly/.test(wx?.condition ?? '') ? 'today' : 'cloud'} size={16} />
            {weatherLine}
          </Text>
        ) : null}
      </header>

      <Alerts data={data} onAnswer={answer} />

      <div ref={boxRef}>
        <HomeBox
          placeholder={lookbook.prompt.doorNew}
          date={dressDate}
          onDateClear={() => setDressDate(null)}
          hasPieces={home.state.pics > 0}
        />
      </div>

      {resolved.modules.includes('H3') ? (
        <HomeWeek
          data={data}
          weatherLine={weatherLine}
          onChanged={refresh}
          onDress={(date) => {
            setDressDate(date);
            boxRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            boxRef.current?.querySelector('textarea')?.focus();
          }}
        />
      ) : null}

      {resolved.next ? <StepCard step={resolved.next} home={home} onLater={later} /> : null}
      {!resolved.activated ? (
        <StepMap resolved={resolved} pics={home.state.pics} onExpand={setForce} />
      ) : null}

      <LookRow title={copy.saved} href="/looks" looks={home.saved} kind="saved" />
      <LookRow
        title={copy.suggested}
        href="/looks?tab=suggested"
        looks={home.suggested}
        kind="suggested"
      />

      {resolved.activated ? (
        <StepMap resolved={resolved} pics={home.state.pics} onExpand={setForce} />
      ) : null}

      {data.tray.length > 0 ? (
        <section aria-labelledby="tray" className="flex flex-col gap-3">
          <Eyebrow id="tray">{todayCopy.tray.title}</Eyebrow>
          <ul className="flex flex-col gap-2">
            {data.tray.map((job) => (
              <li key={job.id}>
                <Link
                  href={trayHref(job)}
                  className="flex justify-between gap-4 underline-offset-4 hover:underline"
                >
                  <Text>
                    {job.kind === 'stylenotes_analyse'
                      ? todayCopy.tray.styleColour
                      : job.kind === 'travel'
                        ? todayCopy.tray.trip
                        : job.kind === 'daily' || job.output.dailyLookId
                          ? todayCopy.daily.trayTitle
                          : todayCopy.tray.stylePiece}
                  </Text>
                  <Text tone="muted" role="status">
                    {!isTerminalJobStatus(job.status)
                      ? todayCopy.tray.running
                      : job.status === 'failed' || job.status === 'cancelled'
                        ? todayCopy.tray.failed
                        : todayCopy.tray.ready}
                  </Text>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

// H1 · alerts: the receipt strip, the look Robes made overnight, one line Robes noticed.
function Alerts({
  data,
  onAnswer,
}: {
  data: Today;
  onAnswer: (id: string, keep: boolean) => void;
}) {
  const { receipts, noticed } = data.home;
  const rows = [];
  if (receipts) {
    rows.push(
      <li key="receipt" className="flex items-center gap-3 py-3" data-kind="receipt">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-crisp bg-surface-sunk font-sans text-ink-muted text-sm">
          {receipts.pieces}
        </span>
        <span className="flex flex-1 flex-col">
          <Text size="caption" tone="muted" className="uppercase tracking-wider">
            {copy.alerts.receiptFrom(receipts.retailer, receipts.receipts)}
          </Text>
          <Text>
            {copy.alerts.receiptRead(receipts.pieces)} <em>{copy.alerts.receiptReady}</em>
          </Text>
        </span>
        <Link href="/wardrobe/inbox" className="font-sans text-sm underline underline-offset-4">
          {copy.alerts.review}
        </Link>
      </li>,
    );
  }
  if (data.overnight) {
    rows.push(
      <li key="overnight" className="flex items-center gap-3 py-3" data-kind="overnight">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-crisp bg-surface-sunk text-ink-muted">
          <Icon name="today" size={18} />
        </span>
        <span className="flex flex-1 flex-col">
          <Text size="caption" tone="muted" className="uppercase tracking-wider">
            {todayCopy.overnight.title}
          </Text>
          <Text className="truncate">{data.overnight.headline || data.overnight.title}</Text>
        </span>
        <Link
          href={`/today/looks/${data.overnight.id}`}
          className="font-sans text-sm underline underline-offset-4"
        >
          {todayCopy.overnight.open} ›
        </Link>
      </li>,
    );
  }
  if (noticed) {
    rows.push(
      <li key="noticed" className="flex items-center gap-3 py-3" data-kind="observation">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-crisp bg-surface-sunk text-ink-muted">
          <Icon name="looks" size={18} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <Text size="caption" tone="muted" className="uppercase tracking-wider">
            {copy.alerts.noticed}
          </Text>
          <Text className="truncate" title={noticed.text}>
            {noticedLine(noticed.text)}
          </Text>
        </span>
        <button
          type="button"
          className="font-sans text-sm underline underline-offset-4"
          onClick={() => onAnswer(noticed.id, true)}
        >
          {copy.alerts.keep}
        </button>
        <button
          type="button"
          className="font-sans text-ink-muted text-sm"
          onClick={() => onAnswer(noticed.id, false)}
        >
          {copy.alerts.notMe}
        </button>
      </li>,
    );
  }
  if (!rows.length) return null;
  return (
    <section aria-label={copy.alerts.label} data-testid="home-alerts">
      <ul className="flex flex-col divide-y divide-hairline">{rows}</ul>
    </section>
  );
}

// H4 · Saved looks, then Suggested — each whenever it has data; a card opens its look.
function LookRow({
  title,
  href,
  looks,
  kind,
}: {
  title: string;
  href: string;
  looks: Look[];
  kind: 'saved' | 'suggested';
}) {
  if (!looks.length) return null;
  const id = `home-${kind}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3" data-testid={id}>
      <div className="flex items-baseline justify-between">
        <Eyebrow id={id}>{title}</Eyebrow>
        <Link href={href} className="font-sans text-sm underline underline-offset-4">
          {copy.viewAll}
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-4">
        {looks.map((look) => {
          const around = look.anchor ? anchorName(look.anchor.label, look.anchor.brand) : '';
          return (
            <li key={look.id} className="flex">
              <LookTile
                look={look}
                href={`/look/${look.id}`}
                sizes="(min-width: 640px) 300px, 50vw"
                className="flex-1"
                meta={
                  kind === 'suggested'
                    ? around
                      ? copy.aroundYour(around)
                      : copy.fromPrompt
                    : lookbook.meta.pieces(look.pieces.length)
                }
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
