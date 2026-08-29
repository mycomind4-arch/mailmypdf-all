# Workflow Factory Architecture

## Overview

The Workflow Factory is a shared operating system for building specialized workflow applications without rebuilding the application each time.

```
                    WORKFLOW FACTORY
                           |
              SHARED WORKFLOW ENGINE
                           |
       ┌───────────────────┼───────────────────┐
       |                   |                   |
 Document Engine     Evidence Engine     Draft Engine
       |                   |                   |
 Extraction           Research/Rules     Validation
       |                   |                   |
       └───────────────────┼───────────────────┘
                           |
                   Workflow Definition
                           |
        ┌──────────┬───────┼───────┬──────────┐
        |          |       |       |          |
      CP2000      RFE     Debt   Police     Denial
       pack       pack    pack   records     pack
```

## 1. WorkflowDefinition

The canonical contract for every workflow. Lives in `src/domain/workflow-definition.ts`.

Contains:
- **Identity**: id, vertical, lifecycle, engine, title, description
- **Search Intent**: primary keyword, secondary keywords, canonical path, informational entry points
- **Documents**: accepted types, classifier hints, extraction schema
- **Deadlines**: triggering events, source priority, jurisdiction dependencies
- **Requirements**: required actions, documents, information
- **Evidence**: evidence requirements, types, examples
- **Analysis**: capabilities, ordered checks, output sections
- **Drafting**: required sections, forbidden behavior, validation checks
- **Submission**: methods, recipient rules, proof requirements
- **Quality Gate**: 8 boolean gates (document recognition through proof ready)
- **SEO**: title, description, canonical URL, FAQ
- **UX**: steps, review checks, disclaimer, mail options
- **Registry**: engine, category, factory reuse score, implementation difficulty, keyword metrics (null/TBD unless verified)

## 2. Workflow Registry

Two registries work together:

### Workflow Catalog (`workflow-catalog.ts`)
The implementation registry — full MasterWorkflowDefinition objects for workflows that have actual product implementations (routes, UI, tests).

Currently 6 workflows: irs-notice, court-summons, agency-action, file-appeal, cp2000-response, cp14-response.

### Master Registry (`workflow-master-registry.ts`)
The planning registry — metadata for every workflow in the ecosystem, including blueprints not yet built.

Currently 40+ entries across 5 engines and 6 verticals. All keyword metrics are null/TBD with `researchRequired=true` until verified through Keyword.com.

## 3. Engine Registry

5 engines, each with a pipeline and shared capabilities:

| Engine | Pipeline | Used By |
|---|---|---|
| document-action | document → classify → extract → understand → deadline → requirements → action | CP2000, CP14, I-797, USCIS RFE, IRS notices, insurance denials, summons |
| dispute | claim → evidence → contradiction → applicable-rules → dispute-grounds → response → validation | TransUnion, Experian, Equifax, credit disputes, collections, debt disputes |
| records | record-type → jurisdiction → custodian → eligibility → required-fields → fees → deadline → submission → follow-up → escalation | police records, court records, public records, FOIA, birth/marriage/property/permit records |
| appeal | decision → reason → applicable-standard → evidence → deficiencies → appeal-strategy → draft → validation | insurance, financial aid, SSDI, SSI, unemployment, Medicaid, FEMA, academic appeals |
| jurisdictional | jurisdiction → governing-rules → notice → deadline → procedural-requirements → evidence → response → submission | tenant workflows, code enforcement, permits, DMV, local government correspondence |

## 4. Domain Packs

Lightweight composable interfaces in `src/domain/domain-packs.ts`:

