export function recordOf<K extends string, V>(
  keys: readonly K[],
  build: (key: K) => V,
): Record<K, V> {
  const out = {} as Record<K, V>;
  for (const key of keys) out[key] = build(key);
  return out;
}

export function keysOf<K extends string>(record: Record<K, unknown>): K[] {
  return Object.keys(record) as K[];
}
