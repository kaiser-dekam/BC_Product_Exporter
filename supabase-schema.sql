-- ============================================================================
-- Supabase Schema for Master Product Manager
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. profiles
-- ============================================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL DEFAULT '',
  full_name   TEXT NOT NULL DEFAULT '',
  store_name  TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),

  -- BigCommerce encrypted credentials (stored as JSON object)
  bigcommerce_credentials  JSONB DEFAULT NULL,

  -- Anthropic encrypted key fields
  anthropic_api_key_encrypted  TEXT DEFAULT NULL,
  anthropic_iv                 TEXT DEFAULT NULL,
  anthropic_auth_tag           TEXT DEFAULT NULL,

  -- Claude preferences
  claude_system_prompt  TEXT DEFAULT NULL,

  -- CSV preferences (stored as JSON)
  csv_preferences  JSONB DEFAULT NULL,

  -- Sales book defaults (price display preferences)
  book_preferences JSONB NOT NULL DEFAULT '{"show_price":true,"show_sale_price":false,"show_cost_price":false,"show_variants":true}',

  -- Collaborator access (emails allowed to see this user's data)
  collaborator_emails TEXT[] NOT NULL DEFAULT '{}',

  -- Sync metadata
  last_synced_at  TIMESTAMPTZ DEFAULT NULL,
  product_count   INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON profiles (role) WHERE role = 'admin';

-- ============================================================================
-- 2. product_cache
-- ============================================================================
CREATE TABLE product_cache (
  id                      TEXT PRIMARY KEY,  -- format: {user_id}_{bigcommerce_product_id}
  user_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bigcommerce_product_id  INTEGER NOT NULL,
  name                    TEXT NOT NULL DEFAULT '',
  sku                     TEXT NOT NULL DEFAULT '',
  price                   NUMERIC(12,2) NOT NULL DEFAULT 0,
  sale_price              NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost_price              NUMERIC(12,2) NOT NULL DEFAULT 0,
  description             TEXT NOT NULL DEFAULT '',
  primary_image_url       TEXT NOT NULL DEFAULT '',
  image_urls              TEXT[] NOT NULL DEFAULT '{}',
  brand_name              TEXT NOT NULL DEFAULT '',
  categories              INTEGER[] NOT NULL DEFAULT '{}',
  category_names          TEXT[] NOT NULL DEFAULT '{}',
  inventory_level         INTEGER NOT NULL DEFAULT 0,
  is_visible              BOOLEAN NOT NULL DEFAULT TRUE,
  availability            TEXT NOT NULL DEFAULT '',
  weight                  NUMERIC(10,4) NOT NULL DEFAULT 0,
  width                   NUMERIC(10,4) NOT NULL DEFAULT 0,
  height                  NUMERIC(10,4) NOT NULL DEFAULT 0,
  depth                   NUMERIC(10,4) NOT NULL DEFAULT 0,
  custom_url              TEXT NOT NULL DEFAULT '',

  -- Claude AI enrichment
  claude_summary          TEXT DEFAULT NULL,
  claude_specs            TEXT DEFAULT NULL,
  claude_weight_dims      TEXT DEFAULT NULL,
  claude_model_used       TEXT DEFAULT NULL,
  summarized_at           TIMESTAMPTZ DEFAULT NULL,

  -- BigCommerce variant snapshots (mapped to ProductVariant format)
  variants                JSONB NOT NULL DEFAULT '[]',

  -- Sync metadata
  synced_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Raw BigCommerce data
  raw_data                JSONB DEFAULT NULL
);

CREATE INDEX idx_product_cache_user_name ON product_cache (user_id, name);
CREATE INDEX idx_product_cache_user_id ON product_cache (user_id);

-- ============================================================================
-- 3. books
-- ============================================================================
CREATE TABLE books (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  cover_config   JSONB NOT NULL DEFAULT '{"background_color":"#0f172a","title_font_size":32,"subtitle":"","logo_url":null}',
  sections       JSONB NOT NULL DEFAULT '[]',
  page_count     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_books_user_updated ON books (user_id, updated_at DESC);

-- ============================================================================
-- 4. site_settings (single-row config table)
-- ============================================================================
CREATE TABLE site_settings (
  id                   TEXT PRIMARY KEY DEFAULT 'global',
  default_claude_model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by           UUID REFERENCES profiles(id) DEFAULT NULL
);

INSERT INTO site_settings (id) VALUES ('global') ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. Auto-update updated_at trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- NOTE: product_cache intentionally has no updated_at trigger.
-- Use synced_at / summarized_at to track when rows were last touched.

-- ============================================================================
-- 6. Row Level Security (defense-in-depth; service role bypasses RLS)
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- product_cache
CREATE POLICY product_cache_select ON product_cache FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY product_cache_insert ON product_cache FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY product_cache_update ON product_cache FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY product_cache_delete ON product_cache FOR DELETE USING (auth.uid() = user_id);

-- books
CREATE POLICY books_select ON books FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY books_insert ON books FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY books_update ON books FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY books_delete ON books FOR DELETE USING (auth.uid() = user_id);

-- site_settings (readable by all authenticated users)
CREATE POLICY site_settings_select ON site_settings FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- 7. book_versions (manual version snapshots for rollback)
-- ============================================================================
CREATE TABLE book_versions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id      UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label        TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  cover_config JSONB NOT NULL DEFAULT '{}',
  sections     JSONB NOT NULL DEFAULT '[]',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_book_versions_book_created ON book_versions (book_id, created_at DESC);

ALTER TABLE book_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY book_versions_select ON book_versions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY book_versions_insert ON book_versions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY book_versions_delete ON book_versions FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 8. Migrations (run these if the schema already exists)
-- ============================================================================

-- Add book_versions table (if not already applied)
-- (Full DDL above in section 7)

-- Add variants column to product_cache
ALTER TABLE product_cache ADD COLUMN IF NOT EXISTS variants JSONB NOT NULL DEFAULT '[]';

-- Add book_preferences to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS book_preferences JSONB NOT NULL DEFAULT '{"show_price":true,"show_sale_price":false,"show_cost_price":false,"show_variants":true}';

-- Add collaborator_emails to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS collaborator_emails TEXT[] NOT NULL DEFAULT '{}';

-- ============================================================================
-- 9. product_snapshots (Time Capsule backup metadata)
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_snapshots (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label          TEXT NOT NULL DEFAULT '',
  product_count  INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_snapshots_user_created
  ON product_snapshots (user_id, created_at DESC);

ALTER TABLE product_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_snapshots_select ON product_snapshots
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY product_snapshots_insert ON product_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY product_snapshots_delete ON product_snapshots
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 10. product_snapshot_items (Time Capsule captured product data)
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_snapshot_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_id   UUID NOT NULL REFERENCES product_snapshots(id) ON DELETE CASCADE,
  product_id    TEXT NOT NULL,
  name          TEXT NOT NULL DEFAULT '',
  sku           TEXT NOT NULL DEFAULT '',
  price         NUMERIC(12,2) NOT NULL DEFAULT 0,
  sale_price    NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost_price    NUMERIC(12,2) NOT NULL DEFAULT 0,
  description   TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_snapshot_items_snapshot
  ON product_snapshot_items (snapshot_id);
CREATE INDEX IF NOT EXISTS idx_snapshot_items_name
  ON product_snapshot_items (snapshot_id, name);

ALTER TABLE product_snapshot_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY snapshot_items_select ON product_snapshot_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM product_snapshots ps WHERE ps.id = snapshot_id AND ps.user_id = auth.uid()
  ));
CREATE POLICY snapshot_items_insert ON product_snapshot_items
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM product_snapshots ps WHERE ps.id = snapshot_id AND ps.user_id = auth.uid()
  ));

