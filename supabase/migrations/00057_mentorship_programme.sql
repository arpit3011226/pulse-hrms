-- A formal mentorship programme.
--
-- Somebody asks a colleague to mentor them. The mentor accepts or declines,
-- and says why if they decline. Once accepted the pair agree an objective and
-- a rhythm for checking in, and they work through goals together until the
-- mentorship is finished or stopped.
--
-- The rules of the programme, enforced here rather than trusted to the screen:
--
--   * A mentor carries at most three mentees at a time. They may set their own
--     limit lower, never higher.
--   * A mentee has one mentor at a time, and one request open at a time. They
--     can only have one mentor, so letting them ask four people at once means
--     two could accept and somebody gets an awkward reversal.
--   * Nobody can ask their own reporting manager. The value of a mentor is a
--     view from outside your reporting line, from someone with no say in your
--     appraisal. A manager already owes their reports coaching.
--   * Nobody can mentor themselves.
--
-- ── What other people can see ───────────────────────────────────────────────
--
-- This is the part that decides whether the programme works at all. People say
-- honest things to a mentor — that they are stuck, bored, or thinking of
-- leaving. If HR can read that, they stop saying it, and the programme becomes
-- a set of meetings nobody gets anything from.
--
-- So the line is drawn between the fact of the mentorship and its contents:
--
--   * HR and leadership see every pairing, the objective, the goals, when the
--     pair last met and whether they called it on track. Enough to run the
--     programme and spot one that has gone quiet.
--   * A manager sees the pairings their own reports are in — in both
--     directions, because a report who mentors someone in another department
--     is still spending their time on it.
--   * What is written in a check-in is readable by the two people in the
--     mentorship and by nobody else. Not HR, not leadership, not the manager,
--     not a super admin.
--
-- To make that last promise keepable, the notes live in their own table.
-- Row-level security hides rows, not columns, so a check-in that carried both
-- the private note and the date everyone may see would have leaked the note to
-- anyone allowed to see the date — the same trap that put PAN and Aadhaar on
-- the org-wide employees table. Instead the figures oversight needs are kept
-- on the mentorship row itself and maintained by a trigger.
--
-- This is a promise about the application. Anyone holding the database
-- credentials can still read the table directly.

-- ── Who has offered to mentor ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mentor_profiles (
  employee_id     UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Lets a mentor pause without withdrawing from the programme.
  is_accepting    BOOLEAN NOT NULL DEFAULT true,
  headline        TEXT,
  about           TEXT,
  focus_areas     TEXT[] NOT NULL DEFAULT '{}',
  -- A mentor may take fewer than the programme allows, never more.
  max_mentees     SMALLINT NOT NULL DEFAULT 3 CHECK (max_mentees BETWEEN 1 AND 3),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentor_profiles_org ON mentor_profiles(organization_id);

-- ── Asking someone ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mentorship_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  mentee_id       UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  mentor_id       UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  /** Why they are asking, in their own words. */
  message         TEXT,
  /** What they hope to get out of it. Becomes the starting point for the objective. */
  goal_summary    TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn')),
  /** Required when declined, so nobody is turned down without a word. */
  decline_reason  TEXT,
  decided_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (mentee_id <> mentor_id)
);

CREATE INDEX IF NOT EXISTS idx_mentorship_requests_mentor ON mentorship_requests(mentor_id, status);
CREATE INDEX IF NOT EXISTS idx_mentorship_requests_mentee ON mentorship_requests(mentee_id, status);

-- One open request per mentee.
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_pending_request_per_mentee
  ON mentorship_requests(mentee_id) WHERE status = 'pending';

-- ── The mentorship itself ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mentorships (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  mentee_id          UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  mentor_id          UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  request_id         UUID REFERENCES mentorship_requests(id) ON DELETE SET NULL,
  status             TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'completed', 'ended')),
  /** What the two of them agreed they are working towards. */
  objective          TEXT,
  checkin_frequency  TEXT NOT NULL DEFAULT 'monthly'
                       CHECK (checkin_frequency IN ('fortnightly', 'monthly', 'quarterly')),
  started_on         DATE NOT NULL DEFAULT CURRENT_DATE,
  /** When the next check-in is due. Moved on by the trigger after each one. */
  next_checkin_on    DATE,
  -- Kept here, not on the notes table, so oversight never needs to reach the notes.
  last_checkin_on    DATE,
  last_health        TEXT CHECK (last_health IN ('on_track', 'needs_attention', 'stalled')),
  checkin_count      INTEGER NOT NULL DEFAULT 0,
  ended_on           DATE,
  end_reason         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (mentee_id <> mentor_id)
);

