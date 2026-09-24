import type { BodyType, SeasonName } from './types';

// Deterministic 12-season mapping from colour primitives (legacy PRD §4.2).
export function classifySeason(x: {
  undertone?: unknown;
  contrast?: unknown;
  chroma?: unknown;
  lightness?: unknown;
}): SeasonName {
  const { undertone, contrast, chroma, lightness } = x;
  const warm = undertone === 'Warm' || undertone === 'Neutral-Warm';
  const hi = contrast === 'High' || contrast === 'Extremely High';
  if (warm) {
    if (hi) return chroma === 'High' ? 'Clear Spring' : 'Dark Autumn';
    if (contrast === 'Medium') return chroma === 'High' ? 'Warm Spring' : 'True Autumn';
    return lightness === 'High' ? 'Light Spring' : 'Soft Autumn';
  }
  if (contrast === 'Extremely High') return 'Dark Winter';
  if (hi) {
    if (lightness === 'Low') return 'Dark Winter';
    return chroma === 'High' ? 'Clear Winter' : 'True Winter';
  }
  if (contrast === 'Medium') return chroma === 'High' ? 'Clear Winter' : 'True Summer';
  return lightness === 'High' ? 'Light Summer' : 'Soft Summer';
}

export interface BodyClassification {
  body_type: BodyType;
  fallback_applied: boolean;
}

// Ratio thresholds (legacy PRD §5.1); missing or non-numeric ratios count as 1.
export function classifyBody(x: {
  shoulder_waist?: unknown;
  hip_waist?: unknown;
  shoulder_hip?: unknown;
  loose_clothing?: unknown;
}): BodyClassification {
  const sw = Number(x.shoulder_waist) || 1;
  const hw = Number(x.hip_waist) || 1;
  const sh = Number(x.shoulder_hip) || 1;
  const result = (body_type: BodyType, fallback_applied = false) => ({
    body_type,
    fallback_applied,
  });
  if (sw >= 1.2 && hw >= 1.2 && sh >= 0.9 && sh <= 1.1) return result('Hourglass');
  if (1 / sh >= 1.1 && hw >= 1.2) return result('Pear');
  if (sh >= 1.15 && sw >= 1.2) return result('Inverted Triangle');
  if (sw <= 1 && hw <= 1) return result('Apple');
  const flat = Math.abs(sw - 1) <= 0.1 && Math.abs(hw - 1) <= 0.1 && Math.abs(sh - 1) <= 0.1;
  if (flat) return result('Rectangle', Boolean(x.loose_clothing));
  // Nearest neighbour for shapes between thresholds.
  if (sh > 1.05 && sw > hw) return result('Inverted Triangle');
  if (sh < 0.95 && hw > sw) return result('Pear');
  if (sw >= 1.15 && hw >= 1.15) return result('Hourglass');
  return result('Rectangle', true);
}
