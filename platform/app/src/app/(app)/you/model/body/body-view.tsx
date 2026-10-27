'use client';

import { useApi } from '@robes/api-client/react';
import type { Facts, Model, UpdateModelInput } from '@robes/contracts';
import { twin } from '@robes/copy';
import { effectiveStops, isAdjusted, readAdj, STOPS, TWIN_SCALES } from '@robes/core/avatar';
import { ageBandLabel, euSize } from '@robes/core/style-dna';
import { Icon } from '@robes/icons/web';
import { Button, ErrorText, Sheet, Skeleton } from '@robes/ui';
import { useState } from 'react';
import { errorCopy } from '@/lib/error-copy';
import {
  bustOf,
  FactsBody,
  Figure,
  type Pick,
  Section,
  useDrawTwin,
  useModel,
  useModelPick,
} from '../twin-parts';

const tw = twin.twinPage;
const f = twin.facts;

// Body shape (legacy redline 3c): her line drawn from the facts, her proportions and the facts
// strip (each a door to the facts drawer), then three five-cell scales she can nudge by hand.
// Nothing here names a shape. Leaving redraws her twin.
export function BodyView() {
  const query = useModel();
  const dna = useApi('me.dna.get');
  const { pick } = useModelPick();
  const [facts, setFacts] = useState(false);
  useDrawTwin('leave');
  if (query.isError) return <ErrorText>{errorCopy(query.error)}</ErrorText>;
  const model = query.data;
  if (!model || !dna.data) return <Skeleton className="h-64 w-full" />;
  const open = () => setFacts(true);
  return (
    <div className="flex flex-col gap-5">
      <Line model={model} facts={dna.data.facts} onOpen={open} />
      <Scales model={model} facts={dna.data.facts} pick={pick} />
      <Sheet open={facts} onOpenChange={setFacts} title={f.title} description={f.sub}>
        <FactsBody dna={dna.data} gender={model.presence} pick={pick} />
      </Sheet>
    </div>
  );
}

const selectClass =
  'inline-flex min-h-11 items-center gap-2 rounded-pill border px-4 font-sans text-sm hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

function Line({ model, facts, onOpen }: { model: Model; facts: Facts; onOpen: () => void }) {
  const chest = model.presence === 'man' ? tw.chest : f.bust;
  const rows: [string, string][] = [
    [f.height, facts.heightCm ? f.heightValue(facts.heightCm) : ''],
    [chest, bustOf(facts)],
    [f.waist, facts.waistCm ? f.waistValue(facts.waistCm, 'cm') : ''],
    [f.size, facts.sizeUk ? f.ukValue(facts.sizeUk) : ''],
  ];
  const strip: [string, string][] = [
    [f.height, rows[0]?.[1] ?? ''],
    [f.size, facts.sizeUk ? `${f.ukValue(facts.sizeUk)} · ${f.euValue(euSize(facts.sizeUk))}` : ''],
    [chest, rows[1]?.[1] ?? ''],
    [f.waist, rows[2]?.[1] ?? ''],
    [f.shoes, facts.shoeUk ? f.ukValue(facts.shoeUk) : ''],
  ];
  const gender = f.genderOptions[model.presence];
  const age = ageBandLabel(facts.ageBand);
  return (
    <section
      aria-label={tw.yourLine}
      className="flex flex-col gap-4 rounded-soft border border-hairline bg-surface-raised p-5"
    >
      <div className="flex items-center justify-between">
        <span className="font-sans text-ink-muted text-xs uppercase tracking-[0.2em]">
          {tw.yourLine}
        </span>
        <Button variant="quiet" onClick={onOpen}>
          {tw.edit}
          <Icon name="forward" size={14} />
        </Button>
      </div>
      <div className="grid grid-cols-[150px_minmax(0,1fr)] gap-4 rounded-soft border border-hairline p-3">
        <Figure facts={facts} adj={readAdj(model.adj)} />
        <dl className="flex flex-col gap-2 self-center">
          <dt className="font-sans text-[9px] text-ink-muted uppercase tracking-[0.2em]">
            {tw.proportions(model.presence)}
          </dt>
          {rows.map(([k, v]) => (
            <dd key={k} className="flex items-baseline justify-between gap-2">
              <span className="font-sans text-xs text-ink-muted">{k}</span>
              <span
                className={`font-display text-base ${v ? 'text-ink' : 'text-ink-faint italic'}`}
              >
                {v || f.add}
              </span>
            </dd>
          ))}
        </dl>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpen}
          className={`${selectClass} border-hairline text-ink`}
        >
          {gender}
          <Icon name="down" size={12} />
        </button>
        <button
          type="button"
          onClick={onOpen}
          className={`${selectClass} ${age ? 'border-hairline text-ink' : 'border-border-control border-dashed text-ink-muted'}`}
        >
          {age || tw.age}
          <Icon name="down" size={12} />
        </button>
      </div>
      <button
        type="button"
        onClick={onOpen}
        aria-label={f.title}
        className="grid grid-cols-5 rounded-crisp border border-hairline text-left hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      >
        {strip.map(([k, v], i) => (
          <span
            key={k}
            className={`flex flex-col gap-1 px-2 py-3 ${i ? 'border-hairline border-l' : ''}`}
          >
            <span className="font-sans text-ink-muted text-xs">{k}</span>
            <span
              className={`truncate ${v ? 'font-sans text-ink text-sm' : 'font-display text-ink-faint text-lg italic'}`}
            >
              {v || f.add}
            </span>
          </span>
        ))}
      </button>
    </section>
  );
}

function Scales({ model, facts, pick }: { model: Model; facts: Facts; pick: Pick }) {
  const adj = readAdj(model.adj);
  const eff = effectiveStops(facts, adj);
  const asIs = tw.asIs(model.presence);
  return (
    <Section title={tw.adjust}>
      {TWIN_SCALES.map((k) => {
        const s = tw.scales[k];
        const label = k === 'bust' && model.presence === 'man' ? tw.chest : s.label;
        const cur = eff[k];
        return (
          <fieldset key={k} className="flex flex-col gap-2">
            <legend className="pb-2 font-display text-lg text-ink">{label}</legend>
            <div className="grid grid-cols-5 gap-1 rounded-crisp border border-hairline bg-surface-sunk p-1">
              {STOPS.map((v) => {
                const on = cur === v;
                return (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={on}
                    aria-label={tw.stop(label, v, s.less, s.more, asIs)}
                    // A second tap on the chosen stop hands the scale back to her facts.
                    onClick={() => pick({ adj: { [k]: on ? null : v } as UpdateModelInput['adj'] })}
                    className={`flex h-11 items-center justify-center rounded-crisp border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${on ? 'border-selected-line bg-surface-raised' : 'border-transparent hover:border-hairline'}`}
                  >
                    {on ? <span aria-hidden className="size-1.5 rounded-full bg-ink" /> : null}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between px-3 font-sans text-ink-muted text-xs">
              <span>{s.less}</span>
              <span>{s.more}</span>
            </div>
          </fieldset>
        );
      })}
      {isAdjusted(adj) ? (
        <div className="border-hairline border-t pt-3">
          <Button variant="quiet" onClick={() => pick({ adj: {} })}>
            {tw.backToFacts}
          </Button>
        </div>
      ) : null}
    </Section>
  );
}
