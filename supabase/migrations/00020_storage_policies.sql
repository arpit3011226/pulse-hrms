-- ============================================
-- Storage Bucket Policies for employee-documents
-- Allows authenticated users to upload/read/delete files
-- ============================================

-- Allow authenticated users to upload files
CREATE POLICY "auth_upload_employee_docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'employee-documents');

-- Allow authenticated users to read/download files
CREATE POLICY "auth_read_employee_docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'employee-documents');

-- Allow authenticated users to update (overwrite) files
CREATE POLICY "auth_update_employee_docs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'employee-documents');

-- Allow authenticated users to delete files
CREATE POLICY "auth_delete_employee_docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'employee-documents');

-- ── Note, 28 October 2026 ───────────────────────────────────────────────
--
-- Line 22 of this file read:
--
--   CREATE POLICY "auth_delete_employee_docs" ON sto<a file path>rage.objects
--
-- A path had been pasted into the middle of `storage.objects`, splitting it
-- in two. The file could not run, so a fresh database could never be built
-- from these migrations; the live project had been patched by hand instead
-- and nobody noticed, because production was the only database that had ever
-- run them.
--
-- Found by the developer preparing the Azure move. The policies here are
-- superseded by 00036 and, once storage moves to Azure Blob, by the access
-- checks in the `files` function — but the file still has to parse for a
-- replay to reach the migrations after it.
