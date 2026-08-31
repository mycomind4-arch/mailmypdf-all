# Workflow Build Queue

**Date:** 2026-08-18
**Status:** Ranked build order — NOT for mass production yet

---

## Scoring Model

Each workflow is scored on 12 factors (0-5 scale, or TBD for unresearched metrics):

| Factor | Weight | Description |
|--------|--------|-------------|
| Search volume (MSV) | High | Monthly search volume — TBD for most workflows |
| CPC / commercial value | High | Cost-per-click indicates willingness to pay |
| User intent | High | How urgently users need this (action vs informational) |
| Repeat usage | Medium | Will users return? (recurring notices vs one-time) |
| Document standardization | Medium | How standardized is the input document? |
| Workflow complexity | Medium (inverse) | Lower complexity = faster to build |
| Legal/authority risk | Medium (inverse) | Higher risk = more validation needed |
| Factory reuse | High | How much existing infrastructure can be reused |
| SEO cluster potential | Medium | Can this create a cluster of related keywords? |
| Monetization potential | High | Can we charge for this? How much? |
| Strategic ecosystem value | Medium | Does this unlock other workflows? |
| Implementation effort | High (inverse) | Hours to build at gold standard |

---

## Tiers

### TIER 1 — BUILD NOW

These have the highest revenue potential / implementation effort ratio and reuse existing gold-standard infrastructure.

| Rank | Workflow | Vertical | Engine | MSV | Reason |
|------|----------|----------|--------|-----|--------|
| 1 | CP2000 → authority upgrade | notice-respond | document-action | 1900 | Already functional with all 21 pipeline stages connected. Just needs authority gate + E2E tests + registry label upgrade. Lowest effort, highest credibility. |
| 2 | CP504 → gold-standard upgrade | notice-respond | document-action | 1900 | IRS Intent to Levy notice. High urgency (levy threat). Already functional with route. Shares CP14/CP2000 infrastructure. Same document-action engine. |
| 3 | irs-notice → gold-standard upgrade | notice-respond | document-action | TBD | Generic IRS notice workflow. Already functional. Upgrade to use discrepancy/evidence/research/strategy/validation pattern. |
| 4 | I-797 Analysis | immigration-mail | document-action | 18100 | Highest MSV in the registry. Uses document-action engine (same as CP14/CP2000). Immigration notices are standardized (USCIS format). High commercial intent. High user urgency. |

### TIER 2 — BUILD NEXT

| Rank | Workflow | Vertical | Engine | MSV | Reason |
|------|----------|----------|--------|-----|--------|
| 5 | I-797C Analysis | immigration-mail | document-action | 8100 | Second-highest MSV. Same engine, same domain. Builds immigration cluster. |
| 6 | USCIS RFE Response | immigration-mail | document-action | TBD | RFE is high-urgency (response deadline). Same engine. Completes immigration cluster. |
| 7 | TransUnion dispute → gold-standard | dispute-mail | dispute | 12100 | Highest MSV among disputes. Already functional. Upgrade to gold standard (add discrepancy, evidence, research, strategy, two-pass validation). |
| 8 | Experian dispute → gold-standard | dispute-mail | dispute | 8100 | Same shared extraction as TransUnion. Low marginal effort. |
| 9 | Equifax dispute → gold-standard | dispute-mail | dispute | 6600 | Same shared extraction. Lowest marginal effort of the three. |
| 10 | police-report-request | records-requests | records | 6600 | High MSV. Records engine is new but simpler than document-action. Standardized request format. |

### TIER 3 — AFTER INFRASTRUCTURE

| Rank | Workflow | Vertical | Engine | MSV | Reason |
|------|----------|----------|--------|-----|--------|
| 11 | court-summons → gold-standard | notice-respond | document-action | TBD | Already functional. Needs domain-specific intelligence modules (court rules by jurisdiction). Legal complexity requires more research. |
| 12 | agency-action → gold-standard | notice-respond | document-action | TBD | Generic. Needs domain-specific intelligence for different agency types. |
| 13 | credit-report-dispute | dispute-mail | dispute | 6600 | Generic credit dispute. Can be built on the bureau-specific implementations. |
| 14 | public-records-request | records-requests | records | 3600 | Medium MSV. Records engine needs to be built first. |
| 15 | insurance-claim-denied | appeal-mail | appeal | 1300 | Appeal engine needs to be built. CPC=$47 indicates high commercial intent. |
| 16 | financial-aid-appeal | appeal-mail | appeal | 1000 | Medium MSV. Appeal engine. |
| 17 | collection-dispute | dispute-mail | dispute | 1300 | Can extend dispute engine. |
| 18 | hard-inquiry-dispute | dispute-mail | dispute | 880 | Lower MSV but simple workflow. |
| 19 | lexisnexis-dispute | dispute-mail | dispute | 1900 | Niche but specific. |
| 20 | police-records-request | records-requests | records | 1600 | Similar to police-report-request. |

