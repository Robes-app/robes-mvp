'use client';

import { useApi } from '@robes/api-client/react';
import type { BriefLine, BriefListName, StyleDna } from '@robes/contracts';
import { twin, ui, you } from '@robes/copy';
import { GENDER_IDENTITIES, type Presence } from '@robes/core/avatar';
import {
  AGE_BANDS,
  ageBandLabel,
  INVESTMENT_LEVELS,
  MUST_CHIPS,
  normName,
  onboardingBrands,
  STYLE_TYPES,
  type StyleType,
  wallPool,
} from '@robes/core/style-dna';
import { Icon } from '@robes/icons/web';
import { ErrorText, IconButton, Image, Pill, Sheet, Skeleton, Tabs, Text } from '@robes/ui';
import Link from 'next/link';
import { type KeyboardEvent, useState } from 'react';
import { BrandsStep, StylesStep } from '@/app/onboarding/steps';
import { SettingsGroup, SettingsRow } from '@/components/settings/settings-chrome';
import { errorCopy } from '@/lib/error-copy';
import { imageSources } from '@/lib/image';
import { useDnaMutations } from '@/lib/use-dna';
import { useModel, useModelPick } from '../model/twin-parts';
import { ColoursBody, PrintsBody, paletteSummary, usePalette } from './palette-sheets';

const copy = twin.dnaPage;
const f = twin.facts;
type SheetKind =
  | 'gender'
  | 'age'
  | 'types'
  | 'brands'
  | 'pieces'
  | 'investment'
  | 'colours'
  | 'prints'
  | 'loves'
  | 'styleRules';
const palette = you.style.palette;
// A search shows this many houses at most.
const MATCHES_N = 24;

// You › Style DNA (Style DNA redesign, 12 Nov): You, her taste, and the lines she dresses by. Icons
// are not asked for (MVP); her rules and hard nos are one row. Native twin:
// mobile/src/features/you/StyleDna.tsx.
export function DnaView() {
  const query = useApi('me.dna.get');
  const model = useModel();
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const colours = usePalette().palette;
  if (query.isError) {
    return <ErrorText>{errorCopy(query.error)}</ErrorText>;
  }
  const dna = query.data;
  if (!dna) return <Skeleton className="h-96" />;
  const presence = model.data?.presence;
  const age = ageBandLabel(dna.facts.ageBand);
  const loves = dna.brief.loves.length;
  const rules = dna.brief.rules.length + dna.brief.avoids.length;
  const level = INVESTMENT_LEVELS.find((l) => l.key === dna.investment);
  // First name and a count, never a list cut mid-word (Settings redline 27 Oct).
  const types = copy.firstPlus(dna.types);
  const brands = copy.firstPlus(dna.brands);
  const coloursValue = paletteSummary(colours, 'colours');
  const printsValue = paletteSummary(colours, 'prints');
  // An empty answer reads "Not yet" in the faint italic (legacy .sp-row .v.none).
  const row = (label: string, value: string, empty: boolean, kind: SheetKind) => (
    <SettingsRow
      label={label}
      value={empty ? copy.notYet : value}
      empty={empty}
      onClick={() => setSheet(kind)}
    />
  );
  return (
    <div className="flex flex-col gap-[26px]">
      {/* Gender and age set who her looks are drawn on, Robes model or twin alike (Annie, 7 Nov):
          they live here, never behind Body shape, which a Robes model keeps closed. */}
      <SettingsGroup id="dna-you" title={copy.you}>
        {presence ? row(f.gender, f.genderOptions[presence], false, 'gender') : null}
        {row(f.age, age, !age, 'age')}
      </SettingsGroup>
      <SettingsGroup id="dna-taste" title={copy.taste}>
        {row(copy.styleType, types, !dna.types.length, 'types')}
        {row(copy.brands, brands, !dna.brands.length, 'brands')}
        <SettingsRow
          label={copy.pieces}
          value={dna.pieces.length ? copy.piecesCount(dna.pieces.length) : copy.noneStarred}
          empty={!dna.pieces.length}
          onClick={() => setSheet('pieces')}
        />
        <SettingsRow
          label={copy.investment}
          value={level?.label ?? copy.pickOne}
          empty={!level}
          onClick={() => setSheet('investment')}
        />
        {row(palette.coloursTitle, coloursValue, coloursValue === copy.notYet, 'colours')}
        {row(palette.printsTitle, printsValue, printsValue === copy.notYet, 'prints')}
      </SettingsGroup>
      <SettingsGroup id="dna-words" title={copy.words}>
        {row(copy.loves, copy.linesCount(loves), !loves, 'loves')}
        {row(copy.styleRules, copy.linesCount(rules), !rules, 'styleRules')}
      </SettingsGroup>
      <DnaSheet dna={dna} presence={presence} kind={sheet} onClose={() => setSheet(null)} />
    </div>
  );
}

