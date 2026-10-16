-- QA-19: employee identity documents were downloadable by anyone on the internet.
--
-- Both storage buckets, `employee-documents` and `reimbursement-receipts`,
-- were marked public. A public bucket serves every object through
-- /storage/v1/object/public/<bucket>/<path> with no sign-in and no API key.
--
-- Careful row-level security had been written for storage.objects — eight
-- policies scoping documents to the employee's own folder, HR, and finance.
-- Marking the bucket public bypassed all of it for reads. The policies were
-- doing nothing.
--
-- Confirmed before this change, with no credentials of any kind:
--
--   GET /storage/v1/object/public/employee-documents/<uuid>/identity/pan_*.png
--   → 200, image/png, 329,665 bytes, 2418x1202
--
-- That is a scan of somebody's PAN card. With real data this is a reportable
-- personal data breach under the DPDP Act, not merely a bug.
--
-- The buckets become private, which makes the existing policies take effect,
-- and files are reached through short-lived signed URLs instead.
--
-- Also set here, because the browser's checks are a courtesy rather than a
-- control — anything posting straight to the storage API skips them:
--   * a 5 MB ceiling per file, matching what the upload form claims
--   * an allow-list of JPEG, PNG and PDF, so HTML and SVG cannot be stored
--     and served from this origin

UPDATE storage.buckets
SET public = false,
    file_size_limit = 5242880,  -- 5 MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
WHERE id IN ('employee-documents', 'reimbursement-receipts');
