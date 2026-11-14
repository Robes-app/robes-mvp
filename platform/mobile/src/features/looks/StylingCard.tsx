import { lookbook } from '@robes/copy';
import { ASK_MAX_CHARS, type Source, type Sources } from '@robes/core/looks';
import { Icon } from '@robes/icons/native';
import {
  ErrorText,
  FINE_EDGE,
  fonts,
  IconToggle,
  MIN_TOUCH,
  Text,
  useColor,
} from '@robes/ui-native';
import { type ReactNode, useEffect, useState } from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import { SheetField } from './DraftSheets';

const copy = lookbook.draftLook;
const TURN_MS = 3200;
const SEND = 32;

// The prompt row's placeholder turns through the suggestions while the field is empty.
export function useTurningPlaceholder(lines: readonly string[], on: boolean): string {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!on || lines.length < 2) return;
    const t = setInterval(() => setI((n) => n + 1), TURN_MS);
    return () => clearInterval(t);
  }, [on, lines.length]);
  return lines[i % lines.length] ?? '';
}

// The prompt box (look prompt PRD P1–P8, S1, D1): white on the fine rule, radius 12, no heading.
// The top row holds the two sources — Wardrobe, then Shop — and, on a draft for a day, a hairline
// and the day's place and weather. Then the thread's lines, and the borderless prompt row with
// the round send inside it. The draft and the saved look share it; what a send does is the
// parent's (the brief, the thread, Update look). Web twin:
// app/src/components/looks/styling-card.tsx.
export function StylingCard({
  context,
  sources,
  onSource,
  wardrobeEmpty,
  thread,
  placeholder,
  placeholders,
  value,
  onChange,
  onSend,
  emptySend,
  onDescribe,
  describeLabel,
  busy,
}: {
  context?: ReactNode;
  sources: Sources;
  onSource: (which: Source) => void;
  // She owns nothing: Wardrobe is drawn faded, and a tap on it says why (S3).
  wardrobeEmpty: boolean;
  thread?: ReactNode;
  // One placeholder (a saved look's "add matching shoes…"), or the turning set of the draft.
  placeholder?: string;
  placeholders?: readonly string[];
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  // What a send does on an empty field. `blur`: a draft's send stays ready, sends nothing and the
  // keyboard goes (D5). `send`: she tapped what to change, which stands for her words (F10).
  // Unset: a saved look's send waits for her words (L3).
  emptySend?: 'blur' | 'send';
  onDescribe?: () => void;
  describeLabel?: string;
  busy: boolean;
}) {
  const turning = useTurningPlaceholder(placeholders ?? [], value.length === 0 && !placeholder);
  const hint = placeholder ?? turning ?? copy.placeholder;
  const onInk = useColor('bg');
  const words = value.trim();
  const tooLong = words.length > ASK_MAX_CHARS;
  const ready = !busy && !tooLong && (words.length > 0 || emptySend !== undefined);
  const send = () => {
    if (!ready) return;
    if (!words && emptySend === 'blur') {
      Keyboard.dismiss();
      return;
    }
    onSend();
  };
  return (
    <View
      accessibilityLabel={copy.thread}
      testID="styling-card"
      className="gap-1 rounded-card border-rule-mid bg-surface-raised px-3 pt-3 pb-1"
      style={{ borderWidth: FINE_EDGE }}
    >
      <View className="min-h-7 flex-row items-center gap-2.5">
        <IconToggle
          icon="wardrobe"
          checked={sources.wardrobe}
          onChange={() => onSource('wardrobe')}
          labelOn={copy.sources.wardrobe.on}
          labelOff={wardrobeEmpty ? copy.sources.wardrobe.empty : copy.sources.wardrobe.off}
          faded={wardrobeEmpty}
          testID="source-wardrobe"
        />
        <IconToggle
          icon="bag"
          checked={sources.shop}
          onChange={() => onSource('shop')}
          labelOn={copy.sources.shop.on}
          labelOff={copy.sources.shop.off}
          testID="source-shop"
        />
        {context ? (
          <>
            <View aria-hidden className="h-4 bg-rule-mid" style={{ width: FINE_EDGE }} />
            <View className="min-w-0 flex-1 flex-row">{context}</View>
          </>
        ) : null}
      </View>
      {thread}
      <View className="flex-row items-center gap-2">
        <SheetField
          label={placeholder ?? copy.placeholder}
          placeholder={hint}
          value={value}
          onChange={onChange}
          onSend={send}
          disabled={busy}
          autoFocus={false}
          hardLimit={false}
          testID="draft-prompt"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.send}
          accessibilityState={{ disabled: !ready }}
          onPress={send}
          testID="prompt-send"
          className="items-center justify-center"
          style={{
            minWidth: MIN_TOUCH,
            minHeight: MIN_TOUCH,
            marginRight: -(MIN_TOUCH - SEND) / 2,
            opacity: ready ? 1 : 0.3,
          }}
        >
          <View
            className="items-center justify-center rounded-pill bg-ink"
            style={{ width: SEND, height: SEND }}
          >
            <Icon name="send" size={14} color={onInk} />
          </View>
        </Pressable>
      </View>
      {tooLong ? (
        <ErrorText size="caption" className="pb-2">
          {copy.tooLong(ASK_MAX_CHARS)}
        </ErrorText>
      ) : null}
      {onDescribe ? (
        <Pressable
          accessibilityRole="button"
          onPress={onDescribe}
          disabled={busy}
          className="min-h-7 justify-center self-start pb-1"
        >
          <Text size="caption" tone="muted" style={{ textDecorationLine: 'underline' }}>
            {describeLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// Where the prompt box stands (look prompt PRD F23): at the foot of the look, in thumb reach
// whichever tab is up. `open` shows the box, under its head once there is a thread to fold away;
// `pill` is the box minimised to the line it was on; `spark` is the sparkle that opens it again
// (a saved look at rest, a draft after a thumbs up). Web twin:
// app/src/components/looks/styling-card.tsx.
export type DockState = 'open' | 'pill' | 'spark';

export function PromptDock({
  state,
  head,
  line,
  working,
  onOpen,
  onMinimise,
  children,
}: {
  state: DockState;
  head: boolean;
  // What the minimised pill says: Robes' open question, the work in hand, or the invitation.
  line: string;
  working: boolean;
  onOpen: () => void;
  onMinimise: () => void;
  children: ReactNode;
}) {
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  const rose = useColor('accent-inspire');
  const onInk = useColor('bg');
  if (state === 'spark') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.dock.open}
        onPress={onOpen}
        testID="prompt-spark"
        className="items-center justify-center self-end rounded-pill bg-ink"
        style={{ width: MIN_TOUCH, height: MIN_TOUCH }}
      >
        <Icon name="looks" size={18} color={onInk} />
      </Pressable>
    );
  }
  if (state === 'pill') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.dock.expand}
        accessibilityState={{ expanded: false }}
        onPress={onOpen}
        testID="prompt-pill"
        className="flex-row items-center gap-2.5 rounded-pill border-rule-mid bg-surface-raised px-4"
        style={{ minHeight: MIN_TOUCH, borderWidth: FINE_EDGE }}
      >
        <Icon name="looks" size={14} color={working ? rose : ink} />
        <Text
          numberOfLines={1}
          className="min-w-0 flex-1"
          style={{ fontFamily: fonts.display, fontSize: 17 }}
        >
          {line}
        </Text>
        <View style={{ transform: [{ rotate: '180deg' }] }}>
          <Icon name="down" size={12} color={muted} />
        </View>
      </Pressable>
    );
  }
  return (
    <View className="gap-2" testID="prompt-dock">
      {head ? (
        <View className="flex-row items-center gap-3">
          <Text size="caption" tone="muted" className="flex-1 uppercase tracking-[0.22em]">
            {copy.dock.title}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.dock.minimise}
            onPress={onMinimise}
            testID="prompt-minimise"
            className="items-center justify-center"
            style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, marginRight: -4 }}
          >
            <View
              className="items-center justify-center rounded-pill bg-surface-sunk"
              style={{ width: 36, height: 36 }}
            >
              <Icon name="down" size={12} color={muted} />
            </View>
          </Pressable>
        </View>
      ) : null}
      {children}
    </View>
  );
}
