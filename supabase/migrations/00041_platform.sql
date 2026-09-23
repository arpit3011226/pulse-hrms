-- ============================================================================
-- F33, F35, F47, F49, F50, F53 — platform
-- ============================================================================

-- ── F50: audit trail ────────────────────────────────────────────────────────
--
-- activity_log exists but nothing has ever written to it, and it has no place
-- for the old value. For salary changes and role changes you need to answer
-- "who changed what, when, and what was it before?".
--
-- Done with database triggers rather than application code, because a trigger
-- cannot be bypassed by calling the API directly — which is exactly how the
-- RLS holes found in 00035 would have been exploited.

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  organization_id UUID,
  table_name TEXT NOT NULL,
  record_id UUID,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by UUID,                -- auth.uid() at the time
  changed_at TIMESTAMPTZ DEFAULT now(),
  -- Only the fields that actually changed, with their before and after values
  changed_fields JSONB,
  old_values JSONB,
  new_values JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_org    ON audit_log(organization_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor  ON audit_log(changed_by, changed_at DESC);

CREATE OR REPLACE FUNCTION record_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old   JSONB;
  v_new   JSONB;
  v_diff  JSONB := '{}'::jsonb;
  v_org   UUID;
  k       TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_new := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    v_old := NULL;
    v_new := to_jsonb(NEW);
  ELSE
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    -- Keep only the keys whose value actually changed; an UPDATE that touches
    -- nothing should not produce a row full of noise.
    FOR k IN SELECT jsonb_object_keys(v_new) LOOP
      IF v_new -> k IS DISTINCT FROM v_old -> k THEN
        v_diff := v_diff || jsonb_build_object(k, jsonb_build_object('from', v_old -> k, 'to', v_new -> k));
      END IF;
    END LOOP;
    IF v_diff = '{}'::jsonb THEN
      RETURN NULL;
    END IF;
  END IF;

  v_org := COALESCE((v_new ->> 'organization_id')::uuid, (v_old ->> 'organization_id')::uuid);

  INSERT INTO audit_log (
    organization_id, table_name, record_id, operation,
    changed_by, changed_fields, old_values, new_values
  ) VALUES (
    v_org,
    TG_TABLE_NAME,
    COALESCE((v_new ->> 'id')::uuid, (v_old ->> 'id')::uuid),
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP = 'UPDATE' THEN v_diff ELSE NULL END,
    v_old,
    v_new
  );

  RETURN NULL;
END $$;

-- Audited tables: money, identity and access. Deliberately not everything —
-- auditing attendance punches would bury the rows that matter.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'employee_compensation', 'employee_compensation_components', 'payslips',
    'payroll_runs', 'payroll_approvals', 'payroll_config', 'payroll_adjustments',
    'employees', 'profiles', 'employee_bank_accounts', 'final_settlements',
    'offer_letters', 'employee_exit_records'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%1$s ON %1$I', t);
    EXECUTE format(
      'CREATE TRIGGER audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON %1$I
         FOR EACH ROW EXECUTE FUNCTION record_audit()', t);
  END LOOP;
END $$;

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- The audit trail is only useful if it cannot be edited. Read for admins,
-- write only by the trigger, which runs as definer.
CREATE POLICY "admin_reads_audit" ON audit_log
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );

-- ── F47: notification preferences ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  category TEXT NOT NULL,          -- leave, payroll, performance, helpdesk, ...
  in_app BOOLEAN DEFAULT true,
  email BOOLEAN DEFAULT true,
  -- immediate | daily | weekly | off
  frequency TEXT NOT NULL DEFAULT 'immediate'
    CHECK (frequency IN ('immediate', 'daily', 'weekly', 'off')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (employee_id, category)
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_emp ON notification_preferences(employee_id);

CREATE OR REPLACE TRIGGER set_notif_prefs_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manage_own_notification_prefs" ON notification_preferences
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

-- ── F49: DPDP basics ────────────────────────────────────────────────────────
-- India's Digital Personal Data Protection Act. Three obligations we can
-- actually support: record consent, honour an access request, honour an
-- erasure request.

CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  consent_text TEXT,
  granted BOOLEAN NOT NULL DEFAULT true,
  granted_at TIMESTAMPTZ DEFAULT now(),
  withdrawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT consent_has_subject CHECK (
    (employee_id IS NOT NULL AND candidate_id IS NULL)
    OR (employee_id IS NULL AND candidate_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS data_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('access', 'correction', 'erasure')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  details TEXT,
  response_notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_emp   ON consent_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_data_req_org  ON data_requests(organization_id, status);

CREATE OR REPLACE TRIGGER set_data_requests_updated_at
  BEFORE UPDATE ON data_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_requests   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_or_hr_consent" ON consent_records
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );
CREATE POLICY "hr_manages_consent" ON consent_records
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );

CREATE POLICY "read_own_or_hr_data_requests" ON data_requests
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );
CREATE POLICY "raise_own_data_request" ON data_requests
  FOR INSERT WITH CHECK (
    organization_id = get_user_org_id()
    AND employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );
CREATE POLICY "hr_manages_data_requests" ON data_requests
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );

-- ── F53: location-wise holidays ─────────────────────────────────────────────
-- One list breaks the moment there is a second city: Bengaluru and Delhi do
-- not share every festival. NULL means it applies everywhere.

ALTER TABLE holidays ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS is_optional BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_holidays_location ON holidays(organization_id, location);

-- ── F33: attendance depth ───────────────────────────────────────────────────

ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS clock_in_latitude   NUMERIC(10,7);
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS clock_in_longitude  NUMERIC(10,7);
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS clock_out_latitude  NUMERIC(10,7);
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS clock_out_longitude NUMERIC(10,7);
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS clock_in_source  TEXT DEFAULT 'web';
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS clock_out_source TEXT DEFAULT 'web';
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS is_within_geofence BOOLEAN;

-- Office locations to check a punch against
CREATE TABLE IF NOT EXISTS work_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  latitude  NUMERIC(10,7),
  longitude NUMERIC(10,7),
  geofence_radius_metres INTEGER DEFAULT 200,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, name)
);

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS overtime_applicable BOOLEAN DEFAULT false;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS overtime_after_hours NUMERIC(4,2) DEFAULT 9;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS overtime_multiplier NUMERIC(4,2) DEFAULT 1;

ALTER TABLE work_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_read_work_locations" ON work_locations
  FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "admin_manages_work_locations" ON work_locations
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
  );

-- ── F35: pulse surveys ──────────────────────────────────────────────────────
-- A pulse is a short survey that repeats. Reuses the surveys table rather than
-- building a parallel one.

ALTER TABLE surveys ADD COLUMN IF NOT EXISTS is_pulse BOOLEAN DEFAULT false;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS recurrence TEXT
  CHECK (recurrence IS NULL OR recurrence IN ('weekly', 'fortnightly', 'monthly', 'quarterly'));
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS next_run_date DATE;

CREATE INDEX IF NOT EXISTS idx_surveys_pulse
  ON surveys(organization_id, next_run_date)
  WHERE is_pulse = true;
