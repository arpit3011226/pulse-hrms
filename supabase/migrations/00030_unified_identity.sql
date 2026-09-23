-- ============================================================================
-- F43 (part 2 of 2) — Unified identity
--
-- One person keeps one identity across the whole journey:
--     candidate  ->  employee  ->  alumnus
--
-- The anchor is their PERSONAL email, because that is the only address they
-- keep throughout. The work email is an attribute of employment, not identity —
-- it does not exist before they join and stops working after they leave.
--
-- Everything here is additive: new nullable columns, indexes and functions.
-- No column is dropped, renamed or retyped, so this is safe to run on a live
-- database and nothing existing changes behaviour.
-- ============================================================================

-- ── The anchor ──────────────────────────────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS personal_email TEXT;

COMMENT ON COLUMN profiles.personal_email IS
  'Stable identity anchor across candidate, employee and alumnus. profiles.email is the login/work address and may change.';

-- Candidates get an optional login, so a candidate portal can show them their
-- own application without them being an employee.
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_profile ON candidates(profile_id);

-- ── Backfill from what we already know ──────────────────────────────────────

-- Employees already carry personal_email; lift it onto the profile.
UPDATE profiles p
SET personal_email = e.personal_email
FROM employees e
WHERE e.profile_id = p.id
  AND p.personal_email IS NULL
  AND e.personal_email IS NOT NULL
  AND e.personal_email <> '';

-- Where a profile has no personal email recorded, fall back to the login
-- address. Better an anchor that is present than one that is null.
UPDATE profiles
SET personal_email = email
WHERE personal_email IS NULL
  AND email IS NOT NULL
  AND email <> '';

-- Link existing candidates to a profile where the addresses already match.
UPDATE candidates c
SET profile_id = p.id
FROM profiles p
WHERE c.profile_id IS NULL
  AND c.email IS NOT NULL
  AND lower(c.email) = lower(p.personal_email);

-- ── One person, one profile ─────────────────────────────────────────────────
-- Enforce uniqueness only if the data is already clean. If duplicates exist we
-- create a plain index instead and leave a notice, rather than failing the
-- migration and blocking everything behind it.

DO $$
DECLARE
  dupes INTEGER;
BEGIN
  SELECT count(*) INTO dupes FROM (
    SELECT lower(personal_email)
    FROM profiles
    WHERE personal_email IS NOT NULL AND personal_email <> ''
    GROUP BY lower(personal_email)
    HAVING count(*) > 1
  ) d;

  IF dupes = 0 THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_personal_email_unique
      ON profiles (lower(personal_email))
      WHERE personal_email IS NOT NULL AND personal_email <> '';
  ELSE
    CREATE INDEX IF NOT EXISTS idx_profiles_personal_email
      ON profiles (lower(personal_email))
      WHERE personal_email IS NOT NULL AND personal_email <> '';
    RAISE NOTICE 'F43: % duplicate personal_email value(s) found — created a non-unique index. Clean the duplicates, then add the unique index.', dupes;
  END IF;
END $$;

-- ── Resolver ────────────────────────────────────────────────────────────────
-- Answers "who is the signed-in person, across the whole journey?" in one call.
-- Used by the candidate portal and alumni access, and available to RLS.

CREATE OR REPLACE FUNCTION get_person_context()
RETURNS TABLE (
  profile_id      UUID,
  personal_email  TEXT,
  role            app_role,
  employee_id     UUID,
  employee_status TEXT,
  candidate_id    UUID,
  is_employee     BOOLEAN,
  is_alumni       BOOLEAN,
  is_candidate    BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.personal_email,
    p.role,
    e.id,
    e.status,
    c.id,
    e.id IS NOT NULL AND e.status = 'active',
    e.id IS NOT NULL AND e.status <> 'active',
    e.id IS NULL AND c.id IS NOT NULL
  FROM profiles p
  LEFT JOIN employees  e ON e.profile_id = p.id
  LEFT JOIN candidates c ON c.profile_id = p.id
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_person_context() IS
  'F43: resolves the signed-in user across candidate, employee and alumnus in one call.';

GRANT EXECUTE ON FUNCTION get_person_context() TO authenticated;

-- ── Find a person by personal email ─────────────────────────────────────────
-- Used when converting a candidate, so we reuse their existing login instead
-- of creating a second identity for the same human being.

CREATE OR REPLACE FUNCTION find_profile_by_personal_email(p_email TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM profiles
  WHERE p_email IS NOT NULL
    AND lower(personal_email) = lower(p_email)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION find_profile_by_personal_email(TEXT) TO authenticated;

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- A candidate may read only their own candidate row. Existing org-wide policies
-- for recruiters are untouched and continue to apply.

ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "candidate_reads_own_record" ON candidates;
CREATE POLICY "candidate_reads_own_record" ON candidates
  FOR SELECT USING (profile_id = auth.uid());
