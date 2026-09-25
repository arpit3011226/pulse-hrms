-- Something to tag a recognition with, from day one.
--
-- The recognition screen asks which value a person is being recognised for,
-- and the list was empty. So every recognition went out untagged, and the
-- "Our values" card never appeared at all. Same problem the letter templates
-- had in 00055: a good screen with nothing in it.
--
-- These eight are the ones most services companies actually use, written as
-- plain statements rather than one-word slogans, so it is obvious what you are
-- picking when you tag a thank-you. HR can rename them, reorder them, switch
-- one off or add their own from the Recognition screen.
--
-- The icon column is left empty on purpose: nothing on screen reads it today,
-- and filling it with names no code checks would only rot.

CREATE OR REPLACE FUNCTION seed_recognition_values(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only ever fills an empty set, so it is safe to run again and never
  -- overwrites what HR has changed.
  IF EXISTS (SELECT 1 FROM recognition_values WHERE organization_id = p_org_id) THEN
    RETURN;
  END IF;

  INSERT INTO recognition_values
    (organization_id, name, description, sort_order, is_active)
  VALUES
    (p_org_id, 'Customer First',
     'Put the customer''s problem ahead of our own convenience.', 1, true),
    (p_org_id, 'Ownership',
     'Saw it through to the end without being chased.', 2, true),
    (p_org_id, 'Teamwork',
     'Made someone else''s work easier, not just their own.', 3, true),
    (p_org_id, 'Integrity',
     'Did the right thing, including when it was the harder thing.', 4, true),
    (p_org_id, 'Quality',
     'Took the time to get it right rather than get it out.', 5, true),
    (p_org_id, 'Learning',
     'Picked up something new, or taught it to the rest of us.', 6, true),
    (p_org_id, 'Going the Extra Mile',
     'Did more than the job asked for, when it mattered.', 7, true),
    (p_org_id, 'Respect',
     'Listened properly and treated people well.', 8, true);
END $$;

REVOKE ALL ON FUNCTION public.seed_recognition_values(UUID) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION seed_recognition_values(UUID) IS
  'Fills an empty recognition value set with a standard one. Does nothing if any value already exists.';

-- New organisations get them without anyone having to remember.
CREATE OR REPLACE FUNCTION seed_recognition_values_for_new_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM seed_recognition_values(NEW.id);
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.seed_recognition_values_for_new_org() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_seed_recognition_values ON organizations;
CREATE TRIGGER trg_seed_recognition_values
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION seed_recognition_values_for_new_org();

-- And every organisation that already exists without any.
DO $$
DECLARE
  v_org UUID;
BEGIN
  FOR v_org IN SELECT id FROM organizations LOOP
    PERFORM seed_recognition_values(v_org);
  END LOOP;
END $$;
