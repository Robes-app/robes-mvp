import * as Haptics from 'expo-haptics';

// The taps iOS answers with a feel: a choice changing (a chip, a day) and a commitment landing (a
// look saved, a day filed). Fire and forget: a device without the engine just stays still.
export const haptic = {
  selection(): void {
    Haptics.selectionAsync().catch(() => {});
  },
  success(): void {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
};
