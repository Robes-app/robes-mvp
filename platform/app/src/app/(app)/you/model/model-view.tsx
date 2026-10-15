'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Facts, Model, StyleDna, StyleProfile, UpdateModelInput } from '@robes/contracts';
import { twin, you } from '@robes/copy';
import {
  AGE_BANDS,
  euShoe,
  euSize,
  type FactStep,
  feetInches,
  seasonChoices,
  stepFact,
} from '@robes/core/style-dna';
import { Icon } from '@robes/icons/web';
import {
  Button,
  Eyebrow,
  Heading,
  Pill,
  SegmentedControl,
  Sheet,
  Skeleton,
  Text,
  useToast,
} from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { errorCopy } from '@/lib/error-copy';
import { useDnaMutations } from '@/lib/use-dna';
import { AnalyseCard, ColourResult, Overrides, SilhouetteResult } from '../style/style-profile';

const copy = you.model;
const tw = twin.twinPage;

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
      <legend className="font-sans text-sm text-ink-muted">{label}</legend>
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

type Pick = (input: UpdateModelInput) => void;

// Skin and hair go with Colouring, the line and the frame with Body shape (legacy P6).
function ColourRows({ model, pick }: { model: Model; pick: Pick }) {
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

function LineRows({ model, pick }: { model: Model; pick: Pick }) {
  return (
    <>
      <SegmentedControl
        label={copy.line}
        value={model.line ?? 'none'}
        options={(['soft', 'none', 'straight'] as const).map((value) => ({
          value,
          label: copy.lineOptions[value],
        }))}
        onChange={(line) => pick({ line: line === 'none' ? null : line })}
      />
      <SegmentedControl
        label={copy.frame}
        value={model.frame ?? 'none'}
        options={(['fuller', 'none', 'narrower'] as const).map((value) => ({
          value,
          label: copy.frameOptions[value],
        }))}
        onChange={(frame) => pick({ frame: frame === 'none' ? null : frame })}
      />
    </>
  );
}

// "Softer line, narrower frame" as set; nothing until set — never a shape's name.
function linePhrase(model: Model): string {
  const line = model.line ? copy.lineOptions[model.line] : '';
  const frame = model.frame ? copy.frameOptions[model.frame] : '';
  return tw.lineAndFrame(line, frame);
}

const rowClass =
  'flex min-h-14 w-full items-center justify-between gap-4 border-b border-hairline px-1 text-left font-sans text-base text-ink last:border-b-0 hover:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

function Row({
  label,
  sub,
  value,
  onClick,
}: {
  label: string;
  sub?: string;
  value?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={rowClass} onClick={onClick}>
      <span className="flex flex-col">
        <span>{label}</span>
        {sub ? <span className="text-sm text-ink-muted">{sub}</span> : null}
      </span>
      <span className="flex items-center gap-2 text-sm text-ink-muted">
        {value}
        <Icon name="forward" size={16} />
      </span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <Eyebrow>{title}</Eyebrow>
      {children}
    </section>
  );
}

type SheetKind = 'photos-colour' | 'photos-line' | 'adjust' | 'facts';

// You › Your Digital Twin (legacy Settings 01): her model, read from two photographs or shaped by
// hand, and the facts she gives (size, never weight).
export function ModelView() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  // Polls only while her portrait is being drawn.
  const query = useApi('me.model.get', undefined, {
    refetchInterval: (q) => (q.state.data?.cell.status === 'pending' ? 3_000 : false),
  });
  const style = useApi('me.style.get');
  const dna = useApi('me.dna.get');
  const update = useApiMutation('me.model.update', {
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.call('me.model.get'), data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.get') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('me.dna.get') });
    },
    onError: (err) => toast({ message: errorCopy(err) }),
  });

  if (query.isError) {
    return (
      <Text role="alert" tone="danger">
        {errorCopy(query.error)}
      </Text>
    );
  }
  const model = query.data;
  if (!model || !style.data || !dna.data) {
    return <Skeleton className="aspect-[4/5] w-full max-w-sm" />;
  }
  const profile = style.data;
  const pick: Pick = (input) => update.mutate({ input });
  const read = Boolean(profile.colour || profile.silhouette);
  const colour = profile.colour;

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <ModelStage model={model} />
      <div className="flex flex-col gap-8">
        {read ? null : <Text tone="muted">{copy.empty}</Text>}
        {!model.filed ? (
          <Button
            variant="primary"
            className="self-start"
            loading={update.isPending}
            onClick={() => pick({})}
          >
            {copy.build}
          </Button>
        ) : null}
        {read ? (
          <Section title={tw.readSection}>
            <div className="rounded-crisp border border-hairline bg-surface px-4">
              <Row
                label={tw.colouring}
                value={colour ? [colour.season, colour.undertone, colour.contrast].join(' · ') : ''}
                onClick={() => setSheet('photos-colour')}
              />
              <Row
                label={tw.bodyShape}
                sub={profile.silhouette ? tw.bodyShapeRead : undefined}
                value={linePhrase(model)}
                onClick={() => setSheet('photos-line')}
              />
              <Row label={tw.adjust} sub={tw.adjustSub} onClick={() => setSheet('adjust')} />
            </div>
          </Section>
        ) : (
          <>
            <Section title={tw.photographs}>
              <div className="flex flex-col gap-6 rounded-crisp border border-hairline bg-surface p-5">
                <AnalyseCard kind="colour" profile={profile} compact />
                <Text size="small" tone="muted">
                  {tw.closeUpGuide}
                </Text>
                <AnalyseCard kind="silhouette" profile={profile} compact />
                <Text size="small" tone="muted">
                  {tw.fullLengthGuide}
                </Text>
              </div>
            </Section>
            <Section title={tw.adjust}>
              <div className="flex flex-col gap-6">
                <ColourRows model={model} pick={pick} />
                <LineRows model={model} pick={pick} />
              </div>
            </Section>
          </>
        )}
        <FactsStrip
          facts={dna.data.facts}
          gender={model.presence}
          onOpen={() => setSheet('facts')}
        />
      </div>
      <Sheet
        open={sheet === 'photos-colour' || sheet === 'photos-line'}
        onOpenChange={(open) => (open ? null : setSheet(null))}
        title={tw.photographs}
        description={tw.photographsSub}
      >
        <PhotographsBody
          model={model}
          profile={profile}
          pick={pick}
          section={sheet === 'photos-line' ? 'line' : 'colour'}
        />
      </Sheet>
      <Sheet
        open={sheet === 'adjust'}
        onOpenChange={(open) => (open ? null : setSheet(null))}
        title={tw.adjust}
        description={tw.adjustSheetSub}
      >
        <div className="flex flex-col gap-6">
          <ColourRows model={model} pick={pick} />
          <LineRows model={model} pick={pick} />
        </div>
      </Sheet>
      <Sheet
        open={sheet === 'facts'}
        onOpenChange={(open) => (open ? null : setSheet(null))}
        title={twin.facts.title}
        description={twin.facts.sub}
      >
        <FactsBody dna={dna.data} gender={model.presence} pick={pick} />
      </Sheet>
    </div>
  );
}

