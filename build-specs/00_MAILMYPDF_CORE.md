# Claude Code Build Prompt: MailMyPDF Core

## Mission

Build the MailMyPDF core application — the canonical host of the MailMyPDF ecosystem. This is the parent product that handles document mailing, tracking, proof, and serves as the gateway to all vertical products. It must be a production-grade web application that builds and deploys to Cloudflare Workers.

## Tech Stack

- **Framework:** TanStack Start (file-based routing, SSR, server functions)
- **UI:** React 19, Tailwind CSS 4 (via `@tailwindcss/vite`), Radix UI primitives, lucide-react icons
- **Routing:** TanStack Router with `@tanstack/router-plugin`
- **Auth:** Supabase (`@supabase/supabase-js`) — email/password + magic link
- **Payments:** Stripe (`stripe` + `@stripe/stripe-js` + `@stripe/react-stripe-js`)
- **Mailing:** Lob API (HTTP, server-side only)
- **PDF:** `pdf-lib` for server-side PDF generation
- **Database:** Supabase Postgres with Row Level Security (RLS)
- **Validation:** Zod
- **Pricing:** `@mailmypdf/pricing` package (canonical pricing engine)
- **Build:** Vite → Cloudflare Workers (nitro output)
- **Node:** 20+

## Design System — MailMyPDF Premium

This is the canonical design language for the entire ecosystem. Every vertical inherits this.

### Color Palette (CSS custom properties, OKLCH)

```css
:root {
  --radius: 0.625rem;

  /* Paper — warm ivory canvas */
  --paper: oklch(0.975 0.008 85);
  --paper-deep: oklch(0.955 0.012 82);

  /* Ink — deep charcoal with navy undertone */
  --ink: oklch(0.26 0.035 255);
  --ink-soft: oklch(0.44 0.03 255);

  /* Stamp — muted postal red (used sparingly for actions/important status) */
  --stamp: oklch(0.54 0.16 28);
  --stamp-soft: oklch(0.76 0.06 28);

  /* Cobalt — primary accent */
  --cobalt: oklch(0.45 0.14 255);
  --cobalt-soft: oklch(0.62 0.10 255);

  /* Brass — secondary accent */
  --brass: oklch(0.62 0.07 75);
  --brass-soft: oklch(0.78 0.05 75);

  /* Rule — subtle border */
  --rule: oklch(0.88 0.012 82);

  /* Semantic mappings */
  --background: var(--paper);
  --foreground: var(--ink);
  --card: oklch(0.992 0.004 85);
  --card-foreground: var(--ink);
  --popover: oklch(0.992 0.004 85);
  --popover-foreground: var(--ink);
  --primary: var(--ink);
  --primary-foreground: var(--paper);
  --secondary: var(--paper-deep);
  --secondary-foreground: var(--ink);
  --muted: var(--paper-deep);
  --muted-foreground: var(--ink-soft);
  --accent: var(--cobalt);
  --accent-foreground: oklch(0.98 0.003 85);
  --destructive: oklch(0.52 0.20 25);
  --destructive-foreground: oklch(0.98 0.003 85);
  --border: var(--rule);
  --input: var(--rule);
  --ring: var(--cobalt);
}

.dark {
  --paper: oklch(0.16 0.015 255);
  --paper-deep: oklch(0.20 0.018 255);
  --ink: oklch(0.95 0.008 85);
  --ink-soft: oklch(0.76 0.015 85);
  --stamp: oklch(0.64 0.16 28);
  --stamp-soft: oklch(0.50 0.10 28);
  --cobalt: oklch(0.60 0.14 255);
  --cobalt-soft: oklch(0.48 0.10 255);
  --brass: oklch(0.66 0.07 75);
  --brass-soft: oklch(0.52 0.05 75);
  --rule: oklch(0.30 0.015 255);
  /* ...same semantic mappings with dark tokens... */
}
```

### Typography

- **Serif display:** "Instrument Serif" (headings h1-h4, editorial moments)
- **Sans body:** "Inter" (all body text, UI)
- **Monospace:** "JetBrains Mono" (dates, status, references, metadata labels)

Load fonts via `<link>` in the root route's HTML head. Never `@import` font URLs in CSS.

### Custom CSS Utilities

