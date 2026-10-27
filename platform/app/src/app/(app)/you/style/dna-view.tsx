'use client';

import { useApi } from '@robes/api-client/react';
import type { BriefLine, BriefListName, StyleDna } from '@robes/contracts';
import { twin, you } from '@robes/copy';
import { asSentence } from '@robes/core';
import {
  INVESTMENT_LEVELS,
  iconTag,
  MUST_CHIPS,
  normName,
  STYLE_TYPES,
  type WallKind,
  wallPool,
  wallRanked,
} from '@robes/core/style-dna';
import { Icon } from '@robes/icons/web';
import {
  ErrorText,
  Eyebrow,
  Field,
  Heading,
  IconButton,
  Image,
  Pill,
  Sheet,
  Skeleton,
  Text,
} from '@robes/ui';
import Link from 'next/link';
import { type KeyboardEvent, useState } from 'react';
import { SettingsGroup, SettingsRow } from '@/components/settings/settings-chrome';
import { errorCopy } from '@/lib/error-copy';
import { imageSources } from '@/lib/image';
import { useDnaMutations } from '@/lib/use-dna';
import { ColoursBody, PrintsBody, paletteSummary, usePalette } from './palette-sheets';

const copy = twin.dnaPage;
type SheetKind =
  | 'types'
  | 'brands'
  | 'icons'
  | 'pieces'
  | 'investment'
  | 'colours'
  | 'prints'
  | BriefListName;
const palette = you.style.palette;
const WALL_N = 18;

export function DnaView() {
  const query = useApi('me.dna.get');
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const colours = usePalette().palette;
  if (query.isError) {
    return <ErrorText>{errorCopy(query.error)}</ErrorText>;
  }
  const dna = query.data;
  if (!dna) return <Skeleton className="h-96" />;
  const n = (k: BriefListName) => dna.brief[k].length;
  const icons = dna.icons.map((i) => i.name);
  const level = INVESTMENT_LEVELS.find((l) => l.key === dna.investment);
  const types = dna.types.join(', ');
  const brands =
    dna.brands.length <= 3 ? dna.brands.join(', ') : copy.brandsCount(dna.brands.length);
  const iconsValue = icons.length <= 2 ? icons.join(', ') : copy.iconsCount(icons.length);
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
      <SettingsGroup id="dna-taste" title={copy.taste}>
        {row(copy.styleType, types, !dna.types.length, 'types')}
        {row(copy.brands, brands, !dna.brands.length, 'brands')}
        {row(copy.icons, iconsValue, !icons.length, 'icons')}
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
        {row(copy.loves, copy.linesCount(n('loves')), !n('loves'), 'loves')}
        {row(copy.avoids, copy.linesCount(n('avoids')), !n('avoids'), 'avoids')}
        {row(copy.rules, copy.linesCount(n('rules')), !n('rules'), 'rules')}
      </SettingsGroup>
      <DnaSheet dna={dna} kind={sheet} onClose={() => setSheet(null)} />
    </div>
  );
}

function DnaSheet({
  dna,
  kind,
  onClose,
}: {
  dna: StyleDna;
  kind: SheetKind | null;
  onClose: () => void;
}) {
  const head: Record<SheetKind, [string, string]> = {
    types: [twin.types.title, twin.types.sub],
    brands: [twin.wall.brandsTitle, twin.wall.brandsSub],
    icons: [twin.wall.iconsTitle, twin.wall.iconsSub],
    pieces: [twin.pieces.title, twin.pieces.sub],
    investment: [twin.investment.title, twin.investment.sub],
    colours: [palette.coloursTitle, ''],
    prints: [palette.printsTitle, ''],
    loves: [twin.words.loves.title, twin.words.loves.sub],
    avoids: [twin.words.avoids.title, twin.words.avoids.sub],
    rules: [twin.words.rules.title, twin.words.rules.sub],
  };
  const [title, sub] = kind ? head[kind] : ['', ''];
  return (
    <Sheet
      open={kind !== null}
      onOpenChange={(open) => (open ? null : onClose())}
      title={title}
      description={sub}
    >
      {kind === 'types' ? <TypesBody dna={dna} /> : null}
      {kind === 'brands' || kind === 'icons' ? <WallBody dna={dna} kind={kind} /> : null}
      {kind === 'pieces' ? <PiecesBody dna={dna} /> : null}
      {kind === 'investment' ? <InvestmentBody dna={dna} /> : null}
      {kind === 'colours' ? <ColoursBody /> : null}
      {kind === 'prints' ? <PrintsBody /> : null}
      {kind === 'loves' || kind === 'avoids' || kind === 'rules' ? (
        <WordsBody dna={dna} list={kind} />
      ) : null}
    </Sheet>
  );
}

