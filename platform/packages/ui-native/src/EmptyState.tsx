import type { GestureResponderEvent } from 'react-native';
import { View } from 'react-native';
import { Button, type ButtonVariant } from './Button';
import { cx } from './cx';
import { Heading, Text } from './Text';

export interface EmptyStateProps {
  title: string;
  body?: string;
  action?: {
    label: string;
    onPress: (event: GestureResponderEvent) => void;
    variant?: ButtonVariant;
  };
  className?: string;
  testID?: string;
}

// One action at most; secondary by default so it never competes with the screen's primary.
export function EmptyState({ title, body, action, className, testID }: EmptyStateProps) {
  return (
    <View testID={testID} className={cx('items-center gap-3 px-6 py-10', className)}>
      <Heading size="md" className="text-center">
        {title}
      </Heading>
      {body ? (
        <Text tone="muted" className="text-center">
          {body}
        </Text>
      ) : null}
      {action ? (
        <Button variant={action.variant ?? 'secondary'} onPress={action.onPress} className="mt-3">
          {action.label}
        </Button>
      ) : null}
    </View>
  );
}