```css
@utility postmark { /* circular pill badge — cobalt border, mono text, uppercase, tracking */ }
@utility envelope-card { /* card surface with paper bg, rule border, shadow-card, hover lift */ }
@utility envelope-card-hover { /* hover state: shadow-hover, translateY(-2px), border darkens */ }
@utility hairline { /* 1px top border in --rule */ }
@utility eyebrow { /* cobalt mono uppercase label for section headers */ }
@utility proof-badge { /* rounded pill for proof/status badges */ }
@utility postmark-circle { /* decorative faded circular stamp, rotated -12deg, pointer-events-none */ }
```

### Shadows

```css
--shadow-card: subtle layered shadow (1px+6px+24px offsets, ink-based);
--shadow-hover: elevated hover shadow;
--shadow-premium: premium card shadow;
--shadow-stamp: cobalt-tinted glow;
```

### Body Texture

Extremely faint radial gradients at 15%/5% and 85%/95% using cobalt and ink at 3-4% opacity, fixed attachment.

### Design Rules

- NO glossy gradients, excessive glassmorphism, or generic AI imagery
- Warm paper surfaces with thin rules
- Postal red/stamp accent used SPARINGLY (actions, important status only)
- Cobalt is the primary interactive accent
- Serif for editorial hierarchy, sans for density, mono for metadata
- Reduced-motion support required
- WCAG 2.2 AA compliance
- Never encode meaning through color alone

## Ecosystem Shell — Shared Navigation

The MailMyPDF core owns the canonical `EcosystemShell` component that ALL verticals import. Build it as a self-contained component.

### Shell Config Interface

```typescript
interface EcosystemShellConfig {
  brand: string;
  brandTagline: string;
  mailPdfUrl: string;
  workflowsUrl: string;
  howItWorksUrl: string;
  pricingUrl: string;
  authUrl: string;
  startUrl: string;
  dashboardUrl: string;
  productsUrl: string;
  currentProductSlug: string;
  caseTerm: "Cases" | "Matters";
  ctaLabel?: string;
  theme?: "default" | "private-office";
  auth: {
    user: { email: string; fullName?: string; role?: string } | null;
    loading: boolean;
    signOut: () => void | Promise<void>;
  };
}
```

### Header Layout

- Sticky, `z-50`, `border-b border-rule/60`, `bg-paper/90 backdrop-blur-md`
- Left: Brand logo + name + tagline
- Center/right desktop nav: "Mail a PDF" | "Products ▾" (dropdown) | "Workflows" | "How It Works" | "Pricing"
- Auth state: "Sign In" + "Start Now" pill button (anonymous) OR "Dashboard" + "Start Now" + avatar dropdown (authenticated)
- Mobile: hamburger → slide-down menu

### Products Dropdown

Lists all ecosystem products with name, description, category, and live/planned status. Current product is highlighted. Links to each product's deployed URL.

### Ecosystem Products Registry

```typescript
const ECOSYSTEM_PRODUCTS = [
  { name: "MailMyPDF", slug: "mailmypdf", href: "/", category: "Core", status: "live" },
  { name: "Notice Respond", slug: "notice-respond", href: "https://notice-respond.pages.dev", category: "Government / Official", status: "live" },
  { name: "Immigration Mail", slug: "immigration-mail", href: "https://immigration-mail.pages.dev", category: "Immigration", status: "live" },
  { name: "Appeal Mail", slug: "appeal-mail", href: "https://appeal-mail.pages.dev", category: "Appeals / Claims", status: "live" },
  { name: "Dispute Mail", slug: "dispute-mail", href: "https://dispute-mail.pages.dev", category: "Disputes", status: "live" },
  { name: "Private Office", slug: "private-office", href: "https://mycomind4-arch-mailmypdf-private-office.pages.dev", category: "Private Office", status: "live" },
  { name: "Benefits Appeal", slug: "benefits-appeal", href: "https://benefits-appeal.pages.dev", category: "Appeals / Claims", status: "planned" },
  { name: "Records Request", slug: "records-request", href: "/records-request", category: "Records / Information", status: "planned" },
  { name: "Small Business Mail", slug: "small-business-mail", href: "https://mycomind4-arch-mailmypdf-smallbusiness.pages.dev", category: "Business", status: "planned" },
  // ...more planned products
];
```

## Authentication — One MailMyPDF Account

### Identity Model

- One conceptual identity: **MailMyPDF Account**
- Uses Supabase Auth as the identity provider
- Users authenticate with email/password or magic link
- One account works across all ecosystem products (shared Supabase project)
- Roles: `customer` (default), `admin`, `super_admin`

