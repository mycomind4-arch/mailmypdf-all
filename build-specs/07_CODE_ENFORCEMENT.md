# Claude Code Build Prompt: Code Enforcement

## Mission

Build Code Enforcement — a property-centric command center for understanding, managing, and responding to local code-enforcement cases. Users paste or upload a code-enforcement notice, enter an address or case number, and the system identifies jurisdiction, alleged violations, dates, deadlines, and requested actions. It then builds an evidence-backed action plan: cure, communicate, request records, request inspection, seek hearing/review, appeal, or prepare a response.

## Ecosystem Context

Code Enforcement is part of the MailMyPDF ecosystem. It shares:
- **One MailMyPDF Account** (Supabase auth)
- **Canonical pricing engine** (`@mailmypdf/pricing`)
- **Ecosystem shell** (shared navigation)
- **MailMyPDF fulfillment** (Lob mailing, tracking, proof)
- **Canonical SEO** under `mailmypdf.ai/permit/*` (regulatory/permit family)

### Pipeline: P09 Regulatory / Permit / Rights Response (with P03 Appeal)

```
INTAKE → CLASSIFY → EXTRACT → EVIDENCE → TIMELINE → APPLICABLE RULES →
IDENTIFY WEAKNESSES/OPPORTUNITIES → STRATEGY → DRAFT → VALIDATE →
REVIEW → AUTHORIZE → SEND → TRACK → PROOF
```

Code Enforcement reuses evidence-first architecture patterns from FairProcess/FairProcessMaps and the appeal pipeline (P03) for enforcement appeals.

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
- **Maps:** MapLibre GL JS (optional, for property/parcel context)
- **Build:** Vite → Cloudflare Workers
- **Node:** 20+

## Design System

Inherit the MailMyPDF premium design system.

### Product Personality

Clear, practical, property-focused, evidence-first. The product should answer five questions immediately: What is happening? What evidence supports it? What is missing or inconsistent? What can I do next? What should I send?

### Visual Language
- MailMyPDF warm paper/ink palette (inherited)
- Cobalt accent for actions
- Postal red for deadlines/penalties
- Case cards with violation summaries
- Property/parcel context when available
- Timeline with procedural checkpoints
- Evidence vault with source links
- AVOID: dense legal jargon, generic dashboards

## Ecosystem Shell

