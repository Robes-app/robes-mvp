import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Facts, Model, StyleDna, UpdateModelInput } from '@robes/contracts';
import { twin, you } from '@robes/copy';
import { BUST_CUPS, readAdj, stepTwinFact, type TwinStep, twinFigure } from '@robes/core/avatar';
import {
  AGE_BANDS,
  euShoe,
  euSize,
  type FactStep,
  feetInches,
  stepFact,
} from '@robes/core/style-dna';
import {
  Button,
  Eyebrow,
  Pill,
  SegmentedControl,
  Text,
  useColor,
  useToast,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Svg, { Ellipse, Line, Path, Rect } from 'react-native-svg';
import { errorMessage } from '@/lib/errors';
import { useDnaMutations } from './dna';

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
    onError: (err) => toast.show({ message: errorMessage(err) }),
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
    <View className="gap-4 rounded-soft border border-hairline bg-surface-raised p-5">
      <Eyebrow>{title}</Eyebrow>
      {children}
    </View>
  );
}

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
        {`${props.label} · ${props.names[props.value] ?? ''}`}
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
  adj: Model['adj'];
  tone?: { skin: string; hair: string };
}) {
  const g = twinFigure(facts, readAdj(adj));
  const stroke = useColor('ink-muted');
  const guide = useColor('hairline');
  const fill = useColor('bg');
  const ground = useColor('surface-sunk');
  const body = useColor('selected-line');
  const { width } = useWindowDimensions();
  // Legacy .tw-fig is 150 x 250, narrowing to 120 x 200 on the smallest phones.
  const w = width < 360 ? 120 : 150;
  if (tone) {
    return (
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 150 250"
        preserveAspectRatio="xMidYMax meet"
        accessible={false}
        className="absolute inset-0"
      >
        {/* Swatch colours are catalog data, the one place colour comes inline. */}
        <Ellipse cx={75} cy={g.headY - 4} rx={12} ry={g.headRy + 3} fill={tone.hair} />
        <Ellipse cx={75} cy={g.headY} rx={g.headRx} ry={g.headRy} fill={tone.skin} />
        <Path d={g.d} fill={body} />
      </Svg>
    );
  }
  const line = (y: number) => (
    <Line
      x1={18}
      x2={132}
      y1={y}
      y2={y}
      stroke={guide}
      strokeWidth={0.7}
      strokeDasharray="2.5 2.5"
    />
  );
  return (
    <Svg width={w} height={(w * 250) / 150} viewBox="0 0 150 250" accessible={false}>
      {/* Its own ground, so the figure reads lifted wherever it is placed. */}
      <Rect x={0} y={0} width={150} height={250} rx={3} fill={ground} />
      {line(g.guides.bust)}
      {line(g.guides.waist)}
      {line(g.guides.hips)}
      <Line x1={34} x2={116} y1={g.ground} y2={g.ground} stroke={stroke} strokeWidth={0.7} />
      <Path d={g.d} fill={fill} stroke={stroke} strokeWidth={0.9} strokeLinejoin="round" />
      <Ellipse
        cx={75}
        cy={g.headY}
        rx={g.headRx}
        ry={g.headRy}
        fill={fill}
        stroke={stroke}
        strokeWidth={0.9}
      />
    </Svg>
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
    facts.waistCm
  );
  if (closeUp && line) return 'both';
  if (closeUp) return 'closeUp';
  if (line) return 'facts';
  return model.filed || model.skinSet || model.hairSet ? 'hand' : 'none';
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
  const facts = dna.facts;
  const [unit, setUnit] = useState<'cm' | 'ft'>('cm');
  const [waistUnit, setWaistUnit] = useState<'cm' | 'in'>('cm');
  const [bustMode, setBustMode] = useState<'bra' | 'cm'>(facts.bustCm ? 'cm' : 'bra');
  const man = gender === 'man';
  const set = (patch: Partial<Facts>) => update.mutate({ input: { facts: patch } });
  const step = (kind: FactStep, key: 'heightCm' | 'sizeUk' | 'shoeUk', dir: 1 | -1) =>
    set({ [key]: stepFact(kind, facts[key], dir) });
  const stepTwin = (kind: TwinStep, dir: 1 | -1, patch: Partial<Facts> = {}) =>
    set({ [kind]: stepTwinFact(kind, facts[kind], dir), ...patch });
  const any = Object.values(facts).some((v) => v !== null);
  const bra = bustMode === 'bra' && !man;
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
          <View className="gap-2">
            <Text>{f.cup}</Text>
            <View className="flex-row flex-wrap gap-2">
              {BUST_CUPS.map((c) => (
                <Pill
                  key={c}
                  selected={facts.bustCup === c}
                  onPress={() => set({ bustCup: facts.bustCup === c ? null : c, bustCm: null })}
                >
                  {c}
                </Pill>
              ))}
            </View>
          </View>
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
          onPress={() =>
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
    </ScrollView>
  );
}
