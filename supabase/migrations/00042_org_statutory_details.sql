-- Company details that appear on letters, offer letters and payslips.
--
-- The address and the CIN were previously hard-coded in three different PDF
-- generators, so correcting them needed a code release. They now live on the
-- organisation record and HR can edit them from Company Settings.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS cin TEXT;

COMMENT ON COLUMN organizations.cin IS
  'Corporate Identity Number, printed in the footer of generated documents.';

COMMENT ON COLUMN organizations.address IS
  'Registered address as {line1, line2, city, state, pincode}. Printed on the '
  'letterhead and in the footer of generated documents.';
