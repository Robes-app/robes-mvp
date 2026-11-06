import { Icon } from '@robes/icons/native';
import { appCaps, Eyebrow, fonts, MIN_TOUCH, Text, useColor } from '@robes/ui-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

// Settings' rows and cards (legacy settings.html .sp-gk / .sp-group / .sp-row): a titled white
// card on a hairline; a row is the serif name, a sans sub, her answer at the right and ›.
// Web twin: app/src/components/settings/settings-chrome.tsx.

// Redlines R6/R7 (2026-11-05): 12pt radius on the firmer hairline, the eyebrow at the smallest caps.
export function SettingsGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View className="gap-2.5">
      {title ? (
        <Eyebrow numberOfLines={1} className="ml-0.5" style={appCaps}>
          {title}
        </Eyebrow>
      ) : null}
      <View
        className="overflow-hidden rounded-soft border-rule-mid bg-surface-raised"
        style={{ borderWidth: 0.5 }}
      >
        {children}
      </View>
    </View>
  );
}

function RowBody({
  label,
  sub,
  value,
  empty,
  tone,
}: {
  label: string;
  sub?: string;
  value?: string;
  empty?: boolean;
  tone?: 'danger';
}) {
  return (
    <>
      <View className="flex-1 gap-1">
        <Text
          tone={tone === 'danger' ? 'danger' : 'ink'}
          style={{ fontFamily: fonts.displayRegular, fontSize: 18 }}
        >
          {label}
        </Text>
        {sub ? (
          <Text size="caption" tone="muted">
            {sub}
          </Text>
        ) : null}
      </View>
      {value ? (
        empty ? (
          <Text tone="faint" italic size="caption" numberOfLines={1} className="max-w-[56%]">
            {value}
          </Text>
        ) : (
          <Text size="small" tone="muted" numberOfLines={1} className="max-w-[56%] text-right">
            {value}
          </Text>
        )
      ) : null}
    </>
  );
}

export function SettingsRow({
  label,
  sub,
  value,
  empty,
  tone,
  external,
  onPress,
  first,
  testID,
}: {
  label: string;
  sub?: string;
  value?: string;
  empty?: boolean;
  tone?: 'danger';
  external?: boolean;
  onPress?: () => void;
  // The card's first row carries no rule above it.
  first?: boolean;
  testID?: string;
}) {
  const muted = useColor('ink-muted');
  // Rows ≥ 62pt, 12/16 padding, a hairline between them (redlines R6).
  const className = `min-h-[62px] flex-row items-center gap-3.5 px-4 py-3 ${first ? '' : 'border-t border-hairline'}`;
  if (!onPress) {
    return (
      <View className={className} testID={testID}>
        <RowBody label={label} sub={sub} value={value} empty={empty} tone={tone} />
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole={external ? 'link' : 'button'}
      accessibilityLabel={[label, value, sub].filter(Boolean).join(', ')}
      onPress={onPress}
      style={{ minHeight: MIN_TOUCH }}
      className={className}
      testID={testID}
    >
      <RowBody label={label} sub={sub} value={value} empty={empty} tone={tone} />
      <Icon name={external ? 'external' : 'forward'} color={muted} size={external ? 14 : 16} />
    </Pressable>
  );
}

// A row with an on/off switch: a 36×22 track, the same as the web's — not the system switch —
// ink-soft when on (ink stays for the one commitment), cream when off; the row is the target. Web
// twin: app/src/components/settings/settings-chrome.tsx SettingsToggleRow.
export function SettingsToggleRow({
  label,
  sub,
  value,
  onChange,
  disabled,
  first,
}: {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  first?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={{ minHeight: MIN_TOUCH, opacity: disabled ? 0.5 : 1 }}
      className={`min-h-[60px] flex-row items-center gap-3.5 px-[18px] py-3.5 ${first ? '' : 'border-t border-hairline'}`}
    >
      <RowBody label={label} sub={sub} />
      <View
        className={`h-[22px] w-9 justify-center rounded-pill border px-[2px] ${value ? 'border-ink-muted bg-ink-muted' : 'border-rule-mid bg-surface-sunk'}`}
      >
        <View
          className="h-4 w-4 rounded-pill bg-surface-raised"
          style={{ transform: [{ translateX: value ? 14 : 0 }] }}
        />
      </View>
    </Pressable>
  );
}
