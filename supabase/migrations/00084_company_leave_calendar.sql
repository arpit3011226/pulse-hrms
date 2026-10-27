-- ============================================================================
-- Who is away, visible to everybody — without telling everybody why.
--
-- Asked for in UAT: a monthly calendar showing who is on leave on any given
-- day, open to the whole company. That is a reasonable thing to want; you
-- cannot plan a week without it.
--
-- But leave_requests is not readable across the company today, and opening it
-- up wholesale would be wrong. The dates are ordinary working information.
-- The TYPE is not: sick leave, and in time maternity or bereavement leave,
-- says something about a person's health or private life that the whole
-- company has no business reading off a calendar. Under the DPDP Act that is
-- precisely the sort of disclosure to avoid making by accident.
--
-- So this splits the two. Everybody sees who is away and on which days.
-- The reason is shown only to the person themselves, their reporting manager,
-- and HR, leadership or an admin.
--
-- The rule is here rather than in the browser because a browser rule is not a
-- rule — anything calling the API directly would skip it. It is also plain
-- Postgres, so it survives the move to Azure.
-- ============================================================================

CREATE OR REPLACE FUNCTION org_leave_calendar(p_from DATE, p_to DATE)
RETURNS TABLE (
  leave_id        UUID,
  employee_id     UUID,
  employee_name   TEXT,
  avatar_url      TEXT,
  department_name TEXT,
  start_date      DATE,
  end_date        DATE,
  is_half_day     BOOLEAN,
  status          TEXT,
  leave_type_name TEXT,
  can_see_reason  BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org   UUID := get_user_org_id();
  v_role  app_role := get_user_role();
  v_me    UUID;
BEGIN
  -- Candidates and alumni are not staff and have no business in the
  -- company's calendar. 00053 made the same call for the directory.
  IF v_org IS NULL OR v_role IN ('candidate', 'alumni') THEN
    RETURN;
  END IF;

  -- A sane ceiling, so one call cannot ask for a decade.
  IF p_to - p_from > 400 THEN
    RAISE EXCEPTION 'Ask for a shorter period than that.';
  END IF;

  SELECT id INTO v_me FROM employees WHERE profile_id = auth.uid();

  RETURN QUERY
  SELECT
    lr.id,
    lr.employee_id,
    (e.first_name || ' ' || e.last_name)::TEXT,
    e.avatar_url,
    d.name::TEXT,
    lr.start_date,
    lr.end_date,
    COALESCE(lr.is_half_day, false),
    lr.status::TEXT,
    CASE WHEN entitled.ok THEN lt.name::TEXT ELSE NULL END,
    entitled.ok
  FROM leave_requests lr
  JOIN employees e ON e.id = lr.employee_id
  LEFT JOIN departments d ON d.id = e.department_id
  LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
  CROSS JOIN LATERAL (
    SELECT (
      v_role IN ('super_admin', 'hr_admin', 'leadership')
      OR lr.employee_id = v_me
      OR e.reporting_manager_id = v_me
    ) AS ok
  ) entitled
  WHERE lr.organization_id = v_org
    AND lr.status = 'approved'
    -- Overlapping the window, not merely starting in it: somebody away from
    -- the 28th to the 3rd is on leave in both months.
    AND lr.start_date <= p_to
    AND lr.end_date   >= p_from
  ORDER BY lr.start_date, e.first_name;
END $$;

COMMENT ON FUNCTION org_leave_calendar(DATE, DATE) IS
  'Who is away across the company in a date range. Everybody sees the days; only the person, their manager and HR see which kind of leave it is.';

REVOKE ALL ON FUNCTION org_leave_calendar(DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION org_leave_calendar(DATE, DATE) TO authenticated;
