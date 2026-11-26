import type { PieceImage } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { openReasons, type ThreadLine } from '@robes/core/looks';
import { Icon, type IconName } from '@robes/icons/native';
import { fonts, Text, useColor } from '@robes/ui-native';
import { type ReactNode, useEffect, useRef } from 'react';
import { Pressable, ScrollView, type ScrollViewInstance, View } from 'react-native';
import { Photo } from '@/features/wardrobe/PieceCard';
import type { Adjust } from './adjust';
import { RobesAvatar } from './StylingCard';

// The conversation's lines (redline 14 Nov, pins 6 and 7): Robes speaks in the small sans beside
// its sparkle; she speaks in the italic serif, in a sunk bubble on the right. Under her first
// line, the place and weather her brief went with. A work line is Robes' with the sparkle dimmed;
// a filed rule is a caption. `compact` (the prompt's sheet) leaves the scrolling to the sheet.
// Web twin: components/looks/adjust-dock.tsx.
const robesLine = { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, paddingTop: 3.5 };

export function ThreadLines({
  thread,
  compact = false,
  meta,
  testID,
}: {
  thread: readonly ThreadLine[];
  compact?: boolean;
  meta?: ReactNode;
  testID?: string;
}) {
  const scroll = useRef<ScrollViewInstance>(null);
  const n = thread.length;
  // biome-ignore lint/correctness/useExhaustiveDependencies: scrolls when a line lands
  useEffect(() => scroll.current?.scrollToEnd({ animated: true }), [n]);
  if (n === 0) return null;
  const first = thread.find((l) => l.who === 'her')?.id;
  const lines = thread.map((line) =>
    line.who === 'her' ? (
      <View key={line.id} className="items-end gap-1 self-end pl-8">
        <View
          className="bg-surface-sunk"
          style={{
            borderRadius: 16,
            borderBottomRightRadius: 4,
            paddingVertical: 9,
            paddingHorizontal: 14,
          }}
        >
          <Text
            testID="her-line"
            style={{ fontFamily: fonts.displayItalic, fontSize: 16, lineHeight: 21 }}
          >
            {line.text}
          </Text>
        </View>
        {meta && line.id === first ? meta : null}
      </View>
    ) : line.who === 'robes' || line.who === 'work' ? (
      <View key={line.id} className="flex-row items-start gap-2.5">
        <RobesAvatar working={line.who === 'work'} />
        <Text className="min-w-0 flex-1 text-ink-muted" style={robesLine}>
          {line.text}
        </Text>
      </View>
    ) : (
      <Text key={line.id} size="caption" tone="muted" className="pl-9">
        {line.text}
      </Text>
    ),
  );
  if (compact) {
    return (
      <View className="gap-3" testID={testID ?? 'adjust-thread'} accessibilityLiveRegion="polite">
        {lines}
      </View>
    );
  }
  return (
    <ScrollView
      ref={scroll}
      style={{ maxHeight: 256 }}
      contentContainerClassName="gap-3 px-1.5"
      testID={testID ?? 'adjust-thread'}
      accessibilityLiveRegion="polite"
    >
      {lines}
    </ScrollView>
  );
}

const fb = copy.draftLook.feedback;
const THUMB = 30;
const CHIP = 28;

function Thumb({
  icon,
  label,
  verdict,
  mine,
  onPress,
  testID,
}: {
  icon: IconName;
  label: string;
  // The open question's answer so far, and whether this thumb is it.
  verdict: 'ask' | 'up' | 'down';
  mine: boolean;
  onPress: () => void;
  testID: string;
}) {
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: mine, disabled: verdict !== 'ask' }}
      onPress={onPress}
      hitSlop={7}
      testID={testID}
      className={`items-center justify-center rounded-pill ${
        mine ? 'border-token-line bg-surface-sunk' : 'border-warm-line bg-surface-raised'
      }`}
      style={{
        width: THUMB,
        height: THUMB,
        borderWidth: 1,
        opacity: verdict !== 'ask' && !mine ? 0.35 : 1,
      }}
    >
      <Icon name={icon} size={14} color={mine ? ink : muted} />
    </Pressable>
  );
}