const HEAD: Record<SheetKind, [string, string]> = {
  gender: [f.gender, ''],
  age: [f.age, ''],
  types: [twin.types.title, ''],
  brands: [twin.wall.brandsTitle, ''],
  pieces: [twin.pieces.title, ''],
  investment: [twin.investment.title, twin.investment.sub],
  colours: [palette.coloursTitle, ''],
  prints: [palette.printsTitle, ''],
  loves: [twin.words.loves.title, ''],
  styleRules: [copy.styleRules, ''],
};

function DnaSheet({
  dna,
  presence,
  kind,
  onClose,
}: {
  dna: StyleDna;
  presence: Presence | undefined;
  kind: SheetKind | null;
  onClose: () => void;
}) {
  const [title, sub] = kind ? HEAD[kind] : ['', ''];
  return (
    <Sheet
      open={kind !== null}
      onOpenChange={(open) => (open ? null : onClose())}
      title={title}
      description={sub}
      closeLabel={ui.done}
    >
      {kind === 'gender' && presence ? <GenderBody presence={presence} /> : null}
      {kind === 'age' ? <AgeBody dna={dna} /> : null}
      {kind === 'types' ? <TypesBody dna={dna} presence={presence} /> : null}
      {kind === 'brands' ? <BrandsBody dna={dna} /> : null}
      {kind === 'pieces' ? <PiecesBody dna={dna} /> : null}
      {kind === 'investment' ? <InvestmentBody dna={dna} /> : null}
      {kind === 'colours' ? <ColoursBody /> : null}
      {kind === 'prints' ? <PrintsBody /> : null}
      {kind === 'loves' ? <LinesBody dna={dna} list="loves" /> : null}
      {kind === 'styleRules' ? <StyleRulesBody dna={dna} /> : null}
    </Sheet>
  );
}

// A sheet's one-answer row (Gender, Age, Investment level): the answer in the serif with lining
// figures so amounts align, its line beneath, an 18px radio at the right; selected is the warm fill.
// Native twin: mobile/src/features/you/StyleDna.tsx Option.
function Option({
  name,
  desc,
  on,
  onClick,
}: {
  name: string;
  desc: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      {...{ role: 'radio' as const, 'aria-checked': on }}
      onClick={onClick}
      className={`flex min-h-14 w-full items-center justify-between gap-4 rounded-crisp border px-4 py-3 text-left focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${on ? 'border-selected-line bg-selected' : 'border-hairline hover:border-ink'}`}
    >
      <span className="flex flex-col gap-0.5">
        <span className="font-display text-[17px] text-ink [font-variant-numeric:lining-nums]">
          {name}
        </span>
        {desc ? <span className="font-sans text-[11px] text-ink-muted">{desc}</span> : null}
      </span>
      <span
        aria-hidden
        className={`flex size-[18px] shrink-0 items-center justify-center rounded-full border ${on ? 'border-selected-line bg-surface-raised text-ink' : 'border-border-control'}`}
      >
        {on ? <Icon name="check" size={12} /> : null}
      </span>
    </button>
  );
}

// Style type is onboarding's styles step: four photographs per archetype, a heart to keep it.
function TypesBody({ dna, presence }: { dna: StyleDna; presence: Presence | undefined }) {
  const { update } = useDnaMutations();
  const current = dna.types.filter((t): t is StyleType => STYLE_TYPES.includes(t as StyleType));
  const toggle = (name: StyleType) => {
    const types = current.includes(name) ? current.filter((t) => t !== name) : [...current, name];
    update.mutate({ input: { types } });
  };
  return <StylesStep identity={presence ?? null} value={current} onToggle={toggle} />;
}

