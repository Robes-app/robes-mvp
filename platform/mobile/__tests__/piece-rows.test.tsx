import { wardrobe } from '@robes/copy';
import { readDraft } from '@robes/core/add-flow';
import { render, screen } from '@testing-library/react-native';
import { RecordRows } from '../src/features/wardrobe/PieceRows';

const base = readDraft({
  label: 'Crew neck jumper',
  brand: 'Acne',
  notes: null,
  categoryL2: null,
  categoryL3: null,
  color: null,
});

// The canvas's COLOUR tab (3b, PRD §7.3): four rows of words, no swatches.
test('colours, print and material read as words, each a door to its picker', async () => {
  await render(
    <RecordRows
      values={{ ...base, colourShade: 'navy', colourExtra: ['acid', 'saffron'], print: 'stripes' }}
      onField={() => {}}
    />,
  );
  expect(screen.getByText('Acid · Saffron')).toBeTruthy();
  expect(
    screen.getByRole('button', { name: `${wardrobe.piece.rows.print}: Stripes` }),
  ).toBeTruthy();
  expect(screen.queryByTestId(/^shade-swatch-/)).toBeNull();
  expect(screen.queryByTestId(/^print-swatch-/)).toBeNull();
});

test('an empty colour row reads Add', async () => {
  await render(
    <RecordRows values={{ ...base, colourExtra: [], print: null }} onField={() => {}} />,
  );
  expect(
    screen.getByRole('button', { name: `${wardrobe.piece.rows.print}: ${wardrobe.piece.add}` }),
  ).toBeTruthy();
  expect(
    screen.getByRole('button', { name: `${wardrobe.piece.rows.extra}: ${wardrobe.piece.add}` }),
  ).toBeTruthy();
});

test('while Robes reads, no swatch shows ahead of the words', async () => {
  await render(
    <RecordRows
      values={{ ...base, colourExtra: ['acid'], print: 'stripes' }}
      onField={() => {}}
      reading
    />,
  );
  expect(screen.queryByTestId('shade-swatch-acid')).toBeNull();
  expect(screen.queryByTestId('print-swatch-stripes')).toBeNull();
});
