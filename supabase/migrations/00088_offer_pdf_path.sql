-- An accepted offer now produces a PDF the candidate keeps, the same as a
-- signed agreement. Built from the frozen terms and stored, so the copy they
-- hold is the bytes that existed at the moment they accepted — not something
-- re-rendered later from whatever the code does then.
--
-- Bucket and key, never a URL. Azure Blob is coming.

ALTER TABLE offer_letters
  ADD COLUMN IF NOT EXISTS accepted_pdf_path TEXT;

COMMENT ON COLUMN offer_letters.accepted_pdf_path IS
  'The signed offer PDF in candidate-documents. Written once on acceptance.';
