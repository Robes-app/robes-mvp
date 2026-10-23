'use client';

import { useApi } from '@robes/api-client/react';
import type { Observation } from '@robes/contracts';
import { twin } from '@robes/copy';
import { asSentence } from '@robes/core';
import { Icon } from '@robes/icons/web';
import { Eyebrow, Text } from '@robes/ui';
import Link from 'next/link';
import { ObservationThumbs } from '@/components/observation-thumbs';
import { useBriefRead } from '@/lib/use-dna';

const card =
  'flex min-h-16 items-center justify-between gap-4 rounded-crisp border border-hairline bg-surface px-5 font-serif text-xl text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// Style Profile: the three cards print their title only; the one card that asks is an Observation.
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

// The first waiting line, answered with That’s right or Not quite.
function NoticedCard({ line }: { line: Observation }) {
  return (
    <section
      aria-label={twin.noticed.eyebrow}
      className="flex flex-col gap-3 rounded-crisp border border-hairline bg-surface p-5"
    >
      <Eyebrow>{twin.noticed.eyebrow}</Eyebrow>
      <p className="font-display font-light text-ink text-xl">{asSentence(line.text)}</p>
      {line.because ? (
        <Text size="small" tone="muted" italic>
          {asSentence(line.because)}
        </Text>
      ) : null}
      <ObservationThumbs line={line} />
    </section>
  );
}
