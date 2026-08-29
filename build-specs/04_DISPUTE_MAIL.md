# Claude Code Build Prompt: Dispute Mail

## Mission

Build Dispute Mail — the consumer dispute correspondence product in the MailMyPDF ecosystem. Users identify an error (debt collection, credit report, billing, unauthorized charge), the system helps them gather evidence, draft a dispute letter, review it, and mail it with certified proof. The product should feel confident, practical, and protective — "We help you make the dispute clear and keep the record."

## Ecosystem Context

Dispute Mail is part of the MailMyPDF ecosystem. It shares:
- **One MailMyPDF Account** (Supabase auth)
- **Canonical pricing engine** (`@mailmypdf/pricing`)
- **Ecosystem shell** (shared navigation)
- **MailMyPDF fulfillment** (Lob mailing, tracking, proof)
- **Canonical SEO** under `mailmypdf.ai/dispute/*`

### Pipeline: P06 Dispute / Investigation

```
SECURE INGEST → CLASSIFY → EXTRACT → UNDERSTAND → FACTS + PROVENANCE →
TIMELINE / DEADLINES → ISSUES / DISCREPANCIES → EVIDENCE →
AUTHORITY / RESEARCH → STRENGTH / RISK → STRATEGY → DRAFT →
VALIDATE → BLOCKING GATES → HUMAN REVIEW → AUTHORIZED MAIL → TRACK → PROVE
```

For disputes, the pipeline emphasizes:
- Issue identification (what exactly is wrong)
- Evidence gathering (what proves the error)
- Deadline awareness (FDCPA, FCRA, state-specific timelines)
- Escalation tracking (follow-ups, no-response handling)

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

Inherit the MailMyPDF premium design system. Use Notice Respond as the quality benchmark, but preserve Dispute Mail's stronger teal/rose identity rather than flattening it into a clone.

### Product Personality

Direct, confident, protective, practical. "We help you make the dispute clear and keep the record."

### Visual Language
- Deep teal/navy foundation (uses MailMyPDF ink palette with teal-tinted accents)
- Warm paper/cream surfaces (inherited)
- Restrained rose/red accent for disputes and actions (uses `--stamp` palette)
- Serif headlines (Instrument Serif), compact sans body (Inter), monospace metadata (JetBrains Mono)
- Document cards, evidence chips, mailing/proof badges
- AVOID: generic chatbot aesthetics, aggressive or sales-heavy tone

## Ecosystem Shell

