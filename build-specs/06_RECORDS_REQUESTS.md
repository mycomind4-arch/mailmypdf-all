# Claude Code Build Prompt: Records Requests

## Mission

Build Records Requests — a public-records request command center for requesting, tracking, receiving, analyzing, and escalating government records. This is NOT just a letter generator. It treats a request as a case with a lifecycle: Discover → Draft → Validate → Send → Track → Follow up → Receive → Organize → Analyze → Escalate → Preserve. A first-time requester should feel guided; an experienced investigator should get a deep evidence and workflow layer.

## Ecosystem Context

Records Requests is part of the MailMyPDF ecosystem. It shares:
- **One MailMyPDF Account** (Supabase auth)
- **Canonical pricing engine** (`@mailmypdf/pricing`)
- **Ecosystem shell** (shared navigation)
- **MailMyPDF fulfillment** (Lob mailing, tracking, proof)
- **Canonical SEO** under `mailmypdf.ai/records/*`

### Pipeline: P08 Records / Information Request

```
DISCOVER → DRAFT → VALIDATE → SEND → TRACK → FOLLOW UP →
RECEIVE → ORGANIZE → ANALYZE → ESCALATE → PRESERVE
```

This pipeline is unique to records requests — it extends beyond mailing into production analysis and escalation.

## Tech Stack

- **Framework:** TanStack Start (file-based routing, SSR, server functions)
- **UI:** React 19, Tailwind CSS 4, Radix UI, lucide-react
- **Routing:** TanStack Router with `@tanstack/router-plugin`
- **Auth:** Supabase (`@supabase/supabase-js`)
- **Payments:** Stripe (`stripe` server-side)
- **Mailing:** MailMyPDF fulfillment via Lob (server-side)
- **PDF:** `pdf-lib`
- **Validation:** Zod
- **Pricing:** `@mailmypdf/pricing` package
- **Build:** Vite → Cloudflare Workers
- **Node:** 20+

## Design System

Inherit the MailMyPDF premium design system.

### Product Personality

Guided, thorough, investigative, evidence-first. The interface should make a first-time requester feel guided while giving experienced users deep evidence and workflow tools.

### Visual Language
- MailMyPDF warm paper/ink palette (inherited)
- Cobalt accent for actions
- Postal red for deadlines/urgent status
- Serif headings, sans body, mono metadata
- Case cards, document cards, timeline markers, evidence chips
- Production audit views with discrepancy highlighting
- AVOID: generic SaaS dashboard, cluttered tables without hierarchy

## Ecosystem Shell

```typescript
const shellConfig: EcosystemShellConfig = {
  brand: "Records Request",
  brandTagline: "Request government records. Track the response. Keep the evidence.",
  mailPdfUrl: "https://mailmypdf.ai/mail-a-pdf",
  workflowsUrl: "/workflows",
  howItWorksUrl: "/how-it-works",
  pricingUrl: "/pricing",
  authUrl: "/auth",
  startUrl: "/start",
  dashboardUrl: "/dashboard",
  productsUrl: "/products",
  currentProductSlug: "records-request",
  caseTerm: "Cases",
  ctaLabel: "Start Now",
  theme: "default",
  auth: { user, loading, signOut },
};
```

## Authentication

Same Supabase auth pattern as all ecosystem products.

## Database Schema (Supabase)

