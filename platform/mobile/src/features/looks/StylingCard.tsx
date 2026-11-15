import { lookbook } from '@robes/copy';
import { ASK_MAX_CHARS, type Source, type Sources } from '@robes/core/looks';
import { Icon } from '@robes/icons/native';
import { shadowNative } from '@robes/tokens';
import {
  ErrorText,
  FINE_EDGE,
  fonts,
  IconToggle,
  MIN_TOUCH,
  Sheet,
  Text,
  useColor,
} from '@robes/ui-native';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, type ScrollViewInstance, View } from 'react-native';
import { SheetField } from './DraftSheets';

const copy = lookbook.draftLook;
const TURN_MS = 3200;
const SEND = 32;
const AVATAR = 26;
const DISC = 32;

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

// The prompt box (look prompt PRD P1–P8, S1, D1; redline 14 Nov pins 1, 5, 8, 9, 11): white on
// the fine rule and nothing but the sources and the field. Before there is a conversation it
// floats on its own, radius 14, the sources over the field with the day's place and weather
// beside them. `inline`, under a conversation, it is one 50pt row at radius 8: the sources, what
// she picked as tokens, the field and the send. The conversation itself is never inside it. The
// draft and the saved look share it; what a send does is the parent's. Web twin:
// app/src/components/looks/styling-card.tsx.
export function StylingCard({
  context,
  tokens,
  inline = false,
  onOpen,
  autoFocus = false,
  sources,
  onSource,
  wardrobeEmpty,
  placeholder,
  placeholders,
  value,
  onChange,
  onSend,
  emptySend,
  busy,
}: {
  // The day's place and weather, until her first send carries them into the conversation.
  context?: ReactNode;
  // What she picked after a thumbs down, standing in the box beside the sources (pin 11).
  tokens?: ReactNode;
  inline?: boolean;
  // At rest on the look (15 Nov): the field is a line that opens the prompt's sheet, where the
  // real field stands on the keyboard. Nothing is typed into the resting box itself.
  onOpen?: () => void;
  // The sheet's field takes the keyboard as it opens.
  autoFocus?: boolean;
  sources: Sources;
  onSource: (which: Source) => void;
  // She owns nothing: Wardrobe is drawn faded, and a tap on it says why (S3).
  wardrobeEmpty: boolean;
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
  const toggles = (
    <View className="flex-row items-center gap-2">
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
        icon="shop"
        checked={sources.shop}
        onChange={() => onSource('shop')}
        labelOn={copy.sources.shop.on}
        labelOff={copy.sources.shop.off}
        testID="source-shop"
      />
    </View>
  );
  const hintColor = useColor('placeholder');
  const field = onOpen ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={placeholder ?? copy.placeholder}
      onPress={onOpen}
      testID="prompt-rest"
      className="min-w-0 flex-1 justify-center"
      style={{ minHeight: inline ? 38 : 52 }}
    >
      <Text
        numberOfLines={1}
        style={{
          fontFamily: fonts.displayItalic,
          fontSize: 17,
          ...(words ? {} : { color: hintColor }),
        }}
      >
        {words || hint}
      </Text>
    </Pressable>
  ) : (
    <SheetField
      label={placeholder ?? copy.placeholder}
      placeholder={hint}
      value={value}
      onChange={onChange}
      onSend={send}
      disabled={busy}
      autoFocus={autoFocus}
      hardLimit={false}
      faintHint
      minHeight={inline ? 38 : 52}
      testID="draft-prompt"
    />
  );
  // The send is the sparkle on ink (pin 8); at rest the same, at 35%.
  const sendButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={copy.send}
      accessibilityState={{ disabled: !ready }}
      onPress={send}
      testID="prompt-send"
      className="items-center justify-center"
      style={{
        minWidth: MIN_TOUCH,
        minHeight: inline ? 38 : MIN_TOUCH,
        marginRight: -(MIN_TOUCH - SEND) / 2,
        marginLeft: -(MIN_TOUCH - SEND) / 2,
        opacity: ready ? 1 : 0.35,
      }}
    >
      <View
        className="items-center justify-center rounded-pill bg-ink"
        style={{ width: SEND, height: SEND }}
      >
        <Icon name="looks" size={16} color={onInk} />
      </View>
    </Pressable>
  );
  const over = tooLong ? (
    <ErrorText size="caption" className="pb-2">
      {copy.tooLong(ASK_MAX_CHARS)}
    </ErrorText>
  ) : null;
  if (inline) {
    return (
      <View
        accessibilityLabel={copy.thread}
        testID="styling-card"
        className="rounded-lg border-rule-mid bg-surface-raised"
        style={{ borderWidth: 1, paddingVertical: 6, paddingLeft: 8, paddingRight: 6 }}
      >
        <View className="flex-row flex-wrap items-center gap-2" style={{ minHeight: 38 }}>
          {toggles}
          {tokens}
          <View className="min-w-28 flex-1 flex-row items-center gap-2">
            {field}
            {sendButton}
          </View>
        </View>
        {over}
      </View>
    );
  }
  return (
    <View
      accessibilityLabel={copy.thread}
      testID="styling-card"
      className="gap-1 border-rule-mid bg-surface-raised px-3 pt-3 pb-1"
      style={[shadowNative.sheet, { borderWidth: 1, borderRadius: 14 }]}
    >
      <View className="min-h-7 flex-row flex-wrap items-center gap-2.5">
        {toggles}
        {context ? (
          <>
            <View aria-hidden className="h-4 bg-rule-mid" style={{ width: FINE_EDGE }} />
            <View className="min-w-0 flex-1 flex-row">{context}</View>
          </>
        ) : null}
        {tokens}
      </View>
      <View className="flex-row items-center gap-2">
        {field}
        {sendButton}
      </View>
      {over}
    </View>
  );
}

