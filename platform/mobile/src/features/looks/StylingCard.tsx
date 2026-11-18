import { lookbook } from '@robes/copy';
import { ASK_MAX_CHARS, type DockState, type Source, type Sources } from '@robes/core/looks';
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
import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  View,
} from 'react-native';
import { DockSheet } from '@/components/DockSheet';
import { SheetField } from './DraftSheets';

const copy = lookbook.draftLook;
const TURN_MS = 3200;
const SEND = 32;
const AVATAR = 26;
const DISC = 32;

// The prompt row's placeholder turns through the suggestions while the field is empty.
// Every box turns on one clock (look prompt improvements B8, 16 Nov): the resting box and the
// open sheet's box show the same line, so opening the prompt never jumps back to the first.
const turnNow = () => Math.floor(Date.now() / TURN_MS);
export function useTurningPlaceholder(lines: readonly string[], on: boolean): string {
  const [turn, setTurn] = useState(turnNow);
  useEffect(() => {
    if (!on || lines.length < 2) return;
    setTurn(turnNow());
    // Wakes on the clock's next turn, then on each one after it.
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      t = setTimeout(
        () => {
          setTurn(turnNow());
          next();
        },
        TURN_MS - (Date.now() % TURN_MS),
      );
    };
    next();
    return () => clearTimeout(t);
  }, [on, lines.length]);
  return lines[turn % lines.length] ?? '';
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
  onEmpty,
  card = false,
  boxed = false,
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
  // What a send does on an empty field. `blur`: the send stays ready, sends nothing and the
  // keyboard goes (D5). `minimise`: the same, and the dock folds to the sparkle (docked prompt K6),
  // by `onEmpty`. `send`: she tapped what to change, which stands for her words (F10). Unset: the
  // send waits for her words (L3).
  emptySend?: 'blur' | 'minimise' | 'send';
  onEmpty?: () => void;
  // Drawn as its own white card: the bare sheet before her first send, where no dock card holds it.
  card?: boolean;
  // Inline, in its own white box on the fine rule: the thread's cream sheet, where the row would
  // otherwise float (Annie, 18 Nov). On the bar the dock's white card is the box.
  boxed?: boolean;
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
    if (!words && (emptySend === 'blur' || emptySend === 'minimise')) {
      Keyboard.dismiss();
      if (emptySend === 'minimise') onEmpty?.();
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
        {...(inline ? {} : { label: copy.sources.wardrobe.tip })}
        testID="source-wardrobe"
      />
      <IconToggle
        icon="shop"
        checked={sources.shop}
        onChange={() => onSource('shop')}
        labelOn={copy.sources.shop.on}
        labelOff={copy.sources.shop.off}
        {...(inline ? {} : { label: copy.sources.shop.tip })}
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
        className={boxed ? 'rounded-lg border-rule-mid bg-surface-raised' : undefined}
        style={
          boxed
            ? { borderWidth: 1, paddingVertical: 6, paddingLeft: 8, paddingRight: 6 }
            : { paddingLeft: 4 }
        }
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
      className={card ? 'gap-1 bg-surface-raised px-3 pt-3 pb-1' : 'gap-1 px-1.5 pt-1.5'}
      style={card ? [shadowNative.sheet, { borderRadius: DOCK_RADIUS }] : undefined}
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

const DOCK_RADIUS = 22;
const SPARK = 56;
// SPIKE (phase 3): iOS's own sheet for the dock, in development builds on iOS only.
const SPIKE_SHEET = Platform.OS === 'ios' && __DEV__ && process.env.NODE_ENV !== 'test';
// The room the page keeps at its foot while the sheet's bar stands over it (K9).
const SPIKE_BAR_ROOM = 150;

// The docked prompt (docked prompt PRD K1–K9; designs 1d, 2c): one white card at the look's foot,
// inset from its edges, in three states. `spark`: the round ink button alone, bottom right, with a
// dot while Robes' question waits (K3). `bar`: before her first send the box (the labelled
// sources, the day, a line that opens the field); after it the grabber, Robes' latest line with
// its thumbs (K7), and the sources and field line. `thread`: the app's own bottom sheet over the
// dimmed look — the title and close, the turns scrolling newest-last, the field in focus (K8);
// before her first send (`bare`) it holds only the box she tapped. Typing happens in that sheet,
// which stands on the keyboard: the bar's field line opens it (15 Nov). Web twin:
// app/src/components/looks/styling-card.tsx.
export function PromptDock({
  state,
  first,
  line,
  working,
  thumbs,
  answers,
  dot,
  beside = false,
  conversation,
  turns = 0,
  maxHeight,
  onRestore,
  onExpand,
  onCollapse,
  onMinimise,
  box,
  bare = false,
  children,
}: {
  state: DockState;
  // Before her first send: the box alone, with no grabber and no line from Robes.
  first: boolean;
  // Robes' latest line on the bar: its question, the work in hand, or what it said.
  line: string | null;
  working: boolean;
  thumbs?: ReactNode;
  // After a thumbs down, what she can answer with (the reasons, Which piece?), under the line.
  answers?: ReactNode;
  // Robes' question waits unanswered (K3).
  dot: boolean;
  // The sparkle stands beside the saved look's ink button (design 2c): outlined on white, so the
  // button stays the screen's one ink fill, with no padding of its own.
  beside?: boolean;
  conversation?: ReactNode;
  // How many turns the conversation holds: a new one scrolls it to its end.
  turns?: number;
  // The most the turns may take of the screen before they scroll (pin 15).
  maxHeight?: number;
  // The sparkle back to the bar; the bar up to the thread; the thread down to the bar.
  onRestore: () => void;
  onExpand: () => void;
  onCollapse: () => void;
  // Put away to the sparkle: the thread's close, and a swipe on iOS's own sheet.
  onMinimise?: () => void;
  // The bar's box: the sources, the day's chip, a line that opens the field.
  box: ReactNode;
  // Before her first send on a draft: the sheet holds only the box she tapped (16 Nov, B1).
  bare?: boolean;
  // The sheet's box, its field in focus.
  children: ReactNode;
}) {
  const muted = useColor('ink-muted');
  const onInk = useColor('bg');
  const ink = useColor('ink');
  const rule = useColor('rule-mid');
  const scroll = useRef<ScrollViewInstance>(null);
  const open = state === 'thread';
  // The bar's height, held while the sheet is up so the screen behind never jumps (16 Nov).
  const [restHeight, setRestHeight] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: scrolls when a turn lands
  useEffect(() => {
    scroll.current?.scrollToEnd({ animated: true });
  }, [turns, open]);
  const resting =
    state === 'spark' ? (
      <View
        className="items-end"
        style={beside ? undefined : { paddingHorizontal: 12, paddingBottom: 14 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={dot ? `${copy.dock.open}. ${copy.dock.waiting}` : copy.dock.open}
          onPress={onRestore}
          testID="prompt-spark"
          className={`items-center justify-center rounded-pill ${beside ? 'border-warm-line bg-surface-raised' : 'bg-ink'}`}
          style={[
            shadowNative.float,
            { width: SPARK, height: SPARK, ...(beside ? { borderWidth: 1 } : {}) },
          ]}
        >
          <Icon name="looks" size={20} color={beside ? ink : onInk} />
          {dot ? (
            <View
              aria-hidden
              testID="prompt-spark-dot"
              className="absolute rounded-pill border-bg bg-accent-warm"
              style={{ top: 2, right: 2, width: 12, height: 12, borderWidth: 2 }}
            />
          ) : null}
        </Pressable>
      </View>
    ) : state === 'bar' ? (
      <View style={{ paddingHorizontal: 10, paddingBottom: 10 }}>
        <View
          testID="prompt-bar"
          className="bg-surface-raised"
          style={[shadowNative.sheet, { borderRadius: DOCK_RADIUS, paddingBottom: 10 }]}
        >
          {first ? null : (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.dock.expand}
                onPress={onExpand}
                testID="prompt-expand"
                className="items-center justify-center"
                style={{ height: 24 }}
              >
                <View
                  className="rounded-pill"
                  style={{ width: 36, height: 4, backgroundColor: rule }}
                />
              </Pressable>
              {line ? (
                <View
                  className="flex-row items-center"
                  style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 6, gap: 10 }}
                >
                  <RobesAvatar working={working} />
                  <Text
                    numberOfLines={1}
                    accessibilityLiveRegion="polite"
                    testID="prompt-pill-line"
                    className="min-w-0 flex-1 text-ink-muted"
                    style={{ fontFamily: fonts.sans, fontSize: 15 }}
                  >
                    {line}
                  </Text>
                  {working ? <ActivityIndicator size="small" color={muted} /> : null}
                  {thumbs}
                </View>
              ) : null}
              {answers ? (
                <View className="gap-3" style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                  {answers}
                </View>
              ) : null}
            </>
          )}
          <View style={{ paddingHorizontal: 10 }}>{box}</View>
        </View>
      </View>
    ) : null;
  // The title and close under the sheet's slim handle (Prompt States: 20pt in on the left, 14pt
  // on the right, 4pt under).
  const head = (
    <View className="flex-row items-center gap-3 pb-1" style={{ marginRight: -6 }}>
      <Text
        className="flex-1 uppercase text-ink-muted"
        style={{ fontFamily: fonts.sansMedium, fontSize: 9, letterSpacing: 9 * 0.22 }}
      >
        {copy.dock.title}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.dock.minimise}
        // The close puts the prompt away, to the sparkle (Annie, 18 Nov); the grabber and a tap on
        // the look fold it to the bar.
        onPress={onMinimise ?? onCollapse}
        hitSlop={6}
        testID="prompt-minimise"
        className="items-center justify-center rounded-pill bg-surface-sunk"
        style={{ width: DISC, height: DISC }}
      >
        <Icon name="down" size={14} color={muted} />
      </Pressable>
    </View>
  );
  // SPIKE (docked prompt PRD phase 3): iOS's own sheet holds the bar and the thread, in
  // development builds only; the sparkle stays drawn on the look. The real field is in the sheet
  // at every height (no second sheet to type in), and it never takes the keyboard by itself.
  if (SPIKE_SHEET && onMinimise) {
    const field = isValidElement(children)
      ? cloneElement(children as ReactElement<{ autoFocus?: boolean }>, { autoFocus: false })
      : children;
    return (
      <>
        {state === 'spark' ? resting : <View style={{ height: SPIKE_BAR_ROOM }} />}
        <DockSheet
          open={state !== 'spark'}
          detent={state === 'thread' ? 'thread' : 'bar'}
          onDetent={(d) => (d === 'bar' ? onCollapse() : onExpand())}
          onDismiss={onMinimise}
          barOnly={!conversation}
          testID="prompt-dock"
          bar={
            <View>
              {!first && line ? (
                <View
                  className="flex-row items-center"
                  style={{ paddingHorizontal: 16, paddingBottom: 6, gap: 10 }}
                >
                  <RobesAvatar working={working} />
                  <Text
                    numberOfLines={1}
                    accessibilityLiveRegion="polite"
                    testID="prompt-pill-line"
                    className="min-w-0 flex-1 text-ink-muted"
                    style={{ fontFamily: fonts.sans, fontSize: 15 }}
                  >
                    {line}
                  </Text>
                  {working ? <ActivityIndicator size="small" color={muted} /> : null}
                  {thumbs}
                </View>
              ) : null}
              {answers ? (
                <View className="gap-3" style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                  {answers}
                </View>
              ) : null}
              <View style={{ paddingHorizontal: 10, paddingBottom: 10 }}>{field}</View>
            </View>
          }
          thread={
            <View className="flex-1" style={{ paddingHorizontal: 10 }}>
              {/* The title and close with room around them: below the grabber, away from the
                  sheet's corner, a fine rule under them (spike, 18 Nov). */}
              <View
                className="border-rule-mid"
                style={{
                  paddingLeft: 12,
                  paddingRight: 18,
                  paddingTop: 6,
                  paddingBottom: 12,
                  marginBottom: 8,
                  borderBottomWidth: FINE_EDGE,
                }}
              >
                {head}
              </View>
              {conversation ? (
                <ScrollView
                  ref={scroll}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  className="flex-1"
                  contentContainerClassName="gap-3 px-2.5 pt-1 pb-3"
                  // The newest turn and its answer rows stay in view as they arrive (the reasons
                  // hid under the field after a thumbs down: spike, 18 Nov).
                  onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
                  testID="prompt-conversation"
                >
                  {conversation}
                </ScrollView>
              ) : (
                <View className="flex-1" />
              )}
              <View style={{ paddingBottom: 10 }}>{field}</View>
            </View>
          }
        />
      </>
    );
  }
  return (
    <>
      {resting ? (
        <View onLayout={(e) => setRestHeight(e.nativeEvent.layout.height)}>{resting}</View>
      ) : (
        <View style={{ height: restHeight }} />
      )}
      <Sheet open={open} onClose={onCollapse} floating bare={bare} head={head} testID="prompt-dock">
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
        {children}
      </Sheet>
    </>
  );
}
