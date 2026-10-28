import { act, renderHook } from '@testing-library/react-native';

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItem: (key: string) => mockStore.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => void mockStore.set(key, value),
}));

type Hook = typeof import('../src/features/wardrobe/layout').useWardrobeLayout;

// Each test loads the hook fresh, as a cold start of the app would.
function freshHook(): Hook {
  let hook: Hook | undefined;
  const react = jest.requireActual('react');
  jest.isolateModules(() => {
    // One React for the renderer and the hook; only the layout module is fresh.
    jest.doMock('react', () => react);
    hook = require('../src/features/wardrobe/layout').useWardrobeLayout;
  });
  if (!hook) throw new Error('layout hook not loaded');
  return hook;
}

beforeEach(() => mockStore.clear());

test('the phone opens on the list until she picks', async () => {
  const { result } = await renderHook(freshHook());
  expect(result.current[0]).toBe('list');
});

test('her grid pick survives a cold start (W8, as the web)', async () => {
  const first = await renderHook(freshHook());
  await act(async () => first.result.current[1]('grid'));
  expect(first.result.current[0]).toBe('grid');
  expect(mockStore.get('robes.wardrobe.layout')).toBe('grid');
  const { result } = await renderHook(freshHook());
  expect(result.current[0]).toBe('grid');
});

test('a stored value that is not a layout falls back to the list', async () => {
  mockStore.set('robes.wardrobe.layout', 'mosaic');
  const { result } = await renderHook(freshHook());
  expect(result.current[0]).toBe('list');
});