```typescript
const shellConfig: EcosystemShellConfig = {
  brand: "Dispute Mail",
  brandTagline: "Dispute the error. Back it with evidence. Keep the proof.",
  mailPdfUrl: "https://mailmypdf.ai/mail-a-pdf",
  workflowsUrl: "/workflows",
  howItWorksUrl: "/how-it-works",
  pricingUrl: "/pricing",
  authUrl: "/auth",
  startUrl: "/start",
  dashboardUrl: "/dashboard",
  productsUrl: "/products",
  currentProductSlug: "dispute-mail",
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

-- Dispute cases
CREATE TABLE IF NOT EXISTS dispute_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'intake',
  issue JSONB DEFAULT '{}'::jsonb,          -- identified issue details
  documents JSONB DEFAULT '[]'::jsonb,       -- uploaded evidence
  analysis JSONB,                            -- AI analysis
  findings JSONB DEFAULT '[]'::jsonb,        -- identified issues
  timeline JSONB DEFAULT '[]'::jsonb,        -- events/deadlines
  draft TEXT DEFAULT '',                      -- dispute letter draft
  review JSONB,                              -- validation results
  packet JSONB,                              -- mailing packet
  proof JSONB,                               -- proof of mailing
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mailings
CREATE TABLE IF NOT EXISTS mailings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES dispute_cases(id) ON DELETE CASCADE,
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

### Dispute Mail Workflow Pricing Profiles

| Workflow ID | Band | Base Price | Status |
|---|---|---|---|
| `debt-collection-dispute` | STANDARD | $29.99 | production |
| `dispute-collection-agency` | STANDARD | $29.99 | production |
| `debt-dispute` | STANDARD | $29.99 | production |
| `debt-validation` | ESSENTIAL | $14.99 | production |
| `credit-report` | STANDARD | $29.99 | production |
| `credit-report-collections` | STANDARD | $29.99 | production |
| `hard-inquiry` | ESSENTIAL | $14.99 | production |
| `charge-off` | STANDARD | $29.99 | production |
| `medical-collections` | STANDARD | $29.99 | production |
| `student-loan` | STANDARD | $29.99 | production |
| `credit-card-billing` | ESSENTIAL | $14.99 | production |
| `unauthorized-charge` | ESSENTIAL | $14.99 | production |
| `billing-error` | ESSENTIAL | $14.99 | production |
| `subscription-billing` | ESSENTIAL | $14.99 | production |
| `service-contract` | STANDARD | $29.99 | production |
| `insurance-billing` | STANDARD | $29.99 | production |
| `follow-up-no-response` | ESSENTIAL | $12.99 | production |
| `inadequate-response` | STANDARD | $29.99 | production |
| `cease-contact` | ESSENTIAL | $12.99 | production |

Mail prices: Standard $4.99, Certified $14.94, Registered $32.49.

### Checkout Flow

1. User completes dispute draft + selects recipient + mailing method
2. Server calculates quote: `calculateQuote({ workflowId, verticalId: "dispute-mail", actualPages, mailClass })`
3. Create Stripe Checkout Session
4. Stripe webhook handles fulfillment: generate PDF, upload, create Lob letter, update case, create proof

## Application Architecture

### Case Workspace

```
Issue → Documents → Analysis → Evidence → Draft → Review → Mail → Proof
```

### Key Workspace Features

- **Issue Identification:** What exactly is wrong — debt not owed, credit report error, unauthorized charge, billing error, etc.
- **Evidence Gathering:** Upload supporting documents — account statements, credit reports, correspondence, contracts
- **Deadline Awareness:** FDCPA validation (30 days), FCRA dispute (30-45 days), state-specific timelines when supported by authoritative source
- **Analysis:** AI identifies the specific dispute grounds, applicable protections, and recommended approach
- **Drafting:** AI-assisted dispute letter grounded in the identified issue and evidence
- **Validation:** Check for unsupported claims, missing information
- **Review Gate:** User must approve before mailing
- **Mailing:** Certified mail recommended for disputes — creates proof of submission
- **Follow-Up:** Track response timelines, escalate when no response

## Homepage Architecture

1. **Hero** — "Dispute the error. Back it with evidence. Keep the proof." Focused on identifying the error
2. **Workflow Strip** — Identify → Evidence → Draft → Review → Mail → Track → Prove
3. **Dispute-Type Directory** — Credit report, debt validation, billing, unauthorized charge, and additional workflows
4. **Deadline Awareness** — Evidence requirements and response timelines
5. **Guided Analysis/Drafting** — Capabilities showcase
6. **Concrete Dispute Case Visualization** — Document cards with evidence
7. **Trust and Privacy Section** — User control, source-grounded drafting, no fabricated facts
8. **MailMyPDF Bridge** — Certified mail and proof
9. **FAQ**
10. **Ecosystem Footer**

## Workflow Pages

Each dispute workflow page should explain:
- The exact problem
- The recipient (collection agency, credit bureau, creditor, etc.)
- Useful documents to gather
- Deadline considerations (when supported by authoritative source material)
- What the system analyzes
- Evidence needed
- The resulting correspondence
- Review requirements
- Mailing/receipt process

Do not fabricate legal rights, deadlines, outcomes, testimonials, or guarantees.

## Routes

### Public Routes
- `/` — Homepage
- `/start` — Start a dispute
- `/workflows` — Workflow directory
- `/workflows/$workflowId` — Workflow detail
- `/workflows/$workflowId/start` — Start specific workflow
- `/write-a-dispute-letter` — Quick-start letter writer
- `/how-it-works`, `/pricing`, `/products` — Standard pages
- `/about`, `/contact`, `/faq` — Static pages
- `/resources/$slug`, `/resources` — Resources
- `/auth` — Auth page
- `/account` — Account settings
- `/privacy`, `/terms` — Legal pages
- `/mail-a-pdf` — Mail link

### Authenticated Routes
- `/dashboard` — Case list, recent activity

### API Routes
- `POST /api/checkout` — Stripe checkout
- `POST /api/stripe-webhook` — Stripe webhook
- `POST /api/workflows/$workflowId/analyze` — AI analysis
- `POST /api/workflows/$workflowId/claude` — Claude AI drafting
- `POST /api/workflows/$workflowId/document` — Document upload
- `GET /api/auth/status` — Auth status

## AI Integration

### Analysis Pipeline

1. **Classify:** Identify the dispute type (debt validation, credit report error, billing dispute, etc.)
2. **Extract:** Parse uploaded documents — account numbers, amounts, dates, creditor/debtor info
3. **Analyze:** Identify applicable protections (FDCPA, FCRA, state laws), dispute grounds, deadline calculations
4. **Draft:** Generate dispute letter grounded in the identified issue and evidence
5. **Validate:** Check for unsupported claims, missing required elements

### AI Safety

- Do not generate unsupported legal claims
- Deadline considerations must be supported by authoritative source material
- Distinguish: Fact (from document), Inference (reasoned), Unknown (insufficient evidence)
- Never fabricate legal rights, deadlines, or outcomes

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
APP_URL=https://dispute-mail.pages.dev

# AI
GEMINI_API_KEY=... (or ANTHROPIC_API_KEY, OPENAI_API_KEY)
```

