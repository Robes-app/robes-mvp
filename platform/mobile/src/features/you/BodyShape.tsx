import { useApi } from '@robes/api-client/react';
import type { Facts, Model, UpdateModelInput } from '@robes/contracts';
import { twin } from '@robes/copy';
import { effectiveStops, isAdjusted, readAdj, STOPS, TWIN_SCALES } from '@robes/core/avatar';
import { AGE_BANDS, ageBandLabel, euSize } from '@robes/core/style-dna';
import { Icon } from '@robes/icons/native';
import {
  Button,
  EmptyState,
  Eyebrow,
  MIN_TOUCH,
  Sheet,
  Skeleton,
  Text,
  useColor,
} from '@robes/ui-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { useDnaMutations } from './dna';
import {
  bustOf,
  FactsBody,
  Figure,
  type Pick,
  Section,
  useDrawTwin,
  useModel,
  useModelPick,
} from './twin';

const tw = twin.twinPage;
const f = twin.facts;

// Body shape (legacy redline 3c): her line drawn from the facts, her proportions and the facts
// strip (each a door to the facts drawer), then three five-cell scales she can nudge by hand.
// Nothing here names a shape. Leaving redraws her twin.
export function BodyShape() {
  const query = useModel();
  const dna = useApi('me.dna.get');
  const { pick } = useModelPick();
  const [facts, setFacts] = useState(false);
  useDrawTwin('leave');
  if (query.isError) return <EmptyState title={errorMessage(query.error)} />;
  const model = query.data;
  if (!model || !dna.data) return <Skeleton width="100%" height={240} />;
  const open = () => setFacts(true);
  return (
    <ScrollView contentContainerClassName="gap-5 px-6 pb-12">
      <LineCard model={model} facts={dna.data.facts} onOpen={open} pick={pick} />
      <Scales model={model} facts={dna.data.facts} pick={pick} />
      <Sheet open={facts} onClose={() => setFacts(false)} title={f.title} closeButton>
        <FactsBody dna={dna.data} gender={model.presence} />
      </Sheet>
    </ScrollView>
  );
}

