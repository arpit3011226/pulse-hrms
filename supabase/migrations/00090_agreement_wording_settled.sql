-- ============================================================================
-- The agreement wording has been settled by August (27 October 2026).
--
-- Each seeded template carried needs_legal_review = true and a visible
-- "Draft for review — this wording has not yet been approved by legal
-- counsel" line at the foot. That was right while nobody had looked at them.
-- It is wrong now, and leaving it on a document somebody is asked to sign
-- would undermine the document itself.
--
-- Also confirmed: no stamp duty and no stamp paper signature are required,
-- so the open question recorded against the Karnataka Stamp Act is closed.
-- The electronic footing is unchanged — section 10A of the IT Act 2000 for
-- formation, and the frozen text plus SHA-256 for evidence.
--
-- The flag stays on the table. A template edited later starts as a new
-- version, and whoever writes it can set it again if it needs another look.
-- ============================================================================

-- Two statements rather than one, each keyed on what it is actually changing.
-- Combining them meant the footer removal was conditioned on a flag the same
-- statement was clearing, which is fragile and did not take on every row.

UPDATE agreement_templates
SET body_html = regexp_replace(
      body_html,
      '<p><small><strong>Draft for review\.</strong>.*?</small></p>',
      '',
      'gs'
    )
WHERE body_html LIKE '%Draft for review%';

UPDATE agreement_templates
SET needs_legal_review = false
WHERE needs_legal_review;

-- The POSH note was not a disclaimer about the wording — it is a standing
-- fact about the Act, so it is put back rather than lost with the rest.
UPDATE agreement_templates
SET body_html = body_html ||
  '<p><small>Acknowledging this policy is one part of POSH compliance. The Act also requires a constituted Internal Committee, awareness programmes and an annual return.</small></p>'
WHERE code = 'posh'
  AND body_html NOT LIKE '%Internal Committee, awareness programmes%';
