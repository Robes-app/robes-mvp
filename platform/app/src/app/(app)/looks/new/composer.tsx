'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import { looks, wardrobe } from '@robes/copy';
import { Button, buttonClasses, CardSkeleton, EmptyState, Field, Text, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { PieceImage } from '@/components/wardrobe/piece-image';
import { errorCopy } from '@/lib/error-copy';

const copy = looks.composer;

// New look: pick pieces in wear order, optionally name it (else Robes suggests one).
export function Composer() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const pieces = useApi('wardrobe.list', { input: { limit: 100 } });
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState('');
  const create = useApiMutation('looks.create', {
    onSuccess: (look) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
      router.push(`/look/${look.id}`);
    },
    onError: (err) => toast({ message: errorCopy(err) }),
  });

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate({
      input: {
        pieces: selected.map((pieceId) => ({ pieceId })),
        ...(name.trim() ? { name: name.trim() } : {}),
      },
    });
  };

  if (pieces.isError) {
    return (
      <Text role="alert" tone="danger">
        {errorCopy(pieces.error)}
      </Text>
    );
  }
  if (!pieces.data) {
    return (
      <ul aria-busy className="grid grid-cols-3 gap-3 md:grid-cols-5">
        {['a', 'b', 'c'].map((k) => (
          <li key={k}>
            <CardSkeleton />
          </li>
        ))}
      </ul>
    );
  }
  const ready = pieces.data.items.filter((p) => p.status === 'ready');
  if (ready.length === 0) {
    return (
      <EmptyState
        title={copy.empty}
        action={
          <Link href="/wardrobe/add" className={buttonClasses({ variant: 'primary' })}>
            {wardrobe.addPieces}
          </Link>
        }
      />
    );
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <ul aria-label={wardrobe.segments.pieces} className="grid grid-cols-3 gap-3 md:grid-cols-5">
        {ready.map((piece) => {
          const on = selected.includes(piece.id);
          return (
            <li key={piece.id}>
              <button
                type="button"
                aria-pressed={on}
                aria-label={copy.togglePiece(piece.label)}
                onClick={() => toggle(piece.id)}
                className={`flex w-full flex-col gap-1 rounded-crisp p-1 text-left outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus-ring ${on ? 'outline-2 outline-ink' : ''}`}
              >
                <PieceImage piece={piece} sizes="(min-width: 768px) 20vw, 33vw" />
                <Text size="small">{piece.label}</Text>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-end gap-3">
        <Field
          label={copy.nameLabel}
          placeholder={copy.namePlaceholder}
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
        />
        <Text size="small" tone="muted" aria-live="polite">
          {copy.selected(selected.length)}
        </Text>
        <Button
          type="submit"
          variant="primary"
          disabled={selected.length === 0}
          loading={create.isPending}
        >
          {copy.create}
        </Button>
      </div>
    </form>
  );
}
