import { render, screen } from '@testing-library/react-native';
import { Photo } from '../src/features/wardrobe/PieceCard';
import { cutoutUri } from '../src/lib/images';
import { piece } from './support/fixtures';

// Cutout brief (21 Nov): a piece cut out of her photograph shows as the cutout, whole on white,
// wherever one was made; without one the photograph shows as before.
// Web twin: PieceImage in app/src/components/wardrobe/piece-image.tsx.
const CUTOUT = 'http://m.test/cutout.webp';

test('a piece with a cutout shows it, contained', async () => {
  const p = piece();
  const image = p.image ? { ...p.image, cutout: CUTOUT } : null;
  await render(<Photo piece={{ id: p.id, image }} width={160} aspect="3:4" />);
  // Decorative beside the piece's name, so hidden from a reader.
  expect(screen.getByTestId('piece-cutout', { includeHiddenElements: true })).toBeTruthy();
  expect(cutoutUri(image)).toBe(CUTOUT);
});

test('a piece with none shows its photograph as before', async () => {
  const p = piece();
  await render(<Photo piece={p} width={160} aspect="3:4" />);
  expect(screen.queryByTestId('piece-cutout', { includeHiddenElements: true })).toBeNull();
  expect(cutoutUri(p.image)).toBeNull();
  expect(cutoutUri(null)).toBeNull();
});