// Brands is onboarding's wordmark wall under one search: her houses lead, a search reaches the
// whole pool, and a name not in it is added from the dashed tile (or Enter).
function BrandsBody({ dna }: { dna: StyleDna }) {
  const { update } = useDnaMutations();
  const [q, setQ] = useState('');
  const mine = dna.brands;
  const same = (a: string, b: string) => normName(a) === normName(b);
  const has = (n: string) => mine.some((x) => same(x, n));
  const toggle = (name: string) => {
    update.mutate({
      input: { brands: has(name) ? mine.filter((x) => !same(x, name)) : [...mine, name] },
    });
    setQ('');
  };
  const query = normName(q);
  const pool = wallPool('brands', dna.types, dna.gender);
  const seeded = onboardingBrands(dna.types, dna.gender);
  const unique = (names: readonly string[]) =>
    names.filter((n, i) => names.findIndex((x) => same(x, n)) === i);
  const wall = query
    ? unique([...mine, ...pool])
        .filter((n) => normName(n).includes(query))
        .slice(0, MATCHES_N)
    : unique([...mine.filter((b) => !seeded.some((s) => same(s, b))), ...seeded]);
  const exact = query && (pool.some((n) => normName(n) === query) || has(q));
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (q.trim() && !has(q.trim())) toggle(q.trim());
  };
  return (
    <div className="flex flex-col gap-4">
      {/* A 44px pill with its glyph; the placeholder names it, so no label above (redline). */}
      <label className="flex min-h-11 items-center gap-2.5 rounded-pill border border-hairline bg-surface-raised px-4 focus-within:border-ink">
        <Icon name="search" size={16} className="shrink-0 text-ink-faint" />
        <input
          type="search"
          aria-label={twin.wall.searchBrands}
          placeholder={twin.wall.searchBrands}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent font-sans text-ink text-sm outline-none placeholder:text-ink-faint"
        />
      </label>
      <BrandsStep
        wall={wall}
        value={wall.filter(has)}
        onToggle={toggle}
        {...(query && !exact
          ? { add: { label: twin.wall.add(q.trim()), onClick: () => toggle(q.trim()) } }
          : {})}
      />
    </div>
  );
}

