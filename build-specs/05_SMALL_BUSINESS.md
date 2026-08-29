# Claude Code Build Prompt: MailMyPDF Small Business

## Mission

Build MailMyPDF Small Business — the operational correspondence and physical-mail workspace for small businesses. Users prepare business documents (payment reminders, demands, contract renewals, compliance notices, customer dispute responses), mail them professionally, and keep permanent records. This is the most productivity-oriented product in the family — a lightweight mail operations desk, not another consumer landing page.

## Ecosystem Context

MailMyPDF Small Business is part of the MailMyPDF ecosystem. It shares:
- **One MailMyPDF Account** (Supabase auth)
- **Canonical pricing engine** (`@mailmypdf/pricing`)
- **Ecosystem shell** (shared navigation)
- **MailMyPDF fulfillment** (Lob mailing, tracking, proof)
- **Canonical SEO** under `mailmypdf.ai/business/*`

### Pipeline: P07 Business Automation

```
CREATE → SCHEDULE → APPROVE → SEND → TRACK → PROVE → ARCHIVE
```

For business correspondence, the pipeline emphasizes:
- Speed and clarity over dense analytics
- Reusable recipients and templates
- Mailing history and proof visualization
- Cost transparency (mail method, page count, recipient before authorization)

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
- **Background Jobs:** Trigger.dev integration (optional, for scheduling)
- **Build:** Vite → Cloudflare Workers
- **Node:** 20+

## Design System

Inherit the MailMyPDF premium design system. Give Business a more operational workspace feel — the most productivity-oriented product in the family.

### Product Personality

Professional, efficient, dependable, organized. The product should feel like a lightweight mail operations desk for a small business.

### Visual Language
- MailMyPDF warm paper foundation (inherited)
- Navy/ink for operational structure
- Postal red as action/proof accent
- Serif for brand/editorial moments
- Sans/monospace for dense operational information
- Tables, queues, calendars, status pills, contact cards, document previews, proof records
- Strong whitespace and restrained borders instead of dashboard decoration
- AVOID: generic SaaS dashboard aesthetics, consumer landing page feel

## Ecosystem Shell

