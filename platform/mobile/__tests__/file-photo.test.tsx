import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { usePhotoFiling } from '../src/features/home/file-photo';
import { mockFetch, renderWithApi } from './support/api';
import { ASSET_ID, PIECE_ID, piece } from './support/fixtures';

jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

function Harness() {
  const { filing, file, reset } = usePhotoFiling();
  return (
    <>
      <Text testID="phase">{filing.phase}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="file"
        onPress={() => void file({ uri: 'file:///tmp/a.jpg', mimeType: 'image/jpeg' })}
      />
      <Pressable accessibilityRole="button" accessibilityLabel="reset" onPress={reset} />
    </>
  );
}

test('a late answer for a photo she removed never comes back into the box', async () => {
  const noop = () => undefined;
  let answer: (v: unknown) => void = noop;
  mockFetch({
    'GET file:///tmp/a.jpg': {},
    'POST /uploads': {
      assetId: ASSET_ID,
      upload: {
        method: 'PUT',
        url: 'http://minio.test/u',
        headers: {},
        expiresAt: '2026-10-01T00:00:00.000Z',
      },
    },
    'PUT /u': {},
    [`POST /uploads/${ASSET_ID}/complete`]: {
      id: ASSET_ID,
      kind: 'wardrobe',
      status: 'pending',
      width: null,
      height: null,
      blurhash: null,
      master: null,
      renditions: [],
    },
    'POST /wardrobe/items/batch': { pieces: [piece({ id: PIECE_ID })], jobs: [] },
  });
  // Hold the batch's answer until she has removed the photo.
  const real = globalThis.fetch;
  globalThis.fetch = ((input: unknown, init?: RequestInit) =>
    String(input).endsWith('/wardrobe/items/batch')
      ? new Promise((resolve) => {
          answer = () => resolve(real(input as string, init));
        })
      : real(input as string, init)) as typeof fetch;
  await renderWithApi(<Harness />);
  await fireEvent.press(screen.getByRole('button', { name: 'file' }));
  // The batch call is in flight, still uploading; then she removes the photo.
  await waitFor(() => expect(answer).not.toBe(noop));
  expect(screen.getByTestId('phase').props.children).toBe('uploading');
  await fireEvent.press(screen.getByRole('button', { name: 'reset' }));
  await act(async () => {
    answer(null);
  });
  await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('idle'));
});