```typescript
const shellConfig: EcosystemShellConfig = {
  brand: "Code Enforcement",
  brandTagline: "Understand the violation. Build your response. Mail it with proof.",
  mailPdfUrl: "https://mailmypdf.ai/mail-a-pdf",
  workflowsUrl: "/workflows",
  howItWorksUrl: "/how-it-works",
  pricingUrl: "/pricing",
  authUrl: "/auth",
  startUrl: "/start",
  dashboardUrl: "/dashboard",
  productsUrl: "/products",
  currentProductSlug: "code-enforcement",
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

-- Code enforcement cases
CREATE TABLE IF NOT EXISTS code_enforcement_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'intake',
  jurisdiction TEXT,                          -- city, county
  case_number TEXT,
  citation_number TEXT,
  property_address TEXT,
  apn TEXT,                                   -- assessor parcel number
  notice JSONB DEFAULT '{}'::jsonb,           -- extracted notice data
  violations JSONB DEFAULT '[]'::jsonb,       -- alleged violations
  evidence JSONB DEFAULT '[]'::jsonb,          -- uploaded evidence
  timeline JSONB DEFAULT '[]'::jsonb,         -- events/deadlines
  findings JSONB DEFAULT '[]'::jsonb,         -- issues/discrepancies
  draft TEXT DEFAULT '',                       -- response draft
  review JSONB,                               -- validation
  packet JSONB,                               -- mailing packet
  proof JSONB,                                -- proof of mailing
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mailings
CREATE TABLE IF NOT EXISTS mailings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES code_enforcement_cases(id) ON DELETE CASCADE,
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

### Code Enforcement Pricing Profiles

| Workflow ID | Band | Base Price | Status |
|---|---|---|---|
| `appeal-code-enforcement-decision` | ADVANCED | $49.99 | production |
| `request-administrative-hearing` | STANDARD | $29.99 | production |
| `respond-to-abatement-notice` | STANDARD | $24.99 | production |
| `dispute-code-enforcement-fine` | STANDARD | $29.99 | production |

Mail prices: Standard $4.99, Certified $14.94, Registered $32.49.

## Application Architecture

### Case Intake

- Paste or upload a notice
- Enter an address, APN, case number, or citation number
- AI identifies jurisdiction, agency, case identifiers, alleged violations, dates, deadlines, and requested action
- User confirms extracted facts before they become case facts

### Case Command Center

- **At a Glance:** status, urgency, next deadline, exposure, open issues
- **Timeline:** every known event with source links and confidence
- **Violations:** each allegation, ordinance/code reference, inspection date, compliance requirement, cure status, and evidence
- **Evidence:** documents, photos, videos, permits, correspondence, service proof, public records
- **Property Intelligence:** parcel, zoning, permits, prior cases, ownership/history, map context (when available)
- **Issues & Findings:** missing evidence, contradictions, procedural checkpoints, items needing human review
- **Actions:** tasks, deadlines, record requests, calls, inspections, responses, appeals
- **Communications:** draft and track letters; connect to certified-mail workflows

### Initial Analysis Engine

First deterministic checks should cover:
- Notice/service completeness
- Deadline and compliance-period calculation
- Hearing/review/appeal references
- Enforcement action before required notice or cure period
- Duplicate or contradictory case events
- Unexplained case status transitions
- Penalty/fine escalation without supporting event
- Missing inspection/photographic evidence
- Permit/code relationship conflicts
- Inconsistent property or parcel identifiers
- Missing correspondence or response records

All findings include severity, rationale, evidence references, rule/policy version, and review status.

### AI Assistant

Case-grounded. Must distinguish:
- **Fact** — directly supported by evidence
- **Inference** — reasoned from evidence but not directly stated
- **Unknown** — evidence is missing
- **Rule** — supplied by a jurisdiction policy source
- **Recommendation** — proposed next step, requiring user approval

Must never silently convert an absent record into proof that something did not happen.

## Workflow Catalog

### Tier 1 — Core Money Workflows
1. Respond to Code Violation Notice
2. Respond to Notice of Violation
3. Respond to Property Maintenance Violation
4. Respond to Building Code Violation
5. Respond to Zoning Violation
6. Respond to Unpermitted Construction Notice
7. Request Code Enforcement Extension
8. Request Additional Time to Correct Violations
9. Submit Proof of Correction
10. Request Reinspection
11. Dispute Code Enforcement Citation
12. Appeal Code Enforcement Decision
13. Request Administrative Hearing
14. Respond to Abatement Notice
15. Dispute Code Enforcement Fine/Penalty

### Tier 2 — High-Value Supporting Workflows
16-30: Records requests, inspection records, case status, proof of correction, compliance confirmation, case closure, penalty reduction, payment plans, voluntary compliance agreements

### Tier 3 — Specialized Property Situations
31-45: Nuisance, trash, vegetation, unsafe structure, vacant property, illegal occupancy, parking, signage, fence/setback, noise, short-term rental, zoning use, building permit violations

### Tier 4 — Escalation Workflows
46-60: Supervisor review, administrative review, hearing continuance, supplemental evidence, witness statements, challenge findings, challenge abatement, appeal citations, appeal decisions

### First Family to Build

Build the complete lifecycle first:
```
Notice → Analyze → Respond → Extend → Cure → Reinspect → Close
```

This family establishes reusable workflow-factory patterns for the remaining catalog.

## Routes

### Public Routes
- `/` — Homepage
- `/start` — Start a case (intake)
- `/workflows` — Workflow directory (by tier)
- `/how-it-works`, `/pricing`, `/products` — Standard pages
- `/about`, `/contact`, `/faq` — Static pages
- `/auth`, `/account` — Auth pages

### Authenticated Routes
- `/dashboard` — Case list
- `/cases/$id` — Case command center

### API Routes
- `POST /api/cases/create` — Create case
- `POST /api/workflows/$workflowId/analyze` — AI analysis
- `POST /api/workflows/$workflowId/draft` — Draft response
- `POST /api/checkout` — Stripe checkout
- `POST /api/stripe-webhook` — Stripe webhook

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
APP_URL=https://code-enforcement.pages.dev (or mailmypdf.ai/permit/*)

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
      workflows/$workflowId/analyze.ts
      workflows/$workflowId/draft.ts
      checkout.ts
      stripe-webhook.ts
    pricing.tsx, how-it-works.tsx, products.tsx
    about.tsx, contact.tsx, faq.tsx
    privacy.tsx, terms.tsx
  components/
    ecosystem-shell.tsx, ecosystem-shell-config.ts
    site-header.tsx, site-footer.tsx
    case-command-center.tsx       # Main workspace
    violation-summary.tsx
    evidence-vault.tsx
    timeline-view.tsx
    findings-view.tsx
  lib/
    auth.tsx, auth-guard.ts
  platform/
    supabase.ts, mailmypdf.ts, simple-pdf.ts, llm-service.ts
  domain/
    workflow-catalog.ts            # 60 workflow definitions
    violation-types.ts
    jurisdiction-rules.ts
    analysis-engine.ts
  types/
    index.ts
  styles.css
  router.tsx
```

## Guardrails

- This is evidence-management, procedural-analysis, and workflow software
- It does NOT decide that a violation is legally invalid
- It does NOT accuse an agency of misconduct
- It does NOT replace an attorney
- Jurisdictional rules must be reviewed before activation
- Consequential communications require human approval
- Never silently convert an absent record into proof that something did not happen
- Reuse FairProcess/FairProcessMaps evidence-first patterns: evidence vault, provenance, content hashes, timeline, discrepancy detection, append-only audit
