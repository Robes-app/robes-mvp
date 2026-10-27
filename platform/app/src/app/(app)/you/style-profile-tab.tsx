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

// A landing card prints its title only (redlines G4/L5): white on a hairline, the whole card the door.
const card =
  'flex items-center justify-between gap-4 rounded-soft border border-hairline bg-surface-raised px-[22px] py-5 font-display text-2xl text-ink leading-tight hover:border-rule-mid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// Style Profile: the three cards print their title only; the one card that asks is an Observation.
export function StyleProfileTab() {
  const { data: dna } = useApi('me.dna.get');
  useBriefRead(dna);
  const first = dna?.observations[0];
  return (
    <div className="flex flex-col gap-3.5">
      {first ? <NoticedCard line={first} /> : null}
      <nav aria-label={twin.tabs.style} className="flex flex-col gap-3.5">
        <Link href="/you/model" className={card}>
          {twin.cards.twin}
          <Icon name="forward" size={16} className="shrink-0 text-ink-faint" />
        </Link>
        <Link href="/you/style" className={card}>
          {twin.cards.dna}
          <Icon name="forward" size={16} className="shrink-0 text-ink-faint" />
        </Link>
        <Link href="/you/observations" className={card}>
          {twin.cards.observations}
          <Icon name="forward" size={16} className="shrink-0 text-ink-faint" />
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
      className="flex flex-col gap-2.5 rounded-soft border border-rule-mid bg-surface-raised px-[22px] pt-5 pb-[18px]"
    >
      <Eyebrow className="text-[9.5px] text-accent-plan">{twin.noticed.eyebrow}</Eyebrow>
      <p className="line-clamp-3 font-display text-[22px] text-ink leading-snug">
        {asSentence(line.text)}
      </p>
      {line.because ? (
        <Text size="small" tone="muted" italic>
          {asSentence(line.because)}
        </Text>
      ) : null}
      <ObservationThumbs line={line} />
    </section>
  );
}
