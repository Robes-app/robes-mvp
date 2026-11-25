import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Facts, Model, StyleDna, UnitPrefs, UpdateModelInput } from '@robes/contracts';
import { diary, twin, ui, you } from '@robes/copy';
import {
  chosenTones,
  lineupOrder,
  readAdj,
  TWIN_STATUS_STEP_MS,
  twinFigure,
  twinStatusIndex,
} from '@robes/core/avatar';
import {
  CLEARED_FACTS,
  type FactRow,
  factRows,
  type MeasureField,
  type MeasurePatch,
  type MeasureUnit,
  measurePresenceOf,
  type PickerColumn,
  pickerOf,
  settledIndex,
  WHEEL_SIDE,
  wheelOpacity,
} from '@robes/core/style-dna';
import { Icon } from '@robes/icons/native';
import {
  AlertDialog,
  Button,
  Eyebrow,
  MIN_TOUCH,
  PrimaryScope,
  Sheet,
  Text,
  useColor,
  useToast,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { Image as ExpoImage } from 'expo-image';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Ellipse, Line, Path, Rect } from 'react-native-svg';
import { errorMessage } from '@/lib/errors';
import { useDnaMutations } from './dna';

const copy = you.model;
const f = twin.facts;
export type Pick = (input: UpdateModelInput) => void;

const STATUS = twin.twinPage.status;

// What the stage showed when she started waiting, kept until the wait is over: her read and her
// twin land in steps, and each would otherwise put another picture (a catalog model her new
// colouring picks, say) in front of her before her twin arrives.
export function useHeldWhile<T>(value: T, hold: boolean): T {
  const held = useRef(value);
  if (!hold) held.current = value;
  return hold ? held.current : value;
}

// The status line a redraw with no selfie starts on: "Drawing your model".
const DRAWING_FROM = 2;

// The stage's status (designs 06–07): a line at a time while her selfie reads and her twin draws,
// the last one holding until she lands. Null when nothing is happening. Web twin: useTwinStatus
// in app/src/app/(app)/you/model/twin-parts.tsx.
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
    const tick = setInterval(() => setNow(Date.now()), TWIN_STATUS_STEP_MS / 4);
    return () => clearInterval(tick);
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

// R11 (redlines 2026-11-05): 56×70 on the small radius, 6pt apart — five in a row, no scroll.
const TILE = { width: 56, height: 70 };

// The lineup (plan 2026-11-05 §1.4–1.5): her own model, once she has one, and the five Robes
// models, in a fixed order until she chooses; the one her looks stand on then leads, ringed
// (lineupOrder). Choosing a Robes model keeps her selfie and twin on file; choosing herself again
// hands the stand back. Web twin: app/(app)/you/model/twin-parts.tsx Lineup.
export function Lineup({ model, pick, pending }: { model: Model; pick: Pick; pending: boolean }) {
  const faint = useColor('ink-faint');
  const onPlan = useColor('surface-raised');
  const onRobes = model.stand?.on === 'robes';
  const own = model.filed;
  const ownImage = model.twin.imageUrl ?? model.cell.imageUrl;
  const chosen = onRobes ? (model.preset ?? 1) : null;
  const tile = (
    key: string,
    label: string,
    on: boolean,
    url: string | null,
    onPress: () => void,
    testID: string,
  ) => (
    <Pressable
      key={key}
      accessibilityRole="radio"
      accessibilityState={{ checked: on, disabled: pending }}
      accessibilityLabel={label}
      disabled={pending}
      onPress={onPress}
      style={[TILE, { borderWidth: on ? 1.5 : 0.5 }]}
      className={`overflow-hidden rounded-sm bg-surface ${on ? 'border-ink' : 'border-rule-mid'}`}
      testID={testID}
    >
      {url ? (
        // A catalog portrait, or her own, in a fixed frame with the face kept in view.
        <ExpoImage
          source={{ uri: url }}
          contentFit="cover"
          contentPosition={{ top: '12%', left: '50%' }}
          accessible={false}
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Icon name="user" size={16} color={faint} />
        </View>
      )}
      {on ? (
        <View className="absolute bottom-1 left-1 size-[18px] items-center justify-center rounded-pill border-2 border-surface-raised bg-accent-plan">
          <Icon name="check" size={9} color={onPlan} />
        </View>
      ) : null}
    </Pressable>
  );
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="radiogroup"
      accessibilityLabel={twin.twinPage.lineup}
      contentContainerClassName="gap-1.5"
    >
      {lineupOrder({ own, chosen: chosen ?? 'own' }).map((slot) => {
        if (slot === 'own') {
          return tile(
            'you',
            twin.twinPage.you,
            !onRobes,
            ownImage,
            () => (onRobes ? pick({ preset: null }) : undefined),
            'lineup-you',
          );
        }
        const m = model.robesModels.find((r) => r.n === slot);
        if (!m) return null;
        return tile(
          m.id,
          diary.dayOne.modelPick(m.n),
          m.n === chosen,
          m.imageUrl,
          () => (m.n === chosen ? undefined : pick({ preset: m.n })),
          `lineup-${m.n}`,
        );
      })}
    </ScrollView>
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
  presence,
  tone,
}: {
  facts: Facts;
  adj: Model['adj'];
  presence?: Model['presence'];
  tone?: { skin: string; hair: string };
}) {
  const g = twinFigure(facts, readAdj(adj, presence));
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
    facts.waistCm ||
    facts.chestCm
  );
  if (closeUp && line) return 'both';
  if (closeUp) return 'closeUp';
  if (line) return 'facts';
  return model.filed || model.skinSet || model.hairSet ? 'hand' : 'none';
}

