import { buildUser as buildUserV1 } from './v1';

// v2: legacy sync 2026-10-13 — the label never carries the brand.
export * from './v1';
export const VERSION = 2;

export const LABEL_RULE_V1 = `"label": concise item name (e.g. "Camel wool coat", "Grey straight-leg jeans")`;
export const LABEL_RULE = `${LABEL_RULE_V1} — never the brand; the brand goes in "brand" alone ("Ballet sneakers", not "Miu Miu ballet sneakers")`;

export function buildUser(): string {
  return buildUserV1().replace(`${LABEL_RULE_V1}\n`, `${LABEL_RULE}\n`);
}
