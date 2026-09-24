-- Take personal data off the org-wide readable employees table.
--
-- `employees` is readable by every signed-in member of the organisation, which is
-- right for a staff directory. It also held government identifiers, bank details,
-- date of birth, religion, home addresses and parents' names. Row-level security
-- hides rows, not columns, so every employee could read all of that about every
-- colleague over /rest/v1/employees. Verified before this migration.
--
-- Two tables rather than one, because the audiences differ:
--
--   employee_statutory — identifiers and bank details. Payroll needs these to pay
--     people and to produce the agency file for Form 16, PF and ESI, so
--     payroll_admin can read them. Deliberate, and the same reasoning already
--     applied to compensation in 00038.
--
--   employee_personal — date of birth, religion, addresses, parents' names.
--     Nobody outside HR, admin and leadership has a reason to read these.
--
-- Birthdays: the greeting on the home page and the birthday workflow only need
-- the day and the month. Those two numbers stay on `employees`, kept in step by a
-- trigger, so the year — and therefore the person's age — stays private.

-- ── employee_statutory ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS employee_statutory (
  employee_id     UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pan_number      TEXT,
  aadhar_number   TEXT,
  passport_number TEXT,
  uan_number      TEXT,
  bank_details    JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_statutory_org ON employee_statutory(organization_id);

-- ── employee_personal ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS employee_personal (
  employee_id       UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date_of_birth     DATE,
  religion          TEXT,
  current_address   JSONB,
  permanent_address JSONB,
  father_name       TEXT,
  mother_name       TEXT,
  spouse_name       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_personal_org ON employee_personal(organization_id);

-- ── Move the data across ────────────────────────────────────────────────────

INSERT INTO employee_statutory (employee_id, organization_id, pan_number, aadhar_number, passport_number, uan_number, bank_details)
SELECT id, organization_id, pan_number, aadhar_number, passport_number, uan_number, bank_details
FROM employees
ON CONFLICT (employee_id) DO NOTHING;

INSERT INTO employee_personal (employee_id, organization_id, date_of_birth, religion, current_address, permanent_address, father_name, mother_name, spouse_name)
SELECT id, organization_id, date_of_birth, religion, current_address, permanent_address, father_name, mother_name, spouse_name
FROM employees
ON CONFLICT (employee_id) DO NOTHING;

-- ── Day and month only, so birthdays keep working ───────────────────────────

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS birth_day   SMALLINT,
  ADD COLUMN IF NOT EXISTS birth_month SMALLINT;

COMMENT ON COLUMN employees.birth_day IS
  'Day of birth only. The full date lives in employee_personal; the year is private.';
COMMENT ON COLUMN employees.birth_month IS
  'Month of birth only. The full date lives in employee_personal; the year is private.';

UPDATE employees e
SET birth_day   = EXTRACT(DAY   FROM p.date_of_birth)::SMALLINT,
    birth_month = EXTRACT(MONTH FROM p.date_of_birth)::SMALLINT
FROM employee_personal p
WHERE p.employee_id = e.id AND p.date_of_birth IS NOT NULL;

CREATE OR REPLACE FUNCTION sync_birthday_parts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE employees
  SET birth_day   = CASE WHEN NEW.date_of_birth IS NULL THEN NULL
                         ELSE EXTRACT(DAY FROM NEW.date_of_birth)::SMALLINT END,
      birth_month = CASE WHEN NEW.date_of_birth IS NULL THEN NULL
                         ELSE EXTRACT(MONTH FROM NEW.date_of_birth)::SMALLINT END
  WHERE id = NEW.employee_id;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.sync_birthday_parts() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_birthday_parts ON employee_personal;
CREATE TRIGGER trg_sync_birthday_parts
  AFTER INSERT OR UPDATE OF date_of_birth ON employee_personal
  FOR EACH ROW EXECUTE FUNCTION sync_birthday_parts();

-- ── Drop the columns from the directory table ───────────────────────────────

ALTER TABLE employees
  DROP COLUMN IF EXISTS pan_number,
  DROP COLUMN IF EXISTS aadhar_number,
  DROP COLUMN IF EXISTS passport_number,
  DROP COLUMN IF EXISTS uan_number,
  DROP COLUMN IF EXISTS bank_details,
  DROP COLUMN IF EXISTS date_of_birth,
  DROP COLUMN IF EXISTS religion,
  DROP COLUMN IF EXISTS current_address,
  DROP COLUMN IF EXISTS permanent_address,
  DROP COLUMN IF EXISTS father_name,
  DROP COLUMN IF EXISTS mother_name,
  DROP COLUMN IF EXISTS spouse_name;

-- ── Who may see what ────────────────────────────────────────────────────────

ALTER TABLE employee_statutory ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_personal  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_employee_statutory ON employee_statutory;
CREATE POLICY read_employee_statutory ON employee_statutory
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership', 'payroll_admin')
    )
  );

DROP POLICY IF EXISTS manage_employee_statutory ON employee_statutory;
CREATE POLICY manage_employee_statutory ON employee_statutory
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  )
  WITH CHECK (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

DROP POLICY IF EXISTS read_employee_personal ON employee_personal;
CREATE POLICY read_employee_personal ON employee_personal
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS manage_employee_personal ON employee_personal;
CREATE POLICY manage_employee_personal ON employee_personal
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  )
  WITH CHECK (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('super_admin', 'hr_admin')
  );

-- Keep updated_at honest on both.
DROP TRIGGER IF EXISTS trg_employee_statutory_updated ON employee_statutory;
CREATE TRIGGER trg_employee_statutory_updated
  BEFORE UPDATE ON employee_statutory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_employee_personal_updated ON employee_personal;
CREATE TRIGGER trg_employee_personal_updated
  BEFORE UPDATE ON employee_personal
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE employee_statutory IS
  'Government identifiers and bank details. Readable by the person, HR, admin, leadership and payroll.';
COMMENT ON TABLE employee_personal IS
  'Date of birth, religion, addresses and family names. Readable by the person, HR, admin and leadership.';
