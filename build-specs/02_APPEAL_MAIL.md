# Claude Code Build Prompt: Appeal Mail

## Mission

Build Appeal Mail — the evidence-first decision-to-appeal product in the MailMyPDF ecosystem. Users upload a denial or adverse decision, the system analyzes it, identifies grounds for appeal, organizes evidence, drafts an appeal, validates it, and mails it with proof. This is the deepest analysis vertical with the most executable workflows.

## Ecosystem Context

Appeal Mail is part of the MailMyPDF ecosystem. It shares:
- **One MailMyPDF Account** (Supabase auth)
- **Canonical pricing engine** (`@mailmypdf/pricing`)
- **Ecosystem shell** (shared navigation)
- **MailMyPDF fulfillment** (Lob mailing, tracking, proof)
- **Canonical SEO** under `mailmypdf.ai/appeal/*`

### Pipeline: P03 Appeal / Reconsideration

```
SECURE INGEST → CLASSIFY → EXTRACT → UNDERSTAND → FACTS + PROVENANCE →
TIMELINE / DEADLINES → ISSUES / DISCREPANCIES → EVIDENCE →
AUTHORITY / RESEARCH → STRENGTH / RISK → STRATEGY → DRAFT →
VALIDATE → BLOCKING GATES → HUMAN REVIEW → AUTHORIZED MAIL → TRACK → PROVE
```

Appeal Mail uses the full 18-step Gold Standard pipeline with stress testing, evidence chaining, and independent validation.

## Tech Stack

- **Framework:** TanStack Start (file-based routing, SSR, server functions)
- **UI:** React 19, Tailwind CSS 4, Radix UI, lucide-react
- **Routing:** TanStack Router with `@tanstack/router-plugin`
- **Auth:** Supabase (`@supabase/supabase-js`)
- **Payments:** Stripe (`stripe` server-side, `@stripe/react-stripe-js` client)
- **Mailing:** MailMyPDF fulfillment via Lob (server-side)
- **PDF:** `pdf-lib`
- **Validation:** Zod
- **Pricing:** `@mailmypdf/pricing` package
- **Build:** Vite → Cloudflare Workers
- **Node:** 20+

## Design System

Inherit the MailMyPDF premium design system exactly. Notice Respond is the visual benchmark — match its hierarchy, spacing, typography, borders, paper surfaces, responsive behavior, and accessibility.

### Product Personality

Calm, authoritative, evidence-first, procedural, reassuring. The interface should feel like a serious case workspace, not a generic AI SaaS product.

### Visual Language
- Warm paper background and restrained ink/navy typography
- Postal red/stamp accent for actions and important status
- Serif display typography for editorial hierarchy
- Monospace labels for dates, status, references, and workflow metadata
- Thin rules, document/envelope cards, evidence tags, timeline markers
- AVOID: glossy gradients, excessive glassmorphism, generic AI imagery, dashboard clutter

## Ecosystem Shell

```typescript
const shellConfig: EcosystemShellConfig = {
  brand: "Appeal Mail",
  brandTagline: "Understand the decision. Build the appeal. Mail it with proof.",
  mailPdfUrl: "https://mailmypdf.ai/mail-a-pdf",
  workflowsUrl: "/workflows",
  howItWorksUrl: "/how-it-works",
  pricingUrl: "/pricing",
  authUrl: "/auth",
  startUrl: "/start",
  dashboardUrl: "/dashboard",
  productsUrl: "/products",
  currentProductSlug: "appeal-mail",
  caseTerm: "Cases",
  ctaLabel: "Start an Appeal",
  theme: "default",
  auth: { user, loading, signOut },
};
```

## Authentication

Same Supabase auth pattern as all ecosystem products. See the MailMyPDF core prompt for the full auth implementation.

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

-- Appeals
CREATE TABLE IF NOT EXISTS appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  decision JSONB DEFAULT '{}'::jsonb,       -- extracted decision data
  grounds JSONB DEFAULT '[]'::jsonb,         -- appeal grounds
  evidence JSONB DEFAULT '[]'::jsonb,         -- supporting evidence
  arguments JSONB DEFAULT '[]'::jsonb,       -- legal arguments
  draft TEXT DEFAULT '',                      -- appeal draft
  review JSONB,                               -- validation results
  packet JSONB,                               -- final mailing packet
  proof JSONB,                                -- proof of mailing
  timeline JSONB DEFAULT '[]'::jsonb,         -- events/deadlines
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mailings
CREATE TABLE IF NOT EXISTS mailings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id UUID REFERENCES appeals(id) ON DELETE CASCADE,
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