### TIER 4 — RESEARCH FIRST

| Rank | Workflow | Vertical | Engine | MSV | Reason |
|------|----------|----------|--------|-----|--------|
| 21 | file-appeal ownership | notice-respond vs appeal-mail | appeal | 1300 | Determine canonical owner before investing. |
| 22 | debt-validation | dispute-mail vs debt-defense | dispute | TBD | Determine if this belongs in dispute-mail or debt-defense. |
| 23 | fdcpa-dispute | dispute-mail vs debt-defense | dispute | TBD | FDCPA-specific. May need legal review. |
| 24 | debt-lawsuit-response | dispute-mail vs debt-defense | dispute | TBD | Legal complexity. Needs attorney review. |
| 25 | health-insurance-denial | appeal-mail | appeal | TBD | HIPAA considerations. Needs specialized extraction. |
| 26 | ssdi-appeal | appeal-mail vs benefits-appeal | appeal | 260 | Determine if benefits-appeal should be separate vertical. |
| 27 | ssi-appeal | appeal-mail vs benefits-appeal | appeal | 210 | Same as SSDI. |
| 28 | unemployment-appeal | appeal-mail vs benefits-appeal | appeal | TBD | State-specific rules. |
| 29 | medicaid-appeal | appeal-mail vs benefits-appeal | appeal | TBD | State-specific. |
| 30 | code-enforcement-notice | code-enforcement | jurisdictional | TBD | Jurisdictional engine needs to be built. Municipal rules vary. |
| 31 | tenant-notice-response | tenant-reply | jurisdictional | TBD | Jurisdictional engine. Landlord-tenant law varies by state. |

### TIER 5 — DEFER

| Rank | Workflow | Vertical | Engine | MSV | Reason |
|------|----------|----------|--------|-----|--------|
| 32 | workers-comp-denied | appeal-mail | appeal | 210 | Low MSV. Workers comp is highly state-specific. |
| 33 | roof-claim-denied | appeal-mail | appeal | 320 | Low MSV. Niche. |
| 34 | life-insurance-claim-denied | appeal-mail | appeal | 210 | Low MSV. Niche. |
| 35 | sap-appeal | appeal-mail | appeal | 390 | Low MSV. Academic appeals are institution-specific. |
| 36 | insurance-claim-appeal | appeal-mail | appeal | 260 | Low MSV. Generic. |
| 37 | collection-cease-contact | dispute-mail | dispute | TBD | Simple letter but low value. |
| 38 | foia-request | records-requests | records | TBD | Federal FOIA is well-documented but low commercial intent. |
| 39 | court-records-request | records-requests | records | 1900 | Needs court-specific knowledge. |
| 40 | arrest-records-request | records-requests | records | 1600 | Privacy concerns. State-specific procedures. |
| 41 | birth-records-request | records-requests | records | TBD | State-specific. Low commercial intent. |
| 42 | marriage-records-request | records-requests | records | TBD | Same as birth records. |
| 43 | property-records-request | records-requests | records | TBD | Often free through county websites. |
| 44 | permit-records-request | records-requests | records | TBD | Niche. |
| 45 | open-records-request | records-requests | records | 1900 | Generic version of FOIA. |
| 46 | fcra-dispute | dispute-mail | dispute | TBD | Generic. Covered by bureau-specific disputes. |
| 47 | debt-collection-dispute | dispute-mail | dispute | 1300 | Overlaps with collection-dispute. |
| 48 | insurance-claim-denied | appeal-mail | appeal | 1300 | Covered by specific insurance denial workflows. |

---

## Build Order Rationale

### Why CP2000 authority upgrade is #1

- Already has all 21 pipeline stages connected in the production route
- Has all domain modules (case, findings, discrepancy, evidence, research, strategy, validation, packs)
- Has E2E tests
- Only needs: authority gate verification, registry label upgrade, production smoke test
- Effort: ~4 hours. Impact: establishes second authority workflow, validates the factory pattern.

### Why I-797 Analysis is #4 despite highest MSV

- MSV of 18,100 is the highest in the registry
- But it's in a different vertical (immigration-mail) with no existing code
- The immigration-mail repo needs to be set up with the shared infrastructure first
- However, it uses the same document-action engine as CP14/CP2000
- If the factory can generate the runtime pipeline from a domain pack, this becomes low-effort
- Build after the factory is proven with CP2000/CP504/IRS-notice upgrades

### Why TransUnion dispute is #7 despite being functional

- Already functional with extraction + security + mailing
- But it lacks the gold-standard intelligence layer (discrepancy, evidence, research, strategy, two-pass validation)
- The upgrade requires building the dispute-engine equivalents of the CP14 intelligence modules
- This is a different engine (dispute vs document-action), so the intelligence modules need to be written from scratch
- Building this validates that the gold-standard pattern works across engines
