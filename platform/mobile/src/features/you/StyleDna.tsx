import { useApi } from '@robes/api-client/react';
import type { BriefLine, BriefListName, StyleDna as Dna } from '@robes/contracts';
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
import { Icon } from '@robes/icons/native';
import {
  Button,
  CardSkeleton,
  EmptyState,
  fonts,
  IconButton,
  Image,
  MIN_TOUCH,
  Pill,
  Sheet,
  Tabs,
  Text,
  useColor,
} from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { renditionUri } from '@/lib/images';
import { BrandsStep, StylesStep } from '../onboarding/Steps';
import { useDnaMutations } from './dna';
import { ColoursBody, PrintsBody, paletteSummary, usePalette } from './Palette';
import { SettingsGroup, SettingsRow } from './Settings';
import { useModel, useModelPick } from './twin';

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

// A sheet's one-answer row (Gender, Age, Investment level): the answer in the serif with lining
// figures, its line beneath, an 18pt radio at the right; selected is the warm fill. Web twin:
// app/(app)/you/style/dna-view.tsx Option.
function Option({
  name,
  desc,
  on,
  onPress,
}: {
  name: string;
  desc: string;
  on: boolean;
  onPress: () => void;
}) {
  const ink = useColor('ink');
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={name}
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={{ minHeight: MIN_TOUCH }}
      className={`flex-row items-center justify-between gap-4 rounded-crisp border px-4 py-3 ${on ? 'border-selected-line bg-selected' : 'border-hairline'}`}
    >
      <View className="flex-1 gap-0.5">
        <Text
          style={{
            fontFamily: fonts.displayRegular,
            fontSize: 17,
            fontVariant: ['lining-nums'],
          }}
        >
          {name}
        </Text>
        {desc ? (
          <Text size="caption" tone="muted">
            {desc}
          </Text>
        ) : null}
      </View>
      <View
        className={`h-[18px] w-[18px] items-center justify-center rounded-full border ${on ? 'border-selected-line bg-surface-raised' : 'border-border-control'}`}
      >
        {on ? <Icon name="check" color={ink} size={12} /> : null}
      </View>
    </Pressable>
  );
}

// You › Style DNA (Style DNA redesign, 12 Nov): You, her taste, and the lines she dresses by. Icons
// are not asked for (MVP); her rules and hard nos are one row. Web twin:
// app/(app)/you/style/dna-view.tsx.
export function StyleDna() {
  const query = useApi('me.dna.get');
  const model = useModel();
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const colours = usePalette().palette;
  if (query.isPending) return <CardSkeleton className="mx-6" />;
  if (query.isError || !query.data) return <EmptyState title={errorMessage(query.error)} />;
  const dna = query.data;
  const presence = model.data?.presence;
  const age = ageBandLabel(dna.facts.ageBand);
  const loves = dna.brief.loves.length;
  const rules = dna.brief.rules.length + dna.brief.avoids.length;
  const level = INVESTMENT_LEVELS.find((l) => l.key === dna.investment);
  // First name and a count, never a list cut mid-word (Settings redline 27 Oct).
  const brands = copy.firstPlus(dna.brands);
  const coloursValue = paletteSummary(colours, 'colours');
  const printsValue = paletteSummary(colours, 'prints');
  // An empty answer reads "Not yet" in the faint italic (legacy .sp-row .v.none).
  const row = (label: string, value: string, empty: boolean, kind: SheetKind, first = false) => (
    <SettingsRow
      first={first}
      label={label}
      value={empty ? copy.notYet : value}
      empty={empty}
      onPress={() => setSheet(kind)}
    />
  );
  return (
    <ScrollView contentContainerClassName="gap-[26px] px-6 pt-6 pb-12">
      {/* Gender and age set who her looks are drawn on, Robes model or twin alike (Annie, 7 Nov):
          they live here, never behind Body shape, which a Robes model keeps closed. */}
      <SettingsGroup title={copy.you}>
        {presence ? row(f.gender, f.genderOptions[presence], false, 'gender', true) : null}
        {row(f.age, age, !age, 'age', !presence)}
      </SettingsGroup>
      <SettingsGroup title={copy.taste}>
        {row(copy.styleType, copy.firstPlus(dna.types), !dna.types.length, 'types', true)}
        {row(copy.brands, brands, !dna.brands.length, 'brands')}
        <SettingsRow
          label={copy.pieces}
          value={dna.pieces.length ? copy.piecesCount(dna.pieces.length) : copy.noneStarred}
          empty={!dna.pieces.length}
          onPress={() => setSheet('pieces')}
        />
        <SettingsRow
          label={copy.investment}
          value={level?.label ?? copy.pickOne}
          empty={!level}
          onPress={() => setSheet('investment')}
        />
        {row(palette.coloursTitle, coloursValue, coloursValue === copy.notYet, 'colours')}
        {row(palette.printsTitle, printsValue, printsValue === copy.notYet, 'prints')}
      </SettingsGroup>
      <SettingsGroup title={copy.words}>
        {row(copy.loves, copy.linesCount(loves), !loves, 'loves', true)}
        {row(copy.styleRules, copy.linesCount(rules), !rules, 'styleRules')}
      </SettingsGroup>
      <DnaSheet dna={dna} presence={presence} kind={sheet} onClose={() => setSheet(null)} />
    </ScrollView>
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
  dna: Dna;
  presence: Presence | undefined;
  kind: SheetKind | null;
  onClose: () => void;
}) {
  const [title, sub] = kind ? HEAD[kind] : ['', ''];
  return (
    <Sheet
      open={kind !== null}
      onClose={onClose}
      title={title}
      closeLabel={ui.done}
      testID="dna-sheet"
    >
      <ScrollView
        style={{ flexShrink: 1 }}
        contentContainerClassName="gap-4 pb-6"
        keyboardShouldPersistTaps="handled"
      >
        {sub ? <Text tone="muted">{sub}</Text> : null}
        {kind === 'gender' && presence ? <GenderBody presence={presence} /> : null}
        {kind === 'age' ? <AgeBody dna={dna} /> : null}
        {kind === 'types' ? <TypesBody dna={dna} presence={presence} /> : null}
        {kind === 'brands' ? <BrandsBody dna={dna} /> : null}
        {kind === 'pieces' ? <PiecesBody dna={dna} onClose={onClose} /> : null}
        {kind === 'investment' ? <InvestmentBody dna={dna} /> : null}
        {kind === 'colours' ? <ColoursBody /> : null}
        {kind === 'prints' ? <PrintsBody /> : null}
        {kind === 'loves' ? <LinesBody dna={dna} list="loves" /> : null}
        {kind === 'styleRules' ? <StyleRulesBody dna={dna} /> : null}
      </ScrollView>
    </Sheet>
  );
}