```typescript
const shellConfig: EcosystemShellConfig = {
  brand: "Small Business Mail",
  brandTagline: "Prepare business documents. Mail them professionally. Keep the record.",
  mailPdfUrl: "https://mailmypdf.ai/mail-a-pdf",
  workflowsUrl: "/workflows",
  howItWorksUrl: "/how-it-works",
  pricingUrl: "/pricing",
  authUrl: "/auth",
  startUrl: "/start",
  dashboardUrl: "/dashboard",
  productsUrl: "/products",
  currentProductSlug: "small-business-mail",
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

-- Business mailings
CREATE TABLE IF NOT EXISTS business_mailings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  document_url TEXT,
  document_name TEXT,
  recipient JSONB NOT NULL,
  return_address JSONB,
  mail_class TEXT NOT NULL DEFAULT 'standard',
  color BOOLEAN DEFAULT false,
  page_count INTEGER,
  stripe_session_id TEXT,
  stripe_payment_id TEXT,
  lob_order_id TEXT,
  tracking_number TEXT,
  proof JSONB,
  pricing_snapshot JSONB,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contacts (business address book)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  organization TEXT,
  address1 TEXT NOT NULL,
  address2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Templates (reusable letter templates)
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  workflow_id TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
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

### Small Business Pricing Profiles

| Workflow ID | Band | Base Price | Status |
|---|---|---|---|
| `payment-reminder` | FREE | $0 | production |
| `payment-demand` | ESSENTIAL | $4.99 | production |
| `contract-renewal` | FREE | $0 | production |
| `compliance-notice` | ESSENTIAL | $4.99 | production |
| `customer-dispute-response` | ESSENTIAL | $4.99 | production |

Mail prices: Standard $4.99, Certified $14.94, Registered $32.49.

Many business workflows are FREE (preparation fee $0) — the revenue comes from mailing fees. This makes Business an acquisition product.

## Application Architecture

### Primary Workspace Navigation

```
Queue · Calendar · Contacts · Templates · Mailings · Proof Archive
```

### Queue View

The queue should make upcoming, awaiting approval, scheduled, mailed, and attention-required states immediately legible:
- **Upcoming** — drafts not yet sent
- **Awaiting Approval** — items needing review before mailing
- **Scheduled** — items with a future send date
- **Mailed** — items sent, awaiting delivery
- **Attention Required** — failures, bounces, returned mail

### Calendar View

Show scheduled mailings on a calendar with:
- Date/time of scheduled send
- Recipient name
- Mail class
- Status

### Contacts View

Business address book:
- Search, filter, sort
- Contact cards with name, organization, address, email, phone
- Reusable across mailings
- Import/export (CSV)

### Templates View

Reusable letter templates:
- Pre-built templates for common business correspondence
- Custom templates with variables
- Template preview
- Create mailing from template

### Mailings View

Full mailing history:
- Status pills (draft, scheduled, sent, in-transit, delivered, failed)
- Tracking numbers
- Proof links
- Filter by date, status, recipient, workflow

### Proof Archive

Permanent proof records:
- Mailing date
- Recipient
- Mail class
- Tracking number
- Delivery confirmation
- Proof packet (hash, sealed timestamp)

### Mail Flow

```
Document → Recipient → Options → Review → Mail → Tracking → History
```

The user should understand the cost, mailing method, recipient, and final document before authorization.

## Homepage Architecture

1. **Hero** — "Prepare business documents. Mail them professionally. Keep the record." Focused on eliminating printing, envelopes, stamps, and post-office work.
2. **Workflow Strip** — Prepare → Review → Address → Mail → Track → Reuse
3. **Common Business Correspondence Directory** — Payment reminders, demands, contract renewals, compliance notices, customer dispute responses
4. **Reusable Recipient/Template Workflow** — Show the productivity loop
5. **Mailing History and Proof Visualization** — Track every piece of mail
6. **Team/Business Workflow Benefits** — Where actually implemented
7. **Trust/Security** — Professional, private, provably delivered
8. **MailMyPDF Fulfillment Explanation** — How physical mail works
9. **FAQ**
10. **Ecosystem Footer**

## Workflow Pages

Each business workflow page should explain:
- The business problem it solves
- Who it's for (business owner, manager, office admin)
- What to prepare
- Template or custom content
- Recipient selection
- Mailing options
- Cost transparency
- Tracking and proof

## Routes

### Public Routes
- `/` — Homepage
- `/start` — Start a mailing
- `/workflows` — Workflow directory
- `/how-it-works`, `/pricing`, `/products` — Standard pages
- `/about`, `/contact`, `/faq` — Static pages
- `/resources/$slug`, `/resources` — Resources
- `/auth` — Auth page
- `/account` — Account settings
- `/privacy`, `/terms` — Legal pages

### Authenticated Routes
- `/dashboard` — Queue view (default)
- `/dashboard/calendar` — Calendar view
- `/dashboard/contacts` — Contacts
- `/dashboard/templates` — Templates
- `/dashboard/mailings` — Mailing history
- `/dashboard/proof` — Proof archive
- `/dashboard/settings` — Business settings

### API Routes
- `POST /api/checkout` — Stripe checkout
- `POST /api/stripe-webhook` — Stripe webhook
- `GET /api/mailings` — List mailings
- `POST /api/mailings` — Create mailing
- `GET/POST /api/contacts` — Contact CRUD
- `GET/POST /api/templates` — Template CRUD
- `POST /api/lob-webhook` — Lob webhook for status updates
- `GET /api/auth/status` — Auth status

## Production Honesty

The repository may contain real Trigger.dev boundaries and integration contracts, but several production infrastructure pieces may remain incomplete. UI MUST represent these boundaries honestly and NEVER claim a mailing, tracking event, CRM sync, or proof record exists unless the underlying service confirms it.

Do not advertise team, bulk, integrations, or automation capabilities unless they are actually implemented.

## Automation (When Implemented)

Make recurring and scheduled correspondence feel safe and controlled:
- Every automation should expose its next run, audience, template, approval policy, and cancellation/edit controls
- Approval-gated: scheduled mailings require explicit approval before sending
- Cancellation: users can cancel scheduled mailings before they're submitted to Lob

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
APP_URL=https://mycomind4-arch-mailmypdf-smallbusiness.pages.dev

# Trigger.dev (optional)
TRIGGER_API_KEY=...

# AI
GEMINI_API_KEY=... (optional, for template generation)
```

## File Structure

```
src/
  routes/
    __root.tsx
    index.tsx                    # Homepage
    start.tsx                    # Quick start
    auth.tsx                     # Auth
    account.tsx                  # Account
    dashboard.tsx                # Queue (default)
    workflows/index.tsx          # Workflow directory
    api/
      checkout.ts
      stripe-webhook.ts
      lob-webhook.ts
      mailings/index.ts
      contacts/index.ts
      templates/index.ts
      auth/status.ts
    pricing.tsx, how-it-works.tsx, products.tsx
    about.tsx, contact.tsx, faq.tsx
    resources/index.tsx, resources/$slug.tsx
    privacy.tsx, terms.tsx
  components/
    ecosystem-shell.tsx
    ecosystem-shell-config.ts
    site-header.tsx
    site-footer.tsx
    mailing-queue.tsx            # Queue view
    mailing-calendar.tsx         # Calendar view
    contacts-manager.tsx        # Contacts
    template-manager.tsx        # Templates
    mailing-history.tsx          # History
    proof-archive.tsx            # Proof records
    document-editor.tsx          # Document prep
    recipient-selector.tsx      # Recipient picker
    mailing-options.tsx         # Mail class, color, etc.
  lib/
    auth.tsx
    auth-guard.ts
  functions/                     # Trigger.dev functions (when implemented)
  trigger/                        # Trigger.dev task definitions
  supabase/
    schema.sql
  platform/
    supabase.ts
    mailmypdf.ts
    simple-pdf.ts
  domain/
    workflows.ts
    templates.ts
  styles.css
  router.tsx
```

## Guardrails

- Prioritize speed and clarity over dense analytics
- The user should understand the cost, mailing method, recipient, and final document before authorization
- Never show a successful mailing until the real fulfillment provider confirms it
- Do not advertise team, bulk, integrations, or automation capabilities unless they are actually implemented
- Make recipient, mailing method, document status, and fulfillment state immediately visible
- Every automation should expose its next run, audience, template, approval policy, and cancellation/edit controls
