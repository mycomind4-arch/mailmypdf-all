# MailMyPDF

Mail a physical letter or PDF without a printer. Upload a PDF or write a letter in your browser — MailMyPDF prepares it for print and mail through USPS.

Built with TanStack Start, Supabase, Lob (mailing API), and Stripe (payments).

## Current customer features

- Upload a PDF or write a letter in-browser
- Standard, Certified Mail, and Registered Mail options
- Color printing
- 20+ letter templates
- Future-self scheduled letters
- Bulk mailing
- MailMyPDF Pro subscription
- Order tracking and proof records

## Customer pricing

Base letter pricing is determined by page count:

- 1–2 pages: **$4.99**
- 3–5 pages: **$6.99**
- 6–10 pages: **$9.99**

Optional add-ons:

- Color printing: **+$0.15 per page**
- Certified Mail: **+$9.95 per piece**
- Registered Mail: **+$27.50 per piece**

MailMyPDF Pro is **$9.99/month** and includes **5 free standard letters per month**. After the five included letters, the Pro base rate is **$3.99 per letter**. Color and premium mail-class add-ons are charged separately at their normal rates.

Prices are for the MailMyPDF service and may change. The checkout price shown before payment is the authoritative total for an order.

## Architecture

- **Frontend:** TanStack Start (file-based routing), Radix UI, Tailwind CSS
- **Backend:** Supabase (auth, database, storage)
- **Mailing:** Lob API for print-and-mail fulfillment
- **Payments:** Stripe Checkout
- **Deployment:** Cloudflare Workers compatible

## Routes

```text
src/routes/
  index.tsx                   Landing page
  auth.tsx                    Authentication
  bulk.tsx                    Bulk mailing
  certified-mail-guide.tsx    Certified Mail information
  mail-a-contract-online.tsx  Contract mailing
  future-self.tsx             Scheduled future letters
  _authenticated/             Protected customer routes
  api/                        Server functions
```

## Documentation

- [Architecture Roadmap](docs/ARCHITECTURE_ROADMAP.md)
- [Launch Verification](docs/LAUNCH_VERIFICATION.md)
- [Setup Guide](docs/SETUP_GUIDE.md)
- [Retention & Cleanup](docs/RETENTION_AND_CLEANUP.md)
- [FairProcessMaps Integration](docs/integrations/FAIRPROCESSMAPS.md)

## Getting started

```bash
bun install
cp .env.example .env
bun run dev
```

Fill in the required Supabase, Lob, and Stripe configuration before using external services.

## Status

Actively developed. Payment, mailing, retention, and production-launch checks are documented in the project documentation.

> **Note:** This project is connected to Lovable. Avoid rewriting published git history.
