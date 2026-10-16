export type SeasonName =
  | 'Light Spring'
  | 'Warm Spring'
  | 'Clear Spring'
  | 'Light Summer'
  | 'True Summer'
  | 'Soft Summer'
  | 'Soft Autumn'
  | 'True Autumn'
  | 'Dark Autumn'
  | 'Clear Winter'
  | 'True Winter'
  | 'Dark Winter';
export type BodyType = 'Hourglass' | 'Pear' | 'Rectangle' | 'Inverted Triangle' | 'Apple';
export type Undertone = 'Cool' | 'Warm' | 'Neutral-Cool' | 'Neutral-Warm';
export type Contrast = 'Low' | 'Medium' | 'High' | 'Extremely High';
export type Level = 'Low' | 'Medium' | 'High';
export type MetalName =
  | 'Gold'
  | 'Yellow gold'
  | 'Bronze'
  | 'Rose gold'
  | 'Copper'
  | 'Silver'
  | 'Platinum'
  | 'White gold'
  | 'Pewter'
  | 'Chrome';

export interface Swatch {
  name: string;
  hex: string;
}

// Catalog records keep the legacy snake_case keys: they are persisted in style_profiles as-is.
export interface Season {
  family: 'warm' | 'cool';
  voice: string;
  summary: string;
  palette: string[][];
  neutrals: Swatch[];
  stars: Swatch[];
  accents: Swatch[];
  avoid: Swatch[];
  avoid_note: string;
  metals: { finish: string; approved: string[]; prohibited: string[] };
  metals_note: string;
  proof_best: string;
  proof_less: string;
  seen_on_you: { lifts: string; flattens: string }[];
}

export interface Body {
  label: string;
  profile: string;
  summary: string;
  traits: string[];
  dresses: { name: string; note: string }[];
  necklines: string[];
  tips: string[];
  maxims: string[];
}

// What the model extracts from photos; anything may be missing or malformed.
export interface ColourPrimitives {
  undertone?: unknown;
  contrast?: unknown;
  chroma?: unknown;
  lightness?: unknown;
  season?: unknown;
  season_reasoning?: unknown;
  low_confidence?: unknown;
  skin_tone_hex?: unknown;
  hair_color_hex?: unknown;
  eye_color_hex?: unknown;
}

export interface BodyPrimitives {
  shoulder_waist?: unknown;
  hip_waist?: unknown;
  shoulder_hip?: unknown;
  loose_clothing?: unknown;
  body_shape?: unknown;
  shape_reasoning?: unknown;
}
