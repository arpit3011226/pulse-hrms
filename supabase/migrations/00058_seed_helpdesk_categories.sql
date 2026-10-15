-- The things people actually raise with HR, ready to pick from.
--
-- The helpdesk worked, but every organisation started with no categories. The
-- Category dropdown on "Raise a ticket" opened empty, which reads as a broken
-- screen rather than as a setting nobody had filled in yet. Same gap the letter
-- templates and the recognition values had.
--
-- A category does two jobs: it gets the ticket to the right person, and it
-- stamps the response and resolution clocks onto it. A ticket raised with no
-- category has no clock at all, so it can never show as overdue — which is the
-- quiet reason an empty list matters more than it looks.
--
-- The hours below are plain elapsed hours, not working hours, and they are a
-- starting point rather than a promise. HR can change any of them, switch one
-- off, or add their own from Helpdesk → Categories.

CREATE OR REPLACE FUNCTION seed_helpdesk_categories(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only ever fills an empty set, so it is safe to run again and never
  -- overwrites what HR has changed.
  IF EXISTS (SELECT 1 FROM helpdesk_categories WHERE organization_id = p_org_id) THEN
    RETURN;
  END IF;

  INSERT INTO helpdesk_categories
    (organization_id, name, description, response_sla_hours, resolution_sla_hours,
     sort_order, is_active)
  VALUES
    -- Money questions come first: they are the most common and the most urgent
    -- to the person asking.
    (p_org_id, 'Salary and payslips',
     'Pay not received, an amount that looks wrong, a payslip you cannot find.',
     8, 48, 1, true),
    (p_org_id, 'Reimbursements and claims',
     'Travel, medical, mobile or any other claim you have raised.',
     8, 72, 2, true),
    (p_org_id, 'Tax, PF and ESI',
     'Form 16, tax declarations, PF transfer or withdrawal, ESI.',
     24, 120, 3, true),

    -- Day to day
    (p_org_id, 'Leave and attendance',
     'A balance that looks wrong, a day marked incorrectly, a request stuck for approval.',
     8, 24, 4, true),
    (p_org_id, 'Letters and documents',
     'Experience letter, salary certificate, address proof, or any letter you need.',
     8, 48, 5, true),

    -- Getting your work done
    (p_org_id, 'IT and system access',
     'Cannot sign in, need access to a tool, something is not working.',
     4, 24, 6, true),
    (p_org_id, 'Laptop and equipment',
     'A new laptop, a repair, returning something, anything you have been issued.',
     8, 48, 7, true),

    -- People matters
    (p_org_id, 'Insurance and benefits',
     'Health insurance, adding a family member, a claim, any other benefit.',
     8, 72, 8, true),
    (p_org_id, 'Joining and onboarding',
     'For new joiners: paperwork, accounts, anything you need to get started.',
     8, 24, 9, true),
    (p_org_id, 'Office and facilities',
     'Seating, access card, parking, housekeeping, anything about the workplace.',
     8, 48, 10, true),

    -- A deliberate catch-all, last. Without one, people force their question
    -- into whichever category looks closest and the reporting goes wrong.
    (p_org_id, 'Something else',
     'Not sure where it fits? Raise it here and we will pass it to the right person.',
     24, 72, 11, true);
END $$;

REVOKE ALL ON FUNCTION public.seed_helpdesk_categories(UUID) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION seed_helpdesk_categories(UUID) IS
  'Fills an empty helpdesk category set with a standard one. Does nothing if any category already exists.';

-- New organisations get them without anyone having to remember.
CREATE OR REPLACE FUNCTION seed_helpdesk_categories_for_new_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM seed_helpdesk_categories(NEW.id);
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.seed_helpdesk_categories_for_new_org() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_seed_helpdesk_categories ON organizations;
CREATE TRIGGER trg_seed_helpdesk_categories
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION seed_helpdesk_categories_for_new_org();

-- And every organisation that already exists without any.
DO $$
DECLARE
  v_org UUID;
BEGIN
  FOR v_org IN SELECT id FROM organizations LOOP
    PERFORM seed_helpdesk_categories(v_org);
  END LOOP;
END $$;
