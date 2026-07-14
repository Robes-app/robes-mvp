-- Wardrobe v2 migration — run once in Supabase SQL editor (Robes_p0)
-- Adds the Hero Rack + richer capture metadata to wardrobe_items and
-- creates the wishlist_items table (save-for-later, distinct from owned).
--
-- The client degrades gracefully when this hasn't run: saves retry without
-- the new columns, the Hero Rack simply never populates, and wishlist saves
-- surface a "try again shortly" toast. Run it before flipping beta traffic.

-- ── wardrobe_items: Hero Rack + progressive capture fields ──────────────
-- hero_position: null = not featured; 1..10 = position on the Hero Rack.
-- The rack is a single curated shelf — season visibility is derived from
-- `seasons` at render time (a hero piece whose seasons exclude the current
-- season rests off the rack until its season returns), so no per-season
-- rack storage is needed.
ALTER TABLE wardrobe_items ADD COLUMN IF NOT EXISTS hero_position SMALLINT;
-- seasons: subset of {'Spring','Summer','Autumn','Winter','Year-round'}.
-- Empty/null is treated as Year-round by the client (filters + hero rack).
ALTER TABLE wardrobe_items ADD COLUMN IF NOT EXISTS seasons TEXT[];
-- occasions: free chip set ('Everyday','Work','Evening','Travel', + custom).
ALTER TABLE wardrobe_items ADD COLUMN IF NOT EXISTS occasions TEXT[];
-- price: optional, private — powers cost-per-wear (price / times_worn).
ALTER TABLE wardrobe_items ADD COLUMN IF NOT EXISTS price NUMERIC(10,2);
-- fit_confidence: 'True to size' | 'Runs small' | 'Runs large'.
ALTER TABLE wardrobe_items ADD COLUMN IF NOT EXISTS fit_confidence TEXT;
-- sentiment: 'Irreplaceable' | 'Would repurchase' — steers suggestions
-- (never suggest donating/replacing an irreplaceable piece).
ALTER TABLE wardrobe_items ADD COLUMN IF NOT EXISTS sentiment TEXT;

CREATE INDEX IF NOT EXISTS idx_wardrobe_hero
  ON wardrobe_items (user_id, hero_position)
  WHERE hero_position IS NOT NULL;

-- ── wishlist_items: pieces she doesn't own yet ───────────────────────────
-- Deliberately a separate table (NOT a status flag on wardrobe_items) so
-- the wardrobe_items_count triggers, closet-injection payloads and styling
-- posture thresholds stay untouched. "I bought this" copies the row into
-- wardrobe_items and deletes it here.
CREATE TABLE IF NOT EXISTS wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  color TEXT,
  brand TEXT,
  note TEXT,
  image_url TEXT,
  price NUMERIC(10,2),
  -- provenance: where she spotted it — 'photo' | 'screenshot' | 'instagram'
  -- | 'substack' | 'url' | 'robes' (Robes-suggested styling gap)
  source_type TEXT NOT NULL DEFAULT 'photo',
  -- human label rendered on the card chip ("Saved from Instagram",
  -- "net-a-porter.com", "Robes suggests")
  source_label TEXT,
  source_url TEXT,
  item_dna JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own their wishlist items" ON wishlist_items;
CREATE POLICY "Users own their wishlist items" ON wishlist_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist_items (user_id);