## File Structure

```
src/
  routes/
    __root.tsx
    index.tsx                         # Homepage
    start.tsx                         # Intake
    auth.tsx                          # Auth
    dashboard.tsx                     # Case dashboard
    account.tsx                      # Account
    write-a-dispute-letter.tsx        # Quick letter writer
    workflows/
      index.tsx                       # Directory
      $workflowId.tsx                 # Detail
      $workflowId/start.tsx           # Start workflow
    api/
      checkout.ts
      stripe-webhook.ts
      workflows/$workflowId/analyze.ts
      workflows/$workflowId/claude.ts
      workflows/$workflowId/document.ts
      auth/status.ts
    pricing.tsx, how-it-works.tsx, products.tsx
    about.tsx, contact.tsx, faq.tsx
    resources/index.tsx, resources/$slug.tsx
    privacy.tsx, terms.tsx, mail-a-pdf.tsx
  components/
    ecosystem-shell.tsx
    ecosystem-shell-config.ts
    site-header.tsx
    site-footer.tsx
    dispute-workspace.tsx             # Main workspace
    workflow-directory.tsx
  lib/
    auth.tsx
    auth-guard.ts
  platform/
    supabase.ts
    mailmypdf.ts
    simple-pdf.ts
    text-extraction.ts
    llm-service.ts
  domain/
    workflows.ts                      # Dispute workflow catalog
    dispute-types.ts                  # Dispute type taxonomy
    deadlines.ts                      # Deadline rules
  server/
    checkout.ts
    stripe-webhook.ts
  styles.css
  router.tsx
```

## Guardrails

- No legal-advice claims
- No fabricated deadlines or outcomes
- No fabricated legal rights or guarantees
- No testimonials or success guarantees
- Catalog entries may exist for discovery, but only genuinely implemented capabilities enter executable runtime
- The final step must be an obvious transition from approved dispute letter to physical mailing
- Preserve the existing fulfillment integration and do not fake a successful mailing
- Emphasize user control, source-grounded drafting, no fabricated facts, explicit mailing authorization, and proof of submission