function PiecesBody({ dna }: { dna: StyleDna }) {
  return (
    <div className="flex flex-col gap-4">
      {dna.pieces.length ? (
        <ul className="flex flex-col gap-3">
          {dna.pieces.map((p) => {
            const sources = p.image ? imageSources(p.image.renditions) : null;
            return (
              <li key={p.id}>
                <Link
                  href={`/piece/${p.id}`}
                  className="flex items-center gap-4 rounded-crisp focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                >
                  <span className="w-13 shrink-0">
                    {sources ? (
                      <Image
                        src={sources.src}
                        srcSet={sources.srcSet}
                        sizes="52px"
                        alt=""
                        aspect="4:5"
                        blurhash={p.image?.blurhash ?? null}
                      />
                    ) : (
                      <span aria-hidden className="block aspect-[4/5] bg-surface-sunk" />
                    )}
                  </span>
                  <span className="flex flex-col">
                    <span className="font-sans text-xs text-ink-muted">
                      {[p.category, p.brand].filter(Boolean).join(' · ')}
                    </span>
                    <span className="font-sans text-base text-ink">{p.label}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <Text tone="muted">{twin.pieces.empty}</Text>
      )}
      <Link
        href="/wardrobe"
        className="self-start font-sans text-sm text-ink underline underline-offset-4"
      >
        {twin.pieces.starMore}
      </Link>
    </div>
  );
}

// Her gender saves as a model pick: on a Robes model her looks move to that wearer's five.
// Native twin: mobile/src/features/you/StyleDna.tsx GenderBody.
function GenderBody({ presence }: { presence: Presence }) {
  const { pick } = useModelPick();
  return (
    <div role="radiogroup" aria-label={f.gender} className="flex flex-col gap-2">
      {GENDER_IDENTITIES.map((g) => (
        <Option
          key={g}
          name={f.genderOptions[g]}
          desc=""
          on={presence === g}
          onClick={() => pick({ presence: g })}
        />
      ))}
    </div>
  );
}

function AgeBody({ dna }: { dna: StyleDna }) {
  const { update } = useDnaMutations();
  return (
    <div role="radiogroup" aria-label={f.age} className="flex flex-col gap-2">
      {AGE_BANDS.map((a) => (
        <Option
          key={a.key}
          name={a.label}
          desc=""
          on={dna.facts.ageBand === a.key}
          onClick={() => update.mutate({ input: { facts: { ageBand: a.key } } })}
        />
      ))}
    </div>
  );
}

function InvestmentBody({ dna }: { dna: StyleDna }) {
  const { update } = useDnaMutations();
  return (
    <div role="radiogroup" aria-label={twin.investment.title} className="flex flex-col gap-2">
      {INVESTMENT_LEVELS.map((l) => (
        <Option
          key={l.key}
          name={l.label}
          desc={twin.investment.notes[l.key] ?? ''}
          on={dna.investment === l.key}
          onClick={() => update.mutate({ input: { investment: l.key } })}
        />
      ))}
    </div>
  );
}

// Her lines in one white card, each struck with ×, the last row a field that files on Enter, on +
// or on leaving it; the chips she hasn't filed sit beneath and file on a tap. Native twin:
// mobile/src/features/you/StyleDna.tsx LinesBody.
function LinesBody({ dna, list }: { dna: StyleDna; list: BriefListName }) {
  const { addLine, removeLine } = useDnaMutations();
  const [draft, setDraft] = useState('');
  const rows: BriefLine[] = dna.brief[list];
  const filed = (t: string) => rows.some((x) => x.text.toLowerCase() === t.toLowerCase());
  const chips = list === 'loves' ? [] : MUST_CHIPS[list].filter((c) => !filed(c));
  const placeholder = rows.length ? twin.words[list].another : twin.words.first;
  const add = () => {
    const text = draft.trim();
    if (!text) return;
    addLine.mutate({ input: { list, text } });
    setDraft('');
  };
  return (
    <div className="flex flex-col gap-6">
      <SettingsGroup>
        {rows.length ? (
          <ul>
            {rows.map((x) => (
              <li
                key={x.id}
                className="flex items-center gap-2 border-hairline border-b py-1.5 pr-2 pl-5"
              >
                <span className="min-w-0 flex-1 py-3 font-display text-[17px] text-ink leading-snug">
                  {x.text}
                </span>
                <IconButton
                  icon="close"
                  label={twin.words.strike(x.text)}
                  onClick={() => removeLine.mutate({ params: { id: x.id } })}
                />
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex min-h-14 items-center gap-2 py-1.5 pr-2 pl-5">
          <input
            type="text"
            aria-label={placeholder}
            placeholder={placeholder}
            value={draft}
            maxLength={160}
            autoComplete="off"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={add}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            className="min-w-0 flex-1 bg-transparent font-sans text-ink text-sm outline-none placeholder:text-ink-faint"
          />
          <button
            type="button"
            aria-label={twin.words.add}
            onClick={add}
            className="flex size-11 shrink-0 items-center justify-center rounded-pill text-ink focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-surface-sunk">
              <Icon name="plus" size={14} />
            </span>
          </button>
        </div>
      </SettingsGroup>
      {chips.length ? (
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <Pill
              key={c}
              aria-label={twin.words.chip(c)}
              onClick={() => addLine.mutate({ input: { list, text: c, chip: c } })}
            >
              <Icon name="plus" size={12} className="text-ink-faint" />
              {c}
            </Pill>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// Your style rules: her rules (Always) and her hard nos (Never) in one sheet, one tab each.
function StyleRulesBody({ dna }: { dna: StyleDna }) {
  const [list, setList] = useState<'rules' | 'avoids'>('rules');
  const current = list === 'rules' ? twin.words.always : twin.words.never;
  return (
    <div className="flex flex-col gap-6">
      <Tabs
        label={copy.styleRules}
        items={[twin.words.always, twin.words.never]}
        value={current}
        onChange={(item) => setList(item === twin.words.never ? 'avoids' : 'rules')}
      />
      <div role="tabpanel" aria-label={current}>
        <LinesBody key={list} dna={dna} list={list} />
      </div>
    </div>
  );
}