// A row's value in words, in the unit she reads it in; '' when she has not given it. Twin of
// web twin-parts.tsx rowValue.
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
// the rows fading as they leave it. Where it comes to rest is saved; a tap scrolls a value into
// the band and saves it at once. Twin of web twin-parts.tsx Wheel.
const ITEM = MIN_TOUCH;
function Wheel({
  label,
  column,
  text,
  onPick,
}: {
  label: string;
  column: PickerColumn;
  text: (shown: number | string) => string;
  onPick: (patch: MeasurePatch) => void;
}) {
  const ref = useRef<ScrollViewInstance>(null);
  // The row in the band while she scrolls; the pick is saved only once the wheel comes to rest.
  const [at, setAt] = useState(column.selected);
  // The row last saved, so a tap's own scroll into the band never saves it twice.
  const kept = useRef<number | null>(column.saved ? column.selected : null);
  const opened = useRef(false);
  const count = column.items.length;
  const pick = (i: number) => {
    const item = column.items[i];
    if (!item?.patch || i === kept.current) return;
    kept.current = i;
    onPick(item.patch);
  };
  const rest = (y: number) => {
    const i = settledIndex(y, ITEM, count);
    setAt(i);
    pick(i);
  };
  const choose = (i: number) => {
    setAt(i);
    pick(i);
    ref.current?.scrollTo({ y: i * ITEM, animated: true });
  };
  return (
    <View className="min-w-0 flex-1" style={{ height: ITEM * (2 * WHEEL_SIDE + 1) }}>
      <View
        pointerEvents="none"
        className="absolute inset-x-0 rounded-pill border border-selected-line bg-selected"
        style={{ top: ITEM * WHEEL_SIDE, height: ITEM }}
      />
      <ScrollView
        ref={ref}
        accessibilityLabel={label}
        testID={`wheel-${label}`}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: column.selected * ITEM }}
        contentContainerStyle={{ paddingVertical: ITEM * WHEEL_SIDE }}
        scrollEventThrottle={16}
        // Opens on her value (Android ignores contentOffset); a change of unit draws a new wheel.
        onLayout={() => {
          if (opened.current) return;
          opened.current = true;
          ref.current?.scrollTo({ y: column.selected * ITEM, animated: false });
        }}
        onScroll={(e) => setAt(settledIndex(e.nativeEvent.contentOffset.y, ITEM, count))}
        onMomentumScrollEnd={(e) => rest(e.nativeEvent.contentOffset.y)}
        // A drag let go without a fling comes to rest where it is.
        onScrollEndDrag={(e) => {
          if (Math.abs(e.nativeEvent.velocity?.y ?? 0) < 0.05) rest(e.nativeEvent.contentOffset.y);
        }}
      >
        {column.items.map((item, i) => {
          const words = text(item.shown);
          return (
            <Pressable
              key={String(item.shown)}
              accessibilityRole="button"
              accessibilityLabel={words}
              accessibilityState={{ selected: i === at }}
              onPress={() => choose(i)}
              style={{ height: ITEM, opacity: wheelOpacity(Math.abs(i - at)) }}
              className="items-center justify-center"
            >
              <Text className="font-display" style={{ fontSize: 24 }}>
                {words}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// A row's unit toggle: its units as small caps, the one she reads underlined. Twin of web
// twin-parts.tsx UnitToggle.
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
    <View accessibilityLabel={f.unitsOf(label)} className="flex-row">
      {units.map((u) => {
        const on = u === unit;
        return (
          <Pressable
            key={u}
            accessibilityRole="button"
            accessibilityLabel={f.units[u]}
            accessibilityState={{ selected: on }}
            onPress={() => onPick(u)}
            style={{ minWidth: MIN_TOUCH, height: MIN_TOUCH }}
            className="items-center justify-center px-1.5"
          >
            <Text
              size="caption"
              tone={on ? 'ink' : 'muted'}
              className={`border-b pt-1 pb-[3px] uppercase ${on ? 'border-ink font-medium' : 'border-transparent'}`}
              style={{ fontSize: 10, letterSpacing: 2.2 }}
            >
              {f.units[u]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const labelOf = (field: MeasureField): string => f[field];

// The facts (design "The facts — redesign", 24 Nov): a row per measurement with its unit toggle;
// a tap opens its wheel in the same sheet (iOS presents one sheet at a time). A unit changes only
// how a value reads, never what is saved. Every field is optional and none says so; Clear the
// facts asks first. Writes land in the cache at once, so the wheel steps under her finger. Twin of
// web twin-parts.tsx FactsSheet.
export function FactsSheet({
  open,
  onClose,
  dna,
}: {
  open: boolean;
  onClose: () => void;
  dna: StyleDna;
}) {
  const queryClient = useQueryClient();
  const { update } = useDnaMutations();
  const muted = useColor('ink-muted');
  const [field, setField] = useState<MeasureField | null>(null);
  // Clear asks over nothing: the sheet steps aside, the question shows once it has gone, and the
  // sheet comes back once the question has (iOS presents one modal at a time).
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState(false);
  const presence = measurePresenceOf(dna.gender);
  const rows = factRows(dna.facts, dna.units, presence);
  const row = field ? rows.find((r) => r.field === field) : undefined;
  const save = (facts: MeasurePatch, units: UnitPrefs = {}) => {
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
  const close = () => {
    setField(null);
    onClose();
  };
  return (
    <>
      <Sheet
        open={open && !asking}
        onClose={close}
        onClosed={() => (asking ? setQuestion(true) : undefined)}
        title={row ? labelOf(row.field) : f.title}
        testID="facts-sheet"
      >
        <ScrollView style={{ flexShrink: 1 }} contentContainerClassName="gap-4 pb-2">
          {row ? (
            <>
              <View className="flex-row justify-end">
                <UnitToggle
                  label={labelOf(row.field)}
                  units={row.units}
                  unit={row.unit}
                  onPick={pickUnit(row)}
                />
              </View>
              <View className="flex-row gap-2.5">
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
              </View>
            </>
          ) : (
            <View>
              {rows.map((r) => {
                const value = rowValue(r);
                const label = labelOf(r.field);
                return (
                  <View
                    key={r.field}
                    style={{ minHeight: presence === 'man' ? 72 : 84 }}
                    className="flex-row items-center gap-1 border-hairline border-b"
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={f.rowLabel(label, value)}
                      onPress={() => setField(r.field)}
                      testID={`fact-${r.field}`}
                      style={{ minHeight: 72 }}
                      className="min-w-0 flex-1 flex-row items-center gap-2.5"
                    >
                      <View className="gap-2.5">
                        <Eyebrow style={{ fontSize: 10, letterSpacing: 2.4 }}>{label}</Eyebrow>
                        <Text
                          className="font-display"
                          tone={value ? 'ink' : 'muted'}
                          italic={!value}
                          style={value ? { fontSize: 26, lineHeight: 28 } : undefined}
                        >
                          {value || f.add}
                        </Text>
                      </View>
                      <Icon name="down" size={14} color={muted} />
                    </Pressable>
                    <UnitToggle label={label} units={r.units} unit={r.unit} onPick={pickUnit(r)} />
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
        <View className="items-center gap-2 pt-3">
          {row || !any ? null : (
            <Button variant="quiet" onPress={() => setAsking(true)}>
              {f.clear}
            </Button>
          )}
          <PrimaryScope>
            <Button
              className="w-full"
              onPress={() => (row ? setField(null) : close())}
              testID="facts-done"
            >
              {ui.done}
            </Button>
          </PrimaryScope>
        </View>
      </Sheet>
      <AlertDialog
        open={question}
        title={f.clearAsk.title}
        message={f.clearAsk.body}
        onDismiss={() => setQuestion(false)}
        onClosed={() => setAsking(false)}
        actions={[
          {
            label: f.clearAsk.confirm,
            variant: 'danger',
            onPress: () => {
              setQuestion(false);
              save(CLEARED_FACTS);
            },
          },
          { label: f.clearAsk.cancel, variant: 'outline', onPress: () => setQuestion(false) },
        ]}
        testID="facts-clear"
      />
    </>
  );
}
