import { lookbook } from '@robes/copy';
import { FINE_EDGE, SwitchPill, Text } from '@robes/ui-native';
import { type ReactNode, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { SheetField } from './DraftSheets';

const copy = lookbook.draftLook;
const TURN_MS = 3200;

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

// The styling card (Front Door PRD rev 3 §4.6, §6.1): white on the fine rule, radius 12, no
// heading. The context row — the day's weather chip at the left, the Shop toggle at the right —
// then the thread's lines and the borderless 52pt prompt row with its turning placeholder. The
// draft and the saved look share it; what the field sends is the parent's (Generate, Update
// look). Web twin: app/src/components/looks/styling-card.tsx.
export function StylingCard({
  context,
  shop,
  onShop,
  thread,
  placeholder,
  placeholders,
  value,
  onChange,
  onSend,
  onDescribe,
  describeLabel,
  busy,
}: {
  context?: ReactNode;
  shop: boolean;
  onShop: (next: boolean) => void;
  thread?: ReactNode;
  // One placeholder (a saved look's "more casual…"), or the turning set of the draft.
  placeholder?: string;
  placeholders?: readonly string[];
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onDescribe?: () => void;
  describeLabel?: string;
  busy: boolean;
}) {
  const turning = useTurningPlaceholder(placeholders ?? [], value.length === 0 && !placeholder);
  const hint = placeholder ?? turning ?? copy.placeholder;
  return (
    <View
      accessibilityLabel={copy.thread}
      testID="styling-card"
      className="gap-1 rounded-card border-rule-mid bg-surface-raised px-3 pt-3 pb-1"
      style={{ borderWidth: FINE_EDGE }}
    >
      <View className="min-h-7 flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row">{context}</View>
        <SwitchPill
          icon="bag"
          label={copy.shop.label}
          checked={shop}
          onChange={onShop}
          hintOn={copy.shop.on}
          hintOff={copy.shop.off}
          testID="shop-toggle"
        />
      </View>
      {thread}
      <View className="flex-row items-center">
        <SheetField
          label={placeholder ?? copy.placeholder}
          placeholder={hint}
          value={value}
          onChange={onChange}
          onSend={onSend}
          disabled={busy}
          autoFocus={false}
          testID="draft-prompt"
        />
      </View>
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