### Auth Context

```typescript
interface MailMyPDFUser {
  id: string;
  email: string;
  fullName?: string;
  role: UserRole; // "customer" | "admin" | "super_admin"
}

interface AuthContextValue {
  user: MailMyPDFUser | null;
  loading: boolean;
  isConfigured: boolean;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInWithMagicLink: (email: string) => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  updateProfile: (data: { fullName?: string }) => Promise<AuthResult>;
}
```

### Auth Implementation Pattern

- `loadSupabase()` — lazily imports `@supabase/supabase-js`, reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `import.meta.env`
- `AuthProvider` wraps the app, listens to `onAuthStateChange`, maps Supabase user to `MailMyPDFUser`
- `mapUser()` reads `user_metadata.role` or `user_metadata.is_admin` to determine role
- Server-side auth: `requireAuthenticatedUser(request)` reads the Supabase session from the request, returns user or throws
- Admin authorization is server-side only via `user_roles` table (service role access)

### Database Schema

```sql
-- User roles (admin authorization — server-side only, RLS blocks client access)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('customer', 'admin', 'super_admin')),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE/DELETE policies — only service role can access

-- Orders (mailing orders)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft',
  document_url TEXT,
  document_name TEXT,
  recipient JSONB NOT NULL,
  return_address JSONB,
  mail_class TEXT NOT NULL DEFAULT 'standard',
  color BOOLEAN DEFAULT false,
  double_sided BOOLEAN DEFAULT false,
  page_count INTEGER,
  sheet_count INTEGER,
  lob_order_id TEXT,
  tracking_number TEXT,
  expected_delivery_date TEXT,
  stripe_session_id TEXT,
  stripe_payment_id TEXT,
  proof JSONB,
  pricing_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Saved recipients
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

Apply RLS to all user-data tables: users can only CRUD their own records (via `auth.uid() = user_id`). Audit events are append-only (service role writes, users read their own).

## Pricing — Canonical Engine

### @mailmypdf/pricing Package

Install via: `"@mailmypdf/pricing": "https://github.com/mycomind4-arch/mailmypdf-platform/releases/download/pricing-v0.2.2/mailmypdf-pricing-0.2.1.tgz"`

### Core Pricing Constants

```typescript
export const PRICES = {
  standard: 499,   // $4.99
  certified: 1494, // $14.94
  registered: 3249 // $32.49
};
```

### Quote Calculation (Server-Authoritative)

The server calculates every quote. The client NEVER controls price. The same inputs always produce the same quote (deterministic).

```typescript
const quote = calculateQuote({
  workflowId: "mail-a-pdf",
  verticalId: "mailmypdf",
  actualPages: 3,
  mailClass: "standard",
});
// quote.totalCents — the authoritative total in cents
```

### Core MailMyPDF Pricing Profiles

- `mail-a-pdf`: FREE band, $0 preparation, standard mail $4.99 (production)
- `write-a-letter`: FREE band, $0 preparation (production)
- `send-a-letter`: ESSENTIAL, $4.99 (production)
- `proof-of-mailing`: ESSENTIAL, $4.99 (production)
- `proof-of-service`: ESSENTIAL, $4.99 (production)

### Pricing Display Requirements

Landing pages must show:
- "Starting at" price tied to a clearly stated packet assumption
- What the starting price includes
- Available mailing methods and their prices
- An example total for a representative packet
- A statement that the exact price is calculated from the final approved packet before payment

## Mailing Fulfillment — Lob Integration

### Server-Side Only

All Lob API calls happen server-side. Never expose the Lob API key to the client.

```typescript
// Lob uses HTTP Basic auth with API key as username, empty password
function basicAuth(): string {
  return "Basic " + Buffer.from(`${config.lob.apiKey}:`).toString("base64");
}
```

### Mail Classes

- `standard` — First-Class mail via Lob
- `certified` — Certified mail with tracking (Lob `extra_service: "certified"`)
- `registered` — Registered mail (Lob `extra_service: "registered"`)

### Create Letter Flow

1. Generate PDF server-side (`pdf-lib` or uploaded document)
2. Upload to Supabase Storage, get signed URL
3. Call Lob `POST /v1/letters` with form-encoded body:
   - `file`: signed PDF URL
   - `color`: boolean
   - `double_sided`: false
   - `address_placement`: "top_first_page"
   - `use_type`: "operational"
   - `to[name]`, `to[address_line1]`, `to[address_city]`, `to[address_state]`, `to[address_zip]`
   - `from[name]`, `from[address_line1]`, etc.
   - `extra_service`: "certified" or "registered" if applicable
   - `metadata[orderId]`: order ID
4. Store `lob_order_id`, `tracking_number`, `expected_delivery_date` in the order record
5. Create proof packet

### Address Validation

Use Lob's address verification API (`POST /v1/us_verifications`) to validate recipient addresses before submission.

### Retry Logic

Retry Lob API calls up to 3 times with exponential backoff (1s, 2s, 4s base).

### Webhook Handling

Handle Lob webhooks at `/api/public/lob-webhook` for status updates:
- `letter.mailed` → update order status to "mailed"
- `letter.in_transit` → update to "in_transit"
- `letter.delivered` → update to "delivered", finalize proof

## Stripe Checkout Flow

1. User completes document + recipient + mailing options
2. Server calculates quote via `@mailmypdf/pricing`
3. Server creates Stripe Checkout Session:
   - `mode: "payment"`, `payment_method_types: ["card"]`
   - Single line item with `price_data` (currency: "usd", unit_amount: quote.totalCents)
   - Metadata: order_id, workflow_id, mailing_method, owner_user_id, pricing_source, quote_total_cents
   - `success_url` and `cancel_url` with query params
4. Redirect user to Stripe-hosted checkout
5. Stripe webhook (`/api/public/payments/webhook`) handles `checkout.session.completed`:
   - Verify signature
   - Load order from Supabase
   - Create Lob letter
   - Update order status
   - Create proof packet
   - Update order with tracking + proof

## Core Routes

### Public Routes

- `/` — Homepage with hero, ecosystem showcase, how-it-works, pricing overview
- `/mail-a-pdf` — Upload PDF, select recipient, choose mail class, checkout
- `/write` — Write a letter online, convert to PDF, mail it
- `/templates` — Letter templates library
- `/ecosystem` — Product family discovery page
- `/how-it-works` — Step-by-step process explanation
- `/resources` — Help articles, guides
- `/pricing` — Pricing overview
- `/products` — Ecosystem product directory
- `/auth` — Sign in / sign up page
- `/account` — Account settings (authenticated)

### Authenticated Routes

- `/dashboard` — Order history, recent mailings, stats
- `/dashboard/orders` — Full order list with filters
- `/dashboard/orders/$id` — Order detail with tracking + proof
- `/dashboard/settings` — Profile, saved recipients, preferences
- `/dashboard/ecosystem` — Ecosystem overview for authenticated users

### Admin Routes (server-authorized)

- `/admin` — Admin dashboard with order analytics
- `/admin/orders` — All orders across users
- `/admin/orders/$id` — Order detail with admin controls

### API Routes

- `POST /api/v1/documents` — Upload document to storage
- `GET /api/v1/documents/$id` — Get document metadata
- `DELETE /api/v1/documents/$id` — Delete document
- `POST /api/v1/communications` — Create mailing order
- `GET /api/v1/communications` — List user's orders
- `GET /api/v1/communications/$id` — Get order detail
- `GET /api/v1/communications/$id/proof` — Get proof packet
- `POST /api/public/payments/webhook` — Stripe webhook
- `POST /api/public/lob-webhook` — Lob webhook
- `GET /api/internal/health` — Health check
- `POST /api/ai-assist` — AI-assisted letter writing

## Pipeline: P01 Core Mail / Correspondence

The Gold Standard pipeline for core mail:

```
SECURE INGEST → CLASSIFY → EXTRACT → UNDERSTAND → FACTS + PROVENANCE →
TIMELINE / DEADLINES → ISSUES / DISCREPANCIES → EVIDENCE →
AUTHORITY / RESEARCH WHEN REQUIRED → STRENGTH / RISK → STRATEGY →
DRAFT → VALIDATE → BLOCKING GATES → HUMAN REVIEW →
AUTHORIZED MAIL → TRACK → PROVE / AUDIT
```

For core mail (P01), this simplifies to:

```
UPLOAD DOCUMENT → VALIDATE → SELECT RECIPIENT → CHOOSE MAIL CLASS →
REVIEW → CALCULATE PRICE → CHECKOUT → FULFILL (LOB) → TRACK → PROVE
```

## Configuration

### Environment Variables

```
# Supabase
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_...