// Robes in the conversation and on the closed bar (pin 18): the sparkle, cream on a 26pt ink disc.
export function RobesAvatar({ working = false }: { working?: boolean }) {
  const onInk = useColor('bg');
  return (
    <View
      aria-hidden
      className="items-center justify-center rounded-pill bg-ink"
      style={{ width: AVATAR, height: AVATAR, opacity: working ? 0.6 : 1 }}
    >
      <Icon name="looks" size={13} color={onInk} />
    </View>
  );
}

// Where the prompt stands (look prompt PRD F23; redline 14 Nov; testing 15 Nov). At rest it
// floats at the look's foot and never takes the keyboard: `box` is the prompt box before there is
// a conversation, `pill` the closed bar — Robes' avatar, the line it is on, the thumbs while
// Robes is asking, the disc that opens it — and `spark` the sparkle (a saved look, a draft after
// a thumbs up). Opened, it is the app's own bottom sheet: anchored to the screen's foot, standing
// on the keyboard, the look dimmed behind it and closed by a tap there — the tracked title and
// the minimise disc, the turns scrolling newest-last, and the box with the field in focus. Web
// twin: app/src/components/looks/styling-card.tsx.
export type DockRest = 'box' | 'pill' | 'spark';

export function PromptDock({
  open,
  rest,
  line,
  working,
  thumbs,
  conversation,
  turns = 0,
  maxHeight,
  onOpen,
  onMinimise,
  box,
  children,
}: {
  open: boolean;
  rest: DockRest;
  // What the closed bar says: Robes' open question, the work in hand, or the invitation.
  line: string;
  working: boolean;
  thumbs?: ReactNode;
  conversation?: ReactNode;
  // How many turns the conversation holds: a new one scrolls it to its end.
  turns?: number;
  // The most the turns may take of the screen before they scroll (pin 15).
  maxHeight?: number;
  onOpen: () => void;
  onMinimise: () => void;
  // The resting prompt box (`rest` "box"): the sources, the day's chip, a line that opens the sheet.
  box?: ReactNode;
  // The sheet's box, its field in focus.
  children: ReactNode;
}) {
  const muted = useColor('ink-muted');
  const onInk = useColor('bg');
  const scroll = useRef<ScrollViewInstance>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: scrolls when a turn lands
  useEffect(() => {
    scroll.current?.scrollToEnd({ animated: true });
  }, [turns, open]);
  const resting = open ? null : rest === 'spark' ? (
    <View className="items-end" style={{ paddingHorizontal: 12, paddingBottom: 14 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.dock.open}
        onPress={onOpen}
        testID="prompt-spark"
        className="items-center justify-center rounded-pill bg-ink"
        style={[shadowNative.float, { width: MIN_TOUCH, height: MIN_TOUCH }]}
      >
        <Icon name="looks" size={18} color={onInk} />
      </Pressable>
    </View>
  ) : rest === 'pill' ? (
    <View style={{ paddingHorizontal: 12, paddingBottom: 14 }}>
      <View
        testID="prompt-pill"
        className="flex-row items-center rounded-pill border-rule-mid bg-surface-raised"
        style={[
          shadowNative.float,
          { minHeight: MIN_TOUCH, padding: 6, gap: 10, borderWidth: FINE_EDGE },
        ]}
      >
        <RobesAvatar working={working} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={line}
          accessibilityState={{ expanded: false }}
          onPress={onOpen}
          hitSlop={{ top: 6, bottom: 6 }}
          testID="prompt-pill-line"
          className="min-w-0 flex-1 justify-center"
          style={{ minHeight: DISC }}
        >
          <Text
            numberOfLines={1}
            className="text-ink-muted"
            style={{ fontFamily: fonts.sans, fontSize: 13 }}
          >
            {line}
          </Text>
        </Pressable>
        {thumbs}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.dock.expand}
          onPress={onOpen}
          hitSlop={6}
          testID="prompt-expand"
          className="items-center justify-center rounded-pill bg-surface-sunk"
          style={{ width: DISC, height: DISC }}
        >
          <View style={{ transform: [{ rotate: '180deg' }] }}>
            <Icon name="down" size={14} color={muted} />
          </View>
        </Pressable>
      </View>
    </View>
  ) : (
    <View style={{ padding: 10 }} testID="prompt-box">
      {box}
    </View>
  );
  return (
    <>
      {resting}
      <Sheet open={open} onClose={onMinimise} floating testID="prompt-dock">
        <View className="flex-row items-center gap-3 pb-2">
          <Text
            className="flex-1 uppercase text-ink-muted"
            style={{ fontFamily: fonts.sansMedium, fontSize: 9, letterSpacing: 9 * 0.22 }}
          >
            {copy.dock.title}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.dock.minimise}
            onPress={onMinimise}
            hitSlop={6}
            testID="prompt-minimise"
            className="items-center justify-center rounded-pill bg-surface-sunk"
            style={{ width: DISC, height: DISC }}
          >
            <Icon name="down" size={14} color={muted} />
          </Pressable>
        </View>
        {conversation ? (
          <ScrollView
            ref={scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={maxHeight ? { maxHeight } : undefined}
            contentContainerClassName="gap-3 pt-1 pb-3"
            testID="prompt-conversation"
          >
            {conversation}
          </ScrollView>
        ) : null}
        {/* The box runs wider than the sheet's own gutter: 10pt from each side (pin 1). */}
        <View style={{ marginHorizontal: -10 }}>{children}</View>
      </Sheet>
    </>
  );
}
