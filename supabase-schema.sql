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
