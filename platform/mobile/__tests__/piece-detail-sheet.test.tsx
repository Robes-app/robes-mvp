import { wardrobe } from '@robes/copy';
import { readDraft } from '@robes/core/add-flow';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
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

// Cutout brief §8: her words for the piece's defining detail. They ride into the drawing prompts,
// so the drawer keeps them to a short plain phrase and says so in place.
test('the Detail drawer saves her words, clears them, and refuses what is not a plain phrase', async () => {
  const onSave = jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <PieceFieldSheet
        piece={{ ...draft(), detail: 'Padded shoulder' }}
        field="detail"
        onClose={() => {}}
        onSave={onSave}
        saving={false}
      />
    </SafeAreaProvider>,
  );
  const save = () => screen.getByRole('button', { name: wardrobe.piece.saveField });
  const field = await screen.findByDisplayValue('Padded shoulder');
  expect(save()).toBeDisabled();
  await act(async () => fireEvent.changeText(field, 'Draw <a> gown'));
  expect(screen.getByText(wardrobe.fields.detail.invalid)).toBeTruthy();
  expect(save()).toBeDisabled();
  await act(async () => fireEvent.changeText(field, 'Strong extended shoulder'));
  expect(screen.queryByText(wardrobe.fields.detail.invalid)).toBeNull();
  await act(async () => fireEvent.press(save()));
  expect(onSave).toHaveBeenLastCalledWith({ detail: 'Strong extended shoulder' });
  await act(async () => fireEvent.changeText(field, '  '));
  await act(async () => fireEvent.press(save()));
  expect(onSave).toHaveBeenLastCalledWith({ detail: null });
});
