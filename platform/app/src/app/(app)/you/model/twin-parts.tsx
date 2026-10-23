'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Facts, Model, StyleDna, UpdateModelInput } from '@robes/contracts';
import { twin, you } from '@robes/copy';
import {
  BUST_CUPS,
  stepTwinFact,
  type TwinAdj,
  type TwinStep,
  twinFigure,
} from '@robes/core/avatar';
import {
  AGE_BANDS,
  euShoe,
  euSize,
  type FactStep,
  feetInches,
  stepFact,
} from '@robes/core/style-dna';
import { Button, Eyebrow, Pill, SegmentedControl, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { errorCopy } from '@/lib/error-copy';
import { useDnaMutations } from '@/lib/use-dna';

const copy = you.model;
const f = twin.facts;
export type Pick = (input: UpdateModelInput) => void;

// Polls while her twin or the catalog portrait is being drawn.
export function useModel() {
  return useApi('me.model.get', undefined, {
    refetchInterval: (q) =>
      q.state.data?.cell.status === 'pending' || q.state.data?.twin.status === 'pending'
        ? 3_000
        : false,
  });
}

export function useModelPick(): { pick: Pick; pending: boolean } {
  const queryClient = useQueryClient();
  const toast = useToast();
  const update = useApiMutation('me.model.update', {
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.call('me.model.get'), data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.get') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('me.dna.get') });
    },
    onError: (err) => toast({ message: errorCopy(err) }),
  });
  return { pick: (input) => update.mutate({ input }), pending: update.isPending };
}

// The twin redraws when she lands on her model and when she leaves a twin screen — never per tap
// (legacy mvTwinSync). The server answers at once when nothing changed.
export function useDrawTwin(when: 'mount' | 'leave') {
  const queryClient = useQueryClient();
  const draw = useApiMutation('me.model.twin', {
    onSuccess: (data) => queryClient.setQueryData(queryKeys.call('me.model.get'), data),
  });
  const mutate = useRef(draw.mutate);
  mutate.current = draw.mutate;
  useEffect(() => {
    if (when === 'mount') {
      mutate.current();
      return;
    }
    return () => mutate.current();
  }, [when]);
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-4 rounded-soft border border-hairline bg-surface p-5"
    >
      <Eyebrow>{title}</Eyebrow>
      {children}
    </section>
  );
}

// Swatch colours are catalog data (like the style swatches), the one place colour comes inline.
function SwatchRow({
  label,
  hexes,
  names,
  value,
  onPick,
}: {
  label: string;
  hexes: string[];
  names: readonly string[];
  value: number;
  onPick: (i: number) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="font-sans text-sm text-ink-muted">
        {label} · {names[value]}
      </legend>
      <div className="flex flex-wrap gap-2">
        {hexes.map((hex, i) => (
          <button
            key={hex}
            type="button"
            aria-label={names[i] ?? hex}
            aria-pressed={i === value}
            onClick={() => onPick(i)}
            className="size-11 rounded-full border border-hairline outline-offset-2 aria-pressed:outline aria-pressed:outline-2 aria-pressed:outline-ink focus-visible:outline-2 focus-visible:outline-focus-ring"
            style={{ backgroundColor: hex }}
          />
        ))}
      </div>
    </fieldset>
  );
}

export function SkinAndHair({ model, pick }: { model: Model; pick: Pick }) {
  return (
    <>
      <SwatchRow
        label={copy.skin}
        hexes={model.swatches.skin}
        names={copy.skinNames}
        value={model.skin}
        onPick={(skin) => pick({ skin })}
      />
      <SwatchRow
        label={copy.hair}
        hexes={model.swatches.hair}
        names={copy.hairNames}
        value={model.hair}
        onPick={(hair) => pick({ hair })}
      />
    </>
  );
}

// Her line as a drawing: a white figure on a hairline, dashed guides at bust · waist · hips.
export function Figure({ facts, adj }: { facts: Facts; adj: TwinAdj }) {
  const g = twinFigure(facts, adj);
  const guide = (y: number) => (
    <line
      x1="18"
      x2="132"
      y1={y}
      y2={y}
      className="stroke-hairline"
      strokeWidth="0.7"
      strokeDasharray="2.5 2.5"
    />
  );
  return (
    <svg viewBox="0 0 150 250" aria-hidden className="h-[250px] w-[150px]">
      {guide(g.guides.bust)}
      {guide(g.guides.waist)}
      {guide(g.guides.hips)}
      <line
        x1="34"
        x2="116"
        y1={g.ground}
        y2={g.ground}
        className="stroke-ink-muted"
        strokeWidth="0.7"
      />
      <path
        d={g.d}
        className="fill-surface stroke-ink-muted"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <ellipse
        cx="75"
        cy={g.headY}
        rx={g.headRx}
        ry={g.headRy}
        className="fill-surface stroke-ink-muted"
        strokeWidth="0.9"
      />
    </svg>
  );
}

export const bustOf = (facts: Facts): string =>
  f.bustValue(facts.bustBand, facts.bustCup, facts.bustCm);

// "170 cm · UK 12 · 34C": the facts that draw her line.
export function lineSummary(facts: Facts): string {
  return [
    facts.heightCm ? f.heightValue(facts.heightCm) : '',
    facts.sizeUk ? f.ukValue(facts.sizeUk) : '',
    bustOf(facts),
  ]
    .filter(Boolean)
    .join(' · ');
}

