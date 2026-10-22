'use client';

import { useApi, useApiMutation } from '@robes/api-client/react';
import { trips } from '@robes/copy';
import { defaultTripDates, parseOccasions, tripDatesError } from '@robes/core/trips';
import { Button, ErrorText, Field, Pill, Text, TextArea } from '@robes/ui';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { localToday } from '@/lib/dates';
import { errorCopy } from '@/lib/error-copy';

const copy = trips.create;
const MAX_KEY_PIECES = 8;

export function TripForm({ initialBrief = '' }: { initialBrief?: string }) {
  const router = useRouter();
  const [dates, setDates] = useState(() => defaultTripDates(localToday()));
  const [destination, setDestination] = useState('');
  const [occasions, setOccasions] = useState('');
  const [brief, setBrief] = useState(initialBrief);
  const [keyPieces, setKeyPieces] = useState<string[]>([]);
  const pieces = useApi('wardrobe.list', { input: { limit: 60 } });
  const start = useApiMutation('travel.plan', {
    onSuccess: ({ jobId }) => router.push(`/trip/job/${jobId}`),
  });
  const dateError = tripDatesError(dates.dateFrom, dates.dateTo);

  function toggle(id: string) {
    setKeyPieces((k) =>
      k.includes(id) ? k.filter((x) => x !== id) : k.length < MAX_KEY_PIECES ? [...k, id] : k,
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (dateError || !destination.trim()) return;
    start.mutate({
      input: {
        destination: destination.trim(),
        ...dates,
        occasions: parseOccasions(occasions),
        anchorPieceIds: keyPieces,
        ...(brief.trim() ? { brief: brief.trim() } : {}),
      },
    });
  }

  const ready = (pieces.data?.items ?? []).filter((p) => p.status === 'ready');
  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <Field
        label={copy.destinationLabel}
        name="destination"
        placeholder={copy.destinationPlaceholder}
        maxLength={120}
        required
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-4">
        <Field
          label={copy.fromLabel}
          name="dateFrom"
          type="date"
          required
          value={dates.dateFrom}
          onChange={(e) => setDates((d) => ({ ...d, dateFrom: e.target.value }))}
        />
        <Field
          label={copy.toLabel}
          name="dateTo"
          type="date"
          required
          value={dates.dateTo}
          error={dateError ? copy[dateError] : undefined}
          onChange={(e) => setDates((d) => ({ ...d, dateTo: e.target.value }))}
        />
      </div>
      <TextArea
        label={copy.occasionsLabel}
        name="occasions"
        placeholder={copy.occasionsPlaceholder}
        rows={3}
        value={occasions}
        onChange={(e) => setOccasions(e.target.value)}
      />
      <TextArea
        label={copy.briefLabel}
        name="brief"
        placeholder={copy.briefPlaceholder}
        maxLength={600}
        rows={2}
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
      />
      {ready.length > 0 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="pb-2">
            <Text>{copy.keyPiecesLabel}</Text>
          </legend>
          <div className="flex flex-wrap gap-2">
            {ready.map((p) => (
              <Pill
                key={p.id}
                type="button"
                selected={keyPieces.includes(p.id)}
                onClick={() => toggle(p.id)}
              >
                {p.label}
              </Pill>
            ))}
          </div>
        </fieldset>
      ) : null}
      {start.isError ? <ErrorText>{errorCopy(start.error)}</ErrorText> : null}
      <Button
        variant="primary"
        type="submit"
        disabled={Boolean(dateError)}
        loading={start.isPending || start.isSuccess}
        loadingLabel={copy.submitting}
        className="self-start"
      >
        {copy.submit}
      </Button>
    </form>
  );
}