CREATE INDEX IF NOT EXISTS idx_mentorships_mentor ON mentorships(mentor_id, status);
CREATE INDEX IF NOT EXISTS idx_mentorships_mentee ON mentorships(mentee_id, status);
CREATE INDEX IF NOT EXISTS idx_mentorships_org ON mentorships(organization_id, status);

-- One mentor at a time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_active_mentorship_per_mentee
  ON mentorships(mentee_id) WHERE status = 'active';

-- ── What they are working on ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mentorship_goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  mentorship_id   UUID NOT NULL REFERENCES mentorships(id) ON DELETE CASCADE,
  title           TEXT NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  detail          TEXT,
  target_date     DATE,
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'achieved', 'dropped')),
  created_by      UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentorship_goals_mentorship ON mentorship_goals(mentorship_id);

-- ── The check-ins, and what was said ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mentorship_checkins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  mentorship_id   UUID NOT NULL REFERENCES mentorships(id) ON DELETE CASCADE,
  logged_by       UUID REFERENCES employees(id) ON DELETE SET NULL,
  checkin_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  health          TEXT NOT NULL DEFAULT 'on_track'
                    CHECK (health IN ('on_track', 'needs_attention', 'stalled')),
  /** Between the two of them. Nothing outside this table exposes it. */
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentorship_checkins_mentorship
  ON mentorship_checkins(mentorship_id, checkin_date DESC);

-- ── Helpers ─────────────────────────────────────────────────────────────────

/** Am I one of the two people in this mentorship? */
CREATE OR REPLACE FUNCTION is_mentorship_party(p_mentorship_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM mentorships m
    WHERE m.id = p_mentorship_id
      AND (
        m.mentee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
        OR m.mentor_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      )
  );
$$;

