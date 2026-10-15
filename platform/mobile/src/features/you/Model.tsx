import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Facts, Model as ModelData, StyleProfile, UpdateModelInput } from '@robes/contracts';
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
import { Icon } from '@robes/icons/native';
import {
  Button,
  EmptyState,
  Eyebrow,
  Image,
  MIN_TOUCH,
  Pill,
  PrimaryScope,
  SegmentedControl,
  Sheet,
  Skeleton,
  Text,
  useColor,
  useToast,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { useDnaMutations } from './dna';
import { AnalysisCard, ColourList } from './Style';

const copy = you.model;
const tw = twin.twinPage;
type Pick = (input: UpdateModelInput) => void;

// Swatch colours are catalog data (like the style swatches), the one place colour comes inline.
function SwatchRow(props: {
  label: string;
  hexes: string[];
  names: readonly string[];
  value: number;
  onPick: (i: number) => void;
}) {
  return (
    <View className="gap-2">
      <Text size="small" tone="muted">
        {props.label}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {props.hexes.map((hex, i) => (
          <Pressable
            key={hex}
            accessibilityRole="button"
            accessibilityLabel={props.names[i] ?? hex}
            accessibilityState={{ selected: i === props.value }}
            onPress={() => props.onPick(i)}
            className={`rounded-full border ${i === props.value ? 'border-ink' : 'border-hairline'}`}
            style={{
              width: 44,
              height: 44,
              backgroundColor: hex,
              borderWidth: i === props.value ? 2 : 1,
            }}
          />
        ))}
      </View>
    </View>
  );
}

function ColourRows({ model, pick }: { model: ModelData; pick: Pick }) {
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

function LineRows({ model, pick }: { model: ModelData; pick: Pick }) {
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

function linePhrase(model: ModelData): string {
  return tw.lineAndFrame(
    model.line ? copy.lineOptions[model.line] : '',
    model.frame ? copy.frameOptions[model.frame] : '',
  );
}

function ValueRow({
  label,
  sub,
  value,
  onPress,
}: {
  label: string;
  sub?: string;
  value?: string;
  onPress: () => void;
}) {
  const muted = useColor('ink-muted');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      onPress={onPress}
      style={{ minHeight: MIN_TOUCH }}
      className="flex-row items-center justify-between gap-4 border-b border-hairline py-3"
    >
      <View className="flex-1">
        <Text>{label}</Text>
        {sub ? (
          <Text size="small" tone="muted">
            {sub}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text size="small" tone="muted" numberOfLines={1} className="flex-shrink">
          {value}
        </Text>
      ) : null}
      <Icon name="forward" color={muted} size={18} />
    </Pressable>
  );
}

type SheetKind = 'photos' | 'adjust' | 'facts';

// You › Your Digital Twin (legacy Settings 01): her model, read from two photographs or shaped by
// hand, and the facts she gives (size, never weight).
export function Model() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [sheet, setSheet] = useState<SheetKind | null>(null);
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
    onError: (err) => toast.show({ message: errorMessage(err) }),
  });
  if (query.isError) return <EmptyState title={errorMessage(query.error)} />;
  const model = query.data;
  if (!model || !style.data || !dna.data) return <Skeleton width="100%" aspectRatio={4 / 5} />;
  const profile = style.data;
  const pick: Pick = (input) => update.mutate({ input });
  const read = Boolean(profile.colour || profile.silhouette);
  const colour = profile.colour;

  return (
    <ScrollView contentContainerClassName="gap-6 px-6 pb-12">
      <Eyebrow>{copy.source[model.source]}</Eyebrow>
      {model.cell.imageUrl ? (
        <Image source={model.cell.imageUrl} alt={copy.imageAlt} />
      ) : (
        <Skeleton width="100%" aspectRatio={4 / 5} />
      )}
      {model.cell.status === 'pending' ? (
        <Text tone="muted" accessibilityLiveRegion="polite">
          {copy.creating}
        </Text>
      ) : model.cell.status === 'failed' ? (
        <Text tone="muted">{copy.failed}</Text>
      ) : null}
      {read ? null : <Text tone="muted">{copy.empty}</Text>}
      {!model.filed ? (
        <PrimaryScope>
          <Button loading={update.isPending} onPress={() => pick({})}>
            {copy.build}
          </Button>
        </PrimaryScope>
      ) : null}
      {read ? (
        <View className="gap-1">
          <Eyebrow>{tw.readSection}</Eyebrow>
          <ValueRow
            label={tw.colouring}
            value={colour ? [colour.season, colour.undertone, colour.contrast].join(' · ') : ''}
            onPress={() => setSheet('photos')}
          />
          <ValueRow
            label={tw.bodyShape}
            sub={profile.silhouette ? tw.bodyShapeRead : undefined}
            value={linePhrase(model)}
            onPress={() => setSheet('photos')}
          />
          <ValueRow label={tw.adjust} sub={tw.adjustSub} onPress={() => setSheet('adjust')} />
        </View>
      ) : (
        <>
          <View className="gap-3">
            <Eyebrow>{tw.photographs}</Eyebrow>
            <AnalysisCard kind="colour" profile={profile} />
            <Text size="small" tone="muted">
              {tw.closeUpGuide}
            </Text>
            <AnalysisCard kind="silhouette" profile={profile} />
            <Text size="small" tone="muted">
              {tw.fullLengthGuide}
            </Text>
          </View>
          <View className="gap-4">
            <Eyebrow>{tw.adjust}</Eyebrow>
            <ColourRows model={model} pick={pick} />
            <LineRows model={model} pick={pick} />
          </View>
        </>
      )}
      <FactsStrip
        facts={dna.data.facts}
        gender={model.presence}
        onPress={() => setSheet('facts')}
      />
      <Sheet open={sheet === 'photos'} onClose={() => setSheet(null)} title={tw.photographs}>
        <PhotographsBody model={model} profile={profile} pick={pick} />
      </Sheet>
      <Sheet open={sheet === 'adjust'} onClose={() => setSheet(null)} title={tw.adjust}>
        <ScrollView contentContainerClassName="gap-4 pb-6">
          <Text tone="muted">{tw.adjustSheetSub}</Text>
          <ColourRows model={model} pick={pick} />
          <LineRows model={model} pick={pick} />
        </ScrollView>
      </Sheet>
      <Sheet open={sheet === 'facts'} onClose={() => setSheet(null)} title={twin.facts.title}>
        <FactsBody facts={dna.data.facts} gender={model.presence} pick={pick} />
      </Sheet>
    </ScrollView>
  );
}

