-- Proof-of-Service Infrastructure — Database Schema
-- Adds the tables needed for the Proof-of-Service API layer on top of
-- the existing MailMyPDF orders/order_events schema.
--
-- This migration creates NEW tables rather than modifying the existing
-- orders table. The consumer app (MailMyPDF) continues using `orders`;
-- the API layer uses `proof_documents`, `communications`, and `custody_events`.
-- The two can coexist and share the same Supabase project.

-- ── Tenants ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.proof_tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  webhook_url TEXT,
  webhook_secret TEXT,
  lob_api_key TEXT, -- encrypted; null = use platform Lob key
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.proof_tenants ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.proof_tenants TO service_role;

-- ── API Keys ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.proof_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.proof_tenants(id) ON DELETE CASCADE,
  key_prefix TEXT NOT NULL, -- first 8 chars for identification (e.g., "sk_live_abc")
  key_hash TEXT NOT NULL, -- bcrypt hash of the full key
  environment TEXT NOT NULL DEFAULT 'live' CHECK (environment IN ('live', 'test')),
  label TEXT NOT NULL DEFAULT 'Default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

ALTER TABLE public.proof_api_keys ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.proof_api_keys TO service_role;

CREATE INDEX proof_api_keys_hash_idx ON public.proof_api_keys (key_hash) WHERE revoked_at IS NULL;
CREATE INDEX proof_api_keys_tenant_idx ON public.proof_api_keys (tenant_id);

-- ── Documents (the thing being sent — hashed on upload) ──────────────────────

CREATE TABLE IF NOT EXISTS public.proof_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.proof_tenants(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  sha256 TEXT NOT NULL, -- cryptographic hash of file contents
  size_bytes INTEGER NOT NULL,
  storage_path TEXT NOT NULL, -- internal storage reference (Supabase Storage path)
  source TEXT NOT NULL DEFAULT 'uploaded' CHECK (source IN ('uploaded', 'generated_from_template')),
  template_id UUID, -- null if uploaded directly
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.proof_documents ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.proof_documents TO service_role;

CREATE INDEX proof_documents_tenant_idx ON public.proof_documents (tenant_id, created_at DESC);
CREATE INDEX proof_documents_sha256_idx ON public.proof_documents (sha256);

-- ── Communication Records (the central object) ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.proof_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.proof_tenants(id) ON DELETE CASCADE,

  -- What was sent
  document_id UUID NOT NULL REFERENCES public.proof_documents(id) ON DELETE RESTRICT,
  document_sha256 TEXT NOT NULL, -- denormalized from document for proof bundle integrity

  -- Why it was sent (legal context — caller provides)
  legal_reference JSONB NOT NULL, -- { type, citation, description, response_window_days, response_window_ends, notes }

  -- Who it was sent to
  recipient JSONB NOT NULL, -- { name, address_line1, address_line2, city, state, postal_code, country, address_verified, lob_address_id }

  -- How it was sent
  mail_type TEXT NOT NULL CHECK (mail_type IN ('first_class', 'certified', 'certified_return_receipt', 'registered')),
  carrier TEXT NOT NULL DEFAULT 'usps',
  lob_letter_id TEXT,

  -- Delivery lifecycle
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'sent', 'in_transit', 'delivered', 'undelivered', 'returned', 'refused', 'amended')),
  tracking_number TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  signature_image_url TEXT,
  proof_of_delivery TEXT,

  -- Hash chain (per matter_reference)
  prior_record_hash TEXT, -- hash of the previous CommunicationRecord for this matter_reference
  record_sha256 TEXT NOT NULL, -- hash of this record's canonical content

  -- Generic matter reference (decoupled from any specific product)
  matter_reference TEXT NOT NULL,
  matter_type TEXT NOT NULL,

  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.proof_communications ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.proof_communications TO service_role;

CREATE INDEX proof_communications_tenant_idx ON public.proof_communications (tenant_id, created_at DESC);
CREATE INDEX proof_communications_matter_idx ON public.proof_communications (tenant_id, matter_reference);
CREATE INDEX proof_communications_status_idx ON public.proof_communications (tenant_id, status);
CREATE INDEX proof_communications_tracking_idx ON public.proof_communications (tracking_number) WHERE tracking_number IS NOT NULL;

-- ── Custody Events (the hash-linked chain) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.proof_custody_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  communication_id UUID NOT NULL REFERENCES public.proof_communications(id) ON DELETE CASCADE,

  -- Event data
  timestamp TIMESTAMPTZ NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created', 'address_verified', 'sent', 'in_transit', 'delivered',
    'undelivered', 'returned', 'refused', 'signature_captured', 'proof_generated'
  )),
  description TEXT NOT NULL,
  carrier_event_id TEXT, -- Lob/webhook event ID for dedup

  -- Hash chain
  event_hash TEXT NOT NULL, -- SHA-256 of (prior_event_hash + timestamp + event_type + description)
  prior_event_hash TEXT, -- hash of the previous CustodyEvent for this communication

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.proof_custody_events ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.proof_custody_events TO service_role;

CREATE INDEX proof_custody_events_comm_idx ON public.proof_custody_events (communication_id, timestamp);
CREATE UNIQUE INDEX proof_custody_events_carrier_dedup ON public.proof_custody_events (carrier_event_id) WHERE carrier_event_id IS NOT NULL;

-- ── Templates ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.proof_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.proof_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  vertical TEXT NOT NULL DEFAULT 'custom',
  body_html TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of variable name strings
  default_legal_reference JSONB, -- optional pre-bound legal context
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.proof_templates ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.proof_templates TO service_role;

CREATE INDEX proof_templates_tenant_idx ON public.proof_templates (tenant_id, vertical);

-- ── Webhook Delivery Log (for retry tracking) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.proof_webhook_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.proof_tenants(id) ON DELETE CASCADE,
  communication_id UUID REFERENCES public.proof_communications(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL, -- idempotency key
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'retrying')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  response_code INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.proof_webhook_deliveries ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.proof_webhook_deliveries TO service_role;

CREATE INDEX proof_webhook_deliveries_status_idx ON public.proof_webhook_deliveries (status, next_retry_at) WHERE status IN ('pending', 'retrying');
CREATE UNIQUE INDEX proof_webhook_deliveries_event_dedup ON public.proof_webhook_deliveries (event_id);

-- ── Auto-update updated_at trigger ───────────────────────────────────────────

CREATE TRIGGER update_proof_tenants_updated_at
  BEFORE UPDATE ON public.proof_tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_proof_communications_updated_at
  BEFORE UPDATE ON public.proof_communications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_proof_templates_updated_at
  BEFORE UPDATE ON public.proof_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_proof_webhook_deliveries_updated_at
  BEFORE UPDATE ON public.proof_webhook_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
