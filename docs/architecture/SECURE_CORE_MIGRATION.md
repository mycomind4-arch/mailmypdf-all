# Secure Core migration into the new architecture

Status: in progress / shared security invariants migrated

## Non-negotiable boundary

`apps/**` is legacy, read-only source material for this migration. No file under `apps/**` is to be edited, deleted, rewired, cleaned up, or made authoritative. Useful behavior is copied/generalized into shared packages and new-architecture callers should depend on those packages instead.

## Migration map

| Legacy source | New architecture | Status / decision |
| --- | --- | --- |
| `apps/mailmypdf/src/lib/secure-core/auth.server.ts` | `packages/security/src/auth.ts` | **Copied + generalized.** Bearer token is validated server-side through the identity provider's `getUser()` call. The shared contract only accepts a user-scoped client factory and has no service-role/admin credential escape hatch. |
| `apps/mailmypdf/src/lib/secure-core/http.server.ts` | `packages/security/src/http.ts` | **Copied + generalized.** Sensitive JSON responses are `no-store`; JSON object parsing is content-type checked and byte bounded; unexpected errors are not leaked. |
| `apps/mailmypdf/src/lib/secure-core/document-intake.server.ts` | existing `packages/documents/src/index.ts` core + `packages/documents/src/adapters/secure-intake.ts` | **Adapter behavior migrated.** The canonical package already owned consent sequencing, filename/MIME/content validation, owner-scoped paths, SHA-256, quarantine state, retention, registration and storage rollback. The new adapter supplies persistence without duplicating that core. |
| `apps/mailmypdf/src/lib/secure-core/scanner.server.ts` | `packages/documents/src/scanning/scanner.ts` | **Migrated.** Timing-safe job authorization, HTTPS scanner requirement, API-key minimum, timeout, response-size bound, immutable size/hash verification, structural validation, scanner verdict persistence, clean release, reject destruction, deletion-queue handling and retry/failure recording are preserved behind injectable storage/state interfaces. |
| `apps/mailmypdf/src/lib/secure-core/retention.server.ts` | `packages/documents/src/retention/retention.ts` | **Migrated.** Expired/deletion-requested documents are claimed, bytes are deleted first, failures recorded, then records are converted to sanitized tombstones. The persistence adapter must clear filenames, MIME, hashes and scanner metadata when tombstoning. |
| `apps/mailmypdf/src/lib/secure-core/ai-gateway.server.ts` | existing `packages/ai/src/index.ts` + `packages/ai/src/document-disclosure.ts`; analysis orchestration in `packages/document-intelligence/src/case-analysis-orchestrator.ts` | **High-priority boundary migrated.** AI disclosure requires owner + matter attachment, clean/non-deleting/unexpired PDF metadata, owner-scoped storage path, bounded byte retrieval, independent SHA-256/size/PDF revalidation, metadata recheck, gateway provenance, an audit write before provider disclosure, another state recheck after audit, and explicit framing of document content as untrusted data. Existing provider execution policy/provenance remains in `@mailmypdf/ai`. |
| `apps/mailmypdf/src/lib/secure-core/case.server.ts` | existing `packages/workflows/src/matter-runtime*.ts` + `packages/workflows/src/matter-document-policy.ts` | **Useful invariants salvaged.** The existing new runtime already scopes persistence methods by owner. The added document policy preserves one source document, evidence-kind requirements, source-vs-evidence semantics, evidence included by default, source excluded by default, duplicate prevention, and bounded ordering. |
| `apps/mailmypdf/src/lib/secure-core/case-inputs.server.ts` | existing workflow store contract + `packages/workflows/src/matter-input-store.ts` | **Migrated as a generic contract.** Confirmed workflow/user facts have a separate versioned append-only store; extracted document facts do not write through this interface. Workflow-specific schemas remain domain/workflow policy, not platform code. |
| `apps/mailmypdf/src/lib/secure-core/case-analysis.server.ts` | `packages/document-intelligence/src/case-analysis-orchestrator.ts` + existing `packages/intelligence` | **Compared + salvaged.** Source bytes are disclosed for analysis through the secure gateway; stored analysis is used for later drafting so the document is not repeatedly redisclosed. Drafting uses confirmed workflow facts and evidence kinds only. `packages/intelligence` already owns provenance, facts, evidence, contradictions, findings, timelines, deadlines and risk, so those concepts were not duplicated. |
| `apps/mailmypdf/src/lib/secure-core/workflow-runtime.ts` | existing `packages/workflows/src/matter-runtime.ts`, `matter-runtime-server.ts` + `runtime-safety.ts` | **Compared carefully; not copied wholesale.** The new architecture already has a generic, adapter-driven runtime. Only missing safety rules were salvaged: current source must match analyzed source, source/included evidence must still be clean, and prompt-injection observations block automatic drafting pending review. Legacy workflow-specific registry/config remains domain-specific and is intentionally not promoted into the platform runtime. |
| `apps/mailmypdf/src/lib/secure-core/case-approval.server.ts` | existing `packages/workflows/src/matter-runtime.ts` + `packages/workflows/src/approval/packet-approval.ts` + canonical packet/pricing packages | **High-priority integrity behavior migrated.** Approval is created from a server-materialized packet preview and binds exact packet hash, response/supporting page counts, normalized attachment manifest, server price, recipient and mail class. Checkout must materialize again and fail closed on any hash, attachment, page-count or price difference. |
| pricing portion of `case-approval.server.ts` | existing `packages/pricing/src/index.ts` | **Already present; reused.** Pricing explicitly declares itself deterministic and server-authoritative, based on actual server-determined pages. No duplicate pricing engine was created. |
| `apps/mailmypdf/src/lib/secure-core/packet.server.ts` | existing canonical `packages/packet-builder/src/index.ts` + `packages/packet-builder/src/storage-adapter.ts` | **Storage/integrity behavior migrated.** Eligible-document selection stays behind an owner-aware adapter; reads use short-lived signed URLs, reject redirects, bound bytes/time, and require owner-scoped paths. Canonical assembly already re-hashes stored bytes, merges the exact packet, measures real pages and emits the manifest; the adapter persists measured counts. |
| `apps/mailmypdf/src/lib/secure-core/workflow-checkout.server.ts` | `packages/payment-fulfillment/src/approved-checkout.ts` + existing fulfillment engine | **High-priority checkout behavior migrated.** One immutable approval maps to one order; existing/raced orders are revalidated against packet hash and price; the PDF is parsed/recounted before order creation; concurrent order races are reconciled; open Stripe sessions are reused; expired sessions are released with compare-and-set; creation uses one stable approval idempotency key; the session is bound with compare-and-set; losing concurrent sessions are expired; Stripe metadata carries order/matter/approval IDs. |

