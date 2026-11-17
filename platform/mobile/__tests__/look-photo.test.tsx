import { render, screen } from '@testing-library/react-native';
import { LookPhoto, PERSON_CROP } from '../src/features/looks/LookTile';
import { look, piece } from './support/fixtures';

// A look is a person head to toe, and a phone photo is taller than the frame: the crop keeps the
// head and takes more from the feet (Home cut her hair off, 17 Nov).
test("a look's photograph is cropped from the head down, not the middle", async () => {
  await render(<LookPhoto look={look({ image: piece().image })} width={300} />);
  expect(JSON.stringify(screen.toJSON())).toContain(JSON.stringify(PERSON_CROP));
  expect(PERSON_CROP.top).toBe('20%');
});