# Lob
LOB_API_KEY=...
LOB_WEBHOOK_SECRET=...

# App
APP_URL=https://mailmypdf.ai
```

### Centralized Config Module

All `process.env` access goes through a centralized `@/config` module that validates at startup. Missing critical values cause fail-fast errors with clear messages.

## SEO

- Canonical host: `mailmypdf.ai`
- One ecosystem sitemap at `mailmypdf.ai/sitemap.xml`
- `robots.txt` with prelaunch indexing disabled until launch
- Core routes: `/`, `/send`, `/write`, `/templates`, `/ecosystem`, `/how-it-works`, `/resources`, `/pricing`
- JSON-LD structured data on homepage (WebSite schema with SearchAction)
- OG tags, canonical URLs, descriptive metadata on every page

## Deployment

- Build: `vite build` → Cloudflare Workers (nitro)
- Deploy: `npx nitro deploy --prebuilt` or Cloudflare Pages
- Test: `node --test tests/*.test.mjs`
- Lint: `eslint .`
- Verify: `npm test && npm run build`

## File Structure

```
src/
  routes/
    __root.tsx          # Root layout with fonts, EcosystemShell
    index.tsx           # Homepage
    mail-a-pdf.tsx      # Upload + mail flow
    write.tsx           # Write a letter
    templates.tsx       # Templates
    ecosystem.tsx       # Product family page
    how-it-works.tsx    # Process page
    pricing.tsx         # Pricing page
    products.tsx        # Products directory
    auth.tsx            # Sign in / sign up
    account.tsx         # Account settings
    _authenticated/
      dashboard/
        index.tsx       # Dashboard home
        orders.tsx      # Order history
        settings.tsx    # Settings
      admin/
        index.tsx       # Admin dashboard
    api/
      v1/
        documents/      # Document CRUD
        communications/ # Order CRUD
      public/
        payments/webhook.ts  # Stripe webhook
        lob-webhook.ts       # Lob webhook
      internal/
        health.ts            # Health check
  components/
    ecosystem-shell.tsx      # SHARED navigation (exported to verticals)
    ecosystem-shell-config.ts
    site-chrome.tsx          # Footer
    document-upload.tsx
    payment-test-mode-banner.tsx
    pro-upsell.tsx
    seo-landing.tsx
    vertical-landing.tsx
    product-placeholder-page.tsx
    product-family-page.tsx
    workflow-authority-page.tsx
  lib/
    auth.ts                  # Auth context
    config/index.ts          # Centralized config
    lob.server.ts            # Lob client (server-only)
    letter-pdf.server.ts     # PDF generation
    email.server.ts          # Email (Resend)
    feature-flags.ts         # Feature flags
    order-state-machine.ts   # Order status transitions
    address-validation.ts    # Address validation
    retry.ts                 # Retry utility
    ecosystem.ts             # Ecosystem verticals registry
    master-public-routes.ts  # Public route manifest
  config/
    index.ts                 # Config re-export
  domain/
    models.ts                # Domain types
    status-mapping.ts        # Status mapping
    index.ts                 # Domain exports
  hooks/
    use-mobile.tsx           # Mobile detection
  styles.css                 # Design system CSS
  router.tsx                 # Router setup
  start.ts                    # Server entry
  server.ts                   # Server config
```

## Key Implementation Notes

1. **Ecosystem Shell is the shared navigation** — export it so verticals import it. It accepts a config object and renders the header. Each vertical passes its own config with its brand name, URLs, and auth hook.

2. **Pricing is server-authoritative** — never trust client-side price calculation. The `@mailmypdf/pricing` engine runs server-side. Store a quote snapshot at checkout time to lock in terms.

3. **Lob is server-only** — never import `lob.server.ts` from client code. All API calls happen inside route handlers or server functions.

4. **Proof packets are immutable** — once created, they are sealed with a timestamp and hash. They serve as the audit trail for mailing.

5. **Feature flags** control auto-submission to Lob, email notifications, and other optional behaviors.

6. **Admin access** is checked server-side via the `user_roles` table using the Supabase service role key. The client never has admin authorization logic.

7. **Guest order lookup** is a narrow recovery feature (lookup by order ID + email), NOT general account history. Full history requires authentication.

8. **Prelaunch SEO** — indexing disabled via `robots.txt` until the owner's launch switch. The sitemap exists but is not submitted to search engines until launch.