- **DocumentPack** — accepted types, classifier hints, extraction schema, min confidence
- **DeadlinePack** — triggering events, source priority, jurisdiction dependency, computation rules
- **EvidencePack** — evidence types, sufficiency rules, contradiction rules, missing evidence behavior
- **ResearchPack** — authoritative sources, jurisdictional source requirements, citation requirements
- **AnalysisPack** — capabilities, ordered checks, risk factors, output sections
- **DraftPack** — draft type, required sections, prohibited claims, tone rules
- **ValidationPack** — factual checks, requirement checks, unsupported assertion checks, adversarial checks
- **SubmissionPack** — methods, recipient rules, mailing support, tracking support, proof requirements

## 5. Workflow Maturity

Three levels:

### DISCOVERY (blueprint)
- SEO/search page
- Directory presence
- Educational content
- Basic intake/routing
- NOT production-authority

### FUNCTIONAL
- Real document handling
- Extraction
- Analysis
- Drafting
- Workflow state
- User review
- Passing tests required

### AUTHORITY
- Jurisdiction-aware logic where required
- Source-linked research
- Evidence analysis
- Deadline verification
- Draft QA
- Adversarial testing
- Edge-case handling
- Real submission/mailing integration
- Proof/tracking
- All 8 quality gates must pass

## 6. Priority Scoring

`computePriorityScore()` calculates:

```
Opportunity = SearchDemand × CommercialValue × Intent × Reusability × CompetitiveAdvantage ÷ ImplementationDifficulty
FactoryValue = WorkflowsUnlocked × Reusability × SearchDemand
```

All factors 0-1 (except difficulty, 1-5). Keyword metrics are NEVER fabricated — unknown values are null with `researchRequired=true`.

## 7. Search Metadata

Every workflow owns a canonical search intent cluster:
- `canonicalPath` — the one URL that owns this intent
- `primary` — the main search intent
- `secondary` — related intents
- `informationalEntryPoints` — discovery queries that lead to the workflow
- `actionIntents` — queries showing intent to act

No two workflows from different verticals can own the same canonical keyword.

## 8. Canonical Workflow Ownership

The registry establishes ONE canonical owner for each search/workflow intent:

- Debt Collection Dispute → `dispute-mail` vertical
- Insurance Claim Denied → `appeal-mail` vertical
- Police Records Request → `records-requests` vertical
- I-797 Analysis → `immigration-mail` vertical
- CP2000 Response → `notice-respond` vertical

Other verticals reference the canonical workflow rather than creating duplicates.

## 9. Factory Pipeline

`src/domain/workflow-factory.ts`:

1. `validateDefinition(def)` — check all required fields
2. `resolveEngine(def)` — look up the engine in ENGINE_REGISTRY
3. `loadCapabilityPacks(def)` — merge engine + workflow capabilities
4. `constructWorkflow(def)` — assemble everything, check maturity claims
5. `factoryValidationSummary(workflows)` — batch report

## 10. How a New Workflow Is Added

1. Add a `WorkflowRegistryEntry` to `workflow-master-registry.ts` with keyword metrics as null/TBD
2. If the workflow is ready to build, add a full `MasterWorkflowDefinition` to `workflow-catalog.ts`
3. Create a route in `src/routes/workflows/`
4. Register domain packs if the workflow needs specialized behavior
5. Write fixture-driven tests
6. Run: `npm test && npm run build`
7. Commit, push, deploy
8. Verify the deployment

## 11. CP2000 Example

```
WorkflowDefinition (cp2000-response, engine: document-action)
    ↓
DocumentPack: IRS notice classifier, CP2000 identifiers
    ↓
DeadlinePack: explicit deadline from notice, no inference
    ↓
EvidencePack: W-2, 1099, tax returns, prior correspondence
    ↓
ResearchPack: IRS.gov, IRS publications
    ↓
AnalysisPack: classify → extract amounts → identify discrepancies → strategy
    ↓
DraftPack: response letter with recipient, subject, fact-by-fact, evidence list
    ↓
ValidationPack: every amount traceable, every issue addressed, no fabricated facts
    ↓
SubmissionPack: mail via MailMyPDF, tracking, proof of delivery
```