-- Recipients (saved addresses)
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

Apply RLS: users CRUD only their own appeals/mailings/recipients. Audit events are service-role-write, user-read-own.

## Pricing

Use `@mailmypdf/pricing` canonical engine. Server-authoritative quotes.

### Appeal Mail Workflow Pricing Profiles

| Workflow ID | Band | Base Price | Mail Included | Status |
|---|---|---|---|---|
| `denied-claim` | ADVANCED | $69.99 | standard | production |
| `government-decision` | ADVANCED | $59.99 | standard | production |
| `court-ruling` | ADVANCED | $69.99 | standard | production |
| `reconsideration` | STANDARD | $29.99 | none | production |
| `insurance-claim-denial` | ADVANCED | $69.99 | standard | production |
| `insurance-denial-letter` | STANDARD | $29.99 | none | production |
| `insurance-coverage-denial` | ADVANCED | $59.99 | standard | production |
| `medical-insurance-denial` | ADVANCED | $69.99 | standard | production |
| `medical-necessity-appeal` | ADVANCED | $69.99 | standard | production |
| `prior-authorization-denial` | ADVANCED | $59.99 | standard | production |
| `out-of-network-denial` | STANDARD | $39.99 | none | production |
| `dental-insurance-appeal` | STANDARD | $39.99 | none | production |
| `car-insurance-appeal` | STANDARD | $39.99 | none | production |
| `life-insurance-denial` | ADVANCED | $59.99 | standard | production |
| `claim-denial-letter` | STANDARD | $29.99 | none | production |
| `ssdi-denial` | ADVANCED | $69.99 | standard | production |
| `ssi-denial` | ADVANCED | $59.99 | standard | production |
| `social-security-denial` | ADVANCED | $59.99 | standard | production |
| `medicaid-denial` | ADVANCED | $59.99 | standard | production |
| `unemployment-denial` | STANDARD | $39.99 | none | production |
| `edd-denial` | STANDARD | $39.99 | none | production |
| `financial-aid-appeal` | STANDARD | $29.99 | none | production |
| `sap-appeal` | STANDARD | $29.99 | none | production |
| `financial-aid-suspension-appeal` | STANDARD | $29.99 | none | production |
| `financial-aid-reinstatement` | STANDARD | $29.99 | none | production |
| `financial-aid-special-circumstances` | STANDARD | $29.99 | none | production |
| `scholarship-appeal` | STANDARD | $29.99 | none | production |
| `fafsa-appeal` | STANDARD | $29.99 | none | production |
| `license-suspension-appeal` | STANDARD | $39.99 | none | production |
| `drivers-license-suspension` | STANDARD | $39.99 | none | production |
| `license-revocation-appeal` | STANDARD | $39.99 | none | production |
| `administrative-decision-appeal` | ADVANCED | $59.99 | standard | production |
| `ssdi-appeal` | ADVANCED | $69.99 | standard | production |

Mail prices: Standard $4.99, Certified $14.94, Registered $32.49.

### Per-Workflow Checkout Routes

Each executable workflow has its own checkout API route:
`POST /api/workflows/$workflowId/checkout`

The checkout route:
1. Requires authenticated user
2. Loads the appeal from Supabase, verifies ownership
3. Verifies appeal status is "ready" (reviewed + packet assembled)
4. Calculates quote via `@mailmypdf/pricing`
5. Creates Stripe Checkout Session
6. Returns session URL

### Stripe Webhook

`POST /api/stripe-webhook`:
1. Verify Stripe signature
2. On `checkout.session.completed`:
   - Load appeal from metadata
   - Generate PDF from draft (`textToPdf`)
   - Upload to storage
   - Create Lob letter via MailMyPDF provider
   - Create proof packet (hash + recipient + mailing method + tracking)
   - Update appeal status + proof
   - Insert mailing record

## Application Architecture

### Case Progression

The workspace follows a persistent case progression:

```
Decision → Understanding → Analysis → Issues → Evidence → Strategy →
Draft → Review → Mail → Proof
```

### Insurance Appeal Workspace (Flagship)

