# Claude Code Build Prompt: Immigration Mail

## Mission

Build Immigration Mail — the document-and-correspondence preparation specialist for immigration-related notices, requests, evidence packets, and responses. Users receive a USCIS notice (RFE, NOID, denial, rejection), upload it, the system understands what was requested, organizes the record, identifies gaps, prepares a response, reviews it, and mails it with proof. The interface must feel careful, organized, reassuring, and procedural — without implying guaranteed immigration outcomes or legal representation.

## Ecosystem Context

Immigration Mail is part of the MailMyPDF ecosystem. It shares:
- **One MailMyPDF Account** (Supabase auth)
- **Canonical pricing engine** (`@mailmypdf/pricing`)
- **Ecosystem shell** (shared navigation)
- **MailMyPDF fulfillment** (Lob mailing, tracking, proof)
- **Canonical SEO** under `mailmypdf.ai/immigration/*`

### Pipeline: P05 Immigration Evidence / Response

```
SECURE INGEST → CLASSIFY → EXTRACT → UNDERSTAND → FACTS + PROVENANCE →
TIMELINE / DEADLINES → ISSUES / DISCREPANCIES → EVIDENCE →
AUTHORITY / RESEARCH → STRENGTH / RISK → STRATEGY → DRAFT →
VALIDATE → BLOCKING GATES → HUMAN REVIEW → AUTHORIZED MAIL → TRACK → PROVE
```

For immigration, the pipeline emphasizes:
- Understanding the specific request (RFE items, NOID concerns, denial reasons)
- Document/evidence organization and matching
- Missing-item detection (critical for RFE responses)
- Chronology and deadline preservation

## Tech Stack

- **Framework:** TanStack Start (file-based routing, SSR, server functions)
- **UI:** React 19, Tailwind CSS 4, Radix UI, lucide-react
- **Routing:** TanStack Router with `@tanstack/router-plugin`
- **Auth:** Supabase (`@supabase/supabase-js`)
- **Payments:** Stripe (`stripe` server-side, `@stripe/stripe-js` client)
- **Mailing:** MailMyPDF fulfillment via Lob (server-side)
- **PDF:** `pdf-lib`
- **Validation:** Zod + `@tanstack/zod-adapter`
- **Pricing:** `@mailmypdf/pricing` package
- **Build:** Vite → Cloudflare Workers
- **Node:** 20+

## Design System

Inherit the MailMyPDF premium design system. Use Notice Respond as the quality benchmark, but give Immigration Mail a calmer case-packet identity.

### Product Personality

Careful, calm, precise, organized. The interface should feel organized and reassuring without implying guaranteed immigration outcomes.

### Visual Language
- Warm paper and ink palette (inherited)
- Postal red/stamp accents (inherited, used sparingly)
- Serif editorial headings (Instrument Serif)
- Monospace case/reference metadata (JetBrains Mono) — case numbers, receipt numbers, A-numbers
- Envelope, document, checklist, timeline, and packet motifs
- Generous whitespace and clear document hierarchy
- AVOID: fear-based copy, generic chatbot aesthetics, implying legal representation

## Ecosystem Shell

```typescript
const shellConfig: EcosystemShellConfig = {
  brand: "Immigration Mail",
  brandTagline: "Understand what was requested. Organize the record. Mail it with proof.",
  mailPdfUrl: "https://mailmypdf.ai/mail-a-pdf",
  workflowsUrl: "/workflows",
  howItWorksUrl: "/how-it-works",
  pricingUrl: "/pricing",
  authUrl: "/auth",
  startUrl: "/start",
  dashboardUrl: "/dashboard",
  productsUrl: "/products",
  currentProductSlug: "immigration-mail",
  caseTerm: "Cases",
  ctaLabel: "Start Now",
  theme: "default",
  auth: { user, loading, signOut },
};
```

## Authentication

Same Supabase auth pattern as all ecosystem products. See MailMyPDF core prompt for full implementation.

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

-- Immigration cases
CREATE TABLE IF NOT EXISTS immigration_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'intake',
  notice_type TEXT,                          -- RFE, NOID, denial, rejection, I-797, etc.
  receipt_number TEXT,                        -- USCIS receipt number (e.g., WAC1234567890)
  case_number TEXT,                           -- EOIR case number if applicable
  notice JSONB DEFAULT '{}'::jsonb,          -- extracted notice data
  documents JSONB DEFAULT '[]'::jsonb,        -- uploaded documents
  requested_items JSONB DEFAULT '[]'::jsonb,  -- RFE requested evidence items
  evidence JSONB DEFAULT '[]'::jsonb,         -- organized evidence
  timeline JSONB DEFAULT '[]'::jsonb,        -- events/deadlines
  gaps JSONB DEFAULT '[]'::jsonb,            -- missing items
  draft TEXT DEFAULT '',                      -- response/cover letter draft
  review JSONB,                               -- validation results
  packet JSONB,                               -- final mailing packet
  proof JSONB,                                -- proof of mailing
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mailings
CREATE TABLE IF NOT EXISTS mailings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES immigration_cases(id) ON DELETE CASCADE,
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