```sql
-- User roles (shared)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('customer', 'admin', 'super_admin')),
  UNIQUE(user_id)
);
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Records request cases
CREATE TABLE IF NOT EXISTS records_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'intake',
  agency JSONB DEFAULT '{}'::jsonb,          -- target agency/custodian
  request_items JSONB DEFAULT '[]'::jsonb,  -- specific record categories requested
  draft TEXT DEFAULT '',                      -- request letter draft
  jurisdiction TEXT,                          -- federal, state, local
  deadlines JSONB DEFAULT '[]'::jsonb,       -- calculated milestones
  communications JSONB DEFAULT '[]'::jsonb,  -- correspondence history
  productions JSONB DEFAULT '[]'::jsonb,      -- received records
  findings JSONB DEFAULT '[]'::jsonb,        -- audit findings
  timeline JSONB DEFAULT '[]'::jsonb,        -- events
  packet JSONB,                               -- mailing packet
  proof JSONB,                                -- proof of mailing
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mailings
CREATE TABLE IF NOT EXISTS mailings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES records_cases(id) ON DELETE CASCADE,
  provider_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'assembled',
  tracking_number TEXT,
  mailing_method TEXT NOT NULL,
  recipient JSONB NOT NULL,
  stripe_session_id TEXT,
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recipients (saved agency addresses)
CREATE TABLE IF NOT EXISTS recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  organization TEXT,
  address1 TEXT NOT NULL,
  address2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  agency_type TEXT,                           -- federal, state, county, city, district
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit events
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor TEXT NOT NULL DEFAULT 'system',
  subject_id TEXT NOT NULL,
  owner_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Apply RLS to all user-data tables.

## Pricing

Use `@mailmypdf/pricing` canonical engine. Records request workflows use the platform's pricing profiles.

## Application Architecture

### Request Builder

- Identify agency and records custodian
- Guided plain-English description of what the user needs
- Convert a vague objective ("I want everything the county has about this property") into precise, searchable record categories
- Date ranges, custodians, systems, locations, identifiers, formats, and exclusions
- Generate jurisdiction-aware request language
- Detect ambiguity, overbreadth, unnecessary personal information, and likely search problems before sending

### Request Intelligence

- Track statutory response deadlines and extensions using versioned jurisdiction policy packs
- Distinguish: acknowledgement, clarification request, partial production, denial, extension, and final response
- Detect when a response appears incomplete or does not address requested categories
- Compare agency claims against the request and prior communications

### Deadline Engine

- Use versioned jurisdiction policy packs
- Store the exact rule/policy version used for every calculated milestone
- Model separately: acknowledgement, clarification, extension, production, denial, appeal/review, and follow-up milestones
- NEVER present a generic national deadline as if it applies to every jurisdiction

### Correspondence and Delivery

- Draft: initial requests, clarifications, narrowing responses, status inquiries, fee objections, deadline notices, administrative appeals
- Evidence-linked communication history
- Certified mail for proof of submission
- Delivery/proof packet integration with MailMyPDF

### Records Production Workspace

- Upload batches of PDFs, images, spreadsheets, emails, and correspondence
- OCR and normalize documents
- Deduplicate records and preserve originals
- Search across the complete production
- Extract dates, names, agencies, case numbers, properties, permits, citations
- Build relationships between records

### Production Audit Engine

Compare three layers:
1. **Requested** — the exact request items and scope
2. **Agency response** — what the agency says it searched, withheld, extended, or produced
3. **Actual production** — the files and content received

Surface evidence-backed discrepancies:
- Request item with no corresponding agency response
- Request item acknowledged but no responsive production located
- Produced record referencing an absent attachment
- Missing pages or broken files
- Duplicate records
- Inconsistent dates or identifiers
- Unexplained gaps in a communication chain
- Redaction/withholding without an identified explanation
- Production that appears to cover only part of a requested date range
- Agency description inconsistent with the actual file set

A finding must say: what was observed, what source supports it, what remains unknown. Do NOT assert that a record does not exist merely because it was not produced. Use language such as "not located in the production" or "response does not identify these requested categories."

### Escalation Workflow

Recommend the least-friction next step supported by the record:

```
clarify → narrow → status inquiry → search-details request →
additional production request → administrative review/appeal →
oversight/legal information
```

Each step produces a draft communication linked to the exact unresolved issue and supporting evidence. Sending is always user-approved.

## AI Behavior

Every material AI output should be classified as:
- **Fact** — directly supported by a source
- **Inference** — reasoned from sources
- **Unknown** — the evidence is insufficient
- **Rule** — supplied by a jurisdiction policy source
- **Recommendation** — a proposed action for user approval

Never claim that records do not exist merely because they were not produced.

## Routes

### Public Routes
- `/` — Homepage
- `/start` — Start a records request (guided intake)
- `/workflows` — Workflow directory by type (federal FOIA, state, local, police, etc.)
- `/how-it-works`, `/pricing`, `/products` — Standard pages
- `/about`, `/contact`, `/faq` — Static pages
- `/resources/$slug`, `/resources` — Resources
- `/auth`, `/account` — Auth pages
- `/privacy`, `/terms` — Legal pages

### Authenticated Routes
- `/dashboard` — Case list, recent activity, deadline alerts
- `/cases/$id` — Case detail with request, timeline, productions, findings, escalation

### API Routes
- `POST /api/cases/create` — Create case
- `GET/POST /api/records-request/analyze` — AI analysis
- `POST /api/records-request/draft` — Draft request letter
- `POST /api/records-request/validate` — Validate request
- `GET /api/records-request/readiness` — Check readiness
- `POST /api/checkout` — Stripe checkout
- `POST /api/stripe-webhook` — Stripe webhook

## Workflow Catalog

Initial workflow types:
- Federal FOIA request
- State public records request
- Local government records request
- Police incident records
- Body-camera / video records
- 911 / dispatch records
- Public employee records
- Procurement & contract records
- Permits, licenses & inspections
- Property & assessment records
- Education & school records
- Environmental & regulatory records
- USCIS FOIA request
- EOIR FOIA request
- ICE FOIA request

## Configuration

```
# Supabase (shared)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Lob
LOB_API_KEY=...

