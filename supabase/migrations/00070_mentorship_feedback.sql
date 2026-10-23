-- End-of-programme feedback, so the mentorship programme can be judged.
--
-- From the HR feedback of 19 October: "add an end of programme feedback form
-- to see effectiveness".
--
-- Closing a mentorship captured only how it finished — completed or ended
-- early — and a free-text closing note. Useful to the pair, useless in
-- aggregate: there was no way to answer "is this programme worth running"
-- except by reading every note.
--
-- Feedback is its own table rather than columns on `mentorships` because
-- both sides answer, separately and honestly. A mentee who found it a waste
-- of time should be able to say so without the mentor's view being merged
-- into the same row.
--
-- One response each, enforced by the unique constraint. Editable afterwards,
-- because an honest answer given in a hurry is worth more than no answer.

CREATE TABLE IF NOT EXISTS mentorship_feedback (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  mentorship_id    UUID NOT NULL REFERENCES mentorships(id) ON DELETE CASCADE,
  given_by         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  -- Which side of the pair this came from, so the two can be read apart.
  given_as         TEXT NOT NULL CHECK (given_as IN ('mentee', 'mentor')),
  -- 1 to 5. Deliberately one number, because a form nobody finishes measures
  -- nothing at all.
  rating           SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  would_recommend  BOOLEAN,
  what_changed     TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mentorship_feedback_one_per_person UNIQUE (mentorship_id, given_by)
);

CREATE INDEX IF NOT EXISTS idx_mentorship_feedback_mentorship
  ON mentorship_feedback(mentorship_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_feedback_org
  ON mentorship_feedback(organization_id);

ALTER TABLE mentorship_feedback ENABLE ROW LEVEL SECURITY;

-- Write your own, and only for a pairing you were actually in. Without the
-- second half anybody in the organisation could rate anybody else's
-- mentorship.
CREATE POLICY write_own_mentorship_feedback ON mentorship_feedback
  FOR ALL
  USING (
    organization_id = get_user_org_id()
    AND given_by IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  )
  WITH CHECK (
    organization_id = get_user_org_id()
    AND given_by IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    AND mentorship_id IN (
      SELECT m.id FROM mentorships m
      WHERE m.mentee_id = given_by OR m.mentor_id = given_by
    )
  );

-- Whoever runs the programme can read all of it. They already see every
-- pairing and what it was for; this is the part that says whether it worked.
CREATE POLICY read_mentorship_feedback_programme ON mentorship_feedback
  FOR SELECT
  USING (
    organization_id = get_user_org_id()
    AND get_user_role() = ANY (ARRAY['super_admin'::app_role, 'hr_admin'::app_role, 'leadership'::app_role])
  );

COMMENT ON TABLE mentorship_feedback IS
  'One response per person per mentorship, given when it finishes. Both sides answer separately so neither view is merged into the other.';