The flagship executable workflow (`/workflows/denied-claim`) implements the full 18-step pipeline:

```
Upload → X-Ray → Decision → Timeline → Grounds → Evidence → Arguments →
Stress Test → Draft → Final Test → Readiness → Packet → Recipient →
Mailing → Checkout → Proof
```

The workspace should make the case understandable at a glance:
- Decision summary
- Important dates/deadline
- Detected issues
- Evidence supporting each issue
- Contradictions/missing evidence
- Strategy strength
- Draft status
- Validation warnings
- MailMyPDF send action

### Analysis Capabilities

- **Appeal X-Ray:** Deep analysis of the denial decision — identifies the reasoning, weak points, and grounds
- **Timeline:** Chronological events with source links and confidence levels
- **Evidence:** Organized evidence with provenance, supporting/contradicting each ground
- **Stress Test:** Adversarial testing of the appeal arguments — finds weaknesses before the opposition does
- **Drafting:** AI-assisted appeal draft grounded in case documents
- **Validation:** Independent check for missing information, unsupported claims, procedural errors

### Workflow Catalog

20 workflows across 7 categories:

| Category | Count | Key Workflows |
|---|---|---|
| Insurance | 9 | denied-claim, insurance-claim-denial, medical-insurance-denial, medical-necessity-appeal, prior-authorization-denial, out-of-network-denial, dental-insurance-appeal, car-insurance-appeal, life-insurance-denial |
| Disability & Social Security | 5 | ssdi-denial, ssi-denial, social-security-denial, medicaid-denial, ssdi-appeal |
| Unemployment | 2 | unemployment-denial, edd-denial |
| Government Benefits | 4 | financial-aid-appeal, sap-appeal, scholarship-appeal, fafsa-appeal |
| Workers' Compensation | 2 | (cataloged) |
| Veterans | 1 | (cataloged) |
| Administrative | 3 | administrative-decision-appeal, government-decision, court-ruling |

### Catalog Entry Schema

```typescript
interface AppealCatalogEntry {
  slug: string;
  title: string;
  category: string;
  shortDescription: string;
  longDescription: string;
  intendedUser: string;
  problemSolved: string;
  whatWeAnalyze: string[];
  whatYouNeed: string[];
  whatWeIdentify: string[];
  whatAppealAddresses: string[];
  seoTitle: string;
  seoDescription: string;
  primaryKeyword: string;
  relatedKeywords: string[];
  route: string;
  status: "IMPLEMENTED" | "COMING_SOON";
  engine?: string;
  executable: boolean;
  cta: string;
}
```

Catalog pages may be polished and complete without claiming unsupported execution. Only IMPLEMENTED workflows get executable CTAs.

## Homepage Architecture

1. **Header** — Ecosystem shell with Appeal Mail identity, "Start an Appeal" CTA
2. **Hero** — "Decision/denial → evidence-backed appeal → MailMyPDF proof"
3. **Workflow Strip** — Understand → Analyze → Issues → Evidence → Strategy → Draft → Review → Mail → Prove
4. **Trust Bar** — Source-linked findings, user review, no fabricated facts, explicit mailing authorization
5. **Workflow Catalog** — By category: Insurance, Disability & SS, Unemployment, Government Benefits, Workers' Comp, Veterans, Administrative
6. **Appeal Analysis Capabilities** — X-Ray, Timeline, Evidence, Stress Test, Drafting, Validation
7. **Concrete Case Journey** — Document cards with evidence relationships
8. **MailMyPDF Bridge** — "Ready to send? Mail this appeal."
9. **FAQ** — With legal/safety disclaimer
10. **Ecosystem Footer**

Do NOT say "Coming Soon" on public catalog pages. Catalog completeness and executable runtime are separate concerns.

## Routes

### Public Routes
- `/` — Homepage
- `/start` — Start an appeal
- `/workflows` — Workflow directory (search, filter by category, status)
- `/appeal/$slug` — Workflow detail pages (20 workflows + 7 category pages)
- `/how-it-works` — Process page
- `/pricing` — Pricing page
- `/products` — Ecosystem products
- `/about`, `/contact`, `/faq` — Static pages
- `/resources/$slug`, `/resources` — Resources
- `/auth` — Auth page
- `/account` — Account settings
- `/privacy`, `/terms` — Legal pages

