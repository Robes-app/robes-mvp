import { lookbook as copy } from '@robes/copy';
import { ASK_MAX_CHARS, type ThreadLine } from '@robes/core/looks';
import { Icon } from '@robes/icons/native';
import { fonts, IconButton, Text, useColor } from '@robes/ui-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, type ScrollViewInstance, TextInput, View } from 'react-native';
import { nativeAnalytics } from '@/lib/analytics';
import type { Adjust, AdjustSurface } from './adjust';

const d = copy.draft;

function Sparkle({ working = false }: { working?: boolean }) {
  const ink = useColor('ink');
  const rose = useColor('accent-inspire');
  return <Icon name="looks" size={14} color={working ? rose : ink} />;
}

// The thread's lines (design 3b): hers right-aligned in the sans, Robes' in the serif, work with
// the sparkle, a filed rule as a caption. Web twin: components/looks/adjust-dock.tsx.
export function ThreadLines({
  thread,
  testID,
}: {
  thread: readonly ThreadLine[];
  testID?: string;
}) {
  const scroll = useRef<ScrollViewInstance>(null);
  const n = thread.length;
  // biome-ignore lint/correctness/useExhaustiveDependencies: scrolls when a line lands
  useEffect(() => scroll.current?.scrollToEnd({ animated: true }), [n]);
  if (n === 0) return null;
  return (
    <ScrollView
      ref={scroll}
      style={{ maxHeight: 256 }}
      contentContainerClassName="gap-3 px-1.5"
      testID={testID ?? 'adjust-thread'}
      accessibilityLiveRegion="polite"
    >
      {thread.map((line) =>
        line.who === 'her' ? (
          <Text key={line.id} size="small" tone="muted" className="self-end pl-6 text-right">
            {line.text}
          </Text>
        ) : line.who === 'robes' ? (
          <Text key={line.id} style={{ fontFamily: fonts.display, fontSize: 17, lineHeight: 22 }}>
            {line.text}
          </Text>
        ) : line.who === 'work' ? (
          <View key={line.id} className="flex-row items-center gap-2">
            <Sparkle working />
            <Text size="small" tone="muted" italic>
              {line.text}
            </Text>
          </View>
        ) : (
          <Text key={line.id} size="caption" tone="muted">
            {line.text}
          </Text>
        ),
      )}
    </ScrollView>
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
}: {
  adjust: Adjust;
  name: string;
  surface: AdjustSurface;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
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
        {adjust.badge ? (
          <View
            accessibilityLabel={d.behind(adjust.badge)}
            className="h-[22px] min-w-[22px] items-center justify-center rounded-pill bg-ink px-1.5"
          >
            <Text size="caption" className="text-bg" style={{ fontSize: 10 }}>
              {adjust.badge}
            </Text>
          </View>
        ) : null}
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
