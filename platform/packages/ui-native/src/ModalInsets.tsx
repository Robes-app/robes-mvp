import type { ReactNode } from 'react';
import {
  type EdgeInsets,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

// A Modal is a window of its own, but React hands it the insets of the screen that opened it: under
// the native tabs that bottom inset carries the tab bar (83pt on a 17, not the home indicator's
// 34), so every sheet opened from a tab stood ~49pt too tall over empty glass (Annie, 15 Nov, on
// Add pieces against the 3b reference). A provider inside the modal measures the modal's own
// window; it starts from the outer values so nothing jumps, and in tests it keeps them.
export function ModalInsets({ children }: { children: (insets: EdgeInsets) => ReactNode }) {
  const insets = useSafeAreaInsets();
  const frame = useSafeAreaFrame();
  return (
    <SafeAreaProvider initialMetrics={{ frame, insets }}>
      <SafeAreaInsetsContext.Consumer>
        {(own) => children(own ?? insets)}
      </SafeAreaInsetsContext.Consumer>
    </SafeAreaProvider>
  );
}
