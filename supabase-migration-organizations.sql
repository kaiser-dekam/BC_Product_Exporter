-- ============================================================================
-- Migration: Single-user  →  Organizations (multi-user)
-- ----------------------------------------------------------------------------
-- Converts the per-user data model into an Organization model where many users
-- share one workspace. Roles:
--   * Site admin  → profiles.role = 'admin' (unchanged, reserved for the owner of the site)
--   * Owner       → organization_members.org_role = 'owner'  (controls org settings + billing)
--   * Editor      → organization_members.org_role = 'editor' (uses features, no org settings)
--
-- Strategy: every existing user becomes the Owner of their own new organization,
-- and all of that user's data is re-scoped to that organization. The legacy
-- `collaborator_emails` sharing is converted into Editor memberships.
--
-- Safe to run on an existing database. Idempotent — re-running will not create
-- duplicate orgs, memberships, or columns.
--
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New Query).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. organizations  (one shared workspace; holds the settings that used to
--    live on profiles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL DEFAULT '',
  owner_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Shared BigCommerce credentials (per-field AES-GCM blob; migrated off profiles)
  bigcommerce_credentials      JSONB DEFAULT NULL,

  -- Shared Anthropic key
  anthropic_api_key_encrypted  TEXT DEFAULT NULL,
  anthropic_iv                 TEXT DEFAULT NULL,
  anthropic_auth_tag           TEXT DEFAULT NULL,

  -- Shared Claude + export preferences
  claude_system_prompt         TEXT DEFAULT NULL,
  csv_preferences              JSONB DEFAULT NULL,
  book_preferences             JSONB NOT NULL DEFAULT '{"show_price":true,"show_sale_price":false,"show_cost_price":false,"show_variants":true,"show_price_list":false}',

  -- Store identity + shared sync metadata
  store_name                   TEXT NOT NULL DEFAULT '',
  last_synced_at               TIMESTAMPTZ DEFAULT NULL,
  product_count                INTEGER NOT NULL DEFAULT 0,

  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations (owner_id);

-- ============================================================================
-- 2. organization_members  (who belongs to which org, and their org role)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_members (
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_role   TEXT NOT NULL DEFAULT 'editor' CHECK (org_role IN ('owner', 'editor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members (user_id);

-- ============================================================================
-- 3. organization_invites  (email-based; activated when the invitee signs up
--    or is matched to an existing account)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_invites (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  org_role   TEXT NOT NULL DEFAULT 'editor' CHECK (org_role IN ('owner', 'editor')),
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, email)
);

CREATE INDEX IF NOT EXISTS idx_org_invites_email ON organization_invites (lower(email));

-- ============================================================================
-- 4. updated_at trigger for organizations
-- ============================================================================
DROP TRIGGER IF EXISTS trg_organizations_updated_at ON organizations;
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. Backfill: one organization per existing user (they become the Owner),
--    copying the shared settings off their profile.
-- ============================================================================
INSERT INTO organizations (
  name, owner_id,
  bigcommerce_credentials,
  anthropic_api_key_encrypted, anthropic_iv, anthropic_auth_tag,
  claude_system_prompt, csv_preferences, book_preferences,
  store_name, last_synced_at, product_count
)
SELECT
  COALESCE(NULLIF(p.store_name, ''), NULLIF(p.full_name, ''), 'My Organization'),
  p.id,
  p.bigcommerce_credentials,
  p.anthropic_api_key_encrypted, p.anthropic_iv, p.anthropic_auth_tag,
  p.claude_system_prompt, p.csv_preferences, p.book_preferences,
  p.store_name, p.last_synced_at, p.product_count
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM organizations o WHERE o.owner_id = p.id
);

-- Owner memberships for every org.
INSERT INTO organization_members (org_id, user_id, org_role)
SELECT o.id, o.owner_id, 'owner'
FROM organizations o
ON CONFLICT (org_id, user_id) DO NOTHING;

-- Convert legacy collaborator_emails into Editor memberships of the owner's org.
-- (A user who was a collaborator AND owns their own org will end up in two orgs;
--  the app resolves the owned org first. Owners can clean this up from the Team UI.)
INSERT INTO organization_members (org_id, user_id, org_role)
SELECT o.id, collab.id, 'editor'
FROM profiles owner_p
JOIN organizations o   ON o.owner_id = owner_p.id
CROSS JOIN LATERAL unnest(COALESCE(owner_p.collaborator_emails, '{}')) AS ce(email)
JOIN profiles collab   ON lower(collab.email) = lower(ce.email)
WHERE collab.id <> owner_p.id
ON CONFLICT (org_id, user_id) DO NOTHING;

-- ============================================================================
-- 6. Add organization_id to every user-scoped data table and backfill it from
--    the owner's organization. user_id is retained as the row's creator.
-- ============================================================================
DO $$
DECLARE
  tbl TEXT;
  data_tables TEXT[] := ARRAY[
    'product_cache',
    'books',
    'book_versions',
    'product_snapshots',
    'product_tags',
    'product_tag_assignments',
    'description_drafts',
    'inventory_sheets',
    'inventory_stores',
    'price_lists'
  ];
BEGIN
  FOREACH tbl IN ARRAY data_tables LOOP
    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE',
      tbl
    );
    EXECUTE format(
      'UPDATE %I t SET organization_id = o.id
         FROM organizations o
        WHERE o.owner_id = t.user_id
          AND t.organization_id IS NULL',
      tbl
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I (organization_id)',
      'idx_' || tbl || '_org', tbl
    );
  END LOOP;
END $$;

-- description_drafts are shared per organization: one draft per (org, product).
-- This unique index lets the API upsert on (organization_id, product_id).
CREATE UNIQUE INDEX IF NOT EXISTS idx_description_drafts_org_product
  ON description_drafts (organization_id, product_id);

-- ============================================================================
-- 7. Row Level Security — re-scope from per-user to per-organization.
--    (Defense-in-depth; the app's service-role client bypasses RLS and the API
--     layer is the primary enforcement point.)
-- ============================================================================

-- Helper: the set of org ids the current user belongs to.
CREATE OR REPLACE FUNCTION auth_org_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM organization_members WHERE user_id = auth.uid();
$$;

-- Helper: true if the current user is an Owner of the given org.
CREATE OR REPLACE FUNCTION auth_is_org_owner(target_org UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
     WHERE org_id = target_org AND user_id = auth.uid() AND org_role = 'owner'
  );
$$;

-- organizations: members read; only owners update.
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organizations_select ON organizations;
CREATE POLICY organizations_select ON organizations
  FOR SELECT USING (id IN (SELECT auth_org_ids()));
DROP POLICY IF EXISTS organizations_update ON organizations;
CREATE POLICY organizations_update ON organizations
  FOR UPDATE USING (auth_is_org_owner(id));

-- organization_members: members can see their org's roster; owners manage it.
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_members_select ON organization_members;
CREATE POLICY org_members_select ON organization_members
  FOR SELECT USING (org_id IN (SELECT auth_org_ids()));
DROP POLICY IF EXISTS org_members_modify ON organization_members;
CREATE POLICY org_members_modify ON organization_members
  FOR ALL USING (auth_is_org_owner(org_id)) WITH CHECK (auth_is_org_owner(org_id));

-- organization_invites: owners manage.
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_invites_all ON organization_invites;
CREATE POLICY org_invites_all ON organization_invites
  FOR ALL USING (auth_is_org_owner(org_id)) WITH CHECK (auth_is_org_owner(org_id));

-- Re-scope the org-shared data tables to organization membership.
DO $$
DECLARE
  tbl TEXT;
  data_tables TEXT[] := ARRAY[
    'product_cache',
    'books',
    'book_versions',
    'product_snapshots',
    'product_tags',
    'product_tag_assignments',
    'description_drafts',
    'inventory_sheets',
    'inventory_stores',
    'price_lists'
  ];
BEGIN
  FOREACH tbl IN ARRAY data_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_org_all', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL
         USING (organization_id IN (SELECT auth_org_ids()))
         WITH CHECK (organization_id IN (SELECT auth_org_ids()))',
      tbl || '_org_all', tbl
    );
  END LOOP;
