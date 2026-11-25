'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Facts, Model, StyleDna, UnitPrefs, UpdateModelInput } from '@robes/contracts';
import { diary, twin, ui, you } from '@robes/copy';
import {
  chosenTones,
  lineupOrder,
  TWIN_STATUS_STEP_MS,
  type TwinAdj,
  twinFigure,
  twinStatusIndex,
} from '@robes/core/avatar';
import {
  CLEARED_FACTS,
  type FactRow,
  factRows,
  type MeasureField,
  type MeasureUnit,
  measurePresenceOf,
  type PickerColumn,
  pickerOf,
  settledIndex,
  WHEEL_SIDE,
  wheelOpacity,
} from '@robes/core/style-dna';
import { Icon } from '@robes/icons/web';
import { AlertDialog, Button, Eyebrow, Sheet, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { errorCopy } from '@/lib/error-copy';
import { useDnaMutations } from '@/lib/use-dna';

const copy = you.model;
const f = twin.facts;
export type Pick = (input: UpdateModelInput) => void;

const STATUS = twin.twinPage.status;

// What the stage showed when she started waiting, kept until the wait is over: her read and her
// twin land in steps, and each would otherwise put another picture (a catalog model her new
// colouring picks, say) in front of her before her twin arrives. Native twin: useHeldWhile in
// mobile/src/features/you/twin.tsx.
export function useHeldWhile<T>(value: T, hold: boolean): T {
  const held = useRef(value);
  if (!hold) held.current = value;
  return hold ? held.current : value;
}
// The status line a redraw with no selfie starts on: "Drawing your model".
const DRAWING_FROM = 2;

// The stage's status (designs 06–07): a line at a time while her selfie reads and her twin draws,
// the last one holding until she lands. Null when nothing is happening. Native twin: useTwinStatus
// in mobile/src/features/you/twin.tsx.
export function useTwinStatus(reading: boolean, drawing: boolean): string | null {
  const busy = reading || drawing;
  const readingNow = useRef(reading);
  readingNow.current = reading;
  const [run, setRun] = useState<{ at: number; fromRead: boolean } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!busy) {
      setRun(null);
      return;
    }
    setRun({ at: Date.now(), fromRead: readingNow.current });
    setNow(Date.now());
    const tick = window.setInterval(() => setNow(Date.now()), TWIN_STATUS_STEP_MS / 4);
    return () => window.clearInterval(tick);
  }, [busy]);
  if (!busy) return null;
  const i = twinStatusIndex({
    count: STATUS.length,
    drawingFrom: DRAWING_FROM,
    startedReading: run ? run.fromRead : reading,
    reading,
    elapsedMs: run ? now - run.at : 0,
  });
  return STATUS[i] ?? null;
}

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
      className="flex flex-col gap-4 rounded-soft border border-hairline bg-surface-raised p-5"
    >
      <Eyebrow>{title}</Eyebrow>
      {children}
    </section>
  );
}

// Swatch colours are catalog data (like the style swatches), the one place colour comes inline.
// 28px dots, 7 apart, so all eight skin tones sit on one row; each keeps a 44px hit area.
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
  value: number | null;
  onPick: (i: number) => void;
}) {
  const name = value === null ? '' : names[value];
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="pb-3 font-sans text-sm text-ink-muted">
        {name ? `${label} · ${name}` : label}
      </legend>
      <div className="flex flex-nowrap gap-[7px]">
        {hexes.map((hex, i) => (
          <button
            key={hex}
            type="button"
            aria-label={names[i] ?? hex}
            aria-pressed={i === value}
            onClick={() => onPick(i)}
            className="relative size-7 flex-none rounded-full border border-hairline outline-offset-2 after:absolute after:-inset-x-[3.5px] after:-inset-y-2 after:content-[''] aria-pressed:outline aria-pressed:outline-[1.5px] aria-pressed:outline-ink focus-visible:outline-[1.5px] focus-visible:outline-focus-ring"
            style={{ backgroundColor: hex }}
          />
        ))}
      </div>
    </fieldset>
  );
}

