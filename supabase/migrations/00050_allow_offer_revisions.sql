-- Offer revision could never have worked.
--
-- 00034 added offer versioning — `version`, `supersedes_offer_id`,
-- `revision_reason` — and reviseOffer() withdraws the old offer and inserts a new
-- row for the same application. But the original schema put a UNIQUE constraint
-- on candidate_application_id, so that insert always failed with a duplicate key
-- error. Revising an offer threw every single time.
--
-- Found in Phase 7 by walking the hire journey: raise a requisition, approve it,
-- add a candidate, interview, offer, then negotiate.
--
-- The intent behind the constraint was sound: one live offer per application. A
-- partial unique index says that properly, while leaving the superseded history
-- in place.

ALTER TABLE offer_letters
  DROP CONSTRAINT IF EXISTS offer_letters_candidate_application_id_key;

DROP INDEX IF EXISTS idx_one_live_offer_per_application;
CREATE UNIQUE INDEX idx_one_live_offer_per_application
  ON offer_letters (candidate_application_id)
  WHERE offer_status NOT IN ('withdrawn', 'rejected', 'expired');

COMMENT ON INDEX idx_one_live_offer_per_application IS
  'One live offer per application. Withdrawn, rejected and expired offers stay as history so a revision chain can be followed.';
