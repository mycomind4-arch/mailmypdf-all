# MailMyPDF Domain Capability Catalog

This catalog identifies reusable capabilities for legal matters, IRS matters,
creative finance, and secure file handling. It is a roadmap, not a claim that
every item is implemented or that any workflow guarantees a legal or tax
outcome.

Status/source labels:

- **Extend existing** — behavior already exists in the repository and should be
  promoted, hardened, or registered rather than rebuilt.
- **Build native** — MailMyPDF must own the policy, authorization, provenance,
  or safety boundary.
- **External adapter** — a commodity engine, official data source, or provider
  may be integrated behind a MailMyPDF contract after license, security,
  jurisdiction, and replacement review.
- **Hybrid** — external computation wrapped by native policy and evidence
  controls.

## 1. Legal-matter capabilities

### Matter intake, authority, and safety

| Capability | Purpose | Source | Priority |
| --- | --- | --- | --- |
| Legal matter intake | Convert a user’s problem into parties, objective, facts, documents, deadlines, and desired action | Build native; extend workflow factory | P0 |
| Matter type classification | Distinguish notice, demand, dispute, appeal, records request, filing, contract, and transaction matters | Extend document intelligence and domain adapters | P0 |
| Jurisdiction resolution | Resolve relevant country, state, county, court, agency, and governing instrument from verified facts | Extend `jurisdiction-rules` | P0 |
| Authority/capacity resolution | Determine who is acting, for whom, and under what authority | Extend `identity-capacity` | P0 |
| Representative authorization | Store scope, effective period, revocation, and evidence for an agent, attorney, guardian, or entity representative | Build native | P0 |
| Conflict/intake screening | Flag incompatible parties, adverse interests, duplicate matters, or prohibited representations | Build native; human-review gated | P1 |
| Legal disclaimer and escalation | Identify when the product must explain limits, recommend professional help, or stop | Build native | P0 |
| Unsupported-claim gate | Prevent the system from presenting legal conclusions not grounded in source authority or verified facts | Extend provenance/validation | P0 |

### Authority, rules, and deadlines

| Capability | Purpose | Source | Priority |
| --- | --- | --- | --- |
| Authority source registry | Track statutes, regulations, rules, official instructions, agency pages, and court rules | Extend `jurisdiction-rules`; build provenance metadata | P0 |
| Authority freshness check | Detect superseded, expired, or changed authority sources | Hybrid: official-source retrieval plus native review | P0 |
| Citation extraction | Extract legal citations, form numbers, docket references, and quoted provisions | Extend document intelligence | P1 |
| Citation verification | Check that a cited authority exists and matches the claimed proposition | Hybrid; human-review gated | P0 |
| Procedural rule mapping | Map matter type and jurisdiction to filing, service, copy, signature, fee, and format rules | Build native rule packs | P0 |
| Deadline derivation | Calculate response, appeal, cure, payment, hearing, filing, and service deadlines | Extend deadlines/jurisdiction packages | P0 |
| Business-day and holiday calendar | Calculate court/agency business days, closures, and observed holidays | External calendar/data adapter plus native rule policy | P1 |
| Deadline uncertainty | Represent unknown receipt date, tolling, extensions, multiple triggers, and conflicting deadlines | Build native | P0 |
| Deadline reminders | Notify users before consequential deadlines with source and confidence | Extend `notifications` | P0 |
| Deadline audit trail | Preserve trigger, source, calculation, timezone, and user confirmation | Extend `proof` and `notifications` | P0 |

### Evidence and legal documents