export function SkinAndHair({ model, pick }: { model: Model; pick: Pick }) {
  const chosen = chosenTones(model);
  return (
    <>
      <SwatchRow
        label={copy.skin}
        hexes={model.swatches.skin}
        names={copy.skinNames}
        value={chosen.skin}
        onPick={(skin) => pick({ skin })}
      />
      <SwatchRow
        label={copy.hair}
        hexes={model.swatches.hair}
        names={copy.hairNames}
        value={chosen.hair}
        onPick={(hair) => pick({ hair })}
      />
    </>
  );
}

const tile =
  'relative h-[132px] w-[104px] shrink-0 overflow-hidden rounded-soft border bg-surface focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// The lineup (plan 2026-11-05 §1.4–1.5): her own model, once she has one, and the five Robes
// models, in a fixed order until she chooses; the one her looks stand on then leads, ringed
// (lineupOrder). Choosing a Robes model keeps her selfie and twin on file; choosing herself again
// hands the stand back. Native twin: features/you/twin.tsx.
export function Lineup({ model, pick, pending }: { model: Model; pick: Pick; pending: boolean }) {
  const onRobes = model.stand?.on === 'robes';
  const own = model.filed;
  const ownImage = model.twin.imageUrl ?? model.cell.imageUrl;
  const chosen = onRobes ? (model.preset ?? 1) : null;
  const check = (
    <span className="absolute bottom-1 left-1 flex size-[18px] items-center justify-center rounded-pill border-2 border-surface-raised bg-accent-plan text-surface-raised">
      <Icon name="check" size={9} />
    </span>
  );
  const portrait = (url: string | null, alt: string) =>
    url ? (
      // biome-ignore lint/performance/noImgElement: a catalog portrait or her own, fixed frame
      <img
        src={url}
        alt={alt}
        className="absolute inset-0 size-full object-cover object-[50%_10%]"
      />
    ) : (
      <span className="absolute inset-0 flex items-center justify-center text-ink-faint">
        <Icon name="user" size={16} />
      </span>
    );
  return (
    <fieldset
      aria-label={twin.twinPage.lineup}
      className="flex min-w-0 gap-1.5 overflow-x-auto [scrollbar-width:none]"
    >
      {lineupOrder({ own, chosen: chosen ?? 'own' }).map((slot) => {
        if (slot === 'own') {
          return (
            <button
              key="you"
              type="button"
              aria-pressed={!onRobes}
              aria-label={twin.twinPage.you}
              disabled={pending}
              onClick={() => (onRobes ? pick({ preset: null }) : undefined)}
              data-testid="lineup-you"
              className={`${tile} ${onRobes ? 'border-rule-mid' : 'border-ink border-[1.5px]'}`}
            >
              {portrait(ownImage, '')}
              {onRobes ? null : check}
            </button>
          );
        }
        const m = model.robesModels.find((r) => r.n === slot);
        if (!m) return null;
        const on = m.n === chosen;
        return (
          <button
            key={m.id}
            type="button"
            aria-pressed={on}
            aria-label={diary.dayOne.modelPick(m.n)}
            disabled={pending}
            onClick={() => (on ? undefined : pick({ preset: m.n }))}
            data-testid={`lineup-${m.n}`}
            className={`${tile} ${on ? 'border-ink border-[1.5px]' : 'border-rule-mid'}`}
          >
            {portrait(m.imageUrl, '')}
            {on ? check : null}
          </button>
        );
      })}
    </fieldset>
  );
}

