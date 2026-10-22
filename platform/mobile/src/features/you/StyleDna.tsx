import { useApi } from '@robes/api-client/react';
import type { BriefLine, BriefListName, StyleDna as Dna } from '@robes/contracts';
import { twin } from '@robes/copy';
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
import { Icon } from '@robes/icons/native';
import {
  Button,
  CardSkeleton,
  EmptyState,
  Eyebrow,
  Field,
  IconButton,
  MIN_TOUCH,
  Pill,
  Sheet,
  Text,
  useColor,
} from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { useDnaMutations } from './dna';

const copy = twin.dnaPage;
type SheetKind = 'types' | 'brands' | 'icons' | 'pieces' | 'investment' | BriefListName;
const WALL_N = 18;

function ValueRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  const muted = useColor('ink-muted');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      onPress={onPress}
      style={{ minHeight: MIN_TOUCH }}
      className="flex-row items-center justify-between gap-4 border-b border-hairline py-4"
    >
      <Text>{label}</Text>
      <View className="flex-shrink flex-row items-center gap-2">
        <Text size="small" tone="muted" numberOfLines={1}>
          {value}
        </Text>
        <Icon name="forward" color={muted} size={18} />
      </View>
    </Pressable>
  );
}

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
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={{ minHeight: MIN_TOUCH }}
      className={`flex-row items-center justify-between gap-4 rounded-crisp border px-4 py-3 ${on ? 'border-ink bg-surface' : 'border-hairline'}`}
    >
      <View className="flex-1 gap-0.5">
        <Text>{name}</Text>
        <Text size="small" tone="muted">
          {desc}
        </Text>
      </View>
      {on ? <Icon name="check" color={ink} size={18} /> : null}
    </Pressable>
  );
}

// You › Style DNA (legacy Settings 02): her taste and the lines she dresses by.
export function StyleDna() {
  const query = useApi('me.dna.get');
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  if (query.isPending) return <CardSkeleton className="mx-6" />;
  if (query.isError || !query.data) return <EmptyState title={errorMessage(query.error)} />;
  const dna = query.data;
  const icons = dna.icons.map((i) => i.name);
  const n = (k: BriefListName) => dna.brief[k].length;
  const level = INVESTMENT_LEVELS.find((l) => l.key === dna.investment);
  return (
    <ScrollView contentContainerClassName="gap-6 px-6 pb-12">
      <Text tone="muted">{copy.sub}</Text>
      <View className="gap-1">
        <Eyebrow>{copy.taste}</Eyebrow>
        <ValueRow
          label={copy.styleType}
          value={dna.types.length ? dna.types.join(', ') : copy.notYet}
          onPress={() => setSheet('types')}
        />
        <ValueRow
          label={copy.brands}
          value={
            !dna.brands.length
              ? copy.notYet
              : dna.brands.length <= 3
                ? dna.brands.join(', ')
                : copy.brandsCount(dna.brands.length)
          }
          onPress={() => setSheet('brands')}
        />
        <ValueRow
          label={copy.icons}
          value={
            !icons.length
              ? copy.notYet
              : icons.length <= 2
                ? icons.join(', ')
                : copy.iconsCount(icons.length)
          }
          onPress={() => setSheet('icons')}
        />
        <ValueRow
          label={copy.pieces}
          value={dna.pieces.length ? copy.piecesCount(dna.pieces.length) : copy.noneStarred}
          onPress={() => setSheet('pieces')}
        />
        <ValueRow
          label={copy.investment}
          value={level?.label ?? copy.pickOne}
          onPress={() => setSheet('investment')}
        />
      </View>
      <View className="gap-1">
        <Eyebrow>{copy.words}</Eyebrow>
        <ValueRow
          label={copy.loves}
          value={copy.linesCount(n('loves'))}
          onPress={() => setSheet('loves')}
        />
        <ValueRow
          label={copy.avoids}
          value={copy.linesCount(n('avoids'))}
          onPress={() => setSheet('avoids')}
        />
        <ValueRow
          label={copy.rules}
          value={copy.linesCount(n('rules'))}
          onPress={() => setSheet('rules')}
        />
      </View>
      <DnaSheet dna={dna} kind={sheet} onClose={() => setSheet(null)} />
    </ScrollView>
  );
}

