import { type RefObject, useEffect, useState } from 'react';
import { type HostInstance, Keyboard, type KeyboardEvent, Platform } from 'react-native';

// How far the keyboard's top edge rides over a view's bottom edge, both in window coordinates.
export function keyboardOverlap(viewBottom: number, keyboardTop: number): number {
  return Math.max(0, Math.round(viewBottom - keyboardTop));
}

// The keyboard's cover over a view, measured where the view really stands on screen. A form
// sheet starts below the top of the screen, so KeyboardAvoidingView (which measures from the
// sheet's own top) lifts its foot too little and leaves the action under the keyboard. iOS
// only: Android resizes the window for the keyboard itself.
export function useKeyboardOverlap(ref: RefObject<HostInstance | null>): number {
  const [overlap, setOverlap] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const move = (e: KeyboardEvent) => {
      const view = ref.current;
      if (!view) return;
      view.measureInWindow((_x, y, _w, height) => {
        Keyboard.scheduleLayoutAnimation(e);
        setOverlap(keyboardOverlap(y + height, e.endCoordinates.screenY));
      });
    };
    const hide = (e: KeyboardEvent) => {
      Keyboard.scheduleLayoutAnimation(e);
      setOverlap(0);
    };
    const subs = [
      Keyboard.addListener('keyboardWillShow', move),
      Keyboard.addListener('keyboardWillChangeFrame', move),
      Keyboard.addListener('keyboardWillHide', hide),
    ];
    return () => {
      for (const s of subs) s.remove();
    };
  }, [ref]);
  return overlap;
}
