-- Storage bucket for immigration documents (private, secure)
INSERT INTO storage.buckets (id, name, public)
VALUES ('immigration-documents', 'immigration-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can only access their own documents
-- Folder structure: {user_id}/{document_id}/{filename}

CREATE POLICY "Users can upload their own documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'immigration-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read their own documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'immigration-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'immigration-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Add analysis columns to case_documents (if not already present)
-- extracted_data is already JSONB, but we add more structure
COMMENT ON COLUMN case_documents.extracted_data IS
  'Structured analysis output: document_type, agency, receipt_number, dates, deadlines, requested_actions, etc.';
COMMENT ON COLUMN case_documents.analysis_status IS
  'pending | analyzing | completed | failed';