| Capability | Purpose | Source | Priority |
| --- | --- | --- | --- |
| Evidence inventory | Catalog uploaded, generated, external, and user-described evidence | Extend `documents`, `intelligence`, and `proof` | P0 |
| Evidence admissibility notes | Track relevance, source, authenticity status, limitations, and unresolved questions without declaring admissibility | Build native | P1 |
| Evidence-to-claim linkage | Link each material assertion in a draft to facts and source pages | Extend provenance/evidence graph logic | P0 |
| Contradiction analysis | Find conflicts between notices, contracts, declarations, records, and user answers | Extend intelligence | P0 |
| Missing-evidence planner | Ask for the smallest set of documents or facts needed to proceed | Build native workflow policy | P0 |
| Chain of custody | Hash, timestamp, actor, custody transition, and storage history for evidence | Extend `proof` | P0 |
| Exhibit management | Label, order, cite, paginate, and include/exclude exhibits deterministically | Extend `packet-builder` | P0 |
| Legal correspondence drafting | Generate grounded demand, response, appeal, cure, records, and clarification letters | Extend `draft` and domain packs | P0 |
| Pleading/form drafting | Populate structured court or agency forms while preserving official form boundaries | Extend `forms` plus native field mapping | P1 |
| Draft comparison | Compare revisions and show changes before approval | Build native | P1 |
| Privilege/confidentiality flagging | Flag attorney-client, work-product, sealed, confidential, or restricted material for review | Hybrid; native policy owns the gate | P0 |
| Settlement/offer packet | Assemble proposals, terms, supporting evidence, and approval history | Build native; human-review gated | P1 |
| Legal document quality review | Check placeholders, missing signatures, incorrect parties, citations, pages, dates, and attachments | Extend validation and acceptance | P0 |

### Signature, service, filing, and proof

| Capability | Purpose | Source | Priority |
| --- | --- | --- | --- |
| Signature capture | Capture an actual signature event, signer identity, consent, timestamp, and artifact hash | External e-sign adapter or native thin package | P0 |
| Signature envelope | Manage signer order, reminders, refusal, expiry, completion, and immutable final artifact | External adapter plus native state model | P0 |
| Notarization | Route documents requiring notarization and retain notarial evidence | External notarization adapter; no invented notarization | P1 |
| Service method selection | Determine mail, certified mail, personal service, electronic service, or other allowed method | Native jurisdiction rules | P1 |
| Court e-filing | Submit approved filings through a supported court/EFSP integration | External adapter plus native approval boundary | P1 |
| Agency e-submission | Submit to supported government portals or APIs with receipt capture | External adapter | P1 |
| Filing package validation | Validate caption, case number, signature, exhibits, fees, format, and naming before filing | Build native | P0 |
| Filing receipt capture | Store confirmation number, timestamp, accepted/rejected state, and submitted artifact hash | Extend `proof` and fulfillment | P0 |
| Service proof | Store mailing receipt, tracking, affidavit/certificate, and delivery evidence | Extend `mailing`, `tracking`, and `proof` | P0 |
| Filing/payment idempotency | Prevent duplicate filings, payments, or mailed packets after retries | Extend payment/fulfillment resilience | P0 |

## 2. IRS and tax-matter capabilities

These capabilities should be conservative: they organize notices, facts,
documents, calculations, and responses. They must not invent tax positions,
guarantee acceptance, or imply representation before the IRS.

### IRS source and taxpayer identity

| Capability | Purpose | Source | Priority |
| --- | --- | --- | --- |
| IRS notice classification | Identify notice family, tax year, tax period, stated issue, response address, and deadline | Extend notice/document intelligence; official-form registry | P0 |
| Notice authenticity review | Check visible identifiers, source metadata, inconsistencies, and user concerns without guaranteeing authenticity | Build native; escalation gate | P0 |
| Taxpayer/entity identity | Normalize taxpayer name, EIN/SSN last-four representation, entity type, and authorized representative | Extend `identity-capacity`; sensitive-data controls | P0 |
| Tax-year/period normalization | Normalize tax year, quarter, filing period, assessment date, and notice date | Build native | P0 |
| IRS account/fact model | Store balances, adjustments, payments, credits, filing status, and source confidence | Build native; never treat user assertion as verified fact | P0 |
| Transcript/document intake | Securely receive account transcripts, wage/income records, returns, notices, and correspondence | Extend secure documents and extraction | P0 |
| Official IRS form registry | Track form revision, instructions, required fields, and allowed attachments | Extend `forms`; official source synchronization | P0 |

### IRS response and compliance workflows

