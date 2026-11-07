import { getRandomValues, randomUUID } from 'expo-crypto';

// Hermes in a release build has no global `crypto` (Expo Go and jest provide one). The API client
// mints an idempotency key with crypto.randomUUID() for every idempotent call — uploads, photo
// reads, prompts — so on TestFlight each one threw "Property 'crypto' doesn't exist" before it was
// sent (7 Nov, 0.1.0–0.1.3). Imported first in app/_layout.tsx, before anything can call it.
export function installCrypto(target: { crypto?: Partial<Crypto> } = globalThis): void {
  target.crypto ??= {};
  target.crypto.randomUUID ??= randomUUID as Crypto['randomUUID'];
  target.crypto.getRandomValues ??= getRandomValues as Crypto['getRandomValues'];
}

installCrypto();
