import { wardrobe } from '@robes/copy';
import { readDraft } from '@robes/core/add-flow';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PieceFieldSheet } from '../src/features/wardrobe/PieceFieldSheet';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const draft = () =>
  readDraft({
    label: 'Cream long-sleeve t-shirt',
    brand: null,
    notes: null,
    categoryL2: null,
    categoryL3: null,
    color: null,
  });

test('a re-render with a fresh copy of the piece keeps what she is typing', async () => {
  const sheet = (piece: ReturnType<typeof draft>) => (
    <SafeAreaProvider initialMetrics={METRICS}>
      <PieceFieldSheet
        piece={piece}
        field="label"
        onClose={() => {}}
        onSave={() => {}}
        saving={false}
      />
    </SafeAreaProvider>
  );
  const { rerender } = await render(sheet(draft()));
  fireEvent.changeText(screen.getByDisplayValue('Cream long-sleeve t-shirt'), 'Cream tee');
  await rerender(sheet(draft()));
  expect(screen.getByDisplayValue('Cream tee')).toBeTruthy();
  expect(screen.getByRole('button', { name: wardrobe.piece.saveField })).toBeEnabled();
});
