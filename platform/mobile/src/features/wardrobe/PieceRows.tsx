import { wardrobe } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import { Eyebrow, Text, useColor } from '@robes/ui-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

const copy = wardrobe.piece;

// One piece anatomy (legacy Piece_Sheet 01): every fact is a row under a named section, and a
// tap opens that one field's drawer. Nothing on the record is a form. Web twin: piece-rows.tsx.
export function PieceSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Eyebrow>{title}</Eyebrow>
      <View className="overflow-hidden rounded-crisp border border-hairline bg-surface">
        {children}
      </View>
    </View>
  );
}

export function PieceRow({
  label,
  value,
  swatch,
  check,
  onPress,
  note,
  first = false,
}: {
  label: string;
  value?: string | null;
  swatch?: ReactNode;
  // Robes' read here is a guess she should look at: the rose "Check" mark, with its reason.
  check?: string | undefined;
  // No handler means the row is a fact, not a door: no chevron, nothing to press.
  onPress?: () => void;
  note?: string | null;
  first?: boolean;
}) {
  const faint = useColor('ink-faint');
  const body = (
    <View className={`gap-1 px-4 py-3 ${first ? '' : 'border-hairline border-t'}`}>
      <View className="flex-row items-center gap-3">
        <Text size="small" className="flex-1">
          {label}
        </Text>
        {check ? (
          <Text size="caption" className="text-accent-warm">
            {copy.check}
          </Text>
        ) : null}
        {swatch}
        <Text size="small" tone={value ? 'muted' : 'faint'} numberOfLines={1}>
          {value || (onPress ? copy.add : '')}
        </Text>
        {onPress ? <Icon name="forward" size={15} color={faint} /> : null}
      </View>
      {note ? (
        <Text size="caption" tone="muted" italic>
          {note}
        </Text>
      ) : null}
    </View>
  );
  if (!onPress) return body;
  // The row says what it holds as well as what it is, so a reader hears the whole fact.
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value || copy.add}${check ? `. ${check}` : ''}`}
      onPress={onPress}
    >
      {body}
    </Pressable>
  );
}
