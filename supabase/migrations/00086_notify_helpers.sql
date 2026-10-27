-- ============================================================================
-- Telling people things happened.
--
-- The pre-boarding and signing flows built this week tell nobody anything. A
-- candidate has no idea a document list is waiting; HR has no idea one has
-- been uploaded or an offer answered. It all relies on somebody thinking to
-- look, which is how a joiner ends up chasing by email — the exact thing the
-- portal was supposed to replace.
--
-- These are functions rather than inserts from the browser for one concrete
-- reason: to notify HR you must first know who HR is, and after 00085 a
-- candidate can no longer read anybody's profile but their own. Asking the
-- database to deliver by ROLE keeps the staff list private while still
-- letting a candidate's action reach the right people.
--
-- Ordinary Postgres, so it survives the move to Azure.
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_profile(
  p_profile        UUID,
  p_title          TEXT,
  p_message        TEXT,
  p_type           TEXT DEFAULT 'info',
  p_reference_id   UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := get_user_org_id();
BEGIN
  IF v_org IS NULL OR p_profile IS NULL THEN
    RETURN;
  END IF;

  -- Only within your own organisation, whoever you are.
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_profile AND organization_id = v_org
  ) THEN
    RETURN;
  END IF;

  INSERT INTO notifications
    (organization_id, recipient_profile_id, title, message, type, reference_id, reference_type)
  VALUES
    (v_org, p_profile, p_title, p_message, p_type, p_reference_id, p_reference_type);
END $$;

COMMENT ON FUNCTION notify_profile(UUID, TEXT, TEXT, TEXT, UUID, TEXT) IS
  'Tell one person something, within your own organisation.';

CREATE OR REPLACE FUNCTION notify_roles(
  p_roles          TEXT[],
  p_title          TEXT,
  p_message        TEXT,
  p_type           TEXT DEFAULT 'info',
  p_reference_id   UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := get_user_org_id();
  v_n   INTEGER;
BEGIN
  IF v_org IS NULL OR p_roles IS NULL OR array_length(p_roles, 1) IS NULL THEN
    RETURN 0;
  END IF;

  -- Deliberately not open to any role: a candidate could otherwise message
  -- the whole company. These are the people who act on the things being
  -- reported.
  IF NOT (p_roles <@ ARRAY['super_admin', 'hr_admin', 'manager', 'leadership', 'payroll_admin']) THEN
    RAISE EXCEPTION 'Notifications can only be addressed to staff roles.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO notifications
    (organization_id, recipient_profile_id, title, message, type, reference_id, reference_type)
  SELECT v_org, p.id, p_title, p_message, p_type, p_reference_id, p_reference_type
  FROM profiles p
  WHERE p.organization_id = v_org
    AND p.role::text = ANY(p_roles)
    AND COALESCE(p.is_active, true)
    -- No point telling yourself what you just did.
    AND p.id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END $$;

COMMENT ON FUNCTION notify_roles(TEXT[], TEXT, TEXT, TEXT, UUID, TEXT) IS
  'Tell everybody holding one of these staff roles. SECURITY DEFINER because the sender may not be allowed to see who they are — a candidate cannot read the staff list, but their upload still has to reach HR.';

REVOKE ALL ON FUNCTION notify_profile(UUID, TEXT, TEXT, TEXT, UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION notify_roles(TEXT[], TEXT, TEXT, TEXT, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION notify_profile(UUID, TEXT, TEXT, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_roles(TEXT[], TEXT, TEXT, TEXT, UUID, TEXT) TO authenticated;
