-- Initial schema migration for Immigration Mail

-- Helper function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. cases: Immigration case workspace
CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    applicant_name TEXT,
    petitioner_name TEXT,
    receipt_number TEXT,
    category TEXT,
    agency TEXT,
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. case_documents: Documents uploaded to a case
CREATE TABLE IF NOT EXISTS case_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    document_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT,
    size_bytes BIGINT,
    extracted_data JSONB,
    analysis_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. case_correspondence: Correspondence records
CREATE TABLE IF NOT EXISTS case_correspondence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    workflow_id TEXT NOT NULL,
    title TEXT NOT NULL,
    draft_content TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    review_checks JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. case_timeline_entries: Timeline events for a case
CREATE TABLE IF NOT EXISTS case_timeline_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    event_type TEXT NOT NULL,
    event_date DATE NOT NULL,
    source TEXT DEFAULT 'user',
    description TEXT,
    document_id UUID REFERENCES case_documents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. case_tasks: Tasks/checklists for a case
CREATE TABLE IF NOT EXISTS case_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    source TEXT,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. mailing_orders: Physical mailing orders
CREATE TABLE IF NOT EXISTS mailing_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    correspondence_id UUID REFERENCES case_correspondence(id) ON DELETE SET NULL,
    workflow_id TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_org TEXT,
    recipient_address1 TEXT NOT NULL,
    recipient_address2 TEXT,
    recipient_city TEXT NOT NULL,
    recipient_state TEXT NOT NULL,
    recipient_zip TEXT NOT NULL,
    mail_method TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    stripe_payment_id TEXT,
    provider_order_id TEXT,
    status TEXT DEFAULT 'draft',
    tracking_number TEXT,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. mailing_proof_records: Proof of mailing records
CREATE TABLE IF NOT EXISTS mailing_proof_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mailing_order_id UUID REFERENCES mailing_orders(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    proof_type TEXT NOT NULL,
    proof_data JSONB,
    storage_path TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for foreign keys and performance
CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases(user_id);
CREATE INDEX IF NOT EXISTS idx_case_documents_case_id ON case_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_case_documents_user_id ON case_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_case_correspondence_case_id ON case_correspondence(case_id);
CREATE INDEX IF NOT EXISTS idx_case_correspondence_user_id ON case_correspondence(user_id);
CREATE INDEX IF NOT EXISTS idx_case_timeline_entries_case_id ON case_timeline_entries(case_id);
CREATE INDEX IF NOT EXISTS idx_case_timeline_entries_user_id ON case_timeline_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_case_tasks_case_id ON case_tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_case_tasks_user_id ON case_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_mailing_orders_case_id ON mailing_orders(case_id);
CREATE INDEX IF NOT EXISTS idx_mailing_orders_user_id ON mailing_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_mailing_proof_records_mailing_order_id ON mailing_proof_records(mailing_order_id);
CREATE INDEX IF NOT EXISTS idx_mailing_proof_records_user_id ON mailing_proof_records(user_id);

-- Updated_at Triggers
CREATE TRIGGER update_cases_updated_at
    BEFORE UPDATE ON cases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_case_documents_updated_at
    BEFORE UPDATE ON case_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_case_correspondence_updated_at
    BEFORE UPDATE ON case_correspondence
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_case_tasks_updated_at
    BEFORE UPDATE ON case_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mailing_orders_updated_at
    BEFORE UPDATE ON mailing_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- 1. cases
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cases"
    ON cases FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cases"
    ON cases FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cases"
    ON cases FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cases"
    ON cases FOR DELETE
    USING (auth.uid() = user_id);

-- 2. case_documents
ALTER TABLE case_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own case_documents"
    ON case_documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own case_documents"
    ON case_documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own case_documents"
    ON case_documents FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own case_documents"
    ON case_documents FOR DELETE
    USING (auth.uid() = user_id);

-- 3. case_correspondence
ALTER TABLE case_correspondence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own case_correspondence"
    ON case_correspondence FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own case_correspondence"
    ON case_correspondence FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own case_correspondence"
    ON case_correspondence FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own case_correspondence"
    ON case_correspondence FOR DELETE
    USING (auth.uid() = user_id);

-- 4. case_timeline_entries
ALTER TABLE case_timeline_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own case_timeline_entries"
    ON case_timeline_entries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own case_timeline_entries"
    ON case_timeline_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own case_timeline_entries"
    ON case_timeline_entries FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own case_timeline_entries"
    ON case_timeline_entries FOR DELETE
    USING (auth.uid() = user_id);

-- 5. case_tasks
ALTER TABLE case_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own case_tasks"
    ON case_tasks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own case_tasks"
    ON case_tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own case_tasks"
    ON case_tasks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own case_tasks"
    ON case_tasks FOR DELETE
    USING (auth.uid() = user_id);

-- 6. mailing_orders
ALTER TABLE mailing_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mailing_orders"
    ON mailing_orders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mailing_orders"
    ON mailing_orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mailing_orders"
    ON mailing_orders FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mailing_orders"
    ON mailing_orders FOR DELETE
    USING (auth.uid() = user_id);

-- 7. mailing_proof_records
ALTER TABLE mailing_proof_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mailing_proof_records"
    ON mailing_proof_records FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mailing_proof_records"
    ON mailing_proof_records FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mailing_proof_records"
    ON mailing_proof_records FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mailing_proof_records"
    ON mailing_proof_records FOR DELETE
    USING (auth.uid() = user_id);