| Capability | Purpose | Source | Priority |
| --- | --- | --- | --- |
| CP notice issue mapping | Map notice language to stated issue, requested action, response window, and evidence checklist | Build native domain pack | P0 |
| IRS deadline engine | Calculate notice, appeal, payment, response, and extension deadlines from authoritative triggers | Extend deadline/rule packs | P0 |
| IRS response letter | Draft a source-grounded response addressing the notice’s stated issues | Extend draft/provenance; human review | P0 |
| Penalty-abatement packet | Organize reasonable-cause facts, supporting records, requested relief, and uncertainty | Build native; human review | P1 |
| Installment/payment-plan packet | Organize financial facts and request documentation without promising eligibility | Build native | P1 |
| Offer-in-compromise preparation | Collect financial information, document gaps, and prepare review materials without calculating unsupported eligibility | Build native; tax-professional escalation | P1 |
| Audit response packet | Organize IRS requests, document index, explanations, and delivery proof | Build native; extend packet/proof | P0 |
| Amended-return preparation | Compare return versions, identify changed fields, and prepare review artifacts | Hybrid: tax calculation engine plus native review | P1 |
| Filing-status/dependency evidence | Organize supporting facts and documents for status/dependency questions | Build native; no automatic legal conclusion | P1 |
| Wage/income reconciliation | Compare W-2/1099/transcript data against user-provided records | Hybrid parser plus native discrepancy engine | P0 |
| Tax document extraction | Extract payer, recipient, amount, tax year, withholding, and form identifiers | Extend document intelligence | P0 |
| IRS authorization packet | Prepare identity/authorization materials for forms such as power-of-attorney or information authorization | Extend forms and signature capabilities | P1 |
| IRS submission channel selection | Track mail, fax, portal, practitioner, and other permitted submission methods | Official-source rule pack | P0 |
| IRS receipt/proof packet | Preserve delivery proof, transcript of submission, response, and follow-up dates | Extend mailing/proof | P0 |
| Tax professional handoff | Export a structured, provenance-linked packet for a CPA, EA, or attorney | Build native | P0 |
| Tax calculation boundary | Define when calculations require a dedicated tax engine or professional review | Build native policy; external engine adapter | P0 |

## 3. Creative-finance and secured-transaction capabilities

These workflows require heightened identity, jurisdiction, disclosure, and
professional-review controls. The platform should organize and validate a
transaction; it should not silently determine legality, enforceability, or tax
consequences.

### Deal and party structure

| Capability | Purpose | Source | Priority |
| --- | --- | --- | --- |
| Transaction intake | Capture transaction goal, parties, property, existing debt, consideration, risk, and desired documents | Extend `secured-transactions` | P0 |
| Party/entity resolution | Normalize individuals, trusts, LLCs, corporations, lenders, sellers, buyers, and servicers | Extend `identity-capacity` and `registry-adapters` | P0 |
| Capacity/authority review | Determine whether each signer appears authorized to act, subject to human confirmation | Extend existing package | P0 |
| Beneficial-owner/KYC intake | Collect ownership and control facts where required by provider or workflow policy | External identity/KYC adapter plus native policy | P1 |
| Property identity | Normalize address, parcel/APN, legal description, county, state, and property type | Hybrid registry/property-data adapter | P0 |
| Existing-debt intake | Capture lender, balance, rate, payment, maturity, liens, escrow, and due-on-sale information | Build native | P0 |
| Title/lien search | Retrieve and normalize title, lien, judgment, tax, and encumbrance evidence | External title/registry adapter plus native provenance | P0 |
| UCC search | Search and retain financing-statement evidence and search coverage | Extend existing `ucc-search` | P0 |
| UCC filing | Prepare and submit authorized financing-statement filings where supported | External filing adapter plus native approval | P1 |

### Deal analysis and document generation

