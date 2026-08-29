# Immigration Mail

Immigration Mail is the flagship MailMyPDF ecosystem vertical for preparing and sending important immigration-related correspondence.

## Product loop

**Understand → Structure → Prepare → Review → Send → Track → Prove → Follow up**

The target experience is simple: a user can photograph or upload an immigration letter, ask what it means in their preferred language, identify what action is needed, prepare a response from their own verified facts, review it, and mail it through the canonical MailMyPDF fulfillment layer.

## Current implementation

- TanStack Start + React + TypeScript foundation
- Cloudflare-compatible server entry
- Security-header middleware foundation
- Responsive marketing homepage and workflow discovery
- Flagship **Respond to a Notice** guided workflow
- Supporting Documents and Explanation Letter workflow entries
- Reusable workflow and mailing domain types
- Focused SEO infrastructure (`robots.txt`, sitemap, `llms.txt`)
- Provider-neutral immigration intelligence contracts
- Immigration document/fact/deadline provenance model
- Multilingual language preference foundation
- Approval-gated voice assistant boundary
- Deterministic correspondence preflight
- MailMyPDF Platform adapter with canonical `/v1/documents` and `/v1/communications` APIs
- Shared MailMyPDF Account authentication with persistent sessions, magic links, password reset, and access tokens
- Server-side authentication guard for protected API boundaries
- Authenticated Stripe Checkout for mailing intents
- Durable Stripe-to-MailMyPDF fulfillment state with idempotent submission

## Platform architecture

Immigration Mail consumes reusable technology from **MailMyPDF Platform** rather than rebuilding it. The target shared capabilities are document security/provenance, document intelligence, structured AI, evidence, timelines/deadlines, voice, usage/entitlements, and fulfillment/proof contracts.

The Platform defines provider-neutral boundaries for Docling-compatible document intelligence and LiveKit/Pipecat-compatible realtime voice. Immigration-specific taxonomy, workflows, prompts, and UX remain owned by this repository.

See `docs/PLATFORM_INTEGRATION_PLAN.md` and the ecosystem `VERTICAL_FULFILLMENT_CONTRACT.md` in `mailmypdf-platform`.

## Multilingual by design

The interface, assistant, source document, and final mailing language are separate preferences. The initial language foundation covers English, Spanish, Chinese, Vietnamese, Korean, Tagalog, Arabic, Russian, Haitian Creole, Portuguese, French, Hindi, Urdu, Bengali, and Punjabi.

## Voice by design

Voice can explain documents, summarize, navigate, capture facts, manage checklists, review drafts, and read correspondence aloud. Consequential actions such as mailing are approval-gated and cannot be silently executed by voice.

## Remaining production work

The core account and payment/fulfillment seam is now implemented, but the vertical is not yet release-verified. Remaining work includes:

- Run the full Vitest suite and production build after the migration.
- Verify Supabase RLS and production environment configuration.
- Add real test-mode Stripe + MailMyPDF end-to-end coverage without production mailing.
- Connect additional workflows to the shared fulfillment contract.
- Complete tracking webhooks/proof archive and account/order-history UX.
- Connect production immigration intelligence providers and hosted workers.

## Safety boundary

Immigration Mail is not a law firm or government agency and does not provide legal advice. The application must not invent facts, deadlines, requirements, or legal conclusions. Extracted facts and AI suggestions must remain reviewable and source-linked. Inferred dates must be clearly marked as inferred. Official government information must be sourced from authoritative government material when presented as requirements.
