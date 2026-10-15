-- QA-04: leave balances were advisory, and nobody was keeping them.
--
-- Two faults, one cause: the arithmetic lived in the browser.
--
--   * `pending_days` was read everywhere to work out what somebody had left,
--     and written nowhere. A pending request reserved nothing, so the screen
--     kept showing the full entitlement while requests piled up against it.
--
--   * `used_days` was written by the browser on approval. If that second call
--     failed, the request was approved and the balance never moved.
--
--   * Nothing checked the entitlement on the way in. The apply form compares
--     against the balance, but a form is not a control: posting straight to
--     the API skipped it entirely.
--
-- Proven before this change, acting as an ordinary employee against the live
-- API: 20 days of casual leave booked against a 12-day entitlement, on top of
-- a 2-day request already pending. Twenty-two days reserved out of twelve, and
-- the screen still read "12 days available".
--
-- The arithmetic moves here, where it cannot be skipped and cannot half-happen:
-- the balance moves in the same transaction as the request, or neither does.
--
-- Balance model, unchanged: available = total + carried_forward - used - pending.
--   pending  — requested, not yet decided
--   used     — approved
-- A rejected or cancelled request holds nothing.

/** What this request currently reserves, by status. */
CREATE OR REPLACE FUNCTION leave_request_weight(p_status TEXT, p_days NUMERIC)
RETURNS TABLE (pending NUMERIC, used NUMERIC)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    CASE WHEN p_status = 'pending'  THEN COALESCE(p_days, 0) ELSE 0 END,
    CASE WHEN p_status = 'approved' THEN COALESCE(p_days, 0) ELSE 0 END;
$$;

