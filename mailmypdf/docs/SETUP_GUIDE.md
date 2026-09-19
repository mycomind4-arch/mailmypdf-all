# MailMyPDF — End-to-End Setup Guide

This guide walks you through everything you need to do to get MailMyPDF running
end-to-end with your own Stripe, Lob, and Supabase accounts.

## Prerequisites

- A [Supabase](https://supabase.com) project (you already have one)
- A [Stripe](https://stripe.com) account (test mode is fine to start)
- A [Lob](https://lob.com) account (test mode is fine to start)
- Optional: a [Resend](https://resend.com) account for email notifications
- A place to deploy the app that can receive webhooks (Vercel, Netlify, Railway, etc.)

---

## 1. Supabase Setup

You already have a project (`tonttrntpzlctlhfphio`). You need:

### a) Service Role Key
1. Go to **Supabase Dashboard → Settings → API**
2. Copy the **service_role** key (not the anon key — the service role bypasses RLS)
3. This goes in `SUPABASE_SERVICE_ROLE_KEY`

### b) Storage Bucket
1. Go to **Storage** in the Supabase dashboard
2. Create a bucket named `order-pdfs` (set it to **private** — the app signs URLs server-side)

### c) Database Migrations
The migrations in `supabase/migrations/` should already be applied to your project
(you've been running this app on Lovable). If starting fresh, run them in order:

```bash
supabase db push
```

Or paste each SQL file into the SQL Editor and run them in order.

### d) Admin User (optional — for the admin panel)
If you want access to the admin dashboard at `/admin`:

1. Create a user via Supabase Auth (email + password)
2. Run this SQL in the SQL Editor (replace with your auth user ID):

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR-AUTH-USER-ID', 'admin');
```

---

## 2. Stripe Setup

### a) Create Products & Prices

You need 3 Stripe Price objects with **lookup keys** that match what the code expects.
The app charges: $4.99 for 1-2 pages, $6.99 for 3-5 pages, $9.99 for 6+ pages.

Go to **Stripe Dashboard → Products** and create:

| Product Name        | Lookup Key         | Price  | Type            |
|---------------------|--------------------|--------|--------------------|
| MailMyPDF Letter (1-2 pages)  | `letter_short`  | $4.99  | One-time payment   |
| MailMyPDF Letter (3-5 pages)  | `letter_medium` | $6.99  | One-time payment   |
| MailMyPDF Letter (6-10 pages) | `letter_long`  | $9.99  | One-time payment   |

**How to set the lookup key:** When creating a price in the Stripe dashboard,
expand "Additional options" and find the "Lookup key" field. Alternatively,
use the Stripe API:

```bash
# Create products
curl https://api.stripe.com/v1/products \
  -u sk_test_YOUR_KEY: \
  -d "name=MailMyPDF Letter (1-2 pages)"

curl https://api.stripe.com/v1/prices \
  -u sk_test_YOUR_KEY: \
  -d "product=prod_XXX" \
  -d "unit_amount=499" \
  -d "currency=usd" \
  -d "lookup_key=letter_short"

# Repeat for letter_medium (699) and letter_long (999)
```

### b) Get Your API Keys
1. Go to **Stripe Dashboard → Developers → API Keys**
2. Copy the **Secret key** (starts with `sk_test_` in test mode)
   → This goes in `STRIPE_SANDBOX_API_KEY`
3. Copy the **Publishable key** (starts with `pk_test_`)
   → This goes in `VITE_PAYMENTS_CLIENT_TOKEN` in `.env.development`

### c) Set Up Webhook Endpoint
1. Go to **Stripe Dashboard → Developers → Webhooks → Add endpoint**
2. **Endpoint URL:** `https://YOUR_DOMAIN/api/public/payments/webhook`
3. **Events to send:**
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `payment_intent.payment_failed`
4. After creating, click the endpoint → **Signing secret** → Copy it
   → This goes in `PAYMENTS_SANDBOX_WEBHOOK_SECRET`

For local development, use the Stripe CLI to forward webhooks:

```bash
stripe listen --forward-to localhost:3000/api/public/payments/webhook
```

It will print a webhook secret — use that as `PAYMENTS_SANDBOX_WEBHOOK_SECRET`.

---

## 3. Lob Setup

### a) Get Your API Key
1. Go to **Lob Dashboard → Settings → API Keys**
2. Copy the **Test Live** API key (starts with `test_`)
   → This goes in `LOB_API_KEY`

### b) Set Up Webhook Endpoint
1. Go to **Lob Dashboard → Settings → Webhooks**
2. Create a new webhook:
   - **URL:** `https://YOUR_DOMAIN/api/public/lob-webhook`
   - **Events:** Subscribe to all `letter.*` events
3. Copy the webhook signing secret
   → This goes in `LOB_WEBHOOK_SECRET`

For local development, use a tunnel like ngrok or cloudflared:

```bash
ngrok http 3000
# Then use the https://xxx.ngrok.io URL as your webhook endpoint
```

### c) Verify Your Addresses (Lob Requirement)
Lob requires address verification for the **"from" address** (your business address).
In test mode, Lob will accept unverified addresses but you should still set up
your return address:

1. Go to **Lob Dashboard → Settings → Return Addresses**
2. Add your business return address

For production/live mode, Lob requires verified addresses on file.

---

## 4. Resend Setup (Optional — for Email Notifications)

Without Resend, the app works fine — it just won't send payment confirmation
or "your letter has been mailed" emails. The admin panel shows a warning.

### a) Get Your API Key
1. Go to **Resend Dashboard → API Keys → Create API Key**
2. Copy the key → This goes in `RESEND_API_KEY`

### b) For Production: Verify a Sending Domain
The app defaults to `onboarding@resend.dev` (Resend's sandbox — only sends to
*your own* Resend account email). For production:

1. Go to **Resend Dashboard → Domains → Add Domain**
2. Add your domain and add the DNS records Resend gives you
3. Update the `FROM` constant in `src/lib/email.server.ts` to use your domain:
   ```ts
   const FROM = "MailMyPDF <noreply@yourdomain.com>";
   ```

---

## 5. Environment Variables Summary

Here's the complete list. Copy `.env.example` to `.env` and fill these in:

```env
# Payment mode: "sandbox" (Stripe test) or "live" (real charges)
PAYMENTS_ENV="sandbox"
MAILMYPDF_BASE_URL="https://your-domain.com"

# Stripe (test mode keys)
STRIPE_SANDBOX_API_KEY="sk_test_..."
PAYMENTS_SANDBOX_WEBHOOK_SECRET="whsec_..."

# Lob
LOB_API_KEY="test_..."
LOB_WEBHOOK_SECRET="..."
AUTO_SUBMIT_TO_LOB="false"

# Supabase
SUPABASE_URL="https://tonttrntpzlctlhfphio.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
SUPABASE_PROJECT_ID="tonttrntpzlctlhfphio"
SUPABASE_PUBLISHABLE_KEY="eyJ..."
VITE_SUPABASE_PROJECT_ID="tonttrntpzlctlhfphio"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJ..."
VITE_SUPABASE_URL="https://tonttrntpzlctlhfphio.supabase.co"

# Stripe publishable key (browser-side, in .env.development)
VITE_PAYMENTS_CLIENT_TOKEN="pk_test_..."

# Resend (optional)
RESEND_API_KEY="re_..."

# Public URL for email links
PUBLIC_APP_URL="https://your-domain.com"
```

---

## 6. Deploy & Test

### Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Go to `/send` and walk through the flow:
1. Upload a PDF (max 10 pages, 10MB)
2. Enter sender + recipient addresses
3. Review
4. Pay (use Stripe test card: 4242 4242 4242 4242, any future date, any CVC)

### Deploy

This is a TanStack Start app built with Vite. Deploy to any Node.js host:

- **Vercel:** `npm run build` → it produces a Node server. Configure Vercel
  to run the server build output.
- **Railway / Render / Fly.io:** Standard Node.js deployment.
- **Important:** Set ALL the environment variables above in your deployment
  platform's dashboard.

### End-to-End Verification

Follow the checklist in `docs/LAUNCH_VERIFICATION.md`:

1. Deploy with `PAYMENTS_ENV=sandbox` and `AUTO_SUBMIT_TO_LOB=false`
2. Complete a test payment — confirm the order moves to "paid_pending_manual_fulfillment"
3. Go to the admin panel (`/admin`) and manually submit to Lob
4. Check Lob dashboard — a test letter should appear
5. Confirm Lob webhooks update the order status (mailed → in_transit → delivered)
6. Once everything works, set `AUTO_SUBMIT_TO_LOB=true` to automate the flow
7. Switch to live Stripe keys only when ready for real charges

---

## What Changed (Code Changes Made)

This clone was modified from the original Lovable-built project to remove
Lovable infrastructure dependencies and work with direct API integrations:

1. **`src/lib/stripe.server.ts`** — Removed Lovable's Stripe connector gateway
   proxy. Now calls Stripe API directly with standard SDK.
2. **`src/lib/email.server.ts`** — Removed Lovable's Resend connector gateway.
   Now calls Resend API directly.
3. **`src/lib/orders.functions.ts`** — Removed Lovable-specific Stripe checkout
   params (`managed_payments`, `integration_identifier`).
4. **`src/routes/certified-mail-guide.tsx`** — Fixed Lovable URLs.
5. **`src/routes/__root.tsx`** — Fixed Lovable CDN og:image URL.
6. **`.env.example`** — Complete environment variable documentation.
