# Claude Code Build Prompt: Private Office

## Mission

Build Private Office — the premium correspondence and evidence documentation product in the MailMyPDF family. This is for high-stakes correspondence: professionally prepared, approval-gated delivery, provably delivered, permanently documented. It should feel like a private office: quiet, capable, and trustworthy. Not aggressive or sales-heavy.

## Ecosystem Context

Private Office is part of the MailMyPDF ecosystem. It shares:
- **One MailMyPDF Account** (Supabase auth)
- **Canonical pricing engine** (`@mailmypdf/pricing`)
- **Ecosystem shell** (shared navigation — uses "Matters" instead of "Cases")
- **MailMyPDF fulfillment** (Lob mailing, tracking, proof)
- **Canonical SEO** under `mailmypdf.ai` (private office routes)

### Pipeline

Private Office uses the full Gold Standard pipeline with emphasis on:
- Evidence-grounded drafting with provenance
- Approval-gated delivery (no mail goes out without explicit approval)
- Certified mail with proof of delivery
- Privacy and security
- Permanent documentation

## Tech Stack

Same as all ecosystem verticals:
- TanStack Start, React 19, Tailwind CSS 4, Radix UI, lucide-react
- Supabase auth, Stripe payments, Lob mailing, pdf-lib, Zod, @mailmypdf/pricing
- Vite → Cloudflare Workers, Node 20+

## Design System

Inherit the MailMyPDF premium design system, but with a **premium indigo and gold identity** — serious, professional, premium.

### Product Personality

Professional, precise, protective. Quiet, capable, trustworthy. Not aggressive or sales-heavy.

### Visual Language
- Indigo and gold identity (distinct from the standard cobalt/brass of other verticals)
- Serious, professional, premium feel
- MailMyPDF warm paper foundation with darker, more formal tones
- Serif for editorial/brand moments
- Monospace for matter references, dates, metadata
- Document cards with approval gates
- Evidence timeline with provenance
- Proof records prominently displayed
- AVOID: consumer-facing aesthetics, playful elements

### Theme

Private Office uses `theme: "private-office"` in the ecosystem shell config, which adjusts the logo treatment and color emphasis toward indigo/gold.

## Ecosystem Shell

