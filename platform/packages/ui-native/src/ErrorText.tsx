import { Icon } from '@robes/icons/native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useColor } from './color';
import { Text } from './Text';

// An error is a sentence in danger with its icon, announced as it lands.
export function ErrorText({
  size = 'body',
  children,
  className,
}: {
  size?: 'body' | 'small' | 'caption';
  children?: ReactNode;
  className?: string;
}) {
  const danger = useColor('danger');
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className={`flex-row items-start gap-2 ${className ?? ''}`}
    >
      <Icon name="alert" size={16} color={danger} />
      <Text size={size} tone="danger" className="flex-1">
        {children}
      </Text>
    </View>
  );
}
