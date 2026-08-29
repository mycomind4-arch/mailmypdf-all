# Claude Code Build Prompt: Benefits Appeal

## Mission

Build Benefits Appeal — the evidence-first decision-to-appeal product specifically for government benefits denials. Users upload a benefits denial decision, the system analyzes it, identifies appeal grounds, organizes evidence, drafts an appeal, validates it, and mails it with proof. This is a specialized sibling of Appeal Mail, focused on government benefits rather than insurance/administrative appeals.

## Ecosystem Context

Benefits Appeal is part of the MailMyPDF ecosystem. It shares:
- **One MailMyPDF Account** (Supabase auth)
- **Canonical pricing engine** (`@mailmypdf/pricing`)
- **Ecosystem shell** (shared navigation)
- **MailMyPDF fulfillment** (Lob mailing, tracking, proof)
- **Canonical SEO** under `mailmypdf.ai/benefits/*`

### Pipeline: P03 Appeal / Reconsideration

```
SECURE INGEST → CLASSIFY → EXTRACT → UNDERSTAND → FACTS + PROVENANCE →
TIMELINE / DEADLINES → ISSUES / DISCREPANCIES → EVIDENCE →
AUTHORITY / RESEARCH → STRENGTH / RISK → STRATEGY → DRAFT →
VALIDATE → BLOCKING GATES → HUMAN REVIEW → AUTHORIZED MAIL → TRACK → PROVE
```

## Tech Stack

Same as all ecosystem verticals:
- TanStack Start, React 19, Tailwind CSS 4, Radix UI, lucide-react
- Supabase auth, Stripe payments, Lob mailing, pdf-lib, Zod, @mailmypdf/pricing
- Vite → Cloudflare Workers, Node 20+

## Design System

Inherit the MailMyPDF premium design system. Use Appeal Mail and Notice Respond as the visual benchmarks. Same evidence-first, procedural, calm aesthetic with stamp/evidence accents.

### Product Personality

Calm, authoritative, evidence-first, procedural, reassuring — a serious case workspace for benefits appeals.

## Ecosystem Shell

```typescript
const shellConfig: EcosystemShellConfig = {
  brand: "Benefits Appeal",
  brandTagline: "Understand the decision. Build the appeal. Mail it with proof.",
  mailPdfUrl: "https://mailmypdf.ai/mail-a-pdf",
  workflowsUrl: "/workflows",
  howItWorksUrl: "/how-it-works",
  pricingUrl: "/pricing",
  authUrl: "/auth",
  startUrl: "/start",
  dashboardUrl: "/dashboard",
  productsUrl: "/products",
  currentProductSlug: "benefits-appeal",
  caseTerm: "Cases",
  ctaLabel: "Start an Appeal",
  theme: "default",
  auth: { user, loading, signOut },
};
```

## Authentication

Same Supabase auth pattern as all ecosystem products.

## Database Schema (Supabase)

Same pattern as Appeal Mail — `appeals`, `mailings`, `recipients`, `audit_events`, `user_roles` tables with RLS. The schema is identical because Benefits Appeal uses the same P03 pipeline; the difference is domain intelligence (benefits-specific classification, grounds, evidence types).

```sql
-- Same schema as Appeal Mail (appeals, mailings, recipients, audit_events, user_roles)
-- See Appeal Mail prompt for full schema
```

## Pricing

Use `@mailmypdf/pricing` canonical engine. Benefits appeal workflows are categorized under the benefits-appeal vertical.

## Application Architecture

### Case Progression

```
Decision → Understanding → Analysis → Issues → Evidence → Strategy →
Draft → Review → Mail → Proof
```

### Benefits Appeal Categories

- **Disability & Social Security:** SSDI denial, SSI denial, Social Security denial, Medicaid denial, SSDI formal appeal
- **Unemployment:** Unemployment denial, EDD denial
- **Government Benefits:** Financial aid appeal, SAP appeal, financial aid suspension appeal, financial aid reinstatement, financial aid special circumstances, scholarship appeal, FAFSA appeal
- **Workers' Compensation:** (cataloged)
- **Veterans:** (cataloged)