function ModelStage({ model }: { model: Model }) {
  return (
    <figure className="flex flex-col gap-2">
      <Eyebrow>{copy.source[model.source]}</Eyebrow>
      {model.cell.imageUrl ? (
        // Catalog portrait signed per viewer; a single fixed-ratio image, no renditions.
        // biome-ignore lint/performance/noImgElement: signed catalog URL, fixed 4:5 frame
        <img
          src={model.cell.imageUrl}
          alt={copy.imageAlt}
          className="aspect-[4/5] w-full rounded-crisp object-cover"
        />
      ) : (
        <Skeleton className="aspect-[4/5] w-full" />
      )}
      {model.cell.status === 'pending' ? (
        <Text role="status" size="small" tone="muted">
          {copy.creating}
        </Text>
      ) : model.cell.status === 'failed' ? (
        <Text role="status" size="small" tone="muted">
          {copy.failed}
        </Text>
      ) : null}
    </figure>
  );
}

// One sheet behind Colouring and Body shape, opened on the tapped section (legacy P1–P8).
function PhotographsBody({
  model,
  profile,
  pick,
  section,
}: {
  model: Model;
  profile: StyleProfile;
  pick: Pick;
  section: 'colour' | 'line';
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [more, setMore] = useState(false);
  const season = useApiMutation('me.style.season', {
    onSuccess: (data) => queryClient.setQueryData(queryKeys.call('me.style.get'), data),
    onError: () => toast({ message: tw.seasonFailed }),
  });
  const colour = profile.colour;
  const colourBlock = (
    <section aria-label={tw.colouring} className="flex flex-col gap-4">
      <Heading level={3} size="sm">
        {tw.colouring}
      </Heading>
      <AnalyseCard kind="colour" profile={profile} compact />
      {colour ? (
        <div className="flex flex-col gap-2">
          {seasonChoices(colour.season, more).map((s) => {
            const on = s === colour.season;
            return (
              <div key={s} className="flex flex-col gap-2">
                <button
                  type="button"
                  aria-pressed={on}
                  disabled={season.isPending}
                  onClick={() => (on ? null : season.mutate({ input: { season: s } }))}
                  className={`flex min-h-12 items-center justify-between rounded-crisp border px-4 text-left font-sans text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${on ? 'border-ink bg-surface' : 'border-hairline hover:border-ink'}`}
                >
                  {s}
                  {on ? <Icon name="check" size={16} /> : null}
                </button>
                {on ? (
                  <details className="px-1">
                    <summary className="cursor-pointer font-sans text-sm text-ink-muted">
                      {[colour.undertone, colour.contrast].join(' · ')} — {colour.summary}
                    </summary>
                    <div className="pt-3">
                      <ColourResult colour={colour} />
                    </div>
                  </details>
                ) : null}
              </div>
            );
          })}
          {more ? null : (
            <Button variant="quiet" className="self-start" onClick={() => setMore(true)}>
              {tw.anotherSeason}
            </Button>
          )}
        </div>
      ) : (
        <Text size="small" tone="muted">
          {tw.addColour}
        </Text>
      )}
      <ColourRows model={model} pick={pick} />
      <Overrides profile={profile} />
    </section>
  );
  const lineBlock = (
    <section aria-label={tw.bodyShape} className="flex flex-col gap-4">
      <Heading level={3} size="sm">
        {tw.bodyShape}
      </Heading>
      <AnalyseCard kind="silhouette" profile={profile} compact />
      {profile.silhouette ? (
        <details>
          <summary className="cursor-pointer font-sans text-sm text-ink-muted">
            {tw.lineRead}
          </summary>
          <div className="pt-3">
            <SilhouetteResult silhouette={profile.silhouette} />
          </div>
        </details>
      ) : (
        <Text size="small" tone="muted">
          {tw.addLine}
        </Text>
      )}
      <LineRows model={model} pick={pick} />
    </section>
  );
  return (
    <div className="flex flex-col gap-8">
      {section === 'line' ? lineBlock : colourBlock}
      {section === 'line' ? colourBlock : lineBlock}
    </div>
  );
}

function FactsStrip({
  facts,
  gender,
  onOpen,
}: {
  facts: Facts;
  gender: Model['presence'];
  onOpen: () => void;
}) {
  const f = twin.facts;
  const cells: [string, string][] = [
    [f.height, facts.heightCm ? f.heightValue(facts.heightCm) : ''],
    [f.size, facts.sizeUk ? f.ukValue(facts.sizeUk) : ''],
    [f.shoes, facts.shoeUk ? f.ukValue(facts.shoeUk) : ''],
    [f.age, AGE_BANDS.find((a) => a.key === facts.ageBand)?.label ?? ''],
    [f.gender, gender === 'unspecified' ? f.unspecified : f.genderOptions[gender]],
  ];
  return (
    <Section title={f.title}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={f.title}
        className="grid grid-cols-5 rounded-crisp border border-hairline bg-surface text-left hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      >
        {cells.map(([k, v], i) => (
          <span
            key={k}
            className={`flex flex-col gap-1 px-3 py-3 ${i ? 'border-l border-hairline' : ''}`}
          >
            <span className="font-sans text-xs text-ink-muted">{k}</span>
            <span className={`font-sans text-sm ${v ? 'text-ink' : 'text-ink-faint italic'}`}>
              {v || f.add}
            </span>
          </span>
        ))}
      </button>
    </Section>
  );
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
  const f = twin.facts;
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="font-sans text-base text-ink">{label}</span>
      <span className="flex items-center gap-3">
        <span className="flex flex-col items-end">
          <span className="flex items-center gap-2">
            <Button
              variant="secondary"
              aria-label={`${f.less}: ${label}`}
              onClick={() => onStep(-1)}
            >
              −
            </Button>
            <output
              aria-label={label}
              className={`min-w-16 text-center font-sans text-base ${value ? 'text-ink' : 'text-ink-faint italic'}`}
            >
              {value || f.add}
            </output>
            <Button
              variant="secondary"
              aria-label={`${f.more}: ${label}`}
              onClick={() => onStep(1)}
            >
              +
            </Button>
          </span>
          {sub ? <span className="font-sans text-xs text-ink-muted">{sub}</span> : null}
        </span>
      </span>
    </div>
  );
}

function FactsBody({
  dna,
  gender,
  pick,
}: {
  dna: StyleDna;
  gender: Model['presence'];
  pick: Pick;
}) {
  const f = twin.facts;
  const { update } = useDnaMutations();
  const [unit, setUnit] = useState<'cm' | 'ft'>('cm');
  const facts = dna.facts;
  const set = (patch: Partial<Facts>) => update.mutate({ input: { facts: patch } });
  const step = (kind: FactStep, key: 'heightCm' | 'sizeUk' | 'shoeUk', dir: 1 | -1) =>
    set({ [key]: stepFact(kind, facts[key], dir) });
  const any = facts.heightCm || facts.sizeUk || facts.shoeUk || facts.ageBand;
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
          onClick={() => set({ heightCm: null, sizeUk: null, shoeUk: null, ageBand: null })}
        >
          {f.clear}
        </Button>
      ) : null}
    </div>
  );
}
