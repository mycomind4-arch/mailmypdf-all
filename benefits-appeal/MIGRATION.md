# Benefits Appeal — new architecture migration map

`apps/**` is read-only legacy source material. Benefits Appeal must not grow a second copy of shared workflow, intelligence, document, payment, packet, mailing, or proof engines.

## Section role

`benefits-appeal/` is a public section/front door. Canonical executable appeal workflows live under `appeal-mail/workflows/**` and use shared packages. The section may expose benefit-specific landing routes, but those routes should delegate to canonical workflows once those workflows are executable.

## Legacy source -> new architecture

| Legacy Benefits source | New architecture destination | Decision |
| --- | --- | --- |
| `src/benefits-contract.ts` | `packages/intelligence/src/benefits/contract.ts` | Salvaged. Structured Benefits issues, evidence-supported drafting gate, validation gate, and outcome-claim guardrails were generalized. Legacy raw-text regex extraction was not copied. |
| `src/domain/classification.ts` | `packages/intelligence/src/appeal/classification.ts` | Already represented by the shared Appeal domain pack. Do not duplicate in Benefits Appeal. |
| `src/domain/decision.ts` | `packages/intelligence/src/appeal/decision.ts` | Already represented by the shared Appeal domain pack. |
| `src/domain/evidence.ts` | `packages/intelligence/src/appeal/evidence.ts` + shared evidence/provenance model | Already represented in shared intelligence. |
| `src/domain/argument.ts` | `packages/intelligence/src/appeal/argument.ts` | Already represented in shared intelligence. |
| `src/domain/ground.ts` | `packages/intelligence/src/appeal/ground.ts` | Already represented in shared intelligence. |
| `src/domain/draft-validator.ts` | `packages/workflows/src/draft-validator.ts` | Shared validator is the canonical implementation. Do not copy the older Benefits validator. |
| `src/domain/gold-standard-gate.ts` / `audit.ts` | shared workflow certification / acceptance packages | Certification belongs to shared workflow infrastructure, not the Benefits section. |
| `src/domain/workflow-capabilities.ts` | `packages/workflows` capability registry/runtime/domain-pack composition | The new shared capability architecture supersedes the old Benefits-local factory. |
| `src/domain/workflow-engine.ts` | `packages/intelligence/src/benefits/drafting-policy.ts` + shared AI/workflow runtime | Repetitive per-workflow prompt tables were not copied. The reusable Benefits drafting/validation policy was salvaged. |
| `src/domain/timeline.ts` | `packages/intelligence` timeline/deadline model | Shared intelligence is canonical. |
| `src/domain/xray.ts` | shared provenance, evidence, contradictions, findings, timeline, risk and case assessment | Legacy raw-text/date-regex heuristics were not copied. New analysis should consume provenance-aware document intelligence instead. |
| `src/domain/review.ts` | shared case assessment + workflow acceptance gates | Useful readiness concepts are represented by shared checks. Legacy checks that simply returned `pass` without verification were intentionally not copied. |
| `src/domain/packet.ts` | `packages/packet-builder` | Shared packet builder is canonical. |
| `src/domain/mailing.ts` | shared mailing/payment-fulfillment packages | Shared fulfillment is canonical. |
| `src/domain/proof.ts` | `packages/proof` / shared fulfillment proof | Shared proof model is canonical. |
| `src/domain/appeal-catalog.ts`, `workflows.ts`, legacy Benefits workflow catalogs | `benefits-appeal/workflows/registry.ts` + canonical workflow manifests | Do not bulk-copy stale catalog claims, deadlines, search estimates, or duplicate workflow definitions. The section registry records public front doors and verified canonical mappings. |
| `src/domain/ssdi-appeal-gold.ts` | `appeal-mail/workflows/appeal-ssdi-denial/manifest.ts` | SSDI is already the canonical executable Benefits appeal workflow. |
| `src/domain/strategy.ts`, `stress-test.ts` | shared Appeal/intelligence extension when a canonical workflow requires it | Do not copy the legacy implementations into the section shell. Their useful behavior should be generalized against the new provenance/evidence/finding models before reuse. |

## Current section routing state

`benefits-appeal/workflows/registry.ts` is the source of truth for public Benefits front doors and canonical mappings.

- `ssdi-denial-appeal` -> canonical `appeal-ssdi-denial` -> executable.
- `ssdi-reconsideration` -> canonical `appeal-ssdi-denial` -> executable.
- Direct matches for SSI denial, Medicaid denial, Social Security decision/overpayment, EDD disqualification, and unemployment denial are registered as `canonical-scaffold` until their canonical `start/` implementations are real.
- All other Benefits front doors remain `section-scaffold` until a canonical workflow is selected and implemented.

A scaffold must never be marked executable merely because a folder exists.

## Required next-step rule

When implementing another Benefits workflow:

1. Build or complete the canonical workflow under `appeal-mail/workflows/**` using shared packages.
2. Give it a real manifest, start route, acceptance gates, review/approval behavior, packet generation, pricing/payment, mailing, tracking, and proof as applicable.
3. Add or update the mapping in `benefits-appeal/workflows/registry.ts`.
4. Only then change the Benefits front-door `startPath` to the canonical route and mark the registry entry `executable`.
5. Keep `apps/**` unchanged.
