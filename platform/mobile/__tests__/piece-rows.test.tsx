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

test('additional colours show a dot each, and the print its own square (beta’s rows)', async () => {
  await render(
    <RecordRows
      values={{ ...base, colourShade: 'navy', colourExtra: ['acid', 'saffron'], print: 'stripes' }}
      onField={() => {}}
    />,
  );
  expect(screen.getByTestId('shade-swatch-acid')).toBeTruthy();
  expect(screen.getByTestId('shade-swatch-saffron')).toBeTruthy();
  expect(screen.getByTestId('print-swatch-stripes')).toBeTruthy();
  expect(screen.getByText('Acid · Saffron')).toBeTruthy();
});

test('a plain piece reads Plain with no square, and no extra colours draw no dots', async () => {
  await render(
    <RecordRows values={{ ...base, colourExtra: [], print: null }} onField={() => {}} />,
  );
  expect(screen.getByText(wardrobe.colour.plain)).toBeTruthy();
  expect(screen.queryByTestId(/^print-swatch-/)).toBeNull();
  expect(screen.queryByTestId(/^shade-swatch-/)).toBeNull();
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
