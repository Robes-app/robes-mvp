import type { ReactNode } from 'react';
import { View } from 'react-native';

// A flow's one action, pinned to the foot of the screen above the safe area (StackScreen pads
// the inset) and, inside a KeyboardAvoidingView, above the keyboard (redline "one primary button
// spec"). Web twin: app/src/components/pinned-action.tsx.
export function PinnedAction({ children }: { children: ReactNode }) {
  return <View className="gap-3 border-hairline border-t bg-bg px-6 pt-3 pb-4">{children}</View>;
}
