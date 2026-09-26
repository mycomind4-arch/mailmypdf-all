# MailMyPDF Capability Additions Roadmap

Updated 2026-09-26 from the live `mailmypdf-all-main` checkout.

This is a planning inventory, not a claim that every item exists. The current
registry has 66 capability IDs. New items remain roadmap candidates until they
have a contract, an adapter or native implementation, fixtures, security
review, and acceptance evidence.

## Source policy

| Source | Use it for | Do not use it for |
| --- | --- | --- |
| Existing workspace package | Registering behavior already present in `packages/*` | Treating a package name as production certification |
| Native MailMyPDF implementation | Ownership, authorization, approval, provenance, payment, mailing, retention, and product invariants | Rebuilding generic commodity primitives unnecessarily |
| Public-repository adapter | Commodity parsing, OCR, schema validation, calendaring, postal normalization, and provider protocols | Importing unreviewed code into consequential paths |
| Hybrid | Public primitive plus MailMyPDF policy, ownership, provenance, and fail-closed wrapper | Letting an upstream library define MailMyPDF policy |

Every public-repository candidate must record its immutable commit, license,
security history, dependency surface, maintenance health, fixture mapping, and
replacement plan before it can move beyond `planned`.

## Already registered in the current repository

These are covered by the current 66-ID registry and should be deepened before
creating near-duplicate capabilities:

`identity`, `matterState`, `security`, `secureUpload`, `documentStorage`,
`documentScanning`, `retention`, `classification`, `extraction`,
`visionAnalysis`, `aiExecution`, `understand`, `facts`, `provenance`,
`timeline`, `deadlines`, `findings`, `contradictions`, `discrepancies`,
`requirements`, `evidence`, `research`, `risk`, `strategy`, `draft`,
`draftProvenance`, `validation`, `blockingGate`, `humanReview`, `approval`,
`pdfGeneration`, `packetAssembly`, `pricing`, `payment`,
`addressVerification`, `mailing`, `tracking`, `notifications`, `proofAudit`,
`archive`, `resilience`, `observability`, and `acceptanceTesting`.

## Highest-value additions

| Capability to add | Purpose | Recommended source | Priority |
| --- | --- | --- | --- |
| Contract schema validation | Validate capability inputs/outputs and compiler manifests at runtime | Hybrid: public JSON-Schema validator behind a native boundary | P0 |
| Capability provenance | Record source package, repository, commit, license, and reviewer for every binding | Native | P0 |
| Capability policy evaluation | Enforce data class, actor, ownership, jurisdiction, and effect policies | Native | P0 |
| Binding health checks | Verify that a declared runtime binding is actually installed and callable | Native | P0 |
| Capability fixture registry | Map every capability to unit, integration, and acceptance fixtures | Native | P0 |
| Version compatibility | Resolve compatible capability and package versions | Native | P0 |
| Secret and PII redaction | Prevent sensitive values from entering logs, prompts, telemetry, or templates | Native, with audited redaction primitives where useful | P0 |
| Tenant/matter isolation | Enforce ownership across every capability context and adapter | Native | P0 |
| Consent and disclosure | Track user consent for uploads, AI processing, sharing, and mailing | Native | P0 |
| Audit event integrity | Hash-link capability inputs, outputs, approvals, and external effects | Existing `proof` package, hardened natively | P0 |
| Idempotency and replay | Make payment, mailing, notifications, and retries replay-safe | Existing fulfillment/payment packages, hardened natively | P0 |
| Human escalation | Route unsupported, ambiguous, or high-risk cases to a human queue | Native | P0 |

## Document and media capabilities

| Capability to add | Purpose | Recommended source | Priority |
| --- | --- | --- | --- |
| OCR quality scoring | Score extraction confidence and identify pages requiring review | Hybrid: public OCR engine plus native evidence policy | P1 |
| Table extraction | Preserve tables from statements, notices, invoices, and schedules | Public parser/OCR adapter | P1 |
| Form-field extraction | Map official PDF fields to structured workflow fields | Existing `forms` plus native mapping layer | P1 |
| PDF conformance check | Detect malformed, encrypted, oversized, or non-printable PDFs | Existing packet/document code plus public PDF inspection adapter | P1 |
| Image normalization | Rotate, deskew, crop, de-noise, and normalize scans | Public imaging adapter | P1 |
| Document similarity | Detect duplicate uploads and near-duplicate versions | Public embedding/hash primitive plus native policy | P1 |
| Redaction | Permanently remove sensitive content from released documents | Native policy with audited PDF primitive | P0 |
| Page-level citation | Link every extracted claim to page, region, and source hash | Native | P0 |
| Document comparison | Compare notices, policies, contracts, and revisions | Hybrid | P1 |
| Packet ordering | Enforce cover letter, form, exhibits, and attachment ordering | Existing packet builder, promoted to a contract | P0 |
| Printability/accessibility | Check fonts, contrast, tags, margins, and page breaks | Hybrid | P1 |
| Evidence packaging | Produce a manifest of included, excluded, and missing evidence | Existing proof/packet packages, formalized | P0 |