function Option({
  name,
  desc,
  on,
  onClick,
  disabled,
}: {
  name: string;
  desc: string;
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-14 w-full items-center justify-between gap-4 rounded-crisp border px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${on ? 'border-selected-line bg-surface-raised' : 'border-hairline hover:border-ink'}`}
    >
      <span className="flex flex-col gap-0.5">
        <span className="font-sans text-base text-ink">{name}</span>
        <span className="font-sans text-sm text-ink-muted">{desc}</span>
      </span>
      {on ? <Icon name="check" size={16} /> : null}
    </button>
  );
}

function TypesBody({ dna }: { dna: StyleDna }) {
  const { update } = useDnaMutations();
  type StyleType = (typeof STYLE_TYPES)[number];
  const current = dna.types.filter((t): t is StyleType => STYLE_TYPES.includes(t as StyleType));
  const toggle = (name: StyleType) => {
    const types = current.includes(name) ? current.filter((t) => t !== name) : [...current, name];
    update.mutate({ input: { types } });
  };
  return (
    <div className="flex flex-col gap-2">
      {STYLE_TYPES.map((name) => (
        <Option
          key={name}
          name={name}
          desc={twin.types.desc[name] ?? ''}
          on={dna.types.includes(name)}
          onClick={() => toggle(name)}
        />
      ))}
    </div>
  );
}

function WallBody({ dna, kind }: { dna: StyleDna; kind: WallKind }) {
  const { update } = useDnaMutations();
  const [q, setQ] = useState('');
  const brands = kind === 'brands';
  const mine = brands ? dna.brands : dna.icons.map((i) => i.name);
  const has = (n: string) => mine.some((x) => normName(x) === normName(n));
  const toggle = (name: string) => {
    const next = has(name) ? mine.filter((x) => normName(x) !== normName(name)) : [...mine, name];
    update.mutate({ input: brands ? { brands: next } : { icons: next } });
    setQ('');
  };
  const query = normName(q);
  const pool = wallRanked(kind, dna.types, mine);
  const matches = query
    ? pool.filter((n) => normName(n).includes(query)).slice(0, 12)
    : pool.slice(0, WALL_N);
  const exact = query && (wallPool(kind, dna.types).some((n) => normName(n) === query) || has(q));
  const tag = (n: string) => (brands ? '' : iconTag(n));
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (q.trim() && !has(q.trim())) toggle(q.trim());
  };
  return (
    <div className="flex flex-col gap-5">
      <Field
        label={brands ? twin.wall.searchBrands : twin.wall.searchIcons}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKey}
        autoComplete="off"
      />
      {mine.length ? (
        <div className="flex flex-col gap-2">
          <Eyebrow>
            {twin.wall.selections} · {twin.wall.keptCount(mine.length)}
          </Eyebrow>
          <div className="flex flex-wrap gap-2">
            {mine.map((n) => (
              <Pill key={n} selected aria-label={twin.wall.remove(n)} onClick={() => toggle(n)}>
                {n}
                {tag(n) ? <span className="text-ink-muted">· {tag(n)}</span> : null}
              </Pill>
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <Eyebrow>
          {query ? twin.wall.matches : brands ? twin.wall.popular : twin.wall.often}
        </Eyebrow>
        {matches.length ? (
          <div className="flex flex-wrap gap-2">
            {matches.map((n) => (
              <Pill key={n} onClick={() => toggle(n)}>
                {n}
                {tag(n) ? <span className="text-ink-muted">· {tag(n)}</span> : null}
              </Pill>
            ))}
          </div>
        ) : (
          <Text size="small" tone="muted">
            {query ? twin.wall.noMatch : twin.wall.allYours}
          </Text>
        )}
        {query && !exact ? (
          <div>
            <Pill onClick={() => toggle(q.trim())}>{twin.wall.add(q.trim())}</Pill>
          </div>
        ) : null}
      </div>
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
                  className="flex items-center gap-4 rounded-crisp focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
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

function InvestmentBody({ dna }: { dna: StyleDna }) {
  const { update } = useDnaMutations();
  return (
    <div className="flex flex-col gap-2">
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

function WordsBody({ dna, list }: { dna: StyleDna; list: BriefListName }) {
  const { addLine, removeLine, keep } = useDnaMutations();
  const [draft, setDraft] = useState('');
  const words = twin.words[list];
  const rows: BriefLine[] = dna.brief[list];
  const chips: readonly string[] = list === 'loves' ? [] : MUST_CHIPS[list];
  const lineFor = (t: string) => rows.find((x) => x.text.toLowerCase() === t.toLowerCase());
  const suggests = list === 'avoids' ? dna.observations.filter((o) => o.list === 'avoids') : [];
  const add = () => {
    const text = draft.trim();
    if (!text) return;
    addLine.mutate({ input: { list, text } });
    setDraft('');
  };
  return (
    <div className="flex flex-col gap-5">
      {chips.length ? (
        <div className="flex flex-col gap-2">
          <Eyebrow>
            {list === 'rules' ? twin.words.always : twin.words.never}{' '}
            <span className="normal-case text-ink-faint">
              {list === 'rules' ? twin.words.alwaysHint : twin.words.neverHint}
            </span>
          </Eyebrow>
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => {
              const line = lineFor(c);
              return (
                <Pill
                  key={c}
                  selected={Boolean(line)}
                  onClick={() =>
                    line
                      ? removeLine.mutate({ params: { id: line.id } })
                      : addLine.mutate({ input: { list, text: c, chip: c } })
                  }
                >
                  {c}
                </Pill>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        {list !== 'loves' ? (
          <Heading level={3} size="sm">
            {list === 'avoids' ? twin.words.avoids.yours : twin.words.rules.yours}
          </Heading>
        ) : null}
        {rows.length ? (
          <ul className="flex flex-col">
            {rows.map((x) => (
              <li
                key={x.id}
                className="flex items-center justify-between gap-3 border-b border-hairline py-2"
              >
                <span className={x.source === 'typed' ? 'text-ink-muted' : 'text-ink'}>
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
        ) : (
          <Text size="small" tone="muted">
            {words.empty}
          </Text>
        )}
        {/* Files on Enter and on leaving the field: on a phone she taps away, not return. */}
        <Field
          label={rows.length ? words.another : twin.words.first}
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
        />
      </div>
      {suggests.length ? (
        <div className="flex flex-col gap-2">
          <Eyebrow>
            {twin.words.suggests}{' '}
            <span className="normal-case text-ink-faint">{twin.words.suggestsHint}</span>
          </Eyebrow>
          <ul className="flex flex-col">
            {suggests.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                <span className="flex flex-col">
                  <span>{p.text}</span>
                  {p.because ? (
                    <span className="font-display text-lg text-ink-muted italic">
                      {asSentence(p.because)}
                    </span>
                  ) : null}
                </span>
                <Pill onClick={() => keep.mutate({ params: { id: p.id } })}>{twin.words.keep}</Pill>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {rows.length ? (
        <Text size="small" tone="muted">
          {twin.words.filed}
        </Text>
      ) : null}
    </div>
  );
}