# App
APP_URL=https://records-request.pages.dev (or mailmypdf.ai/records)

# AI
GEMINI_API_KEY=... (or other provider)
```

## File Structure

```
src/
  routes/
    __root.tsx
    index.tsx
    start.tsx
    auth.tsx, account.tsx, dashboard.tsx
    workflows/index.tsx
    api/
      cases/create.ts
      records-request/analyze.ts
      records-request/draft.ts
      records-request/validate.ts
      records-request/readiness.ts
      checkout.ts
      stripe-webhook.ts
    pricing.tsx, how-it-works.tsx, products.tsx
    about.tsx, contact.tsx, faq.tsx
    resources/index.tsx, resources/$slug.tsx
    privacy.tsx, terms.tsx
  components/
    ecosystem-shell.tsx, ecosystem-shell-config.ts
    site-header.tsx, site-footer.tsx
    request-builder.tsx           # Guided request creation
    deadline-tracker.tsx           # Deadline milestones
    production-workspace.tsx       # Records production analysis
    audit-findings.tsx             # Discrepancy findings
    escalation-workflow.tsx        # Escalation path
  lib/
    auth.tsx, auth-guard.ts
  platform/
    supabase.ts, mailmypdf.ts, simple-pdf.ts, llm-service.ts
  domain/
    request-types.ts              # Request type catalog
    jurisdiction-packs.ts         # Versioned jurisdiction policies
    deadline-engine.ts            # Deadline calculation
    production-audit.ts            # Production audit engine
    escalation.ts                  # Escalation rules
  database/
    schema.sql
  styles.css
  router.tsx
```

## Guardrails

- Never claim that records do not exist merely because they were not produced
- Use language: "not located in the production" or "response does not identify these requested categories"
- Never present a generic national deadline as if it applies to every jurisdiction
- Every finding must include: what was observed, what source supports it, what remains unknown
- AI can propose search terms, request scope, record relationships, discrepancy candidates, and response drafts — it cannot silently invent records, legal deadlines, agency actions, or conclusions
- Sending is always user-approved
- Do not duplicate certified-mail delivery, general document generation, or common identity/RBAC infrastructure — integrate with MailMyPDF