### Authenticated Routes
- `/dashboard` — Case list, recent activity
- `/workflows/denied-claim` — Insurance appeal workspace (flagship, fully executable)
- `/workflows/$workflowId` — Other executable workflow workspaces

### Admin Routes
- `/admin` — Admin dashboard

### API Routes
- `POST /api/workflows/$workflowId/checkout` — Per-workflow Stripe checkout
- `POST /api/stripe-webhook` — Stripe webhook handler
- `GET /api/auth/status` — Auth status
- `POST /api/workflows/$workflowId/analyze` — AI analysis
- `POST /api/workflows/$workflowId/draft` — AI drafting
- `GET /api/admin/appeals` — Admin appeal list
- `GET /api/admin/health` — Health check

## AI Integration

### Analysis Pipeline

1. **Extract:** Parse decision document — identify decision type, agency/insurer, denial reasons, relevant dates, policy citations
2. **X-Ray:** Deep analysis — identifies the reasoning structure, weak points, missing elements, procedural errors
3. **Timeline:** Build chronological event timeline from documents
4. **Grounds:** Identify potential appeal grounds (procedural, factual, legal, policy)
5. **Evidence:** Map evidence to each ground, identify gaps
6. **Arguments:** Develop legal arguments for each ground
7. **Stress Test:** Adversarial testing — try to break each argument
8. **Draft:** Generate appeal letter grounded in analysis
9. **Validate:** Independent validation check

### AI Safety

- Source-linked findings with confidence levels
- Distinguish: Fact, Inference, Unknown
- Never fabricate facts, evidence, deadlines, legal conclusions
- Stress test is adversarial — it tests YOUR case, not the opponent's
- Validation is independent of drafting (separate AI pass or rule-based)
- Human review required before mailing

## Domain Layer

```
src/domain/
  appeal-catalog.ts          # 20 workflow catalog entries
  workflows.ts               # Workflow definitions
  appeal.ts                  # Appeal domain model
  classification.ts          # Notice/decision classification
  decision.ts                # Decision extraction
  ground.ts                 # Appeal grounds model
  evidence.ts                # Evidence model
  argument.ts               # Argument model
  strategy.ts                # Strategy model
  draft-validator.ts         # Draft validation
  audit.ts                   # Audit model
  timeline.ts                # Timeline model
  proof.ts                   # Proof packet (hash, verify)
  packet.ts                  # Mailing packet assembly
  stress-test.ts             # Adversarial stress testing
  xray.ts                    # Deep decision analysis
  gold-standard-gate.ts       # Gold standard validation gate
  workflow-capabilities.ts   # Per-workflow capability registry
  insurance-packs.ts         # Insurance-specific logic packs
  workflow-packs.ts          # Domain-specific packs
  workflow-hero-images.ts    # Hero image registry
  workflow-landing-content.ts # Landing page content
```

## Platform Layer

```
src/platform/
  supabase.ts                # Server Supabase client
  mailmypdf.ts               # Fulfillment integration
  mailmypdf-provider.ts     # Lob provider adapter
  simple-pdf.ts              # Text-to-PDF generation
  text-extraction.ts        # Document text extraction
  llm-service.ts            # LLM provider abstraction
  intelligence-adapter.ts   # AI analysis adapter
  multi-llm-consensus.ts    # Multi-LLM consensus (optional)
  control-plane-ai.ts       # AI control plane
  control-plane-logic.ts    # Business logic
  appeal-ai.functions.ts    # AI function definitions
  appeal-repository.ts      # Appeal data access
  checkout-fn.ts            # Checkout logic
  extract-fn.ts             # Extraction logic
  stress-test-fn.ts         # Stress test logic
  timeline-fn.ts            # Timeline logic
  xray-fn.ts                # X-Ray logic
```

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
APP_URL=https://appeal-mail.pages.dev

# AI
GEMINI_API_KEY=... (or other provider)
```

## Guardrails

- Never claim legal advice
- Never fabricate facts, evidence, deadlines, or mailing results
- Never expose catalog-only workflows as executable
- Never simulate analysis or mailing
- Show actual case state — never fake progress
- Source-linked findings with visible uncertainty states
- Unknown, inferred, conflicting, and documented facts must be visually distinct
- The handoff to MailMyPDF must preserve the final reviewed document
- Fulfillment status must be explicit (not faked)