## Intelligence and reasoning capabilities

| Capability to add | Purpose | Recommended source | Priority |
| --- | --- | --- | --- |
| Fact confidence | Separate extracted, user-confirmed, externally verified, disputed, and superseded facts | Existing intelligence, expanded natively | P0 |
| Fact conflict resolution | Ask targeted questions when sources disagree | Native | P0 |
| Missing-fact planner | Generate the smallest safe set of follow-up questions | Native workflow policy | P0 |
| Source authority ranking | Prefer official records and user-provided originals over weak sources | Existing jurisdiction/registry packages plus native policy | P0 |
| Citation verification | Verify that a cited rule, form, or instruction is current and applicable | Hybrid: public retrieval/parser plus native authority policy | P1 |
| Deadline derivation | Calculate response windows with event dates, holidays, and jurisdiction rules | Existing deadlines/jurisdiction packages, expanded | P0 |
| Deadline uncertainty | Represent unknown trigger dates, tolling, extensions, and conflicting deadlines | Native | P0 |
| Timeline normalization | Normalize dates, events, actors, and source confidence | Existing timeline capability, expanded | P1 |
| Issue taxonomy | Map documents and user goals to reusable issue types | Native domain contracts | P1 |
| Argument/evidence linkage | Ensure each material assertion has supporting evidence or a declared assumption | Native | P0 |
| Unsupported-claim detection | Block or flag claims not supported by matter evidence | Existing draft/provenance, expanded | P0 |
| Outcome simulation | Explain possible paths and tradeoffs without promising outcomes | Native, human-review gated | P1 |
| Explainability packet | Produce a reviewer-readable explanation of how a draft was formed | Native | P1 |
| Model evaluation | Compare AI outputs against golden synthetic cases | Existing acceptance package, expanded | P0 |
| Prompt/model registry | Version prompts, models, schemas, and fallback behavior | Existing AI package, expanded natively | P0 |
| AI provider failover | Safely fall back between providers without changing policy or schema | Existing AI package, expanded | P1 |

## Workflow and factory capabilities

| Capability to add | Purpose | Recommended source | Priority |
| --- | --- | --- | --- |
| Problem-to-plan intake | Convert a user problem into a private, reviewable matter plan | Native | P0 |
| Template matching | Select an existing reviewed workflow before proposing a new one | Native registry/query layer | P0 |
| Private plan compiler | Compose capabilities without publishing a public template | Native, extending current factory | P0 |
| Template generalization | Remove user values, uploads, narratives, and identifiers safely | Native privacy workflow | P0 |
| Template duplicate detection | Prevent a catalog of near-identical workflows | Hybrid | P1 |
| Workflow diffing | Show changes in fields, rules, capabilities, gates, and outputs | Native | P1 |
| Compatibility checking | Detect incompatible packages, adapters, jurisdictions, and versions | Native registry | P0 |
| Step dependency planning | Order steps from capability dependencies and user facts | Existing workflow runtime, expanded | P0 |
| Conditional branching | Support domain-specific paths without dynamic unreviewed code | Existing workflow conditions, expanded | P0 |
| Unsupported-capability queue | Turn missing capability requests into review tasks, never invented automation | Native | P0 |
| Factory dry run | Compile, validate, and preview a workflow without side effects | Native | P0 |
| Factory rollback | Revert a generated draft/template to a prior version | Native | P1 |
| Workflow migration | Upgrade manifests across contract versions with explicit review | Native | P1 |
| Runtime binding planner | Show which actual executors will run each capability | Existing runtime/bundle, expanded | P0 |
| Acceptance scenario generator | Produce synthetic cases from a manifest without real user data | Existing acceptance package, expanded | P1 |
| Acceptance coverage report | Show capability, branch, jurisdiction, and failure-mode coverage | Native reporting | P0 |

## Identity, authority, and jurisdiction

| Capability to add | Purpose | Recommended source | Priority |
| --- | --- | --- | --- |
| Party resolution | Resolve people, organizations, representatives, and roles | Existing `identity-capacity`, expanded | P0 |
| Capacity verification | Determine whether an actor can act for a person/entity | Existing `identity-capacity`, expanded | P0 |
| Representative authorization | Store authorization scope, effective dates, and revocation | Native | P0 |
| Organization resolution | Normalize business names, registrations, and identifiers | Existing `registry-adapters` plus public registry adapters | P1 |
| UCC/registry search | Search and normalize public registry results with provenance | Existing `registry-adapters`, provider adapters | P1 |
| Jurisdiction resolution | Determine governing location from verified facts without overclaiming | Existing `jurisdiction-rules`, expanded | P0 |
| Rule-pack lifecycle | Effective dates, supersession, coverage, and review of jurisdiction rules | Existing `jurisdiction-rules`, expanded | P0 |
| Official-form discovery | Match a workflow to the current official form and revision | Hybrid | P1 |
| Filing/submission rules | Represent copies, signatures, fees, channels, and accepted formats | Hybrid: public official data plus native reviewed rules | P1 |
| Holiday/calendar rules | Calculate business days and agency closures | Public calendar library/data adapter plus native rule policy | P1 |
| Language/accessibility support | Generate accessible, translated, and interpreter-aware outputs | Hybrid | P1 |

