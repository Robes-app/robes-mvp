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

// The canvas's COLOUR tab (3b, PRD §7.3): the main colour and the print carry a small round swatch
// ahead of the name; the additional colours read as words.
test('the main colour and the print show their swatch; the additional colours are words', async () => {
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
  expect(screen.getByTestId('shade-swatch-navy')).toBeTruthy();
  expect(screen.getByTestId('print-swatch-stripes')).toBeTruthy();
  expect(screen.queryByTestId('shade-swatch-acid')).toBeNull();
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
      values={{ ...base, colourShade: 'navy', colourExtra: ['acid'], print: 'stripes' }}
      onField={() => {}}
      reading
    />,
  );
  expect(screen.queryByTestId('shade-swatch-navy')).toBeNull();
  expect(screen.queryByTestId('print-swatch-stripes')).toBeNull();
});
