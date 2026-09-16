# Shared Capability Audit — 2026-09-16

This audit reviews the reusable platform capabilities that should sit beneath every MailMyPDF workflow before workflow-manifest automation is expanded.

## Overall result

The platform already had strong intelligence, workflow, pricing, payment/fulfillment, packet-building, and acceptance-test foundations. The primary gaps were not missing product ideas; they were missing or under-specified **shared boundaries** around secure document lifecycle, visual analysis, notifications, address verification, proof integrity, and conditional step execution.

This pass hardens those shared boundaries while deliberately leaving provider credentials and deployment-specific adapters in `apps/mailmypdf`.

## Findings and changes

| Capability | Before this pass | Result |
| --- | --- | --- |
| Identity / entitlements | `@mailmypdf/ecosystem` | Existing foundation retained |
| Matter state | Linear `@mailmypdf/step-workflow` | Added declarative conditional steps and active-step progress |
| Secure upload | Production code existed in app secure-core | Added provider-neutral quarantine intake, consent, owner-scoped path, hash, rollback primitives to `@mailmypdf/documents` |
| Storage | Supabase adapter existed in app | Shared storage boundary is now represented by document-vault contracts; provider remains app-owned |
| Malware / structural scanning | Strong app implementation | Added shared scan contract, byte/hash re-verification, fail-closed evaluation |
| Retention | Strong app implementation | Added shared retention calculations, disclosure rules, purge eligibility |
| Text extraction | Existing `@mailmypdf/document-intelligence` | Retained |
| Source provenance | Document-intelligence source refs omitted document identity | Fixed: extracted source refs now carry documentId + documentName |
| PDF / image analysis | Real Claude PDF path existed only in app | Added scanned-clean, hash-verified provider-neutral visual-analysis capability |
| Facts / evidence / contradictions / findings / timeline / deadlines / risk | `@mailmypdf/intelligence` | Strong existing implementation retained |
| AI gateway | `@mailmypdf/ai` | Fixed timeout timer cleanup; provenance/fallback model retained |
| PDF generation / packet assembly | `@mailmypdf/packet-builder` | Fixed wrapped-line pagination, smart punctuation, and overlong-token wrapping; added tests |
| Pricing | `@mailmypdf/pricing` | Strong existing server-authoritative engine retained |
| Stripe / immutable approval-to-payment | `@mailmypdf/payment-fulfillment` | Strong existing implementation/tests retained |
| Address verification | Duplicated app-local Lob logic | Added canonical shared address preflight/verification semantics to `@mailmypdf/fulfillment` |
| Mailing | `@mailmypdf/mailing-client` | Added fail-closed response validation and mandatory idempotency key |
| Tracking | `@mailmypdf/fulfillment` | Added provider-processing, returned, undeliverable, and refused canonical states |
| Notifications | Email helpers existed only in app | Added idempotent shared notification dispatch and deadline-reminder scheduling to `@mailmypdf/ecosystem` |
| Proof / custody | `@mailmypdf/proof` was type-only/minimal | Added canonical serialization, metadata-covered custody hashes, chain verification, verifiable proof bundles |
| Workflow capability registry | 23 high-level capabilities | Expanded to cover foundation/document/commerce/delivery capabilities and implementation ownership |

## Important production adapters that remain app-owned

These are intentionally deployment-specific and should be injected into the shared capability contracts rather than copied into each workflow:

- Supabase secure-document persistence/storage
- Malware scanner HTTP adapter
- Anthropic/Claude API adapter and disclosure audit persistence
- Stripe SDK adapter and webhook verification
- Lob letter/address/webhook adapter
- Resend email adapter
- Supabase matter/event repositories

A workflow must never instantiate these providers itself.

## Known architectural rule

A workflow should define domain rules, fields, prompts, conditions, templates, and which shared capabilities it requires. It should not implement authentication, storage, scanning, AI transport, PDF assembly, pricing, Stripe, Lob, notifications, tracking, or proof.

## Next phase

Only after this capability CI passes should the workflow-manifest/factory layer be changed to compose these capabilities automatically.