// The two thumbs that answer Robes' question (pins 14, 20): beside the question in the sheet and
// on the closed bar alike.
export function Thumbs({ adjust }: { adjust: Pick<Adjust, 'state' | 'thumb'> }) {
  const { verdict } = adjust.state;
  if (!verdict) return null;
  return (
    <View className="flex-row items-center" style={{ gap: 10 }}>
      <Thumb
        icon="thumbsUp"
        label={fb.up}
        verdict={verdict}
        mine={verdict === 'up'}
        onPress={() => adjust.thumb('up')}
        testID="thumb-up"
      />
      <Thumb
        icon="thumbsDown"
        label={fb.down}
        verdict={verdict}
        mine={verdict === 'down'}
        onPress={() => adjust.thumb('down')}
        testID="thumb-down"
      />
    </View>
  );
}

// A reason to pick (pin 12): 28pt, white on the warm line; Restyle it all on the sunk cream with
// no ring. Picked (`on`), it is a token in the prompt box: the sunk cream inside the umber ring,
// with its × (pin 11).
function ReasonChip({
  label,
  on,
  restyle = false,
  onPress,
  testID,
}: {
  label: string;
  on: boolean;
  restyle?: boolean;
  onPress: () => void;
  testID: string;
}) {
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={on ? fb.remove(label) : label}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8 }}
      testID={testID}
      className={`flex-row items-center rounded-pill ${
        on
          ? 'border-token-line bg-surface-sunk'
          : restyle
            ? 'border-transparent bg-surface-sunk'
            : 'border-warm-line bg-surface-raised'
      }`}
      style={{
        height: CHIP,
        borderWidth: 1,
        gap: on ? 4 : 6,
        paddingLeft: on ? 9 : 11,
        paddingRight: on ? 6 : 11,
      }}
    >
      {restyle ? <Icon name="refresh" size={11} color={on ? ink : muted} /> : null}
      <Text
        className={on ? 'text-ink' : 'text-ink-muted'}
        style={{ fontFamily: fonts.sans, fontSize: on ? 11 : 12 }}
      >
        {label}
      </Text>
      {on ? <Icon name="close" size={10} color={ink} /> : null}
    </Pressable>
  );
}

// Robes' one question about the look as it stands (look prompt PRD F3–F8): two thumbs answer it;
// after a thumbs down, what to change — up to three reasons, or Restyle it all alone on a draft
// Robes made. A reason she picks leaves this list for the prompt box (FeedbackTokens). A thumbs
// up ends it there. Web twin: components/looks/adjust-dock.tsx.
export function Feedback({
  adjust,
  weather,
  canRestyle,
  pieces,
}: {
  adjust: Pick<Adjust, 'state' | 'thumb' | 'reason' | 'restyleAll' | 'piece'>;
  // The look carries a weather (a draft for a day, its chip standing): F14.
  weather: boolean;
  canRestyle: boolean;
  // The look's pieces, for Which piece? (docked prompt PRD Q6).
  pieces: readonly WhichPiece[];
}) {
  const { question, verdict } = adjust.state;
  if (!question || !verdict) return null;
  return (
    <View className="gap-3" testID="look-feedback">
      <View className="flex-row items-start gap-2.5">
        <RobesAvatar />
        <Text
          accessibilityLiveRegion="polite"
          className="min-w-0 flex-1 text-ink-muted"
          style={robesLine}
        >
          {question}
        </Text>
        <Thumbs adjust={adjust} />
      </View>
      {verdict === 'down' ? (
        <>
          <View className="flex-row items-start gap-2.5">
            <RobesAvatar />
            <Text className="min-w-0 flex-1 text-ink-muted" style={robesLine}>
              {fb.change}
            </Text>
          </View>
          <Answers adjust={adjust} weather={weather} canRestyle={canRestyle} pieces={pieces} />
        </>
      ) : null}
    </View>
  );
}

