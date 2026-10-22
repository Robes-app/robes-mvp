'use client';

import {
  queryKeys,
  useApi,
  useApiClient,
  useApiMutation,
  useUndoableMutation,
} from '@robes/api-client/react';
import type { Trip } from '@robes/contracts';
import { trips, wardrobe } from '@robes/copy';
import { Button, ErrorText, Eyebrow, Heading, Skeleton, Text, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { PieceImage } from '@/components/wardrobe/piece-image';
import { formatDay } from '@/lib/dates';
import { errorCopy } from '@/lib/error-copy';

const copy = trips.page;

// The trip page: facts, weather, the looks by day, the capsule, and "add the looks to your plan".
export function TripView({ id }: { id: string }) {
  const query = useApi('trips.get', { params: { id } });
  if (query.isError) {
    return <ErrorText>{errorCopy(query.error)}</ErrorText>;
  }
  if (!query.data) return <TripSkeleton />;
  return <TripBody trip={query.data} />;
}

function TripBody({ trip }: { trip: Trip }) {
  const router = useRouter();
  const toast = useToast();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const onError = (err: unknown) => toast({ message: errorCopy(err) });
  const pin = useApiMutation('trips.pin', {
    onSuccess: ({ lookIds }) => {
      queryClient.setQueryData(queryKeys.call('trips.get', { params: { id: trip.id } }), {
        ...trip,
        pinnedLookIds: lookIds,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('plan.get') });
      toast({ message: copy.pinned });
    },
    onError,
  });
  const remove = useUndoableMutation('trips.delete', {
    optimistic: () => [],
    invalidate: () => [queryKeys.route('trips.list'), queryKeys.route('plan.get')],
    onError,
    undo: {
      onAvailable: (handle) =>
        toast({
          message: copy.removed,
          action: { label: wardrobe.undo, onAction: () => void handle.undo() },
        }),
      compensate: (args) => client.call('trips.restore', { params: { id: args.params.id } }),
    },
  });
  const w = trip.weather;
  const weatherLine = w?.tempRange
    ? `${w.city}${w.country ? `, ${w.country}` : ''} · ${w.tempRange}${w.condition ? ` · ${w.condition}` : ''} (${w.seasonal ? copy.seasonal : copy.forecast})`
    : null;
  const byDate = new Map<string, Trip['looks']>();
  for (const look of trip.looks) byDate.set(look.date, [...(byDate.get(look.date) ?? []), look]);

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-10">
      <header className="flex flex-col gap-3">
        <Eyebrow>
          {copy.eyebrow} · {trip.tripLabel}
        </Eyebrow>
        <Heading level={1} size="xl">
          {trip.headline || trip.destination}
        </Heading>
        <Text tone="muted">
          {trip.destination}
          {trip.dateLine ? ` · ${trip.dateLine}` : ''}
        </Text>
        {weatherLine ? <Text size="small">{weatherLine}</Text> : null}
        {trip.stylistSummary ? <Text>{trip.stylistSummary}</Text> : null}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="primary"
            disabled={trip.pinnedLookIds !== null}
            loading={pin.isPending}
            loadingLabel={copy.pinning}
            onClick={() => pin.mutate({ params: { id: trip.id } })}
          >
            {trip.pinnedLookIds ? copy.pinned : copy.pin}
          </Button>
          <Button
            variant="quiet"
            onClick={() => {
              remove.mutate({ params: { id: trip.id } });
              router.push('/plan');
            }}
          >
            {copy.remove}
          </Button>
        </div>
      </header>

      <section aria-labelledby="trip-looks" className="flex flex-col gap-6">
        <Heading level={2} size="md" id="trip-looks">
          {copy.looks}
        </Heading>
        <ol className="flex flex-col gap-6">
          {[...byDate.entries()].map(([date, looks]) => (
            <li key={date} aria-label={formatDay(date)} className="flex flex-col gap-3">
              <Heading level={3} size="sm">
                {formatDay(date)}
              </Heading>
              {looks.map((look, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: looks are fixed once the trip is packed
                <div key={i} className="flex flex-col gap-2 border-l border-hairline pl-4">
                  <Text>
                    {look.title} · <span className="text-ink-muted">{look.occasion}</span>
                  </Text>
                  <Text size="small" tone="muted">
                    {look.how}
                  </Text>
                  <ul className="flex flex-col gap-1">
                    {look.items.map((item, j) => {
                      const piece = trip.capsule[item.capsuleIndex];
                      return (
                        // biome-ignore lint/suspicious/noArrayIndexKey: formula order is fixed
                        <li key={j}>
                          <Text size="small">
                            {item.role}: {piece?.piece?.label ?? piece?.name ?? ''}
                            {piece?.piece ? ` (${copy.yours})` : ''} — {item.note}
                          </Text>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="trip-capsule" className="flex flex-col gap-4">
        <Heading level={2} size="md" id="trip-capsule">
          {copy.capsule}
        </Heading>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {trip.capsule.map((item, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: the capsule order is fixed
            <li key={i} className="flex flex-col gap-1">
              {item.piece ? (
                <PieceImage piece={item.piece} sizes="(min-width: 640px) 200px, 50vw" />
              ) : null}
              <Text>{item.piece?.label ?? item.name}</Text>
              <Text size="caption" tone="muted">
                {item.piece
                  ? copy.yours
                  : [item.brand, item.pricePoint].filter(Boolean).join(' · ')}
              </Text>
              {item.reason || item.bridge ? (
                <Text size="small" tone="muted">
                  {item.reason || item.bridge}
                </Text>
              ) : null}
            </li>
          ))}
        </ul>
        {trip.suitcaseNote ? (
          <Text size="small">
            {copy.suitcase}: {trip.suitcaseNote}
          </Text>
        ) : null}
      </section>
    </article>
  );
}

export function TripSkeleton() {
  return (
    <div aria-busy className="mx-auto flex max-w-3xl flex-col gap-4">
      <Skeleton shape="text" className="h-10 w-2/3" />
      <Skeleton shape="text" className="h-4 w-1/2" />
      {['a', 'b', 'c'].map((k) => (
        <Skeleton key={k} shape="text" className="h-16" />
      ))}
    </div>
  );
}
