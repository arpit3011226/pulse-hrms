-- A standard exit interview, ready to use.
--
-- P7-14: the exit interview screen was built but no questions existed and none
-- were seeded, so nobody could answer one. HR would have had to write the whole
-- set by hand, from a blank screen, on the day someone resigned.
--
-- This is a normal set for a services company: why they are leaving, then the
-- things that usually explain it — the work, the manager, growth, pay, the team
-- — and finally whether they would come back or recommend the place. Ratings are
-- 1 to 5, which is what the screen renders.
--
-- HR can edit, reorder or switch any of these off from Alumni → Exit Interviews.
-- Nothing here is fixed.

CREATE OR REPLACE FUNCTION seed_exit_interview_questions(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only ever fills an empty set, so it is safe to run again and never
  -- overwrites what HR has changed.
  IF EXISTS (SELECT 1 FROM exit_interview_questions WHERE organization_id = p_org_id) THEN
    RETURN;
  END IF;

  INSERT INTO exit_interview_questions
    (organization_id, question, question_type, options, category, sort_order, is_active)
  VALUES
    -- Why they are leaving
    (p_org_id, 'What is the main reason you are leaving?', 'single_select',
     ARRAY['Better pay', 'Better role or title', 'Career growth', 'Higher studies',
           'Relocation', 'Work-life balance', 'Manager or team', 'Company culture',
           'Health or personal reasons', 'Job security', 'Other'],
     'Reason for leaving', 1, true),
    (p_org_id, 'Was there anything we could have done to keep you?', 'text', NULL,
     'Reason for leaving', 2, true),

    -- The work itself
    (p_org_id, 'How clear were you about what was expected of you?', 'rating', NULL,
     'Your role', 3, true),
    (p_org_id, 'How interesting did you find your day-to-day work?', 'rating', NULL,
     'Your role', 4, true),
    (p_org_id, 'Did you have the tools and support you needed to do your job well?', 'rating', NULL,
     'Your role', 5, true),

    -- The manager, which is usually the real answer
    (p_org_id, 'How well did your manager support you?', 'rating', NULL,
     'Your manager', 6, true),
    (p_org_id, 'Did you get regular and useful feedback on your work?', 'rating', NULL,
     'Your manager', 7, true),
    (p_org_id, 'Did your manager listen when you raised a concern?', 'rating', NULL,
     'Your manager', 8, true),

    -- Growth
    (p_org_id, 'How happy were you with your learning and growth here?', 'rating', NULL,
     'Growth', 9, true),
    (p_org_id, 'Was it clear to you how you could grow your career here?', 'rating', NULL,
     'Growth', 10, true),

    -- Pay
    (p_org_id, 'How fair did your pay feel for the work you did?', 'rating', NULL,
     'Pay and benefits', 11, true),

    -- Team and culture
    (p_org_id, 'How would you rate working with your team?', 'rating', NULL,
     'Team and culture', 12, true),
    (p_org_id, 'How comfortable were you speaking up or disagreeing?', 'rating', NULL,
     'Team and culture', 13, true),
    (p_org_id, 'How would you rate your work-life balance?', 'rating', NULL,
     'Team and culture', 14, true),

    -- Overall
    (p_org_id, 'Would you think about working with us again in future?', 'single_select',
     ARRAY['Yes', 'Maybe', 'No'], 'Overall', 15, true),
    (p_org_id, 'Would you suggest this company to a friend looking for a job?', 'single_select',
     ARRAY['Yes', 'Maybe', 'No'], 'Overall', 16, true),
    (p_org_id, 'What should we start doing, stop doing, or keep doing?', 'text', NULL,
     'Overall', 17, true),
    (p_org_id, 'Anything else you would like to tell us?', 'text', NULL,
     'Overall', 18, true);
END $$;

REVOKE ALL ON FUNCTION public.seed_exit_interview_questions(UUID) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION seed_exit_interview_questions(UUID) IS
  'Fills an empty exit interview question set with a standard one. Does nothing if any question already exists.';

-- New organisations get the set without anyone having to remember.
CREATE OR REPLACE FUNCTION seed_exit_questions_for_new_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM seed_exit_interview_questions(NEW.id);
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.seed_exit_questions_for_new_org() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_seed_exit_questions ON organizations;
CREATE TRIGGER trg_seed_exit_questions
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION seed_exit_questions_for_new_org();

-- And every organisation that already exists without any.
DO $$
DECLARE
  v_org UUID;
BEGIN
  FOR v_org IN SELECT id FROM organizations LOOP
    PERFORM seed_exit_interview_questions(v_org);
  END LOOP;
END $$;
