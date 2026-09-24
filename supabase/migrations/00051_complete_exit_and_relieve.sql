-- Nobody ever became an alumnus.
--
-- The resignation flow moves an exit record through initiated -> notice_period ->
-- clearance_completed, and clearing the last department does that last step on its
-- own. But nothing anywhere set the employee's own status. Every reference to
-- 'resigned' and 'terminated' in the codebase only reads them; nothing writes them.
--
-- So: the alumni directory, which looks for employees with status resigned,
-- terminated, absconding or retired, was permanently empty. mark_as_alumni() was
-- never called, so a leaver's login never became an alumni login. And an
-- ex-employee stayed on the books as "on notice" for ever.
--
-- Found in Phase 7 by walking the retire journey end to end.
--
-- Relieving somebody is deliberate, so it hangs off the exit record reaching
-- 'completed' rather than off a date passing. A trigger rather than app code,
-- because the employee record, the leaving date and the login must move together.

CREATE OR REPLACE FUNCTION relieve_employee_on_exit_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status TEXT;
  v_profile UUID;
BEGIN
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  v_status := CASE NEW.exit_type
    WHEN 'termination'  THEN 'terminated'
    WHEN 'absconding'   THEN 'absconding'
    WHEN 'retirement'   THEN 'retired'
    ELSE 'resigned'   -- resignation, contract_end, mutual_separation
  END;

  UPDATE employees
  SET status = v_status,
      date_of_leaving = COALESCE(NEW.last_working_date, date_of_leaving, CURRENT_DATE)
  WHERE id = NEW.employee_id
  RETURNING profile_id INTO v_profile;

  -- They keep the login, with far less reach. mark_as_alumni() checks its caller,
  -- so the role change is made here directly under the trigger's own rights.
  IF v_profile IS NOT NULL THEN
    UPDATE profiles SET role = 'alumni', is_active = true WHERE id = v_profile;
  END IF;

  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.relieve_employee_on_exit_completion() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_relieve_on_exit_completion ON employee_exit_records;
CREATE TRIGGER trg_relieve_on_exit_completion
  AFTER UPDATE OF status ON employee_exit_records
  FOR EACH ROW EXECUTE FUNCTION relieve_employee_on_exit_completion();

COMMENT ON FUNCTION relieve_employee_on_exit_completion() IS
  'When an exit is completed: set the employee status and leaving date, and move their login to the alumni role.';