| Capability | Purpose | Source | Priority |
| --- | --- | --- | --- |
| Deal-structure model | Represent seller financing, lease option, land contract, subject-to, wraparound, private loan, and hybrid structures | Extend `secured-transactions`; build native schemas | P0 |
| Obligation/value model | Normalize principal, consideration, credits, fees, collateral, and performance obligations | Extend existing package | P0 |
| Amortization engine | Calculate payment schedules, interest, principal, balloon, payoff, and scenario comparisons | Build native deterministic math; test extensively | P0 |
| Rate/fee validation | Flag invalid, missing, contradictory, or jurisdiction-sensitive rate and fee terms | Native rule engine; legal review | P0 |
| Usury/rate-rule applicability | Identify jurisdictions and transaction classifications needing rate review | Extend `jurisdiction-rules`; never auto-certify legality | P0 |
| Balloon/payment risk | Highlight balloon dates, payment shocks, negative amortization, and missing disclosures | Build native | P0 |
| Due-on-sale risk flag | Identify existing-loan transfer language requiring review | Build native extraction/risk flag | P0 |
| Collateral model | Describe real property, personal property, accounts, fixtures, and proceeds | Extend secured-transactions | P0 |
| Attachment analysis | Check obligation, rights in collateral, value, and authenticated security agreement facts | Extend secured-transactions | P0 |
| Perfection analysis | Map filing, possession, control, or other perfection steps to jurisdiction and collateral | Extend secured-transactions/jurisdiction rules | P0 |
| Priority analysis | Organize competing claims, filing dates, notice, and unresolved priority questions | Extend secured-transactions/registry adapters | P1 |
| Promissory-note generation | Generate a reviewable note from approved transaction facts | Build native templates plus packet validation | P0 |
| Security-agreement generation | Generate collateral and grant language from structured facts | Build native templates; professional review | P0 |
| Mortgage/deed-of-trust package | Prepare jurisdiction-specific document sets where supported | Hybrid official/template source plus native validation | P1 |
| Lease-option/land-contract package | Generate structure-specific documents, disclosures, and schedules | Build native domain pack | P1 |
| Seller-finance disclosure packet | Assemble consumer disclosures, payment terms, servicing, and risk acknowledgements | Build native; jurisdiction review | P0 |
| Escrow/servicing handoff | Track servicing instructions, payment recipient, escrow, and change notices | External provider adapter plus native state | P1 |

### Transaction lifecycle and tax boundary

| Capability | Purpose | Source | Priority |
| --- | --- | --- | --- |
| Closing checklist | Track signatures, notarization, recording, funding, insurance, and evidence | Build native | P0 |
| Recording readiness | Validate county/state formatting, margins, return address, signatures, and required exhibits | Official rule packs plus native validator | P1 |
| Notarization/recording proof | Store notary and recording identifiers, timestamps, and artifacts | External adapters plus proof | P1 |
| Payment schedule monitoring | Track due dates, received payments, missed payments, and notices | Build native; payment adapter | P1 |
| Default/cure notice | Prepare notice packages from contract facts and applicable rules | Build native; jurisdiction gated | P1 |
| Modification/workout packet | Compare original and modified terms with approval and signature history | Build native | P1 |
| Payoff/release package | Calculate payoff, release obligations, and retain proof | Build native | P1 |
| Creative-finance tax flagging | Identify possible reporting/qualification questions without giving tax advice | Hybrid: IRS rule sources plus native escalation | P0 |
| Installment-sale data packet | Organize terms and reporting inputs for a tax professional | Build native | P1 |
| Depreciation/basis evidence packet | Organize basis, improvements, expenses, and source records | Build native | P1 |
| 1031/like-kind review flag | Identify facts requiring specialist review; do not determine eligibility | Build native escalation capability | P2 |

## 4. Secure file-handling capabilities

### Intake and isolation

| Capability | Purpose | Source | Priority |
| --- | --- | --- | --- |
| Upload quarantine | Keep new files inaccessible to downstream workflows until checks pass | Extend `documents` | P0 |
| Malware scanning | Detect malicious or suspicious files before release | External scanner adapter; native fail-closed policy | P0 |
| Content disarm and reconstruction | Remove active content from supported file types while preserving an auditable original | External adapter plus native evidence model | P1 |
| File-type verification | Compare MIME type, extension, magic bytes, and parser behavior | Build native | P0 |
| Archive bomb protection | Limit nesting, compression ratio, file count, and expanded size | Build native | P0 |
| Resource limits | Bound pages, pixels, duration, memory, CPU, and extraction time | Build native | P0 |
| Safe preview | Render files in an isolated, non-authoritative preview path | Hybrid sandbox/renderer adapter | P0 |
| Secure extraction | Extract text/images/tables without exposing quarantined bytes improperly | Extend document intelligence | P0 |
| Upload consent | Record user consent, intended use, retention, and external-processing disclosures | Build native | P0 |

### Classification, privacy, and redaction