// Her line, drawn from her facts. Two renderings off one geometry (legacy twFigSvg and
// twFigLineSvg): given her colouring it is the hero's underlay — her shape, in her skin and hair,
// under the photograph, so a pick reads at once while the next twin draws. Without it, Body shape's
// line drawing: a lifted figure on its own ground, with dashed guides at bust · waist · hips.
export function Figure({
  facts,
  adj,
  tone,
}: {
  facts: Facts;
  adj: TwinAdj;
  tone?: { skin: string; hair: string };
}) {
  const g = twinFigure(facts, adj);
  if (tone) {
    return (
      <svg
        viewBox="0 0 150 250"
        preserveAspectRatio="xMidYMax meet"
        aria-hidden
        className="absolute inset-0 size-full"
      >
        {/* Swatch colours are catalog data, the one place colour comes inline. */}
        <ellipse cx="75" cy={g.headY - 4} rx="12" ry={g.headRy + 3} fill={tone.hair} />
        <ellipse cx="75" cy={g.headY} rx={g.headRx} ry={g.headRy} fill={tone.skin} />
        <path d={g.d} className="fill-selected-line" />
      </svg>
    );
  }
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
      {/* Its own ground, so the figure reads lifted wherever it is placed. */}
      <rect x="0" y="0" width="150" height="250" rx="3" className="fill-surface-sunk" />
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
      <path d={g.d} className="fill-bg stroke-ink-muted" strokeWidth="0.9" strokeLinejoin="round" />
      <ellipse
        cx="75"
        cy={g.headY}
        rx={g.headRx}
        ry={g.headRy}
        className="fill-bg stroke-ink-muted"
        strokeWidth="0.9"
      />
    </svg>
  );
}

// What drew her, in the order the status line reads it (legacy renderModel + twAnyFact): only the
// facts that draw her line count, never her shoes or her age.
export type TwinRead = 'both' | 'closeUp' | 'facts' | 'hand' | 'none';

export function twinRead(model: Model, facts: Facts): TwinRead {
  const closeUp = !!model.closeUpUrl;
  const line = !!(
    facts.heightCm ||
    facts.sizeUk ||
    facts.bustBand ||
    facts.bustCm ||
    facts.waistCm ||
    facts.chestCm
  );
  if (closeUp && line) return 'both';
  if (closeUp) return 'closeUp';
  if (line) return 'facts';
  return model.filed || model.skinSet || model.hairSet ? 'hand' : 'none';
}

// A row's value in words, in the unit she reads it in; '' when she has not given it.
export function rowValue(row: FactRow): string {
  if (row.value === null) return '';
  if (typeof row.value === 'number') return f.value(row.field, row.unit, row.value);
  return f.bustValue(row.value.band, row.value.cup);
}

// "170 cm · UK 12 · 34C" (his: "180 cm · 40 in"): the facts that draw the line, in her units.
export function lineSummary(dna: StyleDna): string {
  const presence = measurePresenceOf(dna.gender);
  const draws: readonly MeasureField[] = ['height', 'size', 'bust', 'chest'];
  return factRows(dna.facts, dna.units, presence)
    .filter((r) => draws.includes(r.field))
    .map(rowValue)
    .filter(Boolean)
    .join(' · ');
}

