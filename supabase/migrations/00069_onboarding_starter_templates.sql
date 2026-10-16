-- Onboarding had no templates at all, so every joiner started from nothing.
--
-- Starting onboarding offers a template, and the only choice was "No template
-- — start with an empty list". The joiner was created with 0 of 0 tasks and
-- whoever ran it had to type the whole list from memory, every time. The
-- module worked and produced nothing useful.
--
-- Three starter templates are seeded here. They are ordinary rows: HR can
-- edit, add to or delete any of them from the Templates tab, and these are
-- only ever inserted when a template of that name does not already exist, so
-- local changes are never overwritten.
--
-- The task lists are written for an Indian employer. PF Form 11 and the
-- Form 2 nomination, the investment declaration for tax, and POSH training
-- are all real obligations rather than filler.
--
-- Interns get a shorter list and no provident fund tasks, matching the rule
-- that a stipend carries no PF.

CREATE OR REPLACE FUNCTION seed_onboarding_templates(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_standard UUID;
  v_eng      UUID;
  v_intern   UUID;
  v_eng_dept UUID;
BEGIN
  SELECT id INTO v_eng_dept
  FROM departments WHERE organization_id = p_org_id AND name = 'Engineering' LIMIT 1;

  -- ── 1. Standard new joiner ────────────────────────────────────────────
  SELECT id INTO v_standard FROM onboarding_templates
   WHERE organization_id = p_org_id AND name = 'Standard New Joiner';

  IF v_standard IS NULL THEN
    INSERT INTO onboarding_templates (organization_id, name, description, is_default, is_active)
    VALUES (p_org_id, 'Standard New Joiner',
            'Everything a new employee needs in their first month, from paperwork before they join to the 30 day check-in.',
            true, true)
    RETURNING id INTO v_standard;

    INSERT INTO onboarding_template_tasks
      (organization_id, template_id, title, description, category, owner_role, due_offset_days, is_mandatory, sort_order)
    VALUES
      -- Before they join
      (p_org_id, v_standard, 'Send the offer letter and welcome note', 'Confirm the joining date and what to bring on day one.', 'pre_joining', 'hr', -7, true, 1),
      (p_org_id, v_standard, 'Collect joining documents', 'PAN, Aadhaar, bank details, education certificates and the relieving letter from the last employer.', 'pre_joining', 'hr', -5, true, 2),
      (p_org_id, v_standard, 'Raise the IT request', 'Laptop, email account and access to the systems the role needs.', 'pre_joining', 'it', -3, true, 3),
      (p_org_id, v_standard, 'Arrange the seat and access card', NULL, 'pre_joining', 'admin', -2, false, 4),
      (p_org_id, v_standard, 'Tell the team somebody is joining', 'A short note so the team knows who is arriving and what they will be doing.', 'pre_joining', 'manager', -1, false, 5),

      -- Day one
      (p_org_id, v_standard, 'Welcome and introduce to the team', NULL, 'day_1', 'manager', 0, true, 6),
      (p_org_id, v_standard, 'Hand over the laptop and ID card', NULL, 'day_1', 'it', 0, true, 7),
      (p_org_id, v_standard, 'Create email and system accounts', NULL, 'day_1', 'it', 0, true, 8),
      (p_org_id, v_standard, 'Complete joining formalities', 'Sign the appointment letter and the rest of the joining paperwork.', 'day_1', 'hr', 0, true, 9),
      (p_org_id, v_standard, 'Share the handbook and code of conduct', NULL, 'day_1', 'hr', 0, true, 10),
      (p_org_id, v_standard, 'Assign a buddy', 'Somebody from the team they can ask anything, however small.', 'day_1', 'hr', 0, true, 11),
      (p_org_id, v_standard, 'Office tour and safety briefing', 'Fire exits, first aid, pantry and who to call for what.', 'day_1', 'admin', 0, false, 12),

      -- First week
      (p_org_id, v_standard, 'Add bank details for salary', 'Needed before the first payroll run, or the salary cannot be paid.', 'week_1', 'employee', 2, true, 13),
      (p_org_id, v_standard, 'Submit PF Form 11 and the Form 2 nomination', 'Provident fund declaration and who the balance goes to.', 'week_1', 'employee', 3, true, 14),
      (p_org_id, v_standard, 'Submit the investment declaration', 'Decides how much tax is deducted each month. Late means a larger deduction early in the year.', 'week_1', 'employee', 5, true, 15),
      (p_org_id, v_standard, 'Walk through the tools and systems', NULL, 'week_1', 'buddy', 2, false, 16),
      (p_org_id, v_standard, 'First one to one with the manager', NULL, 'week_1', 'manager', 5, true, 17),
      (p_org_id, v_standard, 'Complete information security training', NULL, 'week_1', 'employee', 7, true, 18),
      (p_org_id, v_standard, 'Agree goals for the probation period', 'What good looks like by the confirmation date, written down.', 'week_1', 'manager', 7, true, 19),

      -- First month
      (p_org_id, v_standard, 'Confirm nominee details for PF and gratuity', NULL, 'month_1', 'employee', 15, true, 20),
      (p_org_id, v_standard, 'Complete POSH training', 'Prevention of sexual harassment. Required of every employee.', 'month_1', 'employee', 21, true, 21),
      (p_org_id, v_standard, '30 day check-in with HR', 'How are they settling in, and is anything still missing.', 'month_1', 'hr', 30, true, 22),
      (p_org_id, v_standard, 'Review progress against the probation goals', NULL, 'month_1', 'manager', 30, true, 23);
  END IF;

  -- ── 2. Engineering new joiner ─────────────────────────────────────────
  SELECT id INTO v_eng FROM onboarding_templates
   WHERE organization_id = p_org_id AND name = 'Engineering New Joiner';

  IF v_eng IS NULL THEN
    INSERT INTO onboarding_templates (organization_id, name, description, department_id, is_default, is_active)
    VALUES (p_org_id, 'Engineering New Joiner',
            'The standard list plus everything an engineer needs to get their first change shipped.',
            v_eng_dept, false, true)
    RETURNING id INTO v_eng;

    -- The standard list, copied, so editing one does not change the other.
    INSERT INTO onboarding_template_tasks
      (organization_id, template_id, title, description, category, owner_role, due_offset_days, is_mandatory, sort_order)
    SELECT p_org_id, v_eng, title, description, category, owner_role, due_offset_days, is_mandatory, sort_order
    FROM onboarding_template_tasks WHERE template_id = v_standard;

    INSERT INTO onboarding_template_tasks
      (organization_id, template_id, title, description, category, owner_role, due_offset_days, is_mandatory, sort_order)
    VALUES
      (p_org_id, v_eng, 'Give access to the code repositories', NULL, 'day_1', 'it', 0, true, 30),
      (p_org_id, v_eng, 'Set up the development environment', 'Get the project building and running on their machine.', 'week_1', 'buddy', 1, true, 31),
      (p_org_id, v_eng, 'Walk through branching and code review', 'How work gets from a branch to production here.', 'week_1', 'buddy', 3, true, 32),
      (p_org_id, v_eng, 'Pick up a first small task', 'Something real and small enough to finish in the first week.', 'week_1', 'manager', 5, true, 33),
      (p_org_id, v_eng, 'Architecture overview session', 'How the pieces fit together and why.', 'month_1', 'manager', 10, false, 34),
      (p_org_id, v_eng, 'Add to the on-call rota', 'Only once they have shipped a few changes.', 'month_1', 'manager', 30, false, 35);
  END IF;

  -- ── 3. Intern ─────────────────────────────────────────────────────────
  -- Shorter, and no provident fund tasks: a stipend carries no PF.
  SELECT id INTO v_intern FROM onboarding_templates
   WHERE organization_id = p_org_id AND name = 'Intern Onboarding';

  IF v_intern IS NULL THEN
    INSERT INTO onboarding_templates (organization_id, name, description, employment_type, is_default, is_active)
    VALUES (p_org_id, 'Intern Onboarding',
            'A shorter list for interns. No provident fund tasks, because a stipend carries none.',
            'intern', false, true)
    RETURNING id INTO v_intern;

    INSERT INTO onboarding_template_tasks
      (organization_id, template_id, title, description, category, owner_role, due_offset_days, is_mandatory, sort_order)
    VALUES
      (p_org_id, v_intern, 'Send the internship letter', 'Dates, stipend and who they report to.', 'pre_joining', 'hr', -5, true, 1),
      (p_org_id, v_intern, 'Collect documents', 'Aadhaar, bank details and the college bonafide certificate.', 'pre_joining', 'hr', -3, true, 2),
      (p_org_id, v_intern, 'Raise the IT request', 'Laptop and accounts for the length of the internship.', 'pre_joining', 'it', -3, true, 3),
      (p_org_id, v_intern, 'Welcome and introduce to the team', NULL, 'day_1', 'manager', 0, true, 4),
      (p_org_id, v_intern, 'Hand over the laptop and ID card', NULL, 'day_1', 'it', 0, true, 5),
      (p_org_id, v_intern, 'Assign a mentor', 'The person responsible for the internship going well.', 'day_1', 'hr', 0, true, 6),
      (p_org_id, v_intern, 'Share the handbook and code of conduct', NULL, 'day_1', 'hr', 0, true, 7),
      (p_org_id, v_intern, 'Add bank details for the stipend', NULL, 'week_1', 'employee', 2, true, 8),
      (p_org_id, v_intern, 'Complete information security training', NULL, 'week_1', 'employee', 5, true, 9),
      (p_org_id, v_intern, 'Complete POSH training', 'Required of interns as well as employees.', 'week_1', 'employee', 7, true, 10),
      (p_org_id, v_intern, 'Agree what the internship will deliver', 'A clear project with a start and an end.', 'week_1', 'manager', 5, true, 11),
      (p_org_id, v_intern, 'Mid-internship review', NULL, 'month_1', 'manager', 30, true, 12);
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.seed_onboarding_templates(UUID) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION seed_onboarding_templates(UUID) IS
  'Seeds the three starter onboarding templates. Skips any template whose name already exists, so edits made in the app are never overwritten.';

-- New organisations get them without anyone having to remember.
CREATE OR REPLACE FUNCTION seed_onboarding_templates_for_new_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM seed_onboarding_templates(NEW.id);
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.seed_onboarding_templates_for_new_org() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_seed_onboarding_templates ON organizations;
CREATE TRIGGER trg_seed_onboarding_templates
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION seed_onboarding_templates_for_new_org();

DO $$
DECLARE
  v_org UUID;
BEGIN
  FOR v_org IN SELECT id FROM organizations LOOP
    PERFORM seed_onboarding_templates(v_org);
  END LOOP;
END $$;
