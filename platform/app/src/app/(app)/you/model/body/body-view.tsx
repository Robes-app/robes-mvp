'use client';

import { useApi } from '@robes/api-client/react';
import type { Facts, Model, StyleDna, UpdateModelInput } from '@robes/contracts';
import { twin } from '@robes/copy';
import { effectiveStops, isAdjusted, readAdj, STOPS, scalesFor } from '@robes/core/avatar';
import { factRows, measurePresenceOf } from '@robes/core/style-dna';
import { Icon } from '@robes/icons/web';
import { ErrorText, Eyebrow, Skeleton } from '@robes/ui';
import { useState } from 'react';
import { errorCopy } from '@/lib/error-copy';
import {
  FactsSheet,
  Figure,
  type Pick,
  rowValue,
  useDrawTwin,
  useModel,
  useModelPick,
} from '../twin-parts';

const tw = twin.twinPage;
const f = twin.facts;

// Body shape (design "The facts — redesign", 24 Nov): her line drawn from the facts, the facts
// card in the units she reads them in (each row a door to The facts), then three five-stop scales
// she can nudge by hand — hers end at the hips, his at the waist. Nothing here names a shape.
// Leaving redraws her twin. Native twin: mobile/src/features/you/BodyShape.tsx.
export function BodyView() {
  const query = useModel();
  const dna = useApi('me.dna.get');
  const { pick } = useModelPick();
  const [facts, setFacts] = useState(false);
  useDrawTwin('leave');
  if (query.isError) return <ErrorText>{errorCopy(query.error)}</ErrorText>;
  const model = query.data;
  if (!model || !dna.data) return <Skeleton className="h-64 w-full" />;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-center">
        <Figure facts={dna.data.facts} adj={readAdj(model.adj, model.presence)} />
      </div>
      <FactsCard dna={dna.data} onOpen={() => setFacts(true)} />
      <Scales model={model} facts={dna.data.facts} pick={pick} />
      <FactsSheet open={facts} onOpenChange={setFacts} dna={dna.data} />
    </div>
  );
}

const card = 'overflow-hidden rounded-soft border border-rule-mid bg-surface-raised';

function FactsCard({ dna, onOpen }: { dna: StyleDna; onOpen: () => void }) {
  const rows = factRows(dna.facts, dna.units, measurePresenceOf(dna.gender));
  return (
    <section aria-labelledby="facts-h" className="flex flex-col gap-3">
      <Eyebrow id="facts-h">{f.title}</Eyebrow>
      <div className={card}>
        {rows.map((r, i) => {
          const value = rowValue(r);
          const label = f[r.field];
          return (
            <button
              key={r.field}
              type="button"
              onClick={onOpen}
              aria-label={f.rowLabel(label, value)}
              className={`flex min-h-[52px] w-full items-center gap-2.5 pr-3.5 pl-4 text-left hover:bg-surface-sunk focus-visible:outline-[1.5px] focus-visible:-outline-offset-2 focus-visible:outline-focus-ring ${i ? 'border-hairline border-t' : ''}`}
            >
              <span className="flex-1 font-sans text-ink-muted text-sm">{label}</span>
              <span
                className={`font-display text-xl leading-none ${value ? 'text-ink' : 'text-ink-muted italic'}`}
              >
                {value || f.add}
              </span>
              <Icon name="forward" size={14} className="text-ink-muted" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Scales({ model, facts, pick }: { model: Model; facts: Facts; pick: Pick }) {
  const adj = readAdj(model.adj, model.presence);
  const eff = effectiveStops(facts, adj);
  const asIs = tw.asIs(model.presence);
  const man = model.presence === 'man';
  return (
    <section aria-labelledby="adjust-h" className="flex flex-col gap-3">
      <div className="flex min-h-5 items-center justify-between">
        <Eyebrow id="adjust-h">{tw.adjust}</Eyebrow>
        {isAdjusted(adj) ? (
          <button
            type="button"
            onClick={() => pick({ adj: {} })}
            className="-my-3 -mr-2 min-h-11 px-2 font-sans text-[11px] text-ink-muted underline decoration-[0.5px] underline-offset-[3px] hover:text-ink focus-visible:outline-[1.5px] focus-visible:outline-focus-ring"
          >
            {tw.reset}
          </button>
        ) : null}
      </div>
      <div className={`${card} px-4 py-1`}>
        {scalesFor(model.presence).map((k, i) => {
          const s = k === 'bust' && man ? tw.chestScale : tw.scales[k];
          const cur = eff[k];
          return (
            <div
              key={k}
              role="radiogroup"
              aria-label={s.label}
              className={`flex flex-col gap-1.5 pt-4 pb-3 ${i ? 'border-hairline border-t' : ''}`}
            >
              <span className="font-display text-[22px] text-ink leading-tight">{s.label}</span>
              {/* Five stops on a hairline; the chosen one takes the warm fill and an ink dot. */}
              <div className="relative -mx-2.5 flex justify-between">
                <span aria-hidden className="absolute inset-x-8 top-[22px] h-px bg-hairline" />
                {STOPS.map((v) => {
                  const on = cur === v;
                  return (
                    // biome-ignore lint/a11y/useSemanticElements: a radio group of stops; native radios can't take the ring styling.
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={tw.stop(s.label, v, s.less, s.more, asIs)}
                      onClick={() => pick({ adj: { [k]: v } as UpdateModelInput['adj'] })}
                      className="relative flex size-11 items-center justify-center rounded-full focus-visible:outline-[1.5px] focus-visible:outline-focus-ring"
                    >
                      <span
                        className={`flex size-[30px] items-center justify-center rounded-full border ${on ? 'border-selected-line bg-selected' : 'border-transparent'}`}
                      >
                        <span
                          aria-hidden
                          className={`rounded-full ${on ? 'size-1.5 bg-ink' : v === 0 ? 'size-[7px] bg-selected-line' : 'size-[5px] bg-rule-mid'}`}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between font-sans text-[11px] text-ink-muted">
                <span>{s.less}</span>
                <span>{s.more}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