/** How many mentees is this person carrying right now? */
CREATE OR REPLACE FUNCTION active_mentee_count(p_mentor_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT count(*)::INTEGER FROM mentorships
  WHERE mentor_id = p_mentor_id AND status = 'active';
$$;

/** The most mentees this person will take, which is never more than three. */
CREATE OR REPLACE FUNCTION mentor_capacity(p_mentor_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE((SELECT max_mentees FROM mentor_profiles WHERE employee_id = p_mentor_id), 3);
$$;

/** Is this person the other one's reporting manager? */
CREATE OR REPLACE FUNCTION reports_to(p_employee_id UUID, p_manager_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM employees
    WHERE id = p_employee_id AND reporting_manager_id = p_manager_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_mentorship_party(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.active_mentee_count(UUID)  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mentor_capacity(UUID)      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reports_to(UUID, UUID)     FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_mentorship_party(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.active_mentee_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mentor_capacity(UUID)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.reports_to(UUID, UUID)    TO authenticated;

-- ── The rules ───────────────────────────────────────────────────────────────

/**
 * Checked on the request, so somebody is told they cannot ask before they write
 * out their reasons — not after.
 */
CREATE OR REPLACE FUNCTION check_mentorship_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  IF reports_to(NEW.mentee_id, NEW.mentor_id) THEN
    RAISE EXCEPTION 'You cannot ask your own reporting manager to be your mentor. A mentor is meant to sit outside your reporting line.';
  END IF;

  IF EXISTS (SELECT 1 FROM mentorships WHERE mentee_id = NEW.mentee_id AND status = 'active') THEN
    RAISE EXCEPTION 'You already have a mentor. Finish that mentorship before asking someone else.';
  END IF;

  IF active_mentee_count(NEW.mentor_id) >= mentor_capacity(NEW.mentor_id) THEN
    RAISE EXCEPTION 'That person is already mentoring as many people as they can take.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM mentor_profiles
    WHERE employee_id = NEW.mentor_id AND is_accepting = false
  ) THEN
    RAISE EXCEPTION 'That person is not taking new mentees at the moment.';
  END IF;

  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.check_mentorship_request() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_check_mentorship_request ON mentorship_requests;
CREATE TRIGGER trg_check_mentorship_request
  BEFORE INSERT ON mentorship_requests
  FOR EACH ROW EXECUTE FUNCTION check_mentorship_request();

/** The cap again, on the mentorship itself, so no path around it exists. */
CREATE OR REPLACE FUNCTION check_mentorship_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN
    RETURN NEW;  -- already counted
  END IF;

  IF active_mentee_count(NEW.mentor_id) >= mentor_capacity(NEW.mentor_id) THEN
    RAISE EXCEPTION 'That mentor is already carrying the most mentees they can take.';
  END IF;

  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.check_mentorship_capacity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_check_mentorship_capacity ON mentorships;
CREATE TRIGGER trg_check_mentorship_capacity
  BEFORE INSERT OR UPDATE OF status, mentor_id ON mentorships
  FOR EACH ROW EXECUTE FUNCTION check_mentorship_capacity();

/** Work out when the next check-in is due, from the rhythm they agreed. */
CREATE OR REPLACE FUNCTION mentorship_next_due(p_from DATE, p_frequency TEXT)
RETURNS DATE
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_frequency
    WHEN 'fortnightly' THEN p_from + INTERVAL '14 days'
    WHEN 'quarterly'   THEN p_from + INTERVAL '3 months'
    ELSE                    p_from + INTERVAL '1 month'
  END::DATE;
$$;

REVOKE ALL ON FUNCTION public.mentorship_next_due(DATE, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mentorship_next_due(DATE, TEXT) TO authenticated;

/**
 * Carry the figures oversight needs up onto the mentorship row.
 *
 * This is what lets HR see that a pair met last week and called it on track
 * without ever being able to read a word of what they said.
 */
CREATE OR REPLACE FUNCTION roll_up_mentorship_checkin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_freq TEXT;
BEGIN
  SELECT checkin_frequency INTO v_freq FROM mentorships WHERE id = NEW.mentorship_id;

  UPDATE mentorships
  SET last_checkin_on = GREATEST(COALESCE(last_checkin_on, NEW.checkin_date), NEW.checkin_date),
      last_health     = NEW.health,
      checkin_count   = checkin_count + 1,
      next_checkin_on = mentorship_next_due(NEW.checkin_date, v_freq)
  WHERE id = NEW.mentorship_id;

  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.roll_up_mentorship_checkin() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_roll_up_mentorship_checkin ON mentorship_checkins;
CREATE TRIGGER trg_roll_up_mentorship_checkin
  AFTER INSERT ON mentorship_checkins
  FOR EACH ROW EXECUTE FUNCTION roll_up_mentorship_checkin();

/** A brand new mentorship is due its first check-in one period in. */
CREATE OR REPLACE FUNCTION set_first_checkin_due()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.next_checkin_on IS NULL THEN
    NEW.next_checkin_on := mentorship_next_due(NEW.started_on, NEW.checkin_frequency);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_first_checkin_due ON mentorships;
CREATE TRIGGER trg_set_first_checkin_due
  BEFORE INSERT ON mentorships
  FOR EACH ROW EXECUTE FUNCTION set_first_checkin_due();

-- ── Accepting a request ─────────────────────────────────────────────────────

/**
 * Accept, and start the mentorship, in one go.
 *
 * Done here rather than as two calls from the browser so that the cap cannot be
 * beaten by two mentees being accepted at the same moment: the row lock on the
 * request plus the capacity trigger settle it.
 */
CREATE OR REPLACE FUNCTION accept_mentorship_request(
  p_request_id UUID,
  p_objective  TEXT,
  p_frequency  TEXT DEFAULT 'monthly'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_req        mentorship_requests%ROWTYPE;
  v_mentorship UUID;
BEGIN
  SELECT * INTO v_req FROM mentorship_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That request no longer exists.';
  END IF;

  -- Only the person who was asked may accept.
  IF v_req.mentor_id NOT IN (SELECT id FROM employees WHERE profile_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the person who was asked can accept this request.';
  END IF;

  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'That request has already been answered.';
  END IF;

  INSERT INTO mentorships (
    organization_id, mentee_id, mentor_id, request_id,
    objective, checkin_frequency, started_on
  )
  VALUES (
    v_req.organization_id, v_req.mentee_id, v_req.mentor_id, v_req.id,
    NULLIF(btrim(COALESCE(p_objective, '')), ''),
    COALESCE(NULLIF(p_frequency, ''), 'monthly'),
    CURRENT_DATE
  )
  RETURNING id INTO v_mentorship;

  UPDATE mentorship_requests
  SET status = 'accepted', decided_at = now()
  WHERE id = p_request_id;

  RETURN v_mentorship;
END $$;

REVOKE ALL ON FUNCTION public.accept_mentorship_request(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_mentorship_request(UUID, TEXT, TEXT) TO authenticated;

-- ── Who may see and do what ─────────────────────────────────────────────────

ALTER TABLE mentor_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorships          ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_goals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_checkins  ENABLE ROW LEVEL SECURITY;

-- Mentor profiles are the programme's shop window: everyone sees them.
DROP POLICY IF EXISTS read_mentor_profiles ON mentor_profiles;
CREATE POLICY read_mentor_profiles ON mentor_profiles
  FOR SELECT USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS manage_own_mentor_profile ON mentor_profiles;
CREATE POLICY manage_own_mentor_profile ON mentor_profiles
  FOR ALL USING (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin')
    )
  )
  WITH CHECK (
    organization_id = get_user_org_id()
    AND (
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin')
    )
  );

-- A request in flight stays between the two people and HR. A manager finds out
-- when it becomes a mentorship, not while their report is still waiting on an
-- answer.
DROP POLICY IF EXISTS read_mentorship_requests ON mentorship_requests;
CREATE POLICY read_mentorship_requests ON mentorship_requests
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      mentee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR mentor_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS raise_own_mentorship_request ON mentorship_requests;
CREATE POLICY raise_own_mentorship_request ON mentorship_requests
  FOR INSERT WITH CHECK (
    organization_id = get_user_org_id()
    AND mentee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

-- The mentor answers it; the mentee may withdraw it.
DROP POLICY IF EXISTS answer_mentorship_request ON mentorship_requests;
CREATE POLICY answer_mentorship_request ON mentorship_requests
  FOR UPDATE USING (
    organization_id = get_user_org_id()
    AND (
      mentor_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR mentee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    )
  )
  WITH CHECK (organization_id = get_user_org_id());

-- The pairing, the objective and the health: the pair, both managers, HR and
-- leadership.
DROP POLICY IF EXISTS read_mentorships ON mentorships;
CREATE POLICY read_mentorships ON mentorships
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      mentee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR mentor_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR manages_employee(mentee_id)
      OR manages_employee(mentor_id)
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );

-- Either of the two can change the objective, the rhythm, or end it.
DROP POLICY IF EXISTS update_own_mentorship ON mentorships;
CREATE POLICY update_own_mentorship ON mentorships
  FOR UPDATE USING (
    organization_id = get_user_org_id()
    AND (
      mentee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR mentor_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
      OR get_user_role() IN ('super_admin', 'hr_admin')
    )
  )
  WITH CHECK (organization_id = get_user_org_id());

-- Goals say what the pair is working on, which is what HR needs to see that the
-- programme has substance. Managers do not get these; the pairing is enough.
DROP POLICY IF EXISTS read_mentorship_goals ON mentorship_goals;
CREATE POLICY read_mentorship_goals ON mentorship_goals
  FOR SELECT USING (
    organization_id = get_user_org_id()
    AND (
      is_mentorship_party(mentorship_id)
      OR get_user_role() IN ('super_admin', 'hr_admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS manage_own_mentorship_goals ON mentorship_goals;
CREATE POLICY manage_own_mentorship_goals ON mentorship_goals
  FOR ALL USING (
    organization_id = get_user_org_id() AND is_mentorship_party(mentorship_id)
  )
  WITH CHECK (
    organization_id = get_user_org_id() AND is_mentorship_party(mentorship_id)
  );

-- The notes. The two of them, and nobody else — no role gets past this, by
-- design. The dates and the health signal that oversight needs are already on
-- the mentorship row, put there by a trigger.
DROP POLICY IF EXISTS read_own_mentorship_checkins ON mentorship_checkins;
CREATE POLICY read_own_mentorship_checkins ON mentorship_checkins
  FOR SELECT USING (is_mentorship_party(mentorship_id));

DROP POLICY IF EXISTS log_own_mentorship_checkin ON mentorship_checkins;
CREATE POLICY log_own_mentorship_checkin ON mentorship_checkins
  FOR INSERT WITH CHECK (
    organization_id = get_user_org_id()
    AND is_mentorship_party(mentorship_id)
    AND logged_by IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

DROP POLICY IF EXISTS edit_own_mentorship_checkin ON mentorship_checkins;
CREATE POLICY edit_own_mentorship_checkin ON mentorship_checkins
  FOR UPDATE USING (
    logged_by IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  )
  WITH CHECK (
    logged_by IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

-- ── Keep updated_at honest ──────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_mentor_profiles_updated ON mentor_profiles;
CREATE TRIGGER trg_mentor_profiles_updated BEFORE UPDATE ON mentor_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_mentorship_requests_updated ON mentorship_requests;
CREATE TRIGGER trg_mentorship_requests_updated BEFORE UPDATE ON mentorship_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_mentorships_updated ON mentorships;
CREATE TRIGGER trg_mentorships_updated BEFORE UPDATE ON mentorships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_mentorship_goals_updated ON mentorship_goals;
CREATE TRIGGER trg_mentorship_goals_updated BEFORE UPDATE ON mentorship_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE mentor_profiles IS
  'People who have offered to mentor, and what they can help with.';
COMMENT ON TABLE mentorship_requests IS
  'Somebody asking a colleague to mentor them. One open request per mentee.';
COMMENT ON TABLE mentorships IS
  'An agreed mentorship. Carries the dates and health signal oversight can see.';
COMMENT ON TABLE mentorship_goals IS
  'What the pair agreed to work on. The pair, HR and leadership.';
COMMENT ON TABLE mentorship_checkins IS
  'What was said at a check-in. Readable by the two people in the mentorship only.';
