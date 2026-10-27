import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Facts, Model, StyleDna, UpdateModelInput } from '@robes/contracts';
import { twin, you } from '@robes/copy';
import {
  BUST_CUPS,
  chosenTones,
  readAdj,
  stepTwinFact,
  type TwinStep,
  twinFigure,
} from '@robes/core/avatar';
import { euShoe, euSize, type FactStep, feetInches, stepFact } from '@robes/core/style-dna';
import { Icon } from '@robes/icons/native';
import {
  Button,
  Eyebrow,
  MIN_TOUCH,
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
// 28pt dots, 7 apart, so all eight skin tones sit on one row; hitSlop keeps each target 44pt.
function SwatchRow(props: {
  label: string;
  hexes: string[];
  names: readonly string[];
  value: number | null;
  onPick: (i: number) => void;
}) {
  const ink = useColor('ink');
  const name = props.value === null ? '' : props.names[props.value];
  return (
    <View className="gap-3">
      <Text size="small" tone="muted">
        {name ? `${props.label} · ${name}` : props.label}
      </Text>
      <View className="flex-row" style={{ gap: 7 }}>
        {props.hexes.map((hex, i) => {
          const on = i === props.value;
          return (
            <Pressable
              key={hex}
              accessibilityRole="button"
              accessibilityLabel={props.names[i] ?? hex}
              accessibilityState={{ selected: on }}
              onPress={() => props.onPick(i)}
              // The neighbours' frames touch, so the row is all target; the slop makes it 44 tall.
              hitSlop={{ top: 5, bottom: 5 }}
              // The chosen dot: a 1.5pt ink ring 2pt off its edge (frame 35, laid out at 28).
              style={{
                width: 35,
                height: 35,
                margin: -3.5,
                borderRadius: 17.5,
                borderWidth: 1.5,
                borderColor: on ? ink : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                className="rounded-full border border-hairline"
                style={{ width: 28, height: 28, backgroundColor: hex }}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
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

// Plain − and + (decided 27 Oct, both platforms), each a 44pt circle; an empty value reads "Add"
// in the serif italic. Twin of web twin-parts.tsx Stepper.
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
  const ink = useColor('ink');
  const step = (dir: 1 | -1) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${dir < 0 ? f.less : f.more}: ${label}`}
      onPress={() => onStep(dir)}
      style={{ width: MIN_TOUCH, height: MIN_TOUCH }}
      className="items-center justify-center rounded-pill border border-border-control"
    >
      <Icon name={dir < 0 ? 'minus' : 'plus'} size={16} color={ink} />
    </Pressable>
  );
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text>{label}</Text>
      <View className="items-end">
        <View className="flex-row items-center gap-2">
          {step(-1)}
          <Text
            accessibilityLabel={`${label}: ${value || f.add}`}
            tone={value ? 'ink' : 'faint'}
            italic={!value}
            size={value ? 'body' : 'caption'}
            className="min-w-16 text-center"
          >
            {value || f.add}
          </Text>
          {step(1)}
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

// The facts drawer (size, never weight): height, size, bust, waist and shoes. Title and fields
// only; her age and gender are set by their own pills on Body shape (decided 27 Oct).
export function FactsBody({ dna, gender }: { dna: StyleDna; gender: Model['presence'] }) {
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
  const any = Object.entries(facts).some(([k, v]) => k !== 'ageBand' && v !== null);
  const bra = bustMode === 'bra' && !man;
  return (
    <ScrollView style={{ flexShrink: 1 }} contentContainerClassName="gap-5 pb-6">
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
      {any ? (
        <Button
          variant="quiet"
          className="self-start"
          onPress={() =>
            set({
              heightCm: null,
              sizeUk: null,
              shoeUk: null,
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