```typescript
const shellConfig: EcosystemShellConfig = {
  brand: "Private Office",
  brandTagline: "High-stakes correspondence, professionally prepared, provably delivered.",
  mailPdfUrl: "https://mailmypdf.ai/mail-a-pdf",
  workflowsUrl: "/workflows",
  howItWorksUrl: "/how-it-works",
  pricingUrl: "/pricing",
  authUrl: "/auth",
  startUrl: "/start",
  dashboardUrl: "/dashboard",
  productsUrl: "/products",
  currentProductSlug: "private-office",
  caseTerm: "Matters",                        // ← Uses "Matters" not "Cases"
  ctaLabel: "Start Now",
  theme: "private-office",                    // ← Premium theme
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

-- Matters (private office cases)
CREATE TABLE IF NOT EXISTS matters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'intake',
  reference_number TEXT,                     -- matter reference
  documents JSONB DEFAULT '[]'::jsonb,
  facts JSONB DEFAULT '[]'::jsonb,            -- extracted facts
  evidence JSONB DEFAULT '[]'::jsonb,
  timeline JSONB DEFAULT '[]'::jsonb,
  analysis JSONB,                             -- AI analysis
  findings JSONB DEFAULT '[]'::jsonb,
  draft TEXT DEFAULT '',
  review JSONB,
  approval JSONB,                             -- approval gate state
  packet JSONB,                               -- mailing packet
  proof JSONB,                                -- proof of delivery
  follow_ups JSONB DEFAULT '[]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mailings
CREATE TABLE IF NOT EXISTS mailings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID REFERENCES matters(id) ON DELETE CASCADE,
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

Use `@mailmypdf/pricing` canonical engine with private-office vertical profiles.

## Application Architecture

### Matter Lifecycle

```
Intake → Documents → Facts → Evidence → Timeline → Analysis → Findings →
Draft → Review → Approval → Fulfillment → Delivery/Proof → Follow-up → Escalation
```

### Key Features

- **Matter-Centric:** Each matter has a reference number, timeline, evidence vault, and complete audit trail
- **Evidence-Grounded Drafting:** All assertions in drafts are source-linked
- **Approval-Gated Delivery:** No mail goes out without explicit user approval — this is the defining feature
- **Certified Mail:** Certified mail with proof of delivery is the default
- **Privacy and Security:** All data is encrypted, access-controlled, and audit-logged
- **Permanent Documentation:** Proof packets are immutable and permanently archived
- **Follow-Up Tracking:** Track responses, deadlines for follow-up, escalation paths
- **Escalation:** When a response is inadequate, guide through escalation options

### Approval Gate

The approval gate is the critical differentiator:
1. Draft is prepared and validated
2. User reviews the complete packet (draft + evidence + recipient + mailing method)
3. User explicitly approves (not just "next" — a deliberate approval action)
4. Only after approval is the Stripe checkout created
5. Only after payment is the Lob letter created
6. Proof packet is sealed and archived

## Homepage Architecture

1. **Hero** — "High-stakes correspondence, professionally prepared, provably delivered, and permanently documented." Focused on the lifecycle: Prepare → Review → Approve → Deliver → Prove.
2. **Matter-Centric Workflow** — Positioning as a private office, not a tool
3. **Evidence-Grounded Drafting** — With provenance
4. **Approval-Gated Delivery** — The defining safety feature
5. **Certified Mail with Proof** — Delivery confirmation
6. **Privacy and Security** — Encrypted, access-controlled, audit-logged
7. **FAQ**
8. **Ecosystem Footer**

## Routes

### Public Routes
- `/` — Homepage
- `/start` — Start a matter
- `/workflows` — Workflow directory
- `/how-it-works`, `/pricing`, `/products` — Standard pages
- `/about`, `/contact`, `/faq` — Static pages
- `/auth`, `/account` — Auth pages
- `/privacy`, `/terms` — Legal pages

### Authenticated Routes
- `/dashboard` — Matter list with status, urgency, deadlines
- `/matters/$id` — Matter detail (full lifecycle workspace)

### API Routes
- `POST /api/matters/create` — Create matter
- `POST /api/matters/$id/approve` — Submit approval
- `POST /api/checkout` — Stripe checkout (only after approval)
- `POST /api/stripe-webhook` — Stripe webhook
- `POST /api/matters/$id/analyze` — AI analysis
- `POST /api/matters/$id/draft` — AI drafting

## Configuration

```
# Same as all ecosystem products
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
VITE_STRIPE_PUBLISHABLE_KEY=...
LOB_API_KEY=...
APP_URL=https://mycomind4-arch-mailmypdf-private-office.pages.dev
GEMINI_API_KEY=...
```

## File Structure

```
src/
  routes/
    __root.tsx
    index.tsx
    start.tsx
    auth.tsx, account.tsx, dashboard.tsx
    matters/$id.tsx               # Matter detail workspace
    workflows/index.tsx
    api/
      matters/create.ts
      matters/$id/approve.ts
      matters/$id/analyze.ts
      matters/$id/draft.ts
      checkout.ts
      stripe-webhook.ts
    pricing.tsx, how-it-works.tsx, products.tsx
    about.tsx, contact.tsx, faq.tsx
    privacy.tsx, terms.tsx
  components/
    ecosystem-shell.tsx, ecosystem-shell-config.ts
    site-header.tsx, site-footer.tsx
    matter-workspace.tsx           # Main workspace with approval gate
    approval-gate.tsx              # The critical approval component
    evidence-timeline.tsx
    proof-archive.tsx
  lib/
    auth.tsx, auth-guard.ts
    auth-context.ts                # Additional auth context
  platform/
    supabase.ts, mailmypdf.ts, simple-pdf.ts, llm-service.ts
  domain/
    workflows.ts
    matter-model.ts
  supabase/
    schema.sql
  styles.css
  router.tsx
```

## Guardrails

- No legal-advice claims
- No fabricated deadlines or outcomes
- Consequential actions are approval-gated and server-side authorized
- Emphasize user control, source-grounded drafting, no fabricated facts, explicit mailing authorization, and proof of submission
- Make deadlines, evidence gaps, and blocking issues visible
- Do not generate unsupported legal claims
- The approval gate is non-negotiable — no mail goes out without explicit user approval
- Proof packets are immutable once sealed