## Existing new-architecture capabilities deliberately retained

The migration does **not** replace newer shared code when it is already stronger or more general:

- `@mailmypdf/documents` remains the canonical secure document validation/quarantine primitive.
- `@mailmypdf/packet-builder` remains the single production packet assembler and page counter.
- `@mailmypdf/pricing` remains the single server-authoritative pricing engine.
- `@mailmypdf/workflows` remains the generic matter/runtime host rather than importing legacy workflow registries.
- `@mailmypdf/intelligence` remains the canonical fact/evidence/provenance/contradiction/finding/timeline/deadline/risk model.
- `@mailmypdf/payment-fulfillment` remains the fulfillment engine; the approval-bound checkout module adds the legacy race and packet-binding guarantees that were missing from the generic layer.

## Tests added with this migration

- `packages/security/tests/auth.test.ts`: bearer required, provider-side `getUser()` validation, invalid/expired token fails closed.
- `packages/security/tests/http.test.ts`: no-store responses, JSON content-type enforcement, bounded request bodies.
- `packages/documents/tests/secure-lifecycle.test.ts`: quarantined file release only after integrity + scanner success; retention deletes bytes before tombstoning.
- `packages/ai/tests/document-disclosure.test.ts`: owner/matter verification, immutable byte checks, audit-before-provider rule, deletion-after-verification blocks disclosure.
- `packages/workflows/tests/packet-approval.test.ts`: exact rebuild accepted; changed manifest/page count/price rejected.
- `packages/payment-fulfillment/tests/approved-checkout.test.ts`: approval-order behavior, PDF page recount, stable Stripe idempotency key.

## Integration notes

1. New deployments should implement the package adapter interfaces for Supabase/storage/Stripe rather than importing clients from `apps/mailmypdf`.
2. Database/RLS remains an authorization boundary in addition to application owner IDs; adapters must enforce owner-scoped queries and must not use service-role credentials for user operations.
3. Database uniqueness should enforce one order per approval. Compare-and-set operations should enforce Stripe session claim/release races atomically.
4. Retention tombstoning must clear content-derived metadata after bytes are removed.
5. The existing matter runtime host should use `matter-document-policy.ts`, `runtime-safety.ts`, and `approval/packet-approval.ts` at its adapter/policy boundaries as workflows are wired onto the new runtime.
6. `pnpm-lock.yaml` should be regenerated once in a normal repository checkout after adding the new `packages/security` workspace package; no external dependency was added to that package.

## Legacy status

The legacy `apps/mailmypdf/src/lib/secure-core/**` files remain untouched and are no longer the intended destination for shared capability work. They are reference implementations only until every active new-architecture caller has been switched to the package interfaces above.
