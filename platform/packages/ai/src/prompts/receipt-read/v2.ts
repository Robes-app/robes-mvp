import { LABEL_RULE, LABEL_RULE_V1 } from '../wardrobe-analyse/v2';
import { SYSTEM as SYSTEM_V1 } from './v1';

// v2: legacy sync 2026-10-13 — the label never carries the brand (inbox.js PIECE_RULES).
export * from './v1';
export const VERSION = 2;

export const SYSTEM = SYSTEM_V1.replace(`${LABEL_RULE_V1}\n`, `${LABEL_RULE}\n`);
