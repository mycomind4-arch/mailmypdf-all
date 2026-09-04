# MailMyPDF Security Core Rebuild

## Decision

Preserve the current MailMyPDF visual shell and workflow language, but replace the security-critical core incrementally. One shared platform should own identity, document custody, consent, payments, fulfillment, audit records, and retention. Verticals remain isolated by workflow definitions and authorization scopes, not by duplicating authentication, Stripe, Lob, or user databases.

No sensitive-document workflow is launchable until every launch gate below is verified in a production-like environment.

## Security invariants

1. The browser, filenames, extensions, MIME headers, PDFs, images, extracted text, and AI output are untrusted.
2. End-user document access is enforced by database and storage policy, not route code alone.
3. Uploaded documents begin in quarantine and cannot be downloaded, analyzed, merged, paid for, or mailed until a trusted scanner records `clean`.
4. Every sensitive processing purpose has a versioned, immutable consent receipt.
5. A user approves the exact immutable packet hash that fulfillment receives.
6. Stripe success is accepted only from a verified, idempotent webhook. A redirect is never proof of payment.
7. Lob submission is idempotent, uses the approved packet hash, and records provider events without exposing document content.
8. Sensitive content is absent from URLs, analytics, logs, error trackers, and support tooling.
9. Access, status changes, packet approval, payment, mailing, export, and deletion create tamper-evident audit events.
10. Retention is explicit, short by default, user-visible, and enforced by tested deletion jobs including stored objects and derived files.

## Trust boundaries and data classes

| Class | Examples | Minimum controls |
|---|---|---|
| Restricted | Medical records, SSA notices, appeal packets, identity documents | Private encrypted storage, owner RLS, quarantine, malware scanning, no third-party analytics, short retention |
| Confidential | Address, email, workflow answers, order metadata | Owner RLS, field minimization, audit trail, controlled support access |
| Operational | Provider IDs, status, timestamps, non-content security events | Least privilege, integrity constraints, retention policy |
| Public | Landing-page and help content | Normal publishing controls; never mixed with restricted data |

## Target core

| Capability | Authoritative component | Required state |
|---|---|---|
| Identity | Supabase Auth with user-scoped server clients | MFA/passkey roadmap; verified sessions; no service-role key in request paths |
| Authorization | Postgres RLS plus private Storage policies | Owner and explicit support roles; automated cross-tenant tests |
| Document intake | Secure v2 document API | Signature validation, quarantine, malware/CDR scanner, status gate |
| Workflow state | Versioned workflow schema and server transition engine | Allowlisted transitions; server validation; resumable encrypted drafts |
| Packet creation | Deterministic PDF assembler | Provenance, stable ordering, PDF/A decision, immutable SHA-256 manifest |
| User approval | Packet review service | Exact hash, timestamp, disclosures, explicit authorization |
| Payments | Central Stripe service | Server price lookup, verified webhook, idempotency, refunds and reconciliation |
| Fulfillment | Central Lob service | Approved-hash match, address validation, idempotency, webhook reconciliation |
| Audit and retention | Append-only event service and deletion workers | Redacted events, alerts, tested purge/export procedures |

## First implemented slice

`POST /api/v2/documents` establishes the new boundary. It requires an authenticated user and multipart upload with `file`, `workflow_id`, a constrained non-sensitive `purpose` code, and `consent=true`. It records immutable consent, validates the real file signature, stores the object in a private owner-prefixed quarantine, and returns metadata with HTTP 202. Free-form medical/legal details must never be placed in the consent purpose. There is intentionally no direct Storage SELECT policy and no AI, packet, payment, or mailing integration yet.

`POST /api/internal/scan-documents` is an independently authenticated job boundary. It atomically claims work, rechecks the stored SHA-256 hash, and sends bytes to a configured self-hosted HTTPS malware scanner. Only an explicit `clean` verdict releases a document. Infected files become `rejected` and are removed; errors return to quarantine with bounded attempts. Status transitions create immutable audit events.