// Style type is onboarding's styles step: four photographs per archetype, a heart to keep it.
function TypesBody({ dna, presence }: { dna: Dna; presence: Presence | undefined }) {
  const { update } = useDnaMutations();
  const current = dna.types.filter((t): t is StyleType => STYLE_TYPES.includes(t as StyleType));
  const toggle = (name: StyleType) =>
    update.mutate({
      input: {
        types: current.includes(name) ? current.filter((t) => t !== name) : [...current, name],
      },
    });
  return <StylesStep identity={presence ?? null} value={current} onToggle={toggle} />;
}

// Brands is onboarding's wordmark wall under one search: her houses lead, a search reaches the
// whole pool, and a name not in it is added from the dashed tile (or return).
function BrandsBody({ dna }: { dna: Dna }) {
  const { update } = useDnaMutations();
  const ink = useColor('ink');
  const faint = useColor('ink-faint');
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
  return (
    <View className="gap-4">
      {/* A 44pt pill with its glyph; the placeholder names it, so no label above (redline). */}
      <View
        className="flex-row items-center gap-2.5 rounded-pill border border-hairline bg-surface-raised px-4"
        style={{ minHeight: MIN_TOUCH }}
      >
        <Icon name="search" color={faint} size={16} />
        <TextInput
          accessibilityLabel={twin.wall.searchBrands}
          placeholder={twin.wall.searchBrands}
          placeholderTextColor={faint}
          value={q}
          onChangeText={setQ}
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={() => (q.trim() && !has(q.trim()) ? toggle(q.trim()) : null)}
          className="flex-1 text-sm"
          style={{ fontFamily: fonts.sans, color: ink, minHeight: MIN_TOUCH }}
        />
      </View>
      <BrandsStep
        wall={wall}
        value={wall.filter(has)}
        onToggle={toggle}
        {...(query && !exact
          ? { add: { label: twin.wall.add(q.trim()), onPress: () => toggle(q.trim()) } }
          : {})}
      />
    </View>
  );
}

function PiecesBody({ dna, onClose }: { dna: Dna; onClose: () => void }) {
  const router = useRouter();
  return (
    <View className="gap-3">
      {dna.pieces.length ? (
        dna.pieces.map((p) => {
          const uri = renditionUri(p.image, 52);
          return (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={p.label}
              onPress={() => {
                onClose();
                router.push(`/piece/${p.id}`);
              }}
              style={{ minHeight: MIN_TOUCH }}
              className="flex-row items-center gap-4 py-1"
            >
              {/* Her photograph beside the lines, as the web (dna-view.tsx PiecesBody). */}
              <View style={{ width: 52 }}>
                {uri ? (
                  <Image
                    source={uri}
                    alt=""
                    aspect="4:5"
                    blurhash={p.image?.blurhash}
                    recyclingKey={p.id}
                    testID={`loved-photo-${p.id}`}
                  />
                ) : (
                  <View className="bg-surface-sunk" style={{ aspectRatio: 4 / 5 }} />
                )}
              </View>
              <View className="flex-1 gap-0.5">
                <Text size="caption" tone="muted">
                  {[p.category, p.brand].filter(Boolean).join(' · ')}
                </Text>
                <Text>{p.label}</Text>
              </View>
            </Pressable>
          );
        })
      ) : (
        <Text tone="muted">{twin.pieces.empty}</Text>
      )}
      <Button
        variant="quiet"
        className="self-start"
        onPress={() => {
          onClose();
          router.push('/wardrobe');
        }}
      >
        {twin.pieces.starMore}
      </Button>
    </View>
  );
}

