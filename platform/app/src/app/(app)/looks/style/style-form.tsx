'use client';

import { useApi, useApiMutation } from '@robes/api-client/react';
import type { GenerateLookInput } from '@robes/contracts';
import { looks } from '@robes/copy';
import { Button, ErrorText, Field, Heading, Pill, Skeleton } from '@robes/ui';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { errorCopy } from '@/lib/error-copy';

const copy = looks.stylePiece;

// One of her pieces, or one described in words; choosing one clears the other.
export function StyleForm() {
  const router = useRouter();
  const pieces = useApi('wardrobe.list', { input: { limit: 60 } });
  const [pieceId, setPieceId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [occasion, setOccasion] = useState('');
  const start = useApiMutation('looks.generate', {
    onSuccess: ({ jobId }) => router.push(`/looks/style/${jobId}`),
  });

  const ready = (pieces.data?.items ?? []).filter((p) => p.status === 'ready');
  const anchor: GenerateLookInput['anchor'] | null = pieceId
    ? { type: 'piece', pieceId }
    : text.trim().length >= 2
      ? { type: 'text', text: text.trim() }
      : null;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!anchor) return;
    start.mutate({
      input: { anchor, ...(occasion.trim() ? { occasion: occasion.trim() } : {}) },
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-8">
      <section aria-labelledby="style-from-wardrobe" className="flex flex-col gap-3">
        <Heading level={2} size="sm" id="style-from-wardrobe">
          {copy.fromWardrobe}
        </Heading>
        {pieces.data ? (
          <div className="flex flex-wrap gap-2">
            {ready.map((p) => (
              <Pill
                key={p.id}
                selected={pieceId === p.id}
                onClick={() => {
                  setPieceId(pieceId === p.id ? null : p.id);
                  setText('');
                }}
              >
                {p.label}
              </Pill>
            ))}
          </div>
        ) : (
          <div aria-busy className="flex gap-2">
            <Skeleton className="h-11 w-28 rounded-pill" />
            <Skeleton className="h-11 w-36 rounded-pill" />
          </div>
        )}
      </section>
      <Field
        label={copy.describe}
        name="describe"
        placeholder={copy.describePlaceholder}
        maxLength={300}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (e.target.value) setPieceId(null);
        }}
      />
      <Field
        label={copy.occasionLabel}
        name="occasion"
        placeholder={copy.occasionPlaceholder}
        maxLength={120}
        value={occasion}
        onChange={(e) => setOccasion(e.target.value)}
      />
      {start.isError ? <ErrorText>{errorCopy(start.error)}</ErrorText> : null}
      <Button
        variant="primary"
        type="submit"
        disabled={!anchor}
        loading={start.isPending || start.isSuccess}
        loadingLabel={copy.starting}
        className="self-start"
      >
        {copy.start}
      </Button>
    </form>
  );
}