-- ============================================================================
-- 11. price_lists (BigCommerce Price List metadata)
-- ============================================================================
CREATE TABLE IF NOT EXISTS price_lists (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  bigcommerce_id   INTEGER DEFAULT NULL,   -- BC price list ID; NULL for manually imported (CSV)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_lists_user ON price_lists (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_price_lists_user_bc_id ON price_lists (user_id, bigcommerce_id) WHERE bigcommerce_id IS NOT NULL;

ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY price_lists_select ON price_lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY price_lists_insert ON price_lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY price_lists_delete ON price_lists FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 12. price_list_records (SKU → price mappings per price list)
-- ============================================================================
CREATE TABLE IF NOT EXISTS price_list_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  price_list_id   UUID NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  sku             TEXT NOT NULL,
  price           NUMERIC(12,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_price_list_records_list_sku ON price_list_records (price_list_id, sku);

ALTER TABLE price_list_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY price_list_records_select ON price_list_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM price_lists pl WHERE pl.id = price_list_id AND pl.user_id = auth.uid())
);
CREATE POLICY price_list_records_insert ON price_list_records FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM price_lists pl WHERE pl.id = price_list_id AND pl.user_id = auth.uid())
);
CREATE POLICY price_list_records_delete ON price_list_records FOR DELETE USING (
  EXISTS (SELECT 1 FROM price_lists pl WHERE pl.id = price_list_id AND pl.user_id = auth.uid())
);

-- Migration: add show_price_list to book_preferences default
-- Run these if the schema already exists:
-- ALTER TABLE profiles ALTER COLUMN book_preferences SET DEFAULT
--   '{"show_price":true,"show_sale_price":false,"show_cost_price":false,"show_variants":true,"show_price_list":false}';
-- ALTER TABLE price_lists ADD COLUMN IF NOT EXISTS bigcommerce_id INTEGER DEFAULT NULL;
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_price_lists_user_bc_id ON price_lists (user_id, bigcommerce_id) WHERE bigcommerce_id IS NOT NULL;

-- ============================================================================
-- user_subscriptions (Stripe billing)
-- ============================================================================
-- One row per user. Webhook upserts on stripe_customer_id.
-- status mirrors Stripe subscription status: active, trialing, past_due,
-- canceled, incomplete, incomplete_expired, unpaid, paused.
-- "grandfathered" is a non-Stripe status used for users that existed before
-- the paywall launch — they get permanent free access.
CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id                 UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id      TEXT UNIQUE,
  stripe_subscription_id  TEXT UNIQUE,
  stripe_price_id         TEXT,
  plan                    TEXT CHECK (plan IN ('monthly', 'yearly')),
  status                  TEXT NOT NULL DEFAULT 'incomplete',
  current_period_end      TIMESTAMPTZ,
  trial_end               TIMESTAMPTZ,
  cancel_at_period_end    BOOLEAN NOT NULL DEFAULT FALSE,
  -- When status flips to past_due, set this so we can grant 3 days of grace.
  past_due_since          TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_customer ON user_subscriptions (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_subscription ON user_subscriptions (stripe_subscription_id);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_subscriptions_select_own ON user_subscriptions
  FOR SELECT USING (user_id = auth.uid());

-- Insert/update only via service role (webhook + checkout API). No client-side writes.

-- One-time grandfather migration: mark all existing users active so they
-- aren't paywalled when this ships. Run AFTER creating the table; safe to re-run.
INSERT INTO user_subscriptions (user_id, status, plan)
SELECT id, 'grandfathered', NULL FROM profiles
ON CONFLICT (user_id) DO NOTHING;