// The wheel (design "Picker open · Bust"; Annie, 25 Nov: "it's expected to scroll"): every value
// on a list that scrolls and snaps, the one resting in the warm band in the middle being the pick,
// the rows fading as they leave it. Where it settles is saved; a tap scrolls a value into the band
// and saves it at once; ↑ and ↓ step through it. Native twin: Wheel in
// mobile/src/features/you/twin.tsx.
const ITEM = 44;
const SETTLE_MS = 140;
function Wheel({
  label,
  column,
  text,
  onPick,
}: {
  label: string;
  column: PickerColumn;
  text: (shown: number | string) => string;
  onPick: (patch: Partial<Facts>) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  // The row in the band while she scrolls; the pick is saved only once the wheel settles.
  const [at, setAt] = useState(column.selected);
  const count = column.items.length;
  const opened = useRef(column.selected);
  useEffect(() => {
    // Opens on her value; a change of unit draws a new wheel (its key).
    ref.current?.scrollTo({ top: opened.current * ITEM });
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);
  // The row last saved, so a tap's own scroll into the band never saves it twice.
  const kept = useRef<number | null>(column.saved ? column.selected : null);
  const pick = (i: number) => {
    const item = column.items[i];
    if (!item?.patch || i === kept.current) return;
    kept.current = i;
    onPick(item.patch);
  };
  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    setAt(settledIndex(el.scrollTop, ITEM, count));
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => pick(settledIndex(el.scrollTop, ITEM, count)),
      SETTLE_MS,
    );
  };
  const choose = (i: number) => {
    setAt(i);
    pick(i);
    ref.current?.scrollTo({ top: i * ITEM, behavior: 'smooth' });
  };
  return (
    <div className="relative min-w-0 flex-1" style={{ height: ITEM * (2 * WHEEL_SIDE + 1) }}>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 rounded-pill border border-selected-line bg-selected"
        style={{ top: ITEM * WHEEL_SIDE, height: ITEM }}
      />
      <div
        ref={ref}
        role="listbox"
        aria-label={label}
        tabIndex={0}
        onScroll={onScroll}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
          e.preventDefault();
          choose(Math.min(count - 1, Math.max(0, at + (e.key === 'ArrowDown' ? 1 : -1))));
        }}
        className="relative h-full snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-pill [scrollbar-width:none] focus-visible:outline-[1.5px] focus-visible:outline-focus-ring [&::-webkit-scrollbar]:hidden"
        style={{ paddingBlock: ITEM * WHEEL_SIDE }}
      >
        {column.items.map((item, i) => (
          <button
            key={String(item.shown)}
            type="button"
            role="option"
            aria-selected={i === at}
            tabIndex={-1}
            onClick={() => choose(i)}
            className="block w-full snap-center font-display text-2xl text-ink"
            style={{ height: ITEM, opacity: wheelOpacity(Math.abs(i - at)) }}
          >
            {text(item.shown)}
          </button>
        ))}
      </div>
    </div>
  );
}

// A row's unit toggle: its units as small caps, the one she reads underlined.
function UnitToggle({
  label,
  units,
  unit,
  onPick,
}: {
  label: string;
  units: readonly MeasureUnit[];
  unit: MeasureUnit;
  onPick: (unit: MeasureUnit) => void;
}) {
  return (
    <fieldset aria-label={f.unitsOf(label)} className="flex shrink-0">
      {units.map((u) => (
        <button
          key={u}
          type="button"
          aria-pressed={u === unit}
          onClick={() => onPick(u)}
          className="flex h-11 min-w-11 items-center justify-center px-1.5 font-sans text-[10px] uppercase tracking-[0.22em] focus-visible:outline-[1.5px] focus-visible:outline-focus-ring"
        >
          <span
            className={`border-b pt-1 pb-[3px] ${u === unit ? 'border-ink font-medium text-ink' : 'border-transparent text-ink-muted'}`}
          >
            {f.units[u]}
          </span>
        </button>
      ))}
    </fieldset>
  );
}

const labelOf = (field: MeasureField): string => f[field];

