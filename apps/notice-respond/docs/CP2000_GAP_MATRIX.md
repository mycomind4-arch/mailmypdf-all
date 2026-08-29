# CP2000 Gap Matrix

## Severity Definitions

- **P0** — Production correctness/safety issue. Must fix before any deployment claim.
- **P1** — Required before Functional maturity claim is accurate.
- **P2** — Required before Authority maturity claim is accurate.
- **P3** — Optimization.
- **P4** — Future enhancement.

## Gap Matrix

| # | Severity | Gap | Current Behavior | Desired Behavior | File/Module | Why It Matters | Smallest Safe Fix | Tests Required |
|---|----------|------|-----------------|------------------|-------------|----------------|-------------------|----------------|
| 1 | **P0** | Draft validation does not block mailing | `canAdvance()` only checks review checkboxes, not `draftValidation.passed` | A draft with BLOCK/errors must prevent advancing to review and mailing | `workflow-runtime.ts` `canAdvance()` | A user can mail a response with factual errors, missing required sections, or unresolved placeholders | Add `draftValidation.passed` check in `canAdvance()` for "draft" phase | Regression test: draft with errors cannot advance |
| 2 | **P0** | CP2000 two-pass validation not connected | `validateDraft()` (old generic) is used; `validateCP2000Draft()` (new two-pass with BLOCK) is not called | Use `validateCP2000Draft()` for CP2000 drafts | `cp2000-response.tsx` `handleGenerateDraft()` | The new validator checks factual consistency, requirement completeness, unresolved discrepancies, missing evidence, source citations, and BLOCK-level issues that the old validator doesn't | Replace `validateDraft()` call with `validateCP2000Draft()` in the route, bridging `WorkflowState` to `CP2000Case` | Integration test: route generates draft → validation shows BLOCK findings |
| 3 | **P0** | No security on CP2000 upload | No `classifyContent()`, `validateTextInput()`, or `wrapDocumentForAI()` calls | Sanitize and validate all uploaded/pasted text | `cp2000-response.tsx` `handleFileUpload()` / `handlePasteText()` | Document text is untrusted; prompt injection, XSS, and malicious content can flow through extraction → draft → mailing | Add `classifyContent()` + `validateTextInput()` before extraction | Security test: malicious text is classified and rejected/warned |
| 4 | **P1** | Discrepancy analysis not shown to user | `analyzeCP2000Discrepancies()` exists and is tested but never called by UI | User sees discrepancies, evidence needs, and findings | `cp2000-response.tsx` extraction phase | The user needs to understand what's wrong with their notice before responding | Call `analyzeCP2000Discrepancies()` after extraction, display results in extraction review phase | Integration test: discrepancies appear in extraction review |
| 5 | **P1** | Evidence checklist not shown to user | `buildCP2000EvidenceChecklist()` exists but not called by UI | User sees required/recommended evidence with state (missing/provided/verified) | `cp2000-response.tsx` attachments phase | User doesn't know what evidence they need to collect | Call `buildCP2000EvidenceChecklist()`, display in attachments phase | Integration test: evidence checklist appears with correct states |
| 6 | **P1** | Deadline not displayed with certainty | Deadline stored in `WorkflowState.deadline` but never rendered; new deadline derivation not used | User sees deadline date, certainty (confirmed/derived/missing), and urgency | `cp2000-response.tsx` extraction phase | User may miss a deadline or not know if the deadline is confirmed | Render deadline info in extraction review using `deadline.certainty` + `deadlineUrgency()` | Integration test: deadline shows with correct certainty |
| 7 | **P1** | CP2000 strategy not used | Generic `recommendStrategies()` is used; `generateCP2000Strategy()` (discrepancy-aware) is not | Strategy should reflect discrepancies, evidence, and findings | `cp2000-response.tsx` objective phase | Generic strategy doesn't account for the specific discrepancies found | Call `generateCP2000Strategy()` and display position + actions + risks | Integration test: strategy reflects discrepancy findings |
| 8 | **P2** | Research sources not shown | `getCP2000ResearchPack()` returns 7 verified IRS sources; UI never displays them | Show relevant IRS sources and taxpayer rights info | `cp2000-response.tsx` (new section or in extraction/objective phase) | User should know their rights and where to find authoritative info | Display research sources in extraction or objective phase | Integration test: sources appear with correct URLs |
| 9 | **P2** | Draft provenance not shown | `buildDraftProvenance()` traces draft assertions to facts; not called by UI | Show which draft claims are supported by which facts | `cp2000-response.tsx` draft phase | User should verify that every claim in the draft is backed by a fact | Call `buildDraftProvenance()`, display assertion-to-fact mapping | Integration test: provenance shows supported/unsupported assertions |
| 10 | **P2** | No case state persistence | All state in React `useState`; no backend persistence | Case should survive page refresh | `cp2000-response.tsx` + `case-repository.ts` | User loses all work on refresh | Wire `case-repository.ts` or use localStorage as interim | Persistence test: state survives reload |
| 11 | **P2** | CP2000Case and WorkflowState are parallel | Two state objects exist (WorkflowState + CP2000Case) with no synchronization | One canonical source of truth or explicit bridge | `cp2000-response.tsx` | Confusion about which state is authoritative | Bridge: derive CP2000Case from WorkflowState when needed | Integration test: state consistency |
| 12 | **P2** | Fact provenance (source excerpts) not shown | Facts have `sourceExcerpt` and `extractionMethod` fields; UI shows only label+value | Show source excerpt for each fact so user can verify | `cp2000-response.tsx` extraction phase | User can't verify where extracted values came from | Add expandable source excerpt display per fact | Integration test: source excerpts visible |
| 13 | **P2** | Adversarial fixtures not tested through UI path | Hardening tests call domain modules directly; UI route not tested with injection fixtures | UI route should reject/sanitize malicious documents | Tests only | Tests prove modules work but not that the UI uses them | Wire security into route (gap #3), then route-level adversarial tests | Route-level security tests |
| 14 | **P3** | Workflow factory not used by production | `constructWorkflow()` validates definitions; not called by any route | Factory could validate workflow readiness at startup | `workflow-factory.ts` | Factory is architecture-only, not runtime | Call factory in route initialization or app bootstrap | Factory integration test |
| 15 | **P3** | Master registry not used by production | 40+ workflow entries in master registry; production only uses `workflow-catalog.ts` | Master registry should eventually replace or augment catalog | `workflow-master-registry.ts` | Two sources of workflow definitions | Defer until CP2000 is Authority | — |
| 16 | **P3** | Domain packs not used by production | `cp2000-packs.ts` registered but never loaded | Packs should provide capability configuration | `cp2000-packs.ts` + `domain-packs.ts` | Packs are architecture-only | Defer until factory is runtime-connected | — |

## Minimum Implementation Sequence

To move CP2000 from current state to genuine Authority, implement in this order:

1. **P0-1: Enforce validation blocking** — Add `draftValidation.passed` check to `canAdvance()` for "draft" phase
2. **P0-2: Connect two-pass validation** — Bridge WorkflowState → CP2000Case → validateCP2000Draft in route
3. **P0-3: Add security to upload** — Use `classifyContent()` + `validateTextInput()` before extraction
4. **P1-4: Show discrepancies** — Call `analyzeCP2000Discrepancies()` and render in extraction review
5. **P1-5: Show evidence checklist** — Call `buildCP2000EvidenceChecklist()` and render in attachments phase
6. **P1-6: Show deadline with certainty** — Render `deadline.certainty` + `deadlineUrgency()` in extraction review
7. **P1-7: Use CP2000 strategy** — Replace `recommendStrategies()` with `generateCP2000Strategy()` in objective phase
8. **P2-8: Show research sources** — Display `getCP2000ResearchPack()` sources in extraction or objective phase
9. **P2-9: Show draft provenance** — Call `buildDraftProvenance()` and display in draft phase
10. **P2-12: Show fact provenance** — Add source excerpt display per fact in extraction review

Steps 1-3 are the minimum for production safety.
Steps 4-7 are the minimum for accurate Functional maturity.
Steps 8-12 are the minimum for Authority maturity.
