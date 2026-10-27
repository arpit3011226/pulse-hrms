-- ============================================================================
-- Letting a candidate accept their own offer.
--
-- Until now the portal showed them the offer and said "get back to your
-- recruiter". HR then recorded the answer on their behalf — so the record of
-- the most important agreement in the whole hiring process was somebody
-- else's note that a phone call had happened.
--
-- The signing machinery built for onboarding agreements already does this
-- properly, so the same shape is used here: freeze the terms that were
-- accepted, hash them, record who typed what and when.
--
-- Why not reuse employee_agreements: that table is keyed to an employee, and
-- the whole point is that this person is not one yet. Loosening it to allow a
-- null employee would weaken the guard protecting everybody's signed
-- documents, to save one table.
-- ============================================================================

ALTER TABLE offer_letters
  ADD COLUMN IF NOT EXISTS accepted_name TEXT,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_user_agent TEXT,
  -- The terms as shown at the moment of acceptance, and a fingerprint of
  -- them. A revised offer changes offered_ctc; without this there would be
  -- no record of which figure was agreed to.
  ADD COLUMN IF NOT EXISTS accepted_terms_html TEXT,
  ADD COLUMN IF NOT EXISTS accepted_sha256 TEXT;

COMMENT ON COLUMN offer_letters.accepted_terms_html IS
  'The terms exactly as shown when the candidate accepted. Frozen, because a later revision must not rewrite what was agreed.';

-- ── A candidate may answer their own offer, and nothing else ────────────────

CREATE OR REPLACE FUNCTION guard_offer_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_role  app_role;
  v_is_me BOOLEAN;
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  -- What was accepted is evidence. Nobody rewrites it, HR included. Changing
  -- the offer means a new version, which this codebase already supports
  -- through supersedes_offer_id.
  IF OLD.accepted_at IS NOT NULL AND (
       NEW.accepted_terms_html IS DISTINCT FROM OLD.accepted_terms_html
    OR NEW.accepted_sha256     IS DISTINCT FROM OLD.accepted_sha256
    OR NEW.accepted_name       IS DISTINCT FROM OLD.accepted_name
    OR NEW.accepted_at         IS DISTINCT FROM OLD.accepted_at
  ) THEN
    RAISE EXCEPTION 'An accepted offer cannot be rewritten. Issue a revised offer instead.'
      USING ERRCODE = '42501';
  END IF;

  v_role := get_user_role();
  IF v_role <> 'candidate' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM candidate_applications ca
    JOIN candidates c ON c.id = ca.candidate_id
    WHERE ca.id = NEW.candidate_application_id
      AND c.profile_id = auth.uid()
  ) INTO v_is_me;

  IF NOT v_is_me THEN
    RAISE EXCEPTION 'You can only answer your own offer.' USING ERRCODE = '42501';
  END IF;

  IF NEW.offer_status NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'You can accept or decline, nothing else.' USING ERRCODE = '42501';
  END IF;

  -- Everything that decides what the job actually is belongs to HR.
  IF  NEW.offered_ctc         IS DISTINCT FROM OLD.offered_ctc
   OR NEW.offered_designation IS DISTINCT FROM OLD.offered_designation
   OR NEW.joining_date        IS DISTINCT FROM OLD.joining_date
   OR NEW.valid_until         IS DISTINCT FROM OLD.valid_until
   OR NEW.version             IS DISTINCT FROM OLD.version
  THEN
    RAISE EXCEPTION 'The terms of an offer are not yours to change.' USING ERRCODE = '42501';
  END IF;

  -- An answer already given stands. Changing your mind is a conversation.
  IF OLD.offer_status IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'You have already answered this offer.' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END $$;

COMMENT ON FUNCTION guard_offer_response() IS
  'A candidate accepts or declines their own offer. They cannot touch the terms, and accepted terms are frozen for everybody.';

DROP TRIGGER IF EXISTS trg_guard_offer_response ON offer_letters;
CREATE TRIGGER trg_guard_offer_response
  BEFORE UPDATE ON offer_letters
  FOR EACH ROW EXECUTE FUNCTION guard_offer_response();

DROP POLICY IF EXISTS "candidate_answers_own_offer" ON offer_letters;
CREATE POLICY "candidate_answers_own_offer" ON offer_letters
  FOR UPDATE USING (
    candidate_application_id IN (
      SELECT ca.id
      FROM candidate_applications ca
      JOIN candidates c ON c.id = ca.candidate_id
      WHERE c.profile_id = auth.uid()
    )
  );