const HEAD: Record<SheetKind, [string, string]> = {
  types: [twin.types.title, twin.types.sub],
  brands: [twin.wall.brandsTitle, twin.wall.brandsSub],
  icons: [twin.wall.iconsTitle, twin.wall.iconsSub],
  pieces: [twin.pieces.title, twin.pieces.sub],
  investment: [twin.investment.title, twin.investment.sub],
  loves: [twin.words.loves.title, twin.words.loves.sub],
  avoids: [twin.words.avoids.title, twin.words.avoids.sub],
  rules: [twin.words.rules.title, twin.words.rules.sub],
};

function DnaSheet({
  dna,
  kind,
  onClose,
}: {
  dna: Dna;
  kind: SheetKind | null;
  onClose: () => void;
}) {
  const [title, sub] = kind ? HEAD[kind] : ['', ''];
  return (
    <Sheet open={kind !== null} onClose={onClose} title={title} testID="dna-sheet">
      <ScrollView contentContainerClassName="gap-4 pb-6" keyboardShouldPersistTaps="handled">
        <Text tone="muted">{sub}</Text>
        {kind === 'types' ? <TypesBody dna={dna} /> : null}
        {kind === 'brands' || kind === 'icons' ? <WallBody dna={dna} kind={kind} /> : null}
        {kind === 'pieces' ? <PiecesBody dna={dna} onClose={onClose} /> : null}
        {kind === 'investment' ? <InvestmentBody dna={dna} /> : null}
        {kind === 'loves' || kind === 'avoids' || kind === 'rules' ? (
          <WordsBody dna={dna} list={kind} />
        ) : null}
      </ScrollView>
    </Sheet>
  );
}

type StyleType = (typeof STYLE_TYPES)[number];

function TypesBody({ dna }: { dna: Dna }) {
  const { update } = useDnaMutations();
  const current = dna.types.filter((t): t is StyleType => STYLE_TYPES.includes(t as StyleType));
  return (
    <View className="gap-2">
      {STYLE_TYPES.map((name) => (
        <Option
          key={name}
          name={name}
          desc={twin.types.desc[name] ?? ''}
          on={current.includes(name)}
          onPress={() =>
            update.mutate({
              input: {
                types: current.includes(name)
                  ? current.filter((t) => t !== name)
                  : [...current, name],
              },
            })
          }
        />
      ))}
    </View>
  );
}

function WallBody({ dna, kind }: { dna: Dna; kind: WallKind }) {
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
  const label = (n: string) => (!brands && iconTag(n) ? `${n} · ${iconTag(n)}` : n);
  return (
    <View className="gap-4">
      <Field
        label={brands ? twin.wall.searchBrands : twin.wall.searchIcons}
        value={q}
        onChangeText={setQ}
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={() => (q.trim() && !has(q.trim()) ? toggle(q.trim()) : null)}
      />
      {mine.length ? (
        <View className="gap-2">
          <Eyebrow>{`${twin.wall.selections} · ${twin.wall.keptCount(mine.length)}`}</Eyebrow>
          <View className="flex-row flex-wrap gap-2">
            {mine.map((n) => (
              <Pill key={n} selected onPress={() => toggle(n)}>
                {label(n)}
              </Pill>
            ))}
          </View>
        </View>
      ) : null}
      <View className="gap-2">
        <Eyebrow>
          {query ? twin.wall.matches : brands ? twin.wall.popular : twin.wall.often}
        </Eyebrow>
        {matches.length ? (
          <View className="flex-row flex-wrap gap-2">
            {matches.map((n) => (
              <Pill key={n} onPress={() => toggle(n)}>
                {label(n)}
              </Pill>
            ))}
          </View>
        ) : (
          <Text size="small" tone="muted">
            {query ? twin.wall.noMatch : twin.wall.allYours}
          </Text>
        )}
        {query && !exact ? (
          <Pill onPress={() => toggle(q.trim())}>{twin.wall.add(q.trim())}</Pill>
        ) : null}
      </View>
    </View>
  );
}

