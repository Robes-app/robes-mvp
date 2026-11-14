import { lookbook as copy } from '@robes/copy';
import { ASK_MAX_CHARS, openReasons, type ThreadLine } from '@robes/core/looks';
import { Icon, type IconName } from '@robes/icons/native';
import { fonts, IconButton, Text, useColor } from '@robes/ui-native';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, type ScrollViewInstance, TextInput, View } from 'react-native';
import { nativeAnalytics } from '@/lib/analytics';
import type { Adjust, AdjustSurface } from './adjust';
import { RobesAvatar } from './StylingCard';

const d = copy.draft;

function Sparkle({ working = false }: { working?: boolean }) {
  const ink = useColor('ink');
  const rose = useColor('accent-inspire');
  return <Icon name="looks" size={14} color={working ? rose : ink} />;
}

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
}: {
  adjust: Pick<Adjust, 'state' | 'thumb' | 'reason' | 'restyleAll'>;
  // The look carries a weather (a draft for a day, its chip standing): F14.
  weather: boolean;
  canRestyle: boolean;
}) {
  const { question, verdict, restyle } = adjust.state;
  if (!question || !verdict) return null;
  const open = openReasons(adjust.state, { weather });
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
        </>
      ) : null}
    </View>
  );
}

// What she picked after a thumbs down, standing in the prompt box beside the sources (pin 11):
// a tap on one takes it out again.
export function FeedbackTokens({
  adjust,
}: {
  adjust: Pick<Adjust, 'state' | 'reason' | 'restyleAll'>;
}) {
  const { reasons, restyle } = adjust.state;
  if (reasons.length === 0 && !restyle) return null;
  return (
    <>
      {reasons.map((r) => (
        <ReasonChip
          key={r}
          label={fb.reasons[r].label}
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

function Option({
  label,
  icon,
  ink = false,
  warm = false,
  onPress,
  trailing = false,
}: {
  label: string;
  icon?: 'undo' | 'pencil' | 'forward';
  ink?: boolean;
  warm?: boolean;
  onPress: () => void;
  trailing?: boolean;
}) {
  const fg = useColor(ink ? 'bg' : 'ink');
  const glyph = icon ? <Icon name={icon} size={11} color={fg} /> : null;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={{ top: 9, bottom: 9 }}
      className={`h-[26px] flex-row items-center gap-1.5 rounded-pill border px-2.5 ${
        ink
          ? 'border-ink bg-ink'
          : warm
            ? 'border-selected-line bg-selected'
            : 'border-rule-mid bg-surface-raised'
      }`}
    >
      {trailing ? null : glyph}
      <Text size="caption" className={ink ? 'text-bg' : 'text-ink'} style={{ fontSize: 11 }}>
        {label}
      </Text>
      {trailing ? glyph : null}
    </Pressable>
  );
}

// The options under the thread (design 3b): ↻ Dress it again — ink "Update the model · N" while
// changes are pending — then, on home, ✎ Adjust and View draft ›.
export function AdjustOptions({
  adjust,
  onAdjust,
  adjustOpen = false,
  onView,
}: {
  adjust: Pick<Adjust, 'stale' | 'badge' | 'busy' | 'canRedress' | 'redress' | 'state'>;
  onAdjust?: () => void;
  adjustOpen?: boolean;
  onView?: () => void;
}) {
  if (adjust.busy || adjust.state.asking) return null;
  const redress = adjust.stale || adjust.canRedress;
  if (!redress && !onAdjust && !onView) return null;
  return (
    <View className="flex-row flex-wrap items-center gap-1.5 px-1.5" testID="adjust-options">
      {redress ? (
        <Option
          icon="undo"
          ink={adjust.stale}
          label={adjust.stale ? d.updateModel(adjust.badge) : d.redress}
          onPress={adjust.redress}
        />
      ) : null}
      {onAdjust ? (
        <Option icon="pencil" warm={adjustOpen} label={d.adjustOpt} onPress={onAdjust} />
      ) : null}
      {onView ? <Option icon="forward" trailing label={d.view} onPress={onView} /> : null}
    </View>
  );
}

// The input row: the sparkle, her words in the serif, → once there is text.
export function AdjustField({
  placeholder,
  disabled = false,
  onSend,
  autoFocus = false,
  testID = 'adjust-field',
}: {
  placeholder: string;
  disabled?: boolean;
  onSend: (words: string) => void;
  autoFocus?: boolean;
  testID?: string;
}) {
  const [text, setText] = useState('');
  const ink = useColor('ink');
  const faint = useColor('ink-faint');
  const send = () => {
    const words = text.trim();
    if (!words) return;
    onSend(words);
    setText('');
  };
  return (
    <View className="flex-row items-center gap-2.5 pl-2">
      <Sparkle />
      <TextInput
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        placeholderTextColor={faint}
        value={text}
        maxLength={ASK_MAX_CHARS}
        editable={!disabled}
        autoFocus={autoFocus}
        onChangeText={setText}
        onSubmitEditing={send}
        blurOnSubmit
        returnKeyType="send"
        testID={testID}
        className="min-h-10 flex-1 py-2 text-ink"
        style={{ fontFamily: fonts.displayItalic, fontSize: 17 }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.prompt.send}
        accessibilityState={{ disabled: disabled || !text.trim() }}
        disabled={disabled || !text.trim()}
        onPress={send}
        hitSlop={4}
        className={`size-9 items-center justify-center rounded-pill bg-surface-sunk ${disabled || !text.trim() ? 'opacity-45' : ''}`}
      >
        <Icon name="forward" size={15} color={ink} />
      </Pressable>
    </View>
  );
}

// The dock on a look's page (design 3b): a floating pill "Adjust this look…" with the pending
// count, which opens to the card — the thread, its options and the field. Sits above Discard ·
// Save. Web twin: components/looks/adjust-dock.tsx.
export function AdjustDock({
  adjust,
  name,
  surface,
  disabled = false,
  open: controlledOpen,
  onOpenChange,
}: {
  adjust: Adjust;
  name: string;
  surface: AdjustSurface;
  disabled?: boolean;
  // The saved look's adjust disc opens the dock from the photo (Felix 3e); otherwise it opens itself.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [ownOpen, setOwnOpen] = useState(false);
  const open = controlledOpen ?? ownOpen;
  const setOpen = (next: boolean) => {
    setOwnOpen(next);
    onOpenChange?.(next);
  };
  const ink = useColor('ink');
  const label = copy.prompt.label(name);
  const toggle = (next: boolean) => {
    setOpen(next);
    if (next) nativeAnalytics.track('look_prompt_opened', { surface });
    else
      nativeAnalytics.track('look_prompt_closed', {
        surface,
        turns: adjust.state.thread.filter((l) => l.who === 'her').length,
      });
  };
  if (!open) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => toggle(true)}
        testID="adjust-pill"
        className="h-12 flex-row items-center gap-2.5 rounded-pill bg-surface-raised pr-1.5 pl-4"
        style={{ elevation: 6, shadowColor: ink, shadowOpacity: 0.18, shadowRadius: 14 }}
      >
        <Sparkle />
        <Text
          numberOfLines={1}
          tone="muted"
          className="flex-1"
          style={{ fontFamily: fonts.displayItalic, fontSize: 17 }}
        >
          {adjust.placeholder}
        </Text>
        <View className="size-9 items-center justify-center rounded-pill bg-surface-sunk">
          <Icon name="forward" size={15} color={ink} />
        </View>
      </Pressable>
    );
  }
  return (
    <View
      accessibilityLabel={label}
      testID="adjust-card"
      className="gap-3 rounded-sheet border border-rule-mid bg-surface-raised px-1.5 pt-3 pb-1.5"
      style={{ elevation: 6, shadowColor: ink, shadowOpacity: 0.18, shadowRadius: 14 }}
    >
      <View className="absolute top-0 right-0 z-10">
        <IconButton icon="close" label={copy.prompt.fold} onPress={() => toggle(false)} />
      </View>
      <ThreadLines thread={adjust.state.thread} />
      <AdjustOptions adjust={adjust} />
      <AdjustField
        placeholder={adjust.placeholder}
        disabled={disabled || adjust.busy}
        onSend={adjust.send}
        autoFocus
      />
    </View>
  );
}