// What she can answer a thumbs down with (F8, Q6): the reasons not yet picked, Restyle it all
// set apart, and Which piece? with the look's pieces while she is choosing one. In the thread
// under "What should change?", and on the bar under the same line, so folding the thread never
// hides them. Web twin: components/looks/adjust-dock.tsx Answers.
export function Answers({
  adjust,
  weather,
  canRestyle,
  pieces,
}: {
  adjust: Pick<Adjust, 'state' | 'reason' | 'restyleAll' | 'piece'>;
  weather: boolean;
  canRestyle: boolean;
  pieces: readonly WhichPiece[];
}) {
  const { verdict, restyle, choosingPiece } = adjust.state;
  if (verdict !== 'down') return null;
  const open = openReasons(adjust.state, { weather });
  return (
    <>
      {open.length > 0 || (canRestyle && !restyle) ? (
        <View className="flex-row flex-wrap pl-9" style={{ gap: 6 }} testID="feedback-reasons">
          {open.map((r) => (
            <ReasonChip
              key={r}
              label={fb.reasons[r].label}
              on={false}
              onPress={() => adjust.reason(r)}
              testID={`reason-${r}`}
            />
          ))}
          {canRestyle && !restyle ? (
            <ReasonChip
              label={fb.restyle.label}
              on={false}
              restyle
              onPress={adjust.restyleAll}
              testID="reason-restyle"
            />
          ) : null}
        </View>
      ) : null}
      {choosingPiece ? <PieceChoice pieces={pieces} onPick={adjust.piece} /> : null}
    </>
  );
}

export interface WhichPiece {
  key: string;
  name: string;
  image: PieceImage | null;
}

const PIECE_CHIP = 56;

// Which piece? (docked prompt PRD Q6): one chip per piece in the look, its photograph only, the
// piece's name its label; a tap drops "Not the {piece}" into the field. Web twin:
// components/looks/adjust-dock.tsx PieceChoice.
function PieceChoice({
  pieces,
  onPick,
}: {
  pieces: readonly WhichPiece[];
  onPick: (key: string) => void;
}) {
  return (
    <>
      <View className="flex-row items-start gap-2.5">
        <RobesAvatar />
        <Text
          accessibilityLiveRegion="polite"
          className="min-w-0 flex-1 text-ink-muted"
          style={robesLine}
        >
          {fb.whichPiece}
        </Text>
      </View>
      <View className="flex-row flex-wrap pl-9" style={{ gap: 6 }} testID="which-piece">
        {pieces.map((p) => (
          <Pressable
            key={p.key}
            accessibilityRole="button"
            accessibilityLabel={p.name}
            onPress={() => onPick(p.key)}
            testID={`which-piece-${p.key}`}
            className="overflow-hidden rounded-xl border-warm-line bg-surface-raised"
            style={{ width: PIECE_CHIP, borderWidth: 1 }}
          >
            <Photo piece={{ id: p.key, image: p.image }} width={PIECE_CHIP} />
          </Pressable>
        ))}
      </View>
    </>
  );
}

// What she picked after a thumbs down, standing in the prompt box beside the sources (pin 11):
// a tap on one takes it out again.
export function FeedbackTokens({
  adjust,
}: {
  adjust: Pick<Adjust, 'state' | 'reason' | 'restyleAll' | 'pieceToken'>;
}) {
  const { reasons, restyle } = adjust.state;
  if (reasons.length === 0 && !restyle) return null;
  return (
    <>
      {reasons.map((r) => (
        <ReasonChip
          key={r}
          label={r === 'piece' && adjust.pieceToken ? adjust.pieceToken : fb.reasons[r].label}
          on
          onPress={() => adjust.reason(r)}
          testID={`reason-${r}`}
        />
      ))}
      {restyle ? (
        <ReasonChip
          label={fb.restyle.label}
          on
          restyle
          onPress={adjust.restyleAll}
          testID="reason-restyle"
        />
      ) : null}
    </>
  );
}