function PhotographsBody({
  model,
  profile,
  pick,
}: {
  model: ModelData;
  profile: StyleProfile;
  pick: Pick;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const overrides = useApiMutation('me.style.overrides', {
    onSuccess: (next) => queryClient.setQueryData(queryKeys.call('me.style.get'), next),
    onError: (err) => toast.show({ message: errorMessage(err) }),
  });
  const [more, setMore] = useState(false);
  const season = useApiMutation('me.style.season', {
    onSuccess: (data) => queryClient.setQueryData(queryKeys.call('me.style.get'), data),
    onError: () => toast.show({ message: tw.seasonFailed }),
  });
  const colour = profile.colour;
  return (
    <ScrollView contentContainerClassName="gap-5 pb-6" keyboardShouldPersistTaps="handled">
      <Text tone="muted">{tw.photographsSub}</Text>
      <Eyebrow>{tw.colouring}</Eyebrow>
      <AnalysisCard kind="colour" profile={profile} />
      {colour ? (
        <View className="gap-2">
          {seasonChoices(colour.season, more).map((s) => (
            <Pill
              key={s}
              selected={s === colour.season}
              disabled={season.isPending}
              onPress={() => (s === colour.season ? null : season.mutate({ input: { season: s } }))}
            >
              {s}
            </Pill>
          ))}
          {more ? null : (
            <Button variant="quiet" className="self-start" onPress={() => setMore(true)}>
              {tw.anotherSeason}
            </Button>
          )}
        </View>
      ) : (
        <Text size="small" tone="muted">
          {tw.addColour}
        </Text>
      )}
      <ColourRows model={model} pick={pick} />
      <ColourList
        label={you.style.loved}
        colours={profile.overrides.lovedColors}
        onChange={(lovedColors) => overrides.mutate({ input: { lovedColors } })}
      />
      <ColourList
        label={you.style.rejected}
        colours={profile.overrides.rejectedColors}
        onChange={(rejectedColors) => overrides.mutate({ input: { rejectedColors } })}
      />
      <Eyebrow>{tw.bodyShape}</Eyebrow>
      <AnalysisCard kind="silhouette" profile={profile} />
      <LineRows model={model} pick={pick} />
    </ScrollView>
  );
}

function FactsStrip({
  facts,
  gender,
  onPress,
}: {
  facts: Facts;
  gender: ModelData['presence'];
  onPress: () => void;
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
    <View className="gap-2">
      <Eyebrow>{f.title}</Eyebrow>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={f.title}
        onPress={onPress}
        className="flex-row rounded-crisp border border-hairline bg-surface"
      >
        {cells.map(([k, v], i) => (
          <View key={k} className={`flex-1 gap-1 px-2 py-3 ${i ? 'border-l border-hairline' : ''}`}>
            <Text size="caption" tone="muted">
              {k}
            </Text>
            <Text size="small" tone={v ? 'ink' : 'faint'} numberOfLines={1}>
              {v || f.add}
            </Text>
          </View>
        ))}
      </Pressable>
    </View>
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
    <View className="flex-row items-center justify-between gap-3">
      <Text>{label}</Text>
      <View className="items-end">
        <View className="flex-row items-center gap-2">
          <Button variant="secondary" onPress={() => onStep(-1)}>
            {`− ${f.less}`}
          </Button>
          <Text accessibilityLabel={`${label}: ${value || f.add}`} tone={value ? 'ink' : 'faint'}>
            {value || f.add}
          </Text>
          <Button variant="secondary" onPress={() => onStep(1)}>
            {`+ ${f.more}`}
          </Button>
        </View>
        {sub ? (
          <Text size="caption" tone="muted">
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function FactsBody({
  facts,
  gender,
  pick,
}: {
  facts: Facts;
  gender: ModelData['presence'];
  pick: Pick;
}) {
  const f = twin.facts;
  const { update } = useDnaMutations();
  const [unit, setUnit] = useState<'cm' | 'ft'>('cm');
  const set = (patch: Partial<Facts>) => update.mutate({ input: { facts: patch } });
  const step = (kind: FactStep, key: 'heightCm' | 'sizeUk' | 'shoeUk', dir: 1 | -1) =>
    set({ [key]: stepFact(kind, facts[key], dir) });
  const any = facts.heightCm || facts.sizeUk || facts.shoeUk || facts.ageBand;
  return (
    <ScrollView contentContainerClassName="gap-5 pb-6">
      <Text tone="muted">{f.sub}</Text>
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
      <View className="gap-2">
        <Text>{f.age}</Text>
        <View className="flex-row flex-wrap gap-2">
          {AGE_BANDS.map((a) => (
            <Pill
              key={a.key}
              selected={facts.ageBand === a.key}
              onPress={() => set({ ageBand: facts.ageBand === a.key ? null : a.key })}
            >
              {a.label}
            </Pill>
          ))}
        </View>
      </View>
      <View className="gap-2">
        <Text>{f.gender}</Text>
        <View className="flex-row flex-wrap gap-2">
          {(['woman', 'man', 'unspecified'] as const).map((g) => (
            <Pill key={g} selected={gender === g} onPress={() => pick({ presence: g })}>
              {f.genderOptions[g]}
            </Pill>
          ))}
        </View>
      </View>
      {any ? (
        <Button
          variant="quiet"
          className="self-start"
          onPress={() => set({ heightCm: null, sizeUk: null, shoeUk: null, ageBand: null })}
        >
          {f.clear}
        </Button>
      ) : null}
    </ScrollView>
  );
}
