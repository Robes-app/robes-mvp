'use client';

import { useApi } from '@robes/api-client/react';
import type { Observation } from '@robes/contracts';
import { twin } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { Button, Eyebrow, Text } from '@robes/ui';
import Link from 'next/link';
import { useBriefRead, useDnaMutations } from '@/lib/use-dna';

const card =
  'flex min-h-16 items-center justify-between gap-4 rounded-crisp border border-hairline bg-surface px-5 font-serif text-xl text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// Style Profile: the three cards print their title only; the one card that asks is Robes noticed.
export function StyleProfileTab() {
  const { data: dna } = useApi('me.dna.get');
  useBriefRead(dna);
  const first = dna?.observations[0];
  return (
    <div className="flex flex-col gap-4">
      {first ? <NoticedCard line={first} /> : null}
      <nav aria-label={twin.tabs.style} className="flex flex-col gap-3">
        <Link href="/you/model" className={card}>
          {twin.cards.twin}
          <Icon name="forward" size={16} className="text-ink-muted" />
        </Link>
        <Link href="/you/style" className={card}>
          {twin.cards.dna}
          <Icon name="forward" size={16} className="text-ink-muted" />
        </Link>
        <Link href="/you/observations" className={card}>
          {twin.cards.observations}
          <Icon name="forward" size={16} className="text-ink-muted" />
        </Link>
      </nav>
    </div>
  );
}

// The first waiting line, answered with Keep or Not me.
function NoticedCard({ line }: { line: Observation }) {
  const { keep, dismiss } = useDnaMutations();
  const busy = keep.isPending || dismiss.isPending;
  return (
    <section
      aria-label={twin.noticed.eyebrow}
      className="flex flex-col gap-3 rounded-crisp border border-hairline bg-surface p-5"
    >
      <Eyebrow>{twin.noticed.eyebrow}</Eyebrow>
      <Text className="font-serif text-xl">{line.text}</Text>
      {line.because ? (
        <Text size="small" tone="muted" italic>
          {line.because}
        </Text>
      ) : null}
      <div className="flex justify-between gap-3">
        <Button
          variant="quiet"
          disabled={busy}
          onClick={() => dismiss.mutate({ params: { id: line.id } })}
        >
          {twin.noticed.notMe}
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => keep.mutate({ params: { id: line.id } })}
        >
          {twin.noticed.keep}
        </Button>
      </div>
    </section>
  );
}