| Capability | Purpose | Source | Priority |
| --- | --- | --- | --- |
| File classification | Classify public, account, matter, sensitive, regulated, privileged, and restricted files | Extend `documents` and security | P0 |
| PII detection | Find names, addresses, IDs, account numbers, tax IDs, dates, and contact data | Hybrid: audited detector or public engine plus native policy | P0 |
| PHI/health-data detection | Detect medical identifiers and health information for workflow controls | Hybrid | P1 |
| Financial-data detection | Detect bank, payment, credit, payroll, and account information | Hybrid | P0 |
| Legal privilege detection | Flag likely privileged/confidential content for human review | Hybrid; never auto-clear privilege | P0 |
| Secret detection | Detect API keys, passwords, tokens, private keys, and credentials | External pattern engine plus native policy | P0 |
| Redaction decisioning | Decide what may be released, to whom, and under what authorization | Extend existing `privacy-release-review` | P0 |
| Permanent redaction rendering | Apply irreversible redactions and verify hidden text/metadata is gone | Existing review contract plus hardened renderer | P0 |
| Redaction QA | Reopen and scan rendered output to verify redactions and overlays | Build native acceptance check | P0 |
| Metadata stripping | Remove author, comments, revision history, GPS, embedded files, and hidden layers when required | Hybrid parser/renderer plus native policy | P1 |
| Watermarking | Add recipient, matter, confidentiality, and generated-copy markings | Extend packet builder | P1 |
| Privacy release gate | Block external sharing, template reuse, AI processing, or mailing until release review passes | Extend documents/workflow gates | P0 |

### Encryption, access, and lifecycle

| Capability | Purpose | Source | Priority |
| --- | --- | --- | --- |
| Encryption in transit/at rest | Protect files and derived artifacts across storage and transport | Existing platform infrastructure; verify deployment | P0 |
| Envelope/key management | Rotate, scope, and audit encryption keys by environment and sensitivity | Build native infrastructure boundary | P0 |
| Tenant/matter isolation | Enforce account, matter, workflow, and artifact ownership in every read/write | Extend security and storage | P0 |
| Least-privilege access | Grant capability-specific scopes rather than broad file access | Build native | P0 |
| Expiring secure links | Share selected artifacts with expiry, audience, revocation, and download audit | Build native | P0 |
| Controlled downloads | Restrict download, print, copy, or export according to policy | Build native; renderer limitations documented | P1 |
| Versioning | Keep immutable versions, parent relationships, hashes, and approval state | Extend documents/proof | P0 |
| Tamper detection | Detect changed bytes, metadata, or derived artifact mismatch | Extend proof hashing | P0 |
| Retention schedules | Apply matter, legal hold, tax, payment, and regulatory retention rules | Extend `documents` retention | P0 |
| Legal hold | Suspend deletion for a matter or evidence set with authorized release | Build native | P0 |
| Secure deletion | Delete originals, derivatives, indexes, previews, and keys with tombstone evidence | Extend retention; deployment verification | P0 |
| Export package | Produce a complete, integrity-checked machine-readable and human-readable export | Build native | P1 |
| Backup/restore | Restore encrypted files and metadata while preserving hashes and ownership | Build native infrastructure | P0 |
| Incident response | Revoke links, quarantine artifacts, notify affected parties, and preserve forensic evidence | Build native | P0 |
| Data residency policy | Track where originals, AI inputs, derivatives, and backups are processed/stored | Build native | P1 |
| AI disclosure boundary | Prevent sensitive files from reaching an AI provider without explicit policy and consent | Extend `ai` and `documents` | P0 |
| Audit telemetry | Record file access, release, scan, redaction, download, export, and deletion events | Extend `audit`/`proof` and register one canonical owner | P0 |

## Recommended build sequence

1. Secure file foundation: quarantine, type/resource limits, malware boundary,
   tenant isolation, PII/secret detection, redaction QA, retention, legal hold,
   audit, and AI disclosure.
2. Shared legal foundation: authority registry, jurisdiction/deadline engine,
   evidence-to-claim provenance, filing/packet validation, signatures, service
   proof, and professional escalation.
3. IRS domain pack: notice classification, official form registry, tax-period
   model, issue mapping, transcript/document reconciliation, response packets,
   and tax-professional handoff.
4. Creative-finance domain pack: party/property resolution, title/UCC evidence,
   deal structure, deterministic amortization, disclosure packages, attachment/
   perfection analysis, closing, servicing, and tax flags.
5. External integrations: e-signature, notarization, e-filing, title/registry,
   malware/OCR/PII engines, translation, and payment/servicing providers—each
   behind a replaceable adapter and never promoted to certified until synthetic
   and acceptance tests pass.
