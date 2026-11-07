'use client';

import type { StyleProfile } from '@robes/contracts';
import { you } from '@robes/copy';
import { Card, Text } from '@robes/ui';
import { Swatches } from './swatches';

const copy = you.style;

export function ColourResult({ colour }: { colour: NonNullable<StyleProfile['colour']> }) {
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
