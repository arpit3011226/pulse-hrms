-- ============================================================================
-- F29 — Asset management
--
-- Needed at both ends of the journey: a new joiner is issued a laptop, phone
-- and ID card on day one, and all of it has to come back when they leave. Exit
-- clearance currently has no way to check what someone actually holds.
--
-- Two tables, deliberately:
--   assets             the thing itself, which outlives any one holder
--   asset_assignments  who held it, from when to when
--
-- Keeping the history separate means you can answer "who had this laptop last
-- year?" and "what does this person hold today?" from the same records.
-- ============================================================================

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  asset_code TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'laptop'
    CHECK (asset_type IN ('laptop', 'desktop', 'monitor', 'phone', 'sim',
                          'id_card', 'access_card', 'headset', 'furniture',
                          'vehicle', 'software_licence', 'other')),
  name TEXT NOT NULL,
  make TEXT,
  model TEXT,
  serial_number TEXT,
  purchase_date DATE,
  purchase_cost NUMERIC(12,2),
  warranty_expiry DATE,
  condition TEXT DEFAULT 'good'
    CHECK (condition IN ('new', 'good', 'fair', 'poor', 'damaged')),
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'assigned', 'in_repair', 'retired', 'lost')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, asset_code)
);

CREATE TABLE IF NOT EXISTS asset_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

  assigned_on DATE NOT NULL DEFAULT CURRENT_DATE,
  assigned_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  assignment_notes TEXT,

  returned_on DATE,
  returned_to UUID REFERENCES employees(id) ON DELETE SET NULL,
  return_condition TEXT
    CHECK (return_condition IS NULL OR return_condition IN ('new', 'good', 'fair', 'poor', 'damaged')),
  return_notes TEXT,

  status TEXT NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'returned', 'pending_return', 'not_returned')),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT return_after_assign CHECK (returned_on IS NULL OR returned_on >= assigned_on)
);

CREATE INDEX IF NOT EXISTS idx_assets_org      ON assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_status   ON assets(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_assets_type     ON assets(organization_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_asset_assign_asset ON asset_assignments(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_assign_emp   ON asset_assignments(employee_id);
-- The common question: what does this person hold right now?
CREATE INDEX IF NOT EXISTS idx_asset_assign_open
  ON asset_assignments(employee_id, status)
  WHERE status IN ('assigned', 'pending_return');

-- An asset can only be out with one person at a time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_single_holder
  ON asset_assignments(asset_id)
  WHERE status IN ('assigned', 'pending_return');

CREATE OR REPLACE TRIGGER set_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER set_asset_assignments_updated_at
  BEFORE UPDATE ON asset_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Keep asset.status in step with its assignments ──────────────────────────
-- Without this, someone updates an assignment and the asset list quietly lies
-- about what is available.

CREATE OR REPLACE FUNCTION sync_asset_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_asset UUID := COALESCE(NEW.asset_id, OLD.asset_id);
  still_out INTEGER;
BEGIN
  SELECT count(*) INTO still_out
  FROM asset_assignments
  WHERE asset_id = target_asset
    AND status IN ('assigned', 'pending_return');

  UPDATE assets
  SET status = CASE WHEN still_out > 0 THEN 'assigned' ELSE 'available' END
  WHERE id = target_asset
    -- never override a manual state; those are decisions, not side effects
    AND status NOT IN ('in_repair', 'retired', 'lost');

  RETURN NULL;
END $$;

CREATE OR REPLACE TRIGGER trg_sync_asset_status
  AFTER INSERT OR UPDATE OR DELETE ON asset_assignments
  FOR EACH ROW EXECUTE FUNCTION sync_asset_status();

-- ── What is this person still holding? ──────────────────────────────────────
-- Used by exit clearance so nobody is cleared while a laptop is unaccounted for.

CREATE OR REPLACE FUNCTION get_outstanding_assets(p_employee_id UUID)
RETURNS TABLE (
  assignment_id UUID,
  asset_id      UUID,
  asset_code    TEXT,
  asset_name    TEXT,
  asset_type    TEXT,
  assigned_on   DATE,
  status        TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT aa.id, a.id, a.asset_code, a.name, a.asset_type, aa.assigned_on, aa.status
  FROM asset_assignments aa
  JOIN assets a ON a.id = aa.asset_id
  WHERE aa.employee_id = p_employee_id
    AND aa.status IN ('assigned', 'pending_return')
  ORDER BY aa.assigned_on;
$$;

GRANT EXECUTE ON FUNCTION get_outstanding_assets(UUID) TO authenticated;

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE assets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_read_assets" ON assets;
CREATE POLICY "org_read_assets" ON assets
  FOR SELECT USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "admin_manage_assets" ON assets;
CREATE POLICY "admin_manage_assets" ON assets
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );

-- You can see what you hold; HR and admins see everything.
DROP POLICY IF EXISTS "read_asset_assignments" ON asset_assignments;
CREATE POLICY "read_asset_assignments" ON asset_assignments
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS "admin_manage_asset_assignments" ON asset_assignments;
CREATE POLICY "admin_manage_asset_assignments" ON asset_assignments
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );
