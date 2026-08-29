# Claude Code Build Prompt: Notice Respond

## Mission

Build Notice Respond — the official notice response product in the MailMyPDF ecosystem. Users upload a government or agency notice, the system understands it, identifies what's being requested, prepares a response, and mails it with proof. This is the visual and product-quality BENCHMARK for all MailMyPDF verticals.

## Ecosystem Context

Notice Respond is part of the MailMyPDF ecosystem. It shares:
- **One MailMyPDF Account** (Supabase auth, shared across products)
- **Canonical pricing engine** (`@mailmypdf/pricing` package)
- **Ecosystem shell** (shared navigation component imported from core MailMyPDF)
- **MailMyPDF fulfillment** (Lob mailing, tracking, proof)
- **Canonical SEO** under `mailmypdf.ai/notice/*`

### Pipeline: P02 Notice / Official Response

```
SECURE INGEST → CLASSIFY → EXTRACT → UNDERSTAND → FACTS + PROVENANCE →
TIMELINE / DEADLINES → ISSUES / DISCREPANCIES → EVIDENCE →
AUTHORITY / RESEARCH → STRENGTH / RISK → STRATEGY → DRAFT →
VALIDATE → BLOCKING GATES → HUMAN REVIEW → AUTHORIZED MAIL → TRACK → PROVE
```

## Tech Stack

- **Framework:** TanStack Start (file-based routing, SSR, server functions)
- **UI:** React 19, Tailwind CSS 4, Radix UI, lucide-react
- **Routing:** TanStack Router with `@tanstack/router-plugin`
- **Auth:** Supabase (`@supabase/supabase-js`) — same shared project as MailMyPDF core
- **Payments:** Stripe (`stripe` server-side, `@stripe/stripe-js` client)
- **Mailing:** MailMyPDF fulfillment via Lob (server-side)
- **PDF:** `pdf-lib` for server-side PDF generation
- **Validation:** Zod + `@tanstack/zod-adapter`
- **Pricing:** `@mailmypdf/pricing` package
- **Build:** Vite → Cloudflare Workers
- **Node:** 20+

## Design System

Inherit the MailMyPDF premium design system EXACTLY. This is the benchmark vertical.

### Color Palette
- Warm ivory paper canvas (`--paper`)
- Deep navy ink (`--ink`, `--ink-soft`)
- Cobalt accent (`--cobalt`) — primary interactive
- Postal red stamp (`--stamp`) — used sparingly for actions/important status
- Brass (`--brass`) — secondary accent
- Subtle rule borders (`--rule`)

### Typography
- Serif display: "Instrument Serif" (headings)
- Sans body: "Inter"
- Mono: "JetBrains Mono" (dates, status, references, metadata)

### Visual Language
- Paper/document aesthetic
- Serif display typography, restrained rules
- Stamp/postmark details
- Strong whitespace, compact utility typography
- Envelope cards, document cards, evidence chips
- Postal-document visual vocabulary
- AVOID: generic SaaS gradients, excessive rounded UI, chatbot-first presentation

### Custom CSS Utilities (from ecosystem CSS)
- `postmark` — circular pill badge
- `envelope-card` — paper card with rule border + shadow
- `envelope-card-hover` — hover lift
- `eyebrow` — cobalt mono uppercase section label
- `proof-badge` — status pill
- `postmark-circle` — decorative faded stamp
- `hairline` — thin top border

## Ecosystem Shell

Import the shared `EcosystemShell` component from the MailMyPDF ecosystem. Configure it with Notice Respond's identity:

```typescript
const shellConfig: EcosystemShellConfig = {
  brand: "Notice Respond",
  brandTagline: "Understand the notice. Respond with proof.",
  mailPdfUrl: "https://mailmypdf.ai/mail-a-pdf",
  workflowsUrl: "/workflows",
  howItWorksUrl: "/how-it-works",
  pricingUrl: "/pricing",
  authUrl: "/auth",
  startUrl: "/start",
  dashboardUrl: "/dashboard",
  productsUrl: "/products",
  currentProductSlug: "notice-respond",
  caseTerm: "Cases",
  ctaLabel: "Start Now",
  theme: "default",
  auth: { user, loading, signOut }, // from local AuthProvider
};
```

## Authentication

Same Supabase auth pattern as all ecosystem products:

```typescript
// auth.tsx — AuthProvider with Supabase
interface MailMyPDFUser {
  id: string;
  email: string;
  fullName?: string;
  role: "customer" | "admin" | "super_admin";
}

// auth-guard.ts — server-side
async function requireAuthenticatedUser(request: Request): Promise<MailMyPDFUser> {
  // Read Supabase session from request headers
  // Return user or throw 401
}

function authErrorResponse(): Response {
  return Response.json({ error: "Authentication required." }, { status: 401 });
}
```

### Database Schema (Supabase)

```sql
-- User roles (shared with ecosystem)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('customer', 'admin', 'super_admin')),
  UNIQUE(user_id)
);
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Cases (notice response cases)
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'intake',
  notice JSONB DEFAULT '{}'::jsonb,        -- extracted notice data
  documents JSONB DEFAULT '[]'::jsonb,     -- uploaded documents
  analysis JSONB,                          -- AI analysis results
  findings JSONB DEFAULT '[]'::jsonb,     -- identified issues
  timeline JSONB DEFAULT '[]'::jsonb,     -- events/deadlines
  draft TEXT DEFAULT '',                   -- response draft
  review JSONB,                            -- validation results
  packet JSONB,                            -- final mailing packet
  proof JSONB,                             -- proof of mailing
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mailings
CREATE TABLE IF NOT EXISTS mailings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
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

-- Audit events (append-only)
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

Apply RLS: users CRUD only their own cases/mailings. Audit events are service-role-write, user-read-own.

## Pricing

Use `@mailmypdf/pricing` canonical engine. Server-authoritative quotes only.

### Notice Respond Workflow Pricing Profiles

| Workflow ID | Band | Base Price | Mail Included |
|---|---|---|---|
| `cp2000-response` | ADVANCED | $69.99 | none |
| `cp14-response` | ADVANCED | $59.99 | none |
| `cp504-response` | ADVANCED | $59.99 | none |
| `cp523-response` | ADVANCED | $59.99 | none |
| `irs-notice` | STANDARD | $29.99 | none |
| `tax-notice` | STANDARD | $29.99 | none |
| `court-summons` | ADVANCED | $69.99 | none |
| `agency-action` | STANDARD | $24.99 | none |
| `file-appeal` | STANDARD | $29.99 | none |
| `code-enforcement` | STANDARD | $24.99 | none |
| `permit-correction` | STANDARD | $24.99 | none |
| `dmv-notice` | STANDARD | $24.99 | none |
| `ssa-notice` | STANDARD | $29.99 | none |
| `uscis-notice` | STANDARD | $29.99 | none |
| `benefits-notice` | STANDARD | $24.99 | none |

Mail prices: Standard $4.99, Certified $14.94, Registered $32.49.

### Checkout Flow

1. User completes draft + selects recipient + mailing method
2. Server calculates quote: `calculateQuote({ workflowId, verticalId: "notice-respond", actualPages, mailClass })`
3. Create Stripe Checkout Session with quote total
4. Stripe webhook handles fulfillment: generate PDF, upload, create Lob letter, update case, create proof

## Application Architecture

### Case Workspace

The primary application interface is a case workspace with progressive stages:

```
Upload Notice → Identify → Understand → Analyze → Findings →
Response Draft → Review → Mail → Track → Prove
```

### Key Workspace Features

- **Notice Understanding:** Extract notice type, issuing agency, deadlines, requested actions, relevant dates
- **Document Analysis:** OCR + classification of uploaded documents
- **Findings:** Source-linked issues, discrepancies, deadline calculations
- **Timeline:** Events with extracted vs inferred distinction
- **Response Drafting:** AI-assisted draft grounded in case documents
- **Validation:** Check for missing information, unsupported claims
- **Review Gate:** User must review and approve before mailing
- **Mailing:** Recipient selection, mail class, pricing, Stripe checkout
- **Tracking + Proof:** Real-time status from Lob, immutable proof packet

### State Quality

Every stage needs intentional:
- Loading states (skeletons, not spinners)
- Empty states (with guidance)
- Partial-result states
- Warning states (missing info, deadline approaching)
- Error states (with retry)
- Success states (with next action)
- Blocked states (validation failures)

Findings must be source-linked. Deadlines must distinguish extracted facts from inference. Drafts must be grounded in case documents.

## Homepage Architecture

1. **Header** — Ecosystem shell with Notice Respond identity, workflow discovery, primary analysis CTA
2. **Hero** — "Understand the notice. Prepare the response. Mail it with proof." Centered on the actual notice received
3. **Workflow Strip** — Upload → Identify → Understand → Respond → Review → Mail → Track → Prove
4. **Workflow Discovery** — Organized by notice/problem type (IRS, agency, court, DMV, benefits, code enforcement, permit)
5. **Trust/Provenance Section** — Source-linked findings, user review, no fabricated facts
6. **Analysis Capabilities** — Notice extraction, deadline detection, issue identification, response drafting
7. **Concrete Case Visualization** — Document cards with evidence relationships
8. **MailMyPDF Fulfillment Bridge** — "Ready to send? Mail this response." with printing, postage, tracking, proof
9. **FAQ** — Common questions
10. **Ecosystem Footer** — Shared footer with product links

## Workflow Pages

Each workflow page should answer:
- What notice is this?
- Who receives it?
- What should be gathered?
- What does Notice Respond analyze?
- What issues can be identified?
- What response can be prepared?
- What must the user review?
- How is the final response mailed and tracked?

## Routes

### Public Routes
- `/` — Homepage
- `/start` — Start a new case (intake wizard)
- `/workflows` — Workflow directory
- `/workflows/$workflowId` — Workflow detail page
- `/how-it-works` — Process explanation
- `/pricing` — Pricing page
- `/products` — Ecosystem product directory
- `/about` — About page
- `/contact` — Contact page
- `/faq` — FAQ page
- `/resources/$slug` — Resource article
- `/resources` — Resource directory
- `/auth` — Sign in / sign up
- `/account` — Account settings
- `/privacy` — Privacy policy
- `/terms` — Terms of service

### Authenticated Routes
- `/dashboard` — Case list, recent activity, stats
- `/respond-to-a-government-notice` — Main analysis workspace

### API Routes
- `POST /api/cases/create` — Create new case
- `GET /api/cases` — List user's cases
- `GET /api/cases/$caseId` — Get case detail
- `POST /api/documents` — Upload document
- `POST /api/checkout` — Create Stripe checkout session
- `GET /api/auth/status` — Check auth status
- `GET /api/admin/health` — Admin health check

## AI Integration

### Analysis API

The server calls an LLM provider (Gemini via MailMyPDF control plane, or OpenAI/Anthropic) to:
1. **Extract** — Parse notice content, identify type, agency, deadlines, requested actions
2. **Classify** — Determine notice category and applicable workflow
3. **Analyze** — Identify issues, discrepancies, missing information
4. **Draft** — Generate response draft grounded in case documents

### AI Safety Rules

- Every finding must be source-linked
- Distinguish: Fact (from source), Inference (reasoned), Unknown (insufficient evidence)
- Never fabricate facts, deadlines, or legal conclusions
- AI output is untrusted until validated and human-reviewed
- Consequential actions (mailing) require explicit user approval

## Configuration

```
# Supabase (shared with ecosystem)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
VITE_STRIPE_PUBLISHABLE_KEY=...

# Lob (via MailMyPDF fulfillment)
LOB_API_KEY=...

# App
APP_URL=https://notice-respond.pages.dev

# AI
GEMINI_API_KEY=... (or other provider keys)
```

## SEO

- Canonical routes under `mailmypdf.ai/notice/*`
- JSON-LD structured data on every page
- `robots.txt` with prelaunch indexing control
- Sitemap generated from workflow catalog
- Per-workflow SEO pages with targeted keywords

## Deployment

- Build: `vite build` → Cloudflare Workers
- Deploy: Cloudflare Pages or Workers
- Test: `vitest run` or `node --test`
- Verify: `npm test && npm run build`

## File Structure

```
src/
  routes/
    __root.tsx
    index.tsx                    # Homepage
    start.tsx                    # Intake wizard
    auth.tsx                     # Auth page
    dashboard.tsx                # Case dashboard
    account.tsx                  # Account settings
    respond-to-a-government-notice.tsx  # Main workspace
    workflows/
      index.tsx                  # Workflow directory
      $workflowId.tsx            # Workflow detail
      analyze.tsx                # Analysis API route
    api/
      cases/
        create.ts
        index.ts
        $caseId.ts
      documents.ts
      checkout.ts
      auth/status.ts
      admin/health.ts
    pricing.tsx
    how-it-works.tsx
    products.tsx
    about.tsx
    contact.tsx
    faq.tsx
    resources/
      index.tsx
      $slug.tsx
    privacy.tsx
    terms.tsx
  components/
    ecosystem-shell.tsx          # Imported from ecosystem
    ecosystem-shell-config.ts    # Notice Respond config
    site-header.tsx
    site-footer.tsx
    notice-workspace.tsx         # Main case workspace
    workflow-directory.tsx
    workflow-page.tsx
  lib/
    auth.tsx                     # AuthProvider
    auth-guard.ts                 # Server-side auth
  platform/
    supabase.ts                   # Supabase server client
    owner-context.ts             # Owner scoping
    llm-service.ts               # AI provider abstraction
    mailmypdf.ts                  # Fulfillment integration
    text-extraction.ts           # Document extraction
    simple-pdf.ts                 # PDF generation
  domain/
    notices.ts                    # Notice types + classification
    workflows.ts                  # Workflow catalog
    findings.ts                   # Finding model
    timeline.ts                   # Timeline model
    validation.ts                 # Draft validation
  styles.css                      # Design system (inherited)
  router.tsx
```

## Guardrails

- Never claim legal advice
- Never fabricate facts, evidence, deadlines, or mailing results
- Never expose catalog-only workflows as executable
- Never simulate analysis or mailing
- Catalog pages may be polished and complete without claiming unsupported execution
- Only registered executable workflows receive executable CTAs
- The final step must be an obvious transition from approved response to physical mailing
- Do not fake a successful mailing — wait for real fulfillment confirmation
