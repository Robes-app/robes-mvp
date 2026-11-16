import { UNRECORDED } from '@robes/analytics';
import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

// What a screen recording never holds: her email and the sign-in code. PostHog's native recorder
// blanks any view labelled UNRECORDED; the label is kept out of the accessibility tree, so a
// screen reader still reads what is inside. Web twin: the UNRECORDED class.
export function Unrecorded({ children, ...props }: ViewProps & { children: ReactNode }) {
  return (
    <View
      {...props}
      accessibilityLabel={UNRECORDED}
      importantForAccessibility="no"
      collapsable={false}
    >
      {children}
    </View>
  );
}
