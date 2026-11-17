import { ui } from '@robes/copy';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DetentSheet } from '../src/components/DetentSheet';

const METRICS = {
  frame: { x: 0, y: 0, width: 402, height: 874 },
  insets: { top: 62, left: 0, right: 0, bottom: 34 },
};
const draw = (sheet: ReactElement) =>
  render(<SafeAreaProvider initialMetrics={METRICS}>{sheet}</SafeAreaProvider>);
test('iOS’s own sheet at two thirds of the screen and full, under its drag indicator, with the one header', async () => {
  const onClose = jest.fn();
  const onDone = jest.fn();
  await draw(
    <DetentSheet
      open
      onClose={onClose}
      title="Pick looks"
      done={{ label: 'Done', onPress: onDone }}
      footer={<Text>Foot</Text>}
      testID="sheet"
    >
      <Text>Body</Text>
    </DetentSheet>,
  );
  expect(screen.getByTestId('sheet-presentation').props.modifiers).toEqual([
    { $type: 'presentationDetents', detents: [{ fraction: 0.66 }, 'large'] },
    { $type: 'presentationDragIndicator', visibility: 'visible' },
    { $type: 'presentationBackground', style: expect.any(String) },
  ]);
  expect(screen.getByTestId('sheet')).toBeTruthy();
  expect(screen.getByRole('header', { name: 'Pick looks' })).toBeTruthy();
  expect(screen.getByText('Body')).toBeTruthy();
  expect(screen.getByText('Foot')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(onDone).toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: ui.close }));
  expect(onClose).toHaveBeenCalled();
});

test('closed, nothing of it is drawn', async () => {
  await draw(
    <DetentSheet open={false} onClose={() => {}} title="Pick looks" testID="sheet">
      <Text>Body</Text>
    </DetentSheet>,
  );
  expect(screen.queryByTestId('sheet')).toBeNull();
});

test('a drill’s back stands in the ×’s place, and the eyebrow and picture sit under the header', async () => {
  const back = jest.fn();
  await draw(
    <DetentSheet
      open
      onClose={() => {}}
      title="Tops"
      leading={<Text onPress={back}>Back to Categories</Text>}
      eyebrow="Add to your diary"
      media={<Text>Look photo</Text>}
      scroll
      testID="sheet"
    >
      <Text>Body</Text>
    </DetentSheet>,
  );
  expect(screen.queryByRole('button', { name: ui.close })).toBeNull();
  await fireEvent.press(screen.getByText('Back to Categories'));
  expect(back).toHaveBeenCalled();
  expect(screen.getByText('Add to your diary')).toBeTruthy();
  expect(screen.getByText('Look photo')).toBeTruthy();
  expect(screen.getByText('Body')).toBeTruthy();
});
