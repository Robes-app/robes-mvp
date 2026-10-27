import { Icon } from '@robes/icons/native';
import { Eyebrow, fonts, MIN_TOUCH, Text, useColor } from '@robes/ui-native';
import type { ReactNode } from 'react';
import { Pressable, Switch, View } from 'react-native';

// Settings' rows and cards (legacy settings.html .sp-gk / .sp-group / .sp-row): a titled white
// card on a hairline; a row is the serif name, a sans sub, her answer at the right and ›.
// Web twin: app/src/components/settings/settings-chrome.tsx.

export function SettingsGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View className="gap-2.5">
      {title ? (
        // One line at 9.5px, tracked .24em, as on the web (redline 27 Oct).
        <Eyebrow
          numberOfLines={1}
          className="ml-0.5"
          style={{ fontSize: 9.5, letterSpacing: 2.28 }}
        >
          {title}
        </Eyebrow>
      ) : null}
      <View className="overflow-hidden rounded-soft border border-hairline bg-surface-raised">
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
          style={{ fontFamily: fonts.displayRegular, fontSize: 17 }}
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
  const faint = useColor('ink-faint');
  const className = `min-h-[60px] flex-row items-center gap-3.5 px-[18px] py-3.5 ${first ? '' : 'border-t border-hairline'}`;
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
      <Icon name={external ? 'external' : 'forward'} color={faint} size={external ? 14 : 16} />
    </Pressable>
  );
}

// A row with an on/off switch (legacy .sp-tog); ink when on.
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
  const ink = useColor('ink');
  const track = useColor('border-control');
  return (
    <View
      className={`min-h-[60px] flex-row items-center gap-3.5 px-[18px] py-3.5 ${first ? '' : 'border-t border-hairline'}`}
    >
      <RowBody label={label} sub={sub} />
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: ink, false: track }}
      />
    </View>
  );
}