REVOKE ALL ON FUNCTION public.leave_request_weight(TEXT, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_request_weight(TEXT, NUMERIC) TO authenticated;

/**
 * Keep leave_balances in step with the requests that move it.
 *
 * Runs for insert, update and delete, and works by reversing whatever the row
 * used to reserve and applying whatever it reserves now. Handling it as a
 * difference rather than as a list of transitions means an unexpected status
 * change cannot leave the balance stranded.
 */
CREATE OR REPLACE FUNCTION maintain_leave_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_old_pending NUMERIC := 0;
  v_old_used    NUMERIC := 0;
  v_new_pending NUMERIC := 0;
  v_new_used    NUMERIC := 0;
  v_employee    UUID;
  v_type        UUID;
  v_year        INTEGER;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    SELECT pending, used INTO v_old_pending, v_old_used
    FROM leave_request_weight(OLD.status, OLD.total_days);
  END IF;

  IF TG_OP <> 'DELETE' THEN
    SELECT pending, used INTO v_new_pending, v_new_used
    FROM leave_request_weight(NEW.status, NEW.total_days);
  END IF;

  -- A request that moved to another type or year has to be taken off the old
  -- balance before it is added to the new one.
  IF TG_OP = 'UPDATE' AND (
       OLD.leave_type_id <> NEW.leave_type_id
       OR EXTRACT(YEAR FROM OLD.start_date) <> EXTRACT(YEAR FROM NEW.start_date)
     ) THEN
    UPDATE leave_balances
    SET pending_days = GREATEST(0, pending_days - v_old_pending),
        used_days    = GREATEST(0, used_days - v_old_used)
    WHERE employee_id = OLD.employee_id
      AND leave_type_id = OLD.leave_type_id
      AND year = EXTRACT(YEAR FROM OLD.start_date)::INTEGER;
    v_old_pending := 0;
    v_old_used := 0;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_employee := OLD.employee_id; v_type := OLD.leave_type_id;
    v_year := EXTRACT(YEAR FROM OLD.start_date)::INTEGER;
  ELSE
    v_employee := NEW.employee_id; v_type := NEW.leave_type_id;
    v_year := EXTRACT(YEAR FROM NEW.start_date)::INTEGER;
  END IF;

  UPDATE leave_balances
  SET pending_days = GREATEST(0, pending_days - v_old_pending + v_new_pending),
      used_days    = GREATEST(0, used_days - v_old_used + v_new_used)
  WHERE employee_id = v_employee
    AND leave_type_id = v_type
    AND year = v_year;

  RETURN COALESCE(NEW, OLD);
END $$;

REVOKE ALL ON FUNCTION public.maintain_leave_balance() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_maintain_leave_balance ON leave_requests;
CREATE TRIGGER trg_maintain_leave_balance
  AFTER INSERT OR UPDATE OF status, total_days, leave_type_id, start_date OR DELETE
  ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION maintain_leave_balance();

/**
 * Refuse a request the person cannot cover.
 *
 * Checked before the row lands, so the entitlement is a rule rather than a
 * suggestion the apply form happens to make. Only requests that reserve
 * something are checked: rejecting or cancelling must always be allowed, and
 * so must a correction that reduces a request.
 */
CREATE OR REPLACE FUNCTION check_leave_balance_available()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bal      leave_balances%ROWTYPE;
  v_year     INTEGER := EXTRACT(YEAR FROM NEW.start_date)::INTEGER;
  v_already  NUMERIC := 0;
  v_wanted   NUMERIC;
  v_free     NUMERIC;
  v_type     TEXT;
BEGIN
  IF NEW.status NOT IN ('pending', 'approved') THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_bal FROM leave_balances
  WHERE employee_id = NEW.employee_id
    AND leave_type_id = NEW.leave_type_id
    AND year = v_year;

  SELECT name INTO v_type FROM leave_types WHERE id = NEW.leave_type_id;

  IF NOT FOUND OR v_bal.id IS NULL THEN
    RAISE EXCEPTION 'You have no % balance recorded for %. Ask HR to set one up.',
      COALESCE(v_type, 'leave'), v_year;
  END IF;

  -- What this same row already reserves, so an edit is not counted twice.
  IF TG_OP = 'UPDATE' THEN
    SELECT pending + used INTO v_already
    FROM leave_request_weight(OLD.status, OLD.total_days)
    WHERE OLD.leave_type_id = NEW.leave_type_id
      AND EXTRACT(YEAR FROM OLD.start_date)::INTEGER = v_year;
    v_already := COALESCE(v_already, 0);
  END IF;

  v_wanted := COALESCE(NEW.total_days, 0);
  v_free := v_bal.total_days + COALESCE(v_bal.carried_forward_days, 0)
            - v_bal.used_days - v_bal.pending_days + v_already;

  IF v_wanted > v_free THEN
    RAISE EXCEPTION 'You have % day(s) of % left for %, and this request is for %.',
      GREATEST(0, v_free), COALESCE(v_type, 'leave'), v_year, v_wanted;
  END IF;

  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.check_leave_balance_available() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_check_leave_balance ON leave_requests;
CREATE TRIGGER trg_check_leave_balance
  BEFORE INSERT OR UPDATE OF status, total_days, leave_type_id, start_date
  ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION check_leave_balance_available();

-- ── Put the existing balances right ─────────────────────────────────────────
-- They have been drifting for as long as the arithmetic lived in the browser,
-- so recount from the requests themselves rather than trusting the stored
-- figures.

UPDATE leave_balances b
SET pending_days = COALESCE(r.pending, 0),
    used_days    = COALESCE(r.used, 0)
FROM (
  SELECT
    lr.employee_id,
    lr.leave_type_id,
    EXTRACT(YEAR FROM lr.start_date)::INTEGER AS year,
    SUM(CASE WHEN lr.status = 'pending'  THEN lr.total_days ELSE 0 END) AS pending,
    SUM(CASE WHEN lr.status = 'approved' THEN lr.total_days ELSE 0 END) AS used
  FROM leave_requests lr
  GROUP BY 1, 2, 3
) r
WHERE b.employee_id = r.employee_id
  AND b.leave_type_id = r.leave_type_id
  AND b.year = r.year;

-- A balance with no requests against it holds nothing.
UPDATE leave_balances b
SET pending_days = 0, used_days = 0
WHERE NOT EXISTS (
  SELECT 1 FROM leave_requests lr
  WHERE lr.employee_id = b.employee_id
    AND lr.leave_type_id = b.leave_type_id
    AND EXTRACT(YEAR FROM lr.start_date)::INTEGER = b.year
) AND (b.pending_days <> 0 OR b.used_days <> 0);

COMMENT ON FUNCTION maintain_leave_balance() IS
  'Keeps leave_balances in step with leave_requests. The browser no longer does this arithmetic.';
COMMENT ON FUNCTION check_leave_balance_available() IS
  'Refuses a leave request the employee cannot cover. The entitlement is a rule, not a suggestion.';
