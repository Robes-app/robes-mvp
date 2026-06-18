-- Wardrobe items table
-- Run this in the Supabase SQL editor (project: Robes_p0)

CREATE TABLE IF NOT EXISTS wardrobe_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label        TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'Other',
  color        TEXT,
  brand        TEXT,
  notes        TEXT,
  image_url    TEXT,
  times_worn   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE wardrobe_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their wardrobe items"
  ON wardrobe_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS wardrobe_items_user_id_idx ON wardrobe_items(user_id);