function PiecesBody({ dna, onClose }: { dna: Dna; onClose: () => void }) {
  const router = useRouter();
  return (
    <View className="gap-3">
      {dna.pieces.length ? (
        dna.pieces.map((p) => (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            accessibilityLabel={p.label}
            onPress={() => {
              onClose();
              router.push(`/piece/${p.id}`);
            }}
            style={{ minHeight: MIN_TOUCH }}
            className="justify-center gap-0.5 border-b border-hairline py-2"
          >
            <Text size="caption" tone="muted">
              {[p.category, p.brand].filter(Boolean).join(' · ')}
            </Text>
            <Text>{p.label}</Text>
          </Pressable>
        ))
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

function WordsBody({ dna, list }: { dna: Dna; list: BriefListName }) {
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
    <View className="gap-4">
      {chips.length ? (
        <View className="gap-2">
          <Eyebrow>
            {list === 'rules'
              ? `${twin.words.always} · ${twin.words.alwaysHint}`
              : `${twin.words.never} · ${twin.words.neverHint}`}
          </Eyebrow>
          <View className="flex-row flex-wrap gap-2">
            {chips.map((c) => {
              const line = lineFor(c);
              return (
                <Pill
                  key={c}
                  selected={Boolean(line)}
                  onPress={() =>
                    line
                      ? removeLine.mutate({ params: { id: line.id } })
                      : addLine.mutate({ input: { list, text: c, chip: c } })
                  }
                >
                  {c}
                </Pill>
              );
            })}
          </View>
        </View>
      ) : null}
      {list !== 'loves' ? (
        <Eyebrow>{list === 'avoids' ? twin.words.avoids.yours : twin.words.rules.yours}</Eyebrow>
      ) : null}
      {rows.length ? (
        rows.map((x) => (
          <View
            key={x.id}
            className="flex-row items-center justify-between gap-3 border-b border-hairline"
          >
            <Text tone={x.source === 'typed' ? 'muted' : 'ink'} className="flex-1">
              {x.text}
            </Text>
            <IconButton
              icon="close"
              label={twin.words.strike(x.text)}
              onPress={() => removeLine.mutate({ params: { id: x.id } })}
            />
          </View>
        ))
      ) : (
        <Text size="small" tone="muted">
          {words.empty}
        </Text>
      )}
      <Field
        label={rows.length ? words.another : twin.words.first}
        value={draft}
        maxLength={160}
        onChangeText={setDraft}
        returnKeyType="done"
        onSubmitEditing={add}
        onBlur={add}
      />
      {suggests.length ? (
        <View className="gap-2">
          <Eyebrow>{`${twin.words.suggests} · ${twin.words.suggestsHint}`}</Eyebrow>
          {suggests.map((p) => (
            <View key={p.id} className="flex-row items-center justify-between gap-3">
              <View className="flex-1">
                <Text>{p.text}</Text>
                {p.because ? (
                  <Text size="small" tone="muted">
                    {asSentence(p.because)}
                  </Text>
                ) : null}
              </View>
              <Pill onPress={() => keep.mutate({ params: { id: p.id } })}>{twin.words.keep}</Pill>
            </View>
          ))}
        </View>
      ) : null}
      {rows.length ? (
        <Text size="small" tone="muted">
          {twin.words.filed}
        </Text>
      ) : null}
    </View>
  );
}
