import { fireEvent, screen, waitFor } from '@testing-library/react-native';

// The look prompt's field lives in its bottom sheet (testing, 15 Nov): at rest the look shows the
// prompt box's line, the closed bar or the sparkle, and a tap on it opens the sheet. Opens it the
// way she does, and hands back the field.
export async function openPrompt() {
  const open = screen.queryByTestId('draft-prompt');
  if (open) return open;
  const door = await waitFor(() => {
    const found =
      screen.queryByTestId('prompt-rest') ??
      screen.queryByTestId('prompt-expand') ??
      screen.queryByTestId('prompt-spark');
    if (!found) throw new Error('the prompt is not on the screen');
    return found;
  });
  await fireEvent.press(door);
  return screen.getByTestId('draft-prompt');
}