`GET /api/v2/documents/:id/download` requires a verified end user and checks owner, `clean` status, and non-deletion twice before issuing a 60-second signed URL. This is for controlled review only; downstream AI and fulfillment must implement their own clean-status and approved-packet gates.

`POST /api/internal/purge-secure-documents` atomically changes expired records to `deleting` before touching Storage, preventing new download grants during cleanup. The separately authenticated job retries failed object deletion, erases filenames, MIME metadata, size, hash, and scanner data after successful object deletion, and records the status transition. Download grants create append-only audit events containing only the document/user references and expiry duration—never the signed URL or document content.

`DELETE /api/v2/documents/:id` lets an authenticated owner request erasure. Access is revoked immediately; if a scanner already holds the row, the deletion timestamp prevents the scanner from releasing it and transfers it safely to the purge worker. `GET /api/v2/privacy/export` produces an owner-scoped, no-store JSON export of the secure-core document metadata, consent receipts, and audit events. Synchronous exports are deliberately bounded; larger accounts must use a future asynchronous encrypted-export job.

The legacy `/api/v1/documents` tenant-key path remains for compatibility and is **not approved for sensitive end-user documents**.

## Delivery sequence

1. Apply and integration-test the vault migration locally and in an isolated Supabase project.
2. Deploy and validate the malware-scanner service, add CDR where appropriate, and connect job scheduling and alerting.
3. Schedule and alert on automatic retention deletion, validate storage deletion behavior, and add the asynchronous encrypted-export path for unusually large accounts.
4. Build the common workflow engine and migrate SSDI denial appeal first, including evidence upload and packet ordering.
5. Add deterministic packet preview, manifest, exact-hash approval, and accessibility review.
6. Replace payment and Lob paths with centralized idempotent services and verified webhooks.
7. Run authorization, upload-abuse, privacy, disaster-recovery, accessibility, and fulfillment tests.
8. Pilot with synthetic documents, then a limited monitored production cohort before adding other verticals.

## Launch blockers

- Independent threat model and data-flow review are incomplete.
- Malware scanning/CDR and clean-only retrieval do not exist.
- Support/admin access controls and emergency access procedure are undefined.
- Packet manifest and exact-hash user approval do not exist.
- Stripe and Lob end-to-end idempotency/reconciliation are not verified.
- Retention/export/deletion workers and restoration tests do not exist.
- Production secrets, key rotation, backups, alerting, incident response, vendor agreements, and breach procedures are unverified.
- Cross-user/cross-tenant RLS tests, dependency scanning, SAST, DAST, and penetration testing are incomplete.
- Accessibility, privacy notice, consent language, legal review, and government-form accuracy review are incomplete.

## Public references and candidate components

The verification baseline is NIST CSF 2.0, NIST SSDF, OWASP ASVS, and CISA Secure by Design. Evaluate the official OWASP ASVS repository for requirements traceability, OWASP Threat Dragon for the threat model, and ClamAV for one scanning layer. Adoption requires maintenance, licensing, accuracy, privacy, and deployment review; no public repository should be copied into the trusted core without that review.

## RedactDesk reuse assessment

The separately reviewed `mycomind4-arch/redact-desk` repository is useful as a future isolated redaction worker, not as the document vault or malware gate. Its strongest reusable pieces are searchable-PDF coordinate extraction, explicit REDACT/KEEP review decisions, reviewer attestations, rasterized release rendering, original/output SHA-256 manifests, append-only events, organization-scope tests, and pinned upstream engine commits.

Do not integrate it yet. Before use, resolve the missing repository-level license, reconcile the README's obsolete “no authentication” warning with the newer API-key/RBAC implementation, replace local SQLite/filesystem custody with the core's private object references and job protocol, add OCR safety for scanned records, bound rasterization resource use, and complete adversarial PDF/redaction-leak tests. RedactDesk does not replace malware scanning, clean-only retrieval, or the user's final appeal-packet approval.