END $$;

-- Child tables stay parent-scoped, but re-point their RLS through the parent's
-- organization instead of the parent's user_id.
DROP POLICY IF EXISTS snapshot_items_select ON product_snapshot_items;
CREATE POLICY snapshot_items_select ON product_snapshot_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM product_snapshots ps
     WHERE ps.id = snapshot_id AND ps.organization_id IN (SELECT auth_org_ids())
  ));
DROP POLICY IF EXISTS snapshot_items_insert ON product_snapshot_items;
CREATE POLICY snapshot_items_insert ON product_snapshot_items
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM product_snapshots ps
     WHERE ps.id = snapshot_id AND ps.organization_id IN (SELECT auth_org_ids())
  ));

DROP POLICY IF EXISTS price_list_records_select ON price_list_records;
CREATE POLICY price_list_records_select ON price_list_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM price_lists pl
           WHERE pl.id = price_list_id AND pl.organization_id IN (SELECT auth_org_ids()))
);
DROP POLICY IF EXISTS price_list_records_insert ON price_list_records;
CREATE POLICY price_list_records_insert ON price_list_records FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM price_lists pl
           WHERE pl.id = price_list_id AND pl.organization_id IN (SELECT auth_org_ids()))
);
DROP POLICY IF EXISTS price_list_records_delete ON price_list_records;
CREATE POLICY price_list_records_delete ON price_list_records FOR DELETE USING (
  EXISTS (SELECT 1 FROM price_lists pl
           WHERE pl.id = price_list_id AND pl.organization_id IN (SELECT auth_org_ids()))
);

-- ============================================================================
-- 8. Done. user_id columns and collaborator_emails are intentionally left in
--    place for rollback safety; a later migration can drop them once the app
--    has fully cut over to organization_id.
-- ============================================================================
