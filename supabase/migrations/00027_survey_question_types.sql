-- ============================================================================
-- Survey Multi-Question-Type Enhancement
-- ============================================================================

-- Add question_type, options, and display_as to survey_questions
ALTER TABLE survey_questions
  ADD COLUMN question_type TEXT NOT NULL DEFAULT 'rating'
    CHECK (question_type IN ('rating', 'single_select', 'multi_select', 'text')),
  ADD COLUMN options JSONB DEFAULT NULL,
  ADD COLUMN display_as TEXT DEFAULT NULL
    CHECK (display_as IS NULL OR display_as IN ('radio', 'dropdown', 'checkbox'));

-- Make survey_answers.rating nullable and remove the 1-5 constraint
-- First find and drop the check constraint on rating
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'survey_answers'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%rating%';
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE survey_answers DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE survey_answers
  ALTER COLUMN rating DROP NOT NULL;

-- Add new answer columns
ALTER TABLE survey_answers
  ADD COLUMN selected_options JSONB DEFAULT NULL,
  ADD COLUMN text_value TEXT DEFAULT NULL;

-- Ensure at least one answer field is populated
ALTER TABLE survey_answers
  ADD CONSTRAINT survey_answers_has_value CHECK (
    rating IS NOT NULL
    OR selected_options IS NOT NULL
    OR text_value IS NOT NULL
  );