function Stepper({
  label,
  value,
  sub,
  onStep,
}: {
  label: string;
  value: string;
  sub?: string;
  onStep: (dir: 1 | -1) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="font-sans text-base text-ink">{label}</span>
      <span className="flex flex-col items-end">
        <span className="flex items-center gap-2">
          <Button variant="secondary" aria-label={`${f.less}: ${label}`} onClick={() => onStep(-1)}>
            −
          </Button>
          <output
            aria-label={label}
            className={`min-w-16 text-center ${value ? 'font-sans text-base text-ink' : 'font-display text-lg text-ink-faint italic'}`}
          >
            {value || f.add}
          </output>
          <Button variant="secondary" aria-label={`${f.more}: ${label}`} onClick={() => onStep(1)}>
            +
          </Button>
        </span>
        {sub ? <span className="font-sans text-xs text-ink-muted">{sub}</span> : null}
      </span>
    </div>
  );
}

// The facts drawer (size, never weight): height, size, bust, waist, shoes, age and gender.
export function FactsBody({
  dna,
  gender,
  pick,
}: {
  dna: StyleDna;
  gender: Model['presence'];
  pick: Pick;
}) {
  const { update } = useDnaMutations();
  const [unit, setUnit] = useState<'cm' | 'ft'>('cm');
  const [waistUnit, setWaistUnit] = useState<'cm' | 'in'>('cm');
  const facts = dna.facts;
  const [bustMode, setBustMode] = useState<'bra' | 'cm'>(facts.bustCm ? 'cm' : 'bra');
  const man = gender === 'man';
  const set = (patch: Partial<Facts>) => update.mutate({ input: { facts: patch } });
  const step = (kind: FactStep, key: 'heightCm' | 'sizeUk' | 'shoeUk', dir: 1 | -1) =>
    set({ [key]: stepFact(kind, facts[key], dir) });
  const stepTwin = (kind: TwinStep, dir: 1 | -1, patch: Partial<Facts> = {}) =>
    set({ [kind]: stepTwinFact(kind, facts[kind], dir), ...patch });
  const any = Object.entries(facts).some(([, v]) => v !== null);
  const bra = bustMode === 'bra' && !man;
  return (
    <div className="flex flex-col gap-6">
      <Stepper
        label={f.height}
        value={
          facts.heightCm
            ? unit === 'cm'
              ? f.heightValue(facts.heightCm)
              : feetInches(facts.heightCm)
            : ''
        }
        onStep={(d) => step('heightCm', 'heightCm', d)}
      />
      <SegmentedControl
        label={f.height}
        value={unit}
        options={[
          { value: 'cm', label: f.cm },
          { value: 'ft', label: f.ftIn },
        ]}
        onChange={setUnit}
      />
      <Stepper
        label={f.size}
        value={facts.sizeUk ? f.ukValue(facts.sizeUk) : ''}
        sub={facts.sizeUk ? f.euValue(euSize(facts.sizeUk)) : undefined}
        onStep={(d) => step('sizeUk', 'sizeUk', d)}
      />
      {man ? null : (
        <SegmentedControl
          label={f.bust}
          value={bustMode}
          options={[
            { value: 'bra', label: f.braSize },
            { value: 'cm', label: f.tape },
          ]}
          onChange={setBustMode}
        />
      )}
      {bra ? (
        <>
          <Stepper
            label={f.band}
            value={facts.bustBand ? String(facts.bustBand) : ''}
            onStep={(d) => stepTwin('bustBand', d, { bustCm: null })}
          />
          <fieldset className="flex flex-col gap-2">
            <legend className="font-sans text-base text-ink">{f.cup}</legend>
            <div className="flex flex-wrap gap-2">
              {BUST_CUPS.map((c) => (
                <Pill
                  key={c}
                  selected={facts.bustCup === c}
                  onClick={() => set({ bustCup: facts.bustCup === c ? null : c, bustCm: null })}
                >
                  {c}
                </Pill>
              ))}
            </div>
          </fieldset>
        </>
      ) : (
        <Stepper
          label={man ? twin.twinPage.chest : f.bust}
          value={facts.bustCm ? f.heightValue(facts.bustCm) : ''}
          onStep={(d) => stepTwin('bustCm', d, { bustBand: null, bustCup: null })}
        />
      )}
      <Stepper
        label={f.waist}
        value={facts.waistCm ? f.waistValue(facts.waistCm, waistUnit) : ''}
        onStep={(d) => stepTwin('waistCm', d)}
      />
      <SegmentedControl
        label={f.waist}
        value={waistUnit}
        options={[
          { value: 'cm', label: f.cm },
          { value: 'in', label: f.inches },
        ]}
        onChange={setWaistUnit}
      />
      <Stepper
        label={f.shoes}
        value={facts.shoeUk ? f.ukValue(facts.shoeUk) : ''}
        sub={facts.shoeUk ? f.euValue(euShoe(facts.shoeUk)) : undefined}
        onStep={(d) => step('shoeUk', 'shoeUk', d)}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="font-sans text-base text-ink">{f.age}</legend>
        <div className="flex flex-wrap gap-2">
          {AGE_BANDS.map((a) => (
            <Pill
              key={a.key}
              selected={facts.ageBand === a.key}
              onClick={() => set({ ageBand: facts.ageBand === a.key ? null : a.key })}
            >
              {a.label}
            </Pill>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="font-sans text-base text-ink">{f.gender}</legend>
        <div className="flex flex-wrap gap-2">
          {(['woman', 'man', 'unspecified'] as const).map((g) => (
            <Pill key={g} selected={gender === g} onClick={() => pick({ presence: g })}>
              {f.genderOptions[g]}
            </Pill>
          ))}
        </div>
      </fieldset>
      {any ? (
        <Button
          variant="quiet"
          className="self-start"
          onClick={() =>
            set({
              heightCm: null,
              sizeUk: null,
              shoeUk: null,
              ageBand: null,
              bustBand: null,
              bustCup: null,
              bustCm: null,
              waistCm: null,
            })
          }
        >
          {f.clear}
        </Button>
      ) : null}
    </div>
  );
}