// The facts (design "The facts — redesign", 24 Nov): a row per measurement with its unit toggle;
// a tap opens its wheel in the same drawer. A unit changes only how a value reads, never what is
// saved. Every field is optional and none says so; Clear the facts asks first. Writes land in the
// cache at once, so the wheel steps under her finger. Native twin: FactsSheet in
// mobile/src/features/you/twin.tsx.
export function FactsSheet({
  open,
  onOpenChange,
  dna,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dna: StyleDna;
}) {
  const queryClient = useQueryClient();
  const { update } = useDnaMutations();
  const [field, setField] = useState<MeasureField | null>(null);
  const [asking, setAsking] = useState(false);
  const presence = measurePresenceOf(dna.gender);
  const rows = factRows(dna.facts, dna.units, presence);
  const row = field ? rows.find((r) => r.field === field) : undefined;
  const save = (facts: Partial<Facts>, units: UnitPrefs = {}) => {
    queryClient.setQueryData(queryKeys.call('me.dna.get'), (old: StyleDna | undefined) =>
      old ? { ...old, facts: { ...old.facts, ...facts }, units: { ...old.units, ...units } } : old,
    );
    update.mutate({
      input: {
        ...(Object.keys(facts).length ? { facts } : {}),
        ...(Object.keys(units).length ? { units } : {}),
      },
    });
  };
  const pickUnit = (r: FactRow) => (unit: MeasureUnit) => save({}, { [r.field]: unit });
  const any = rows.some((r) => r.value !== null);
  const close = (next: boolean) => {
    if (!next) setField(null);
    onOpenChange(next);
  };
  return (
    <>
      <Sheet
        open={open}
        onOpenChange={close}
        title={row ? labelOf(row.field) : f.title}
        footer={
          <div className="flex w-full flex-col items-center gap-2">
            {row || !any ? null : (
              <Button variant="quiet" onClick={() => setAsking(true)}>
                {f.clear}
              </Button>
            )}
            <Button
              className="w-full"
              onClick={() => (row ? setField(null) : close(false))}
              data-testid="facts-done"
            >
              {ui.done}
            </Button>
          </div>
        }
      >
        {row ? (
          <div className="flex flex-col gap-4">
            <div className="flex justify-end">
              <UnitToggle
                label={labelOf(row.field)}
                units={row.units}
                unit={row.unit}
                onPick={pickUnit(row)}
              />
            </div>
            <div className="flex gap-2.5">
              {pickerOf(row.field, row.unit, dna.facts, presence).map((col) => (
                <Wheel
                  key={`${col.key}-${row.unit}`}
                  label={col.key === 'value' ? labelOf(row.field) : f[col.key]}
                  column={col}
                  text={(v) =>
                    col.key === 'value' ? f.value(row.field, row.unit, Number(v)) : String(v)
                  }
                  onPick={(patch) => save(patch)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {rows.map((r) => {
              const value = rowValue(r);
              const label = labelOf(r.field);
              return (
                <div
                  key={r.field}
                  className={`flex items-center gap-1 border-hairline border-b ${presence === 'man' ? 'min-h-[72px]' : 'min-h-[84px]'}`}
                >
                  <button
                    type="button"
                    onClick={() => setField(r.field)}
                    aria-label={f.rowLabel(label, value)}
                    data-testid={`fact-${r.field}`}
                    className="flex min-h-[72px] min-w-0 flex-1 items-center gap-2.5 text-left focus-visible:outline-[1.5px] focus-visible:outline-focus-ring"
                  >
                    <span className="flex flex-col gap-2.5">
                      <span className="font-medium font-sans text-[10px] text-ink-muted uppercase leading-none tracking-[0.24em]">
                        {label}
                      </span>
                      <span
                        className={`font-display text-[26px] leading-none ${value ? 'text-ink' : 'font-light text-ink-muted italic'}`}
                      >
                        {value || f.add}
                      </span>
                    </span>
                    <Icon name="down" size={14} className="mt-5 text-ink-muted" />
                  </button>
                  <UnitToggle label={label} units={r.units} unit={r.unit} onPick={pickUnit(r)} />
                </div>
              );
            })}
          </div>
        )}
      </Sheet>
      <AlertDialog
        open={asking}
        title={f.clearAsk.title}
        message={f.clearAsk.body}
        onDismiss={() => setAsking(false)}
        actions={[
          {
            label: f.clearAsk.confirm,
            variant: 'danger',
            onClick: () => {
              setAsking(false);
              save(CLEARED_FACTS);
            },
          },
          { label: f.clearAsk.cancel, variant: 'outline', onClick: () => setAsking(false) },
        ]}
      />
    </>
  );
}