-- Recipients
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

Use `@mailmypdf/pricing` canonical engine.

### Immigration Mail Pricing Profiles

| Workflow ID | Band | Base Price | Mail Included | Status |
|---|---|---|---|---|
| `respond-to-notice` | ADVANCED | $59.99 | none | production |
| `supporting-documents` | STANDARD | $29.99 | none | production |
| `explanation-letter` | STANDARD | $29.99 | none | production |

Mail prices: Standard $4.99, Certified $14.94, Registered $32.49.

### Checkout Flow

Same pattern as other verticals:
1. User completes response draft + selects recipient + mailing method
2. Server calculates quote via `calculateQuote()`
3. Creates Stripe Checkout Session
4. Stripe webhook handles fulfillment

## Application Architecture

### Packet-Oriented Workspace

```
Request/Notice → Required Items → Documents → Facts → Draft →
Packet Review → Mailing → Proof
```

### Key Workspace Features

- **Notice Understanding:** Extract notice type (RFE, NOID, denial, rejection, I-797/I-797C), receipt number, deadlines, requested actions, specific evidence requests
- **Document Organization:** Upload and organize documents into a packet — notice, supporting evidence, forms, correspondence, chronology
- **Request Matching:** Match uploaded documents to RFE/NOID requested items
- **Missing-Item Detection:** Identify gaps — what was requested but not provided
- **Timeline:** Build chronology from case documents
- **Drafting:** AI-assisted cover letter/response grounded in case documents
- **Review:** User must review and approve before mailing
- **Mailing:** USCIS address selection, certified mail recommended, proof packet

### State Quality

Every stage needs loading, empty, partial-result, warning, error, success, and review states. Document provenance and missing information must be obvious. Distinguish:
- **Extracted facts** — from uploaded documents
- **User-provided facts** — manually entered
- **Inference** — reasoned from available information
- **Unresolved** — questions that cannot be answered from available documents

## Homepage Architecture

1. **Hero** — "Prepare important immigration correspondence without a printer." Focused on receiving an immigration notice/request and knowing what to do next.
2. **Workflow Strip** — Understand Request → Organize Documents → Identify Gaps → Prepare → Review → Mail → Track → Prove
3. **Workflow Directory** — Verified immigration correspondence types
4. **Document Packet Visualization** — Notice, supporting evidence, forms, correspondence, chronology
5. **Analysis Capabilities** — Request extraction, document matching, missing-item detection, chronology, response preparation
6. **Trust/Safety Section** — Source-grounded output, user review, non-legal-advice language
7. **MailMyPDF Fulfillment Bridge** — Printing, postage, tracking, proof
8. **FAQ** — Clear non-legal-advice language
9. **Ecosystem Footer**

## Workflow Directory

Immigration Mail covers these workflow types:

### Core Workflows
- **Respond to a USCIS Notice** (RFE, NOID, denial, rejection)
- **Supporting Documents** (organize and submit evidence)
- **Explanation Letter** (supporting-evidence letter for immigration submission)

### Specific Notice Types
- I-797 / I-797C understanding
- RFE response
- NOID response
- USCIS denial/rejection response
- Visa refusal response
- Immigration appeal letter

### Form-Specific RFE Responses
- I-130 RFE/NOID response
- I-140 RFE response
- I-485 RFE response
- N-400 RFE response
- I-751 NOID response

### Records Requests
- USCIS FOIA request
- EOIR FOIA request
- ICE FOIA request
- G-639 records request

## Routes

### Public Routes
- `/` — Homepage
- `/start` — Start a case (intake)
- `/auth` — Sign in / sign up
- `/account` — Account settings
- `/dashboard` — Case list
- `/respond-to-a-uscis-notice` — Main analysis workspace
- `/analyze` — Analysis API
- `/cases` — Case management
- `/i-797-notice/` — I-797 notice type page
- `/rfe/` — RFE workflow directory
- `/rfe/$slug` — Specific RFE workflow (I-130, I-140, I-485, N-400, etc.)
- `/noid/` — NOID workflow directory
- `/noid/$slug` — Specific NOID workflow
- `/uscis-denial/` — USCIS denial/rejection directory
- `/appeal/` — Immigration appeal directory
- `/appeal/$slug` — Specific appeal workflow
- `/i-130/` — I-130 workflow directory
- `/i-130/$slug` — Specific I-130 workflow
- `/how-it-works` — Process page
- `/pricing` — Pricing page
- `/products` — Ecosystem products
- `/about`, `/contact`, `/faq` — Static pages
- `/resources/$slug`, `/resources` — Resources
- `/privacy`, `/terms` — Legal pages
- `/mail-a-pdf` — Mail a PDF link

