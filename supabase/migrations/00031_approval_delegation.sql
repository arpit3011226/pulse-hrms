-- ============================================================================
-- F44 — Approval delegation
--
-- When an approver is away, everything waiting on them stops. This lets a
-- manager nominate someone to cover their approvals for a date range, without
-- changing the reporting line.
--
-- Delegation is about WHO MAY ACT, not who the person reports to. The
-- reporting manager on the employee record is left untouched, so org charts,
-- reviews and reports are unaffected.
-- ============================================================================

CREATE TABLE IF NOT EXISTS approval_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- the approver who is away
  delegator_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  -- the person covering for them
  delegate_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  reason     TEXT,
  is_active  BOOLEAN DEFAULT true,

  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT delegation_not_self  CHECK (delegator_id <> delegate_id),
  CONSTRAINT delegation_date_order CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_delegations_org       ON approval_delegations(organization_id);
CREATE INDEX IF NOT EXISTS idx_delegations_delegator ON approval_delegations(delegator_id);
CREATE INDEX IF NOT EXISTS idx_delegations_delegate  ON approval_delegations(delegate_id);
CREATE INDEX IF NOT EXISTS idx_delegations_active
  ON approval_delegations(organization_id, start_date, end_date)
  WHERE is_active = true;

CREATE OR REPLACE TRIGGER set_delegations_updated_at
  BEFORE UPDATE ON approval_delegations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Who am I covering for today? ────────────────────────────────────────────
-- Returns the employee ids whose approvals the signed-in user may act on right
-- now. Callers add their own id to this list.

CREATE OR REPLACE FUNCTION get_delegated_manager_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.delegator_id
  FROM approval_delegations d
  JOIN employees me ON me.id = d.delegate_id
  WHERE me.profile_id = auth.uid()
    AND d.is_active = true
    AND CURRENT_DATE BETWEEN d.start_date AND d.end_date;
$$;

COMMENT ON FUNCTION get_delegated_manager_ids() IS
  'F44: employee ids whose approvals the signed-in user may act on today by delegation.';

GRANT EXECUTE ON FUNCTION get_delegated_manager_ids() TO authenticated;

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE approval_delegations ENABLE ROW LEVEL SECURITY;

-- You can see a delegation you set up, or one where you are the cover.
DROP POLICY IF EXISTS "read_own_delegations" ON approval_delegations;
CREATE POLICY "read_own_delegations" ON approval_delegations
  FOR SELECT USING (
    delegator_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    OR delegate_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

-- You can set up and withdraw your own cover.
DROP POLICY IF EXISTS "manage_own_delegations" ON approval_delegations;
CREATE POLICY "manage_own_delegations" ON approval_delegations
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND delegator_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

-- HR and admins can see and arrange cover for anyone — needed when someone is
-- away unexpectedly and cannot set it up themselves.
DROP POLICY IF EXISTS "admin_manage_delegations" ON approval_delegations;
CREATE POLICY "admin_manage_delegations" ON approval_delegations
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );
