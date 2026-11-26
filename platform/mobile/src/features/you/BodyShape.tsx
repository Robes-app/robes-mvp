import { useApi } from '@robes/api-client/react';
import type { Facts, Model, StyleDna, UpdateModelInput } from '@robes/contracts';
import { twin } from '@robes/copy';
import { effectiveStops, isAdjusted, readAdj, STOPS, scalesFor } from '@robes/core/avatar';
import { factRows, measurePresenceOf } from '@robes/core/style-dna';
import { Icon } from '@robes/icons/native';
import { EmptyState, Eyebrow, MIN_TOUCH, Skeleton, Text, useColor } from '@robes/ui-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import {
  FactsSheet,
  Figure,
  type Pick,
  rowValue,
  useDrawTwin,
  useModel,
  useModelPick,
} from './twin';

const tw = twin.twinPage;
const f = twin.facts;

// Body shape (design "The facts — redesign", 24 Nov): her line drawn from the facts, the facts
// card in the units she reads them in (each row a door to The facts), then three five-stop scales
// she can nudge by hand — hers end at the hips, his at the waist. Nothing here names a shape.
// Leaving redraws her twin. Twin of web app/(app)/you/model/body/body-view.tsx.
export function BodyShape() {
  const query = useModel();
  const dna = useApi('me.dna.get');
  const { pick } = useModelPick();
  const [facts, setFacts] = useState(false);
  useDrawTwin('leave');
  if (query.isError) return <EmptyState title={errorMessage(query.error)} />;
  const model = query.data;
  if (!model || !dna.data) return <Skeleton width="100%" height={240} />;
  return (
    <ScrollView contentContainerClassName="gap-6 px-5 pt-4 pb-12">
      <View className="items-center">
        <Figure facts={dna.data.facts} adj={model.adj} presence={model.presence} />
      </View>
      <FactsCard dna={dna.data} onOpen={() => setFacts(true)} />
      <Scales model={model} facts={dna.data.facts} pick={pick} />
      <FactsSheet open={facts} onClose={() => setFacts(false)} dna={dna.data} />
    </ScrollView>
  );
}

const card = 'overflow-hidden rounded-soft border border-rule-mid bg-surface-raised';

function FactsCard({ dna, onOpen }: { dna: StyleDna; onOpen: () => void }) {
  const muted = useColor('ink-muted');
  const rows = factRows(dna.facts, dna.units, measurePresenceOf(dna.gender));
  return (
    <View className="gap-3">
      <Eyebrow accessibilityRole="header">{f.title}</Eyebrow>
      <View className={card}>
        {rows.map((r, i) => {
          const value = rowValue(r);
          const label = f[r.field];
          return (
            <Pressable
              key={r.field}
              accessibilityRole="button"
              accessibilityLabel={f.rowLabel(label, value)}
              onPress={onOpen}
              style={{ minHeight: 52 }}
              className={`flex-row items-center gap-2.5 pr-3.5 pl-4 ${i ? 'border-t border-hairline' : ''}`}
            >
              <Text size="small" tone="muted" className="flex-1">
                {label}
              </Text>
              <Text
                className="font-display"
                tone={value ? 'ink' : 'muted'}
                italic={!value}
                style={value ? { fontSize: 20 } : undefined}
              >
                {value || f.add}
              </Text>
              <Icon name="forward" size={14} color={muted} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Scales({ model, facts, pick }: { model: Model; facts: Facts; pick: Pick }) {
  const adj = readAdj(model.adj, model.presence);
  const eff = effectiveStops(facts, adj);
  const asIs = tw.asIs(model.presence);
  const man = model.presence === 'man';
  return (
    <View className="gap-3">
      <View className="min-h-5 flex-row items-center justify-between">
        <Eyebrow accessibilityRole="header">{tw.adjust}</Eyebrow>
        {isAdjusted(adj) ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => pick({ adj: {} })}
            style={{ minHeight: MIN_TOUCH, marginVertical: -12 }}
            className="-mr-2 justify-center px-2"
          >
            <Text size="caption" tone="muted" className="underline">
              {tw.reset}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View className={`${card} px-4 py-1`}>
        {scalesFor(model.presence).map((k, i) => {
          const s = k === 'bust' && man ? tw.chestScale : tw.scales[k];
          return (
            <View
              key={k}
              accessibilityRole="radiogroup"
              accessibilityLabel={s.label}
              className={`gap-1.5 pt-4 pb-3 ${i ? 'border-t border-hairline' : ''}`}
            >
              <Text className="font-display" style={{ fontSize: 22 }}>
                {s.label}
              </Text>
              {/* Five stops on a hairline; the chosen one takes the warm fill and an ink dot. */}
              <View className="-mx-2.5 flex-row justify-between">
                <View
                  pointerEvents="none"
                  className="absolute h-px bg-hairline"
                  style={{ left: 32, right: 32, top: 22 }}
                />
                {STOPS.map((v) => {
                  const on = eff[k] === v;
                  return (
                    <Pressable
                      key={v}
                      accessibilityRole="radio"
                      accessibilityLabel={tw.stop(s.label, v, s.less, s.more, asIs)}
                      accessibilityState={{ checked: on }}
                      onPress={() => pick({ adj: { [k]: v } as UpdateModelInput['adj'] })}
                      style={{ width: MIN_TOUCH, height: MIN_TOUCH }}
                      className="items-center justify-center"
                    >
                      <View
                        className={`size-[30px] items-center justify-center rounded-full border ${on ? 'border-selected-line bg-selected' : 'border-transparent'}`}
                      >
                        <View
                          className={`rounded-full ${on ? 'size-1.5 bg-ink' : v === 0 ? 'size-[7px] bg-selected-line' : 'size-[5px] bg-rule-mid'}`}
                        />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              <View className="flex-row justify-between">
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
      </View>
    </View>
  );
}