// Her gender saves as a model pick: on a Robes model her looks move to that wearer's five.
// Web twin: app/(app)/you/style/dna-view.tsx GenderBody.
function GenderBody({ presence }: { presence: Presence }) {
  const { pick } = useModelPick();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={f.gender} className="gap-2">
      {GENDER_IDENTITIES.map((g) => (
        <Option
          key={g}
          name={f.genderOptions[g]}
          desc=""
          on={presence === g}
          onPress={() => pick({ presence: g })}
        />
      ))}
    </View>
  );
}

function AgeBody({ dna }: { dna: Dna }) {
  const { update } = useDnaMutations();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={f.age} className="gap-2">
      {AGE_BANDS.map((a) => (
        <Option
          key={a.key}
          name={a.label}
          desc=""
          on={dna.facts.ageBand === a.key}
          onPress={() => update.mutate({ input: { facts: { ageBand: a.key } } })}
        />
      ))}
    </View>
  );
}

function InvestmentBody({ dna }: { dna: Dna }) {
  const { update } = useDnaMutations();
  return (
    <View className="gap-2">
      {INVESTMENT_LEVELS.map((l) => (
        <Option
          key={l.key}
          name={l.label}
          desc={twin.investment.notes[l.key] ?? ''}
          on={dna.investment === l.key}
          onPress={() => update.mutate({ input: { investment: l.key } })}
        />
      ))}
    </View>
  );
}

// Her lines in one white card, each struck with ×, the last row a field that files on return, on +
// or on leaving it; the chips she hasn't filed sit beneath and file on a tap. Web twin:
// app/(app)/you/style/dna-view.tsx LinesBody.
function LinesBody({ dna, list }: { dna: Dna; list: BriefListName }) {
  const { addLine, removeLine } = useDnaMutations();
  const ink = useColor('ink');
  const faint = useColor('ink-faint');
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
    <View className="gap-6">
      <SettingsGroup>
        {rows.map((x) => (
          <View
            key={x.id}
            className="flex-row items-center gap-2 border-hairline border-b py-1.5 pr-2 pl-5"
          >
            <Text
              className="flex-1 py-3"
              style={{ fontFamily: fonts.displayRegular, fontSize: 17 }}
            >
              {x.text}
            </Text>
            <IconButton
              icon="close"
              tone="ink-muted"
              label={twin.words.strike(x.text)}
              onPress={() => removeLine.mutate({ params: { id: x.id } })}
            />
          </View>
        ))}
        <View className="min-h-14 flex-row items-center gap-2 py-1.5 pr-2 pl-5">
          <TextInput
            accessibilityLabel={placeholder}
            placeholder={placeholder}
            placeholderTextColor={faint}
            value={draft}
            maxLength={160}
            onChangeText={setDraft}
            returnKeyType="done"
            onSubmitEditing={add}
            onBlur={add}
            className="flex-1 text-sm"
            style={{ fontFamily: fonts.sans, color: ink, minHeight: MIN_TOUCH }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={twin.words.add}
            onPress={add}
            className="items-center justify-center"
            style={{ width: MIN_TOUCH, height: MIN_TOUCH }}
          >
            <View className="h-7 w-7 items-center justify-center rounded-full bg-surface-sunk">
              <Icon name="plus" color={ink} size={14} />
            </View>
          </Pressable>
        </View>
      </SettingsGroup>
      {chips.length ? (
        <View className="flex-row flex-wrap gap-2">
          {chips.map((c) => (
            <Pill
              key={c}
              label={twin.words.chip(c)}
              onPress={() => addLine.mutate({ input: { list, text: c, chip: c } })}
            >
              {`+ ${c}`}
            </Pill>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// Your style rules: her rules (Always) and her hard nos (Never) in one sheet, one tab each.
function StyleRulesBody({ dna }: { dna: Dna }) {
  const [list, setList] = useState<'rules' | 'avoids'>('rules');
  const current = list === 'rules' ? twin.words.always : twin.words.never;
  return (
    <View className="gap-6">
      <Tabs
        items={[twin.words.always, twin.words.never]}
        value={current}
        onChange={(item) => setList(item === twin.words.never ? 'avoids' : 'rules')}
      />
      <LinesBody key={list} dna={dna} list={list} />
    </View>
  );
}
