-- Migration: add item_dna JSONB column to wardrobe_items
-- Run once in the Supabase SQL editor (project: Robes_p0)
-- Backward-compatible — existing rows get an empty object, nothing breaks.

ALTER TABLE wardrobe_items
  ADD COLUMN IF NOT EXISTS item_dna JSONB NOT NULL DEFAULT '{}'::jsonb;

-- GIN index for efficient JSONB queries (e.g. filter by formality_tier or vibe_vectors)
CREATE INDEX IF NOT EXISTS idx_wardrobe_item_dna ON wardrobe_items USING gin (item_dna);
