-- Authorised signatory for generated documents.
--
-- Letters and offer letters carry a real signature instead of the line saying the
-- document is computer generated. The image is held as a data URI because the PDF
-- is built in the browser and needs the bytes there and then; a signature is a few
-- kilobytes, so this costs little.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS signatory_name TEXT,
  ADD COLUMN IF NOT EXISTS signatory_designation TEXT,
  ADD COLUMN IF NOT EXISTS signature_image TEXT;

COMMENT ON COLUMN organizations.signatory_name IS
  'Name printed under the signature on letters and offer letters.';
COMMENT ON COLUMN organizations.signatory_designation IS
  'Designation printed under the signatory name.';
COMMENT ON COLUMN organizations.signature_image IS
  'Signature artwork as a data URI (PNG with a transparent background).';
