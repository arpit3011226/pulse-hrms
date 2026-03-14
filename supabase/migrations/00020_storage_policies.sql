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
CREATE POLICY "auth_delete_employee_docs" ON sto/Users/arpish/Desktop/HRMS - August/supabase/migrations/00021_leave_monthly_cap.sqlrage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'employee-documents');
