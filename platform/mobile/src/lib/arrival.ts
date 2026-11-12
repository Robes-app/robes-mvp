import { type NativeStackNavigationProp, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

type StackNav = NativeStackNavigationProp<Record<string, object | undefined>>;

// Longest wait for the stack to report the screen in place before it counts as arrived anyway
// (no native transition: a test, a screen outside a native stack).
export const ARRIVAL_FALLBACK_MS = 1000;

// True once the screen's own transition in has finished. A Sheet (an RN Modal) asked for on mount
// waits for this: presented while its screen was still sliding in, over a draft sheet still
// sliding out, iOS left a see-through layer over the whole app, taking every tap — Back and
// Schedule look dead on a look just saved (Annie, 12 Nov). Call it where the screen mounts, not
// below a loading state, or the event has passed before anyone listens.
export function useArrived(): boolean {
  const navigation = useNavigation<StackNav>();
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    if (arrived) return;
    const done = () => setArrived(true);
    const fallback = setTimeout(done, ARRIVAL_FALLBACK_MS);
    const off = navigation.addListener('transitionEnd', (e) => {
      if (!e.data.closing) done();
    });
    return () => {
      clearTimeout(fallback);
      off();
    };
  }, [arrived, navigation]);
  return arrived;
}

// From a route presented as a sheet, replace it with a page without the sheet's slide down: the
// native stack dismisses the sheet as the page pushes in, both at once, and a sheet still
// dismissing refuses whatever the page presents next. Gone at once, it is long gone before the
// page arrives. The options land a frame ahead of the replace, which removes the sheet.
export function useLeaveSheetFor(): (href: string) => void {
  const navigation = useNavigation<StackNav>();
  const router = useRouter();
  return useCallback(
    (href: string) => {
      navigation.setOptions({ animation: 'none' });
      requestAnimationFrame(() => router.replace(href));
    },
    [navigation, router],
  );
}