## Domain capability families

These should be added as domain packs backed by the shared capabilities above.
The first implementation should come from existing top-level sections and
packages; public repositories may supply parsers or reference data, but not
unreviewed legal conclusions.

| Domain family | Capabilities to add | Primary source |
| --- | --- | --- |
| Tax and government notices | Notice family classification, tax fact extraction, issue mapping, agency routing, notice deadlines | Existing workflows plus native reviewed rules |
| Benefits and disability | Eligibility fact map, denial-ground map, medical evidence checklist, reconsideration/hearing packet | Existing benefits/appeal workflows, native policy |
| Insurance | Policy/claim extraction, coverage issue map, denial analysis, appeal requirements, claim chronology | Existing insurance/appeal packages, native policy |
| Healthcare | Medical-necessity evidence map, prior authorization, records request, provider submission | Existing workflows plus native safety boundary |
| Credit and debt | Tradeline normalization, debt validation, furnisher dispute, account-history reconciliation | New native domain pack; public parsers only for report formats |
| Consumer billing | Transaction reconciliation, recurring-charge analysis, refund/charge dispute packet | New native domain pack plus payment-data adapters |
| Housing and tenant | Lease fact map, notice classification, repair evidence, deposit accounting, local-rule lookup | Existing housing/tenant workflows plus jurisdiction packs |
| Property and contractor | Scope/change-order comparison, defect evidence, demand packet, lien/permit record lookup | New native domain pack plus registry adapters |
| Immigration | Form/notice classification, evidence checklist, deadline and agency routing, translation/accessibility | Existing immigration workflows; official-form adapters |
| Court and administrative procedure | Case metadata, filing instructions, procedural deadlines, exhibit packet, service proof | New native domain pack; official-source adapters |
| DMV/licensing | License status, suspension grounds, hearing deadline, agency instructions | Existing workflows plus jurisdiction packs |
| Records requests | Request scoping, custodian routing, exemptions, fee/deadline tracking, response comparison | Existing records-request package, expanded |
| Small business | Customer/vendor correspondence, approval policy, relationship history, recurring workflow triggers | Existing small-business section plus native policy |
| Secured transactions | Party/capacity, obligation, collateral, attachment, perfection, priority, authorized filing, lifecycle | Existing `secured-transactions`, `identity-capacity`, `registry-adapters`, and jurisdiction rules |

## Commerce, fulfillment, and retention

| Capability to add | Purpose | Recommended source | Priority |
| --- | --- | --- | --- |
| Quote explanation | Explain every price component before payment | Existing pricing, expanded | P0 |
| Payment authorization binding | Bind payment to exact approved draft, recipient, evidence, and packet hashes | Existing payment-fulfillment, hardened natively | P0 |
| Refund/cancellation policy | Represent cancellation windows, provider state, and customer-visible outcomes | Native | P1 |
| Address normalization | Canonical postal form and correction evidence | Existing fulfillment, public postal adapter where needed | P0 |
| Mailing class policy | Select standard/certified/registered service under workflow policy | Existing fulfillment/mailing-client, expanded | P0 |
| Provider adapter health | Validate provider credentials, status vocabulary, and endpoint health | Native adapter layer | P0 |
| Webhook verification | Verify signatures, replay protection, and event ordering | Existing fulfillment/payment packages, formalized | P0 |
| Delivery exception handling | Returned, refused, undeliverable, delayed, and provider-failed paths | Existing fulfillment, expanded | P0 |
| Proof-of-mailing packet | Durable receipt, tracking, timestamps, hashes, and custody chain | Existing proof, expanded | P0 |
| Retention and deletion controls | Matter-level retention, legal hold, export, and purge | Existing documents/proof, expanded | P0 |
| User export | Export a complete human-readable and machine-readable matter record | Native | P1 |
| Notification preferences | Consent, channel, quiet hours, and deadline escalation | Existing notifications, expanded | P1 |

## Recommended execution order

1. Finish P0 governance, policy, provenance, runtime binding, and fixture
   contracts.
2. Deepen the existing document/intelligence/approval/packet/payment/mailing
   capabilities with real schemas and acceptance fixtures.
3. Build the problem-to-private-plan and reviewed-template flow in the existing
   Workflow Factory.
4. Promote existing domain packages into capability adapters, starting with
   secured transactions, jurisdiction rules, identity-capacity, and registry
   adapters.
5. Add public-repository adapters for commodity primitives only after the
   provenance and replacement contracts are in place.
6. Add domain families one at a time, using synthetic acceptance scenarios and
   explicit jurisdiction coverage.