### API Routes
- `POST /api/checkout` — Stripe checkout
- `POST /api/stripe-webhook` — Stripe webhook
- `POST /api/analyze` — AI analysis
- `GET /api/auth/status` — Auth status
- `POST /api/cases/create` — Create case
- `GET /api/cases` — List cases

## AI Integration

### Analysis Pipeline

1. **Extract:** Parse USCIS notice — identify notice type (RFE, NOID, denial, I-797C, etc.), receipt number, filing type, deadline, requested evidence items, denial reasons
2. **Classify:** Determine the specific form type (I-130, I-140, I-485, N-400, I-751, etc.) and applicable workflow
3. **Document Matching:** Match uploaded documents to RFE requested items
4. **Gap Detection:** Identify what was requested but not provided — critical for RFE responses
5. **Timeline:** Build chronology from case documents (filing date, notice date, response deadline, biometrics, etc.)
6. **Draft:** Generate cover letter / response grounded in case documents

### AI Safety Rules

- Never invent immigration facts, deadlines, forms, filing addresses, eligibility, legal conclusions, or agency outcomes
- Where information is not verified, show an explicit review state
- Separate extracted facts, user-provided facts, inference, and unresolved questions
- Never imply that an immigration filing or response is guaranteed to succeed
- Never claim legal representation

## Configuration

```
# Supabase (shared)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
VITE_STRIPE_PUBLISHABLE_KEY=...

# Lob
LOB_API_KEY=...

# App
APP_URL=https://immigration-mail.pages.dev

# AI
GEMINI_API_KEY=... (or other provider)
```

## File Structure

```
src/
  routes/
    __root.tsx
    index.tsx                    # Homepage
    start.tsx                    # Intake
    auth.tsx                     # Auth page
    dashboard.tsx                # Case dashboard
    account.tsx                  # Account settings
    cases.tsx                    # Case management
    analyze.tsx                  # Analysis API route
    respond-to-a-uscis-notice.tsx  # Main workspace
    i-797-notice/index.tsx       # I-797 notice type
    rfe/index.tsx                # RFE directory
    rfe/$slug.tsx                # Specific RFE workflows
    noid/index.tsx               # NOID directory
    noid/$slug.tsx               # Specific NOID workflows
    uscis-denial/index.tsx       # USCIS denial directory
    appeal/index.tsx             # Appeal directory
    appeal/$slug.tsx             # Specific appeal
    i-130/index.tsx              # I-130 directory
    i-130/$slug.tsx               # I-130 workflows
    api/
      checkout.ts                # Stripe checkout
      stripe-webhook.ts          # Stripe webhook
      analyze.ts                 # AI analysis
      auth/status.ts             # Auth status
      cases/create.ts            # Create case
      cases/index.ts             # List cases
    pricing.tsx, how-it-works.tsx, products.tsx, about.tsx, contact.tsx, faq.tsx
    resources/index.tsx, resources/$slug.tsx
    privacy.tsx, terms.tsx, mail-a-pdf.tsx
  components/
    ecosystem-shell.tsx
    ecosystem-shell-config.ts
    site-header.tsx
    site-footer.tsx
    immigration-workspace.tsx     # Main case workspace
    notice-understanding.tsx     # Notice extraction UI
    document-packet.tsx          # Document organization UI
    gap-detection.tsx            # Missing item UI
    timeline-view.tsx            # Timeline
  lib/
    auth.tsx                     # AuthProvider
    auth-guard.ts                 # Server auth
  platform/
    supabase.ts
    mailmypdf.ts                  # Fulfillment
    simple-pdf.ts
    text-extraction.ts
    llm-service.ts
  domain/
    notice-types.ts              # USCIS notice type catalog
    workflows.ts                  # Workflow catalog
    uscis-forms.ts               # Form-specific logic
    foia-types.ts                # FOIA request types
  styles.css
  router.tsx
```

## Guardrails

- Never imply that an immigration filing or response is guaranteed to succeed
- Never fabricate forms, facts, dates, legal conclusions, or filing outcomes
- Never claim legal representation
- Separate extracted facts, user-provided facts, inference, and unresolved questions
- The final reviewed correspondence is the handoff artifact to MailMyPDF
- Show when the document is ready for physical mailing — preserve fulfillment status when real integration is available
- Do not fake a successful mailing
- Catalog pages may be polished without claiming unsupported execution
