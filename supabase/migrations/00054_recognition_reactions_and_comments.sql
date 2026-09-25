-- Recognition becomes something people can join in with.
--
-- Until now a recognition was written once and then sat there. Nobody could
-- agree with it, add what they had seen, or even say well done. That is most of
-- what makes recognition work in a company — the pile-on, not the post.
--
-- Two small tables:
--
--   recognition_reactions — one row per person per emoji, so a person can clap
--     and also add a heart, but cannot clap twice. Taking a reaction back is a
--     delete of their own row.
--
--   recognition_comments — a short note under the recognition.
--
-- Who may see a reaction or a comment follows the recognition it belongs to:
-- `recognition_id IN (SELECT id FROM recognitions)` re-uses the read policy on
-- recognitions rather than restating it, so a private recognition keeps its
-- reactions and comments private too.

-- ── Reactions ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recognition_reactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recognition_id  UUID NOT NULL REFERENCES recognitions(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  -- A short set the screen offers. Kept as text so adding one later needs no
  -- migration, with a check so a stray value cannot get in.
  emoji           TEXT NOT NULL CHECK (emoji IN ('clap', 'heart', 'celebrate', 'bulb')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (recognition_id, employee_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_recognition_reactions_recognition
  ON recognition_reactions(recognition_id);

ALTER TABLE recognition_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_recognition_reactions ON recognition_reactions;
CREATE POLICY read_recognition_reactions ON recognition_reactions
  FOR SELECT USING (
    recognition_id IN (SELECT id FROM recognitions)
  );

-- You react as yourself, to something you can see.
DROP POLICY IF EXISTS add_own_reaction ON recognition_reactions;
CREATE POLICY add_own_reaction ON recognition_reactions
  FOR INSERT WITH CHECK (
    organization_id = get_user_org_id()
    AND employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    AND recognition_id IN (SELECT id FROM recognitions)
  );

DROP POLICY IF EXISTS remove_own_reaction ON recognition_reactions;
CREATE POLICY remove_own_reaction ON recognition_reactions
  FOR DELETE USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

-- ── Comments ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recognition_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recognition_id  UUID NOT NULL REFERENCES recognitions(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  comment         TEXT NOT NULL CHECK (length(btrim(comment)) BETWEEN 1 AND 1000),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recognition_comments_recognition
  ON recognition_comments(recognition_id, created_at);

ALTER TABLE recognition_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_recognition_comments ON recognition_comments;
CREATE POLICY read_recognition_comments ON recognition_comments
  FOR SELECT USING (
    recognition_id IN (SELECT id FROM recognitions)
  );

DROP POLICY IF EXISTS add_own_comment ON recognition_comments;
CREATE POLICY add_own_comment ON recognition_comments
  FOR INSERT WITH CHECK (
    organization_id = get_user_org_id()
    AND employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    AND recognition_id IN (SELECT id FROM recognitions)
  );

DROP POLICY IF EXISTS edit_own_comment ON recognition_comments;
CREATE POLICY edit_own_comment ON recognition_comments
  FOR UPDATE USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  )
  WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  );

-- Your own comment, or HR taking down something that should not be up.
DROP POLICY IF EXISTS delete_own_comment ON recognition_comments;
CREATE POLICY delete_own_comment ON recognition_comments
  FOR DELETE USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    OR get_user_role() IN ('super_admin', 'hr_admin')
  );

DROP TRIGGER IF EXISTS trg_recognition_comments_updated ON recognition_comments;
CREATE TRIGGER trg_recognition_comments_updated
  BEFORE UPDATE ON recognition_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE recognition_reactions IS
  'Reactions on a recognition. Visibility follows the recognition itself.';
COMMENT ON TABLE recognition_comments IS
  'Comments on a recognition. Visibility follows the recognition itself.';
