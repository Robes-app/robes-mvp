import { render, screen } from '@testing-library/react-native';
import { LookPhoto, PERSON_CROP } from '../src/features/looks/LookTile';
import { rememberLocalPhoto } from '../src/lib/local-photos';
import { look, piece } from './support/fixtures';

// A look is a person head to toe, and a phone photo is taller than the frame: the crop keeps the
// head and takes more from the feet (Home cut her hair off, 17 Nov).
test("a look's photograph is cropped from the head down, not the middle", async () => {
  await render(<LookPhoto look={look({ image: piece().image })} width={300} />);
  expect(JSON.stringify(screen.toJSON())).toContain(JSON.stringify(PERSON_CROP));
  expect(PERSON_CROP.top).toBe('20%');
});

// Her photograph, just taken, has no renditions yet: the tile shows it from the phone rather than
// standing blank (Home and the Lookbook, 19 Nov).
test('a photograph still being made shows from the phone', async () => {
  const image = {
    assetId: '00000000-0000-4000-8000-000000000001',
    status: 'pending' as const,
    width: null,
    height: null,
    blurhash: null,
    renditions: [],
  };
  rememberLocalPhoto(image.assetId, 'file:///selfie.jpg');
  await render(<LookPhoto look={look({ image })} width={300} />);
  expect(JSON.stringify(screen.toJSON())).toContain('file:///selfie.jpg');
});