### Key Workspace Features

- **Decision Understanding:** Extract decision type, agency, denial reasons, relevant dates, appeal deadline
- **Appeal Grounds:** Identify procedural errors, factual errors, missing evidence, legal/policy misapplication
- **Evidence:** Organize supporting evidence with provenance
- **Timeline:** Build chronology from decision and supporting documents
- **Strategy:** Develop appeal arguments for each ground
- **Drafting:** AI-assisted appeal letter grounded in case documents
- **Validation:** Check for missing information, unsupported claims, deadline compliance
- **Review Gate:** User must approve before mailing
- **Mailing:** Certified mail recommended for appeal deadlines

## Homepage Architecture

Same structure as Appeal Mail:
1. Header with Benefits Appeal identity, "Start an Appeal" CTA
2. Hero: "Decision/denial → evidence-backed appeal → MailMyPDF proof"
3. Workflow strip: Understand → Analyze → Issues → Evidence → Strategy → Draft → Review → Mail → Prove
4. Trust bar: source-linked findings, user review, no fabricated facts
5. Workflow catalog by category: Disability & SS, Unemployment, Government Benefits, Workers' Comp, Veterans
6. Appeal analysis capabilities: X-Ray, Timeline, Evidence, Stress Test, Drafting, Validation
7. Concrete case journey
8. MailMyPDF bridge
9. FAQ with legal/safety disclaimer
10. Ecosystem footer

## Routes

### Public Routes
- `/` — Homepage
- `/start` — Start an appeal
- `/workflows` — Workflow directory
- `/appeal/$slug` — Workflow detail pages
- `/how-it-works`, `/pricing`, `/products` — Standard pages
- `/about`, `/contact`, `/faq` — Static pages
- `/resources/$slug`, `/resources` — Resources
- `/auth`, `/account` — Auth pages
- `/privacy`, `/terms` — Legal pages

### Authenticated Routes
- `/dashboard` — Case list

### API Routes
- `POST /api/workflows/$workflowId/checkout` — Stripe checkout
- `POST /api/stripe-webhook` — Stripe webhook
- `POST /api/workflows/$workflowId/analyze` — AI analysis
- `POST /api/workflows/$workflowId/draft` — AI drafting

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
APP_URL=https://benefits-appeal.pages.dev
GEMINI_API_KEY=...
```

## File Structure

Same as Appeal Mail — the architecture is identical, only the domain intelligence differs:

```
src/
  routes/
    __root.tsx, index.tsx, start.tsx, auth.tsx, account.tsx, dashboard.tsx
    workflows/index.tsx
    appeal/$slug.tsx
    api/
      workflows/$workflowId/checkout.ts
      stripe-webhook.ts
      workflows/$workflowId/analyze.ts
      workflows/$workflowId/draft.ts
    pricing.tsx, how-it-works.tsx, products.tsx
    about.tsx, contact.tsx, faq.tsx
    resources/index.tsx, resources/$slug.tsx
    privacy.tsx, terms.tsx
  components/
    ecosystem-shell.tsx, ecosystem-shell-config.ts
    site-header.tsx, site-footer.tsx
    benefits-workspace.tsx
    workflow-directory.tsx
  lib/
    auth.tsx, auth-guard.ts
  platform/
    supabase.ts, mailmypdf.ts, simple-pdf.ts, llm-service.ts
  domain/
    benefits-catalog.ts           # Benefits-specific workflow catalog
    benefits-grounds.ts            # Benefits-specific appeal grounds
    social-security-rules.ts      # SSDI/SSI specific rules
    unemployment-rules.ts          # Unemployment/EDD specific rules
    financial-aid-rules.ts         # Financial aid specific rules
  styles.css
  router.tsx
```

## Guardrails

- Never claim legal advice
- Never fabricate facts, evidence, deadlines, or mailing results
- Never expose catalog-only workflows as executable
- Show actual case state — never simulate analysis or mailing
- Source-linked findings with visible uncertainty states
- The handoff to MailMyPDF must preserve the final reviewed document
- Fulfillment status must be explicit
