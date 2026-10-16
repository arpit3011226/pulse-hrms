-- QA-21 and QA-22: assigning compensation could never work, and failing at it
-- removed the employee's salary.
--
-- Two faults in one flow, found by running a payroll cycle through the screens.
--
-- QA-21. `employee_compensation.created_by` is a foreign key to
-- `employees(id)`, and the dialog passed `profile?.id` — the auth profile id,
-- which is never an employee id. Every attempt came back:
--
--   23503 · insert or update on table "employee_compensation" violates
--   foreign key constraint "employee_compensation_created_by_fkey"
--   Key is not present in table "employees".
--
-- So nobody could assign compensation to anybody. That also explains why no
-- employee had any salary components, and therefore why payroll had nothing
-- to calculate.
--
-- QA-22, the worse half. createEmployeeCompensation marks the existing
-- current row as not-current and *then* inserts the new one, as two separate
-- calls. When the insert failed, the demotion had already happened — leaving
-- the employee with no current compensation at all. Trying to give somebody a
-- salary took away the one they had.
--
-- Both are fixed by doing the whole thing in one function, which is one
-- transaction: the old row is demoted, the new row and its components are
-- written, or nothing happens. `created_by` is resolved here from the caller,
-- so no screen has to know which of the two ids the column wants.
--
-- SECURITY INVOKER on purpose: row-level security still decides who may
-- assign compensation. This fixes a broken write, it does not widen who can
-- make it.

CREATE OR REPLACE FUNCTION assign_employee_compensation(
  p_employee_id         UUID,
  p_salary_structure_id UUID,
  p_annual_ctc          NUMERIC,
  p_monthly_gross       NUMERIC,
  p_effective_from      DATE,
  p_revision_reason     TEXT,
  p_components          JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_org     UUID;
  v_creator UUID;
  v_id      UUID;
BEGIN
  SELECT organization_id INTO v_org FROM employees WHERE id = p_employee_id;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'That employee does not exist.';
  END IF;

  -- The column wants an employee, not a profile. Resolved once, here.
  SELECT id INTO v_creator FROM employees WHERE profile_id = auth.uid();

  UPDATE employee_compensation
  SET is_current = false
  WHERE employee_id = p_employee_id AND is_current;

  INSERT INTO employee_compensation (
    organization_id, employee_id, salary_structure_id, annual_ctc,
    monthly_gross, effective_from, is_current, revision_reason, created_by
  )
  VALUES (
    v_org, p_employee_id, p_salary_structure_id, p_annual_ctc,
    p_monthly_gross, p_effective_from, true,
    NULLIF(btrim(COALESCE(p_revision_reason, '')), ''), v_creator
  )
  RETURNING id INTO v_id;

  IF p_components IS NOT NULL AND jsonb_array_length(p_components) > 0 THEN
    INSERT INTO employee_compensation_components (
      employee_compensation_id, salary_component_id,
      monthly_amount, annual_amount, calculation_type, calculation_value
    )
    SELECT
      v_id,
      (c ->> 'salary_component_id')::UUID,
      COALESCE((c ->> 'monthly_amount')::NUMERIC, 0),
      COALESCE((c ->> 'annual_amount')::NUMERIC, 0),
      COALESCE(c ->> 'calculation_type', 'flat'),
      NULLIF(c ->> 'calculation_value', '')::NUMERIC
    FROM jsonb_array_elements(p_components) AS c;
  END IF;

  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.assign_employee_compensation(UUID, UUID, NUMERIC, NUMERIC, DATE, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_employee_compensation(UUID, UUID, NUMERIC, NUMERIC, DATE, TEXT, JSONB) TO authenticated;

COMMENT ON FUNCTION assign_employee_compensation(UUID, UUID, NUMERIC, NUMERIC, DATE, TEXT, JSONB) IS
  'Assigns compensation and its components in one transaction. Resolves created_by from the caller, which is an employee id, not a profile id.';

-- Put right anybody left without a current salary by the old flow.
UPDATE employee_compensation ec
SET is_current = true
WHERE NOT EXISTS (
  SELECT 1 FROM employee_compensation cur
  WHERE cur.employee_id = ec.employee_id AND cur.is_current
)
AND ec.id = (
  SELECT id FROM employee_compensation x
  WHERE x.employee_id = ec.employee_id
  ORDER BY x.effective_from DESC, x.created_at DESC
  LIMIT 1
);
