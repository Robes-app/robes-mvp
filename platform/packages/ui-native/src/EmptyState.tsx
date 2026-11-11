import { Icon, type IconName } from '@robes/icons/native';
import type { GestureResponderEvent } from 'react-native';
import { View } from 'react-native';
import { Button, type ButtonVariant } from './Button';
import { useColor } from './color';
import { cx } from './cx';
import { Em, Heading, Text } from './Text';

export interface EmptyStateProps {
  title: string;
  // The italic phrase that closes the title ("Nothing planned <em>yet.</em>").
  titleEm?: string;
  body?: string;
  action?: {
    label: string;
    onPress: (event: GestureResponderEvent) => void;
    variant?: ButtonVariant;
  };
  // A glyph over the title on a 64pt white disc (the Front Door's empty Lookbook and wardrobe).
  icon?: IconName;
  className?: string;
  testID?: string;
}

// One action at most; outline by default so it never competes with the screen's primary.
export function EmptyState({
  title,
  titleEm,
  body,
  action,
  icon,
  className,
  testID,
}: EmptyStateProps) {
  const ink = useColor('ink');
  return (
    <View
      testID={testID}
      className={cx(
        'items-center gap-3 rounded-soft border border-border-control border-dashed px-6 py-10',
        className,
      )}
    >
      {icon ? (
        <View className="mb-1 size-16 items-center justify-center rounded-pill bg-surface-raised">
          <Icon name={icon} size={22} color={ink} />
        </View>
      ) : null}
      <Heading size="md" className="text-center">
        {title}
        {titleEm ? (
          <>
            {' '}
            <Em>{titleEm}</Em>
          </>
        ) : null}
      </Heading>
      {body ? (
        <Text tone="muted" className="text-center">
          {body}
        </Text>
      ) : null}
      {action ? (
        <Button variant={action.variant ?? 'outline'} onPress={action.onPress} className="mt-3">
          {action.label}
        </Button>
      ) : null}
    </View>
  );
}