// A pill that opens its own short list and saves on the pick (decided 27 Oct): Gender and Age are
// set here, never in the facts drawer. Twin of web you/model/body/body-view.tsx PillMenu.
function PillMenu<T extends string>({
  label,
  value,
  options,
  current,
  onPick,
}: {
  label: string;
  value: string;
  options: readonly { key: T; label: string }[];
  current: T | null;
  onPick: (key: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const muted = useColor('ink-muted');
  const ink = useColor('ink');
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || f.add}`}
        onPress={() => setOpen(true)}
        style={{ minHeight: MIN_TOUCH }}
        className={`flex-row items-center gap-2 rounded-pill border px-4 ${value ? 'border-hairline' : 'border-border-control border-dashed'}`}
      >
        <Eyebrow style={{ fontSize: 9.5 }}>{label}</Eyebrow>
        <Text size={value ? 'small' : 'caption'} tone={value ? 'ink' : 'faint'} italic={!value}>
          {value || f.add}
        </Text>
        <Icon name="down" color={muted} size={12} />
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={label} closeButton>
        <View>
          {options.map((o, i) => (
            <Pressable
              key={o.key}
              accessibilityRole="radio"
              accessibilityState={{ checked: current === o.key }}
              onPress={() => {
                onPick(o.key);
                setOpen(false);
              }}
              style={{ minHeight: MIN_TOUCH }}
              className={`flex-row items-center justify-between ${i ? 'border-t border-hairline' : ''}`}
            >
              <Text>{o.label}</Text>
              {current === o.key ? <Icon name="check" color={ink} size={16} /> : null}
            </Pressable>
          ))}
        </View>
      </Sheet>
    </>
  );
}

const GENDERS = (['woman', 'man', 'unspecified'] as const).map((key) => ({
  key,
  label: f.genderOptions[key],
}));

function LineCard({
  model,
  facts,
  onOpen,
  pick,
}: {
  model: Model;
  facts: Facts;
  onOpen: () => void;
  pick: Pick;
}) {
  const { update } = useDnaMutations();
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
  const age = ageBandLabel(facts.ageBand);
  return (
    <View className="gap-4 rounded-soft border border-hairline bg-surface-raised p-5">
      <View className="flex-row items-center justify-between">
        <Eyebrow>{tw.yourLine}</Eyebrow>
        <Button variant="quiet" onPress={onOpen}>
          {`${tw.edit} →`}
        </Button>
      </View>
      <View className="flex-row gap-4 rounded-soft border border-hairline p-3">
        <Figure facts={facts} adj={model.adj} />
        <View className="flex-1 justify-center gap-2">
          <Eyebrow numberOfLines={1} style={{ fontSize: 9, letterSpacing: 1.8 }}>
            {tw.proportions(model.presence)}
          </Eyebrow>
          {rows.map(([k, v]) => (
            <View key={k} className="flex-row items-baseline justify-between gap-2">
              <Text size="caption" tone="muted">
                {k}
              </Text>
              <Text tone={v ? 'ink' : 'faint'} italic={!v}>
                {v || f.add}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <View className="flex-row flex-wrap gap-2">
        <PillMenu
          label={tw.gender}
          value={f.genderOptions[model.presence]}
          options={GENDERS}
          current={model.presence}
          onPick={(presence) => pick({ presence })}
        />
        <PillMenu
          label={tw.age}
          value={age}
          options={AGE_BANDS}
          current={facts.ageBand}
          onPick={(ageBand) => update.mutate({ input: { facts: { ageBand } } })}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={f.title}
        onPress={onOpen}
        className="flex-row rounded-crisp border border-hairline"
      >
        {strip.map(([k, v], i) => (
          <View key={k} className={`flex-1 gap-1 px-2 py-3 ${i ? 'border-l border-hairline' : ''}`}>
            <Text size="caption" tone="muted">
              {k}
            </Text>
            <Text
              size={v ? 'small' : 'caption'}
              tone={v ? 'ink' : 'faint'}
              italic={!v}
              numberOfLines={1}
            >
              {v || f.add}
            </Text>
          </View>
        ))}
      </Pressable>
    </View>
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
        return (
          <View key={k} className="gap-2">
            <Text className="font-display text-lg">{label}</Text>
            {/* Five cells in a cream track; the chosen one takes the selected edge and an ink dot. */}
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel={label}
              className="flex-row overflow-hidden rounded-pill border border-rule-mid bg-surface"
            >
              {STOPS.map((v) => {
                const on = eff[k] === v;
                return (
                  <Pressable
                    key={v}
                    accessibilityRole="button"
                    accessibilityLabel={tw.stop(label, v, s.less, s.more, asIs)}
                    accessibilityState={{ selected: on }}
                    // A second tap on the chosen stop hands the scale back to her facts.
                    onPress={() => pick({ adj: { [k]: on ? null : v } as UpdateModelInput['adj'] })}
                    style={{ minHeight: MIN_TOUCH }}
                    className={`flex-1 items-center justify-center ${v !== STOPS[0] ? 'border-l border-rule-mid' : ''}`}
                  >
                    {on ? (
                      <View className="absolute inset-0 items-center justify-center rounded-pill border border-selected-line bg-selected">
                        <View className="size-1.5 rounded-full bg-ink" />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            <View className="flex-row justify-between px-3">
              <Text size="caption" tone="muted">
                {s.less}
              </Text>
              <Text size="caption" tone="muted">
                {s.more}
              </Text>
            </View>
          </View>
        );
      })}
      {isAdjusted(adj) ? (
        <View className="border-t border-hairline pt-3">
          <Button variant="quiet" className="self-start" onPress={() => pick({ adj: {} })}>
            {tw.backToFacts}
          </Button>
        </View>
      ) : null}
    </Section>
  );
}
