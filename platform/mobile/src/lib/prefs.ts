import * as SecureStore from 'expo-secure-store';

// A per-viewer pick that outlives the session (a view toggle, say): never a token or anything
// personal. SecureStore is the app's one key-value store (push.ts keeps its asked flag there);
// a failed read or write is quiet — the screen keeps its default for this visit.
export async function readPref(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

// The same read, at once: for a pick the first frame must already show (the wardrobe layout).
export function readPrefNow(key: string): string | null {
  try {
    return SecureStore.getItem(key);
  } catch {
    return null;
  }
}

export async function writePref(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Still switches for this visit.
  }
}
