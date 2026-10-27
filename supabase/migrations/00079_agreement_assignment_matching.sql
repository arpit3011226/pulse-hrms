-- ============================================================================
-- Which documents does THIS person have to sign?
--
-- Until now everybody got all six, because nothing read the assignment rules.
-- The rule lives here rather than in the browser: it decides what somebody is
-- legally bound by, and it must give the same answer to the signing screen,
-- to HR's view and to any report. It is also plain Postgres, so it survives
-- the move to Azure.
--
-- How a rule matches: every field that is filled in must match the employee.
-- A field left null is not a condition. So a rule with everything null means
-- "everybody", a rule with only designation_id means "anybody with that job
-- title", and a rule with department and employment type means both must
-- hold.
--
-- A template with NO rules at all applies to everybody. That is deliberate.
-- The alternative — no rules means nobody — would mean an NDA written and
-- switched on, with the rules forgotten, quietly reaching nobody and nobody
-- finding out. A document issued too widely is noticed and corrected in a
-- day; one that was never issued is noticed when somebody tries to enforce
-- it.
-- ============================================================================

CREATE OR REPLACE FUNCTION agreements_for_employee(p_employee UUID)
RETURNS TABLE (template_id UUID, is_mandatory BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH emp AS (
    SELECT id, organization_id, department_id, designation_id, employment_type
    FROM employees
    WHERE id = p_employee
  )
  SELECT
    t.id,
    -- If several rules reach the same person, the strictest wins. Being asked
    -- to sign something you could have skipped is a smaller problem than
    -- skipping something you could not.
    COALESCE(bool_or(r.is_mandatory), true) AS is_mandatory
  FROM agreement_templates t
  CROSS JOIN emp e
  LEFT JOIN agreement_assignment_rules r
    ON r.template_id = t.id
   AND (r.department_id   IS NULL OR r.department_id   = e.department_id)
   AND (r.designation_id  IS NULL OR r.designation_id  = e.designation_id)
   AND (r.employment_type IS NULL OR r.employment_type = e.employment_type)
  WHERE t.organization_id = e.organization_id
    AND t.is_active
    AND (
      -- matched by at least one rule …
      r.id IS NOT NULL
      -- … or has no rules at all, which means everybody
      OR NOT EXISTS (
        SELECT 1 FROM agreement_assignment_rules r2 WHERE r2.template_id = t.id
      )
    )
  GROUP BY t.id, t.sort_order
  ORDER BY t.sort_order;
$$;

COMMENT ON FUNCTION agreements_for_employee(UUID) IS
  'Which agreement templates apply to one person, from the assignment rules. A template with no rules applies to everybody — a document that silently reaches nobody is the worse failure.';

REVOKE ALL ON FUNCTION agreements_for_employee(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION agreements_for_employee(UUID) TO authenticated;
